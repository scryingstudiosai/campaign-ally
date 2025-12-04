'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, BookUser } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase/client';

interface BackstoryForgeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campaignId: string;
  onSuccess?: () => void;
}

export default function BackstoryForgeDialog({ open, onOpenChange, campaignId, onSuccess }: BackstoryForgeDialogProps) {
  const { toast } = useToast();
  const [isGenerating, setIsGenerating] = useState(false);

  const [characterName, setCharacterName] = useState('');
  const [race, setRace] = useState('');
  const [characterClass, setCharacterClass] = useState('');
  const [age, setAge] = useState('25');
  const [background, setBackground] = useState('');
  const [keyEvent, setKeyEvent] = useState('');

  const handleGenerate = async () => {
    if (!characterName.trim() || !race.trim() || !characterClass.trim()) {
      toast({
        title: 'Required Fields Missing',
        description: 'Please provide character name, race, and class',
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

      const response = await fetch('/api/ai/forge/backstory', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          campaignId,
          characterName: characterName.trim(),
          race: race.trim(),
          characterClass: characterClass.trim(),
          age: parseInt(age),
          background: background.trim() || undefined,
          keyEvent: keyEvent.trim() || undefined,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate backstory');
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Generation failed');
      }

      toast({
        title: 'Backstory Generated!',
        description: `${characterName}'s backstory has been saved to your campaign memory`,
      });

      setCharacterName('');
      setRace('');
      setCharacterClass('');
      setAge('25');
      setBackground('');
      setKeyEvent('');
      onOpenChange(false);

      if (onSuccess) {
        onSuccess();
      }

    } catch (error) {
      console.error('Backstory generation error:', error);
      toast({
        title: 'Generation Failed',
        description: error instanceof Error ? error.message : 'Failed to generate backstory',
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
            <BookUser className="h-5 w-5" />
            Backstory Forge
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="characterName">Character Name *</Label>
              <Input
                id="characterName"
                placeholder="e.g., Elara Moonshadow"
                value={characterName}
                onChange={(e) => setCharacterName(e.target.value)}
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="age">Age *</Label>
              <Input
                id="age"
                type="number"
                min="1"
                max="10000"
                value={age}
                onChange={(e) => setAge(e.target.value)}
                className="mt-1"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="race">Race *</Label>
              <Input
                id="race"
                placeholder="e.g., Half-Elf"
                value={race}
                onChange={(e) => setRace(e.target.value)}
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="characterClass">Class *</Label>
              <Input
                id="characterClass"
                placeholder="e.g., Rogue"
                value={characterClass}
                onChange={(e) => setCharacterClass(e.target.value)}
                className="mt-1"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="background">Background Concept (Optional)</Label>
            <Textarea
              id="background"
              placeholder="Brief description of their background... (e.g., 'Orphaned street thief turned reluctant hero')"
              value={background}
              onChange={(e) => setBackground(e.target.value)}
              rows={2}
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="keyEvent">Key Life Event (Optional)</Label>
            <Textarea
              id="keyEvent"
              placeholder="A pivotal moment in their past... (e.g., 'Witnessed their mentor's assassination')"
              value={keyEvent}
              onChange={(e) => setKeyEvent(e.target.value)}
              rows={2}
              className="mt-1"
            />
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
              disabled={isGenerating || !characterName.trim() || !race.trim() || !characterClass.trim()}
            >
              {isGenerating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Forging Backstory...
                </>
              ) : (
                'Generate Backstory'
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
