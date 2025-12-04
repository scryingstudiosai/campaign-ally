'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Sparkles, Shuffle, BookOpen } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase/client';

interface PuzzleForgeCardProps {
  campaignId: string;
  onForgeComplete: () => void;
}

export default function PuzzleForgeCard({ campaignId, onForgeComplete }: PuzzleForgeCardProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [showInputs, setShowInputs] = useState(false);

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
  const [mode, setMode] = useState<'generate' | 'surprise'>('generate');

  async function handleGenerate() {
    setLoading(true);
    setResult(null);
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
        mode,
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
        setResult(data.data);
        toast({
          title: 'Puzzle Saved',
          description: 'Your puzzle has been automatically saved to campaign memory.',
        });
        onForgeComplete();
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

  function handleSurpriseMe() {
    setMode('surprise');
    setTimeout(() => handleGenerate(), 100);
  }


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
              <Sparkles className="h-6 w-6 text-primary" />
            </div>
            <CardTitle className="text-lg font-bold group-hover:text-primary transition-colors">
              Puzzle Forge
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <CardDescription className="text-sm text-center">
            Create table-ready puzzles with solutions and hints
          </CardDescription>
        </CardContent>
      </Card>

      {showInputs && (
        <Card className="mt-4">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Puzzle Forge
            </CardTitle>
            <CardDescription>
              Create table-ready puzzles with solutions and hints
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Environment</Label>
              <Select value={environment} onValueChange={setEnvironment}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="dungeon room">Dungeon Room</SelectItem>
                  <SelectItem value="forest glade">Forest Glade</SelectItem>
                  <SelectItem value="city archive">City Archive</SelectItem>
                  <SelectItem value="temple">Temple</SelectItem>
                  <SelectItem value="ship">Ship</SelectItem>
                  <SelectItem value="cavern">Cavern</SelectItem>
                  <SelectItem value="planar">Planar</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="logic">Logic</SelectItem>
                  <SelectItem value="riddle">Riddle</SelectItem>
                  <SelectItem value="cipher">Cipher</SelectItem>
                  <SelectItem value="spatial">Spatial</SelectItem>
                  <SelectItem value="environmental">Environmental</SelectItem>
                  <SelectItem value="mechanism">Mechanism</SelectItem>
                  <SelectItem value="social">Social</SelectItem>
                  <SelectItem value="ritual">Ritual</SelectItem>
                  <SelectItem value="mixed">Mixed</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Theme</Label>
              <Select value={theme} onValueChange={setTheme}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ancient">Ancient</SelectItem>
                  <SelectItem value="arcane">Arcane</SelectItem>
                  <SelectItem value="clockwork">Clockwork</SelectItem>
                  <SelectItem value="fey">Fey</SelectItem>
                  <SelectItem value="divine">Divine</SelectItem>
                  <SelectItem value="eldritch">Eldritch</SelectItem>
                  <SelectItem value="ruins">Ruins</SelectItem>
                  <SelectItem value="oceanic">Oceanic</SelectItem>
                  <SelectItem value="volcanic">Volcanic</SelectItem>
                  <SelectItem value="urban">Urban</SelectItem>
                  <SelectItem value="artifact">Artifact</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Tone</Label>
              <Select value={tone} onValueChange={setTone}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="mysterious">Mysterious</SelectItem>
                  <SelectItem value="tense">Tense</SelectItem>
                  <SelectItem value="whimsical">Whimsical</SelectItem>
                  <SelectItem value="heroic">Heroic</SelectItem>
                  <SelectItem value="grim">Grim</SelectItem>
                  <SelectItem value="cinematic">Cinematic</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Party Level</Label>
              <Input
                type="number"
                min="1"
                max="20"
                value={partyLevel}
                onChange={(e) => setPartyLevel(e.target.value)}
              />
            </div>

            <div>
              <Label>Complexity</Label>
              <Select value={complexity} onValueChange={setComplexity}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="simple">Simple</SelectItem>
                  <SelectItem value="standard">Standard</SelectItem>
                  <SelectItem value="advanced">Advanced</SelectItem>
                  <SelectItem value="expert">Expert</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Target Duration (min)</Label>
              <Input
                type="number"
                min="5"
                max="60"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
              />
            </div>

            <div>
              <Label>Purpose</Label>
              <Select value={purpose} onValueChange={setPurpose}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="gate">Gate/Lock</SelectItem>
                  <SelectItem value="reveal lore">Reveal Lore</SelectItem>
                  <SelectItem value="safeguard treasure">Safeguard Treasure</SelectItem>
                  <SelectItem value="boss prep">Boss Prep</SelectItem>
                  <SelectItem value="trial">Trial</SelectItem>
                  <SelectItem value="side quest">Side Quest</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Magic Level</Label>
              <Select value={magicLevel} onValueChange={setMagicLevel}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low-magic">Low Magic</SelectItem>
                  <SelectItem value="standard">Standard</SelectItem>
                  <SelectItem value="high-magic">High Magic</SelectItem>
                  <SelectItem value="magitech">Magitech</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Fail Consequence</Label>
              <Select value={failConsequence} onValueChange={setFailConsequence}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="alarm">Alarm</SelectItem>
                  <SelectItem value="minions">Spawn Minions</SelectItem>
                  <SelectItem value="damage">Damage</SelectItem>
                  <SelectItem value="setback">Setback</SelectItem>
                  <SelectItem value="clue lost">Clue Lost</SelectItem>
                  <SelectItem value="time pressure">Time Pressure</SelectItem>
                  <SelectItem value="none">None</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Safety Preference</Label>
              <Select value={safetyPreference} onValueChange={setSafetyPreference}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="soft fail-forward">Soft Fail-Forward</SelectItem>
                  <SelectItem value="medium fail-forward">Medium Fail-Forward</SelectItem>
                  <SelectItem value="hard fail-forward">Hard Fail-Forward</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

            <div className="flex gap-2 pt-2">
              <Button onClick={handleGenerate} disabled={loading} className="flex-1">
                {loading ? 'Forging...' : 'Generate Puzzle'}
                <Sparkles className="h-4 w-4 ml-2" />
              </Button>
              <Button onClick={handleSurpriseMe} disabled={loading} variant="outline">
                <Shuffle className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {result && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5" />
              {result.title}
            </CardTitle>
            <CardDescription>{result.summary}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="prose prose-sm max-w-none dark:prose-invert">
              <p className="whitespace-pre-wrap">{result.description}</p>
            </div>

            <Separator />

            <div className="space-y-2">
              <h3 className="font-semibold">Solution</h3>
              <p className="text-sm text-muted-foreground">{result.solution}</p>
            </div>

            <Separator />

            <div className="space-y-2">
              <h3 className="font-semibold">Hints to Give Players</h3>
              <ul className="list-disc list-inside space-y-1">
                {result.hints.map((hint: string, i: number) => (
                  <li key={i} className="text-sm">{hint}</li>
                ))}
              </ul>
            </div>

            <Separator />

            <div className="space-y-2">
              <h3 className="font-semibold">If They Fail</h3>
              <p className="text-sm text-muted-foreground">{result.if_they_fail}</p>
            </div>
          </CardContent>
        </Card>
      )}
    </>
  );
}
