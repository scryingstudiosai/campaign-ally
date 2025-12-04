import { NextRequest, NextResponse } from 'next/server';
import { createServerClientFromRequest, createAuthenticatedClient } from '@/lib/supabase/server';


export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';


export async function POST(request: NextRequest) {
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

    const body = await request.json();
    const {
      campaignId,
      type,
      title,
      content,
      tags = [],
      created_in_session_id = null,
      user_notes = null
    } = body;

    if (!campaignId || !type || !title || !content) {
      return NextResponse.json(
        { error: 'Missing required fields: campaignId, type, title, content' },
        { status: 400 }
      );
    }

    const { data: campaign } = await supabase
      .from('campaigns')
      .select('id')
      .eq('id', campaignId)
      .eq('user_id', user.id)
      .single();

    if (!campaign) {
      return NextResponse.json(
        { error: 'Campaign not found or access denied' },
        { status: 404 }
      );
    }

    const { data: memoryData, error: insertError } = await supabase
      .from('memory_chunks')
      .insert({
        campaign_id: campaignId,
        type,
        title,
        content,
        tags,
        created_in_session_id,
        user_notes,
      })
      .select()
      .single();

    if (insertError) {
      console.error('Memory insert error:', insertError);
      return NextResponse.json(
        { error: 'Failed to save memory' },
        { status: 500 }
      );
    }

    if (tags && tags.length > 0) {
      for (const tagName of tags) {
        const { error: tagError } = await supabase.rpc('increment_tag_use_count', {
          p_campaign_id: campaignId,
          p_tag_name: tagName,
        });

        if (tagError) {
          console.error('Tag increment error:', tagError);
        }
      }
    }

    return NextResponse.json({ success: true, data: memoryData });
  } catch (error) {
    console.error('Memory POST error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

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
    const search = searchParams.get('search');
    const typesParam = searchParams.getAll('type');
    const tagsParam = searchParams.getAll('tags');

    if (!campaignId) {
      return NextResponse.json(
        { error: 'campaignId is required' },
        { status: 400 }
      );
    }

    const { data: campaign } = await supabase
      .from('campaigns')
      .select('id')
      .eq('id', campaignId)
      .eq('user_id', user.id)
      .single();

    if (!campaign) {
      return NextResponse.json(
        { error: 'Campaign not found or access denied' },
        { status: 404 }
      );
    }

    let query = supabase
      .from('memory_chunks')
      .select('id, type, title, tags, created_at, last_edited_at, forge_type')
      .eq('campaign_id', campaignId);

    if (typesParam.length > 0) {
      query = query.in('type', typesParam);
    }

    if (tagsParam.length > 0) {
      query = query.overlaps('tags', tagsParam);
    }

    if (search && search.trim()) {
      query = query.or(`title.ilike.%${search}%,content::text.ilike.%${search}%`);
    }

    query = query.order('last_edited_at', { ascending: false });

    const { data: memories, error: fetchError } = await query;

    if (fetchError) {
      console.error('Memory fetch error:', fetchError);
      return NextResponse.json(
        { error: 'Failed to fetch memories' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, data: memories || [] });
  } catch (error) {
    console.error('Memory GET error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
