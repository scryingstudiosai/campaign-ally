import type { SupabaseClient } from '@supabase/supabase-js';
import type { CampaignCodex, MajorArc } from '@/types/codex';

/**
 * Builds a compact AI context string from the campaign codex.
 * This string is used to prefix AI prompts when respectCodex is enabled.
 */
export async function buildAIContext(supabase: SupabaseClient, campaignId: string): Promise<string> {

  const { data: codex } = await supabase
    .from('campaign_codex')
    .select('*')
    .eq('campaign_id', campaignId)
    .maybeSingle();

  if (!codex) return '';

  const typedCodex = codex as unknown as CampaignCodex;

  const activeArcs = Array.isArray(typedCodex.major_arcs)
    ? typedCodex.major_arcs
        .filter((a: MajorArc) => a.status === 'active')
        .map((a: MajorArc) => a.title)
        .join(', ')
    : '';

  const flairInstructions = getFlairInstructions(typedCodex.flair_level ?? 'balanced');

  return `
# CAMPAIGN CODEX
Elevator Pitch: ${typedCodex.elevator_pitch ?? ''}
Premise: ${typedCodex.premise ?? ''}
Themes: ${(typedCodex.themes ?? []).join(', ')}
Tone: ${JSON.stringify(typedCodex.tone ?? {})}
Pillars: ${(typedCodex.pillars ?? []).join(' | ')}
Style: ${typedCodex.narrative_voice ?? 'cinematic'}, ${typedCodex.pacing_preference ?? 'balanced'}
Descriptive Detail: ${flairInstructions}
House Rules: ${typedCodex.house_rules ?? ''}
Banned: ${(typedCodex.banned_content ?? []).join(', ')}
Active Arcs: ${activeArcs}
  `.trim();
}

/**
 * Returns instructions for the AI based on the flair level setting
 */
function getFlairInstructions(flairLevel: string): string {
  switch (flairLevel) {
    case 'minimal':
      return 'Be concise and direct. Focus on essential facts and mechanics. Avoid flowery language.';
    case 'balanced':
      return 'Use moderate detail with some descriptive elements. Balance practicality with atmosphere.';
    case 'rich':
      return 'Include vivid descriptions and atmospheric details. Make the content immersive and evocative.';
    case 'verbose':
      return 'Provide highly detailed, elaborate descriptions with rich sensory details and deep lore. Create a fully immersive experience.';
    default:
      return 'Use moderate detail with some descriptive elements. Balance practicality with atmosphere.';
  }
}

/**
 * Builds comprehensive prep context including codex + relevant memories.
 * This enriched context is used for session prep and AI-assisted planning.
 *
 * @param campaignId - The campaign ID
 * @param options - Optional parameters for context building
 * @param options.includeMemories - Whether to include memory chunks (default: true)
 * @param options.memoryLimit - Maximum number of memories to include (default: 10)
 * @param options.memoryTypes - Filter memories by type (e.g., ['npc', 'location'])
 */
export async function buildPrepContext(
  supabase: SupabaseClient,
  campaignId: string,
  options?: {
    includeMemories?: boolean;
    memoryLimit?: number;
    memoryTypes?: string[];
  }
): Promise<string> {
  const {
    includeMemories = true,
    memoryLimit = 10,
    memoryTypes,
  } = options || {};

  const codexContext = await buildAIContext(supabase, campaignId);

  if (!includeMemories) {
    return codexContext;
  }

  let memoryQuery = supabase
    .from('memory_chunks')
    .select(`
      id,
      title,
      content,
      type,
      tags
    `)
    .eq('campaign_id', campaignId)
    .order('created_at', { ascending: false })
    .limit(memoryLimit);

  if (memoryTypes && memoryTypes.length > 0) {
    memoryQuery = memoryQuery.in('type', memoryTypes);
  }

  const { data: memories, error } = await memoryQuery;

  if (error || !memories || memories.length === 0) {
    return codexContext;
  }

  const memorySection = memories
    .map((memory: any) => {
      const tags = Array.isArray(memory.tags) ? memory.tags.join(', ') : '';
      return `
## ${memory.title} [${memory.type}]
${tags ? `Tags: ${tags}` : ''}
${memory.content}
      `.trim();
    })
    .join('\n\n');

  return `
${codexContext}

# RELEVANT MEMORIES
${memorySection}
  `.trim();
}
