export type ForgeType =
  | 'npc'
  | 'tavern'
  | 'hook'
  | 'name'
  | 'hero'
  | 'villain'
  | 'town'
  | 'inn'
  | 'landmark'
  | 'shop'
  | 'item'
  | 'scroll'
  | 'loot'
  | 'nation'
  | 'guild'
  | 'monster'
  | 'encounter-seq'
  | 'weather'
  | 'puzzle'
  | 'random-table'
  | 'wild-magic'
  | 'trap'
  | 'backstory'
  | 'oddity';

export type RelationType =
  | 'related_to'
  | 'located_in'
  | 'contains'
  | 'works_for'
  | 'employs'
  | 'created_by'
  | 'created'
  | 'member_of'
  | 'has_member'
  | 'commands'
  | 'commanded_by'
  | 'guards'
  | 'guarded_by'
  | 'owns'
  | 'owned_by'
  | 'fears'
  | 'feared_by'
  | 'worships'
  | 'worshipped_by'
  | 'serves'
  | 'served_by'
  | 'betrayed_by'
  | 'betrayed'
  | 'indebted_to'
  | 'debt_owed_by'
  | 'mentored_by'
  | 'mentors'
  | 'rival_of'
  | 'knows_secret_about'
  | 'secret_known_by'
  | 'allied_with'
  | 'opposed_to'
  | 'seeks'
  | 'sought_by'
  | 'inhabits'
  | 'inhabited_by'
  | 'runs'
  | 'run_by';

export interface Relation {
  id: string;
  campaign_id: string;
  from_id: string;
  to_id: string;
  relation_type: RelationType;
  created_at: string;
  from?: {
    id: string;
    title: string;
    type: string;
  };
  to?: {
    id: string;
    title: string;
    type: string;
  };
}

export interface ForgeCategory {
  id: string;
  name: string;
  forges: ForgeDefinition[];
}

export interface ForgeDefinition {
  type: ForgeType;
  name: string;
  description: string;
  icon: string;
}
