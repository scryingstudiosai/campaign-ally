'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Cloud, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase/client';

interface WeatherForgeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campaignId: string;
}

export default function WeatherForgeDialog({ open, onOpenChange, campaignId }: WeatherForgeDialogProps) {
  const [worldName, setWorldName] = useState('');
  const [biome, setBiome] = useState('');
  const [season, setSeason] = useState('');
  const [timeOfDay, setTimeOfDay] = useState('');
  const [mood, setMood] = useState('');
  const [specialPhenomena, setSpecialPhenomena] = useState('');
  const [impactLevel, setImpactLevel] = useState<'cosmetic' | 'moderate' | 'major'>('cosmetic');
  const [respectCodex, setRespectCodex] = useState(true);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleGenerate = async () => {
    setLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        toast({
          title: 'Not logged in',
          description: 'Please sign in to use forges.',
          variant: 'destructive',
        });
        return;
      }

      const response = await fetch('/api/ai/forge/weather', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          campaignId,
          worldName: worldName || undefined,
          biome: biome || undefined,
          season: season || undefined,
          timeOfDay: timeOfDay || undefined,
          mood: mood || undefined,
          specialPhenomena: specialPhenomena || undefined,
          impactLevel,
          respectCodex,
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to generate weather');
      }

      toast({
        title: 'Weather generated',
        description: 'Your weather has been saved to Memory.',
      });

      onOpenChange(false);
    } catch (error) {
      console.error('Weather generation error:', error);
      toast({
        title: 'Generation failed',
        description: error instanceof Error ? error.message : 'Something went wrong',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Cloud className="h-5 w-5 text-cyan-500" />
            <div>
              <DialogTitle>Weather Forge</DialogTitle>
              <DialogDescription>
                Generate immersive weather and environmental conditions
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="worldName">World Name (Optional)</Label>
              <Input
                id="worldName"
                placeholder="e.g., Forgotten Realms"
                value={worldName}
                onChange={(e) => setWorldName(e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="biome">Biome/Region (Optional)</Label>
              <Input
                id="biome"
                placeholder="e.g., desert, forest, mountain"
                value={biome}
                onChange={(e) => setBiome(e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="season">Season (Optional)</Label>
              <Input
                id="season"
                placeholder="e.g., winter, midsummer"
                value={season}
                onChange={(e) => setSeason(e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="timeOfDay">Time of Day (Optional)</Label>
              <Input
                id="timeOfDay"
                placeholder="e.g., dawn, midnight"
                value={timeOfDay}
                onChange={(e) => setTimeOfDay(e.target.value)}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="mood">Tone/Mood (Optional)</Label>
            <Input
              id="mood"
              placeholder="e.g., foreboding, mystical, calm"
              value={mood}
              onChange={(e) => setMood(e.target.value)}
            />
          </div>

          <div>
            <Label htmlFor="specialPhenomena">Special Phenomena (Optional)</Label>
            <Textarea
              id="specialPhenomena"
              placeholder="e.g., magical storm, eclipse, aurora, dimensional rift"
              value={specialPhenomena}
              onChange={(e) => setSpecialPhenomena(e.target.value)}
              rows={2}
              className="resize-none"
            />
          </div>

          <div>
            <Label htmlFor="impactLevel">Impact Level</Label>
            <Select value={impactLevel} onValueChange={(v) => setImpactLevel(v as 'cosmetic' | 'moderate' | 'major')}>
              <SelectTrigger id="impactLevel">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cosmetic">Cosmetic (Atmosphere only)</SelectItem>
                <SelectItem value="moderate">Moderate (Some gameplay effects)</SelectItem>
                <SelectItem value="major">Major (Significant hazards)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="respectCodex"
              checked={respectCodex}
              onCheckedChange={(checked) => setRespectCodex(!!checked)}
            />
            <label htmlFor="respectCodex" className="text-sm cursor-pointer">
              <div>Respect Campaign Codex</div>
              <div className="text-xs text-muted-foreground">
                Generate content aligned with your campaign themes and style
              </div>
            </label>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleGenerate}
            disabled={loading}
            className="bg-cyan-600 hover:bg-cyan-700"
          >
            {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Generate Weather
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
