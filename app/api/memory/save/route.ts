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
    const { campaignId, type, title, content, tags, user_notes, forge_type, text_content } = body;

    console.log('Memory save request:', { campaignId, type, title, forge_type, hasTags: !!tags, hasNotes: !!user_notes });

    if (!campaignId || !type || !title || !content) {
      console.error('Missing required fields:', { campaignId, type, title, content });
      return NextResponse.json(
        { success: false, error: 'Missing required fields: campaignId, type, title, and content are required' },
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
      console.error('Campaign not found:', campaignId);
      return NextResponse.json(
        { success: false, error: 'Campaign not found or access denied' },
        { status: 404 }
      );
    }

    const textContent = text_content || (typeof content === 'string' ? content : JSON.stringify(content));

    const insertData: any = {
      campaign_id: campaignId,
      type,
      title,
      content,
      text_content: textContent,
      archived: false,
      is_pinned: false,
    };

    if (forge_type) {
      insertData.forge_type = forge_type;
    }

    if (tags && Array.isArray(tags) && tags.length > 0) {
      insertData.tags = tags;
    }

    if (user_notes) {
      insertData.user_notes = user_notes;
    }

    console.log('Inserting memory with data:', insertData);

    const { data, error } = await supabase
      .from('memory_chunks')
      .insert(insertData)
      .select()
      .single();

    if (error) {
      console.error('Memory save database error:', error);
      return NextResponse.json(
        { success: false, error: `Failed to save to memory: ${error.message}` },
        { status: 500 }
      );
    }

    console.log('Memory saved successfully:', data.id);
    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Memory save unexpected error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Something went wrong' },
      { status: 500 }
    );
  }
}
