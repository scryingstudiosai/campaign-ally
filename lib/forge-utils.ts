/**
 * Forge Utilities for Random Table and Wild Magic Forges
 * Provides deterministic generation, dice utilities, and data helpers
 */

export type DiceType = 'd4' | 'd6' | 'd8' | 'd12' | 'd20' | 'd100';

export const DICE_OPTIONS: DiceType[] = ['d4', 'd6', 'd8', 'd12', 'd20', 'd100'];

export const SPELL_SCHOOLS = [
  'abjuration',
  'conjuration',
  'divination',
  'enchantment',
  'evocation',
  'illusion',
  'necromancy',
  'transmutation',
] as const;

export type SpellSchool = typeof SPELL_SCHOOLS[number];

export const CHAOS_TIERS = ['minor', 'moderate', 'major'] as const;
export type ChaosTier = typeof CHAOS_TIERS[number];

export const WILD_MAGIC_THEMES = [
  'Arcane Flux',
  'Feywild Oddities',
  'Infernal Backlash',
  'Leyline Static',
  'Storm-Touched Sorcery',
  'Shadow-Warped Magic',
  "Trickster's Prank",
  'Astral Echo',
  'Elemental Crosswind',
  'Urban Arcana Malfunction',
];

/**
 * Mulberry32 PRNG for deterministic random generation
 */
export function prng(seed: string): () => number {
  let h = 1779033703 ^ seed.length;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(h ^ seed.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return function () {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
}

/**
 * Generate a v4 UUID
 */
export function uuidv4(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Get current ISO 8601 UTC timestamp
 */
export function isoUtcNow(): string {
  return new Date().toISOString();
}

/**
 * Normalize tags from comma-separated string to array
 */
export function normalizeTags(input: string): string[] {
  if (!input || !input.trim()) return [];
  return input
    .split(',')
    .map((tag) => tag.trim().toLowerCase())
    .filter((tag) => tag.length > 0)
    .filter((tag, index, arr) => arr.indexOf(tag) === index);
}

/**
 * Get number of sides for a dice type
 */
export function diceSides(dice: DiceType): number {
  const match = dice.match(/\d+/);
  return match ? parseInt(match[0], 10) : 20;
}

/**
 * Clamp and sort reroll indices
 */
export function clampRerolls(indices: number[], max: number): number[] {
  if (!indices || indices.length === 0) return [];
  const unique = Array.from(new Set(indices));
  const clamped = unique.filter((i) => i >= 1 && i <= max);
  return clamped.sort((a, b) => a - b);
}

/**
 * Parse reroll indices from string (e.g., "2,5,9")
 */
export function parseRerollIndices(input: string): number[] {
  if (!input || !input.trim()) return [];
  return input
    .split(',')
    .map((s) => parseInt(s.trim(), 10))
    .filter((n) => !isNaN(n) && n > 0);
}

/**
 * Convert entries to Markdown table
 */
export function toMarkdownTable(
  entries: any[],
  headers: string[],
  dice?: DiceType
): string {
  if (!entries || entries.length === 0) return '';

  const diceLabel = dice || 'Roll';
  const headerRow = `| ${headers.join(' | ')} |`;
  const separatorRow = `|${headers.map(() => '---').join('|')}|`;

  const rows = entries.map((entry) => {
    const cells = headers.map((header) => {
      if (header.toLowerCase() === diceLabel.toLowerCase() || header === 'Roll') {
        return entry.roll || '';
      }
      const key = header.toLowerCase();
      return entry[key] || entry.title || entry.description || entry.effect || '';
    });
    return `| ${cells.join(' | ')} |`;
  });

  return [headerRow, separatorRow, ...rows].join('\n');
}

/**
 * Download JSON as file
 */
export function downloadJson(filename: string, data: any): void {
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Copy text to clipboard
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (error) {
    console.error('Failed to copy:', error);
    return false;
  }
}

/**
 * Roll a dice deterministically or randomly
 */
export function rollDice(dice: DiceType, seed?: string): number {
  const sides = diceSides(dice);
  if (seed) {
    const rng = prng(seed + Date.now().toString());
    return Math.floor(rng() * sides) + 1;
  }
  return Math.floor(Math.random() * sides) + 1;
}

/**
 * Select a random theme deterministically or randomly
 */
export function selectTheme(seed?: string): string {
  if (seed) {
    const rng = prng(seed);
    const index = Math.floor(rng() * WILD_MAGIC_THEMES.length);
    return WILD_MAGIC_THEMES[index];
  }
  return WILD_MAGIC_THEMES[Math.floor(Math.random() * WILD_MAGIC_THEMES.length)];
}

/**
 * Validate dice type
 */
export function isValidDice(dice: string): dice is DiceType {
  return DICE_OPTIONS.includes(dice as DiceType);
}

/**
 * Validate spell school
 */
export function isValidSpellSchool(school: string): school is SpellSchool {
  return SPELL_SCHOOLS.includes(school as SpellSchool);
}

/**
 * Validate chaos tier
 */
export function isValidChaosTier(tier: string): tier is ChaosTier {
  return CHAOS_TIERS.includes(tier as ChaosTier);
}

/**
 * Format date for display
 */
export function formatDate(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
