export const XP_THRESHOLDS_BY_LEVEL: Record<number, { easy: number; medium: number; hard: number; deadly: number }> = {
  1: { easy: 25, medium: 50, hard: 75, deadly: 100 },
  2: { easy: 50, medium: 100, hard: 150, deadly: 200 },
  3: { easy: 75, medium: 150, hard: 225, deadly: 400 },
  4: { easy: 125, medium: 250, hard: 375, deadly: 500 },
  5: { easy: 250, medium: 500, hard: 750, deadly: 1100 },
  6: { easy: 300, medium: 600, hard: 900, deadly: 1400 },
  7: { easy: 350, medium: 750, hard: 1100, deadly: 1700 },
  8: { easy: 450, medium: 900, hard: 1400, deadly: 2100 },
  9: { easy: 550, medium: 1100, hard: 1600, deadly: 2400 },
  10: { easy: 600, medium: 1200, hard: 1900, deadly: 2800 },
  11: { easy: 800, medium: 1600, hard: 2400, deadly: 3600 },
  12: { easy: 1000, medium: 2000, hard: 3000, deadly: 4500 },
  13: { easy: 1100, medium: 2200, hard: 3400, deadly: 5100 },
  14: { easy: 1250, medium: 2500, hard: 3800, deadly: 5700 },
  15: { easy: 1400, medium: 2800, hard: 4300, deadly: 6400 },
  16: { easy: 1600, medium: 3200, hard: 4800, deadly: 7200 },
  17: { easy: 2000, medium: 3900, hard: 5900, deadly: 8800 },
  18: { easy: 2100, medium: 4200, hard: 6300, deadly: 9500 },
  19: { easy: 2400, medium: 4900, hard: 7300, deadly: 10900 },
  20: { easy: 2800, medium: 5700, hard: 8500, deadly: 12700 }
};

export const XP_BY_CR: Record<string | number, number> = {
  0: 10,
  '1/8': 25,
  '1/4': 50,
  '1/2': 100,
  1: 200,
  2: 450,
  3: 700,
  4: 1100,
  5: 1800,
  6: 2300,
  7: 2900,
  8: 3900,
  9: 5000,
  10: 5900,
  11: 7200,
  12: 8400,
  13: 10000,
  14: 11500,
  15: 13000,
  16: 15000,
  17: 18000,
  18: 20000,
  19: 22000,
  20: 25000,
  21: 33000,
  22: 41000,
  23: 50000,
  24: 62000,
  25: 75000,
  26: 90000,
  27: 105000,
  28: 120000,
  29: 135000,
  30: 155000
};

export function getEncounterMultiplier(monsterCount: number): number {
  if (monsterCount === 1) return 1;
  if (monsterCount === 2) return 1.5;
  if (monsterCount <= 6) return 2;
  if (monsterCount <= 10) return 2.5;
  if (monsterCount <= 14) return 3;
  return 4;
}

export interface EncounterDifficulty {
  difficulty: 'trivial' | 'easy' | 'medium' | 'hard' | 'deadly';
  actualXP: number;
  rawXP: number;
  partyBudget: {
    easy: number;
    medium: number;
    hard: number;
    deadly: number;
  };
  multiplier: number;
  monsterCount: number;
}

export function calculateDifficulty(
  partySize: number,
  partyLevel: number,
  monsters: Array<{ cr: string | number; quantity: number }>
): EncounterDifficulty {
  const threshold = XP_THRESHOLDS_BY_LEVEL[partyLevel];

  const partyBudget = {
    easy: threshold.easy * partySize,
    medium: threshold.medium * partySize,
    hard: threshold.hard * partySize,
    deadly: threshold.deadly * partySize
  };

  const totalMonsterXP = monsters.reduce((sum, m) => {
    const monsterXP = XP_BY_CR[m.cr] || 0;
    return sum + (monsterXP * m.quantity);
  }, 0);

  const totalMonsters = monsters.reduce((sum, m) => sum + m.quantity, 0);

  const multiplier = getEncounterMultiplier(totalMonsters);
  const adjustedXP = Math.floor(totalMonsterXP * multiplier);

  let difficulty: 'trivial' | 'easy' | 'medium' | 'hard' | 'deadly';
  if (adjustedXP < partyBudget.easy) {
    difficulty = 'trivial';
  } else if (adjustedXP < partyBudget.medium) {
    difficulty = 'easy';
  } else if (adjustedXP < partyBudget.hard) {
    difficulty = 'medium';
  } else if (adjustedXP < partyBudget.deadly) {
    difficulty = 'hard';
  } else {
    difficulty = 'deadly';
  }

  return {
    difficulty,
    actualXP: adjustedXP,
    rawXP: totalMonsterXP,
    partyBudget,
    multiplier,
    monsterCount: totalMonsters
  };
}

export function formatEncounterAsMarkdown(encounter: any): string {
  return `# ${encounter.name}

**Difficulty:** ${encounter.difficulty.toUpperCase()}
**Party:** ${encounter.partySize} × Level ${encounter.partyLevel}
**XP:** ${encounter.actualXP} (${encounter.rawXP} base × ${encounter.multiplier})

## Overview
${encounter.overview || encounter.setup}

## Tactical Setup
${encounter.positioning || 'See combat phases for positioning details'}

## Monsters
${encounter.monsters?.map((m: any) => `
### ${m.name} × ${m.quantity || 1}
**AC** ${m.ac} | **HP** ${m.hp} | **Speed** ${m.speed}ft | **CR** ${m.cr}

**Abilities:**
${m.abilities?.map((a: any) => `- ${a.name}: ${a.description}`).join('\n') || 'See full stat block'}

**Tactics:**
${m.tactics || 'Standard combat tactics'}
`).join('\n---\n') || 'No monster details available'}

## Combat Phases
${encounter.beats?.map((b: any, i: number) => `
### Phase ${i + 1}: ${b.trigger}
**Challenge:** ${b.challenge}
${b.dc ? `**DC:** ${b.dc}` : ''}
${b.enemies?.length ? `**Enemies:** ${b.enemies.join(', ')}` : ''}

**Success:** ${b.success}
**Failure:** ${b.failure}
`).join('\n') || 'Single phase encounter'}

## DM Notes
${encounter.dmNotes || encounter.flair || 'Run this encounter as written, adjusting difficulty as needed.'}
  `.trim();
}
