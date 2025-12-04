import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { createServerClientFromRequest, createAuthenticatedClient } from '@/lib/supabase/server';
import { z } from 'zod';
import { getExistingNames, createVarietyPrompt } from '@/lib/deduplication';
import { buildAIContext } from '@/lib/ai/context';


export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';


const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const NationInputSchema = z.object({
  campaignId: z.string().uuid(),
  concept: z.string().min(3).max(500),
  tags: z.array(z.string()).optional(),
  respectCodex: z.boolean().optional(),
});

const SYSTEM_PROMPT = `You are a worldbuilder designing a rich, detailed nation, faction, or political entity for D&D.

Create a compelling power structure with:
- 3-5 key leaders with distinct personalities, goals, and conflicts between them
- Detailed governance structure and how power flows
- Core ideology that drives their actions and creates interesting dilemmas
- Concrete resources, territories, and military capabilities
- Active conflicts (internal divisions, external threats, or both)
- Multiple hooks for player involvement at different levels
- Cultural identity (symbols, traditions, reputation)

Return ONLY valid JSON matching this schema:
{
  "name": "string (evocative name)",
  "type": "string (kingdom, guild, empire, theocracy, confederation, etc.)",
  "population": "string (rough size and demographics)",
  "leadership": {
    "structure": "string (detailed governance system)",
    "leaders": [
      {
        "name": "string",
        "title": "string",
        "personality": "string (brief trait)",
        "goal": "string (specific ambition)",
        "conflict": "string (what they're at odds with)"
      }
    ] (3-5 leaders with interconnected goals and conflicts)
  },
  "ideology": {
    "core": "string (fundamental beliefs)",
    "practices": "string (how beliefs manifest in daily life)",
    "tension": "string (where ideology creates problems or hypocrisy)"
  },
  "territory": {
    "lands": "string (regions controlled)",
    "capital": "string (seat of power and its character)",
    "strategic": "string (key locations or borders)"
  },
  "resources": {
    "economic": ["string"] (2-3 key resources or industries),
    "magical": "string (arcane capabilities or lack thereof)",
    "military": "string (army size, composition, and doctrine)"
  },
  "culture": {
    "traditions": "string (notable customs or festivals)",
    "reputation": "string (how others view them)",
    "symbols": {
      "banner": "string (colors and sigil with meaning)",
      "motto": "string (in Common or another language)"
    }
  },
  "conflicts": {
    "internal": "string (factional divisions, succession crisis, etc.)",
    "external": "string (rival nations, threats, diplomatic tensions)"
  },
  "hooks": [
    "string (specific opportunity for players - diplomatic mission)",
    "string (specific opportunity - military conflict)",
    "string (specific opportunity - intrigue or espionage)"
  ] (3 distinct adventure hooks at different scales),
  "secrets": "string (hidden truth that could change everything)",
  "flair": "string (vivid opening description that captures the essence)"
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
    const validation = NationInputSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid input', details: validation.error.errors },
        { status: 400 }
      );
    }

    const { campaignId, concept, tags, respectCodex = true } = validation.data;

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

    let codexContext = '';
    if (respectCodex) {
      codexContext = await buildAIContext(supabase, campaignId);
    }

    const userPrompt = `${codexContext ? codexContext + '\n\n' : ''}Generate a nation/faction. Concept: "${concept}".${varietyPrompt}`;

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
          temperature: 0.8,
          max_tokens: 2500,
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

    const title = `${result.name} - ${result.type}`;
    const leadersList = result.leadership.leaders.map((l: any) => `${l.name} (${l.title})`).join(', ');
    const textContent = `${result.name}\n${result.type}${result.population ? ` (${result.population})` : ''}\n\n${result.flair}\n\nLeadership: ${result.leadership.structure}\nKey Figures: ${leadersList}\nIdeology: ${result.ideology?.core || result.ideology}\nTerritory: ${result.territory?.lands || result.territory}\nConflicts: ${result.conflicts?.internal || result.conflict}`;

    const { data: memoryChunk, error: insertError } = await supabase
      .from('memory_chunks')
      .insert({
        campaign_id: campaignId,
        type: 'location',
        title,
        text_content: textContent,
        content: result,
        forge_type: 'nation',
        tags: tags || [],
      })
      .select()
      .single();

    if (insertError) {
      return NextResponse.json(
        { success: false, error: 'Failed to save nation' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: { id: memoryChunk.id, ...result },
    });
  } catch (error) {
    console.error('Nation forge error:', error);
    return NextResponse.json(
      { success: false, error: 'Something went wrong' },
      { status: 500 }
    );
  }
}
