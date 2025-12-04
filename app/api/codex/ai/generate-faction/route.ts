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
    const { campaignId, factionName } = body;

    if (!campaignId || !factionName) {
      return NextResponse.json(
        { success: false, error: 'campaignId and factionName are required' },
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
      .select('premise, pillars, themes, tone, narrative_voice')
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

    const context = contextParts.length > 0
      ? contextParts.join('\n')
      : 'No campaign context available yet.';

    const systemPrompt = `You are Campaign Ally, the DM's co-pilot. Generate details for a faction in a TTRPG campaign.

CAMPAIGN CODEX:
${context}

Create a compelling faction that fits the campaign's themes, tone, and premise.

Return ONLY valid JSON with this structure:
{
  "description": "A 2-3 sentence description of the faction, their nature, and influence",
  "goals": "What the faction wants to achieve",
  "status": "active" (or "allied" if they seem friendly, or "defeated" if mentioned as past)
}

Be specific, evocative, and ensure the faction fits organically into the campaign world.`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Faction name: ${factionName}` },
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

    const factionData = JSON.parse(responseText);

    return NextResponse.json({
      success: true,
      data: {
        description: factionData.description || '',
        goals: factionData.goals || '',
        status: factionData.status || 'active',
      },
    });
  } catch (error) {
    console.error('Faction generation error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
