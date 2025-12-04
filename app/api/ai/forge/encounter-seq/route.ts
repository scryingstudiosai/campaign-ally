import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { createServerClientFromRequest, createAuthenticatedClient } from '@/lib/supabase/server';
import { z } from 'zod';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const EncounterInputSchema = z.object({
  campaignId: z.string().uuid(),
  encounterName: z.string().optional(),
  concept: z.string().min(3).max(1000),
  partySize: z.number().min(2).max(8),
  partyLevel: z.number().min(1).max(20),
  difficulty: z.enum(['trivial', 'easy', 'medium', 'hard', 'deadly']),
  combatType: z.enum(['single', 'multiple', 'dynamic', 'boss']),
  environment: z.string(),
  respectCodex: z.boolean().optional(),
  tags: z.array(z.string()).optional(),
});

function buildSystemPrompt(params: z.infer<typeof EncounterInputSchema>, codex?: any): string {
  const combatTypeDesc = {
    single: 'all enemies present at start',
    multiple: 'enemies arrive in distinct waves/phases',
    dynamic: 'enemies arrive based on triggers and conditions',
    boss: 'single powerful enemy with minions'
  };

  return `You are a professional D&D encounter designer. Generate a complete, tactical D&D 5e encounter that feels like it came from a published adventure module.

ENCOUNTER PARAMETERS:
- Party: ${params.partySize} × Level ${params.partyLevel} characters
- Difficulty Target: ${params.difficulty.toUpperCase()}
- Combat Type: ${combatTypeDesc[params.combatType]}
- Environment: ${params.environment}
- Concept: ${params.concept}
${params.respectCodex && codex ? `\nCAMPAIGN SETTING:\n${JSON.stringify(codex, null, 2)}` : ''}

CRITICAL REQUIREMENTS:
1. Provide COMPLETE 5e stat blocks for every monster
2. Include specific positioning with distances, cover, and elevation
3. Detail tactical plans for each combat phase
4. Include mechanical effects for all terrain features
5. Make it immediately usable at the table

OUTPUT STRUCTURE (Return ONLY valid JSON):

{
  "name": "string (encounter title)",
  "overview": "string (2-3 sentence setup)",
  "difficulty": "${params.difficulty}",
  "partySize": ${params.partySize},
  "partyLevel": ${params.partyLevel},
  "xpCalculation": {
    "rawXP": number,
    "multiplier": number,
    "adjustedXP": number
  },

  "positioning": "string (detailed initial positions with distances, cover, elevation, hidden enemies with Perception DCs, terrain features)",

  "monsters": [
    {
      "name": "string",
      "quantity": number,
      "role": "string (striker/controller/tank/minion)",
      "size": "string",
      "type": "string",
      "alignment": "string",
      "ac": number,
      "armorType": "string",
      "hp": number,
      "hitDice": "string",
      "speed": number,
      "str": number,
      "dex": number,
      "con": number,
      "int": number,
      "wis": number,
      "cha": number,
      "saves": ["string"],
      "skills": ["string"],
      "resistances": ["string"] | null,
      "immunities": ["string"] | null,
      "conditionImmunities": ["string"] | null,
      "senses": ["string"],
      "passivePerception": number,
      "languages": ["string"],
      "cr": string | number,
      "traits": [
        {
          "name": "string",
          "description": "string (full mechanics)"
        }
      ],
      "actions": [
        {
          "name": "string",
          "description": "string (include attack bonus, damage dice, DC)"
        }
      ],
      "reactions": [] | [{"name": "string", "description": "string"}],
      "tactics": {
        "initialRound": "string",
        "combatStrategy": "string",
        "ifBloodied": "string",
        "retreatCondition": "string"
      },
      "positioning": "string"
    }
  ],

  "phases": [
    {
      "number": number,
      "name": "string",
      "trigger": "string (specific condition)",
      "activeMonsters": ["string (name × quantity)"],
      "enemyActions": "string (round 1 specific actions)",
      "terrain": "string",
      "lighting": "string",
      "weather": "string | null",
      "special": "string | null",
      "tactics": "string"
    }
  ],

  "terrainFeatures": [
    {
      "name": "string",
      "mechanicalEffect": "string (specific game mechanics)"
    }
  ],

  "triggers": [
    {
      "condition": "string",
      "effect": "string"
    }
  ],

  "loot": {
    "onEnemies": "string",
    "environmental": "string",
    "totalValue": "string"
  },

  "dmNotes": {
    "keyMoments": "string",
    "monsterPsychology": "string",
    "commonTactics": "string",
    "counters": "string",
    "timeEstimate": "string",
    "scaling": {
      "easier": ["string (specific adjustment)"],
      "harder": ["string (specific adjustment)"]
    },
    "aftermath": {
      "victory": "string",
      "defeat": "string",
      "investigation": "string"
    }
  },

  "flair": "string (evocative description)"
}

DESIGN GUIDELINES:
- Positioning: Use specific distances (e.g., "30ft north"), cover types (+2 or +5 AC), elevation advantages
- Stat Blocks: Complete and accurate to 5e rules
- Tactics: Specific and actionable (not vague advice)
- Phases: Clear triggers (round number, HP threshold, condition)
- Terrain: Include mechanical effects (difficult terrain, cover bonuses, climb DCs)
- Make it tactical: Give smart monsters intelligent plans
- Balance: Aim for ${params.difficulty} difficulty using proper CR and XP calculations`;
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

    const supabase = createAuthenticatedClient(token);

    const body = await request.json();
    const validation = EncounterInputSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid input', details: validation.error.errors },
        { status: 400 }
      );
    }

    const params = validation.data;

    const { data: campaign } = await supabase
      .from('campaigns')
      .select('id')
      .eq('id', params.campaignId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (!campaign) {
      return NextResponse.json(
        { success: false, error: 'Campaign not found' },
        { status: 404 }
      );
    }

    let codex = null;
    if (params.respectCodex) {
      const { data: codexData } = await supabase
        .from('campaign_codex')
        .select('*')
        .eq('campaign_id', params.campaignId)
        .maybeSingle();

      codex = codexData;
    }

    const systemPrompt = buildSystemPrompt(params, codex);

    let result;
    let retryCount = 0;

    while (retryCount < 2) {
      try {
        const completion = await openai.chat.completions.create({
          model: 'gpt-4-turbo',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: `Generate a ${params.difficulty} ${params.combatType}-wave encounter: ${params.concept}` },
          ],
          response_format: { type: 'json_object' },
          temperature: 0.8,
          max_tokens: 4000,
        });

        const content = completion.choices[0]?.message?.content;
        if (!content) throw new Error('No content returned');

        result = JSON.parse(content);
        break;
      } catch (error: any) {
        if (retryCount === 0 && error instanceof SyntaxError) {
          retryCount++;
          continue;
        }
        throw error;
      }
    }

    const title = params.encounterName || result.name || `Level ${result.partyLevel} ${result.difficulty} Encounter`;
    const textContent = `${result.name}\n${result.overview}\n\nParty: ${result.partySize} × Level ${result.partyLevel}\nDifficulty: ${result.difficulty.toUpperCase()}\n\n${result.flair || ''}`;

    const { data: memoryChunk, error: insertError } = await supabase
      .from('memory_chunks')
      .insert({
        campaign_id: params.campaignId,
        type: 'event',
        title,
        text_content: textContent,
        content: result,
        forge_type: 'encounter-seq',
        tags: params.tags || ['encounter', `level-${result.partyLevel}`, result.difficulty, params.environment],
      })
      .select()
      .single();

    if (insertError) {
      console.error('Insert error:', insertError);
      return NextResponse.json(
        { success: false, error: 'Failed to save encounter' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      result: { id: memoryChunk.id, ...result },
    });
  } catch (error) {
    console.error('Encounter forge error:', error);
    return NextResponse.json(
      { success: false, error: 'Something went wrong' },
      { status: 500 }
    );
  }
}
