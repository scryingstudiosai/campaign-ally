import { ForgeCategory, ForgeType } from '@/types/forge';

export const FORGE_CATEGORIES: ForgeCategory[] = [
  {
    id: 'characters',
    name: 'Characters',
    forges: [
      {
        type: 'npc',
        name: 'NPC Forge',
        description: 'Create a memorable character on the fly',
        icon: 'User',
      },
      {
        type: 'hero',
        name: 'Hero Forge',
        description: 'Create balanced, memorable player characters or allied NPCs',
        icon: 'User',
      },
      {
        type: 'villain',
        name: 'Villain Forge',
        description: 'Design compelling antagonists from minions to BBEGs',
        icon: 'Skull',
      },
      {
        type: 'monster',
        name: 'Monster Forge',
        description: 'Generate unique creatures with custom traits and lore',
        icon: 'Bug',
      },
      {
        type: 'name',
        name: 'Name Forge',
        description: 'Generate random names for any character',
        icon: 'User',
      },
      {
        type: 'backstory',
        name: 'Backstory Forge',
        description: 'Create comprehensive character histories with full demographics',
        icon: 'BookUser',
      },
    ],
  },
  {
    id: 'locations',
    name: 'Locations',
    forges: [
      {
        type: 'tavern',
        name: 'Tavern Forge',
        description: 'Generate a unique establishment',
        icon: 'Store',
      },
      {
        type: 'town',
        name: 'Town Forge',
        description: 'Build living settlements with NPCs and plot hooks',
        icon: 'Home',
      },
      {
        type: 'inn',
        name: 'Inn Forge',
        description: 'Generate detailed inns and lodging establishments',
        icon: 'Hotel',
      },
      {
        type: 'landmark',
        name: 'Landmark Forge',
        description: 'Create landmarks (libraries, temples, docks, markets, and more)',
        icon: 'Landmark',
      },
      {
        type: 'shop',
        name: 'Shop Forge',
        description: 'Create memorable shops with unique owners and inventory',
        icon: 'Store',
      },
      {
        type: 'nation',
        name: 'Nation Forge',
        description: 'Design nations, kingdoms, and political entities',
        icon: 'Flag',
      },
      {
        type: 'guild',
        name: 'Guild Forge',
        description: 'Create organizations, guilds, and factions with members and secrets',
        icon: 'Users',
      },
    ],
  },
  {
    id: 'magic',
    name: 'Magic',
    forges: [
      {
        type: 'item',
        name: 'Item Forge',
        description: 'Craft magical items with history and mechanical effects',
        icon: 'Sparkles',
      },
      {
        type: 'scroll',
        name: 'Scroll Forge',
        description: 'Design custom scrolls with balanced mechanics',
        icon: 'Wand',
      },
      {
        type: 'loot',
        name: 'Loot Forge',
        description: 'Generate balanced treasure tables for any encounter',
        icon: 'Coins',
      },
      {
        type: 'wild-magic',
        name: 'Wild Magic',
        description: 'Generate wild magic surges and tables',
        icon: 'Zap',
      },
      {
        type: 'oddity',
        name: 'Oddities Forge',
        description: 'Generate 1-10 mundane but interesting trinkets with rich details',
        icon: 'Sparkles',
      },
    ],
  },
  {
    id: 'scenarios',
    name: 'Scenarios',
    forges: [
      {
        type: 'hook',
        name: 'Hook Forge',
        description: 'Create an engaging plot hook',
        icon: 'Swords',
      },
      {
        type: 'encounter-seq',
        name: 'Encounter Sequence',
        description: 'Plan multi-beat encounters with checks, triggers, and outcomes',
        icon: 'Swords',
      },
      {
        type: 'puzzle',
        name: 'Puzzle Forge',
        description: 'Generate immersive puzzles with clues, hints, and fail-forward options',
        icon: 'Puzzle',
      },
      {
        type: 'trap',
        name: 'Trap Forge',
        description: 'Create detailed traps with detection clues and multiple disarm methods',
        icon: 'Skull',
      },
    ],
  },
  {
    id: 'environment',
    name: 'Environment',
    forges: [
      {
        type: 'weather',
        name: 'Weather Forge',
        description: 'Generate immersive weather and environmental conditions',
        icon: 'Cloud',
      },
    ],
  },
  {
    id: 'tables',
    name: 'Tables',
    forges: [
      {
        type: 'random-table',
        name: 'Random Table',
        description: 'Generate custom random tables for any occasion',
        icon: 'Dices',
      },
    ],
  },
];

export function getForgeDefinition(type: ForgeType) {
  for (const category of FORGE_CATEGORIES) {
    const forge = category.forges.find((f) => f.type === type);
    if (forge) return forge;
  }
  return null;
}

export function getImagePrompt(forgeType: ForgeType, data: any): string {
  switch (forgeType) {
    case 'hero':
      return `${data.race} ${data.class}, ${data.flair}, fantasy RPG character portrait, high quality digital art`;
    case 'villain':
      return `menacing ${data.flair}, dark fantasy villain portrait, dramatic lighting`;
    case 'monster':
      return `${data.species}, ${data.flair}, fantasy creature concept art, detailed`;
    case 'item':
      return `${data.name}, ${data.flair}, fantasy item, white background, high quality render`;
    default:
      return '';
  }
}

export function shouldGenerateImage(forgeType: ForgeType, data: any): boolean {
  switch (forgeType) {
    case 'hero':
      return true;
    case 'villain':
      return data.tier >= 2;
    case 'monster':
      return true;
    case 'item':
      return ['rare', 'very rare', 'legendary', 'artifact'].includes(data.rarity);
    default:
      return false;
  }
}
