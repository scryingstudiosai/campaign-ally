'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Skull } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase/client';

interface TrapForgeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campaignId: string;
  onSuccess?: () => void;
}

export default function TrapForgeDialog({ open, onOpenChange, campaignId, onSuccess }: TrapForgeDialogProps) {
  const { toast } = useToast();
  const [isGenerating, setIsGenerating] = useState(false);

  const [concept, setConcept] = useState('');
  const [partyLevel, setPartyLevel] = useState('5');
  const [difficulty, setDifficulty] = useState<'easy' | 'moderate' | 'dangerous' | 'deadly'>('moderate');
  const [trapType, setTrapType] = useState<'mechanical' | 'magical' | 'hybrid'>('mechanical');

  const handleGenerate = async () => {
    if (!concept.trim()) {
      toast({
        title: 'Concept Required',
        description: 'Please describe the trap you want to create',
        variant: 'destructive',
      });
      return;
    }

    setIsGenerating(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Not authenticated');
      }

      const response = await fetch('/api/ai/forge/trap', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          campaignId,
          concept: concept.trim(),
          partyLevel: parseInt(partyLevel),
          difficulty,
          trapType,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate trap');
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Generation failed');
      }

      toast({
        title: 'Trap Generated!',
        description: `${result.data.name} has been saved to your campaign memory`,
      });

      setConcept('');
      setPartyLevel('5');
      setDifficulty('moderate');
      setTrapType('mechanical');
      onOpenChange(false);

      if (onSuccess) {
        onSuccess();
      }

    } catch (error) {
      console.error('Trap generation error:', error);
      toast({
        title: 'Generation Failed',
        description: error instanceof Error ? error.message : 'Failed to generate trap',
        variant: 'destructive',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Skull className="h-5 w-5" />
            Trap Forge
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="concept">Trap Concept *</Label>
            <Textarea
              id="concept"
              placeholder="Describe the trap... (e.g., 'Poisoned dart trap in ancient temple corridor' or 'Magical rune that freezes intruders')"
              value={concept}
              onChange={(e) => setConcept(e.target.value)}
              rows={3}
              className="mt-1"
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label htmlFor="partyLevel">Party Level</Label>
              <Input
                id="partyLevel"
                type="number"
                min="1"
                max="20"
                value={partyLevel}
                onChange={(e) => setPartyLevel(e.target.value)}
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="difficulty">Difficulty</Label>
              <Select value={difficulty} onValueChange={(value: any) => setDifficulty(value)}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="easy">Easy</SelectItem>
                  <SelectItem value="moderate">Moderate</SelectItem>
                  <SelectItem value="dangerous">Dangerous</SelectItem>
                  <SelectItem value="deadly">Deadly</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="trapType">Trap Type</Label>
              <Select value={trapType} onValueChange={(value: any) => setTrapType(value)}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="mechanical">Mechanical</SelectItem>
                  <SelectItem value="magical">Magical</SelectItem>
                  <SelectItem value="hybrid">Hybrid</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isGenerating}
            >
              Cancel
            </Button>
            <Button
              onClick={handleGenerate}
              disabled={isGenerating || !concept.trim()}
            >
              {isGenerating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Forging Trap...
                </>
              ) : (
                'Generate Trap'
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
