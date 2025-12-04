/**
 * Campaign Ally Dice Roller Utilities
 * Supports XdY±Z notation, advantage/disadvantage, and deterministic seeding
 */

export interface DiceFormula {
  count: number;
  sides: number;
  modifier: number;
}

export interface RollResult {
  id: string;
  formula: string;
  individual: number[];
  modifier: number;
  total: number;
  advantage?: boolean;
  disadvantage?: boolean;
  seeded?: boolean;
  seed?: string;
  timestamp: string;
  // For adv/dis, store the discarded rolls
  discarded?: number[];
}

/**
 * Parse dice formula like "2d6+3", "d20", "4d8-2"
 */
export function parseFormula(input: string): DiceFormula | null {
  const trimmed = input.trim().toLowerCase();

  // Match patterns like: XdY+Z, XdY-Z, dY+Z, dY-Z, XdY, dY
  const match = trimmed.match(/^(\d*)d(\d+)([+-]\d+)?$/);

  if (!match) return null;

  const count = match[1] ? parseInt(match[1]) : 1;
  const sides = parseInt(match[2]);
  const modifier = match[3] ? parseInt(match[3]) : 0;

  if (count < 1 || sides < 2) return null;

  return { count, sides, modifier };
}

/**
 * Simple PRNG based on mulberry32
 * Returns a function that generates [0,1) floats
 */
export function createSeededRandom(seed: string): () => number {
  // Convert string to numeric seed
  let numericSeed = 0;
  for (let i = 0; i < seed.length; i++) {
    numericSeed = ((numericSeed << 5) - numericSeed) + seed.charCodeAt(i);
    numericSeed = numericSeed & numericSeed; // Convert to 32bit integer
  }

  // Ensure positive
  numericSeed = Math.abs(numericSeed);

  // Mulberry32 PRNG
  return function() {
    numericSeed += 0x6D2B79F5;
    let t = numericSeed;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Roll a single die with optional seeded random
 */
function rollDie(sides: number, random: () => number): number {
  return Math.floor(random() * sides) + 1;
}

/**
 * Roll multiple dice
 */
function rollMultiple(count: number, sides: number, random: () => number): number[] {
  const results: number[] = [];
  for (let i = 0; i < count; i++) {
    results.push(rollDie(sides, random));
  }
  return results;
}

export interface RollOptions {
  advantage?: boolean;
  disadvantage?: boolean;
  seeded?: boolean;
  seed?: string;
}

/**
 * Main roll function
 */
export function rollDice(
  formula: DiceFormula,
  formulaString: string,
  options: RollOptions = {}
): RollResult {
  const { advantage, disadvantage, seeded, seed } = options;

  // Create random function
  const random = seeded && seed
    ? createSeededRandom(seed)
    : Math.random;

  // Both advantage and disadvantage cancel out to normal roll
  const hasAdvantage = advantage && !disadvantage;
  const hasDisadvantage = disadvantage && !advantage;

  let individual: number[];
  let discarded: number[] | undefined;

  if (hasAdvantage || hasDisadvantage) {
    // Roll twice
    const roll1 = rollMultiple(formula.count, formula.sides, random);
    const roll2 = rollMultiple(formula.count, formula.sides, random);

    const total1 = roll1.reduce((sum, val) => sum + val, 0);
    const total2 = roll2.reduce((sum, val) => sum + val, 0);

    if (hasAdvantage) {
      if (total1 >= total2) {
        individual = roll1;
        discarded = roll2;
      } else {
        individual = roll2;
        discarded = roll1;
      }
    } else {
      // Disadvantage
      if (total1 <= total2) {
        individual = roll1;
        discarded = roll2;
      } else {
        individual = roll2;
        discarded = roll1;
      }
    }
  } else {
    // Normal roll
    individual = rollMultiple(formula.count, formula.sides, random);
  }

  const sum = individual.reduce((acc, val) => acc + val, 0);
  const total = sum + formula.modifier;

  return {
    id: generateId(),
    formula: formulaString,
    individual,
    modifier: formula.modifier,
    total,
    advantage: hasAdvantage || undefined,
    disadvantage: hasDisadvantage || undefined,
    seeded: seeded || undefined,
    seed: seeded ? seed : undefined,
    timestamp: new Date().toISOString(),
    discarded,
  };
}

/**
 * Generate a simple unique ID
 */
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Format roll result for display
 */
export function formatRollResult(result: RollResult): string {
  const parts: string[] = [];

  if (result.advantage) parts.push('(Adv)');
  if (result.disadvantage) parts.push('(Dis)');
  if (result.seeded) parts.push('(Seeded)');

  parts.push(result.formula);
  parts.push('→');

  if (result.individual.length > 1) {
    parts.push(`[${result.individual.join(',')}]`);
    if (result.modifier !== 0) {
      parts.push(result.modifier > 0 ? `+${result.modifier}` : `${result.modifier}`);
    }
    parts.push('=');
  }

  parts.push(result.total.toString());

  if (result.discarded && result.discarded.length > 0) {
    parts.push(`(discarded: [${result.discarded.join(',')}])`);
  }

  return parts.join(' ');
}

/**
 * Format timestamp for display
 */
export function formatTimestamp(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

/**
 * LocalStorage keys
 */
export const STORAGE_KEYS = {
  HISTORY: 'CA_DICE_HISTORY',
  SEEDED: 'CA_DICE_SEEDED',
} as const;

/**
 * Load history from localStorage
 */
export function loadHistory(): RollResult[] {
  if (typeof window === 'undefined') return [];
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.HISTORY);
    if (!stored) return [];
    return JSON.parse(stored);
  } catch {
    return [];
  }
}

/**
 * Save history to localStorage (max 10 items)
 */
export function saveHistory(history: RollResult[]): void {
  if (typeof window === 'undefined') return;
  try {
    const capped = history.slice(0, 10);
    localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(capped));
  } catch (error) {
    console.error('Failed to save dice history:', error);
  }
}

/**
 * Load seeded preference from localStorage
 */
export function loadSeededPreference(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.SEEDED);
    return stored === 'true';
  } catch {
    return false;
  }
}

/**
 * Save seeded preference to localStorage
 */
export function saveSeededPreference(seeded: boolean): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEYS.SEEDED, seeded.toString());
  } catch (error) {
    console.error('Failed to save seeded preference:', error);
  }
}
