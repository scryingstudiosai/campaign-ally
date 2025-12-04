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
    const { campaignId, eventName, suggestedDate } = body;

    if (!campaignId || !eventName) {
      return NextResponse.json(
        { success: false, error: 'campaignId and eventName are required' },
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
      .select('premise, pillars, themes, timeline')
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

    const existingTimeline = codex?.timeline || [];
    if (existingTimeline.length > 0) {
      contextParts.push(`Existing Timeline: ${existingTimeline.map((e: any) => `${e.date}: ${e.event}`).join(', ')}`);
    }

    const context = contextParts.length > 0
      ? contextParts.join('\n')
      : 'No campaign context available yet.';

    const dateHint = suggestedDate ? `\nSuggested date: ${suggestedDate}` : '';

    const systemPrompt = `You are Campaign Ally, the DM's co-pilot. Generate details for a timeline event in a TTRPG campaign.

CAMPAIGN CODEX:
${context}

Create a compelling timeline event that fits the campaign's world and history. Consider how this event connects to the broader narrative.

Return ONLY valid JSON with this structure:
{
  "date": "A specific date or time period (e.g., 'Year 1487, Midsummer' or 'The Age of Dragons')",
  "details": "2-3 sentences describing what happened, who was involved, and why it matters"
}

Be specific, evocative, and ensure the event fits organically into the campaign timeline.`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Timeline event: ${eventName}${dateHint}` },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.8,
    });

    const responseText = completion.choices[0]?.message?.content;
    if (!responseText) {
      return NextResponse.json(
        { success: false, error: 'No response from AI' },
        { status: 500 }
      );
    }

    const eventData = JSON.parse(responseText);

    return NextResponse.json({
      success: true,
      data: {
        date: eventData.date || '',
        details: eventData.details || '',
      },
    });
  } catch (error) {
    console.error('Timeline event generation error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
