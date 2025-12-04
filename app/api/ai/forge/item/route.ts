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

const ItemInputSchema = z.object({
  campaignId: z.string().uuid().optional(),
  rarity: z.enum(['common', 'uncommon', 'rare', 'very rare', 'legendary', 'artifact']).optional(),
  concept: z.string().min(3).max(500).optional(),
  tags: z.array(z.string()).optional(),
  generateCurse: z.boolean().optional(),
  itemContext: z.object({
    name: z.string(),
    effect: z.string(),
    rarity: z.string(),
  }).optional(),
});

const SYSTEM_PROMPT = `Create a D&D item with clear mechanical effect and a short history.
- Attunement required if powerful
- Optional curse for rare+
- Return ONLY valid JSON

Output schema:
{
  "name": "string",
  "rarity": "string",
  "attunement": boolean,
  "itemType": "weapon"|"armor"|"wondrous"|"potion"|"scroll",
  "effect": "string",
  "charges": number | null,
  "recharge": "string | null",
  "history": "string",
  "curse": "string | null",
  "flair": "string",
  "image_prompt": "string"
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
    const validation = ItemInputSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid input', details: validation.error.errors },
        { status: 400 }
      );
    }

    const { campaignId, rarity, concept, tags, generateCurse, itemContext } = validation.data;

    if (generateCurse && itemContext) {
      const cursePrompt = `Generate a curse for this D&D magic item:
Item: ${itemContext.name}
Effect: ${itemContext.effect}
Rarity: ${itemContext.rarity}

Create a thematic curse that relates to the item's power. The curse should be interesting and have mechanical consequences. Return ONLY a JSON object with a "curse" field containing the curse description.`;

      const completion = await openai.chat.completions.create({
        model: 'gpt-4-turbo',
        messages: [
          { role: 'system', content: 'You are a D&D dungeon master creating curses for magic items. Return only valid JSON.' },
          { role: 'user', content: cursePrompt },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.9,
        max_tokens: 300,
      });

      const content = completion.choices[0]?.message?.content;
      if (!content) throw new Error('No content returned');

      const result = JSON.parse(content);
      return NextResponse.json({
        success: true,
        curse: result.curse,
      });
    }

    if (!campaignId || !rarity || !concept) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields for item generation' },
        { status: 400 }
      );
    }

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

    const existingNames = await getExistingNames(supabase, campaignId, 'item');
    const varietyPrompt = createVarietyPrompt(existingNames);

    const userPrompt = `Generate a ${rarity} item. Concept: "${concept}".${varietyPrompt}`;

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
          max_tokens: 800,
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

    const title = `${result.name} (${result.rarity})`;
    const textContent = `${result.name}\n${result.itemType} - ${result.rarity}${result.attunement ? ' (requires attunement)' : ''}\n\n${result.flair}\n\nEffect: ${result.effect}\nHistory: ${result.history}`;

    const { data: memoryChunk, error: insertError } = await supabase
      .from('memory_chunks')
      .insert({
        campaign_id: campaignId,
        type: 'item',
        title,
        text_content: textContent,
        content: result,
        forge_type: 'item',
        tags: tags || [],
      })
      .select()
      .single();

    if (insertError) {
      return NextResponse.json(
        { success: false, error: 'Failed to save item' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      result: result,
      data: memoryChunk,
    });
  } catch (error) {
    console.error('Item forge error:', error);
    return NextResponse.json(
      { success: false, error: 'Something went wrong' },
      { status: 500 }
    );
  }
}
