import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { buildPrepContext } from '@/lib/ai/context';
import { z } from 'zod';
import OpenAI from 'openai';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const OutlineRequestSchema = z.object({
  campaignId: z.string().uuid('Campaign ID must be a valid UUID'),
  sessionId: z.string().uuid('Session ID must be a valid UUID'),
  premise: z.string().min(1, 'Premise is required'),
  partyInfo: z.object({
    level: z.number().int().min(1).max(20),
    size: z.number().int().min(1).max(10),
  }),
  useCanon: z.boolean().optional(),
});

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: NextRequest) {
  try {
    const headersObj: Record<string, string | null> = {};
    req.headers.forEach((value, key) => {
      headersObj[key] = value;
    });
    const authHeader = headersObj['authorization'];

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, error: 'No authorization token provided' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    const body = await req.json();
    const validation = OutlineRequestSchema.safeParse(body);

    if (!validation.success) {
      const errors = validation.error.errors.map((e) => e.message).join(', ');
      return NextResponse.json(
        { success: false, error: errors },
        { status: 400 }
      );
    }

    const { campaignId, sessionId, premise, partyInfo, useCanon = true } = validation.data;

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    });

    let contextPrefix = '';
    if (useCanon) {
      contextPrefix = await buildPrepContext(supabase, campaignId, {
        includeMemories: true,
        memoryLimit: 10,
      });
    }

    const systemPrompt = `You are an expert D&D Dungeon Master assistant. Generate a structured session outline for a 2-3 hour D&D session.

${contextPrefix ? `# CAMPAIGN CONTEXT\n${contextPrefix}\n\n` : ''}

Create an outline with:
- A compelling title
- 3-6 story beats that flow naturally
- Each beat should include: title, description, estimated duration (in minutes), key objectives, and potential challenges

The outline should:
- Honor the campaign's tone, themes, and established canon
- Be appropriate for a party of ${partyInfo.size} level ${partyInfo.level} characters
- Build tension and provide satisfying moments
- Include opportunities for roleplay, combat, and exploration
- Total duration should be 120-180 minutes

Return ONLY valid JSON matching this structure:
{
  "title": "Session title",
  "goals": ["primary goal", "secondary goal"],
  "beats": [
    {
      "title": "Beat title",
      "description": "What happens in this beat",
      "duration": 30,
      "objectives": ["objective 1"],
      "challenges": ["challenge 1"]
    }
  ]
}`;

    const userPrompt = `Create a session outline for the following premise:\n\n${premise}`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.6,
      max_tokens: 1200,
    });

    const outlineText = completion.choices[0]?.message?.content;
    if (!outlineText) {
      return NextResponse.json(
        { success: false, error: 'Failed to generate outline' },
        { status: 500 }
      );
    }

    let outline;
    try {
      outline = JSON.parse(outlineText);
    } catch (parseError) {
      return NextResponse.json(
        { success: false, error: 'Failed to parse AI response' },
        { status: 500 }
      );
    }

    const { data: session, error } = await supabase
      .from('sessions')
      .update({ outline })
      .eq('id', sessionId)
      .select()
      .maybeSingle();

    if (error) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Session not found or unauthorized' },
        { status: 404 }
      );
    }

    const { data: { user: currentUser } } = await supabase.auth.getUser();
    if (currentUser) {
      await supabase.rpc('increment_user_generations', {
        user_id: currentUser.id,
      });
    }

    return NextResponse.json({ success: true, data: outline });
  } catch (error) {
    console.error('Outline generation error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
