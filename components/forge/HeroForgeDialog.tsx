'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { User, Sparkles, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { useGenerationCount } from '@/contexts/GenerationCountContext';

interface HeroForgeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campaignId: string;
}

const CLASSES = [
  { value: 'any', label: 'Any' },
  { value: 'fighter', label: 'Fighter' },
  { value: 'wizard', label: 'Wizard' },
  { value: 'rogue', label: 'Rogue' },
  { value: 'cleric', label: 'Cleric' },
  { value: 'paladin', label: 'Paladin' },
  { value: 'ranger', label: 'Ranger' },
  { value: 'bard', label: 'Bard' },
  { value: 'barbarian', label: 'Barbarian' },
  { value: 'druid', label: 'Druid' },
  { value: 'monk', label: 'Monk' },
  { value: 'sorcerer', label: 'Sorcerer' },
  { value: 'warlock', label: 'Warlock' },
  { value: 'artificer', label: 'Artificer' },
  { value: 'blood-hunter', label: 'Blood Hunter' },
  { value: 'other', label: 'Other' },
];

const BACKGROUNDS = [
  { value: 'any', label: 'Any' },
  { value: 'soldier', label: 'Soldier' },
  { value: 'noble', label: 'Noble' },
  { value: 'criminal', label: 'Criminal' },
  { value: 'folk-hero', label: 'Folk Hero' },
  { value: 'sage', label: 'Sage' },
  { value: 'acolyte', label: 'Acolyte' },
  { value: 'outlander', label: 'Outlander' },
  { value: 'entertainer', label: 'Entertainer' },
  { value: 'guild-artisan', label: 'Guild Artisan' },
  { value: 'hermit', label: 'Hermit' },
  { value: 'sailor', label: 'Sailor' },
  { value: 'urchin', label: 'Urchin' },
  { value: 'charlatan', label: 'Charlatan' },
  { value: 'knight', label: 'Knight' },
  { value: 'pirate', label: 'Pirate' },
  { value: 'spy', label: 'Spy' },
];

const RACES = [
  { value: 'any', label: 'Any' },
  { value: 'human', label: 'Human' },
  { value: 'elf', label: 'Elf' },
  { value: 'dwarf', label: 'Dwarf' },
  { value: 'halfling', label: 'Halfling' },
  { value: 'dragonborn', label: 'Dragonborn' },
  { value: 'gnome', label: 'Gnome' },
  { value: 'half-elf', label: 'Half-Elf' },
  { value: 'half-orc', label: 'Half-Orc' },
  { value: 'tiefling', label: 'Tiefling' },
  { value: 'aasimar', label: 'Aasimar' },
  { value: 'goliath', label: 'Goliath' },
  { value: 'tabaxi', label: 'Tabaxi' },
  { value: 'kenku', label: 'Kenku' },
  { value: 'firbolg', label: 'Firbolg' },
  { value: 'other', label: 'Other' },
];

const ALIGNMENTS = [
  { value: 'any', label: 'Any' },
  { value: 'lg', label: 'Lawful Good' },
  { value: 'ng', label: 'Neutral Good' },
  { value: 'cg', label: 'Chaotic Good' },
  { value: 'ln', label: 'Lawful Neutral' },
  { value: 'tn', label: 'True Neutral' },
  { value: 'cn', label: 'Chaotic Neutral' },
  { value: 'le', label: 'Lawful Evil' },
  { value: 'ne', label: 'Neutral Evil' },
  { value: 'ce', label: 'Chaotic Evil' },
];

const COMBAT_STYLES = [
  { value: 'any', label: 'Any' },
  { value: 'melee', label: 'Melee Warrior' },
  { value: 'ranged', label: 'Ranged Combatant' },
  { value: 'spellcaster-damage', label: 'Spellcaster (Damage)' },
  { value: 'spellcaster-support', label: 'Spellcaster (Support/Healer)' },
  { value: 'tank', label: 'Tank/Defender' },
  { value: 'skirmisher', label: 'Skirmisher/Mobile' },
  { value: 'versatile', label: 'Versatile/Hybrid' },
];

const PERSONALITY_TRAITS = [
  { value: 'any', label: 'Any' },
  { value: 'brave', label: 'Brave/Bold' },
  { value: 'cautious', label: 'Cautious/Strategic' },
  { value: 'compassionate', label: 'Compassionate/Kind' },
  { value: 'stern', label: 'Stern/Serious' },
  { value: 'witty', label: 'Witty/Humorous' },
  { value: 'noble', label: 'Noble/Honorable' },
  { value: 'pragmatic', label: 'Pragmatic/Practical' },
  { value: 'idealistic', label: 'Idealistic/Dreamer' },
  { value: 'hotheaded', label: 'Hot-headed/Impulsive' },
  { value: 'calculating', label: 'Calculating/Cunning' },
];

