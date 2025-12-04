'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useDiceRoller } from '@/contexts/DiceRollerContext';
import { formatRollResult, formatTimestamp } from '@/lib/dice-roller';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Dices, Copy, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import { toast } from 'sonner';

const QUICK_DICE = ['d4', 'd6', 'd8', 'd10', 'd12', 'd20', 'd100'];

export function DicePopover() {
  const {
    isOpen,
    close,
    roll,
    history,
    clearHistory,
    seeded,
    setSeeded,
    lastResult,
  } = useDiceRoller();

  const [formula, setFormula] = useState('d20');
  const [advantage, setAdvantage] = useState(false);
  const [disadvantage, setDisadvantage] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const liveRegionRef = useRef<HTMLDivElement>(null);

  // Focus input when opened
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // Announce results to screen readers
  useEffect(() => {
    if (lastResult && liveRegionRef.current) {
      liveRegionRef.current.textContent = formatRollResult(lastResult);
    }
  }, [lastResult]);

  // Handle hotkeys
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      // Ctrl/Cmd + R to open
      if ((e.ctrlKey || e.metaKey) && e.key === 'r' && !isOpen) {
        // Don't prevent default if in an input field
        if (
          document.activeElement?.tagName === 'INPUT' ||
          document.activeElement?.tagName === 'TEXTAREA'
        ) {
          return;
        }
        e.preventDefault();
        open();
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, open]);

  const handleRoll = () => {
    if (!formula.trim()) {
      toast.error('Enter a dice formula');
      return;
    }

    const result = roll(formula, { advantage, disadvantage });
    if (result) {
      toast.success(`Rolled ${result.total}!`);
    } else {
      toast.error('Invalid dice formula. Try: d20, 2d6+3, etc.');
    }
  };

  const handleQuickDie = (die: string) => {
    setFormula(die);
    // Auto-focus input after setting formula
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const handleCopyLast = () => {
    if (!lastResult) {
      toast.error('No result to copy');
      return;
    }

    const text = formatRollResult(lastResult);
    navigator.clipboard.writeText(text);
    toast.success('Result copied to clipboard');
  };

  const handleClearHistory = () => {
    clearHistory();
    toast.success('History cleared');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleRoll();
    }
  };

  return (
    <>
      {/* ARIA Live Region for screen readers */}
      <div
        ref={liveRegionRef}
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      />

      <Dialog open={isOpen} onOpenChange={close}>
        <DialogContent
          className="max-w-md"
          aria-describedby="dice-roller-description"
        >
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Dices className="h-5 w-5 text-primary" />
              Dice Roller
            </DialogTitle>
            <DialogDescription id="dice-roller-description">
              Quick rolls anywhere in Campaign Ally
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Formula Input */}
            <div className="space-y-2">
              <Label htmlFor="dice-formula">Roll Formula</Label>
              <Input
                ref={inputRef}
                id="dice-formula"
                value={formula}
                onChange={(e) => setFormula(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="e.g., 2d6+3 or d20"
                autoComplete="off"
              />
            </div>

            {/* Quick Dice Buttons */}
            <div className="space-y-2">
              <Label>Quick Dice</Label>
              <div className="flex flex-wrap gap-2">
                {QUICK_DICE.map((die) => (
                  <Button
                    key={die}
                    variant="outline"
                    size="sm"
                    onClick={() => handleQuickDie(die)}
                    className="font-mono"
                  >
                    {die}
                  </Button>
                ))}
              </div>
            </div>

            {/* Advantage / Disadvantage */}
            <div className="flex gap-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="advantage"
                  checked={advantage}
                  onCheckedChange={(checked) => setAdvantage(checked as boolean)}
                />
                <Label
                  htmlFor="advantage"
                  className="text-sm cursor-pointer"
                >
                  Advantage
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="disadvantage"
                  checked={disadvantage}
                  onCheckedChange={(checked) => setDisadvantage(checked as boolean)}
                />
                <Label
                  htmlFor="disadvantage"
                  className="text-sm cursor-pointer"
                >
                  Disadvantage
                </Label>
              </div>
            </div>

            {/* Seeded */}
            <div className="flex items-center space-x-2">
              <Checkbox
                id="seeded"
                checked={seeded}
                onCheckedChange={(checked) => setSeeded(checked as boolean)}
              />
              <Label
                htmlFor="seeded"
                className="text-sm cursor-pointer"
              >
                Deterministic Seed
              </Label>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2">
              <Button
                onClick={handleRoll}
                className="flex-1"
              >
                <Dices className="mr-2 h-4 w-4" />
                Roll
              </Button>

              <Button
                variant="outline"
                onClick={handleCopyLast}
                disabled={!lastResult}
              >
                <Copy className="h-4 w-4" />
              </Button>

              <Button
                variant="outline"
                onClick={handleClearHistory}
                disabled={history.length === 0}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>

            {/* Current Result */}
            {lastResult && (
              <div className="p-4 bg-primary/10 rounded-lg border border-primary/30">
                <div className="text-sm text-muted-foreground mb-1">Result</div>
                <div className="text-lg font-bold text-primary">
                  {lastResult.total}
                </div>
                <div className="text-xs text-muted-foreground mt-1 font-mono">
                  {formatRollResult(lastResult)}
                </div>
              </div>
            )}

            {/* History */}
            {history.length > 0 && (
              <>
                <Separator />
                <div>
                  <button
                    onClick={() => setShowHistory(!showHistory)}
                    className="flex items-center justify-between w-full text-sm font-medium mb-2 hover:text-primary transition-colors"
                  >
                    <span>History ({history.length})</span>
                    {showHistory ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </button>

                  {showHistory && (
                    <ScrollArea className="h-[200px] border rounded-lg p-2">
                      <div className="space-y-2">
                        {history.map((result, index) => (
                          <div
                            key={result.id}
                            className="text-xs p-2 bg-secondary/50 rounded hover:bg-secondary transition-colors"
                          >
                            <div className="flex justify-between items-start mb-1">
                              <span className="font-bold text-primary">
                                {result.total}
                              </span>
                              <span className="text-muted-foreground text-[10px]">
                                {formatTimestamp(result.timestamp)}
                              </span>
                            </div>
                            <div className="font-mono text-muted-foreground">
                              {formatRollResult(result)}
                            </div>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  )}
                </div>
              </>
            )}

            {/* Keyboard Shortcut Hint */}
            <div className="text-xs text-muted-foreground text-center pt-2 border-t">
              Press <kbd className="px-1.5 py-0.5 bg-secondary rounded text-[10px]">Ctrl+R</kbd> or{' '}
              <kbd className="px-1.5 py-0.5 bg-secondary rounded text-[10px]">⌘R</kbd> to open • <kbd className="px-1.5 py-0.5 bg-secondary rounded text-[10px]">Enter</kbd> to roll • <kbd className="px-1.5 py-0.5 bg-secondary rounded text-[10px]">Esc</kbd> to close
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
