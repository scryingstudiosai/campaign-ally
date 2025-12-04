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

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.substring(7);
    const response = NextResponse.next();
    const supabaseAuth = createServerClientFromRequest(req, response);
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createAuthenticatedClient(token);
    const body = await req.json();
    const validation = ExpandSceneSchema.safeParse(body);

    if (!validation.success) {
      const errors = validation.error.errors.map((e) => e.message).join(', ');
      return new Response(
        JSON.stringify({ success: false, error: errors }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
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

    if (fetchError || !existingScene) {
      return new Response(
        JSON.stringify({ success: false, error: 'Scene not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          controller.enqueue(encoder.encode('data: {"status":"started"}\n\n'));

          const completion = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: userPrompt },
            ],
            response_format: { type: 'json_object' },
            temperature: 0.7,
            max_tokens: 1500,
            stream: true,
          });

          let accumulatedContent = '';

          for await (const chunk of completion) {
            const content = chunk.choices[0]?.delta?.content || '';
            if (content) {
              accumulatedContent += content;
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ chunk: content })}\n\n`)
              );
            }
          }

          let generatedData: SceneData;
          try {
            generatedData = JSON.parse(accumulatedContent);
          } catch (parseError) {
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ error: 'Invalid JSON response' })}\n\n`)
            );
            controller.close();
            return;
          }

          const existingData = existingScene.data as SceneData || {};
          const mergedData = mergeSceneData(existingData, generatedData);

          const { error: updateError } = await supabase
            .from('scenes')
            .update({ data: mergedData })
            .eq('id', sceneId);

          if (updateError) {
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ error: 'Failed to save scene' })}\n\n`)
            );
          } else {
            // Increment generation count
            await supabase.rpc('increment_user_generations', { user_id: user.id });

            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ status: 'complete', data: mergedData })}\n\n`)
            );
          }

          controller.close();
        } catch (error) {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ error: 'Stream error' })}\n\n`)
          );
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error) {
    console.error('Expand scene stream error:', error);
    return new Response(
      JSON.stringify({ success: false, error: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
