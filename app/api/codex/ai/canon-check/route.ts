import { NextRequest, NextResponse } from 'next/server';
import { createServerClientFromRequest, createAuthenticatedClient } from '@/lib/supabase/server';
import { buildAIContext } from '@/lib/ai/context';

 export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Canon Check endpoint (stub for now)
 *
 * TODO: Implement full canon checking with OpenAI
 * TODO: Add top-K memory retrieval via vector search when embeddings are ready
 * TODO: Add UI button in Prep page
 */
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');

    const response = NextResponse.next();
    let supabase;
    if (token) {
      supabase = createAuthenticatedClient(token);
    } else {
      supabase = createServerClientFromRequest(request, response);
    }

    const body = await request.json();
    const { campaignId, content, type } = body;

    if (!campaignId || !content) {
      return NextResponse.json(
        { success: false, error: 'campaignId and content are required' },
        { status: 400 }
      );
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { data: campaign, error: campaignError } = await supabase
      .from('campaigns')
      .select('id, user_id')
      .eq('id', campaignId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (campaignError || !campaign) {
      return NextResponse.json(
        { success: false, error: 'Campaign not found or access denied' },
        { status: 404 }
      );
    }

    const context = await buildAIContext(supabase, campaignId);

    return NextResponse.json({
      success: true,
      data: {
        conflicts: [],
        warnings: [],
        suggestions: [],
      },
    });
  } catch (error) {
    console.error('Canon check error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
