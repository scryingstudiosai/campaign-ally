import { NextRequest, NextResponse } from 'next/server';
import { createServerClientFromRequest } from '@/lib/supabase/server';

 export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const response = NextResponse.next();
    const supabase = createServerClientFromRequest(request, response);
    const searchParams = request.nextUrl.searchParams;
    const campaignId = searchParams.get('campaignId');

    if (!campaignId) {
      return NextResponse.json(
        { success: false, error: 'campaignId is required' },
        { status: 400 }
      );
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    console.log('[Codex API] Auth result:', {
      hasUser: !!user,
      userId: user?.id,
      error: authError?.message,
      errorDetails: authError
    });

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized', details: authError?.message },
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

    let { data: codex, error: codexError } = await supabase
      .from('campaign_codex')
      .select('*')
      .eq('campaign_id', campaignId)
      .maybeSingle();

    if (codexError) {
      return NextResponse.json(
        { success: false, error: codexError.message },
        { status: 500 }
      );
    }

    if (!codex) {
      const { data: newCodex, error: insertError } = await supabase
        .from('campaign_codex')
        .insert({
          campaign_id: campaignId,
          themes: [],
          tone: { mood: 'balanced', humor_level: 'medium', violence: 'medium' },
          pillars: [],
          banned_content: [],
          allowed_sources: [],
          factions: [],
          major_arcs: [],
          timeline: [],
          foreshadowing: [],
          open_questions: [],
          player_secrets: {},
        })
        .select()
        .maybeSingle();

      if (insertError) {
        if (insertError.code === '23505') {
          const { data: retryCodex } = await supabase
            .from('campaign_codex')
            .select('*')
            .eq('campaign_id', campaignId)
            .maybeSingle();

          if (retryCodex) {
            codex = retryCodex;
          } else {
            return NextResponse.json(
              { success: false, error: 'Codex not found' },
              { status: 404 }
            );
          }
        } else {
          return NextResponse.json(
            { success: false, error: insertError.message },
            { status: 500 }
          );
        }
      } else {
        codex = newCodex;
      }
    }

    return NextResponse.json({ success: true, data: codex });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const response = NextResponse.next();
    const supabase = createServerClientFromRequest(request, response);
    const body = await request.json();
    const { campaignId, ...updates } = body;

    if (!campaignId) {
      return NextResponse.json(
        { success: false, error: 'campaignId is required' },
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

    const { data: codex, error: updateError } = await supabase
      .from('campaign_codex')
      .update(updates)
      .eq('campaign_id', campaignId)
      .select()
      .single();

    if (updateError) {
      return NextResponse.json(
        { success: false, error: updateError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, data: codex });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
