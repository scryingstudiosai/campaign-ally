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

const HeroInputSchema = z.object({
  campaignId: z.string().uuid(),
  name: z.string().optional(),
  concept: z.string().optional(),
  level: z.number().int().min(1).max(20).default(5),
  class: z.string().optional(),
  background: z.string().optional(),
  race: z.string().optional(),
  alignment: z.string().optional(),
  combatStyle: z.string().optional(),
  personality: z.string().optional(),
  includeDetails: z.object({
    physical: z.boolean().default(true),
    personality: z.boolean().default(true),
    background: z.boolean().default(true),
    abilities: z.boolean().default(true),
    motivations: z.boolean().default(true),
    bonds: z.boolean().default(true),
    flaws: z.boolean().default(true),
    equipment: z.boolean().default(true),
  }).optional(),
  respectCodex: z.boolean().default(true),
  tags: z.array(z.string()).optional(),
  sourceDescription: z.string().optional(),
  sourceContext: z.string().optional(),
  sourceMemoryId: z.string().uuid().optional(),
  contextKey: z.string().optional(),
  locationName: z.string().optional(),
  parentName: z.string().optional(),
  quickGenerate: z.boolean().optional(),
});

const SYSTEM_PROMPT = `You are a D&D 5e character designer. Create a balanced, memorable hero.
- Motivation must drive action (not generic)
- Flaw must create roleplay tension (not 'arrogant')
- Avoid clichés: lone wolf, chosen one, tragic orphan
- Flair: physical description (40–60 words), no backstory repetition
- Return ONLY valid JSON matching the schema

Output schema:
{
  "name": "string",
  "race": "string",
  "class": "string (include subclass in parentheses)",
  "level": number (1-20),
  "alignment": "LG"|"NG"|"CG"|"LN"|"N"|"CN"|"LE"|"NE"|"CE",
  "role": "string (their function/profession, 5-30 chars)",
  "motivation": "string (10-100 chars)",
  "flaw": "string (10-100 chars)",
  "voiceHook": "string (distinctive speech pattern or phrase, 5-50 chars)",
  "secretOrLeverage": "string (hidden secret or leverage point, 10-100 chars)",
  "oneLineIntro": "string (first impression description, 15-60 chars)",
  "signatureItem": "string (5-80 chars, non-magical)",
  "flair": "string (40-60 words)",
  "bonds": ["string"] (0-3),
  "secrets": ["string"] (0-2)
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
    const validation = HeroInputSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid input', details: validation.error.errors },
        { status: 400 }
      );
    }

    const { campaignId, name, concept, level, class: heroClass, background, race, alignment, combatStyle, personality, includeDetails, respectCodex, tags, sourceDescription, sourceContext, sourceMemoryId, contextKey, locationName, parentName } = validation.data;

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

    const existingNames = await getExistingNames(supabase, campaignId, 'npc');
    const varietyPrompt = createVarietyPrompt(existingNames);

    let userPrompt = `Generate a hero character.\n`;

    if (name) userPrompt += `Name: ${name}\n`;
    if (concept) userPrompt += `Concept: ${concept}\n`;
    userPrompt += `Level: ${level}\n`;
    if (heroClass && heroClass !== 'any') userPrompt += `Class: ${heroClass}\n`;
    if (background && background !== 'any') userPrompt += `Background: ${background}\n`;
    if (race && race !== 'any') userPrompt += `Race: ${race}\n`;
    if (alignment && alignment !== 'any') userPrompt += `Alignment: ${alignment}\n`;
    if (combatStyle && combatStyle !== 'any') userPrompt += `Combat Style: ${combatStyle}\n`;
    if (personality && personality !== 'any') userPrompt += `Personality: ${personality}\n`;

    if (includeDetails) {
      userPrompt += `\nInclude the following details:\n`;
      if (includeDetails.physical) userPrompt += `- Physical description\n`;
      if (includeDetails.personality) userPrompt += `- Personality traits & ideals\n`;
      if (includeDetails.background) userPrompt += `- Background story hook\n`;
      if (includeDetails.abilities) userPrompt += `- Key abilities/specialties\n`;
      if (includeDetails.motivations) userPrompt += `- Motivations & goals\n`;
      if (includeDetails.bonds) userPrompt += `- Bonds & relationships\n`;
      if (includeDetails.flaws) userPrompt += `- Flaws or weaknesses\n`;
      if (includeDetails.equipment) userPrompt += `- Equipment & signature items\n`;
    }

    if (tags?.length) userPrompt += `\nTags: ${tags.join(', ')}\n`;

    if (sourceContext) {
      userPrompt += `\n\n🎯 CRITICAL CONTEXT:\n${sourceContext}`;
      userPrompt += `\n\nYou MUST incorporate ALL of this information.`;
      userPrompt += `\nDo not contradict it. Expand upon it with complementary details.`;
    } else if (sourceDescription) {
      userPrompt += `\n\n👤 KNOWN DETAILS ABOUT THIS NPC:`;
      userPrompt += `\n${sourceDescription}`;
      if (locationName) {
        userPrompt += ` (at ${locationName})`;
      }
      if (parentName) {
        userPrompt += ` (in ${parentName})`;
      }
      userPrompt += `\n\nThis character's appearance and personality MUST match this description.`;
      userPrompt += `\nExpand on their backstory and details, but keep their core traits consistent.`;
      userPrompt += `\nDO NOT contradict the provided information.`;
    }

    userPrompt += varietyPrompt;

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
          max_tokens: 900,
        });

        const content = completion.choices[0]?.message?.content;
        if (!content) {
          throw new Error('No content returned from OpenAI');
        }

        result = JSON.parse(content);
        break;
      } catch (error: any) {
        if (retryCount === 0 && error instanceof SyntaxError) {
          retryCount++;
          continue;
        }

        if (error?.error?.code === 'rate_limit_exceeded') {
          return NextResponse.json(
            { success: false, error: 'AI service busy. Try again shortly.' },
            { status: 503 }
          );
        }

        if (error?.error?.code === 'content_policy_violation') {
          return NextResponse.json(
            { success: false, error: 'Content policy violation. Please simplify your concept.' },
            { status: 400 }
          );
        }

        console.error('OpenAI error:', error);
        return NextResponse.json(
          { success: false, error: 'AI service error. Try again.' },
          { status: 500 }
        );
      }
    }

    if (!result) {
      return NextResponse.json(
        { success: false, error: 'Failed to generate valid hero data' },
        { status: 500 }
      );
    }

    const title = `${result.name} - ${result.class}`;
    const textContent = `${result.name}\n${result.race} ${result.class} (Level ${result.level})\nRole: ${result.role}\n${result.alignment}\n\n${result.oneLineIntro}\n\n${result.flair}\n\nMotivation: ${result.motivation}\nFlaw: ${result.flaw}\nVoice Hook: ${result.voiceHook}\nSecret/Leverage: ${result.secretOrLeverage}\nSignature Item: ${result.signatureItem}`;

    const { data: memoryChunk, error: insertError } = await supabase
      .from('memory_chunks')
      .insert({
        campaign_id: campaignId,
        type: 'npc',
        title,
        text_content: textContent,
        content: result,
        forge_type: 'hero',
        tags: tags || [],
      })
      .select()
      .single();

    if (insertError) {
      console.error('Failed to save hero:', insertError);
      return NextResponse.json(
        { success: false, error: 'Failed to save hero' },
        { status: 500 }
      );
    }

    if (sourceMemoryId && contextKey) {
      try {
        const relationTypeMap: Record<string, string> = {
          owner: 'owner_of',
          patron: 'frequents',
          leader: 'leads',
          member: 'member_of',
          employee: 'works_at',
        };

        const relationType = relationTypeMap[contextKey] || 'associated_with';

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

    // Increment generation count after successful AI generation
    await supabase.rpc('increment_user_generations', {
      user_id: user.id,
    });

    return NextResponse.json({
      success: true,
      data: {
        id: memoryChunk.id,
        ...result,
      },
    });
  } catch (error) {
    console.error('Hero forge error:', error);
    return NextResponse.json(
      { success: false, error: 'Something went wrong. Try again.' },
      { status: 500 }
    );
  }
}
