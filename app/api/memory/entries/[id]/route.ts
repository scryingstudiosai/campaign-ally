import { NextRequest, NextResponse } from 'next/server';
import { createServerClientFromRequest, createAuthenticatedClient } from '@/lib/supabase/server';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const { data, error } = await supabase
      .from('memory_chunks')
      .select('*')
      .eq('id', params.id)
      .single();

    if (error) {
      console.error('Error fetching memory:', error);
      return NextResponse.json(
        { error: 'Memory not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const body = await request.json();
    const {
      name,
      type,
      category,
      content,
      summary,
      dmNotes,
      tags,
      colorCode,
      pinned,
      archived,
      firstAppearance,
    } = body;

    const updateData: any = {
      last_edited_at: new Date().toISOString(),
    };

    if (name !== undefined) updateData.title = name;
    if (type !== undefined) updateData.type = type;
    if (category !== undefined) updateData.category = category;
    if (content !== undefined) updateData.content = content;
    if (summary !== undefined) updateData.summary = summary;
    if (dmNotes !== undefined) updateData.user_notes = dmNotes;
    if (tags !== undefined) updateData.tags = tags;
    if (colorCode !== undefined) updateData.color_code = colorCode;
    if (pinned !== undefined) updateData.is_pinned = pinned;
    if (archived !== undefined) updateData.archived = archived;
    if (firstAppearance !== undefined) updateData.first_appearance = firstAppearance;

    const { data, error } = await supabase
      .from('memory_chunks')
      .update(updateData)
      .eq('id', params.id)
      .select()
      .single();

    if (error) {
      console.error('Error updating memory:', error);
      return NextResponse.json(
        { error: 'Failed to update memory' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    console.log('[DELETE] Starting delete request for ID:', params.id);
    const response = NextResponse.next();
    const authHeader = request.headers.get('Authorization');
    const token = authHeader?.replace('Bearer ', '');
    console.log('[DELETE] Auth token present:', !!token);

    let supabase;
    if (token) {
      supabase = createAuthenticatedClient(token);
    } else {
      console.log('[DELETE] No token, using server client from request');
      supabase = createServerClientFromRequest(request, response);
    }

    console.log('[DELETE] Attempting to delete from memory_chunks');
    const { error, data } = await supabase
      .from('memory_chunks')
      .delete()
      .eq('id', params.id)
      .select();

    console.log('[DELETE] Delete result - error:', error, 'data:', data);

    if (error) {
      console.error('[DELETE] Supabase error:', JSON.stringify(error, null, 2));
      return NextResponse.json(
        { error: 'Failed to delete memory', details: error.message },
        { status: 500 }
      );
    }

    console.log('[DELETE] Delete successful');
    return NextResponse.json({ success: true, id: params.id });
  } catch (error) {
    console.error('[DELETE] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
