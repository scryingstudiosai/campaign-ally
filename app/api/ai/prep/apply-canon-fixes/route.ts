import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import OpenAI from 'openai';
import { createServerClientFromRequest, createAuthenticatedClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const ApplyCanonFixesSchema = z.object({
  content: z.string().min(1, 'Content is required'),
  fixes: z.array(z.string()).min(1, 'At least one fix is required'),
});

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    const response = NextResponse.next();
    const supabaseAuth = createServerClientFromRequest(req, response);
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const supabase = createAuthenticatedClient(token);
    const body = await req.json();
    const validation = ApplyCanonFixesSchema.safeParse(body);

    if (!validation.success) {
      const errors = validation.error.errors.map((e) => e.message).join(', ');
      return NextResponse.json(
        { success: false, error: errors },
        { status: 400 }
      );
    }

    const { content, fixes } = validation.data;

    const systemPrompt = `You are a D&D content editor. Apply the requested fixes to the content while preserving:
- The overall narrative flow and structure
- The DM's writing style and voice
- Any unaffected sections (leave them exactly as-is)

Only change what's necessary to implement the fixes. Return the corrected content as plain text, maintaining all formatting.`;

    const fixesList = fixes.map((fix, idx) => `${idx + 1}. ${fix}`).join('\n');

    const userPrompt = `Original content:
${content}

Apply these fixes:
${fixesList}

Return the corrected version of the content.`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.3,
      max_tokens: 2000,
    });

    const corrected = completion.choices[0]?.message?.content;
    if (!corrected) {
      return NextResponse.json(
        { success: false, error: 'Failed to apply fixes' },
        { status: 500 }
      );
    }

    // Increment generation count
    await supabase.rpc('increment_user_generations', { user_id: user.id });

    return NextResponse.json({
      success: true,
      data: { corrected },
    });
  } catch (error) {
    console.error('Apply canon fixes error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
