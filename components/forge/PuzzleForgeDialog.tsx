'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sparkles, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { useGenerationCount } from '@/contexts/GenerationCountContext';

interface PuzzleForgeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campaignId: string;
}

export default function PuzzleForgeDialog({ open, onOpenChange, campaignId }: PuzzleForgeDialogProps) {
  const { toast } = useToast();
  const router = useRouter();
  const { refresh: refreshCount } = useGenerationCount();
  const [loading, setLoading] = useState(false);

  const [environment, setEnvironment] = useState('dungeon room');
  const [category, setCategory] = useState('logic');
  const [theme, setTheme] = useState('ancient');
  const [tone, setTone] = useState('mysterious');
  const [partyLevel, setPartyLevel] = useState('5');
  const [complexity, setComplexity] = useState('standard');
  const [duration, setDuration] = useState('15');
  const [purpose, setPurpose] = useState('gate');
  const [magicLevel, setMagicLevel] = useState('standard');
  const [failConsequence, setFailConsequence] = useState('setback');
  const [safetyPreference, setSafetyPreference] = useState('medium fail-forward');

  async function handleGenerate(surpriseMe: boolean = false) {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast({
          title: 'Not authenticated',
          description: 'Please sign in to generate puzzles',
          variant: 'destructive',
        });
        setLoading(false);
        return;
      }

      const payload = {
        campaignId,
        environment,
        puzzle_category: category,
        theme_tags: [theme],
        tone,
        party_level: parseInt(partyLevel),
        complexity,
        target_duration_minutes: parseInt(duration),
        narrative_purpose: purpose,
        magic_tech_level: magicLevel,
        fail_consequence: failConsequence,
        safety_preference: safetyPreference,
        mode: surpriseMe ? 'surprise' : 'generate',
      };

      const res = await fetch('/api/ai/forge/puzzle', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (data.success) {
        // Refresh the generation count after successful save (trigger auto-increments in DB)
        await refreshCount();

        toast({
          title: 'Puzzle Saved',
          description: 'Your puzzle has been saved to Memory.',
        });
        onOpenChange(false);
        router.push('/app/memory');
      } else {
        toast({
          title: 'Generation Failed',
          description: data.error || 'Failed to generate puzzle',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'An error occurred while generating the puzzle',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-cyan-500" />
            <div>
              <DialogTitle>Puzzle Forge</DialogTitle>
              <DialogDescription>
                Create table-ready puzzles with solutions and hints
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="environment">Environment</Label>
              <Select value={environment} onValueChange={setEnvironment}>
                <SelectTrigger id="environment">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="dungeon room">Dungeon Room</SelectItem>
                  <SelectItem value="forest">Forest</SelectItem>
                  <SelectItem value="temple">Temple</SelectItem>
                  <SelectItem value="library">Library</SelectItem>
                  <SelectItem value="tower">Tower</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="category">Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger id="category">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="logic">Logic</SelectItem>
                  <SelectItem value="riddle">Riddle</SelectItem>
                  <SelectItem value="physical">Physical</SelectItem>
                  <SelectItem value="magical">Magical</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="theme">Theme</Label>
              <Select value={theme} onValueChange={setTheme}>
                <SelectTrigger id="theme">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ancient">Ancient</SelectItem>
                  <SelectItem value="nature">Nature</SelectItem>
                  <SelectItem value="elemental">Elemental</SelectItem>
                  <SelectItem value="celestial">Celestial</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="tone">Tone</Label>
              <Select value={tone} onValueChange={setTone}>
                <SelectTrigger id="tone">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="mysterious">Mysterious</SelectItem>
                  <SelectItem value="ominous">Ominous</SelectItem>
                  <SelectItem value="whimsical">Whimsical</SelectItem>
                  <SelectItem value="serious">Serious</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="partyLevel">Party Level</Label>
              <Input
                id="partyLevel"
                type="number"
                min="1"
                max="20"
                value={partyLevel}
                onChange={(e) => setPartyLevel(e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="complexity">Complexity</Label>
              <Select value={complexity} onValueChange={setComplexity}>
                <SelectTrigger id="complexity">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="simple">Simple</SelectItem>
                  <SelectItem value="standard">Standard</SelectItem>
                  <SelectItem value="complex">Complex</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="duration">Target Duration (min)</Label>
              <Input
                id="duration"
                type="number"
                min="5"
                max="60"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="purpose">Purpose</Label>
              <Select value={purpose} onValueChange={setPurpose}>
                <SelectTrigger id="purpose">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="gate">Gate/Lock</SelectItem>
                  <SelectItem value="treasure">Treasure</SelectItem>
                  <SelectItem value="story">Story Reveal</SelectItem>
                  <SelectItem value="trap">Trap</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="magicLevel">Magic Level</Label>
              <Select value={magicLevel} onValueChange={setMagicLevel}>
                <SelectTrigger id="magicLevel">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="standard">Standard</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="failConsequence">Fail Consequence</Label>
              <Select value={failConsequence} onValueChange={setFailConsequence}>
                <SelectTrigger id="failConsequence">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  <SelectItem value="setback">Setback</SelectItem>
                  <SelectItem value="damage">Damage</SelectItem>
                  <SelectItem value="alert">Alert</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label htmlFor="safetyPreference">Safety Preference</Label>
            <Select value={safetyPreference} onValueChange={setSafetyPreference}>
              <SelectTrigger id="safetyPreference">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="high fail-forward">High Fail-Forward</SelectItem>
                <SelectItem value="medium fail-forward">Medium Fail-Forward</SelectItem>
                <SelectItem value="low fail-forward">Low Fail-Forward</SelectItem>
                <SelectItem value="harsh">Harsh</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter className="flex-row justify-between sm:justify-between">
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancel
          </Button>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => handleGenerate(true)}
              disabled={loading}
            >
              <Sparkles className="h-4 w-4 mr-2" />
              Surprise Me
            </Button>
            <Button
              onClick={() => handleGenerate(false)}
              disabled={loading}
              className="bg-cyan-600 hover:bg-cyan-700"
            >
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Generate Puzzle
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
