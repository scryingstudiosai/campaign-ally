import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { createServerClientFromRequest, createAuthenticatedClient } from '@/lib/supabase/server';
import { buildAIContext } from '@/lib/ai/context';
import { z } from 'zod';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const BeatSchema = z.object({
  title: z.string(),
  description: z.string().optional(),
  duration: z.number().optional(),
  objectives: z.array(z.string()).optional(),
  challenges: z.array(z.string()).optional(),
});

const EditBeatSchema = z.object({
  campaignId: z.string().uuid(),
  sessionId: z.string().uuid(),
  sessionTitle: z.string(),
  previousBeats: z.array(BeatSchema),
  action: z.enum(['edit', 'add', 'remove', 'regenerate', 'surprise']),
  beatIndex: z.number().optional(),
  userEditText: z.string().optional(),
  tone: z.enum(['neutral', 'dark', 'heroic', 'tragic', 'whimsical', 'cinematic']).optional(),
  sessionGoal: z.string().optional(),
});

const SYSTEM_PROMPT = `You are Campaign Ally's Session Beat Forge, an AI-powered narrative editor that refines or expands the key moments ("beats") of a TTRPG session.

Your job is to edit, add, remove, or regenerate story beats based on the user's request.

When editing or adding beats:
- Maintain consistent pacing and flow between beats
- Keep beats concise but cinematic (2-4 sentences each)
- Respect the campaign's tone and existing narrative
- Ensure smooth transitions between beats

When using "Surprise Me":
- Inject creativity and unexpected elements
- Keep changes narratively plausible
- Don't break established story logic

Return ONLY valid JSON matching this schema:
{
  "session_title": "string",
  "updated_beats": [
    {
      "index": 1,
      "title": "Short title of the beat",
      "description": "Expanded paragraph version of the beat",
      "tone": "inherited or updated tone"
    }
  ],
  "ai_commentary": "Brief note on how changes impact pacing or narrative flow"
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
    const validation = EditBeatSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid input', details: validation.error.errors },
        { status: 400 }
      );
    }

    const {
      campaignId,
      sessionId,
      sessionTitle,
      previousBeats,
      action,
      beatIndex,
      userEditText,
      tone = 'neutral',
      sessionGoal,
    } = validation.data;

    const { data: session } = await supabase
      .from('sessions')
      .select('campaign_id')
      .eq('id', sessionId)
      .eq('campaign_id', campaignId)
      .maybeSingle();

    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Session not found' },
        { status: 404 }
      );
    }

    const codexContext = await buildAIContext(supabase, campaignId);

    const previousBeatsText = previousBeats
      .map((beat, idx) => `${idx + 1}. ${beat.title}: ${beat.description || ''}`)
      .join('\n');

    let userPrompt = '';

    if (action === 'edit' && beatIndex !== undefined && userEditText) {
      userPrompt = `${codexContext ? codexContext + '\n\n' : ''}Session: ${sessionTitle}\nCurrent beats:\n${previousBeatsText}\n\nAction: Edit beat ${beatIndex + 1}\nNew text: ${userEditText}\n\nRefine this beat while maintaining tone and story flow. Tone: ${tone}`;
    } else if (action === 'add') {
      const goalText = sessionGoal ? `Session goal: ${sessionGoal}\n` : '';
      userPrompt = `${codexContext ? codexContext + '\n\n' : ''}Session: ${sessionTitle}\n${goalText}Current beats:\n${previousBeatsText}\n\nAction: Add new beat after the last one\nCreate a new beat that fits naturally. Tone: ${tone}`;
    } else if (action === 'surprise') {
      userPrompt = `${codexContext ? codexContext + '\n\n' : ''}Session: ${sessionTitle}\nCurrent beats:\n${previousBeatsText}\n\nAction: Add surprising new beat\nCreate an unexpected but narratively plausible beat. Tone: ${tone}`;
    } else if (action === 'regenerate' && beatIndex !== undefined) {
      const beat = previousBeats[beatIndex];
      userPrompt = `${codexContext ? codexContext + '\n\n' : ''}Session: ${sessionTitle}\nCurrent beats:\n${previousBeatsText}\n\nAction: Regenerate beat ${beatIndex + 1} (${beat.title})\nRebuild this beat with improved tension, pacing, or emotional impact. Tone: ${tone}`;
    } else if (action === 'remove' && beatIndex !== undefined) {
      const updatedBeats = previousBeats.filter((_, idx) => idx !== beatIndex);
      return NextResponse.json({
        success: true,
        data: {
          session_title: sessionTitle,
          updated_beats: updatedBeats.map((beat, idx) => ({
            index: idx + 1,
            title: beat.title,
            description: beat.description || '',
            tone,
          })),
          ai_commentary: `Removed beat ${beatIndex + 1}. Remaining beats have been reindexed.`,
        },
      });
    } else {
      return NextResponse.json(
        { success: false, error: 'Invalid action or missing parameters' },
        { status: 400 }
      );
    }

    let result;
    let retryCount = 0;

    while (retryCount < 2) {
      try {
        const completion = await openai.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: retryCount > 0 ? `Return ONLY valid JSON. ${SYSTEM_PROMPT}` : SYSTEM_PROMPT },
            { role: 'user', content: userPrompt },
          ],
          response_format: { type: 'json_object' },
          temperature: 0.8,
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

    // Increment generation count after successful AI generation
    await supabase.rpc('increment_user_generations', { user_id: user.id });

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('Beat editor error:', error);
    return NextResponse.json(
      { success: false, error: 'Something went wrong' },
      { status: 500 }
    );
  }
}
