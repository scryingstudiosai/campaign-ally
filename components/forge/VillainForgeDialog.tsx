'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Skull, Sparkles, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { useGenerationCount } from '@/contexts/GenerationCountContext';

interface VillainForgeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campaignId: string;
  prefillName?: string;
}

const THREAT_LEVELS = [
  { value: '1', label: 'Minor Threat (CR 1-4)' },
  { value: '2', label: 'Moderate Threat (CR 5-10)' },
  { value: '3', label: 'Major Threat (CR 11-16)' },
  { value: '4', label: 'Legendary Threat (CR 17+)' },
];

const ARCHETYPES = [
  { value: 'any', label: 'Any' },
  { value: 'mastermind', label: 'Mastermind' },
  { value: 'brute', label: 'Brute/Enforcer' },
  { value: 'corruptor', label: 'Corruptor' },
  { value: 'zealot', label: 'Zealot/Fanatic' },
  { value: 'tyrant', label: 'Tyrant/Conqueror' },
  { value: 'trickster', label: 'Trickster' },
  { value: 'monster', label: 'Monster/Beast' },
  { value: 'fallen-hero', label: 'Fallen Hero' },
  { value: 'dark-sorcerer', label: 'Dark Sorcerer' },
  { value: 'crime-lord', label: 'Crime Lord' },
  { value: 'cult-leader', label: 'Cult Leader' },
  { value: 'mad-scientist', label: 'Mad Scientist' },
];

const RACES = [
  { value: 'any', label: 'Any' },
  { value: 'human', label: 'Human' },
  { value: 'elf', label: 'Elf' },
  { value: 'dwarf', label: 'Dwarf' },
  { value: 'orc', label: 'Orc' },
  { value: 'dragon', label: 'Dragon' },
  { value: 'demon', label: 'Demon/Devil' },
  { value: 'undead', label: 'Undead' },
  { value: 'aberration', label: 'Aberration' },
  { value: 'construct', label: 'Construct' },
  { value: 'fey', label: 'Fey' },
  { value: 'giant', label: 'Giant' },
  { value: 'vampire', label: 'Vampire' },
  { value: 'lich', label: 'Lich' },
  { value: 'other', label: 'Other' },
];

const MOTIVATIONS = [
  { value: 'any', label: 'Any' },
  { value: 'power', label: 'Power/Domination' },
  { value: 'revenge', label: 'Revenge' },
  { value: 'greed', label: 'Greed/Wealth' },
  { value: 'ideology', label: 'Ideology/Faith' },
  { value: 'survival', label: 'Survival' },
  { value: 'love', label: 'Love/Obsession' },
  { value: 'knowledge', label: 'Knowledge' },
  { value: 'chaos', label: 'Chaos/Destruction' },
  { value: 'justice', label: 'Twisted Justice' },
  { value: 'immortality', label: 'Fear of Death' },
  { value: 'legacy', label: 'Legacy/Immortality' },
];

const METHODS = [
  { value: 'any', label: 'Any' },
  { value: 'manipulative', label: 'Manipulative/Subtle' },
  { value: 'brutal', label: 'Brutal/Direct' },
  { value: 'calculated', label: 'Calculated/Strategic' },
  { value: 'chaotic', label: 'Chaotic/Unpredictable' },
  { value: 'political', label: 'Political/Social Influence' },
  { value: 'magical', label: 'Magical/Arcane' },
  { value: 'militaristic', label: 'Militaristic' },
  { value: 'criminal', label: 'Criminal Network' },
  { value: 'psychological', label: 'Psychological Warfare' },
  { value: 'scientific', label: 'Scientific/Technological' },
];

const SCOPES = [
  { value: 'local', label: 'Local (single location)' },
  { value: 'regional', label: 'Regional (multiple settlements)' },
  { value: 'national', label: 'National (kingdom-wide)' },
  { value: 'international', label: 'International (multi-nation)' },
  { value: 'world', label: 'World-threatening' },
  { value: 'planar', label: 'Planar/Cosmic' },
];

