import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const ReorderSchema = z.object({
  sessionId: z.string().uuid('Session ID must be a valid UUID'),
  sceneIds: z.array(z.string().uuid('Scene ID must be a valid UUID')),
});

export async function POST(req: NextRequest) {
  try {
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
    const validation = ReorderSchema.safeParse(body);

    if (!validation.success) {
      const errors = validation.error.errors.map((e) => e.message).join(', ');
      return NextResponse.json(
        { success: false, error: errors },
        { status: 400 }
      );
    }

    const { sessionId, sceneIds } = validation.data;

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    });

    const updates = sceneIds.map((sceneId, index) =>
      supabase
        .from('scenes')
        .update({ index_order: index + 1 })
        .eq('id', sceneId)
        .eq('session_id', sessionId)
    );

    const results = await Promise.all(updates);

    const errors = results.filter((r) => r.error);
    if (errors.length > 0) {
      return NextResponse.json(
        { success: false, error: 'Failed to reorder some scenes' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Scenes reordered successfully',
    });
  } catch (error) {
    console.error('Reorder scenes error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
