import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';

export const runtime = 'nodejs';

const UpdateSessionSchema = z.object({
  title: z.string().min(1, 'Title must not be empty').optional(),
  sessionDate: z.string().optional(),
  premise: z.string().optional(),
  partyInfo: z.record(z.any()).optional(),
  targetDuration: z.number().int().min(30).max(600).optional(),
  outline: z.record(z.any()).optional(),
  status: z.enum(['draft', 'ready', 'completed']).optional(),
  notes: z.string().optional(),
});

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  console.log('[GET /api/prep/sessions/[id]] Request for session:', params.id);
  try {
    const { id } = params;

    const headersObj: Record<string, string | null> = {};
    req.headers.forEach((value, key) => {
      headersObj[key] = value;
    });
    const authHeader = headersObj['authorization'];

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.warn('[GET /api/prep/sessions/[id]] Missing or invalid auth header');
      return NextResponse.json(
        { success: false, error: 'No authorization token provided' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    });

    console.log('[GET /api/prep/sessions/[id]] Fetching session from database...');
    const { data: session, error } = await supabase
      .from('sessions')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) {
      console.error('[GET /api/prep/sessions/[id]] Database error:', error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    if (!session) {
      console.warn('[GET /api/prep/sessions/[id]] Session not found');
      return NextResponse.json(
        { success: false, error: 'Session not found' },
        { status: 404 }
      );
    }

    console.log('[GET /api/prep/sessions/[id]] Session found:', session.title);
    return NextResponse.json({ success: true, data: session });
  } catch (error) {
    console.error('[GET /api/prep/sessions/[id]] Unexpected error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  console.log('[PATCH /api/prep/sessions/[id]] Request for session:', params.id);
  try {
    const { id } = params;

    const headersObj: Record<string, string | null> = {};
    req.headers.forEach((value, key) => {
      headersObj[key] = value;
    });
    const authHeader = headersObj['authorization'];

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, error: 'No authorization token provided' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    const body = await req.json();
    const validation = UpdateSessionSchema.safeParse(body);

    if (!validation.success) {
      const errors = validation.error.errors.map((e) => e.message).join(', ');
      return NextResponse.json(
        { success: false, error: errors },
        { status: 400 }
      );
    }

    const updates: any = {};
    const { title, sessionDate, premise, partyInfo, targetDuration, outline, status, notes } = validation.data;

    if (title !== undefined) updates.title = title;
    if (sessionDate !== undefined) updates.session_date = sessionDate;
    if (premise !== undefined) updates.premise = premise;
    if (partyInfo !== undefined) updates.party_info = partyInfo;
    if (targetDuration !== undefined) updates.target_duration = targetDuration;
    if (outline !== undefined) updates.outline = outline;
    if (status !== undefined) updates.status = status;
    if (notes !== undefined) updates.notes = notes;

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { success: false, error: 'No valid fields to update' },
        { status: 400 }
      );
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    });

    const { data: session, error } = await supabase
      .from('sessions')
      .update(updates)
      .eq('id', id)
      .select()
      .maybeSingle();

    if (error) {
      console.error('[PATCH /api/prep/sessions/[id]] Database error:', error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Session not found or unauthorized' },
        { status: 404 }
      );
    }

    console.log('[PATCH /api/prep/sessions/[id]] Session updated');
    return NextResponse.json({ success: true, data: session });
  } catch (error) {
    console.error('[PATCH /api/prep/sessions/[id]] Unexpected error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  console.log('[DELETE /api/prep/sessions/[id]] Request for session:', params.id);
  try {
    const { id } = params;

    const headersObj: Record<string, string | null> = {};
    req.headers.forEach((value, key) => {
      headersObj[key] = value;
    });
    const authHeader = headersObj['authorization'];

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, error: 'No authorization token provided' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    });

    const { error } = await supabase
      .from('sessions')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('[DELETE /api/prep/sessions/[id]] Database error:', error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    console.log('[DELETE /api/prep/sessions/[id]] Session deleted');
    return NextResponse.json({ success: true, data: { id } });
  } catch (error) {
    console.error('[DELETE /api/prep/sessions/[id]] Unexpected error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
