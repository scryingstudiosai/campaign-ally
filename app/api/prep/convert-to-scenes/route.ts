import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const ConvertToScenesSchema = z.object({
  sessionId: z.string().uuid('Session ID must be a valid UUID'),
});

interface SceneData {
  boxedText: string;
  npcs: string[];
  skillChecks: string[];
  contingencies: string[];
  rewards: Record<string, any>;
  notes: string;
  estimatedDuration: string;
  mood: string;
  mapRequired: boolean;
  relatedMemories: string[];
}

interface Beat {
  title: string;
  description?: string;
  duration?: number;
  objectives?: string[];
  challenges?: string[];
}

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
    const validation = ConvertToScenesSchema.safeParse(body);

    if (!validation.success) {
      const errors = validation.error.errors.map((e) => e.message).join(', ');
      return NextResponse.json(
        { success: false, error: errors },
        { status: 400 }
      );
    }

    const { sessionId } = validation.data;

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    });

    const { data: session, error: sessionError } = await supabase
      .from('sessions')
      .select('outline')
      .eq('id', sessionId)
      .maybeSingle();

    if (sessionError) {
      return NextResponse.json(
        { success: false, error: sessionError.message },
        { status: 500 }
      );
    }

    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Session not found or unauthorized' },
        { status: 404 }
      );
    }

    const outline = session.outline as any;
    if (!outline || !Array.isArray(outline.beats) || outline.beats.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Session outline has no beats to convert' },
        { status: 400 }
      );
    }

    const beats: Beat[] = outline.beats;
    const scenesToCreate = beats.map((beat, index) => {
      const sceneData: SceneData = {
        boxedText: '',
        npcs: [],
        skillChecks: [],
        contingencies: [],
        rewards: {},
        notes: '',
        estimatedDuration: beat.duration ? `${beat.duration} min` : '15-30 min',
        mood: 'balanced',
        mapRequired: false,
        relatedMemories: [],
      };

      return {
        session_id: sessionId,
        index_order: index + 1,
        title: beat.title || `Scene ${index + 1}`,
        data: sceneData,
      };
    });

    const { data: createdScenes, error: insertError } = await supabase
      .from('scenes')
      .insert(scenesToCreate)
      .select();

    if (insertError) {
      return NextResponse.json(
        { success: false, error: insertError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        scenesCreated: createdScenes.length,
        scenes: createdScenes,
      },
    });
  } catch (error) {
    console.error('Convert to scenes error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
