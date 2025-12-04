import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { createServerClientFromRequest, createAuthenticatedClient } from '@/lib/supabase/server';
import { buildAIContext } from '@/lib/ai/context';
import { logAIUsage } from '@/lib/ai-usage-logger';
import { z } from 'zod';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const PuzzleSchema = z.object({
  campaignId: z.string().uuid(),
  environment: z.string().optional().default('dungeon room'),
  puzzle_category: z.string().optional().default('logic'),
  theme_tags: z.array(z.string()).optional().default(['ancient']),
  tone: z.string().optional().default('mysterious'),
  party_level: z.number().int().min(1).max(20).optional().default(5),
  complexity: z.string().optional().default('standard'),
  target_duration_minutes: z.number().int().min(5).max(60).optional().default(15),
  narrative_purpose: z.string().optional().default('gate'),
  magic_tech_level: z.string().optional().default('standard'),
  fail_consequence: z.string().optional().default('setback'),
  safety_preference: z.string().optional().default('medium fail-forward'),
  mode: z.enum(['generate', 'surprise']).optional().default('generate'),
});

const SYSTEM_PROMPT = `You are Campaign Ally's Puzzle Forge. Create simple, user-friendly puzzle descriptions that DMs can use immediately at the table.

Write in a conversational, engaging tone. Keep the output practical and easy to understand.

Return ONLY valid JSON matching this schema:
{
  "title": "Brief, evocative puzzle name",
  "summary": "One-sentence description for quick reference",
  "description": "2-3 paragraphs describing the puzzle setup, what players see, and the atmosphere. Write this as a DM read-aloud or quick reference.",
  "solution": "Clear, simple explanation of how to solve the puzzle. 2-3 sentences maximum.",
  "hints": ["Hint 1", "Hint 2", "Hint 3"],
  "if_they_fail": "What happens if players can't solve it or get it wrong. Keep it simple and story-forward."
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
    const validation = PuzzleSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid input', details: validation.error.errors },
        { status: 400 }
      );
    }

    const {
      campaignId,
      environment,
      puzzle_category,
      theme_tags,
      tone,
      party_level,
      complexity,
      target_duration_minutes,
      narrative_purpose,
      magic_tech_level,
      fail_consequence,
      safety_preference,
      mode,
    } = validation.data;

    const { data: campaign } = await supabase
      .from('campaigns')
      .select('id, name, user_id')
      .eq('id', campaignId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (!campaign) {
      return NextResponse.json(
        { success: false, error: 'Campaign not found' },
        { status: 404 }
      );
    }

    const codexContext = await buildAIContext(supabase, campaignId);

    const userPrompt = mode === 'surprise'
      ? `${codexContext ? codexContext + '\n\n' : ''}Surprise me with a creative, unexpected puzzle for a ${tone} ${environment} setting. Party level ${party_level}, complexity: ${complexity}. Make it memorable and unique!`
      : `${codexContext ? codexContext + '\n\n' : ''}Generate a ${complexity} ${puzzle_category} puzzle for a ${tone} ${environment}. Theme: ${theme_tags.join(', ')}. Party level: ${party_level}. Duration: ${target_duration_minutes} minutes. Purpose: ${narrative_purpose}. Magic level: ${magic_tech_level}. Fail consequence: ${fail_consequence}. Safety: ${safety_preference}.`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userPrompt },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.85,
      top_p: 0.9,
      max_tokens: 1400,
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      return NextResponse.json(
        { success: false, error: 'No response from AI' },
        { status: 500 }
      );
    }

    const puzzleData = JSON.parse(content);

    const memoryContent = `**${puzzleData.title}**

${puzzleData.description}

**How to Solve It:**
${puzzleData.solution}

**Hints to Give Players:**
${puzzleData.hints.map((h: string, i: number) => `${i + 1}. ${h}`).join('\n')}

**If They Fail:**
${puzzleData.if_they_fail}`;

    const { data: memory } = await supabase
      .from('memory_chunks')
      .insert({
        campaign_id: campaignId,
        title: puzzleData.title,
        text_content: memoryContent,
        content: puzzleData,
        type: 'puzzle',
        forge_type: 'puzzle',
        tags: [puzzle_category, ...theme_tags, 'puzzle'],
      })
      .select()
      .single();

    logAIUsage({
      timestamp: new Date().toISOString(),
      endpoint: '/api/ai/forge/puzzle',
      model: 'gpt-4o-mini',
      promptTokens: completion.usage?.prompt_tokens || 0,
      completionTokens: completion.usage?.completion_tokens || 0,
      totalTokens: completion.usage?.total_tokens || 0,
      userId: user.id,
      campaignId,
    });

    return NextResponse.json({
      success: true,
      data: puzzleData,
      memoryId: memory?.id,
    });
  } catch (error) {
    console.error('Puzzle forge error:', error);
    return NextResponse.json(
      { success: false, error: 'Something went wrong' },
      { status: 500 }
    );
  }
}
