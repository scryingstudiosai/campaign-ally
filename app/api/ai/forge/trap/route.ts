import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { createServerClientFromRequest, createAuthenticatedClient } from '@/lib/supabase/server';
import { z } from 'zod';
import { logAIUsage } from '@/lib/ai-usage-logger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const TrapInputSchema = z.object({
  campaignId: z.string().uuid(),
  concept: z.string().min(3).max(1000),
  partyLevel: z.number().min(1).max(20),
  difficulty: z.enum(['easy', 'moderate', 'dangerous', 'deadly']),
  trapType: z.enum(['mechanical', 'magical', 'hybrid']),
  tags: z.array(z.string()).optional(),
});

function buildSystemPrompt(params: z.infer<typeof TrapInputSchema>): string {
  const difficultyDCs = {
    easy: { detect: 12, disarm: 10, save: 11 },
    moderate: { detect: 15, disarm: 13, save: 13 },
    dangerous: { detect: 18, disarm: 15, save: 15 },
    deadly: { detect: 20, disarm: 17, save: 17 }
  };

  const damageByLevel = {
    easy: Math.floor(params.partyLevel * 1.5),
    moderate: Math.floor(params.partyLevel * 2.5),
    dangerous: Math.floor(params.partyLevel * 4),
    deadly: Math.floor(params.partyLevel * 5.5)
  };

  const dcs = difficultyDCs[params.difficulty];
  const avgDamage = damageByLevel[params.difficulty];

  return `You are a professional D&D trap designer. Generate a detailed, immediately usable trap for D&D 5e.

TRAP PARAMETERS:
- Concept: ${params.concept}
- Party Level: ${params.partyLevel}
- Difficulty: ${params.difficulty.toUpperCase()}
- Type: ${params.trapType}

DESIGN GUIDELINES:
- Detection DC: ${dcs.detect} (Perception/Investigation)
- Disarm DC: ${dcs.disarm} (Thieves' Tools, Arcana, etc.)
- Save DC: ${dcs.save}
- Target Damage: ${avgDamage} average damage
- Multiple clues for discovery (visual, audible, tactile)
- At least 2 different disarm methods
- Clear failure consequences

OUTPUT (Return ONLY valid JSON):
{
  "name": "string (trap name)",
  "type": "${params.trapType}",
  "difficulty": "${params.difficulty}",
  "summary": "string (1-2 sentence overview)",

  "trigger": {
    "mechanism": "string (what activates it)",
    "area": "string (e.g., '5ft square', '10ft radius')"
  },

  "detection": {
    "dc": ${dcs.detect},
    "clues": [
      {
        "type": "visual|audible|tactile|smell",
        "description": "string (what players might notice)",
        "perceptionDC": number
      }
    ]
  },

  "effect": {
    "description": "string (what happens when triggered)",
    "damage": "string (e.g., '4d6 fire', '6d10 piercing')",
    "averageDamage": number,
    "damageType": "string",
    "savingThrow": {
      "ability": "DEX|CON|WIS",
      "dc": ${dcs.save},
      "effect": "string (half damage, avoid entirely, etc.)"
    },
    "additionalEffects": "string (conditions, ongoing effects, etc.)" | null
  },

  "disarmMethods": [
    {
      "method": "string (e.g., 'Thieves' Tools', 'Arcana check', 'Dispel Magic')",
      "dc": number,
      "description": "string (how to disarm)",
      "timeRequired": "string (e.g., '1 action', '1 minute')",
      "failureConsequence": "string (what happens if they fail)"
    }
  ],

  "bypass": "string (ways to avoid without disarming)" | null,

  "reset": {
    "automatic": boolean,
    "timeToReset": "string" | null,
    "method": "string (how it resets)"
  },

  "components": [
    "string (physical components that make up the trap)"
  ],

  "dmNotes": {
    "setup": "string (how to describe/run it)",
    "commonMistakes": "string (what players might try)",
    "variations": "string (how to adjust difficulty)"
  },

  "flair": "string (evocative description for atmosphere)"
}

Make it tactical, specific, and immediately usable at the table.`;
}

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    const response = NextResponse.next();
    const supabaseAuth = createServerClientFromRequest(request, response);
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const params = TrapInputSchema.parse(body);

    const supabase = createAuthenticatedClient(token);

    const systemPrompt = buildSystemPrompt(params);

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Generate a ${params.difficulty} ${params.trapType} trap: ${params.concept}` }
      ],
      temperature: 0.9,
      max_tokens: 2000,
      response_format: { type: 'json_object' }
    });

    const content = completion.choices[0].message.content;
    if (!content) {
      throw new Error('No content in AI response');
    }

    const result = JSON.parse(content);

    logAIUsage({
      campaignId: params.campaignId,
      endpoint: '/api/ai/forge/trap',
      model: 'gpt-4o-mini',
      promptTokens: completion.usage?.prompt_tokens || 0,
      completionTokens: completion.usage?.completion_tokens || 0,
      timestamp: new Date().toISOString(),
    });

    const title = result.name || `${params.difficulty} Trap`;
    const textContent = `${result.summary}\n\nTrigger: ${result.trigger.mechanism}\nDamage: ${result.effect.damage}\nDetection DC: ${result.detection.dc}`;

    const { data: memoryChunk, error: insertError } = await supabase
      .from('memory_chunks')
      .insert({
        campaign_id: params.campaignId,
        type: 'puzzle',
        title,
        text_content: textContent,
        content: result,
        forge_type: 'trap',
        tags: params.tags || ['trap', params.difficulty, params.trapType, `level-${params.partyLevel}`],
      })
      .select()
      .single();

    if (insertError) {
      console.error('Database insert error:', insertError);
      throw new Error(`Failed to save trap: ${insertError.message}`);
    }

    return NextResponse.json({
      success: true,
      data: result,
      memoryId: memoryChunk.id,
    });

  } catch (error) {
    console.error('Trap forge error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate trap' },
      { status: 500 }
    );
  }
}
