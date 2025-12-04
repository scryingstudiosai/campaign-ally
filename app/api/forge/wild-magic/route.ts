import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { diceSides, uuidv4, isoUtcNow, selectTheme } from '@/lib/forge-utils';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface WildMagicRequest {
  mode: 'TABLE' | 'SURPRISE';
  dice?: string;
  table_topic?: string;
  surprise_theme?: string;
  style?: string;
  caster_class?: string;
  spell_school?: string;
  environment?: string;
  tier: string;
  seed?: string;
  respect_codex?: boolean;
  codex_context?: string;
  reroll_indices?: number[];
  reroll?: boolean;
  prior_json?: any;
}

export async function POST(req: NextRequest) {
  try {
    const body: WildMagicRequest = await req.json();
    const {
      mode,
      dice,
      table_topic,
      surprise_theme,
      style,
      caster_class,
      spell_school,
      environment,
      tier,
      seed,
      respect_codex,
      codex_context,
      reroll_indices = [],
      reroll = false,
      prior_json,
    } = body;

    if (!mode || !tier) {
      return NextResponse.json(
        { success: false, error: 'Mode and tier are required' },
        { status: 400 }
      );
    }

    if (mode === 'TABLE') {
      return await generateWildMagicTable({
        dice: dice || 'd20',
        table_topic,
        style,
        caster_class,
        spell_school,
        environment,
        tier,
        seed,
        respect_codex,
        codex_context,
        reroll_indices,
        prior_json,
      });
    } else {
      return await generateWildMagicSurprise({
        surprise_theme,
        style,
        caster_class,
        spell_school,
        environment,
        tier,
        seed,
        respect_codex,
        codex_context,
        reroll,
      });
    }
  } catch (error: any) {
    console.error('Wild Magic generation error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to generate wild magic' },
      { status: 500 }
    );
  }
}

async function generateWildMagicTable(params: any) {
  const {
    dice,
    table_topic,
    style,
    caster_class,
    spell_school,
    environment,
    tier,
    seed,
    respect_codex,
    codex_context,
    reroll_indices,
    prior_json,
  } = params;

  const N = diceSides(dice);

  const codexHint = respect_codex && codex_context
    ? `\n\nCodex Context (align content with this):\n${codex_context}`
    : '';

  const rerollHint = reroll_indices.length > 0
    ? `\n\nREROLL MODE: Regenerate ONLY indices ${reroll_indices.join(', ')}. Keep other entries unchanged from the prior JSON provided.`
    : '';

  const priorJsonHint = prior_json
    ? `\n\nPrior JSON:\n${JSON.stringify(prior_json, null, 2)}`
    : '';

  const contextBias = `Context-bias if provided:
  - Caster: ${caster_class || 'any'}
  - School: ${spell_school || 'any'}
  - Environment: ${environment || 'any'}
  - Tier: ${tier}
  - Topic: ${table_topic || 'general wild magic'}`;

  const prompt = `You are the Wild Magic Table Forge. Produce TWO outputs in order:
1) Markdown table with header: | ${dice} | Title | Effect |
2) A fenced \`\`\`json payload per schema.

Rules:
- Use dice: ${dice}; generate exactly ${N} entries (N = ${N} faces).
- Titles ≤ 6 words; Effect 1–2 sentences; brief mechanic ok (e.g., "DC 13 Wis save", "1d6 fire damage", "15 ft radius", "1 minute duration").
- Each entry should be distinct, evocative, and encounter-usable. Provide wild, chaotic effects appropriate for ${tier} tier.
- ${tier} tier guidance:
  * minor: quirky, harmless, or cosmetic effects
  * moderate: tactical consequences, minor mechanical impact
  * major: dramatic effects, significant mechanical impact
- OGL-safe paraphrase; avoid SRD verbatim.
- PG-13 content; no hateful or explicit material.
${contextBias}${codexHint}${rerollHint}${priorJsonHint}
- Determinism: ${seed ? `Use seed "${seed}" to ensure reproducible outputs.` : 'Generate creative random content.'}

JSON schema:
{
  "forge_id": "uuid",
  "forge_type": "wild-magic",
  "mode": "TABLE",
  "dice": "${dice}",
  "table_topic": "string",
  "style": "string|null",
  "caster_class": "string|null",
  "spell_school": "string|null",
  "environment": "string|null",
  "tier": "${tier}",
  "seed": "string|null",
  "created_at_iso": "ISO-8601 UTC",
  "rerolled_indices": [${reroll_indices.join(', ')}],
  "entries": [
    { "roll": number (1 to ${N}), "title": "string (<=6 words)", "effect": "string (1–2 sentences; brief mechanic ok)" }
  ]
}

Generate Markdown and JSON (in that order).`;

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content: 'You are a creative TTRPG content generator specializing in wild magic effects.',
      },
      { role: 'user', content: prompt },
    ],
    temperature: seed ? 0.3 : 0.8,
  });

  const content = completion.choices[0]?.message?.content || '';

  const jsonMatch = content.match(/```json\s*\n([\s\S]*?)\n```/);
  if (!jsonMatch) {
    return NextResponse.json(
      { success: false, error: 'No JSON block found in AI response' },
      { status: 500 }
    );
  }

  const jsonData = JSON.parse(jsonMatch[1]);

  if (!jsonData.forge_id) jsonData.forge_id = uuidv4();
  if (!jsonData.created_at_iso) jsonData.created_at_iso = isoUtcNow();

  jsonData.forge_type = 'wild-magic';
  jsonData.mode = 'TABLE';
  jsonData.dice = dice;
  jsonData.table_topic = table_topic || 'Wild Magic Surges';
  jsonData.style = style || null;
  jsonData.caster_class = caster_class || null;
  jsonData.spell_school = spell_school || null;
  jsonData.environment = environment || null;
  jsonData.tier = tier;
  jsonData.seed = seed || null;
  jsonData.rerolled_indices = reroll_indices;

  if (!jsonData.entries || jsonData.entries.length !== N) {
    return NextResponse.json(
      {
        success: false,
        error: `Expected ${N} entries, got ${jsonData.entries?.length || 0}`,
      },
      { status: 500 }
    );
  }

  const markdownMatch = content.split('```json')[0].trim();

  return NextResponse.json({
    success: true,
    data: {
      markdown: markdownMatch,
      json: jsonData,
    },
  });
}

