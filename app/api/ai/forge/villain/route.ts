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

const VillainInputSchema = z.object({
  campaignId: z.string().uuid(),
  name: z.string().optional(),
  concept: z.string().optional(),
  tier: z.number().int().min(1).max(4).default(1),
  archetype: z.string().optional(),
  race: z.string().optional(),
  motivation: z.string().optional(),
  methods: z.string().optional(),
  scope: z.string().optional(),
  includeDetails: z.object({
    physical: z.boolean().default(true),
    personality: z.boolean().default(true),
    scheme: z.boolean().default(true),
    resources: z.boolean().default(true),
    strengths: z.boolean().default(true),
    weaknesses: z.boolean().default(true),
    backstory: z.boolean().default(true),
    abilities: z.boolean().default(true),
    lair: z.boolean().default(true),
    lieutenants: z.boolean().default(true),
  }).optional(),
  respectCodex: z.boolean().default(true),
  tags: z.array(z.string()).optional(),
});

const SYSTEM_PROMPT = `You are a master antagonist creator for D&D.
- Tier 1 = Minion (CR 1–4), Tier 2 = Lieutenant (CR 5–10), Tier 3 = BBEG (CR 11+)
- Goal: specific and achievable (not 'rule the world')
- Method: concrete 3-step plan
- Weakness: hidden but discoverable through play
- Monologue: 20–40 words, reveals motivation without infodump
- Symbol: recurring visual icon
- Return ONLY valid JSON

Output schema:
{
  "name": "string",
  "tier": 1|2|3,
  "cr": "string",
  "role": "string (their title/position, 5-30 chars)",
  "goal": "string",
  "method": "string",
  "weakness": "string",
  "voiceHook": "string (distinctive speech pattern or phrase, 5-50 chars)",
  "secretOrLeverage": "string (hidden vulnerability or leverage point, 10-100 chars)",
  "oneLineIntro": "string (first impression description, 15-60 chars)",
  "symbol": "string",
  "lieutenant": "string | null (tier 3 only)",
  "minions": ["string"] (2-4, tier >=2),
  "monologue": "string (20-40 words)",
  "flair": "string (40-60 words)"
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
    const validation = VillainInputSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid input', details: validation.error.errors },
        { status: 400 }
      );
    }

    const { campaignId, name, concept, tier, archetype, race, motivation, methods, scope, includeDetails, respectCodex, tags } = validation.data;

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

    let userPrompt = `Generate a villain character.\n`;

    userPrompt += `Threat Level/Tier: ${tier}\n`;
    if (name) userPrompt += `Name: ${name}\n`;
    if (concept) userPrompt += `Concept: ${concept}\n`;
    if (archetype && archetype !== 'any') userPrompt += `Archetype: ${archetype}\n`;
    if (race && race !== 'any') userPrompt += `Race/Type: ${race}\n`;
    if (motivation && motivation !== 'any') userPrompt += `Motivation: ${motivation}\n`;
    if (methods && methods !== 'any') userPrompt += `Methods & Style: ${methods}\n`;
    if (scope) userPrompt += `Scope: ${scope}\n`;

    if (includeDetails) {
      userPrompt += `\nInclude the following details:\n`;
      if (includeDetails.physical) userPrompt += `- Physical description & presence\n`;
      if (includeDetails.personality) userPrompt += `- Personality & demeanor\n`;
      if (includeDetails.scheme) userPrompt += `- Evil scheme/master plan\n`;
      if (includeDetails.resources) userPrompt += `- Resources & minions\n`;
      if (includeDetails.strengths) userPrompt += `- Strengths & tactics\n`;
      if (includeDetails.weaknesses) userPrompt += `- Weaknesses & vulnerabilities\n`;
      if (includeDetails.backstory) userPrompt += `- Backstory & tragic elements\n`;
      if (includeDetails.abilities) userPrompt += `- Signature abilities/powers\n`;
      if (includeDetails.lair) userPrompt += `- Lair or base of operations\n`;
      if (includeDetails.lieutenants) userPrompt += `- Notable lieutenants\n`;
    }

    if (tags?.length) userPrompt += `\nTags: ${tags.join(', ')}\n`;
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
          max_tokens: 1000,
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

    const title = `${result.name} - CR ${result.cr}`;
    const textContent = `${result.name} (CR ${result.cr})\nRole: ${result.role}\n\n${result.oneLineIntro}\n\n${result.flair}\n\nGoal: ${result.goal}\nMethod: ${result.method}\nWeakness: ${result.weakness}\nVoice Hook: ${result.voiceHook}\nSecret/Leverage: ${result.secretOrLeverage}\nSymbol: ${result.symbol}\n\n"${result.monologue}"`;

    const { data: memoryChunk, error: insertError } = await supabase
      .from('memory_chunks')
      .insert({
        campaign_id: campaignId,
        type: 'npc',
        title,
        text_content: textContent,
        content: result,
        forge_type: 'villain',
        tags: tags || [],
      })
      .select()
      .single();

    if (insertError) {
      return NextResponse.json(
        { success: false, error: 'Failed to save villain' },
        { status: 500 }
      );
    }

    await supabase.rpc('increment_user_generations', {
      user_id: user.id,
    });

    return NextResponse.json({
      success: true,
      data: { id: memoryChunk.id, ...result },
    });
  } catch (error) {
    console.error('Villain forge error:', error);
    return NextResponse.json(
      { success: false, error: 'Something went wrong' },
      { status: 500 }
    );
  }
}
