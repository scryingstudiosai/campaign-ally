import { NextRequest, NextResponse } from 'next/server';
import { createServerClientFromRequest, createAuthenticatedClient } from '@/lib/supabase/server';


export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';


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

    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const campaignId = searchParams.get('campaignId');
    const searchQuery = searchParams.get('q');
    const type = searchParams.get('type');
    const tagsParam = searchParams.get('tags');
    const sort = searchParams.get('sort') || 'newest';
    const limit = parseInt(searchParams.get('limit') || '24');
    const cursor = searchParams.get('cursor');

    if (!campaignId) {
      return NextResponse.json(
        { error: 'Campaign ID required' },
        { status: 400 }
      );
    }

    const { data: campaign } = await supabase
      .from('campaigns')
      .select('id')
      .eq('id', campaignId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (!campaign) {
      return NextResponse.json(
        { error: 'Campaign not found' },
        { status: 404 }
      );
    }

    let query = supabase
      .from('memory_chunks')
      .select('*')
      .eq('campaign_id', campaignId);

    if (searchQuery && searchQuery.trim()) {
      const searchTerm = `%${searchQuery.trim()}%`;
      query = query.or(`title.ilike.${searchTerm},text_content.ilike.${searchTerm}`);
    }

    if (type) {
      query = query.eq('type', type);
    }

    if (tagsParam) {
      const tags = tagsParam.split(',').filter(t => t.trim());
      if (tags.length > 0) {
        query = query.contains('tags', tags);
      }
    }

    switch (sort) {
      case 'oldest':
        query = query.order('created_at', { ascending: true });
        break;
      case 'title-asc':
        query = query.order('title', { ascending: true });
        break;
      case 'title-desc':
        query = query.order('title', { ascending: false });
        break;
      case 'newest':
      default:
        query = query.order('created_at', { ascending: false });
        break;
    }

    if (cursor) {
      query = query.lt('created_at', cursor);
    }

    query = query.limit(limit + 1);

    const { data, error } = await query;

    if (error) {
      console.error('Memory search error:', error);
      return NextResponse.json(
        { error: 'Failed to search memory' },
        { status: 500 }
      );
    }

    const hasMore = data.length > limit;
    const items = hasMore ? data.slice(0, limit) : data;
    const nextCursor = hasMore && items.length > 0
      ? items[items.length - 1].created_at
      : null;

    const memoryIds = items.map(item => item.id);

    let relationCounts: any[] = [];
    if (memoryIds.length > 0) {
      const { data } = await supabase
        .from('relations')
        .select('from_id, to_id')
        .or(`from_id.in.(${memoryIds.join(',')}),to_id.in.(${memoryIds.join(',')})`);
      relationCounts = data || [];
    }

    const countMap = new Map<string, number>();
    relationCounts?.forEach(rel => {
      countMap.set(rel.from_id, (countMap.get(rel.from_id) || 0) + 1);
      countMap.set(rel.to_id, (countMap.get(rel.to_id) || 0) + 1);
    });

    const previews = items.map((item) => {
      const contentStr = JSON.stringify(item.content);
      const preview = contentStr.substring(0, 150) + (contentStr.length > 150 ? '...' : '');
      return {
        id: item.id,
        type: item.type,
        forge_type: item.forge_type,
        title: item.title,
        preview,
        tags: item.tags || [],
        created_at: item.created_at,
        relations_count: countMap.get(item.id) || 0,
      };
    });

    return NextResponse.json({
      items: previews,
      nextCursor,
      hasMore
    });
  } catch (error) {
    console.error('Memory search error:', error);
    return NextResponse.json(
      { error: 'Something went wrong' },
      { status: 500 }
    );
  }
}
