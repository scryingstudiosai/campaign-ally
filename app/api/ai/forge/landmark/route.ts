import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { createServerClientFromRequest, createAuthenticatedClient } from '@/lib/supabase/server';
import { z } from 'zod';
import { getExistingNames, createVarietyPrompt } from '@/lib/deduplication';


export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';


const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const LandmarkInputSchema = z.object({
  campaignId: z.string().uuid(),
  name: z.string().optional(),
  type: z.string().optional(),
  customType: z.string().optional(),
  size: z.enum(['small', 'medium', 'large', 'massive']).optional(),
  condition: z.string().optional(),
  age: z.string().optional(),
  concept: z.string().max(500).optional(),
  respectCodex: z.boolean().optional(),
  autoSave: z.boolean().optional(),
  tags: z.array(z.string()).optional(),
  sourceDescription: z.string().optional(),
  sourceContext: z.string().optional(),
  sourceMemoryId: z.string().uuid().optional(),
  contextKey: z.string().optional(),
  parentName: z.string().optional(),
  quickGenerate: z.boolean().optional(),
});

const SYSTEM_PROMPT = `You are a worldbuilder designing a comprehensive D&D landmark for immediate use at the game table.

REQUIREMENTS:
- Build an ADAPTIVE response based on landmark type
- Create type-appropriate descriptions (interior/exterior as relevant)
- Include memorable NPCs who run or inhabit the location
- Add architectural and historical depth
- Provide multiple plot hooks and secrets
- Make it immediately useful for a DM
- Return ONLY valid JSON

Output schema:
{
  "name": "string",
  "type": "string",
  "size": "small"|"medium"|"large"|"massive",
  "condition": "string",
  "age": "string",
  "description": "string (2-3 sentences, exterior and interior/function)",
  "architecturalStyle": "string (describe the building style, materials, design)",
  "appearance": "string (detailed visual description)",
  "atmosphere": "string (engage multiple senses - sights, sounds, smells)",
  "notableFeatures": [
    "string (unique element)"
  ] (3-5 distinctive features),
  "primaryFigure": {
    "name": "string",
    "role": "string (leader/owner/operator)",
    "personality": "string",
    "quirk": "string",
    "secret": "string",
    "appearance": "string (brief physical description)"
  },
  "additionalPeople": [
    {
      "name": "string",
      "role": "string",
      "detail": "string (one interesting fact)"
    }
  ] (1-2 additional staff or key people),
  "typicalVisitors": "string (who commonly comes here and why)",
  "specialFeatures": [
    "string (unique element specific to this landmark)"
  ] (2-3 special features),
  "secrets": [
    "string (hidden element or secret)"
  ] (1-2 secrets, can be empty array if none),
  "hooks": [
    "string (plot hook or adventure opportunity)"
  ] (2-3 hooks),
  "history": "string (brief backstory, 2-3 sentences)",
  "flair": "string (one-sentence tagline)"
}`;

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    const response = NextResponse.next();
    const supabaseAuth = createServerClientFromRequest(request, response);
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const supabase = createAuthenticatedClient(token);

    const body = await request.json();
    const validation = LandmarkInputSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid input', details: validation.error.errors },
        { status: 400 }
      );
    }

    const { campaignId, name, type, customType, size, condition, age, concept, tags, sourceDescription, sourceContext, sourceMemoryId, contextKey, parentName } = validation.data;

    const { data: campaign } = await supabase
      .from('campaigns')
      .select('id')
      .eq('id', campaignId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (!campaign) {
      return NextResponse.json(
        { success: false, error: 'Campaign not found' },
        { status: 404 }
      );
    }

    const existingNames = await getExistingNames(supabase, campaignId, 'location');
    const varietyPrompt = createVarietyPrompt(existingNames);

    const landmarkType = customType || type || 'landmark';
    const landmarkAge = age || 'ancient';
    const landmarkCondition = condition || 'well-maintained';
    const landmarkSize = size || 'medium';

    let userPrompt = `Generate a ${landmarkAge} ${landmarkCondition} ${landmarkSize} ${landmarkType} with COMPLETE details.

REQUIRED: Include ALL of these elements in your response:
- Basic info (name, type, size, condition, age)
- Description (2-3 sentences covering exterior and interior/function)
- Architectural style (materials, design elements)
- Detailed appearance
- Atmosphere (engage multiple senses)
- Notable features (3-5 unique elements)
- Primary figure (full NPC with name, role, personality, quirk, secret, appearance)
- Additional people (1-2 staff or key individuals with name, role, detail)
- Typical visitors (who comes here and why)
- Special features (2-3 elements unique to this landmark)
- Secrets (1-2 hidden elements)
- Plot hooks (2-3 adventure opportunities)
- History (brief backstory)
- Flair tagline`;

    if (name) {
      userPrompt += `\n\nIMPORTANT: The landmark MUST be named "${name}". Use this exact name in the "name" field.`;
    }
    if (concept) userPrompt += `\n\nConcept: "${concept}"`;

    if (sourceContext) {
      userPrompt += `\n\n🎯 CRITICAL CONTEXT:\n${sourceContext}`;
      userPrompt += `\n\nYou MUST incorporate ALL of this information.`;
      userPrompt += `\nDo not contradict it. Expand upon it with complementary details.`;
    } else if (sourceDescription) {
      userPrompt += `\n\n🏛️ IMPORTANT CONTEXT FROM SOURCE:`;
      userPrompt += `\n${sourceDescription}`;
      if (parentName) {
        userPrompt += ` (in ${parentName})`;
      }
      userPrompt += `\n\nYou MUST incorporate this existing information into your generation.`;
      userPrompt += `\nThis location's physical description and purpose must match this description.`;
      userPrompt += `\nAdd architectural details and history that support these characteristics.`;
      userPrompt += `\nExpand upon these details, but DO NOT contradict them.`;
    }

    userPrompt += `\n\n${varietyPrompt}`;

    let result;
    let retryCount = 0;

    while (retryCount < 2) {
      try {
        const completion = await openai.chat.completions.create({
          model: 'gpt-4-turbo',
          messages: [
            { role: 'system', content: retryCount > 0 ? `Return ONLY valid JSON. No markdown. ${SYSTEM_PROMPT}` : SYSTEM_PROMPT },
            { role: 'user', content: userPrompt },
          ],
          response_format: { type: 'json_object' },
          temperature: 0.9,
          max_tokens: 2200,
        });

        const content = completion.choices[0]?.message?.content;
        if (!content) throw new Error('No content returned');

        result = JSON.parse(content);
        break;
      } catch (error: any) {
        if (retryCount === 0 && error instanceof SyntaxError) {
          retryCount++;
          continue;
        }
        throw error;
      }
    }

    const title = `${result.name} - ${result.age} ${result.type}`;

    // Build comprehensive text content for search
    let textContent = `${result.name}\n${result.age} ${result.condition} ${result.size} ${result.type}\n\n${result.flair}\n\n`;
    textContent += `Description: ${result.description}\n\n`;
    textContent += `Atmosphere: ${result.atmosphere}\n`;

    if (result.primaryFigure?.name) {
      textContent += `\nPrimary Figure: ${result.primaryFigure.name} (${result.primaryFigure.role})\n`;
    }

    if (result.notableFeatures?.length) {
      textContent += `\nNotable Features:\n`;
      result.notableFeatures.forEach((feature: string) => {
        textContent += `- ${feature}\n`;
      });
    }

    if (result.hooks?.length) {
      textContent += `\nPlot Hooks: ${result.hooks.join('; ')}\n`;
    }

    textContent += `\nHistory: ${result.history}`;

    const { data: memoryChunk, error: insertError } = await supabase
      .from('memory_chunks')
      .insert({
        campaign_id: campaignId,
        type: 'location',
        title,
        text_content: textContent,
        content: result,
        forge_type: 'landmark',
        tags: tags || [],
      })
      .select()
      .single();

    if (insertError) {
      return NextResponse.json(
        { success: false, error: 'Failed to save landmark' },
        { status: 500 }
      );
    }

    if (sourceMemoryId && contextKey) {
      try {
        const relationTypeMap: Record<string, string> = {
          landmark: 'located_in',
          headquarters: 'headquarters_of',
          location: 'located_in',
        };

        const relationType = relationTypeMap[contextKey] || 'located_in';

        await supabase.from('memory_relations').insert({
          campaign_id: campaignId,
          source_memory_id: memoryChunk.id,
          target_memory_id: sourceMemoryId,
          relation_type: relationType,
          created_by: user.id,
        });
      } catch (relationError) {
        console.error('Failed to create automatic relationship:', relationError);
      }
    }

    return NextResponse.json({
      success: true,
      data: { id: memoryChunk.id, ...result },
    });
  } catch (error) {
    console.error('Landmark forge error:', error);
    return NextResponse.json(
      { success: false, error: 'Something went wrong' },
      { status: 500 }
    );
  }
}
