import { NextRequest, NextResponse } from 'next/server';
import { createServerClientFromRequest, createAuthenticatedClient } from '@/lib/supabase/server';


export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';


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

    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const memoryId = params.id;

    const { data: memory, error: fetchError } = await supabase
      .from('memory_chunks')
      .select(`
        *,
        campaigns!inner(user_id)
      `)
      .eq('id', memoryId)
      .single();

    if (fetchError || !memory) {
      return NextResponse.json(
        { error: 'Memory not found' },
        { status: 404 }
      );
    }

    if (memory.campaigns.user_id !== user.id) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }

    const { campaigns, ...memoryData } = memory;

    return NextResponse.json({ success: true, data: memoryData });
  } catch (error) {
    console.error('Memory GET error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PATCH(
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

    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const memoryId = params.id;
    const body = await request.json();
    const { title, content, tags, user_notes, type, text_content } = body;

    const { data: existingMemory, error: fetchError } = await supabase
      .from('memory_chunks')
      .select(`
        *,
        campaigns!inner(user_id)
      `)
      .eq('id', memoryId)
      .single();

    if (fetchError || !existingMemory) {
      return NextResponse.json(
        { error: 'Memory not found' },
        { status: 404 }
      );
    }

    if (existingMemory.campaigns.user_id !== user.id) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }

    const updateData: any = {};
    if (title !== undefined) updateData.title = title;
    if (content !== undefined) updateData.content = content;
    if (user_notes !== undefined) updateData.user_notes = user_notes;
    if (tags !== undefined) updateData.tags = tags;
    if (type !== undefined) updateData.type = type;
    if (text_content !== undefined) updateData.text_content = text_content;

    const { data: updatedMemory, error: updateError } = await supabase
      .from('memory_chunks')
      .update(updateData)
      .eq('id', memoryId)
      .select()
      .maybeSingle();

    if (updateError) {
      console.error('Memory update error:', updateError);
      return NextResponse.json(
        { error: `Failed to update memory: ${updateError.message}` },
        { status: 500 }
      );
    }

    if (!updatedMemory) {
      console.error('No memory returned after update');
      return NextResponse.json(
        { error: 'Failed to update memory: No data returned' },
        { status: 500 }
      );
    }

    if (tags !== undefined) {
      const oldTags = existingMemory.tags || [];
      const newTags = tags || [];

      const removedTags = oldTags.filter((tag: string) => !newTags.includes(tag));
      const addedTags = newTags.filter((tag: string) => !oldTags.includes(tag));

      for (const tag of removedTags) {
        await supabase.rpc('decrement_tag_use_count', {
          p_campaign_id: existingMemory.campaign_id,
          p_tag_name: tag,
        });
      }

      for (const tag of addedTags) {
        await supabase.rpc('increment_tag_use_count', {
          p_campaign_id: existingMemory.campaign_id,
          p_tag_name: tag,
        });
      }
    }

    return NextResponse.json({ success: true, data: updatedMemory });
  } catch (error) {
    console.error('Memory PATCH error:', error);
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

    const memoryId = params.id;

    const { data: existingMemory, error: fetchError } = await supabase
      .from('memory_chunks')
      .select(`
        *,
        campaigns!inner(user_id)
      `)
      .eq('id', memoryId)
      .single();

    if (fetchError || !existingMemory) {
      return NextResponse.json(
        { error: 'Memory not found' },
        { status: 404 }
      );
    }

    if (existingMemory.campaigns.user_id !== user.id) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }

    const tagsToDecrement = existingMemory.tags || [];

    const { error: deleteError } = await supabase
      .from('memory_chunks')
      .delete()
      .eq('id', memoryId);

    if (deleteError) {
      console.error('Memory delete error:', deleteError);
      return NextResponse.json(
        { error: 'Failed to delete memory' },
        { status: 500 }
      );
    }

    for (const tag of tagsToDecrement) {
      await supabase.rpc('decrement_tag_use_count', {
        p_campaign_id: existingMemory.campaign_id,
        p_tag_name: tag,
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Memory DELETE error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
