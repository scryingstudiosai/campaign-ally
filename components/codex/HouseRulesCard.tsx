'use client';

import { CodexCard } from './CodexCard';

interface HouseRulesCardProps {
  houseRules: string;
  onSave: (houseRules: string) => Promise<void>;
  onAISuggest?: (onApply: (value: string) => void) => Promise<void>;
  id?: string;
}

export function HouseRulesCard({ houseRules, onSave, onAISuggest, id }: HouseRulesCardProps) {
  return (
    <CodexCard
      id={id}
      title="House Rules"
      description="Custom rules and modifications for your campaign"
      value={houseRules}
      onSave={onSave}
      onAISuggest={onAISuggest}
      multiline
      placeholder="e.g., Flanking grants advantage, critical hits double all damage dice..."
    />
  );
}
