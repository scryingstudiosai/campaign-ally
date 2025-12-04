import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export interface DetectedEntity {
  text: string;
  name: string;
  type: 'NPC' | 'Location' | 'Item' | 'Organization';
  forgeType?: string;
  landmarkType?: string;
  startIndex: number;
  endIndex: number;
  existsInMemory: boolean;
  memoryId: string | null;
  memoryType: string | null;
}

const NPC_PATTERNS = [
  {
    regex: /\b([A-Z][a-z]+)\s+the\s+(guard|herbalist|blacksmith|merchant|innkeeper|captain|leader|master|wizard|priest|healer|scholar|hunter|farmer|baker|brewer|tailor|cobbler|smith|scribe|mage|warrior|thief|assassin|bard|ranger|monk|paladin|cleric|druid|warlock|sorcerer|rogue|fighter|barbarian|artificer)\b/gi,
    nameExtractor: (match: RegExpExecArray) => match[1],
    forgeType: 'hero',
  },
  {
    regex: /\b(Captain|Lord|Lady|Sir|Princess|Prince|King|Queen|Baron|Dame|Master|Doctor)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\b/g,
    nameExtractor: (match: RegExpExecArray) => `${match[1]} ${match[2]}`,
    forgeType: 'hero',
  },
];

// Inn-specific patterns
const INN_PATTERNS = [
  {
    regex: /\b(?:the\s+)?([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\s+Inn\b/gi,
    nameExtractor: (match: RegExpExecArray) => `${match[1]} Inn`,
    forgeType: 'inn',
  },
];

// Tavern patterns (use panic API for quick generation)
const TAVERN_PATTERNS = [
  {
    regex: /\b(?:the\s+)?([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\s+Tavern\b/gi,
    nameExtractor: (match: RegExpExecArray) => `${match[1]} Tavern`,
    forgeType: 'tavern',
  },
];

// Landmark-specific patterns with subtypes
const LANDMARK_PATTERNS = [
  {
    regex: /\b(?:the\s+)?([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\s+(Library|Archives)\b/gi,
    nameExtractor: (match: RegExpExecArray) => `${match[1]} ${match[2]}`,
    forgeType: 'landmark',
    landmarkType: 'Library',
  },
  {
    regex: /\b(?:the\s+)?([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\s+(Temple|Shrine|Cathedral|Chapel)\b/gi,
    nameExtractor: (match: RegExpExecArray) => `${match[1]} ${match[2]}`,
    forgeType: 'landmark',
    landmarkType: 'Temple',
  },
  {
    regex: /\b(?:the\s+)?([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\s+(Pier|Dock|Harbor|Wharf)\b/gi,
    nameExtractor: (match: RegExpExecArray) => `${match[1]} ${match[2]}`,
    forgeType: 'landmark',
    landmarkType: 'Pier',
  },
  {
    regex: /\b(?:the\s+)?([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\s+(Market|Plaza|Square|Bazaar)\b/gi,
    nameExtractor: (match: RegExpExecArray) => `${match[1]} ${match[2]}`,
    forgeType: 'landmark',
    landmarkType: 'Market',
  },
  {
    regex: /\b(?:the\s+)?([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\s+Guild\s+Hall\b/gi,
    nameExtractor: (match: RegExpExecArray) => `${match[1]} Guild Hall`,
    forgeType: 'landmark',
    landmarkType: 'Guild Hall',
  },
  {
    regex: /\b(?:the\s+)?([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\s+(Council\s+Chambers?|Chambers?)\b/gi,
    nameExtractor: (match: RegExpExecArray) => `${match[1]} ${match[2]}`,
    forgeType: 'landmark',
    landmarkType: 'Council Chambers',
  },
  {
    regex: /\b(?:the\s+)?([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\s+(Keep|Castle|Fortress|Citadel)\b/gi,
    nameExtractor: (match: RegExpExecArray) => `${match[1]} ${match[2]}`,
    forgeType: 'landmark',
    landmarkType: 'Keep',
  },
  {
    regex: /\b(?:the\s+)?([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\s+(Arena|Colosseum|Amphitheater)\b/gi,
    nameExtractor: (match: RegExpExecArray) => `${match[1]} ${match[2]}`,
    forgeType: 'landmark',
    landmarkType: 'Arena',
  },
  {
    regex: /\b(?:the\s+)?([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\s+(Cemetery|Graveyard|Crypt|Mausoleum)\b/gi,
    nameExtractor: (match: RegExpExecArray) => `${match[1]} ${match[2]}`,
    forgeType: 'landmark',
    landmarkType: 'Cemetery',
  },
  {
    regex: /\b(?:the\s+)?([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\s+(Barracks|Armory|Garrison)\b/gi,
    nameExtractor: (match: RegExpExecArray) => `${match[1]} ${match[2]}`,
    forgeType: 'landmark',
    landmarkType: 'Barracks',
  },
  {
    regex: /\b(?:the\s+)?([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\s+(Theater|Theatre|Playhouse|Opera\s+House)\b/gi,
    nameExtractor: (match: RegExpExecArray) => `${match[1]} ${match[2]}`,
    forgeType: 'landmark',
    landmarkType: 'Theater',
  },
  {
    regex: /\b(?:the\s+)?([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\s+Tower\b/gi,
    nameExtractor: (match: RegExpExecArray) => `${match[1]} Tower`,
    forgeType: 'landmark',
    landmarkType: 'Tower',
  },
];

// Shop patterns
const SHOP_PATTERNS = [
  {
    regex: /\b(?:the\s+)?([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\s+Shop\b/gi,
    nameExtractor: (match: RegExpExecArray) => `${match[1]} Shop`,
    forgeType: 'shop',
  },
];

// Generic location patterns (for other locations not covered above)
const GENERIC_LOCATION_PATTERNS = [
  {
    regex: /\b(?:the\s+)?([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\s+(Guild|Hall|Street|District|Quarter|Ward|Alley)\b/gi,
    nameExtractor: (match: RegExpExecArray) => `${match[1]} ${match[2]}`,
    forgeType: 'town',
  },
];

const ITEM_PATTERNS = [
  {
    regex: /\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\s+(Specs|Blade|Sword|Mirror|Prism|Glass|Amulet|Ring|Staff|Wand|Orb|Tome|Scroll|Potion|Shield|Armor|Bow|Dagger|Hammer|Spear)\b/gi,
    nameExtractor: (match: RegExpExecArray) => `${match[1]} ${match[2]}`,
    forgeType: 'item',
  },
];

const ORGANIZATION_PATTERNS = [
  {
    regex: /\bthe\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\s+(Guild|Council|Order|Brotherhood|Sisterhood|Society|Cult|Faction|Alliance|Clan|Tribe)\b/gi,
    nameExtractor: (match: RegExpExecArray) => `${match[1]} ${match[2]}`,
    forgeType: 'guild',
  },
];

async function checkMemoryStatus(
  entity: Omit<DetectedEntity, 'existsInMemory' | 'memoryId' | 'memoryType'>,
  campaignId: string
): Promise<DetectedEntity> {
  try {
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data, error } = await supabase
      .from('memory_chunks')
      .select('id, title, type')
      .eq('campaign_id', campaignId)
      .ilike('title', entity.name)
      .maybeSingle();

    if (error) {
      console.error('Error checking memory status:', error);
      return {
        ...entity,
        existsInMemory: false,
        memoryId: null,
        memoryType: null,
      };
    }

    return {
      ...entity,
      existsInMemory: !!data,
      memoryId: data?.id || null,
      memoryType: data?.type || null,
    };
  } catch (error) {
    console.error('Exception in checkMemoryStatus:', error);
    return {
      ...entity,
      existsInMemory: false,
      memoryId: null,
      memoryType: null,
    };
  }
}

function detectEntitiesWithPattern(
  content: string,
  patterns: Array<{
    regex: RegExp;
    nameExtractor: (match: RegExpExecArray) => string;
    forgeType?: string;
    landmarkType?: string;
  }>,
  type: 'NPC' | 'Location' | 'Item' | 'Organization'
): Array<Omit<DetectedEntity, 'existsInMemory' | 'memoryId' | 'memoryType'>> {
  const entities: Array<Omit<DetectedEntity, 'existsInMemory' | 'memoryId' | 'memoryType'>> = [];

  patterns.forEach(({ regex, nameExtractor, forgeType, landmarkType }) => {
    const regexCopy = new RegExp(regex.source, regex.flags);
    let match;

    while ((match = regexCopy.exec(content)) !== null) {
      const text = match[0];
      const name = nameExtractor(match);
      const startIndex = match.index;
      const endIndex = match.index + text.length;

      entities.push({
        text,
        name,
        type,
        forgeType,
        landmarkType,
        startIndex,
        endIndex,
      });
    }
  });

  return entities;
}

function detectListLocations(
  content: string
): Array<Omit<DetectedEntity, 'existsInMemory' | 'memoryId' | 'memoryType'>> {
  const entities: Array<Omit<DetectedEntity, 'existsInMemory' | 'memoryId' | 'memoryType'>> = [];
  const listLocationPattern = /^[\s•\-*]*([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,3})[\s]*$/gm;
  const skipWords = ['Using', 'Secret', 'Role', 'Quirk', 'Location', 'Notable', 'Landmarks', 'Government', 'Atmosphere', 'Problem'];

  let match;
  while ((match = listLocationPattern.exec(content)) !== null) {
    const text = match[1];
    const shouldSkip = skipWords.some(word => text.includes(word));

    if (!shouldSkip) {
      entities.push({
        text,
        name: text,
        type: 'Location',
        forgeType: 'town',
        startIndex: match.index + match[0].indexOf(text),
        endIndex: match.index + match[0].indexOf(text) + text.length,
      });
    }
  }

  return entities;
}

function detectStructuredLandmarks(
  content: string
): Array<Omit<DetectedEntity, 'existsInMemory' | 'memoryId' | 'memoryType'>> {
  const entities: Array<Omit<DetectedEntity, 'existsInMemory' | 'memoryId' | 'memoryType'>> = [];

  const landmarkSectionRegex = /Landmarks?[:\s]*([\s\S]*?)(?=\n[A-Z][^:\n]*:|$)/gi;
  let sectionMatch;

  while ((sectionMatch = landmarkSectionRegex.exec(content)) !== null) {
    const sectionText = sectionMatch[1];
    const sectionStart = sectionMatch.index + sectionMatch[0].indexOf(sectionMatch[1]);

    const bulletPattern = /(?:•|\*|\-)\s*((?:The\s+)?[A-Z][^,\n]+?)(?=\s*,)/g;
    let bulletMatch;

    while ((bulletMatch = bulletPattern.exec(sectionText)) !== null) {
      const landmarkName = bulletMatch[1].trim();
      const absoluteStart = sectionStart + bulletMatch.index + bulletMatch[0].indexOf(landmarkName);

      entities.push({
        text: landmarkName,
        name: landmarkName,
        type: 'Location',
        forgeType: 'landmark',
        startIndex: absoluteStart,
        endIndex: absoluteStart + landmarkName.length,
      });
    }
  }

  return entities;
}

function deduplicateEntities(
  entities: Array<Omit<DetectedEntity, 'existsInMemory' | 'memoryId' | 'memoryType'>>
): Array<Omit<DetectedEntity, 'existsInMemory' | 'memoryId' | 'memoryType'>> {
  const seenPositions = new Set<string>();
  const seenNames = new Map<string, boolean>();
  const deduplicated: Array<Omit<DetectedEntity, 'existsInMemory' | 'memoryId' | 'memoryType'>> = [];

  entities.forEach((entity) => {
    const positionKey = `${entity.startIndex}-${entity.endIndex}`;
    const nameKey = entity.name.toLowerCase();

    if (seenPositions.has(positionKey)) {
      return;
    }

    if (seenNames.has(nameKey)) {
      return;
    }

    seenPositions.add(positionKey);
    seenNames.set(nameKey, true);
    deduplicated.push(entity);
  });

  return deduplicated;
}

export async function enrichForgeContent(
  content: string,
  campaignId: string
): Promise<DetectedEntity[]> {
  try {
    if (!content || !campaignId) {
      return [];
    }

    const allEntities: Array<Omit<DetectedEntity, 'existsInMemory' | 'memoryId' | 'memoryType'>> = [];

    // Detect entities in priority order (most specific first)
    allEntities.push(...detectEntitiesWithPattern(content, NPC_PATTERNS, 'NPC'));
    allEntities.push(...detectEntitiesWithPattern(content, INN_PATTERNS, 'Location'));
    allEntities.push(...detectEntitiesWithPattern(content, TAVERN_PATTERNS, 'Location'));
    allEntities.push(...detectEntitiesWithPattern(content, LANDMARK_PATTERNS, 'Location'));
    allEntities.push(...detectStructuredLandmarks(content));
    allEntities.push(...detectEntitiesWithPattern(content, SHOP_PATTERNS, 'Location'));
    allEntities.push(...detectEntitiesWithPattern(content, GENERIC_LOCATION_PATTERNS, 'Location'));
    allEntities.push(...detectListLocations(content));
    allEntities.push(...detectEntitiesWithPattern(content, ITEM_PATTERNS, 'Item'));
    allEntities.push(...detectEntitiesWithPattern(content, ORGANIZATION_PATTERNS, 'Organization'));

    const deduplicated = deduplicateEntities(allEntities);

    const enrichedEntities = await Promise.all(
      deduplicated.map((entity) => checkMemoryStatus(entity, campaignId))
    );

    return enrichedEntities;
  } catch (error) {
    console.error('Error in enrichForgeContent:', error);
    return [];
  }
}
