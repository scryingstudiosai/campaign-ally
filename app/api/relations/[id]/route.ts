import { type NextRequest } from 'next/server';
import { createAuthenticatedClient } from '@/lib/supabase/server';

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    console.log('=== DELETE RELATION START ===');

    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      console.log('❌ No auth header');
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    console.log('✅ Token length:', token.length);

    const params = await context.params;
    const relationId = params.id;
    console.log('✅ Relation ID:', relationId);

    const supabase = createAuthenticatedClient(token);
    console.log('✅ Supabase client created');

    // Get relation
    console.log('📝 Fetching relation...');
    const { data: relation, error: relationError } = await supabase
      .from('relations')
      .select('from_id, to_id, campaign_id')
      .eq('id', relationId)
      .single();

    if (relationError) {
      console.error('❌ Relation error:', relationError.message, relationError.code, relationError.details);
      return Response.json({ error: 'Not found', details: relationError.message }, { status: 404 });
    }
    console.log('✅ Relation found:', relation);

    // Check campaign access
    console.log('📝 Checking campaign:', relation.campaign_id);
    const { data: campaign, error: campaignError } = await supabase
      .from('campaigns')
      .select('id')
      .eq('id', relation.campaign_id)
      .maybeSingle();

    if (campaignError) {
      console.error('❌ Campaign error:', campaignError.message, campaignError.code, campaignError.details);
      return Response.json({ error: 'Forbidden', details: campaignError.message }, { status: 403 });
    }
    if (!campaign) {
      console.error('❌ Campaign not found or no access');
      return Response.json({ error: 'Forbidden', details: 'Cannot access campaign' }, { status: 403 });
    }
    console.log('✅ Campaign access OK:', campaign.id);

    // Delete
    console.log('📝 Deleting relation...');
    const { data: deleteData, error: deleteError } = await supabase
      .from('relations')
      .delete()
      .eq('id', relationId)
      .select();

    if (deleteError) {
      console.error('❌ DELETE FAILED:', deleteError.message, deleteError.code, deleteError.details);
      return Response.json({ error: 'Delete failed', details: deleteError.message }, { status: 500 });
    }
    console.log('✅ Delete successful. Deleted rows:', deleteData);

    // Find and delete inverse relationships
    console.log('📝 Looking for inverses...');
    const { data: inverses, error: inverseFetchError } = await supabase
      .from('relations')
      .select('id')
      .eq('from_id', relation.to_id)
      .eq('to_id', relation.from_id);

    let inversesDeleted = 0;
    if (inverseFetchError) {
      console.error('❌ Error fetching inverses:', inverseFetchError.message);
    } else if (inverses && inverses.length > 0) {
      console.log(`✅ Found ${inverses.length} inverse(s):`, inverses);

      const inverseIds = inverses.map(inv => inv.id);
      const { error: inverseDeleteError, count } = await supabase
        .from('relations')
        .delete({ count: 'exact' })
        .in('id', inverseIds);

      if (inverseDeleteError) {
        console.error('❌ Error deleting inverses:', inverseDeleteError.message);
      } else {
        inversesDeleted = count || 0;
        console.log(`✅ Deleted ${inversesDeleted} inverse(s)`);
      }
    } else {
      console.log('ℹ️ No inverses found');
    }

    console.log('=== DELETE COMPLETE ===');
    return Response.json({
      success: true,
      message: inversesDeleted > 0 ? `Deleted relationship and ${inversesDeleted} inverse(s)` : 'Deleted'
    }, { status: 200 });

  } catch (error) {
    console.error('=== EXCEPTION ===', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return Response.json({ error: 'Server error', details: errorMessage }, { status: 500 });
  }
}
