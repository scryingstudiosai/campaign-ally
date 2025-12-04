export type FlairLevel = 'none' | 'subtle' | 'cinematic';

export interface NPCResult {
  name: string;
  role: string;
  voiceHook: string;
  secretOrLeverage: string;
  oneLineIntro: string;
  flair: string;
}

export interface TavernResult {
  name: string;
  owner: string;
  signatureDetail: string;
  oneHook: string;
  menuItem: string;
  flair: string;
}

export interface HookResult {
  hook: string;
  angle: 'mystery' | 'temptation' | 'threat' | 'moral';
  whoCares: string;
  escalation: string;
  flair: string;
}

export type PanicResult = NPCResult | TavernResult | HookResult;

export interface PanicRequest {
  type: 'npc' | 'tavern' | 'hook';
  flairLevel: FlairLevel;
  campaignId: string;
  npcName?: string;
}
