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

const ShopInputSchema = z.object({
  campaignId: z.string().uuid(),
  concept: z.string().min(3).max(500),
  tags: z.array(z.string()).optional(),
});

const SYSTEM_PROMPT = `You are a worldbuilder designing a memorable shop for D&D.
- Owner: unique personality with a secret/motivation
- Inventory: 3-5 items (mix of mundane and special)
- Hook: one complication or opportunity
- Sensory detail: what makes this shop memorable
- Return ONLY valid JSON

Output schema:
{
  "name": "string",
  "type": "string (what kind of shop)",
  "owner": {
    "name": "string",
    "species": "string",
    "personality": "string",
    "secret": "string"
  },
  "inventory": [
    {"item": "string", "price": "string", "description": "string"}
  ] (3-5 items),
  "hook": "string (current situation or opportunity)",
  "atmosphere": "string (sensory details)",
  "location": "string (where in town)",
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
    const validation = ShopInputSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid input', details: validation.error.errors },
        { status: 400 }
      );
    }

    const { campaignId, concept, tags } = validation.data;

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

    const userPrompt = `Generate a shop. Concept: "${concept}".${varietyPrompt}`;

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

    const title = `${result.name} - ${result.type}`;
    const textContent = `${result.name}\n${result.type}\n\n${result.flair}\n\nOwner: ${result.owner.name} (${result.owner.species})\nLocation: ${result.location}\nAtmosphere: ${result.atmosphere}\nHook: ${result.hook}`;

    const { data: memoryChunk, error: insertError } = await supabase
      .from('memory_chunks')
      .insert({
        campaign_id: campaignId,
        type: 'location',
        title,
        text_content: textContent,
        content: result,
        forge_type: 'shop',
        tags: tags || [],
      })
      .select()
      .single();

    if (insertError) {
      return NextResponse.json(
        { success: false, error: 'Failed to save shop' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: { id: memoryChunk.id, ...result },
    });
  } catch (error) {
    console.error('Shop forge error:', error);
    return NextResponse.json(
      { success: false, error: 'Something went wrong' },
      { status: 500 }
    );
  }
}
