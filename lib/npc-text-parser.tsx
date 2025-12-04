import { ReactNode } from 'react';
import { ClickablePersonName } from '@/components/forge/ClickablePersonName';

export function parseNPCNames(
  text: string,
  onGenerateNPC: (name: string, context?: string) => Promise<void>
): ReactNode[] {
  const namePattern = /\*\*([A-Z][a-z]+(?: [A-Z][a-z]+)*)\*\*/g;

  const parts: ReactNode[] = [];
  let lastIndex = 0;
  let match;
  let key = 0;

  while ((match = namePattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.substring(lastIndex, match.index));
    }

    const name = match[1];
    parts.push(
      <ClickablePersonName
        key={`npc-${key++}`}
        name={name}
        onGenerateNPC={onGenerateNPC}
      />
    );

    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    parts.push(text.substring(lastIndex));
  }

  return parts.length > 0 ? parts : [text];
}

export function hasNPCNames(text: string): boolean {
  const namePattern = /\*\*([A-Z][a-z]+(?: [A-Z][a-z]+)*)\*\*/;
  return namePattern.test(text);
}
