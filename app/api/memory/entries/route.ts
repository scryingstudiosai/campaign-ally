import { NextRequest, NextResponse } from 'next/server';
import { createServerClientFromRequest, createAuthenticatedClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const response = NextResponse.next();
    const authHeader = request.headers.get('Authorization');
    const token = authHeader?.replace('Bearer ', '');

    let supabase;
    if (token) {
      supabase = createAuthenticatedClient(token);
    } else {
      supabase = createServerClientFromRequest(request, response);
    }

    const searchParams = request.nextUrl.searchParams;
    const campaignId = searchParams.get('campaignId');
    const type = searchParams.get('type');
    const sort = searchParams.get('sort') || 'recent';
    const filter = searchParams.get('filter');

    console.log('[Memory API] GET request:', { campaignId, type, sort, filter });

    if (!campaignId) {
      console.error('[Memory API] Missing campaignId');
      return NextResponse.json(
        { error: 'Campaign ID is required' },
        { status: 400 }
      );
    }

    let query = supabase
      .from('memory_chunks')
      .select('id, campaign_id, type, title, tags, created_at, last_edited_at, forge_type, archived, is_pinned')
      .eq('campaign_id', campaignId);

    if (type && type !== 'all') {
      query = query.eq('type', type);
    }

    if (filter === 'pinned') {
      query = query.eq('is_pinned', true);
    } else if (filter === 'archived') {
      query = query.eq('archived', true);
    } else if (filter === 'recent') {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      query = query.gte('created_at', sevenDaysAgo.toISOString());
    } else {
      query = query.eq('archived', false);
    }

    switch (sort) {
      case 'oldest':
        query = query.order('created_at', { ascending: true });
        break;
      case 'alphabetical':
        query = query.order('title', { ascending: true });
        break;
      case 'alphabetical-desc':
        query = query.order('title', { ascending: false });
        break;
      default:
        const orderColumn = 'last_edited_at';
        query = query.order(orderColumn, { ascending: false });
    }

    const { data, error } = await query;

    if (error) {
      console.error('[Memory API] Error fetching memories:', error);
      return NextResponse.json(
        { error: 'Failed to fetch memories', details: error.message },
        { status: 500 }
      );
    }

    console.log(`[Memory API] Found ${data?.length || 0} memories`);

    const transformedData = (data || []).map((item: any) => ({
      ...item,
      name: item.title,
      pinned: item.is_pinned || false,
      updated_at: item.last_edited_at || item.created_at,
    }));

    return NextResponse.json({ success: true, data: transformedData });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const response = NextResponse.next();
    const supabase = createServerClientFromRequest(request, response);

    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      console.error('[Memory API POST] No authenticated user');
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const {
      campaignId,
      userId,
      name,
      type,
      category,
      content,
      summary,
      dmNotes,
      tags,
      colorCode,
      pinned,
      firstAppearance,
    } = body;

    console.log('[Memory API POST] Creating memory:', { campaignId, name, type, user: user.id });

    if (!campaignId || !name || !type) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('memory_chunks')
      .insert({
        campaign_id: campaignId,
        type: type.toLowerCase(),
        title: name,
        content: content,
        text_content: content,
        user_notes: dmNotes || null,
        tags: tags || [],
        is_pinned: pinned || false,
        archived: false,
      })
      .select()
      .single();

    if (error) {
      console.error('[Memory API POST] Error creating memory:', error);
      return NextResponse.json(
        { error: 'Failed to create memory entry', details: error.message },
        { status: 500 }
      );
    }

    console.log('[Memory API POST] Successfully created memory:', data.id);
    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('[Memory API POST] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