export default function HeroForgeDialog({ open, onOpenChange, campaignId }: HeroForgeDialogProps) {
  const [heroName, setHeroName] = useState('');
  const [concept, setConcept] = useState('');
  const [level, setLevel] = useState('5');
  const [heroClass, setHeroClass] = useState('any');
  const [background, setBackground] = useState('any');
  const [race, setRace] = useState('any');
  const [alignment, setAlignment] = useState('any');
  const [combatStyle, setCombatStyle] = useState('any');
  const [personality, setPersonality] = useState('any');

  const [includePhysical, setIncludePhysical] = useState(true);
  const [includePersonality, setIncludePersonality] = useState(true);
  const [includeBackground, setIncludeBackground] = useState(true);
  const [includeAbilities, setIncludeAbilities] = useState(true);
  const [includeMotivations, setIncludeMotivations] = useState(true);
  const [includeBonds, setIncludeBonds] = useState(true);
  const [includeFlaws, setIncludeFlaws] = useState(true);
  const [includeEquipment, setIncludeEquipment] = useState(true);
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
        level: parseInt(level),
        respectCodex,
      };

      if (!surpriseMe) {
        if (heroName) body.name = heroName;
        if (concept) body.concept = concept;
        if (heroClass !== 'any') body.class = heroClass;
        if (background !== 'any') body.background = background;
        if (race !== 'any') body.race = race;
        if (alignment !== 'any') body.alignment = alignment;
        if (combatStyle !== 'any') body.combatStyle = combatStyle;
        if (personality !== 'any') body.personality = personality;
      }

      body.includeDetails = {
        physical: includePhysical,
        personality: includePersonality,
        background: includeBackground,
        abilities: includeAbilities,
        motivations: includeMotivations,
        bonds: includeBonds,
        flaws: includeFlaws,
        equipment: includeEquipment,
      };

      const response = await fetch('/api/ai/forge/hero', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(body),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to generate hero');
      }

      toast({
        title: 'Hero generated',
        description: 'Your hero has been saved to Memory.',
      });

      // Refresh the generation count after successful save (trigger auto-increments in DB)
      await refreshCount();

      onOpenChange(false);
      router.push('/app/memory');
    } catch (error) {
      console.error('Hero generation error:', error);
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
            <User className="h-5 w-5 text-cyan-500" />
            <div>
              <DialogTitle>Hero Forge</DialogTitle>
              <DialogDescription>
                Generate balanced, memorable player characters or allied NPCs
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="hero-name">Hero Name (Optional)</Label>
            <Input
              id="hero-name"
              value={heroName}
              onChange={(e) => setHeroName(e.target.value)}
              placeholder="Leave empty for random name"
            />
          </div>

          <div>
            <Label htmlFor="concept">Concept (Optional)</Label>
            <Textarea
              id="concept"
              value={concept}
              onChange={(e) => setConcept(e.target.value)}
              placeholder="E.g., 'A grizzled veteran paladin seeking redemption' or 'Young elven ranger, hot-headed but loyal' or leave blank for random"
              rows={4}
              className="resize-none"
            />
            <p className="text-sm text-muted-foreground mt-1">
              Describe the hero's background, role, or personality
            </p>
          </div>

          <div>
            <Label htmlFor="level">Level (1-20)</Label>
            <Input
              id="level"
              type="number"
              min="1"
              max="20"
              value={level}
              onChange={(e) => setLevel(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="class">Class/Role</Label>
              <Select value={heroClass} onValueChange={setHeroClass}>
                <SelectTrigger id="class">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CLASSES.map((c) => (
                    <SelectItem key={c.value} value={c.value}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="background">Background</Label>
              <Select value={background} onValueChange={setBackground}>
                <SelectTrigger id="background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {BACKGROUNDS.map((b) => (
                    <SelectItem key={b.value} value={b.value}>
                      {b.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="race">Race (Optional)</Label>
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
              <Label htmlFor="alignment">Alignment Tendency</Label>
              <Select value={alignment} onValueChange={setAlignment}>
                <SelectTrigger id="alignment">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ALIGNMENTS.map((a) => (
                    <SelectItem key={a.value} value={a.value}>
                      {a.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label htmlFor="combat-style">Combat Style (Optional)</Label>
            <Select value={combatStyle} onValueChange={setCombatStyle}>
              <SelectTrigger id="combat-style">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {COMBAT_STYLES.map((cs) => (
                  <SelectItem key={cs.value} value={cs.value}>
                    {cs.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="personality">Personality Traits (Optional)</Label>
            <Select value={personality} onValueChange={setPersonality}>
              <SelectTrigger id="personality">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PERSONALITY_TRAITS.map((p) => (
                  <SelectItem key={p.value} value={p.value}>
                    {p.label}
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
                  Physical description
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="personality-check"
                  checked={includePersonality}
                  onCheckedChange={(checked) => setIncludePersonality(checked as boolean)}
                />
                <label htmlFor="personality-check" className="text-sm cursor-pointer">
                  Personality traits & ideals
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="background-check"
                  checked={includeBackground}
                  onCheckedChange={(checked) => setIncludeBackground(checked as boolean)}
                />
                <label htmlFor="background-check" className="text-sm cursor-pointer">
                  Background story hook
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="abilities"
                  checked={includeAbilities}
                  onCheckedChange={(checked) => setIncludeAbilities(checked as boolean)}
                />
                <label htmlFor="abilities" className="text-sm cursor-pointer">
                  Key abilities/specialties
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="motivations"
                  checked={includeMotivations}
                  onCheckedChange={(checked) => setIncludeMotivations(checked as boolean)}
                />
                <label htmlFor="motivations" className="text-sm cursor-pointer">
                  Motivations & goals
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="bonds"
                  checked={includeBonds}
                  onCheckedChange={(checked) => setIncludeBonds(checked as boolean)}
                />
                <label htmlFor="bonds" className="text-sm cursor-pointer">
                  Bonds & relationships
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="flaws"
                  checked={includeFlaws}
                  onCheckedChange={(checked) => setIncludeFlaws(checked as boolean)}
                />
                <label htmlFor="flaws" className="text-sm cursor-pointer">
                  Flaws or weaknesses
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="equipment"
                  checked={includeEquipment}
                  onCheckedChange={(checked) => setIncludeEquipment(checked as boolean)}
                />
                <label htmlFor="equipment" className="text-sm cursor-pointer">
                  Equipment & signature items
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
              Generate Hero
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
