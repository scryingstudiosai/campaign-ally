import { RelationType } from '@/types/forge';

/**
 * Maps each relation type to its inverse.
 * Symmetric relations map to themselves.
 */
export const RELATION_INVERSES: Record<RelationType, RelationType> = {
  // Symmetric relations
  related_to: 'related_to',
  allied_with: 'allied_with',
  opposed_to: 'opposed_to',
  rival_of: 'rival_of',

  // Asymmetric relations
  located_in: 'contains',
  contains: 'located_in',

  works_for: 'employs',
  employs: 'works_for',

  created_by: 'created',
  created: 'created_by',

  member_of: 'has_member',
  has_member: 'member_of',

  commands: 'commanded_by',
  commanded_by: 'commands',

  guards: 'guarded_by',
  guarded_by: 'guards',

  owns: 'owned_by',
  owned_by: 'owns',

  fears: 'feared_by',
  feared_by: 'fears',

  worships: 'worshipped_by',
  worshipped_by: 'worships',

  serves: 'served_by',
  served_by: 'serves',

  betrayed_by: 'betrayed',
  betrayed: 'betrayed_by',

  indebted_to: 'debt_owed_by',
  debt_owed_by: 'indebted_to',

  mentored_by: 'mentors',
  mentors: 'mentored_by',

  knows_secret_about: 'secret_known_by',
  secret_known_by: 'knows_secret_about',

  seeks: 'sought_by',
  sought_by: 'seeks',

  inhabits: 'inhabited_by',
  inhabited_by: 'inhabits',

  runs: 'run_by',
  run_by: 'runs',
};

/**
 * Gets the inverse relation type for a given relation type.
 */
export function getInverseRelationType(relationType: RelationType): RelationType {
  return RELATION_INVERSES[relationType] || relationType;
}
