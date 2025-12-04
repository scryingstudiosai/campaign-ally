import { NextRequest, NextResponse } from 'next/server';
import { createServerClientFromRequest, createAuthenticatedClient } from '@/lib/supabase/server';

const RELATIONSHIP_MAP: Record<string, { forward: string; reverse: string }> = {
  owner: { forward: 'OWNS', reverse: 'OWNED_BY' },
  innkeeper: { forward: 'WORKS_AT', reverse: 'RUN_BY' },
  proprietor: { forward: 'OWNS', reverse: 'OWNED_BY' },
  staff: { forward: 'WORKS_AT', reverse: 'EMPLOYS' },
  patron: { forward: 'FREQUENTS', reverse: 'FREQUENTED_BY' },
  current_patron: { forward: 'FREQUENTS', reverse: 'FREQUENTED_BY' },
  item: { forward: 'SOLD_AT', reverse: 'SELLS' },
  notable_item: { forward: 'SOLD_AT', reverse: 'SELLS' },

  landmark: { forward: 'LOCATED_IN', reverse: 'CONTAINS' },
  notable: { forward: 'LIVES_IN', reverse: 'HOME_TO' },
  notable_npc: { forward: 'LIVES_IN', reverse: 'HOME_TO' },

  capital: { forward: 'CAPITAL_OF', reverse: 'HAS_CAPITAL' },
  leader: { forward: 'RULES', reverse: 'RULED_BY' },
  key_leader: { forward: 'RULES', reverse: 'RULED_BY' },

  headquarters: { forward: 'HEADQUARTERS_OF', reverse: 'HEADQUARTERED_AT' },
  guildmaster: { forward: 'LEADS', reverse: 'LED_BY' },

  minion: { forward: 'WORKS_FOR', reverse: 'COMMANDS' },
  lieutenant: { forward: 'SERVES', reverse: 'COMMANDS' },
  follower: { forward: 'SERVES', reverse: 'COMMANDS' },
  ally: { forward: 'ALLIED_WITH', reverse: 'ALLIED_WITH' },
  enemy: { forward: 'ENEMY_OF', reverse: 'ENEMY_OF' }
};

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

    const {
      sourceMemoryId,
      targetMemoryId,
      contextKey,
      campaignId
    } = await request.json();

    console.log('Auto-create relationship request:', {
      sourceMemoryId,
      targetMemoryId,
      contextKey,
      campaignId
    });

    if (!sourceMemoryId || !targetMemoryId || !contextKey || !campaignId) {
      console.error('Missing required fields:', { sourceMemoryId, targetMemoryId, contextKey, campaignId });
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const relationshipTypes = RELATIONSHIP_MAP[contextKey];

    if (!relationshipTypes) {
      console.log(`No relationship mapping found for contextKey: ${contextKey}`);
      return NextResponse.json({
        success: true,
        created: false,
        message: 'No relationship mapping for this context'
      });
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { data: existing } = await supabase
      .from('relations')
      .select('*')
      .eq('campaign_id', campaignId)
      .or(
        `and(from_id.eq.${sourceMemoryId},to_id.eq.${targetMemoryId}),` +
        `and(from_id.eq.${targetMemoryId},to_id.eq.${sourceMemoryId})`
      );

    if (existing && existing.length > 0) {
      console.log('Relationships already exist');
      return NextResponse.json({
        success: true,
        created: false,
        message: 'Relationships already exist'
      });
    }

    const relationships = [
      {
        from_id: targetMemoryId,
        to_id: sourceMemoryId,
        relation_type: relationshipTypes.forward,
        campaign_id: campaignId,
        created_by: user.id
      },
      {
        from_id: sourceMemoryId,
        to_id: targetMemoryId,
        relation_type: relationshipTypes.reverse,
        campaign_id: campaignId,
        created_by: user.id
      }
    ];

    const { data, error } = await supabase
      .from('relations')
      .insert(relationships)
      .select();

    if (error) {
      console.error('Error creating relationships:', error);
      throw error;
    }

    console.log(`Auto-created relationships: ${relationshipTypes.forward} ↔ ${relationshipTypes.reverse}`);

    return NextResponse.json({
      success: true,
      created: true,
      relationships: data,
      relationTypes: relationshipTypes
    });
  } catch (error: any) {
    console.error('Auto-create relationship error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
