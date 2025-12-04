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

const TownInputSchema = z.object({
  campaignId: z.string().uuid(),
  name: z.string().optional(),
  size: z.enum(['hamlet', 'village', 'town', 'city']).optional(),
  concept: z.string().min(3).max(500).optional(),
  tags: z.array(z.string()).optional(),
  sourceDescription: z.string().optional(),
  sourceContext: z.string().optional(),
  sourceMemoryId: z.string().uuid().optional(),
  contextKey: z.string().optional(),
  parentName: z.string().optional(),
  quickGenerate: z.boolean().optional(),
});

const SYSTEM_PROMPT = `You are a worldbuilder designing a living settlement for D&D.
- 3 distinct NPCs with conflicting goals
- Problem: actionable quest hook (not 'bandits' generic)
- Atmosphere: engage 3 senses
- Secret: hidden fact that reframes the place
- Return ONLY valid JSON

Output schema:
{
  "name": "string",
  "size": "hamlet"|"village"|"town"|"city",
  "population": number,
  "government": "string (type + leader)",
  "notableNPCs": [
    {"name": "string", "role": "string", "quirk": "string", "location": "string", "secret": "string"}
  ] (exactly 3),
  "atmosphere": "string",
  "problem": "string",
  "secretHistory": "string",
  "landmarks": ["string"] (2-4),
  "flair": "string"
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
    const validation = TownInputSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid input', details: validation.error.errors },
        { status: 400 }
      );
    }

    const { campaignId, name, size, concept, tags, sourceDescription, sourceContext, sourceMemoryId, contextKey, parentName } = validation.data;

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

    const townSize = size || 'town';
    const townConcept = concept || 'a thriving settlement with unique character';

    let userPrompt = `Generate a ${townSize}.`;

    if (name) {
      userPrompt += `\n\nIMPORTANT: The settlement MUST be named "${name}". Use this exact name in the "name" field.`;
    }

    userPrompt += ` Concept: "${townConcept}".${varietyPrompt}`;

    if (sourceContext) {
      userPrompt += `\n\n🎯 CRITICAL CONTEXT:\n${sourceContext}`;
      userPrompt += `\n\nYou MUST incorporate ALL of this information.`;
      userPrompt += `\nDo not contradict it. Expand upon it with complementary details.`;
    } else if (sourceDescription) {
      userPrompt += `\n\n📍 IMPORTANT CONTEXT FROM SOURCE:`;
      userPrompt += `\n${sourceDescription}`;
      if (parentName) {
        userPrompt += ` (in ${parentName})`;
      }
      userPrompt += `\n\nYou MUST incorporate this existing information into your generation.`;
      userPrompt += `\nExpand upon these details, add complementary information, but DO NOT contradict them.`;
      userPrompt += `\nIf the context mentions specific features (like observatories, night skies, etc.), make them prominent in your description.`;
      userPrompt += `\nThe town's identity should be built around these core characteristics.`;
    }

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
          max_tokens: 1200,
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

    const title = `${result.name} - ${result.size}`;
    const textContent = `${result.name}\n${result.size} (Population: ${result.population})\n\n${result.flair}\n\nGovernment: ${result.government}\nAtmosphere: ${result.atmosphere}\nProblem: ${result.problem}`;

    const { data: memoryChunk, error: insertError } = await supabase
      .from('memory_chunks')
      .insert({
        campaign_id: campaignId,
        type: 'location',
        title,
        text_content: textContent,
        content: result,
        forge_type: 'town',
        tags: tags || [],
      })
      .select()
      .single();

    if (insertError) {
      return NextResponse.json(
        { success: false, error: 'Failed to save town' },
        { status: 500 }
      );
    }

    if (sourceMemoryId && contextKey) {
      try {
        const relationTypeMap: Record<string, string> = {
          capital: 'capital_of',
          landmark: 'located_in',
          headquarters: 'headquarters_of',
          location: 'located_in',
        };

        const relationType = relationTypeMap[contextKey] || 'related_to';

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

    // Increment generation count
    await supabase.rpc('increment_user_generations', { user_id: user.id });

    return NextResponse.json({
      success: true,
      data: { id: memoryChunk.id, ...result },
    });
  } catch (error) {
    console.error('Town forge error:', error);
    return NextResponse.json(
      { success: false, error: 'Something went wrong' },
      { status: 500 }
    );
  }
}
