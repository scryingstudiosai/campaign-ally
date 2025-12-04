import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { createServerClientFromRequest, createAuthenticatedClient } from '@/lib/supabase/server';
import { z } from 'zod';


export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';


const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const ScrollInputSchema = z.object({
  campaignId: z.string().uuid(),
  level: z.number().min(0).max(9),
  concept: z.string().min(3).max(500),
  tags: z.array(z.string()).optional(),
});

const SYSTEM_PROMPT = `Create a balanced D&D scroll with clear mechanics.
- Appropriate power for level
- Specific duration, range, and components
- Concrete mechanical effects (damage, conditions, etc.)
- At higher levels effect if applicable
- Return ONLY valid JSON

Output schema:
{
  "name": "string",
  "level": number (0-9),
  "school": "string (Abjuration, Conjuration, Divination, Enchantment, Evocation, Illusion, Necromancy, Transmutation)",
  "castingTime": "string",
  "range": "string",
  "components": "string (V, S, M)",
  "duration": "string",
  "description": "string (clear mechanical effect)",
  "atHigherLevels": "string | null",
  "classes": ["string"] (which classes can use it),
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
    const validation = ScrollInputSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid input', details: validation.error.errors },
        { status: 400 }
      );
    }

    const { campaignId, level, concept, tags } = validation.data;

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

    const userPrompt = `Generate a level ${level} scroll. Concept: "${concept}".`;

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
          temperature: 0.7,
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

    const title = `${result.name} - Level ${result.level} ${result.school}`;
    const textContent = `${result.name}\nLevel ${result.level} ${result.school}\n\n${result.flair}\n\nCasting Time: ${result.castingTime}\nRange: ${result.range}\nComponents: ${result.components}\nDuration: ${result.duration}\n\n${result.description}`;

    const { data: memoryChunk, error: insertError } = await supabase
      .from('memory_chunks')
      .insert({
        campaign_id: campaignId,
        type: 'item',
        title,
        text_content: textContent,
        content: result,
        forge_type: 'scroll',
        tags: tags || [],
      })
      .select()
      .single();

    if (insertError) {
      return NextResponse.json(
        { success: false, error: 'Failed to save scroll' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      result: result,
    });
  } catch (error) {
    console.error('Scroll forge error:', error);
    return NextResponse.json(
      { success: false, error: 'Something went wrong' },
      { status: 500 }
    );
  }
}
