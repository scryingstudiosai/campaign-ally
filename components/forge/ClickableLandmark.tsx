'use client';

import { Sparkles } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useState } from 'react';

interface ClickableLandmarkProps {
  name: string;
  sourceDescription?: string;
  sourceMemoryId?: string;
  contextKey?: string;
  parentName?: string;
  onOpenForge: (forgeName: string, landmarkName: string, sourceContext?: {
    description?: string;
    sourceMemoryId?: string;
    contextKey?: string;
    parentName?: string;
  }) => void;
}

export function ClickableLandmark({ name, sourceDescription, sourceMemoryId, contextKey, parentName, onOpenForge }: ClickableLandmarkProps) {
  const [isShimmering, setIsShimmering] = useState(false);

  const determineForge = (landmarkName: string): string => {
    const lower = landmarkName.toLowerCase();

    if (lower.includes('tavern')) return 'tavern';
    if (lower.includes('inn')) return 'inn';

    const shopKeywords = ['shop', 'store', 'blacksmith', 'armorer', 'alchemist', 'apothecary', 'market'];
    if (shopKeywords.some(keyword => lower.includes(keyword))) return 'shop';

    const guildKeywords = ['guild', 'hall', 'chapter'];
    if (guildKeywords.some(keyword => lower.includes(keyword))) return 'guild';

    return 'landmark';
  };

  const handleClick = () => {
    setIsShimmering(true);
    setTimeout(() => setIsShimmering(false), 1000);

    const forgeType = determineForge(name);
    const sourceContext = {
      description: sourceDescription,
      sourceMemoryId,
      contextKey,
      parentName,
    };
    onOpenForge(forgeType, name, sourceContext);
  };

  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={handleClick}
            className={`
              relative inline-flex items-center gap-1
              text-amber-400 hover:text-amber-300
              transition-all duration-300
              cursor-pointer group
              ${isShimmering ? 'animate-pulse' : ''}
            `}
            style={{
              textShadow: '0 0 10px rgba(251, 191, 36, 0.5)',
            }}
          >
            <span className="relative">
              {name}
              <span
                className={`
                  absolute inset-0
                  bg-gradient-to-r from-transparent via-amber-400 to-transparent
                  opacity-0 group-hover:opacity-30
                  transition-opacity duration-500
                  ${isShimmering ? 'animate-shimmer' : ''}
                `}
                style={{
                  backgroundSize: '200% 100%',
                  animation: isShimmering ? 'shimmer 0.8s ease-in-out' : undefined,
                }}
              />
            </span>
            <Sparkles className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          </button>
        </TooltipTrigger>
        <TooltipContent
          side="top"
          className="bg-background/95 backdrop-blur-sm border-amber-500/30 text-amber-300"
        >
          <div className="flex items-center gap-1.5">
            <Sparkles className="w-3 h-3" />
            <span className="text-xs font-medium">Open Forge</span>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
