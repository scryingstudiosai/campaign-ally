'use client';

import React from 'react';
import { useDiceRoller } from '@/contexts/DiceRollerContext';
import { Button } from '@/components/ui/button';
import { Dices } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

export function DiceNavButton() {
  const { open } = useDiceRoller();

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            onClick={open}
            aria-label="Open Dice Roller"
          >
            <Dices className="h-5 w-5" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          Dice Roller (Ctrl+R)
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
