'use client';

import { Sparkles } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useState } from 'react';

interface ClickablePersonNameProps {
  name: string;
  context?: string;
  contextKey?: string;
  sourceMemoryId?: string;
  sourceDescription?: string;
  locationName?: string;
  parentName?: string;
  onGenerateNPC: (name: string, context?: string, contextKey?: string, sourceMemoryId?: string, sourceDescription?: string, locationName?: string, parentName?: string) => Promise<void>;
}

export function ClickablePersonName({ name, context, contextKey, sourceMemoryId, sourceDescription, locationName, parentName, onGenerateNPC }: ClickablePersonNameProps) {
  const [isShimmering, setIsShimmering] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  const handleClick = async () => {
    if (isGenerating) return;

    setIsShimmering(true);
    setIsGenerating(true);
    setTimeout(() => setIsShimmering(false), 1000);

    try {
      await onGenerateNPC(name, context, contextKey, sourceMemoryId, sourceDescription, locationName, parentName);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={handleClick}
            disabled={isGenerating}
            className={`
              relative inline-flex items-center gap-1
              text-cyan-400 hover:text-cyan-300
              transition-all duration-300
              cursor-pointer group
              ${isShimmering ? 'animate-pulse' : ''}
              ${isGenerating ? 'opacity-50 cursor-wait' : ''}
            `}
            style={{
              textShadow: '0 0 10px rgba(34, 211, 238, 0.5)',
            }}
          >
            <span className="relative">
              {name}
              <span
                className={`
                  absolute inset-0
                  bg-gradient-to-r from-transparent via-cyan-400 to-transparent
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
          className="bg-background/95 backdrop-blur-sm border-cyan-500/30 text-cyan-300"
        >
          <div className="flex items-center gap-1.5">
            <Sparkles className="w-3 h-3" />
            <span className="text-xs font-medium">Conjure NPC Card</span>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
