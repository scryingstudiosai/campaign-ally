import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { createServerClientFromRequest, createAuthenticatedClient } from '@/lib/supabase/server';
import { z } from 'zod';
import { logAIUsage } from '@/lib/ai-usage-logger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const OdditiesInputSchema = z.object({
  campaignId: z.string().uuid(),
  count: z.number().min(1).max(10),
  theme: z.string().optional(),
  saveIndividually: z.boolean().default(false),
  tags: z.array(z.string()).optional(),
});

function buildSystemPrompt(params: z.infer<typeof OdditiesInputSchema>): string {
  return `You are a creative trinket and oddity designer for D&D campaigns. Generate ${params.count} interesting, mundane but memorable items.

${params.theme ? `THEME: ${params.theme}` : 'THEME: General fantasy world'}

DESIGN GUIDELINES:
- Items should be mundane (non-magical) but intriguing
- Include rich sensory details (texture, smell, sound, taste)
- Add mysterious origins or minor historical significance
- Include potential plot hooks through rumors or legends
- Make each item unique and memorable
- Perfect for NPC pockets, shop inventory, or random loot

OUTPUT (Return ONLY valid JSON):
{
  "items": [
    {
      "name": "string (descriptive item name)",
      "appearance": "string (detailed visual description)",
      "sensoryDetails": {
        "touch": "string (texture, temperature, weight)",
        "smell": "string (scent)" | null,
        "sound": "string (any sound it makes)" | null,
        "taste": "string (if edible)" | null
      },
      "origin": "string (where it might have come from)",
      "value": "string (e.g., '5 cp', '2 sp', 'worthless')",
      "hiddenProperty": "string (subtle unusual feature)" | null,
      "rumor": "string (local legend or superstition about similar items)" | null,
      "plotHook": "string (potential adventure seed)" | null,
      "condition": "pristine|worn|damaged|ancient"
    }
  ]
}

Make them evocative, mysterious, and full of storytelling potential.`;
}

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

    const body = await request.json();
    const params = OdditiesInputSchema.parse(body);

    const supabase = createAuthenticatedClient(token);

    const systemPrompt = buildSystemPrompt(params);

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Generate ${params.count} interesting oddities${params.theme ? ` with the theme: ${params.theme}` : ''}` }
      ],
      temperature: 1.0,
      max_tokens: 2500,
      response_format: { type: 'json_object' }
    });

    const content = completion.choices[0].message.content;
    if (!content) {
      throw new Error('No content in AI response');
    }

    const result = JSON.parse(content);

    logAIUsage({
      campaignId: params.campaignId,
      endpoint: '/api/ai/forge/oddities',
      model: 'gpt-4o-mini',
      promptTokens: completion.usage?.prompt_tokens || 0,
      completionTokens: completion.usage?.completion_tokens || 0,
      timestamp: new Date().toISOString(),
    });

    const memoryIds: string[] = [];

    if (params.saveIndividually) {
      for (const item of result.items) {
        const textContent = `${item.appearance}\nOrigin: ${item.origin}\nValue: ${item.value}`;

        const { data: memoryChunk, error: insertError } = await supabase
          .from('memory_chunks')
          .insert({
            campaign_id: params.campaignId,
            type: 'item',
            title: item.name,
            text_content: textContent,
            content: item,
            forge_type: 'oddity',
            tags: params.tags || ['oddity', 'trinket', item.condition],
          })
          .select()
          .single();

        if (insertError) {
          console.error('Database insert error:', insertError);
        } else if (memoryChunk) {
          memoryIds.push(memoryChunk.id);
        }
      }
    } else {
      const title = params.count === 1
        ? result.items[0].name
        : `${params.count} Oddities${params.theme ? ` (${params.theme})` : ''}`;

      const textContent = result.items.map((item: any) =>
        `${item.name}: ${item.appearance}`
      ).join('\n\n');

      const { data: memoryChunk, error: insertError } = await supabase
        .from('memory_chunks')
        .insert({
          campaign_id: params.campaignId,
          type: 'item',
          title,
          text_content: textContent,
          content: result,
          forge_type: 'oddity',
          tags: params.tags || ['oddity', 'trinket', 'collection'],
        })
        .select()
        .single();

      if (insertError) {
        console.error('Database insert error:', insertError);
        throw new Error(`Failed to save oddities: ${insertError.message}`);
      }

      if (memoryChunk) {
        memoryIds.push(memoryChunk.id);
      }
    }

    return NextResponse.json({
      success: true,
      data: result,
      memoryIds,
    });

  } catch (error) {
    console.error('Oddities forge error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate oddities' },
      { status: 500 }
    );
  }
}
