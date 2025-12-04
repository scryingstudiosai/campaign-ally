import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { createServerClientFromRequest, createAuthenticatedClient } from '@/lib/supabase/server';
import { z } from 'zod';
import { buildAIContext } from '@/lib/ai/context';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const WeatherInputSchema = z.object({
  campaignId: z.string().uuid(),
  worldName: z.string().optional(),
  biome: z.string().optional(),
  season: z.string().optional(),
  timeOfDay: z.string().optional(),
  mood: z.string().optional(),
  specialPhenomena: z.string().optional(),
  impactLevel: z.enum(['cosmetic', 'moderate', 'major']).optional(),
  tags: z.array(z.string()).optional(),
  respectCodex: z.boolean().optional(),
});

const SYSTEM_PROMPT = `You are Campaign Ally's Weather Forge, an AI co-DM tool that creates immersive atmospheric conditions for TTRPG sessions.

Generate rich environmental conditions that enhance mood, provide mechanical impact, and create memorable moments.

Consider:
- Biome-appropriate weather patterns
- Season and time of day effects
- Tone and mood alignment
- Both aesthetic and mechanical value
- Potential for dynamic shifts over time

Return ONLY valid JSON matching this schema:
{
  "summary": "string (one-sentence weather summary)",
  "detailed_description": "string (2-3 rich paragraphs with sensory detail)",
  "mechanical_effects": "string (suggested game mechanics: visibility, movement, skill checks, etc.)",
  "ambient_sounds": ["string"] (3-5 sound cues for atmosphere),
  "visual_prompts": ["string"] (2-3 image prompt strings),
  "dynamic_shift": "string (how weather evolves over next few hours/days)",
  "dm_notes": "string (suggestions for using this weather to enhance mood, encounters, or story)",
  "flair": "string (evocative opening line a DM can read aloud)"
}

Keep descriptions evocative but concise enough for a DM to read aloud. Include both atmospheric and practical elements.`;

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
    const validation = WeatherInputSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid input', details: validation.error.errors },
        { status: 400 }
      );
    }

    const {
      campaignId,
      worldName,
      biome,
      season,
      timeOfDay,
      mood,
      specialPhenomena,
      impactLevel,
      tags,
      respectCodex = true,
    } = validation.data;

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

    let codexContext = '';
    if (respectCodex) {
      codexContext = await buildAIContext(supabase, campaignId);
    }

    const worldPart = worldName ? `World: ${worldName}. ` : '';
    const biomePart = biome ? `Biome/Region: ${biome}. ` : '';
    const seasonPart = season ? `Season: ${season}. ` : '';
    const timePart = timeOfDay ? `Time: ${timeOfDay}. ` : '';
    const moodPart = mood ? `Mood: ${mood}. ` : '';
    const phenomenaPart = specialPhenomena ? `Special Phenomena: ${specialPhenomena}. ` : '';
    const impactPart = impactLevel ? `Impact Level: ${impactLevel}. ` : '';

    const userPrompt = `${codexContext ? codexContext + '\n\n' : ''}Generate weather/environment conditions. ${worldPart}${biomePart}${seasonPart}${timePart}${moodPart}${phenomenaPart}${impactPart}Create immersive atmospheric conditions that enhance the scene.`;

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
          temperature: 0.85,
          max_tokens: 2000,
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

    const title = `Weather: ${result.summary}`;
    const soundsList = Array.isArray(result.ambient_sounds) ? result.ambient_sounds.join(', ') : result.ambient_sounds;
    const textContent = `${result.summary}\n\n${result.detailed_description}\n\nMechanical Effects: ${result.mechanical_effects}\n\nAmbient Sounds: ${soundsList}\n\nDynamic Shift: ${result.dynamic_shift}`;

    const { data: memoryChunk, error: insertError } = await supabase
      .from('memory_chunks')
      .insert({
        campaign_id: campaignId,
        type: 'event',
        title,
        text_content: textContent,
        content: result,
        forge_type: 'weather',
        tags: tags || [],
      })
      .select()
      .single();

    if (insertError) {
      return NextResponse.json(
        { success: false, error: 'Failed to save weather' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: { id: memoryChunk.id, ...result },
    });
  } catch (error) {
    console.error('Weather forge error:', error);
    return NextResponse.json(
      { success: false, error: 'Something went wrong' },
      { status: 500 }
    );
  }
}
