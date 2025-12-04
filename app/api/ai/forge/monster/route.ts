import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { createServerClientFromRequest, createAuthenticatedClient } from '@/lib/supabase/server';
import { z } from 'zod';


export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';


const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const MonsterInputSchema = z.object({
  campaignId: z.string().uuid(),
  name: z.string().optional(),
  concept: z.string().optional(),
  tier: z.number().int().min(1).max(4).default(2),
  monsterType: z.string().optional(),
  size: z.string().optional(),
  environment: z.string().optional(),
  intelligence: z.string().optional(),
  behavior: z.string().optional(),
  specialTrait: z.string().optional(),
  includeDetails: z.object({
    physical: z.boolean().default(true),
    behavior: z.boolean().default(true),
    combat: z.boolean().default(true),
    abilities: z.boolean().default(true),
    habitat: z.boolean().default(true),
    weaknesses: z.boolean().default(true),
    lore: z.boolean().default(true),
    treasure: z.boolean().default(true),
    statBlock: z.boolean().default(true),
  }).optional(),
  savingThrows: z.array(z.string()).optional(),
  skills: z.array(z.string()).optional(),
  damageResistances: z.array(z.string()).optional(),
  damageImmunities: z.array(z.string()).optional(),
  damageVulnerabilities: z.array(z.string()).optional(),
  conditionImmunities: z.array(z.string()).optional(),
  senses: z.string().optional(),
  languages: z.string().optional(),
  isLegendary: z.boolean().optional(),
  legendaryActionsPerRound: z.number().int().min(1).max(4).optional(),
  isSpellcaster: z.boolean().optional(),
  spellcastingType: z.enum(['standard', 'innate']).optional(),
  spellcastingAbility: z.enum(['int', 'wis', 'cha']).optional(),
  casterLevel: z.number().int().min(1).max(20).optional(),
  hasLair: z.boolean().optional(),
  lairInitiative: z.number().int().min(1).max(30).optional(),
  hasRegionalEffects: z.boolean().optional(),
  useSmartDefaults: z.boolean().optional().default(true),
  respectCodex: z.boolean().default(true),
  tags: z.array(z.string()).optional(),
});

