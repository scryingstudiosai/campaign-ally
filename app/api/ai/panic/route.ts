import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { createServerClientFromRequest, createAuthenticatedClient } from '@/lib/supabase/server';
import { getExistingNames, createVarietyPrompt } from '@/lib/deduplication';
import { buildAIContext } from '@/lib/ai/context';


export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';


const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const SYSTEM_PROMPTS = {
  npc: `You are Campaign Ally, an AI co-DM helping with D&D 5e campaigns.
Output ONLY valid JSON matching this exact schema:
{
  "name": "string (10-25 chars)",
  "role": "string (e.g., 'Innkeeper', 'Guard Captain') - MUST match requested NPC type",
  "voice_hook": "string (distinctive speech pattern) - REQUIRED",
  "secret_leverage": "string (weakness or leverage point) - REQUIRED",
  "first_impression": "string (what players notice first) - REQUIRED",
  "flair": "string (descriptive introduction - follow codex flair level) - REQUIRED",
  "physical_description": "string (appearance, clothing, distinctive features) - include if requested",
  "personality_traits": "string (character traits, demeanor, quirks) - include if requested",
  "speech_pattern": "string (specific way they talk) - include if requested",
  "background_hook": "string (brief backstory or origin) - include if requested",
  "secret_motivation": "string (hidden goal or desire) - include if requested"
}

CRITICAL REQUIREMENTS:
- name, role, voice_hook, secret_leverage, first_impression, and flair are ALWAYS REQUIRED
- The role MUST align with the requested NPC type (e.g., if criminal/rogue requested, make them a thief, smuggler, or similar)
- The personality MUST match the requested emphasis
- Only include optional fields (physical_description, personality_traits, speech_pattern, background_hook, secret_motivation) if explicitly requested
- Be creative but concise. Follow the campaign codex style and flair level.`,

  tavern: `You are Campaign Ally, an AI co-DM helping with D&D 5e campaigns.
Output ONLY valid JSON matching this exact schema:
{
  "name": "string (establishment name that fits the type)",
  "description": "string (brief atmospheric description of the place)",
  "owner": "string (owner NPC with personality) - include if requested",
  "staff": [{"name": "string", "role": "string"}] (array of notable staff members with names and roles) - include if requested",
  "signature_item": "string (signature drink or food) - include if requested",
  "unique_feature": "string (architectural or decor detail) - include if requested",
  "patrons": [{"name": "string", "description": "string"}] (array of 2-3 notable current patrons with names and brief descriptions) - include if requested",
  "plot_hooks": "string (rumors or current events) - include if requested",
  "secret": "string (hidden element or secret) - include if requested",
  "flair": "string (vivid descriptive introduction - follow codex flair level)"
}

IMPORTANT:
- The name and description MUST match the requested establishment type (e.g., dockside dive = rough waterfront bar, not a forge)
- The atmosphere MUST match the requested atmosphere
- The size MUST match the requested size
- If the user provides specific details in the concept, you MUST incorporate them exactly
- Only include optional fields if explicitly requested
- Be concise but evocative. Follow the campaign codex style and flair level.`,

  hook: `You are Campaign Ally, an AI co-DM helping with D&D 5e campaigns.
Output ONLY valid JSON matching this exact schema:
{
  "hook": "string (premise)",
  "angle": "mystery | temptation | threat | moral",
  "whoCares": "string (NPC/faction)",
  "escalation": "string (if ignored)",
  "flair": "string (descriptive introduction - follow codex flair level)"
}
Be creative but concise. Follow the campaign codex style and flair level.`,
};

