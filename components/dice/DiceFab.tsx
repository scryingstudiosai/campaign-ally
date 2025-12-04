'use client';

import React from 'react';
import { useDiceRoller } from '@/contexts/DiceRollerContext';
import { Button } from '@/components/ui/button';
import { Dices } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

export function DiceFab() {
  const { open } = useDiceRoller();

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            onClick={open}
            size="lg"
            className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg hover:shadow-xl transition-all z-50"
            aria-label="Open Dice Roller"
          >
            <Dices className="h-6 w-6" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="left">
          Roll Dice (Ctrl+R)
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