const SYSTEM_PROMPT = `You are a master monster creator for D&D 5e.

CRITICAL RULES:
- Tier 1 = Common (CR 1–4), Tier 2 = Elite (CR 5–10), Tier 3 = Legendary (CR 11+)
- HP and AC should be appropriate for the CR level
- Calculate proficiency bonus: 2 + floor((CR - 1) / 4), minimum 2
- Calculate ability modifiers: floor((score - 10) / 2)
- Attack bonus = proficiency + ability modifier
- Save DC = 8 + proficiency + ability modifier
- Return ONLY valid JSON

ACTION FORMATTING REQUIREMENTS:
All actions MUST follow standard D&D 5e format:

For Melee/Ranged Attacks:
"**Action Name.** Melee/Ranged Weapon Attack: +X to hit, reach X ft./range X/X ft., one target. Hit: X (XdX + X) damage type damage."

For Save-Based Abilities:
"**Action Name.** Description of effect. Each creature in area must make a DC X ability saving throw, taking X (XdX) damage type on a failed save, or half as much damage on a successful one."

For Multiattack:
"**Multiattack.** The creature makes X attacks: [list attacks]."

Examples:
- "**Claw.** Melee Weapon Attack: +5 to hit, reach 5 ft., one target. Hit: 8 (1d8 + 4) slashing damage."
- "**Fire Breath (Recharge 5-6).** The dragon exhales fire in a 30-foot cone. Each creature in that area must make a DC 14 Dexterity saving throw, taking 22 (4d10) fire damage on a failed save, or half as much damage on a successful one."

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
  ] (2-4 actions, include Multiattack if CR 4+),
  "reactions": [
    {
      "name": "string (without ** formatting)",
      "description": "string (trigger and effect, e.g., 'When a creature the monster can see targets it with an attack, the monster can...')"
    }
  ] (0-2 reactions, appropriate to creature type),
  "specialAbilities": [
    {
      "name": "string (without ** formatting)",
      "recharge": "string | null (e.g., 'Recharge 5-6', 'Recharge 6', '1/Day', '3/Day')",
      "description": "string (formatted like actions with save DCs, damage, etc.)"
    }
  ] (0-2 special abilities with recharge/limited use),
  "spellcasting": {
    "type": "standard" | "innate",
    "ability": "Intelligence" | "Wisdom" | "Charisma",
    "level": number (caster level for standard, omit for innate),
    "saveDC": number,
    "attackBonus": number,
    "spells": {
      "cantrips": ["spell name", ...] (only for standard),
      "1st": {"slots": number, "spells": ["spell name", ...]},
      "2nd": {"slots": number, "spells": ["spell name", ...]},
      ... (continue based on level),
      "atWill": ["spell name", ...] (only for innate),
      "perDay3": ["spell name", ...] (only for innate),
      "perDay1": ["spell name", ...] (only for innate)
    }
  } (optional, only if spellcaster),
  "legendaryActions": [
    {
      "name": "string (without ** formatting)",
      "cost": number (1, 2, or 3),
      "description": "string"
    }
  ] (optional, only for legendary creatures),
  "legendaryActionsPerRound": number (optional, usually 3, only for legendary),
  "lairActions": [
    "string (description of lair action)"
  ] (optional, only for creatures with lairs, 3 actions),
  "lairInitiative": number (optional, usually 20, only for creatures with lairs),
  "regionalEffects": [
    "string (description of regional effect)"
  ] (optional, only if has lair, 3 effects),
  "tactics": "string (how it fights in combat)",
  "lair": "string | null (optional, for tier 2+)",
  "weakness": "string (specific vulnerability players can exploit)",
  "loot": ["string"] (2-4 items or resources),
  "flair": "string (40-60 words describing appearance/behavior)"
}`;

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
    const validation = MonsterInputSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid input', details: validation.error.errors },
        { status: 400 }
      );
    }

    const { campaignId, name, concept, tier, monsterType, size, environment, intelligence, behavior, specialTrait, includeDetails, respectCodex, tags, savingThrows, skills, damageResistances, damageImmunities, damageVulnerabilities, conditionImmunities, senses, languages, isLegendary, legendaryActionsPerRound, isSpellcaster, spellcastingType, spellcastingAbility, casterLevel, hasLair, lairInitiative, hasRegionalEffects, useSmartDefaults } = validation.data;

    const { data: campaign } = await supabase
      .from('campaigns')
      .select('id')
      .eq('id', campaignId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (!campaign) {
      return NextResponse.json(
        { success: false, error: 'Campaign not found' },
        { status: 404 }
      );
    }

    let userPrompt = `Generate a monster creature.\n`;

    userPrompt += `Challenge Rating/Tier: ${tier}\n`;
    if (name) userPrompt += `Name: ${name}\n`;
    if (concept) userPrompt += `Concept: ${concept}\n`;
    if (monsterType && monsterType !== 'any') userPrompt += `Monster Type: ${monsterType}\n`;
    if (size) userPrompt += `Size: ${size}\n`;
    if (environment && environment !== 'any') userPrompt += `Environment: ${environment}\n`;
    if (intelligence) userPrompt += `Intelligence: ${intelligence}\n`;
    if (behavior && behavior !== 'any') userPrompt += `Behavior: ${behavior}\n`;
    if (specialTrait && specialTrait !== 'any') userPrompt += `Special Trait: ${specialTrait}\n`;

    if (includeDetails) {
      userPrompt += `\nInclude the following details:\n`;
      if (includeDetails.physical) userPrompt += `- Physical description & appearance\n`;
      if (includeDetails.behavior) userPrompt += `- Behavioral traits & instincts\n`;
      if (includeDetails.combat) userPrompt += `- Combat abilities & tactics\n`;
      if (includeDetails.abilities) userPrompt += `- Special abilities & powers\n`;
      if (includeDetails.habitat) userPrompt += `- Habitat & ecology\n`;
      if (includeDetails.weaknesses) userPrompt += `- Weaknesses & vulnerabilities\n`;
      if (includeDetails.lore) userPrompt += `- Lore & origin story\n`;
      if (includeDetails.treasure) userPrompt += `- Treasure & loot (if applicable)\n`;
      if (includeDetails.statBlock) userPrompt += `- Stat block suggestions\n`;
    }

    if (tags?.length) userPrompt += `\nTags: ${tags.join(', ')}\n`;

    if (useSmartDefaults) {
      userPrompt += `\nSMART DEFAULTS ENABLED:\n`;
      userPrompt += `- Auto-calculate appropriate saving throws for a ${monsterType || 'monster'} creature\n`;
      userPrompt += `- Include typical skills for this creature type and intelligence level\n`;
      userPrompt += `- Add standard resistances/immunities appropriate for this creature type\n`;
      userPrompt += `- Use common senses (darkvision 60 ft for most monsters, unless otherwise specified)\n`;
      userPrompt += `- Generate appropriate languages based on intelligence and creature type\n`;
    }

    if (savingThrows?.length || skills?.length || damageResistances?.length || damageImmunities?.length || damageVulnerabilities?.length || conditionImmunities?.length || senses || languages) {
      userPrompt += `\nD&D 5e Stat Block Requirements:\n`;
      if (savingThrows?.length) userPrompt += `- Saving Throws: ${savingThrows.map(s => s.toUpperCase()).join(', ')}\n`;
      if (skills?.length) userPrompt += `- Skills: ${skills.map(s => s.replace('_', ' ')).join(', ')}\n`;
      if (damageResistances?.length) userPrompt += `- Damage Resistances: ${damageResistances.join(', ')}\n`;
      if (damageImmunities?.length) userPrompt += `- Damage Immunities: ${damageImmunities.join(', ')}\n`;
      if (damageVulnerabilities?.length) userPrompt += `- Damage Vulnerabilities: ${damageVulnerabilities.join(', ')}\n`;
      if (conditionImmunities?.length) userPrompt += `- Condition Immunities: ${conditionImmunities.join(', ')}\n`;
      if (senses) userPrompt += `- Senses: ${senses}\n`;
      if (languages) userPrompt += `- Languages: ${languages}\n`;
    }

    if (isLegendary) {
      userPrompt += `\nLEGENDARY CREATURE:\n`;
      userPrompt += `- Generate ${legendaryActionsPerRound || 3} legendary actions\n`;
      userPrompt += `- Each action should have a name, cost (1-3), and description\n`;
      userPrompt += `- Make them thematic to the creature type\n`;
    }

    if (isSpellcaster) {
      userPrompt += `\nSPELLCASTER:\n`;
      userPrompt += `- Type: ${spellcastingType === 'innate' ? 'Innate Spellcasting' : 'Standard Spellcasting'}\n`;
      userPrompt += `- Spellcasting Ability: ${spellcastingAbility?.toUpperCase()}\n`;
      if (spellcastingType === 'standard' && casterLevel) {
        userPrompt += `- Caster Level: ${casterLevel}\n`;
        userPrompt += `- Generate appropriate spell list for level\n`;
      } else {
        userPrompt += `- Generate innate spells with frequency limits (at will, 3/day, 1/day)\n`;
      }
      userPrompt += `- Calculate spell save DC and attack bonus\n`;
    }

    if (hasLair) {
      userPrompt += `\nLAIR CREATURE:\n`;
      userPrompt += `- Initiative Count: ${lairInitiative || 20}\n`;
      userPrompt += `- Generate 3 thematic lair actions\n`;
      userPrompt += `- Make lair actions environmental and strategic\n`;

      if (hasRegionalEffects) {
        userPrompt += `- Generate 3 regional effects for the surrounding area\n`;
      }
    }

    let result;
    let retryCount = 0;

    while (retryCount < 2) {
      try {
        const completion = await openai.chat.completions.create({
          model: 'gpt-4-turbo',
          messages: [
            { role: 'system', content: retryCount > 0 ? `Return ONLY valid JSON. No markdown. ${SYSTEM_PROMPT}` : SYSTEM_PROMPT },
            { role: 'user', content: userPrompt },
          ],
          response_format: { type: 'json_object' },
          temperature: 0.7,
          max_tokens: 1000,
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

    const title = `${result.name} - CR ${result.cr}`;
    const textContent = `${result.name} (CR ${result.cr})\n${result.size} ${result.type}\nAC ${result.ac}, HP ${result.hp}\n\n${result.flair}\n\nActions:\n${result.actions.map((a: any) => `- ${a.name}: ${a.description}`).join('\n')}\n\nTactics: ${result.tactics}\nWeakness: ${result.weakness}`;

    const { data: memoryChunk, error: insertError } = await supabase
      .from('memory_chunks')
      .insert({
        campaign_id: campaignId,
        type: 'monster',
        title,
        text_content: textContent,
        content: result,
        forge_type: 'monster',
        tags: tags || [],
      })
      .select()
      .single();

    if (insertError) {
      return NextResponse.json(
        { success: false, error: 'Failed to save monster' },
        { status: 500 }
      );
    }

    // Increment generation count
    await supabase.rpc('increment_user_generations', { user_id: user.id });

    return NextResponse.json({
      success: true,
      data: { id: memoryChunk.id, ...result },
    });
  } catch (error) {
    console.error('Monster forge error:', error);
    return NextResponse.json(
      { success: false, error: 'Something went wrong' },
      { status: 500 }
    );
  }
}