export default function VillainForgeDialog({ open, onOpenChange, campaignId, prefillName }: VillainForgeDialogProps) {
  const [villainName, setVillainName] = useState('');

  useEffect(() => {
    if (prefillName && open) {
      setVillainName(prefillName);
    }
  }, [prefillName, open]);
  const [concept, setConcept] = useState('');
  const [threatLevel, setThreatLevel] = useState('1');
  const [archetype, setArchetype] = useState('any');
  const [race, setRace] = useState('any');
  const [motivation, setMotivation] = useState('any');
  const [methods, setMethods] = useState('any');
  const [scope, setScope] = useState('local');

  const [includePhysical, setIncludePhysical] = useState(true);
  const [includePersonality, setIncludePersonality] = useState(true);
  const [includeScheme, setIncludeScheme] = useState(true);
  const [includeResources, setIncludeResources] = useState(true);
  const [includeStrengths, setIncludeStrengths] = useState(true);
  const [includeWeaknesses, setIncludeWeaknesses] = useState(true);
  const [includeBackstory, setIncludeBackstory] = useState(true);
  const [includeAbilities, setIncludeAbilities] = useState(true);
  const [includeLair, setIncludeLair] = useState(true);
  const [includeLieutenants, setIncludeLieutenants] = useState(true);
  const [respectCodex, setRespectCodex] = useState(true);

  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const router = useRouter();
  const { refresh: refreshCount } = useGenerationCount();

  const handleGenerate = async (surpriseMe: boolean = false) => {
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

      const body: any = {
        campaignId,
        tier: parseInt(threatLevel),
        respectCodex,
      };

      if (!surpriseMe) {
        if (villainName) body.name = villainName;
        if (concept) body.concept = concept;
        if (archetype !== 'any') body.archetype = archetype;
        if (race !== 'any') body.race = race;
        if (motivation !== 'any') body.motivation = motivation;
        if (methods !== 'any') body.methods = methods;
        body.scope = scope;
      }

      body.includeDetails = {
        physical: includePhysical,
        personality: includePersonality,
        scheme: includeScheme,
        resources: includeResources,
        strengths: includeStrengths,
        weaknesses: includeWeaknesses,
        backstory: includeBackstory,
        abilities: includeAbilities,
        lair: includeLair,
        lieutenants: includeLieutenants,
      };

      const response = await fetch('/api/ai/forge/villain', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(body),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to generate villain');
      }

      toast({
        title: 'Villain generated',
        description: 'Your villain has been saved to Memory.',
      });

      // Refresh the generation count after successful save (trigger auto-increments in DB)
      await refreshCount();

      onOpenChange(false);
      router.push('/app/memory');
    } catch (error) {
      console.error('Villain generation error:', error);
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
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Skull className="h-5 w-5 text-cyan-500" />
            <div>
              <DialogTitle>Villain Forge</DialogTitle>
              <DialogDescription>
                Design compelling antagonists from minions to BBEGs
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="villain-name">Villain Name (Optional)</Label>
            <Input
              id="villain-name"
              value={villainName}
              onChange={(e) => setVillainName(e.target.value)}
              placeholder="Leave empty for random name"
            />
          </div>

          <div>
            <Label htmlFor="concept">Concept (Optional)</Label>
            <Textarea
              id="concept"
              value={concept}
              onChange={(e) => setConcept(e.target.value)}
              placeholder="E.g., 'Corrupt noble with secret cult' or 'Ancient lich seeking forbidden knowledge' or 'Bandit queen with tragic past' or leave blank for random"
              rows={4}
              className="resize-none"
            />
            <p className="text-sm text-muted-foreground mt-1">
              Describe the villain's goals, methods, or backstory
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="threat-level">Threat Level</Label>
              <Select value={threatLevel} onValueChange={setThreatLevel}>
                <SelectTrigger id="threat-level">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {THREAT_LEVELS.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="archetype">Villain Archetype</Label>
              <Select value={archetype} onValueChange={setArchetype}>
                <SelectTrigger id="archetype">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ARCHETYPES.map((a) => (
                    <SelectItem key={a.value} value={a.value}>
                      {a.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="race">Race/Type (Optional)</Label>
              <Select value={race} onValueChange={setRace}>
                <SelectTrigger id="race">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {RACES.map((r) => (
                    <SelectItem key={r.value} value={r.value}>
                      {r.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="motivation">Motivation</Label>
              <Select value={motivation} onValueChange={setMotivation}>
                <SelectTrigger id="motivation">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MOTIVATIONS.map((m) => (
                    <SelectItem key={m.value} value={m.value}>
                      {m.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label htmlFor="methods">Methods & Style (Optional)</Label>
            <Select value={methods} onValueChange={setMethods}>
              <SelectTrigger id="methods">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {METHODS.map((m) => (
                  <SelectItem key={m.value} value={m.value}>
                    {m.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="scope">Scope of Influence</Label>
            <Select value={scope} onValueChange={setScope}>
              <SelectTrigger id="scope">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SCOPES.map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="mb-3 block">Include Details</Label>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="physical"
                  checked={includePhysical}
                  onCheckedChange={(checked) => setIncludePhysical(checked as boolean)}
                />
                <label htmlFor="physical" className="text-sm cursor-pointer">
                  Physical description & presence
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="personality"
                  checked={includePersonality}
                  onCheckedChange={(checked) => setIncludePersonality(checked as boolean)}
                />
                <label htmlFor="personality" className="text-sm cursor-pointer">
                  Personality & demeanor
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="scheme"
                  checked={includeScheme}
                  onCheckedChange={(checked) => setIncludeScheme(checked as boolean)}
                />
                <label htmlFor="scheme" className="text-sm cursor-pointer">
                  Evil scheme/master plan
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="resources"
                  checked={includeResources}
                  onCheckedChange={(checked) => setIncludeResources(checked as boolean)}
                />
                <label htmlFor="resources" className="text-sm cursor-pointer">
                  Resources & minions
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="strengths"
                  checked={includeStrengths}
                  onCheckedChange={(checked) => setIncludeStrengths(checked as boolean)}
                />
                <label htmlFor="strengths" className="text-sm cursor-pointer">
                  Strengths & tactics
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="weaknesses"
                  checked={includeWeaknesses}
                  onCheckedChange={(checked) => setIncludeWeaknesses(checked as boolean)}
                />
                <label htmlFor="weaknesses" className="text-sm cursor-pointer">
                  Weaknesses & vulnerabilities
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="backstory"
                  checked={includeBackstory}
                  onCheckedChange={(checked) => setIncludeBackstory(checked as boolean)}
                />
                <label htmlFor="backstory" className="text-sm cursor-pointer">
                  Backstory & tragic elements
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="abilities"
                  checked={includeAbilities}
                  onCheckedChange={(checked) => setIncludeAbilities(checked as boolean)}
                />
                <label htmlFor="abilities" className="text-sm cursor-pointer">
                  Signature abilities/powers
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="lair"
                  checked={includeLair}
                  onCheckedChange={(checked) => setIncludeLair(checked as boolean)}
                />
                <label htmlFor="lair" className="text-sm cursor-pointer">
                  Lair or base of operations
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="lieutenants"
                  checked={includeLieutenants}
                  onCheckedChange={(checked) => setIncludeLieutenants(checked as boolean)}
                />
                <label htmlFor="lieutenants" className="text-sm cursor-pointer">
                  Notable lieutenants
                </label>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="codex"
              checked={respectCodex}
              onCheckedChange={(checked) => setRespectCodex(checked as boolean)}
            />
            <label htmlFor="codex" className="text-sm cursor-pointer">
              <div>Respect Campaign Codex</div>
              <div className="text-xs text-muted-foreground">
                Generate content aligned with your campaign themes and style
              </div>
            </label>
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
              Generate Villain
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
