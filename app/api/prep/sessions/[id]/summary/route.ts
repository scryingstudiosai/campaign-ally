import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { createServerClientFromRequest, createAuthenticatedClient } from '@/lib/supabase/server';
import { buildAIContext } from '@/lib/ai/context';
import { logAIUsage } from '@/lib/ai-usage-logger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const SYSTEM_PROMPT = `You are Campaign Ally's Session Summary Assistant. Generate comprehensive, structured session summaries for tabletop RPG campaigns.

Create summaries that are:
- Concise but complete
- Easy to read and reference
- Useful for both DMs and players
- Tagged appropriately for memory integration

Return ONLY valid JSON matching this schema:
{
  "key_events": [
    { "description": "Brief event description", "importance": "high|medium|low" }
  ],
  "npcs": [
    { "name": "NPC Name", "role": "Brief role", "status": "met|befriended|fought|killed|ongoing" }
  ],
  "items": [
    { "name": "Item name", "description": "Brief description", "rarity": "common|uncommon|rare|etc" }
  ],
  "locations": [
    { "name": "Location name", "description": "Brief description", "status": "visited|discovered|changed" }
  ],
  "consequences": [
    { "hook": "Future consequence or plot hook", "urgency": "immediate|soon|eventual" }
  ],
  "memorable_moments": [
    { "moment": "Quote or memorable moment", "context": "Brief context" }
  ],
  "session_themes": "1-2 sentence themes of the session",
  "player_view": "2-3 paragraph summary suitable for sharing with players. Focus on what happened from their perspective, exciting moments, and story progression.",
  "dm_view": "2-3 paragraph summary for DM notes. Include secrets revealed, prep that worked/didn't work, player decisions that change plans, and reminders for next session.",
  "memory_tags": ["Type:Name", "Type:Name"] (e.g., "NPC:Villain Name", "Location:City", "Event:Battle")
}`;

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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
    const sessionId = params.id;

    const { rawNotes, tone, includePlayerView, includeDmView } = await request.json();

    if (!rawNotes || rawNotes.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: 'Session notes are required' },
        { status: 400 }
      );
    }

    console.log('[Summary API] Fetching session:', sessionId);
    const { data: session, error: sessionError } = await supabase
      .from('sessions')
      .select('*, campaigns(id, name, user_id)')
      .eq('id', sessionId)
      .single();

    if (sessionError || !session) {
      console.error('[Summary API] Session not found:', { sessionId, error: sessionError });
      return NextResponse.json(
        { success: false, error: 'Session not found' },
        { status: 404 }
      );
    }

    const campaigns = session.campaigns as any;
    if (campaigns?.user_id !== user.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 403 }
      );
    }

    const codexContext = await buildAIContext(supabase, session.campaign_id);

    const partyInfo = session.party_info as any;
    const userPrompt = `Generate a comprehensive session summary for a tabletop RPG campaign.

Campaign Context: ${codexContext || 'No specific campaign context available'}
Session Title: ${session.title}
Session Number: ${session.session_number || 'N/A'}
Session Date: ${session.session_date ? new Date(session.session_date).toLocaleDateString() : 'Not specified'}
${partyInfo?.level ? `Party Level: ${partyInfo.level}` : ''}
${partyInfo?.size ? `Party Size: ${partyInfo.size}` : ''}
Requested Tone: ${tone || 'Neutral'}

Session Notes from DM:
${rawNotes}

Generate structured summary with all fields.
${!includePlayerView ? 'Keep player_view brief and minimal since it was not requested.' : ''}
${!includeDmView ? 'Keep dm_view brief and minimal since it was not requested.' : ''}`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userPrompt },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.7,
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      return NextResponse.json(
        { success: false, error: 'No response from AI' },
        { status: 500 }
      );
    }

    const summaryData = JSON.parse(content);

    console.log('[Summary API] Parsed summary data, about to update session');
    console.log('[Summary API] Session ID:', sessionId);
    console.log('[Summary API] User ID:', user.id);

    const { error: updateError } = await supabase
      .from('sessions')
      .update({
        summary_raw_notes: rawNotes,
        summary_tone: tone,
        summary_key_events: summaryData.key_events || [],
        summary_npcs: summaryData.npcs || [],
        summary_items: summaryData.items || [],
        summary_locations: summaryData.locations || [],
        summary_consequences: summaryData.consequences || [],
        summary_memorable_moments: summaryData.memorable_moments || [],
        summary_session_themes: summaryData.session_themes || '',
        summary_player_view: summaryData.player_view || '',
        summary_dm_view: summaryData.dm_view || '',
        summary_memory_tags: summaryData.memory_tags || [],
        summary_generated_at: new Date().toISOString(),
      })
      .eq('id', sessionId);

    if (updateError) {
      console.error('[Summary API] Error updating session with summary:', {
        error: updateError,
        code: updateError.code,
        message: updateError.message,
        details: updateError.details,
        hint: updateError.hint,
        sessionId,
        userId: user.id
      });
      return NextResponse.json(
        { success: false, error: `Failed to save summary: ${updateError.message}` },
        { status: 500 }
      );
    }

    logAIUsage({
      timestamp: new Date().toISOString(),
      endpoint: '/api/prep/sessions/[sessionId]/summary',
      model: 'gpt-4o',
      promptTokens: completion.usage?.prompt_tokens || 0,
      completionTokens: completion.usage?.completion_tokens || 0,
      totalTokens: completion.usage?.total_tokens || 0,
      userId: user.id,
      campaignId: session.campaign_id,
    });

    // Increment generation count
    await supabase.rpc('increment_user_generations', { user_id: user.id });

    return NextResponse.json({
      success: true,
      data: summaryData,
    });
  } catch (error) {
    console.error('[Summary API] Session summary generation error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { success: false, error: `Something went wrong: ${errorMessage}` },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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
    const sessionId = params.id;

    const { data: session, error: sessionError } = await supabase
      .from('sessions')
      .select(`
        summary_raw_notes,
        summary_tone,
        summary_key_events,
        summary_npcs,
        summary_items,
        summary_locations,
        summary_consequences,
        summary_memorable_moments,
        summary_session_themes,
        summary_player_view,
        summary_dm_view,
        summary_memory_tags,
        summary_generated_at,
        campaigns(user_id)
      `)
      .eq('id', sessionId)
      .single();

    if (sessionError || !session) {
      return NextResponse.json(
        { success: false, error: 'Session not found' },
        { status: 404 }
      );
    }

    const campaigns = session.campaigns as any;
    if (campaigns?.user_id !== user.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 403 }
      );
    }

    const hasSummary = !!session.summary_generated_at;

    return NextResponse.json({
      success: true,
      hasSummary,
      data: hasSummary ? {
        raw_notes: session.summary_raw_notes,
        tone: session.summary_tone,
        key_events: session.summary_key_events,
        npcs: session.summary_npcs,
        items: session.summary_items,
        locations: session.summary_locations,
        consequences: session.summary_consequences,
        memorable_moments: session.summary_memorable_moments,
        session_themes: session.summary_session_themes,
        player_view: session.summary_player_view,
        dm_view: session.summary_dm_view,
        memory_tags: session.summary_memory_tags,
        generated_at: session.summary_generated_at,
      } : null,
    });
  } catch (error) {
    console.error('Error fetching session summary:', error);
    return NextResponse.json(
      { success: false, error: 'Something went wrong' },
      { status: 500 }
    );
  }
}
