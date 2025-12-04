import { NextRequest, NextResponse } from 'next/server';
import { createServerClientFromRequest, createAuthenticatedClient } from '@/lib/supabase/server';
import { getInverseRelationType } from '@/lib/relation-inverses';


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
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const memoryId = searchParams.get('memoryId');

    if (!memoryId) {
      return NextResponse.json({ error: 'Memory ID required' }, { status: 400 });
    }

    const { data: outgoing, error: outgoingError } = await supabase
      .from('relations')
      .select(`
        id,
        relation_type,
        to_id,
        created_at,
        to:memory_chunks!relations_to_id_fkey(id, title, type, forge_type)
      `)
      .eq('from_id', memoryId);

    const { data: incoming, error: incomingError } = await supabase
      .from('relations')
      .select(`
        id,
        relation_type,
        from_id,
        created_at,
        from:memory_chunks!relations_from_id_fkey(id, title, type, forge_type)
      `)
      .eq('to_id', memoryId);

    if (outgoingError || incomingError) {
      console.error('Relations fetch error:', outgoingError || incomingError);
      return NextResponse.json(
        { error: 'Failed to fetch relations' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      outgoing: outgoing || [],
      incoming: incoming || []
    });
  } catch (error) {
    console.error('Relations API error:', error);
    return NextResponse.json(
      { error: 'Something went wrong' },
      { status: 500 }
    );
  }
}

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
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { campaignId, fromId, toId, relationType } = body;

    if (!campaignId || !fromId || !toId || !relationType) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const validTypes = [
      'related_to',
      'located_in',
      'contains',
      'works_for',
      'employs',
      'created_by',
      'created',
      'member_of',
      'has_member',
      'commands',
      'commanded_by',
      'guards',
      'guarded_by',
      'owns',
      'owned_by',
      'fears',
      'feared_by',
      'worships',
      'worshipped_by',
      'serves',
      'served_by',
      'betrayed_by',
      'betrayed',
      'indebted_to',
      'debt_owed_by',
      'mentored_by',
      'mentors',
      'rival_of',
      'knows_secret_about',
      'secret_known_by',
      'allied_with',
      'opposed_to',
      'seeks',
      'sought_by',
      'inhabits',
      'inhabited_by'
    ];

    if (!validTypes.includes(relationType)) {
      return NextResponse.json(
        { error: 'Invalid relation type' },
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
        { error: 'Campaign not found or access denied' },
        { status: 404 }
      );
    }

    // Check if entries exist and are in the same campaign
    const { data: fromEntry } = await supabase
      .from('memory_chunks')
      .select('id, campaign_id')
      .eq('id', fromId)
      .eq('campaign_id', campaignId)
      .maybeSingle();

    const { data: toEntry } = await supabase
      .from('memory_chunks')
      .select('id, campaign_id')
      .eq('id', toId)
      .eq('campaign_id', campaignId)
      .maybeSingle();

    if (!fromEntry || !toEntry) {
      return NextResponse.json(
        { error: 'One or both memory entries not found in this campaign' },
        { status: 404 }
      );
    }

    // Check for self-reference
    if (fromId === toId) {
      return NextResponse.json(
        { error: 'Cannot create relationship to same entry' },
        { status: 400 }
      );
    }

    // Check for duplicate relationship
    const { data: existing } = await supabase
      .from('relations')
      .select('id')
      .eq('from_id', fromId)
      .eq('to_id', toId)
      .eq('relation_type', relationType)
      .maybeSingle();

    if (existing) {
      return NextResponse.json(
        { error: 'This relationship already exists' },
        { status: 409 }
      );
    }

    // Create the primary relationship
    const { data, error } = await supabase
      .from('relations')
      .insert({
        campaign_id: campaignId,
        from_id: fromId,
        to_id: toId,
        relation_type: relationType,
        created_by: user.id
      })
      .select()
      .single();

    if (error) {
      console.error('Relation creation error:', error);
      return NextResponse.json(
        { error: 'Failed to create relation', details: error.message, code: error.code },
        { status: 500 }
      );
    }

    // Automatically create inverse relationship
    const inverseRelationType = getInverseRelationType(relationType as any);

    // Check if inverse relationship already exists
    const { data: existingInverse } = await supabase
      .from('relations')
      .select('id')
      .eq('from_id', toId)
      .eq('to_id', fromId)
      .eq('relation_type', inverseRelationType)
      .maybeSingle();

    let inverseData = null;
    if (!existingInverse) {
      const { data: inverse, error: inverseError } = await supabase
        .from('relations')
        .insert({
          campaign_id: campaignId,
          from_id: toId,
          to_id: fromId,
          relation_type: inverseRelationType,
          created_by: user.id
        })
        .select()
        .single();

      if (!inverseError) {
        inverseData = inverse;
      } else {
        console.warn('Inverse relation creation failed (non-critical):', inverseError);
      }
    }

    return NextResponse.json({
      data,
      inverse: inverseData,
      message: inverseData ? 'Relationship and inverse created' : 'Relationship created'
    });
  } catch (error) {
    console.error('Relations API error:', error);
    return NextResponse.json(
      { error: 'Something went wrong' },
      { status: 500 }
    );
  }
}
