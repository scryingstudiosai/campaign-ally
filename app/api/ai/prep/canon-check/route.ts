import { NextRequest, NextResponse } from 'next/server';
import { createServerClientFromRequest, createAuthenticatedClient } from '@/lib/supabase/server';
import { buildPrepContext } from '@/lib/ai/context';
import { z } from 'zod';
import OpenAI from 'openai';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const CanonCheckSchema = z.object({
  campaignId: z.string().uuid('Campaign ID must be a valid UUID'),
  content: z.string().min(1, 'Content is required'),
  type: z.enum(['scene', 'outline']),
  sceneId: z.string().uuid().optional(),
});

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface Conflict {
  type: string;
  severity: 'high' | 'medium' | 'low';
  canon: string;
  draft: string;
  suggestedFix: string;
  autoFixable: boolean;
  affectedSceneIds?: string[];
}

interface CanonCheckResult {
  conflicts: Conflict[];
  warnings: string[];
  suggestions: string[];
  overallScore: number;
}

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
    const validation = CanonCheckSchema.safeParse(body);

    if (!validation.success) {
      const errors = validation.error.errors.map((e) => e.message).join(', ');
      return NextResponse.json(
        { success: false, error: errors },
        { status: 400 }
      );
    }

    const { campaignId, content, type, sceneId } = validation.data;

    const contextPrefix = await buildPrepContext(supabase, campaignId, {
      includeMemories: true,
      memoryLimit: 15,

    });

    const systemPrompt = `You are a D&D campaign continuity checker. Analyze the provided ${type} content against the campaign's established canon (codex + memories).

# CAMPAIGN CANON
${contextPrefix}

Your task:
1. Identify conflicts with established canon (character names, locations, faction alignments, timeline, lore)
2. Flag potential warnings (unclear references, missing context)
3. Suggest improvements for consistency and immersion
4. Calculate an overall consistency score (0-1, where 1 = perfect alignment)

Return ONLY valid JSON matching this structure:
{
  "conflicts": [
    {
      "type": "character_inconsistency|location_error|timeline_conflict|lore_contradiction|faction_error",
      "severity": "high|medium|low",
      "canon": "What the canon says",
      "draft": "What the draft says",
      "suggestedFix": "How to fix it",
      "autoFixable": true|false
    }
  ],
  "warnings": ["Warning message 1", "Warning message 2"],
  "suggestions": ["Suggestion 1", "Suggestion 2"],
  "overallScore": 0.85
}

High severity: Major contradictions (wrong character alive/dead, impossible timeline)
Medium severity: Minor inconsistencies (character personality shift, location details)
Low severity: Style mismatches or unclear references

autoFixable: true if it's a simple find-replace fix, false if it requires creative rewriting`;

    const userPrompt = `Check this ${type} content for canon consistency:\n\n${content}`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.3,
      max_tokens: 1500,
    });

    const responseText = completion.choices[0]?.message?.content;
    if (!responseText) {
      return NextResponse.json(
        { success: false, error: 'Failed to generate canon check' },
        { status: 500 }
      );
    }

    let result: CanonCheckResult;
    try {
      result = JSON.parse(responseText);
    } catch (parseError) {
      return NextResponse.json(
        { success: false, error: 'Failed to parse AI response' },
        { status: 500 }
      );
    }

    if (sceneId) {
      const canonChecked = result.overallScore > 0.7;

      const { error: updateError } = await supabase
        .from('scenes')
        .update({
          last_canon_score: result.overallScore,
          last_canon_checked_at: new Date().toISOString(),
          canon_checked: canonChecked,
        })
        .eq('id', sceneId);

      if (updateError) {
        console.error('Failed to update scene canon check:', updateError);
      }
    }

    // Increment generation count
    await supabase.rpc('increment_user_generations', { user_id: user.id });

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error('Canon check error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
