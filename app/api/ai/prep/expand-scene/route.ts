import { NextRequest, NextResponse } from 'next/server';
import { createServerClientFromRequest, createAuthenticatedClient } from '@/lib/supabase/server';
import { buildPrepContext } from '@/lib/ai/context';
import { z } from 'zod';
import OpenAI from 'openai';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const ExpandSceneSchema = z.object({
  campaignId: z.string().uuid('Campaign ID must be a valid UUID'),
  sessionId: z.string().uuid('Session ID must be a valid UUID'),
  sceneId: z.string().uuid('Scene ID must be a valid UUID'),
  beat: z.record(z.any()),
  useCanon: z.boolean().optional(),
});

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface SceneData {
  boxedText?: string;
  npcs?: string[];
  skillChecks?: string[];
  contingencies?: string[];
  rewards?: Record<string, any>;
  notes?: string;
  estimatedDuration?: string;
  mood?: string;
  mapRequired?: boolean;
  relatedMemories?: string[];
}

function mergeSceneData(existing: SceneData, generated: SceneData): SceneData {
  return {
    boxedText: existing.boxedText || generated.boxedText || '',
    npcs: [...(existing.npcs || []), ...(generated.npcs || [])],
    skillChecks: [...(existing.skillChecks || []), ...(generated.skillChecks || [])],
    contingencies: [...(existing.contingencies || []), ...(generated.contingencies || [])],
    rewards: { ...(generated.rewards || {}), ...(existing.rewards || {}) },
    notes: existing.notes || generated.notes || '',
    estimatedDuration: existing.estimatedDuration || generated.estimatedDuration || '15-30 min',
    mood: existing.mood || generated.mood || 'balanced',
    mapRequired: existing.mapRequired !== undefined ? existing.mapRequired : (generated.mapRequired || false),
    relatedMemories: [...(existing.relatedMemories || []), ...(generated.relatedMemories || [])],
  };
}

async function generateSceneWithRetry(systemPrompt: string, userPrompt: string, maxRetries = 1): Promise<any> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.7,
        max_tokens: 1500,
      });

      const responseText = completion.choices[0]?.message?.content;
      if (!responseText) {
        throw new Error('Empty response from AI');
      }

      return JSON.parse(responseText);
    } catch (parseError) {
      if (attempt < maxRetries) {
        continue;
      }
      throw parseError;
    }
  }
}

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    const response = NextResponse.next();
    const supabaseAuth = createServerClientFromRequest(req, response);
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const supabase = createAuthenticatedClient(token);
    const body = await req.json();
    const validation = ExpandSceneSchema.safeParse(body);

    if (!validation.success) {
      const errors = validation.error.errors.map((e) => e.message).join(', ');
      return NextResponse.json(
        { success: false, error: errors },
        { status: 400 }
      );
    }

    const { campaignId, sessionId, sceneId, beat, useCanon = true } = validation.data;

    let contextPrefix = '';
    if (useCanon) {
      contextPrefix = await buildPrepContext(supabase, campaignId, {
        includeMemories: true,
        memoryLimit: 10,

      });
    }

    const systemPrompt = `You are an expert D&D Dungeon Master assistant. Expand a session beat into a detailed scene for the DM to run.

${contextPrefix ? `# CAMPAIGN CONTEXT\n${contextPrefix}\n\n` : ''}

Create a detailed scene with:
- boxedText: Read-aloud text for the DM to describe the scene (2-4 sentences, evocative and immersive)
- npcs: Array of NPC names that appear in this scene
- skillChecks: Array of skill check descriptions (e.g., "DC 15 Perception to notice hidden passage")
- contingencies: Array of backup plans if players go off-script
- rewards: Object with keys like gold, items, xp, information
- notes: DM notes with tips, lore, or reminders
- estimatedDuration: Time estimate (e.g., "20-30 min")
- mood: One of: tense, mysterious, lighthearted, dramatic, balanced
- mapRequired: Boolean - does this scene need a battle map?
- relatedMemories: Array of memory chunk IDs (leave empty, DM will link manually)

Return ONLY valid JSON matching this exact structure:
{
  "boxedText": "string",
  "npcs": ["string"],
  "skillChecks": ["string"],
  "contingencies": ["string"],
  "rewards": {"gold": 0, "items": [], "xp": 0},
  "notes": "string",
  "estimatedDuration": "string",
  "mood": "string",
  "mapRequired": false,
  "relatedMemories": []
}`;

    const userPrompt = `Expand this beat into a detailed scene:\n\n${JSON.stringify(beat, null, 2)}`;

    const { data: existingScene, error: fetchError } = await supabase
      .from('scenes')
      .select('data')
      .eq('id', sceneId)
      .maybeSingle();

    if (fetchError) {
      return NextResponse.json(
        { success: false, error: fetchError.message },
        { status: 500 }
      );
    }

    if (!existingScene) {
      return NextResponse.json(
        { success: false, error: 'Scene not found or unauthorized' },
        { status: 404 }
      );
    }

    const generatedData = await generateSceneWithRetry(systemPrompt, userPrompt);

    const existingData = existingScene.data as SceneData || {};
    const mergedData = mergeSceneData(existingData, generatedData);

    const { data: updatedScene, error: updateError } = await supabase
      .from('scenes')
      .update({ data: mergedData })
      .eq('id', sceneId)
      .select()
      .maybeSingle();

    if (updateError) {
      return NextResponse.json(
        { success: false, error: updateError.message },
        { status: 500 }
      );
    }

    // Increment generation count
    await supabase.rpc('increment_user_generations', { user_id: user.id });

    return NextResponse.json({ success: true, data: mergedData });
  } catch (error) {
    console.error('Expand scene error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