async function generateWildMagicSurprise(params: any) {
  const {
    surprise_theme,
    style,
    caster_class,
    spell_school,
    environment,
    tier,
    seed,
    respect_codex,
    codex_context,
    reroll,
  } = params;

  const actualTheme = surprise_theme === 'SURPRISE_ME' || !surprise_theme
    ? selectTheme(seed)
    : surprise_theme;

  const actualSeed = reroll && seed ? `${seed}-reroll-${Date.now()}` : seed;

  const codexHint = respect_codex && codex_context
    ? `\n\nCodex Context (align content with this):\n${codex_context}`
    : '';

  const contextBias = `Context-bias if provided:
  - Theme: ${actualTheme}
  - Caster: ${caster_class || 'any'}
  - School: ${spell_school || 'any'}
  - Environment: ${environment || 'any'}
  - Tier: ${tier}`;

  const prompt = `You are the Wild Magic Surprise Forge. Produce TWO outputs in order:
1) A Markdown one-row table: | Roll | Title | Effect |
2) A fenced \`\`\`json payload per schema.

Rules:
- Always roll d100; choose 1..100 deterministically if seed present, or randomly otherwise.
- Theme: ${actualTheme}
- Titles ≤ 6 words; Effect 1–3 sentences; brief mechanic ok (e.g., "DC 15 Con save", "2d6 force damage", "20 ft radius", "10 minutes").
- Create a single dramatic, chaotic wild magic surge appropriate for ${tier} tier.
- ${tier} tier guidance:
  * minor: quirky, harmless, or cosmetic effects
  * moderate: tactical consequences, minor mechanical impact
  * major: dramatic effects, significant mechanical impact
- OGL-safe paraphrase; avoid SRD verbatim.
- PG-13 content; no hateful or explicit material.
${contextBias}${codexHint}
- Determinism: ${actualSeed ? `Use seed "${actualSeed}" to ensure reproducible output.` : 'Generate creative random content.'}
- Reroll: ${reroll ? 'This is a reroll, generate a NEW result.' : 'Initial generation.'}

JSON schema:
{
  "forge_id": "uuid",
  "forge_type": "wild-magic",
  "mode": "SURPRISE",
  "dice": "d100",
  "surprise_theme": "${actualTheme}",
  "style": "string|null",
  "caster_class": "string|null",
  "spell_school": "string|null",
  "environment": "string|null",
  "tier": "${tier}",
  "seed": "string|null",
  "created_at_iso": "ISO-8601 UTC",
  "reroll": ${reroll},
  "result": { "roll": 1-100, "title": "string (<=6 words)", "effect": "1–3 sentences; brief mechanic ok" }
}

Generate Markdown and JSON (in that order).`;

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content: 'You are a creative TTRPG content generator specializing in wild magic effects.',
      },
      { role: 'user', content: prompt },
    ],
    temperature: actualSeed ? 0.3 : 0.8,
  });

  const content = completion.choices[0]?.message?.content || '';

  const jsonMatch = content.match(/```json\s*\n([\s\S]*?)\n```/);
  if (!jsonMatch) {
    return NextResponse.json(
      { success: false, error: 'No JSON block found in AI response' },
      { status: 500 }
    );
  }

  const jsonData = JSON.parse(jsonMatch[1]);

  if (!jsonData.forge_id) jsonData.forge_id = uuidv4();
  if (!jsonData.created_at_iso) jsonData.created_at_iso = isoUtcNow();

  jsonData.forge_type = 'wild-magic';
  jsonData.mode = 'SURPRISE';
  jsonData.dice = 'd100';
  jsonData.surprise_theme = actualTheme;
  jsonData.style = style || null;
  jsonData.caster_class = caster_class || null;
  jsonData.spell_school = spell_school || null;
  jsonData.environment = environment || null;
  jsonData.tier = tier;
  jsonData.seed = actualSeed || null;
  jsonData.reroll = reroll;

  if (!jsonData.result || !jsonData.result.roll) {
    return NextResponse.json(
      { success: false, error: 'Invalid result format in JSON' },
      { status: 500 }
    );
  }

  const markdownMatch = content.split('```json')[0].trim();

  return NextResponse.json({
    success: true,
    data: {
      markdown: markdownMatch,
      json: jsonData,
    },
  });
}
