import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { diceSides, uuidv4, isoUtcNow } from '@/lib/forge-utils';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface RandomTableRequest {
  topic: string;
  description?: string;
  dice: string;
  style?: string;
  tags?: string[];
  seed?: string;
  respect_codex?: boolean;
  codex_context?: string;
  reroll_indices?: number[];
  prior_json?: any;
}

export async function POST(req: NextRequest) {
  try {
    const body: RandomTableRequest = await req.json();
    const {
      topic,
      description,
      dice,
      style,
      tags = [],
      seed,
      respect_codex,
      codex_context,
      reroll_indices = [],
      prior_json,
    } = body;

    if (!topic || !dice) {
      return NextResponse.json(
        { success: false, error: 'Topic and dice are required' },
        { status: 400 }
      );
    }

    const N = diceSides(dice as any);

    const codexHint = respect_codex && codex_context
      ? `\n\nCodex Context (align content with this):\n${codex_context}`
      : '';

    const rerollHint = reroll_indices.length > 0
      ? `\n\nREROLL MODE: Regenerate ONLY indices ${reroll_indices.join(', ')}. Keep other entries unchanged from the prior JSON provided.`
      : '';

    const priorJsonHint = prior_json
      ? `\n\nPrior JSON:\n${JSON.stringify(prior_json, null, 2)}`
      : '';

    const prompt = `You are the Random Table Forge for a TTRPG app. Produce TWO outputs in order:
1) A Markdown table with header: | ${dice} | Title | Description |
2) A fenced \`\`\`json payload matching the schema below.

Rules:
- Use dice: ${dice}; create exactly ${N} entries (N = ${N} faces).
- Titles ≤ 6 words. Description 1–2 sentences; brief mechanic ok in parentheses (e.g., "DC 12 Wis save", "1d4 damage", "10 ft radius").
- Each entry should be distinct, evocative, and DM-usable. Provide actionable content (clues, twists, checks, boons, costs).
- OGL-safe paraphrase; avoid SRD verbatim.
- PG-13 content; no hateful or explicit material.${codexHint}${rerollHint}${priorJsonHint}
- Determinism: ${seed ? `Use seed "${seed}" to ensure reproducible outputs. Same inputs should yield identical results.` : 'Generate creative random content.'}

JSON schema:
{
  "forge_id": "uuid (you will generate)",
  "forge_type": "random-table",
  "topic": "string",
  "description": "string|null",
  "dice": "${dice}",
  "style": "string|null",
  "tags": ["string", ...],
  "seed": "string|null",
  "created_at_iso": "ISO-8601 UTC (you will generate)",
  "rerolled_indices": [${reroll_indices.join(', ')}],
  "entries": [
    { "roll": number (1 to ${N}), "title": "string (<=6 words)", "description": "string (1–2 sentences; brief mechanic ok)" }
  ]
}

Now generate the Markdown and JSON (in that order) for:
- topic: ${topic}
- description: ${description || 'none'}
- dice: ${dice}
- style: ${style || 'none'}
- tags: ${tags.join(', ') || 'none'}
- seed: ${seed || 'none'}`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are a creative TTRPG content generator specializing in random tables.',
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

    if (!jsonData.forge_id) {
      jsonData.forge_id = uuidv4();
    }
    if (!jsonData.created_at_iso) {
      jsonData.created_at_iso = isoUtcNow();
    }

    jsonData.forge_type = 'random-table';
    jsonData.topic = topic;
    jsonData.description = description || null;
    jsonData.dice = dice;
    jsonData.style = style || null;
    jsonData.tags = tags;
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
  } catch (error: any) {
    console.error('Random Table generation error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to generate table' },
      { status: 500 }
    );
  }
}
