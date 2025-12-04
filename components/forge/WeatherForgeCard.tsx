'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, Cloud, Save } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

interface WeatherForgeCardProps {
  campaignId: string;
}

interface WeatherResult {
  summary: string;
  detailed_description: string;
  mechanical_effects: string;
  ambient_sounds: string[];
  visual_prompts: string[];
  dynamic_shift: string;
  dm_notes: string;
  flair: string;
}

export function WeatherForgeCard({ campaignId }: WeatherForgeCardProps) {
  const [worldName, setWorldName] = useState('');
  const [biome, setBiome] = useState('');
  const [season, setSeason] = useState('');
  const [timeOfDay, setTimeOfDay] = useState('');
  const [mood, setMood] = useState('');
  const [specialPhenomena, setSpecialPhenomena] = useState('');
  const [impactLevel, setImpactLevel] = useState<'cosmetic' | 'moderate' | 'major'>('cosmetic');
  const [respectCodex, setRespectCodex] = useState(true);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<WeatherResult | null>(null);
  const [showInputs, setShowInputs] = useState(false);
  const { toast } = useToast();

  const handleGenerate = async () => {
    setLoading(true);
    setResult(null);

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

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate weather');
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to generate weather');
      }

      setResult(data.data);
      toast({
        title: 'Weather generated',
        description: 'Your environmental conditions are ready!',
      });
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

  const handleCardClick = () => {
    if (!showInputs) {
      setShowInputs(true);
    }
  };

  return (
    <>
      <Card
        className="group cursor-pointer hover:border-primary/50 transition-all duration-200 hover:shadow-lg hover:scale-[1.02] bg-gradient-to-br from-card to-card/50"
        onClick={handleCardClick}
      >
        <CardHeader className="pb-3">
          <div className="flex flex-col items-center text-center space-y-3 py-4">
            <div className="p-3 bg-primary/10 rounded-lg group-hover:bg-primary/20 transition-colors shadow-lg">
              <Cloud className="h-6 w-6 text-primary" />
            </div>
            <CardTitle className="text-lg font-bold group-hover:text-primary transition-colors">
              Weather Forge
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <CardDescription className="text-sm text-center">
            Generate immersive weather and environmental conditions tailored to your world
          </CardDescription>
        </CardContent>
      </Card>

      {showInputs && (
        <Card className="mt-4">
          <CardHeader className="pb-5">
            <CardTitle className="flex items-center gap-2.5">
              <Cloud className="h-5 w-5 text-primary" />
              Weather Forge
            </CardTitle>
            <CardDescription>
              Generate immersive weather and environmental conditions tailored to your world
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="worldName">World Name (Optional)</Label>
            <Input
              id="worldName"
              placeholder="e.g., Forgotten Realms"
              value={worldName}
              onChange={(e) => setWorldName(e.target.value)}
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="biome">Biome/Region (Optional)</Label>
            <Input
              id="biome"
              placeholder="e.g., desert, forest, mountain"
              value={biome}
              onChange={(e) => setBiome(e.target.value)}
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="season">Season (Optional)</Label>
            <Input
              id="season"
              placeholder="e.g., winter, midsummer"
              value={season}
              onChange={(e) => setSeason(e.target.value)}
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="timeOfDay">Time of Day (Optional)</Label>
            <Input
              id="timeOfDay"
              placeholder="e.g., dawn, midnight"
              value={timeOfDay}
              onChange={(e) => setTimeOfDay(e.target.value)}
              disabled={loading}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="mood">Tone/Mood (Optional)</Label>
          <Input
            id="mood"
            placeholder="e.g., foreboding, mystical, calm"
            value={mood}
            onChange={(e) => setMood(e.target.value)}
            disabled={loading}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="specialPhenomena">Special Phenomena (Optional)</Label>
          <Textarea
            id="specialPhenomena"
            placeholder="e.g., magical storm, eclipse, aurora, dimensional rift"
            value={specialPhenomena}
            onChange={(e) => setSpecialPhenomena(e.target.value)}
            disabled={loading}
            rows={2}
            className="resize-none"
          />
        </div>

        <div className="space-y-2">
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
            disabled={loading}
          />
          <Label htmlFor="respectCodex" className="text-sm cursor-pointer">
            Respect Campaign Codex
          </Label>
        </div>

            <Button
              onClick={handleGenerate}
              disabled={loading}
              className="w-full"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Cloud className="mr-2 h-4 w-4" />
                  Generate Weather
                </>
              )}
            </Button>

            {result && (
              <div className="space-y-4 animate-scale-in">
                <Separator />

                <div className="space-y-3">
                  <div>
                    <h3 className="font-semibold text-lg mb-2">{result.summary}</h3>
                    {result.flair && (
                      <p className="text-sm italic text-muted-foreground mb-3 border-l-2 border-primary pl-3">
                        {result.flair}
                      </p>
                    )}
                  </div>

                  <div>
                    <Label className="text-xs text-muted-foreground">Description</Label>
                    <p className="text-sm mt-1 whitespace-pre-wrap">{result.detailed_description}</p>
                  </div>

                  {result.mechanical_effects && (
                    <div>
                      <Label className="text-xs text-muted-foreground">Mechanical Effects</Label>
                      <p className="text-sm mt-1">{result.mechanical_effects}</p>
                    </div>
                  )}

                  {result.ambient_sounds && result.ambient_sounds.length > 0 && (
                    <div>
                      <Label className="text-xs text-muted-foreground">Ambient Sounds</Label>
                      <div className="flex flex-wrap gap-1.5 mt-1">
                        {result.ambient_sounds.map((sound, idx) => (
                          <Badge key={idx} variant="secondary" className="text-xs">
                            {sound}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {result.dynamic_shift && (
                    <div>
                      <Label className="text-xs text-muted-foreground">Dynamic Shift</Label>
                      <p className="text-sm mt-1">{result.dynamic_shift}</p>
                    </div>
                  )}

                  {result.dm_notes && (
                    <div>
                      <Label className="text-xs text-muted-foreground">DM Notes</Label>
                      <p className="text-sm mt-1 text-muted-foreground italic">{result.dm_notes}</p>
                    </div>
                  )}

                  {result.visual_prompts && result.visual_prompts.length > 0 && (
                    <div>
                      <Label className="text-xs text-muted-foreground">Visual Prompts</Label>
                      <div className="space-y-1 mt-1">
                        {result.visual_prompts.map((prompt, idx) => (
                          <p key={idx} className="text-xs text-muted-foreground">• {prompt}</p>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </>
  );
}
