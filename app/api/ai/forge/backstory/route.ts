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

const BackstoryInputSchema = z.object({
  campaignId: z.string().uuid(),
  characterName: z.string().min(1).max(200),
  race: z.string().min(2).max(100),
  characterClass: z.string().min(2).max(100),
  age: z.number().min(1).max(10000),
  background: z.string().optional(),
  keyEvent: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

function buildSystemPrompt(params: z.infer<typeof BackstoryInputSchema>): string {
  return `You are a professional character backstory writer for D&D campaigns. Generate a comprehensive, emotionally resonant character history.

CHARACTER PARAMETERS:
- Name: ${params.characterName}
- Race: ${params.race}
- Class: ${params.characterClass}
- Age: ${params.age}
${params.background ? `- Background Concept: ${params.background}` : ''}
${params.keyEvent ? `- Key Event: ${params.keyEvent}` : ''}

DESIGN GUIDELINES:
- Create a rich, detailed history from childhood to present
${params.background ? `- IMPORTANT: Weave the background concept ("${params.background}") throughout the character's life story, personality, relationships, and current situation` : ''}
${params.keyEvent ? `- CRITICAL: Make the key event ("${params.keyEvent}") the pivotal turning point in lifeHistory.turningPoint and reference its lasting impact throughout the backstory` : ''}
- Include specific names, places, and dates
- Show character development and growth
- Include both triumphs and failures
- Create meaningful relationships with NPCs
- Tie motivations to past events

OUTPUT (Return ONLY valid JSON):
{
  "name": "${params.characterName}",
  "race": "${params.race}",
  "class": "${params.characterClass}",
  "age": ${params.age},

  "demographics": {
    "birthplace": "string (specific location)",
    "currentResidence": "string",
    "birthdate": "string (formatted date/season)",
    "languages": ["string"],
    "height": "string",
    "weight": "string",
    "physicalDescription": "string (detailed appearance)"
  },

  "family": {
    "parents": {
      "father": {
        "name": "string",
        "status": "alive|deceased|unknown",
        "occupation": "string",
        "relationship": "string (quality of relationship)"
      },
      "mother": {
        "name": "string",
        "status": "alive|deceased|unknown",
        "occupation": "string",
        "relationship": "string"
      }
    },
    "siblings": [
      {
        "name": "string",
        "age": number,
        "status": "alive|deceased|unknown",
        "relationship": "string"
      }
    ],
    "otherFamily": "string (extended family details)" | null
  },

  "socialStatus": {
    "economicClass": "destitute|poor|working|middle|wealthy|nobility",
    "reputation": "string (how they're known)",
    "socialConnections": ["string (important connections)"]
  },

  "education": {
    "formal": "string (schools, apprenticeships)" | null,
    "skills": ["string (learned skills)"],
    "mentors": [
      {
        "name": "string",
        "expertise": "string",
        "impact": "string (how they influenced character)"
      }
    ]
  },

  "personality": {
    "traits": ["string (2-3 personality traits)"],
    "ideals": ["string (core beliefs)"],
    "bonds": ["string (who/what matters most)"],
    "flaws": ["string (weaknesses/struggles)"],
    "quirks": ["string (memorable habits)"]
  },

  "lifeHistory": {
    "childhood": "string (ages 0-12, 2-3 paragraphs)",
    "adolescence": "string (ages 13-18, 2-3 paragraphs)",
    "adulthood": "string (2-3 paragraphs leading to present)",
    "turningPoint": "string (the event that changed everything)"
  },

  "currentSituation": {
    "occupation": "string",
    "goals": ["string (short-term and long-term goals)"],
    "fears": ["string (what they're afraid of)"],
    "secrets": ["string (hidden truths)"]
  },

  "relationships": {
    "allies": [
      {
        "name": "string",
        "relationship": "string",
        "significance": "string"
      }
    ],
    "rivals": [
      {
        "name": "string",
        "relationship": "string",
        "significance": "string"
      }
    ],
    "romanticHistory": "string (past relationships)" | null
  },

  "possessions": {
    "heirloom": {
      "item": "string",
      "significance": "string"
    },
    "favoritePossession": "string"
  },

  "summary": "string (2-3 sentence character essence)"
}

Make it emotionally compelling, specific, and full of plot hooks.`;
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
    const params = BackstoryInputSchema.parse(body);

    const supabase = createAuthenticatedClient(token);

    const systemPrompt = buildSystemPrompt(params);

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Generate a comprehensive backstory for ${params.characterName}` }
      ],
      temperature: 0.9,
      max_tokens: 3500,
      response_format: { type: 'json_object' }
    });

    const content = completion.choices[0].message.content;
    if (!content) {
      throw new Error('No content in AI response');
    }

    const result = JSON.parse(content);
    console.log('=== BACKSTORY API DEBUG ===');
    console.log('AI Generated Backstory:', JSON.stringify(result, null, 2));
    console.log('Result has lifeHistory?', !!result.lifeHistory);
    console.log('Result has demographics?', !!result.demographics);
    console.log('Result has personality?', !!result.personality);

    logAIUsage({
      campaignId: params.campaignId,
      endpoint: '/api/ai/forge/backstory',
      model: 'gpt-4o',
      promptTokens: completion.usage?.prompt_tokens || 0,
      completionTokens: completion.usage?.completion_tokens || 0,
      timestamp: new Date().toISOString(),
    });

    const title = `${params.characterName}'s Backstory`;
    const textContent = `${result.summary}\n\n${result.demographics.physicalDescription}`;

    const memoryEntry = {
      campaign_id: params.campaignId,
      type: 'npc',
      title,
      text_content: textContent,
      content: result,
      forge_type: 'backstory',
      tags: params.tags || ['backstory', params.race.toLowerCase(), params.characterClass.toLowerCase()],
    };

    console.log('Memory entry to be saved:', JSON.stringify(memoryEntry, null, 2));
    console.log('Content being saved (first 500 chars):', JSON.stringify(memoryEntry.content).substring(0, 500));

    const { data: memoryChunk, error: insertError } = await supabase
      .from('memory_chunks')
      .insert(memoryEntry)
      .select()
      .single();

    if (insertError) {
      console.error('Database insert error:', insertError);
      throw new Error(`Failed to save backstory: ${insertError.message}`);
    }

    console.log('Successfully saved to database. Memory ID:', memoryChunk.id);
    console.log('Saved content type:', typeof memoryChunk.content);
    console.log('Saved content has lifeHistory?', !!memoryChunk.content?.lifeHistory);
    console.log('=== END BACKSTORY DEBUG ===');

    return NextResponse.json({
      success: true,
      data: result,
      memoryId: memoryChunk.id,
    });

  } catch (error) {
    console.error('Backstory forge error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate backstory' },
      { status: 500 }
    );
  }
}
