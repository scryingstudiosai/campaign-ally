'use client';

import { useState } from 'react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

export type LootRarity = 'gold' | 'common' | 'uncommon' | 'rare' | 'very-rare' | 'wondrous' | 'legendary' | 'artifact';

interface RaritySliderProps {
  value: LootRarity;
  onChange: (rarity: LootRarity) => void;
}

const rarities: Array<{
  id: LootRarity;
  label: string;
  color: string;
  glow: string;
  flavorText: string;
}> = [
  {
    id: 'gold',
    label: 'Gold',
    color: '#FFD700',
    glow: 'shadow-[0_0_20px_rgba(255,215,0,0.6)]',
    flavorText: 'Simple coin, the merchant\'s friend',
  },
  {
    id: 'common',
    label: 'Common',
    color: '#9CA3AF',
    glow: 'shadow-[0_0_20px_rgba(156,163,175,0.4)]',
    flavorText: 'Mundane yet useful wares',
  },
  {
    id: 'uncommon',
    label: 'Uncommon',
    color: '#10B981',
    glow: 'shadow-[0_0_20px_rgba(16,185,129,0.5)]',
    flavorText: 'Touched by minor enchantments',
  },
  {
    id: 'rare',
    label: 'Rare',
    color: '#3B82F6',
    glow: 'shadow-[0_0_20px_rgba(59,130,246,0.6)]',
    flavorText: 'Crafted with masterful skill',
  },
  {
    id: 'very-rare',
    label: 'Very Rare',
    color: '#A855F7',
    glow: 'shadow-[0_0_20px_rgba(168,85,247,0.6)]',
    flavorText: 'Imbued with powerful magic',
  },
  {
    id: 'wondrous',
    label: 'Wondrous',
    color: '#EC4899',
    glow: 'shadow-[0_0_20px_rgba(236,72,153,0.7)]',
    flavorText: 'Marvels that defy explanation',
  },
  {
    id: 'legendary',
    label: 'Legendary',
    color: '#F97316',
    glow: 'shadow-[0_0_20px_rgba(249,115,22,0.7)]',
    flavorText: 'Sung of in ancient tales',
  },
  {
    id: 'artifact',
    label: 'Artifact',
    color: '#FFFFFF',
    glow: 'shadow-[0_0_25px_rgba(255,255,255,0.8)]',
    flavorText: 'Forged by forgotten gods',
  },
];

export function RaritySlider({ value, onChange }: RaritySliderProps) {
  const [hoveredRarity, setHoveredRarity] = useState<LootRarity | null>(null);
  const [showWhisper, setShowWhisper] = useState(false);
  const currentIndex = rarities.findIndex((r) => r.id === value);

  const handleRarityClick = (rarity: LootRarity) => {
    const newIndex = rarities.findIndex((r) => r.id === rarity);
    if (newIndex > currentIndex) {
      setShowWhisper(true);
      setTimeout(() => setShowWhisper(false), 2000);
    }
    onChange(rarity);
  };

  return (
    <div className="space-y-4">
      <div className="relative">
        <div className="flex items-center justify-between gap-2 py-6 px-2">
          {rarities.map((rarity, index) => {
            const isActive = rarity.id === value;
            const isHovered = rarity.id === hoveredRarity;
            const isPastActive = index <= currentIndex;

            return (
              <TooltipProvider key={rarity.id} delayDuration={0}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      onClick={() => handleRarityClick(rarity.id)}
                      onMouseEnter={() => setHoveredRarity(rarity.id)}
                      onMouseLeave={() => setHoveredRarity(null)}
                      className="relative flex flex-col items-center gap-2 group transition-transform hover:scale-110"
                    >
                      <div
                        className={`w-8 h-8 rounded-full border-2 transition-all duration-300 ${
                          isActive
                            ? `${rarity.glow} scale-125 border-opacity-100`
                            : isHovered
                            ? 'scale-110 border-opacity-60'
                            : isPastActive
                            ? 'border-opacity-40'
                            : 'border-opacity-20'
                        }`}
                        style={{
                          borderColor: rarity.color,
                          backgroundColor: isActive || isHovered ? `${rarity.color}40` : `${rarity.color}10`,
                        }}
                      >
                        <div
                          className={`w-full h-full rounded-full transition-all duration-300 ${
                            isActive ? 'animate-pulse' : ''
                          }`}
                          style={{
                            background: `radial-gradient(circle at 30% 30%, ${rarity.color}80, ${rarity.color}20)`,
                          }}
                        />
                      </div>
                      <span
                        className={`text-xs font-medium transition-all duration-300 ${
                          isActive
                            ? 'opacity-100 scale-110'
                            : isHovered
                            ? 'opacity-80'
                            : isPastActive
                            ? 'opacity-60'
                            : 'opacity-40'
                        }`}
                        style={{
                          color: isActive ? rarity.color : undefined,
                        }}
                      >
                        {rarity.label}
                      </span>
                    </button>
                  </TooltipTrigger>
                  <TooltipContent
                    side="top"
                    className="bg-background/95 backdrop-blur-sm border-primary/20"
                  >
                    <p className="font-semibold" style={{ color: rarity.color }}>
                      {rarity.label}
                    </p>
                    <p className="text-xs text-muted-foreground italic mt-1">{rarity.flavorText}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            );
          })}
        </div>

        <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-gradient-to-r from-border/20 via-border/40 to-border/20 -translate-y-1/2 -z-10" />
      </div>

      {showWhisper && (
        <div className="text-center animate-fade-in">
          <p className="text-sm text-primary/80 italic">
            The weave shimmers as greater treasures come into reach…
          </p>
        </div>
      )}
    </div>
  );
}
