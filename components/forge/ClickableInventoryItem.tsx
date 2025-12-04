'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Sparkles, Wand2 } from 'lucide-react';

interface ClickableInventoryItemProps {
  itemName: string;
  itemDescription?: string;
  itemPrice?: string;
  context: string;
  onGenerateItem: (itemName: string, context: string, specificPrompt?: string) => void;
}

export function ClickableInventoryItem({
  itemName,
  itemDescription,
  itemPrice,
  context,
  onGenerateItem,
}: ClickableInventoryItemProps) {
  const [showDialog, setShowDialog] = useState(false);
  const [specificPrompt, setSpecificPrompt] = useState('');
  const [mode, setMode] = useState<'choose' | 'specific'>('choose');

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    setShowDialog(true);
    setMode('choose');
    setSpecificPrompt('');
  };

  const handleSurpriseMe = () => {
    onGenerateItem(itemName, context);
    setShowDialog(false);
  };

  const handleSpecificGenerate = () => {
    if (specificPrompt.trim()) {
      onGenerateItem(itemName, `${context}. ${specificPrompt}`, specificPrompt);
    } else {
      onGenerateItem(itemName, context);
    }
    setShowDialog(false);
  };

  return (
    <>
      <button
        onClick={handleClick}
        className="font-medium text-foreground hover:text-primary hover:underline transition-colors cursor-pointer text-left"
      >
        {itemName}
      </button>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{itemName}</DialogTitle>
            <DialogDescription>
              Choose how to generate this item
            </DialogDescription>
          </DialogHeader>

          {mode === 'choose' && (
            <div className="grid gap-3 py-4">
              <Button
                onClick={handleSurpriseMe}
                variant="outline"
                className="h-auto py-3 flex flex-col items-start gap-1.5"
              >
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4" />
                  <span className="font-semibold">Surprise Me</span>
                </div>
                <span className="text-sm text-muted-foreground text-left">
                  AI creates abilities based on "{itemName}"
                </span>
              </Button>

              <Button
                onClick={() => setMode('specific')}
                variant="outline"
                className="h-auto py-3 flex flex-col items-start gap-1.5"
              >
                <div className="flex items-center gap-2">
                  <Wand2 className="h-4 w-4" />
                  <span className="font-semibold">Specific Request</span>
                </div>
                <span className="text-sm text-muted-foreground text-left">
                  Describe the properties you want
                </span>
              </Button>
            </div>
          )}

          {mode === 'specific' && (
            <>
              <div className="space-y-4 py-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">
                    Describe the properties you want
                  </label>
                  <Textarea
                    placeholder="E.g., 'A legendary weapon with fire damage and phoenix summoning'"
                    value={specificPrompt}
                    onChange={(e) => setSpecificPrompt(e.target.value)}
                    rows={3}
                    className="resize-none"
                  />
                </div>
                {itemDescription && (
                  <div className="text-sm text-muted-foreground bg-secondary/30 rounded p-3">
                    <span className="font-semibold">Shop Description: </span>
                    {itemDescription}
                  </div>
                )}
              </div>
              <DialogFooter className="gap-2">
                <Button variant="ghost" onClick={() => setMode('choose')}>
                  Back
                </Button>
                <Button onClick={handleSpecificGenerate}>
                  Generate Item
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
