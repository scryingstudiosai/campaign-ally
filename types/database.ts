export interface Profile {
  id: string;
  email: string | null;
  created_at: string;
}

export interface Campaign {
  id: string;
  user_id: string;
  name: string;
  system: string;
  party_level: number;
  created_at: string;
}

export interface MemoryChunk {
  id: string;
  campaign_id: string;
  type: 'npc' | 'tavern' | 'hook' | 'location' | 'item' | 'encounter';
  title: string;
  content: any;
  created_at: string;
  tags: string[];
  user_notes: string | null;
  last_edited_at: string;
  created_in_session_id: string | null;
  forge_type?: string | null;
  text_content?: string | null;
}

export interface CampaignTag {
  id: string;
  campaign_id: string;
  tag_name: string;
  tag_category: 'preset' | 'location' | 'faction' | 'custom';
  use_count: number;
  created_at: string;
}

export interface PanicUse {
  id: string;
  user_id: string;
  created_at: string;
}
