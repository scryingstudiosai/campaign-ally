import { NextRequest, NextResponse } from 'next/server';
import { createAuthenticatedClient } from '@/lib/supabase/server';

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    console.log('=== ARCHIVE/UNARCHIVE START ===');

    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      console.log('❌ No auth header');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const params = await context.params;
    const entryId = params.id;
    console.log('✅ Entry ID:', entryId);

    const body = await request.json();
    const { archived } = body;

    if (archived === undefined) {
      console.log('❌ Missing archived status');
      return NextResponse.json({ error: 'Archived status is required' }, { status: 400 });
    }
    console.log('✅ Setting archived to:', archived);

    const supabase = createAuthenticatedClient(token);

    // First verify the entry exists and user has access via RLS
    console.log('📝 Checking entry access...');
    const { data: entry, error: fetchError } = await supabase
      .from('memory_chunks')
      .select('id, campaign_id')
      .eq('id', entryId)
      .maybeSingle();

    if (fetchError) {
      console.error('❌ Fetch error:', fetchError.message, fetchError.code);
      return NextResponse.json({ error: 'Failed to access entry', details: fetchError.message }, { status: 500 });
    }

    if (!entry) {
      console.error('❌ Entry not found or no access');
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    console.log('✅ Entry found, campaign:', entry.campaign_id);

    // Update archive status
    console.log('📝 Updating archive status...');
    const { data, error } = await supabase
      .from('memory_chunks')
      .update({ archived, last_edited_at: new Date().toISOString() })
      .eq('id', entryId)
      .select()
      .maybeSingle();

    if (error) {
      console.error('❌ Update error:', error.message, error.code, error.details);
      return NextResponse.json({ error: 'Failed to update archive status', details: error.message }, { status: 500 });
    }

    if (!data) {
      console.error('❌ Update returned no data');
      return NextResponse.json({ error: 'Update failed' }, { status: 500 });
    }

    console.log('✅ Archive status updated successfully');
    console.log('=== ARCHIVE/UNARCHIVE COMPLETE ===');
    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('=== EXCEPTION ===', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: 'Internal server error', details: errorMessage }, { status: 500 });
  }
}
