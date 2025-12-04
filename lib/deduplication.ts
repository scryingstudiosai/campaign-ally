import { SupabaseClient } from '@supabase/supabase-js';

export async function getExistingNames(
  supabase: SupabaseClient,
  campaignId: string,
  type?: 'npc' | 'location' | 'item' | 'faction'
): Promise<string[]> {
  const query = supabase
    .from('memory_chunks')
    .select('title, content')
    .eq('campaign_id', campaignId);

  if (type) {
    query.eq('type', type);
  }

  const { data, error } = await query;

  if (error || !data) {
    return [];
  }

  const names = new Set<string>();

  data.forEach((chunk) => {
    if (chunk.title) {
      const namePart = chunk.title.split('-')[0].trim();
      names.add(namePart.toLowerCase());
    }

    if (chunk.content && typeof chunk.content === 'object') {
      if ('name' in chunk.content && typeof chunk.content.name === 'string') {
        names.add(chunk.content.name.toLowerCase());
      }
    }
  });

  return Array.from(names);
}

export function createVarietyPrompt(existingNames: string[]): string {
  if (existingNames.length === 0) {
    return '';
  }

  const recentNames = existingNames.slice(-20);

  return `\n\nIMPORTANT: Avoid using these existing names or similar variations: ${recentNames.join(', ')}. Be highly creative and diverse in your naming. Avoid common fantasy tropes like "Mystic", "Ancient", "Whisper", "Shadow", "Crystal", "Mara", "Elara", etc. Use unexpected, memorable, and unique names.`;
}
