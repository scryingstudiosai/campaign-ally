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

const LootInputSchema = z.object({
  campaignId: z.string().uuid(),
  partyLevel: z.number().min(1).max(20),
  concept: z.string().min(3).max(500),
  rarity: z.enum(['gold', 'common', 'uncommon', 'rare', 'very-rare', 'wondrous', 'legendary', 'artifact']).optional(),
  goldOnly: z.boolean().optional(),
  includeArtObjects: z.boolean().optional(),
  tags: z.array(z.string()).optional(),
});

const SYSTEM_PROMPT = `Create a balanced D&D loot table appropriate for party level.
- Mix of coins, mundane items, and magic items
- Appropriate treasure value for level
- Thematic cohesion (fits the concept)
- Include both common finds and special treasures
- Return ONLY valid JSON

Output schema:
{
  "name": "string (loot table name)",
  "partyLevel": number,
  "theme": "string",
  "totalValue": "string (approximate gp value)",
  "coins": {
    "copper": number,
    "silver": number,
    "gold": number,
    "platinum": number
  },
  "mundaneItems": [
    {"item": "string", "quantity": number, "value": "string"}
  ] (2-4 items),
  "magicItems": [
    {"item": "string", "rarity": "string", "description": "string"}
  ] (1-3 items),
  "special": "string | null (unique treasure or plot item)",
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
    const validation = LootInputSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid input', details: validation.error.errors },
        { status: 400 }
      );
    }

    const { campaignId, partyLevel, concept, rarity, goldOnly, includeArtObjects, tags } = validation.data;

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

    let userPrompt = `Generate a loot table for a level ${partyLevel} party. Concept: "${concept}".`;

    if (goldOnly) {
      userPrompt += ' Generate ONLY currency (coins), no items.';
    } else {
      if (rarity) {
        const rarityLabel = rarity.replace('-', ' ');
        userPrompt += ` Maximum magic item rarity: ${rarityLabel}.`;
      }
      if (includeArtObjects) {
        userPrompt += ' Include art objects like gems, jewelry, and decorative treasures.';
      }
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

    const title = `${result.name} - Level ${result.partyLevel}`;
    const textContent = `${result.name}\nFor level ${result.partyLevel} party\nTheme: ${result.theme}\nTotal Value: ${result.totalValue}\n\n${result.flair}`;

    const { data: memoryChunk, error: insertError } = await supabase
      .from('memory_chunks')
      .insert({
        campaign_id: campaignId,
        type: 'item',
        title,
        text_content: textContent,
        content: result,
        forge_type: 'loot',
        tags: tags || [],
      })
      .select()
      .single();

    if (insertError) {
      return NextResponse.json(
        { success: false, error: 'Failed to save loot table' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: { id: memoryChunk.id, ...result },
    });
  } catch (error) {
    console.error('Loot forge error:', error);
    return NextResponse.json(
      { success: false, error: 'Something went wrong' },
      { status: 500 }
    );
  }
}
