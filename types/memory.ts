export interface MemoryItem {
  id: string;
  campaign_id: string;
  type: 'npc' | 'tavern' | 'hook' | 'location' | 'item' | 'monster' | 'faction' | 'shop' | 'town' | 'event' | 'puzzle';
  title: string;
  content: any;
  created_at: string;
  last_edited_at?: string;
  forge_type?: 'npc' | 'hero' | 'villain' | 'monster' | 'town' | 'shop' | 'nation' | 'guild' | 'item' | 'scroll' | 'loot' | 'encounter-seq' | 'tavern' | 'inn' | 'landmark' | 'weather' | 'puzzle' | 'trap' | 'backstory' | 'oddity';
  tags?: string[];
  user_notes?: string;
  text_content?: string;
  created_in_session_id?: string;
  is_pinned?: boolean;
  pinned?: boolean;
  archived?: boolean;
  name?: string;
  updated_at?: string;
}

export interface MemorySearchParams {
  campaignId: string;
  type?: 'npc' | 'tavern' | 'hook' | 'location' | 'item' | 'monster';
  limit?: number;
}

export interface MemoryPreview {
  id: string;
  type: 'npc' | 'tavern' | 'hook' | 'location' | 'item' | 'monster';
  forge_type?: 'npc' | 'hero' | 'villain' | 'monster' | 'town' | 'shop' | 'nation' | 'guild' | 'item' | 'scroll' | 'loot' | 'encounter-seq' | 'tavern' | 'inn' | 'landmark' | 'trap' | 'backstory' | 'oddity';
  title: string;
  preview?: string;
  tags?: string[];
  created_at: string;
  last_edited_at?: string;
  relations_count?: number;
}
