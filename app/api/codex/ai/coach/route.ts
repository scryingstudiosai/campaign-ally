import { NextRequest, NextResponse } from 'next/server';
import { createServerClientFromRequest, createAuthenticatedClient } from '@/lib/supabase/server';
import OpenAI from 'openai';

 export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');

    const response = NextResponse.next();
    let supabase;
    if (token) {
      supabase = createAuthenticatedClient(token);
    } else {
      supabase = createServerClientFromRequest(request, response);
    }

    const body = await request.json();
    const { campaignId, inputText, field, fieldValue } = body;

    if (!campaignId || !inputText) {
      return NextResponse.json(
        { success: false, error: 'campaignId and inputText are required' },
        { status: 400 }
      );
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { data: campaign, error: campaignError } = await supabase
      .from('campaigns')
      .select('id, user_id')
      .eq('id', campaignId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (campaignError || !campaign) {
      return NextResponse.json(
        { success: false, error: 'Campaign not found or access denied' },
        { status: 404 }
      );
    }

    const { data: codex, error: codexError } = await supabase
      .from('campaign_codex')
      .select('premise, pillars, themes, tone, narrative_voice, pacing_preference, style_guide, house_rules, banned_content')
      .eq('campaign_id', campaignId)
      .maybeSingle();

    if (codexError) {
      return NextResponse.json(
        { success: false, error: codexError.message },
        { status: 500 }
      );
    }

    const contextParts = [];
    if (codex?.premise) contextParts.push(`Premise: ${codex.premise}`);
    if (codex?.themes && codex.themes.length > 0) {
      contextParts.push(`Themes: ${codex.themes.join(', ')}`);
    }
    if (codex?.pillars && codex.pillars.length > 0) {
      contextParts.push(`Pillars: ${codex.pillars.join(', ')}`);
    }
    if (codex?.tone) {
      const tone = codex.tone as any;
      contextParts.push(`Tone: ${tone.mood || 'balanced'} mood, ${tone.humor_level || 'medium'} humor, ${tone.violence || 'medium'} violence`);
    }
    if (codex?.narrative_voice) contextParts.push(`Narrative Voice: ${codex.narrative_voice}`);
    if (codex?.pacing_preference) contextParts.push(`Pacing: ${codex.pacing_preference}`);
    if (codex?.style_guide) contextParts.push(`Style Guide: ${codex.style_guide}`);
    if (codex?.house_rules) contextParts.push(`House Rules: ${codex.house_rules}`);
    if (codex?.banned_content && codex.banned_content.length > 0) {
      contextParts.push(`Banned Content: ${codex.banned_content.join(', ')}`);
    }

    const context = contextParts.length > 0
      ? contextParts.join('\n')
      : 'No campaign context available yet.';

    const fieldLabels: Record<string, string> = {
      'premise': 'Campaign Premise',
      'themes': 'Themes',
      'pillars': 'Campaign Pillars',
      'house_rules': 'House Rules',
    };

    const fieldLabel = fieldLabels[field || ''] || 'content';
    const userPrompt = fieldValue || inputText;

    const fieldGuidance: Record<string, string> = {
      'premise': 'The premise is the core story hook and setup for the campaign - a 1-2 sentence elevator pitch.',
      'themes': 'Themes are the major recurring topics and motifs (e.g., betrayal, redemption, survival).',
      'pillars': 'Pillars are the 2-4 core gameplay experiences that define the campaign (e.g., exploration, political intrigue, survival horror, combat).',
      'house_rules': 'House rules are custom mechanical rules that modify the base game system.',
    };

    const guidance = fieldGuidance[field || ''] || '';

    const systemPrompt = `You are Campaign Ally, the DM's co-pilot. You're reviewing ONLY the ${fieldLabel} for a campaign.

WHAT IS ${fieldLabel.toUpperCase()}:
${guidance}

CAMPAIGN CODEX (for reference only - DO NOT modify these other fields):
${context}

The user is ONLY editing their ${fieldLabel}. Review what they've written for THIS FIELD ONLY.

Return ONLY valid JSON: { "keep": string, "adjust": string, "rewrite": string }.

IMPORTANT: Always provide meaningful content for all three fields. Never use "N/A" or leave fields empty.

- "keep": What aspects of their ${fieldLabel} already work well (be specific). If nothing is particularly strong, acknowledge what's present and what direction they're heading.
- "adjust": 2-3 specific, actionable suggestions to improve ONLY the ${fieldLabel}. Always provide suggestions.
- "rewrite": A complete rewrite of ONLY the ${fieldLabel} content that incorporates your suggestions. This is REQUIRED - always provide a rewrite.

CRITICAL: Your "rewrite" must ONLY contain the ${fieldLabel} content itself. Do not add labels like "Campaign Premise:" or include other fields. Just the raw ${fieldLabel} content.`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.7,
    });

    const responseText = completion.choices[0]?.message?.content;
    console.log('[Coach API] OpenAI response:', responseText);
    if (!responseText) {
      return NextResponse.json(
        { success: false, error: 'No response from AI' },
        { status: 500 }
      );
    }

    const feedback = JSON.parse(responseText);
    console.log('[Coach API] Parsed feedback:', feedback);

    // Ensure all values are strings, not objects
    const ensureString = (value: any): string => {
      if (typeof value === 'string') return value;
      if (typeof value === 'object') return JSON.stringify(value);
      return String(value || '');
    };

    const result = {
      success: true,
      data: {
        keep: ensureString(feedback.keep),
        adjust: ensureString(feedback.adjust),
        rewrite: ensureString(feedback.rewrite),
      },
    };
    console.log('[Coach API] Returning:', result);
    return NextResponse.json(result);
  } catch (error) {
    console.error('Theme coach error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
