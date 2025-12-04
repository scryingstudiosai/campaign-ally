export type Faction = {
  name: string;
  description: string;
  goals: string;
  status: 'active' | 'allied' | 'defeated';
};

export type MajorArc = {
  title: string;
  description: string;
  current_act: number;
  total_acts: number;
  status: 'planning' | 'active' | 'completed' | 'paused';
};

export type ForeshadowingSeed = {
  id: string;
  seed: string;
  target_arc: string;
  target_session?: number;
  placement: 'delivered' | 'pending' | 'skipped';
  subtlety: 1 | 2 | 3 | 4 | 5;
  delivered_in_session?: number;
  player_noticed?: boolean;
};

export type TimelineEvent = {
  date: string;
  event: string;
  details: string;
};

export type ToneSetting = {
  mood: string;
  humor_level: string;
  violence: string;
};

export type NarrativeVoice =
  | 'cinematic'
  | 'gritty'
  | 'comedic'
  | 'epic'
  | 'noir'
  | 'whimsical';

export type PacingPreference =
  | 'slow_burn'
  | 'balanced'
  | 'action_packed';

export type FlairLevel =
  | 'minimal'
  | 'balanced'
  | 'rich'
  | 'verbose';

export type CampaignCodex = {
  id: string;
  campaign_id: string;
  premise?: string;
  elevator_pitch?: string;
  themes: string[];
  tone: ToneSetting;
  pillars: string[];
  style_guide?: string;
  narrative_voice?: NarrativeVoice;
  pacing_preference?: PacingPreference;
  flair_level?: FlairLevel;
  house_rules?: string;
  banned_content: string[];
  allowed_sources: string[];
  factions: Faction[];
  major_arcs: MajorArc[];
  timeline: TimelineEvent[];
  foreshadowing: string[];
  open_questions: string[];
  player_secrets: Record<string, string>;
  last_canon_check?: string;
  version: number;
  created_at: string;
  updated_at: string;
};
