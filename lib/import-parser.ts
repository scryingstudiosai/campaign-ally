import mammoth from 'mammoth';

export interface ParsedSection {
  title: string;
  content: string;
}

export async function parseTextFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      resolve(text);
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsText(file);
  });
}

export async function parseDocxFile(file: File): Promise<string> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer });
    return result.value;
  } catch (error) {
    throw new Error('Failed to parse DOCX file');
  }
}

export function extractHeadings(text: string): ParsedSection[] {
  const sections: ParsedSection[] = [];
  const lines = text.split('\n');
  let currentSection: ParsedSection = { title: '', content: '' };
  const contentLines: string[] = [];

  for (const line of lines) {
    const headingMatch = line.match(/^(#{1,2})\s+(.+)$/);

    if (headingMatch) {
      if (currentSection.title || contentLines.length > 0) {
        currentSection.content = contentLines.join('\n').trim();
        if (currentSection.title || currentSection.content) {
          sections.push({ ...currentSection });
        }
        contentLines.length = 0;
      }
      currentSection = {
        title: headingMatch[2].trim(),
        content: ''
      };
    } else if (currentSection.title) {
      contentLines.push(line);
    } else if (line.trim()) {
      contentLines.push(line);
    }
  }

  if (currentSection.title || contentLines.length > 0) {
    currentSection.content = contentLines.join('\n').trim();
    if (currentSection.title || currentSection.content) {
      sections.push(currentSection);
    }
  }

  if (sections.length === 0 && text.trim()) {
    sections.push({
      title: 'Imported Content',
      content: text.trim()
    });
  }

  return sections;
}

export function splitByParagraphs(text: string): ParsedSection[] {
  const paragraphs = text
    .split(/\n\s*\n/)
    .map(p => p.trim())
    .filter(p => p.length > 0);

  return paragraphs.map((paragraph, index) => {
    const lines = paragraph.split('\n');
    const firstLine = lines[0].trim();

    let title = firstLine.substring(0, 50);
    if (firstLine.length > 50) {
      title += '...';
    }

    if (!title) {
      title = `Section ${index + 1}`;
    }

    return {
      title,
      content: paragraph
    };
  });
}

export function createSingleEntry(text: string, sourceName: string): ParsedSection {
  const cleanSourceName = sourceName.replace(/\.[^/.]+$/, '');

  return {
    title: cleanSourceName || 'Imported Content',
    content: text.trim()
  };
}

export function detectEntityType(title: string, content: string): string {
  const titleLower = title.toLowerCase();
  const contentLower = content.toLowerCase();
  const combined = `${titleLower} ${contentLower}`;

  const typePatterns = [
    { type: 'NPC', keywords: ['character', 'npc', 'villain', 'hero', 'person', 'merchant', 'guard', 'captain', 'lord', 'lady'] },
    { type: 'Location', keywords: ['location', 'place', 'town', 'city', 'village', 'dungeon', 'castle', 'temple', 'tavern', 'inn'] },
    { type: 'Monster', keywords: ['monster', 'creature', 'beast', 'dragon', 'goblin', 'orc', 'undead', 'demon'] },
    { type: 'Item', keywords: ['item', 'weapon', 'armor', 'artifact', 'treasure', 'sword', 'shield', 'potion', 'ring'] },
    { type: 'Quest', keywords: ['quest', 'mission', 'task', 'objective', 'goal', 'adventure', 'journey'] },
  ];

  for (const pattern of typePatterns) {
    for (const keyword of pattern.keywords) {
      if (combined.includes(keyword)) {
        return pattern.type;
      }
    }
  }

  return 'Imported Notes';
}

export function validateFile(file: File): { valid: boolean; error?: string } {
  const maxSize = 10 * 1024 * 1024;
  const allowedTypes = ['.txt', '.md', '.docx'];

  if (file.size > maxSize) {
    return {
      valid: false,
      error: 'File exceeds 10MB limit. Please split into smaller files or paste text directly.'
    };
  }

  const extension = '.' + file.name.split('.').pop()?.toLowerCase();
  if (!allowedTypes.includes(extension)) {
    return {
      valid: false,
      error: 'Unsupported file type. Please use .txt, .md, or .docx files.'
    };
  }

  return { valid: true };
}

export async function extractTextFromFile(file: File): Promise<string> {
  const extension = file.name.split('.').pop()?.toLowerCase();

  try {
    switch (extension) {
      case 'txt':
      case 'md':
        return await parseTextFile(file);
      case 'docx':
        return await parseDocxFile(file);
      default:
        throw new Error('Unsupported file format');
    }
  } catch (error) {
    throw new Error(
      error instanceof Error
        ? error.message
        : 'Unable to read file. File may be corrupted or in an unsupported format.'
    );
  }
}
