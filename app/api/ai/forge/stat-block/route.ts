import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { createClient } from '@supabase/supabase-js';
import { buildAIContext } from '@/lib/ai/context';
import { logAIUsage } from '@/lib/ai-usage-logger';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Missing authorization header' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        global: { headers: { Authorization: authHeader } },
      }
    );

    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      campaignId,
      name,
      concept = '',
      tier = 2,
      monsterType = 'any',
      size = 'medium',
      environment = 'any',
      intelligence = 'animal',
      behavior = 'any',
      specialTrait = 'any',
      includePhysical = true,
      includeBehavior = true,
      includeCombat = true,
      includeAbilities = true,
      smartDefaults = false,
    } = body;

    if (!campaignId || !name) {
      return NextResponse.json({
        success: false,
        error: 'Campaign ID and name are required'
      }, { status: 400 });
    }

    const context = await buildAIContext(supabase, campaignId);

    let prompt = `You are a D&D monster designer. Generate a complete stat block for a monster.

${context}

Monster Name: ${name}
${concept ? `Concept: ${concept}` : ''}
Tier: ${tier === 1 ? 'Weak (CR 0-2)' : tier === 2 ? 'Standard (CR 3-7)' : 'Boss (CR 8+)'}
Type: ${monsterType !== 'any' ? monsterType : 'appropriate for concept'}
Size: ${size !== 'medium' ? size : 'appropriate for concept'}
Environment: ${environment !== 'any' ? environment : 'appropriate for concept'}
Intelligence: ${intelligence !== 'animal' ? intelligence : 'appropriate for concept'}
Behavior: ${behavior !== 'any' ? behavior : 'appropriate for concept'}
Special Trait: ${specialTrait !== 'any' ? specialTrait : 'none required'}

${smartDefaults ? `
SMART DEFAULTS ENABLED:
- Automatically calculate appropriate saving throws based on creature type
- Include relevant skills based on intelligence level
- Add standard resistances/immunities for creature type (e.g., undead immune to poison)
- Include typical senses (darkvision 60 ft for most monsters)
- Generate appropriate languages based on intelligence
` : ''}

Include sections:
${includePhysical ? '- Physical description with vivid sensory details' : ''}
${includeBehavior ? '- Behavioral description and tactics' : ''}
${includeCombat ? '- Combat tactics and strategy' : ''}
${includeAbilities ? '- Special abilities and lore' : ''}

CRITICAL STAT BLOCK FORMATTING RULES:

1. Actions MUST follow this exact format:
   - Start with "**Multiattack.**" or "**Action Name.**" (with periods)
   - Description must be ONE continuous paragraph
   - NO line breaks within action descriptions
   - Attack format: "**Melee Weapon Attack:** +X to hit, reach Y ft., one target. **Hit:** damage"

2. Traits MUST be formatted as:
   - "**Trait Name.** Description in one paragraph."

3. NO nested bullet points or sublists in actions/traits

Output schema:
{
  "name": "string",
  "tier": 1|2|3,
  "cr": "string (e.g., '3', '1/2', '1/4')",
  "type": "string (beast, monstrosity, undead, etc.)",
  "size": "string (tiny, small, medium, large, huge, gargantuan)",
  "hp": "string (e.g., '45 (6d10 + 12)')",
  "ac": "string (e.g., '15 (natural armor)', '13')",
  "speed": "string (e.g., '30 ft., fly 60 ft.')",
  "abilities": {
    "str": number,
    "dex": number,
    "con": number,
    "int": number,
    "wis": number,
    "cha": number
  },
  "savingThrows": ["string"] (optional, e.g., ["Dex +5", "Con +7"]),
  "skills": ["string"] (optional, e.g., ["Perception +4", "Stealth +6"]),
  "damageResistances": ["string"] (optional, e.g., ["fire", "cold"]),
  "damageImmunities": ["string"] (optional, e.g., ["poison", "psychic"]),
  "damageVulnerabilities": ["string"] (optional, e.g., ["bludgeoning"]),
  "conditionImmunities": ["string"] (optional, e.g., ["charmed", "frightened"]),
  "senses": "string" (optional, e.g., "darkvision 60 ft., passive Perception 14"),
  "languages": "string" (optional, e.g., "Common, Draconic" or "—"),
  "traits": [
    {
      "name": "string",
      "description": "string (passive abilities like Keen Smell, Magic Resistance, etc.)"
    }
  ] (1-3 passive traits),
  "actions": [
    {
      "name": "string (without ** formatting)",
      "description": "string (MUST be properly formatted per requirements above, starting with Attack Type or description)"
    }
  ] (2-4 actions),
  "reactions": [
    {
      "name": "string",
      "description": "string"
    }
  ] (optional, 0-1 reactions),
  "legendaryActions": {
    "description": "string (e.g., 'The creature can take 3 legendary actions...')",
    "actions": [
      {
        "name": "string",
        "cost": number (1-3),
        "description": "string"
      }
    ]
  } (only if CR 5+),
  "spellcasting": {
    "description": "string (e.g., 'The creature is a 5th-level spellcaster...')",
    "cantrips": ["string"],
    "slots": [
      {
        "level": number,
        "slots": number,
        "spells": ["string"]
      }
    ]
  } (optional, only if appropriate),
  "description": "string (vivid physical description)",
  "behavior": "string (behavioral patterns and personality)",
  "tactics": "string (combat tactics and strategy)",
  "loot": ["string"] (2-4 items),
  "weakness": "string (exploitable weakness)"
}

Return ONLY valid JSON matching this schema exactly.`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are a D&D monster designer. Return ONLY valid JSON with no markdown formatting, no code blocks, no explanatory text.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.9,
      response_format: { type: 'json_object' },
    });

    const responseText = completion.choices[0]?.message?.content;
    if (!responseText) {
      throw new Error('No response from OpenAI');
    }

    let monsterData;
    try {
      monsterData = JSON.parse(responseText);
    } catch (parseError) {
      console.error('Failed to parse OpenAI response:', responseText);
      throw new Error('Invalid JSON response from AI');
    }

    logAIUsage({
      timestamp: new Date().toISOString(),
      endpoint: 'monster-stat-block',
      model: 'gpt-4o-mini',
      promptTokens: completion.usage?.prompt_tokens || 0,
      completionTokens: completion.usage?.completion_tokens || 0,
      totalTokens: completion.usage?.total_tokens || 0,
      userId: user.id,
      campaignId,
    });

    await supabase.rpc('increment_user_generations', {
      user_id: user.id,
    });

    return NextResponse.json({
      success: true,
      data: monsterData,
    });

  } catch (error) {
    console.error('Stat block generation error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to generate stat block',
      },
      { status: 500 }
    );
  }
}