export async function POST(request: NextRequest) {
  try {
    console.log('[Panic API] Request received');

    const authHeader = request.headers.get('authorization');
    console.log('[Panic API] Auth header:', authHeader ? 'PRESENT' : 'MISSING');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Unauthorized', details: 'No authorization token' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    const response = NextResponse.next();
    const supabase = createServerClientFromRequest(request, response);

    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    console.log('[Panic API] Auth check:', {
      hasUser: !!user,
      userId: user?.id,
      error: authError?.message
    });

    if (authError || !user) {
      console.error('[Panic API] Auth failed:', authError?.message);
      return NextResponse.json(
        { error: 'Unauthorized', details: authError?.message || 'Invalid token' },
        { status: 401 }
      );
    }

    console.log('[Panic API] Auth successful for user:', user.id);

    const body = await request.json();
    const { type, npcName, concept, campaignId, npcType, personalityEmphasis, includeDetails, respectCodex, tavernName, establishmentType, atmosphere, size } = body;

    if (!type || !['npc', 'tavern', 'hook'].includes(type)) {
      return NextResponse.json(
        { error: 'Invalid type' },
        { status: 400 }
      );
    }

    const validType = type as 'npc' | 'tavern' | 'hook';

    const supabaseClient = createAuthenticatedClient(token);
    const existingNames = campaignId ? await getExistingNames(supabaseClient, campaignId, validType === 'tavern' ? 'location' : 'npc') : [];
    const varietyPrompt = createVarietyPrompt(existingNames);

    let codexContext = '';
    if (campaignId) {
      codexContext = await buildAIContext(supabaseClient, campaignId);
    }

    let userPrompt = '';
    if (validType === 'npc') {
      const namePart = npcName ? `named "${npcName}"` : 'with a random name';
      const conceptPart = concept ? ` Concept: ${concept}.` : '';

      let typeInstruction = '';
      if (npcType && npcType !== 'any') {
        const typeMap: Record<string, string> = {
          commoner: 'a commoner (farmer, laborer, villager)',
          merchant: 'a merchant or shopkeeper',
          guard: 'a guard, soldier, or military person',
          noble: 'a noble or official',
          criminal: 'a criminal or rogue (thief, smuggler, con artist, fence)',
          sage: 'a sage or scholar',
          priest: 'a priest or clergy member',
          artisan: 'an artisan or craftsperson',
          entertainer: 'an entertainer (bard, performer, actor)',
          wilderness: 'a wilderness guide or ranger type',
          mysterious: 'a mysterious stranger'
        };
        typeInstruction = ` They should be ${typeMap[npcType] || 'any type'}.`;
      }

      let personalityInstruction = '';
      if (personalityEmphasis && personalityEmphasis !== 'balanced') {
        const personalityMap: Record<string, string> = {
          friendly: 'friendly and helpful',
          suspicious: 'suspicious and guarded',
          eccentric: 'eccentric and quirky',
          gruff: 'gruff and tough',
          nervous: 'nervous and timid',
          arrogant: 'arrogant and pompous',
          wise: 'wise and mentor-like'
        };
        personalityInstruction = ` Their personality should be ${personalityMap[personalityEmphasis]}.`;
      }

      let detailsInstruction = '';
      if (includeDetails) {
        const requested = [];
        if (includeDetails.physical) requested.push('physical_description');
        if (includeDetails.personality) requested.push('personality_traits');
        if (includeDetails.background) requested.push('background_hook');
        if (includeDetails.speech) requested.push('speech_pattern');
        if (includeDetails.secret) requested.push('secret_motivation');
        if (requested.length > 0) {
          detailsInstruction = ` Include these fields: ${requested.join(', ')}.`;
        }
      }

      userPrompt = `${codexContext ? codexContext + '\n\n' : ''}Generate an NPC ${namePart}.${typeInstruction}${personalityInstruction}${conceptPart}${detailsInstruction}${varietyPrompt}`;
    } else if (validType === 'tavern') {
      const namePart = tavernName ? `named "${tavernName}"` : 'with a random name';
      const conceptPart = concept ? ` Concept: ${concept}.` : '';

      let typeInstruction = '';
      if (establishmentType && establishmentType !== 'any') {
        const typeMap: Record<string, string> = {
          tavern: 'a rough, working-class tavern (common folk, simple fare, noisy)',
          restaurant: 'a high-end restaurant (elegant, fine dining, upscale clientele)',
          dockside: 'a dockside dive (rough waterfront bar, sailors, smugglers, grimy)',
          nobles: "a noble's club (exclusive, wealthy patrons, refined atmosphere)",
          speakeasy: 'an underground speakeasy (hidden, secretive, illicit drinks)'
        };
        typeInstruction = ` It should be ${typeMap[establishmentType] || 'any type of establishment'}.`;
      }

      let atmosphereInstruction = '';
      if (atmosphere && atmosphere !== 'any') {
        const atmosphereMap: Record<string, string> = {
          warm: 'warm and welcoming',
          rough: 'rough and rowdy',
          mysterious: 'mysterious and shadowy',
          quiet: 'quiet and peaceful',
          lively: 'lively and festive',
          dangerous: 'dangerous and tense',
          elegant: 'elegant and refined',
          strange: 'strange and unusual'
        };
        atmosphereInstruction = ` The atmosphere should be ${atmosphereMap[atmosphere]}.`;
      }

      let sizeInstruction = '';
      if (size && size !== 'medium') {
        const sizeMap: Record<string, string> = {
          small: 'small (5-10 patrons)',
          medium: 'medium-sized (10-20 patrons)',
          large: 'large (20-40 patrons)',
          massive: 'massive (40+ patrons)'
        };
        sizeInstruction = ` It should be ${sizeMap[size]}.`;
      }

      let detailsInstruction = '';
      if (includeDetails) {
        const requested = [];
        if (includeDetails.owner) requested.push('owner');
        if (includeDetails.staff) requested.push('staff');
        if (includeDetails.signature) requested.push('signature_item');
        if (includeDetails.feature) requested.push('unique_feature');
        if (includeDetails.patrons) requested.push('patrons');
        if (includeDetails.plotHooks) requested.push('plot_hooks');
        if (includeDetails.secret) requested.push('secret');
        if (requested.length > 0) {
          detailsInstruction = ` Include these fields: ${requested.join(', ')}.`;
        }
      }

      userPrompt = `${codexContext ? codexContext + '\n\n' : ''}Generate an establishment ${namePart}.${typeInstruction}${atmosphereInstruction}${sizeInstruction}${conceptPart}${detailsInstruction}${varietyPrompt}`;
    } else {
      const conceptPart = concept ? ` Concept: ${concept}.` : '';
      userPrompt = `${codexContext ? codexContext + '\n\n' : ''}Generate an adventure hook.${conceptPart}${varietyPrompt}`;
    }

    let result;
    try {
      const completion = await openai.chat.completions.create({
        model: 'gpt-4-turbo',
        messages: [
          { role: 'system', content: SYSTEM_PROMPTS[validType] },
          { role: 'user', content: userPrompt },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.9,
        max_tokens: 500,
      });

      const content = completion.choices[0]?.message?.content;
      if (!content) {
        throw new Error('No content returned from OpenAI');
      }

      result = JSON.parse(content);
    } catch (error: any) {
      if (error?.error?.code === 'rate_limit_exceeded') {
        return NextResponse.json(
          { error: 'OpenAI is busy. Try again in 30 seconds.' },
          { status: 429 }
        );
      }

      if (error?.error?.code === 'timeout') {
        return NextResponse.json(
          { error: 'Request took too long. Try again.' },
          { status: 504 }
        );
      }

      console.error('OpenAI error:', error);
      return NextResponse.json(
        { error: 'AI service not configured. Contact support.' },
        { status: 500 }
      );
    }

    return NextResponse.json({ result });
  } catch (error) {
    console.error('Panic API error:', error);
    return NextResponse.json(
      { error: 'Something went wrong. Try again or contact support.' },
      { status: 500 }
    );
  }
}
