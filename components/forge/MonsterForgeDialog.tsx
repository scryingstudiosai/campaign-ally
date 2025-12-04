'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Bug, Sparkles, Loader2, HelpCircle, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { useGenerationCount } from '@/contexts/GenerationCountContext';

interface MonsterForgeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campaignId: string;
  prefillName?: string;
  prefillCR?: string | number;
  onMonsterGenerated?: (monsterData: any) => void;
}

const CHALLENGE_RATINGS = [
  { value: '1', label: 'Weak (CR 0-2)' },
  { value: '2', label: 'Standard (CR 3-7)' },
  { value: '3', label: 'Dangerous (CR 8-14)' },
  { value: '4', label: 'Deadly (CR 15+)' },
];

const MONSTER_TYPES = [
  { value: 'any', label: 'Any' },
  { value: 'beast', label: 'Beast' },
  { value: 'undead', label: 'Undead' },
  { value: 'dragon', label: 'Dragon' },
  { value: 'aberration', label: 'Aberration' },
  { value: 'construct', label: 'Construct' },
  { value: 'elemental', label: 'Elemental' },
  { value: 'fey', label: 'Fey' },
  { value: 'fiend', label: 'Fiend' },
  { value: 'giant', label: 'Giant' },
  { value: 'humanoid', label: 'Humanoid' },
  { value: 'monstrosity', label: 'Monstrosity' },
  { value: 'ooze', label: 'Ooze' },
  { value: 'plant', label: 'Plant' },
  { value: 'celestial', label: 'Celestial' },
];

const SIZES = [
  { value: 'tiny', label: 'Tiny' },
  { value: 'small', label: 'Small' },
  { value: 'medium', label: 'Medium' },
  { value: 'large', label: 'Large' },
  { value: 'huge', label: 'Huge' },
  { value: 'gargantuan', label: 'Gargantuan' },
];

const ENVIRONMENTS = [
  { value: 'any', label: 'Any' },
  { value: 'forest', label: 'Forest/Woodland' },
  { value: 'mountains', label: 'Mountains' },
  { value: 'underground', label: 'Underground/Caves' },
  { value: 'swamp', label: 'Swamp/Marsh' },
  { value: 'desert', label: 'Desert' },
  { value: 'ocean', label: 'Ocean/Aquatic' },
  { value: 'arctic', label: 'Arctic/Tundra' },
  { value: 'urban', label: 'Urban' },
  { value: 'planar', label: 'Planar' },
  { value: 'ruins', label: 'Ruins/Dungeons' },
  { value: 'volcanic', label: 'Volcanic' },
  { value: 'coastal', label: 'Coastal' },
];

const INTELLIGENCE_LEVELS = [
  { value: 'mindless', label: 'Mindless' },
  { value: 'animal', label: 'Animal Intelligence' },
  { value: 'low', label: 'Low Intelligence' },
  { value: 'human', label: 'Human-like' },
  { value: 'high', label: 'Highly Intelligent' },
  { value: 'genius', label: 'Genius-level' },
];

const BEHAVIORS = [
  { value: 'any', label: 'Any' },
  { value: 'aggressive', label: 'Aggressive/Territorial' },
  { value: 'ambush', label: 'Ambush Predator' },
  { value: 'pack', label: 'Pack Hunter' },
  { value: 'solitary', label: 'Solitary Hunter' },
  { value: 'defensive', label: 'Defensive/Passive' },
  { value: 'cunning', label: 'Cunning/Strategic' },
  { value: 'chaotic', label: 'Chaotic/Unpredictable' },
  { value: 'protective', label: 'Protective/Guardian' },
  { value: 'scavenger', label: 'Scavenger' },
];

const SPECIAL_TRAITS = [
  { value: 'any', label: 'Any' },
  { value: 'magical', label: 'Magical Abilities' },
  { value: 'poison', label: 'Poison/Venom' },
  { value: 'regeneration', label: 'Regeneration' },
  { value: 'flight', label: 'Flight' },
  { value: 'burrowing', label: 'Burrowing' },
  { value: 'stealth', label: 'Stealth/Camouflage' },
  { value: 'psychic', label: 'Mind Control/Psychic' },
  { value: 'shapeshifting', label: 'Shape-shifting' },
  { value: 'elemental', label: 'Elemental Affinity' },
  { value: 'phases', label: 'Multiple Forms/Phases' },
  { value: 'breath', label: 'Breath Weapon' },
  { value: 'resistance', label: 'Resistance/Immunity' },
  { value: 'legendary', label: 'Legendary Actions' },
];

const ABILITIES = [
  { value: 'str', label: 'STR' },
  { value: 'dex', label: 'DEX' },
  { value: 'con', label: 'CON' },
  { value: 'int', label: 'INT' },
  { value: 'wis', label: 'WIS' },
  { value: 'cha', label: 'CHA' },
];

const SKILLS = [
  { value: 'acrobatics', label: 'Acrobatics (Dex)', ability: 'dex' },
  { value: 'animal_handling', label: 'Animal Handling (Wis)', ability: 'wis' },
  { value: 'arcana', label: 'Arcana (Int)', ability: 'int' },
  { value: 'athletics', label: 'Athletics (Str)', ability: 'str' },
  { value: 'deception', label: 'Deception (Cha)', ability: 'cha' },
  { value: 'history', label: 'History (Int)', ability: 'int' },
  { value: 'insight', label: 'Insight (Wis)', ability: 'wis' },
  { value: 'intimidation', label: 'Intimidation (Cha)', ability: 'cha' },
  { value: 'investigation', label: 'Investigation (Int)', ability: 'int' },
  { value: 'medicine', label: 'Medicine (Wis)', ability: 'wis' },
  { value: 'nature', label: 'Nature (Int)', ability: 'int' },
  { value: 'perception', label: 'Perception (Wis)', ability: 'wis' },
  { value: 'performance', label: 'Performance (Cha)', ability: 'cha' },
  { value: 'persuasion', label: 'Persuasion (Cha)', ability: 'cha' },
  { value: 'religion', label: 'Religion (Int)', ability: 'int' },
  { value: 'sleight_of_hand', label: 'Sleight of Hand (Dex)', ability: 'dex' },
  { value: 'stealth', label: 'Stealth (Dex)', ability: 'dex' },
  { value: 'survival', label: 'Survival (Wis)', ability: 'wis' },
];

const DAMAGE_TYPES = [
  'Bludgeoning', 'Piercing', 'Slashing', 'Fire', 'Cold', 'Lightning',
  'Thunder', 'Acid', 'Poison', 'Necrotic', 'Radiant', 'Psychic', 'Force'
];

const CONDITION_TYPES = [
  'Blinded', 'Charmed', 'Deafened', 'Exhaustion', 'Frightened', 'Grappled',
  'Incapacitated', 'Invisible', 'Paralyzed', 'Petrified', 'Poisoned',
  'Prone', 'Restrained', 'Stunned', 'Unconscious'
];

export default function MonsterForgeDialog({ open, onOpenChange, campaignId, prefillName, prefillCR, onMonsterGenerated }: MonsterForgeDialogProps) {
  const [monsterName, setMonsterName] = useState(prefillName || '');
  const [concept, setConcept] = useState('');
  const [challengeRating, setChallengeRating] = useState(prefillCR?.toString() || '2');

  useEffect(() => {
    if (prefillName) setMonsterName(prefillName);
    if (prefillCR) setChallengeRating(prefillCR.toString());
  }, [prefillName, prefillCR]);
  const [monsterType, setMonsterType] = useState('any');
  const [size, setSize] = useState('medium');
  const [environment, setEnvironment] = useState('any');
  const [intelligence, setIntelligence] = useState('animal');
  const [behavior, setBehavior] = useState('any');
  const [specialTrait, setSpecialTrait] = useState('any');

  const [includePhysical, setIncludePhysical] = useState(true);
  const [includeBehavior, setIncludeBehavior] = useState(true);
  const [includeCombat, setIncludeCombat] = useState(true);
  const [includeAbilities, setIncludeAbilities] = useState(true);
  const [includeHabitat, setIncludeHabitat] = useState(true);
  const [includeWeaknesses, setIncludeWeaknesses] = useState(true);
  const [includeLore, setIncludeLore] = useState(true);
  const [includeTreasure, setIncludeTreasure] = useState(true);
  const [includeStatBlock, setIncludeStatBlock] = useState(true);
  const [respectCodex, setRespectCodex] = useState(true);

  const [savingThrows, setSavingThrows] = useState<string[]>([]);
  const [skills, setSkills] = useState<string[]>([]);
  const [damageResistances, setDamageResistances] = useState<string[]>([]);
  const [damageImmunities, setDamageImmunities] = useState<string[]>([]);
  const [damageVulnerabilities, setDamageVulnerabilities] = useState<string[]>([]);
  const [conditionImmunities, setConditionImmunities] = useState<string[]>([]);
  const [senses, setSenses] = useState('');
  const [languages, setLanguages] = useState('');

  const [isLegendary, setIsLegendary] = useState(false);
  const [legendaryActionsPerRound, setLegendaryActionsPerRound] = useState(3);

  const [isSpellcaster, setIsSpellcaster] = useState(false);
  const [spellcastingType, setSpellcastingType] = useState<'standard' | 'innate'>('standard');
  const [spellcastingAbility, setSpellcastingAbility] = useState<'int' | 'wis' | 'cha'>('int');
  const [casterLevel, setCasterLevel] = useState(5);

  const [hasLair, setHasLair] = useState(false);
  const [lairInitiative, setLairInitiative] = useState(20);

  const [hasRegionalEffects, setHasRegionalEffects] = useState(false);

  const [useSmartDefaults, setUseSmartDefaults] = useState(true);
  const [accordionValue, setAccordionValue] = useState<string[]>(['basic-info', 'content']);

  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const router = useRouter();
  const { refresh: refreshCount } = useGenerationCount();

  const tier = parseInt(challengeRating);
  const canBeLegendary = tier >= 2;
  const canHaveLair = tier >= 3 && isLegendary;

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
        tier: parseInt(challengeRating),
        respectCodex,
        useSmartDefaults,
      };

      if (!surpriseMe) {
        if (monsterName) body.name = monsterName;
        if (concept) body.concept = concept;
        if (monsterType !== 'any') body.monsterType = monsterType;
        body.size = size;
        if (environment !== 'any') body.environment = environment;
        body.intelligence = intelligence;
        if (behavior !== 'any') body.behavior = behavior;
        if (specialTrait !== 'any') body.specialTrait = specialTrait;
      }

      body.includeDetails = {
        physical: includePhysical,
        behavior: includeBehavior,
        combat: includeCombat,
        abilities: includeAbilities,
        habitat: includeHabitat,
        weaknesses: includeWeaknesses,
        lore: includeLore,
        treasure: includeTreasure,
        statBlock: includeStatBlock,
      };

      if (savingThrows.length > 0) body.savingThrows = savingThrows;
      if (skills.length > 0) body.skills = skills;
      if (damageResistances.length > 0) body.damageResistances = damageResistances;
      if (damageImmunities.length > 0) body.damageImmunities = damageImmunities;
      if (damageVulnerabilities.length > 0) body.damageVulnerabilities = damageVulnerabilities;
      if (conditionImmunities.length > 0) body.conditionImmunities = conditionImmunities;
      if (senses.trim()) body.senses = senses.trim();
      if (languages.trim()) body.languages = languages.trim();

      if (isLegendary && canBeLegendary) {
        body.isLegendary = true;
        body.legendaryActionsPerRound = legendaryActionsPerRound;
      }

      if (isSpellcaster) {
        body.isSpellcaster = true;
        body.spellcastingType = spellcastingType;
        body.spellcastingAbility = spellcastingAbility;
        body.casterLevel = casterLevel;
      }

      if (hasLair && canHaveLair) {
        body.hasLair = true;
        body.lairInitiative = lairInitiative;
      }

      if (hasRegionalEffects && hasLair && canHaveLair) {
        body.hasRegionalEffects = true;
      }

      const response = await fetch('/api/ai/forge/monster', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(body),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to generate monster');
      }

      if (onMonsterGenerated && result.data) {
        // If callback provided, use it instead of navigating
        onMonsterGenerated(result.data);
        toast({
          title: 'Stat block generated',
          description: 'Combat statistics have been added.',
        });
      } else {
        // Default behavior: save to memory and navigate
        // Refresh the generation count after successful save (trigger auto-increments in DB)
        await refreshCount();

        toast({
          title: 'Monster generated',
          description: 'Your monster has been saved to Memory.',
        });
        router.push('/app/memory');
      }

      onOpenChange(false);
    } catch (error) {
      console.error('Monster generation error:', error);
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
            <Bug className="h-5 w-5 text-cyan-500" />
            <div>
              <DialogTitle>Monster Forge</DialogTitle>
              <DialogDescription>
                Generate unique creatures with custom traits and lore
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="sticky top-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 z-10 pb-4 border-b mb-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="smart-defaults"
                checked={useSmartDefaults}
                onCheckedChange={(checked) => setUseSmartDefaults(checked as boolean)}
              />
              <label htmlFor="smart-defaults" className="text-sm font-medium cursor-pointer">
                Use Smart Defaults
              </label>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <HelpCircle className="h-4 w-4 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="max-w-xs">Auto-suggest stats based on CR and monster type, including saves, skills, and resistances</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => handleGenerate(true)}
                disabled={loading}
              >
                <Sparkles className="mr-2 h-4 w-4" />
                Surprise Me
              </Button>
              <Button
                type="button"
                onClick={() => handleGenerate(false)}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  'Generate'
                )}
              </Button>
            </div>
          </div>
        </div>

        <TooltipProvider>
        <Accordion type="multiple" value={accordionValue} onValueChange={setAccordionValue} className="space-y-4">
          <AccordionItem value="basic-info" className="border rounded-lg px-4">
            <AccordionTrigger className="hover:no-underline">
              <span className="text-base font-semibold">Basic Information</span>
            </AccordionTrigger>
            <AccordionContent>
              <div className="space-y-4 pt-4">
          <div>
            <Label htmlFor="monster-name">Monster Name (Optional)</Label>
            <Input
              id="monster-name"
              value={monsterName}
              onChange={(e) => setMonsterName(e.target.value)}
              placeholder="Leave empty for random name"
            />
          </div>

          <div>
            <Label htmlFor="concept">Concept (Optional)</Label>
            <Textarea
              id="concept"
              value={concept}
              onChange={(e) => setConcept(e.target.value)}
              placeholder="E.g., 'Giant spider with crystalline webs' or 'Undead wolf pack led by wight' or 'Sentient ooze that mimics voices' or leave blank for random"
              rows={4}
              className="resize-none"
            />
            <p className="text-sm text-muted-foreground mt-1">
              Describe the creature's appearance, abilities, or nature
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="cr">Challenge Rating</Label>
              <Select value={challengeRating} onValueChange={setChallengeRating}>
                <SelectTrigger id="cr">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CHALLENGE_RATINGS.map((cr) => (
                    <SelectItem key={cr.value} value={cr.value}>
                      {cr.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="type">Monster Type</Label>
              <Select value={monsterType} onValueChange={setMonsterType}>
                <SelectTrigger id="type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MONSTER_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="size">Size</Label>
              <Select value={size} onValueChange={setSize}>
                <SelectTrigger id="size">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SIZES.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="environment">Environment</Label>
              <Select value={environment} onValueChange={setEnvironment}>
                <SelectTrigger id="environment">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ENVIRONMENTS.map((e) => (
                    <SelectItem key={e.value} value={e.value}>
                      {e.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="intelligence">Creature Intelligence</Label>
              <Select value={intelligence} onValueChange={setIntelligence}>
                <SelectTrigger id="intelligence">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {INTELLIGENCE_LEVELS.map((i) => (
                    <SelectItem key={i.value} value={i.value}>
                      {i.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="behavior">Behavior Pattern</Label>
              <Select value={behavior} onValueChange={setBehavior}>
                <SelectTrigger id="behavior">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {BEHAVIORS.map((b) => (
                    <SelectItem key={b.value} value={b.value}>
                      {b.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label htmlFor="special">Special Traits (Optional)</Label>
            <Select value={specialTrait} onValueChange={setSpecialTrait}>
              <SelectTrigger id="special">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SPECIAL_TRAITS.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
              </div>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="content" className="border rounded-lg px-4">
            <AccordionTrigger className="hover:no-underline">
              <span className="text-base font-semibold">Content to Generate</span>
            </AccordionTrigger>
            <AccordionContent>
              <div className="space-y-4 pt-4">
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
                  Physical description & appearance
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="behavior-check"
                  checked={includeBehavior}
                  onCheckedChange={(checked) => setIncludeBehavior(checked as boolean)}
                />
                <label htmlFor="behavior-check" className="text-sm cursor-pointer">
                  Behavioral traits & instincts
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="combat"
                  checked={includeCombat}
                  onCheckedChange={(checked) => setIncludeCombat(checked as boolean)}
                />
                <label htmlFor="combat" className="text-sm cursor-pointer">
                  Combat abilities & tactics
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="abilities"
                  checked={includeAbilities}
                  onCheckedChange={(checked) => setIncludeAbilities(checked as boolean)}
                />
                <label htmlFor="abilities" className="text-sm cursor-pointer">
                  Special abilities & powers
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="habitat"
                  checked={includeHabitat}
                  onCheckedChange={(checked) => setIncludeHabitat(checked as boolean)}
                />
                <label htmlFor="habitat" className="text-sm cursor-pointer">
                  Habitat & ecology
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
                  id="lore"
                  checked={includeLore}
                  onCheckedChange={(checked) => setIncludeLore(checked as boolean)}
                />
                <label htmlFor="lore" className="text-sm cursor-pointer">
                  Lore & origin story
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="treasure"
                  checked={includeTreasure}
                  onCheckedChange={(checked) => setIncludeTreasure(checked as boolean)}
                />
                <label htmlFor="treasure" className="text-sm cursor-pointer">
                  Treasure & loot (if applicable)
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="statblock"
                  checked={includeStatBlock}
                  onCheckedChange={(checked) => setIncludeStatBlock(checked as boolean)}
                />
                <label htmlFor="statblock" className="text-sm cursor-pointer">
                  Stat block suggestions
                </label>
              </div>
            </div>
          </div>
              </div>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="statblock" className="border rounded-lg px-4">
            <AccordionTrigger className="hover:no-underline">
              <span className="text-base font-semibold">D&D 5e Stat Block Elements (Optional)</span>
            </AccordionTrigger>
            <AccordionContent>
              <div className="space-y-4 pt-4">
            <div className="space-y-3">
              <div>
                <Label className="text-sm font-medium mb-2 block">Saving Throws</Label>
                <div className="grid grid-cols-3 gap-2">
                  {ABILITIES.map((ability) => (
                    <div key={ability.value} className="flex items-center space-x-2">
                      <Checkbox
                        id={`save-${ability.value}`}
                        checked={savingThrows.includes(ability.value)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSavingThrows([...savingThrows, ability.value]);
                          } else {
                            setSavingThrows(savingThrows.filter(s => s !== ability.value));
                          }
                        }}
                      />
                      <label htmlFor={`save-${ability.value}`} className="text-sm cursor-pointer">
                        {ability.label}
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <Label className="text-sm font-medium mb-2 block">Skills</Label>
                <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                  {SKILLS.map((skill) => (
                    <div key={skill.value} className="flex items-center space-x-2">
                      <Checkbox
                        id={`skill-${skill.value}`}
                        checked={skills.includes(skill.value)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSkills([...skills, skill.value]);
                          } else {
                            setSkills(skills.filter(s => s !== skill.value));
                          }
                        }}
                      />
                      <label htmlFor={`skill-${skill.value}`} className="text-sm cursor-pointer">
                        {skill.label}
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium mb-2 block">Damage Resistances</Label>
                  <div className="space-y-1 max-h-32 overflow-y-auto">
                    {DAMAGE_TYPES.map((type) => (
                      <div key={type} className="flex items-center space-x-2">
                        <Checkbox
                          id={`resist-${type}`}
                          checked={damageResistances.includes(type)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setDamageResistances([...damageResistances, type]);
                            } else {
                              setDamageResistances(damageResistances.filter(d => d !== type));
                            }
                          }}
                        />
                        <label htmlFor={`resist-${type}`} className="text-xs cursor-pointer">
                          {type}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <Label className="text-sm font-medium mb-2 block">Damage Immunities</Label>
                  <div className="space-y-1 max-h-32 overflow-y-auto">
                    {DAMAGE_TYPES.map((type) => (
                      <div key={type} className="flex items-center space-x-2">
                        <Checkbox
                          id={`immune-${type}`}
                          checked={damageImmunities.includes(type)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setDamageImmunities([...damageImmunities, type]);
                            } else {
                              setDamageImmunities(damageImmunities.filter(d => d !== type));
                            }
                          }}
                        />
                        <label htmlFor={`immune-${type}`} className="text-xs cursor-pointer">
                          {type}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium mb-2 block">Damage Vulnerabilities</Label>
                  <div className="space-y-1 max-h-32 overflow-y-auto">
                    {DAMAGE_TYPES.map((type) => (
                      <div key={type} className="flex items-center space-x-2">
                        <Checkbox
                          id={`vuln-${type}`}
                          checked={damageVulnerabilities.includes(type)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setDamageVulnerabilities([...damageVulnerabilities, type]);
                            } else {
                              setDamageVulnerabilities(damageVulnerabilities.filter(d => d !== type));
                            }
                          }}
                        />
                        <label htmlFor={`vuln-${type}`} className="text-xs cursor-pointer">
                          {type}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <Label className="text-sm font-medium mb-2 block">Condition Immunities</Label>
                  <div className="space-y-1 max-h-32 overflow-y-auto">
                    {CONDITION_TYPES.map((condition) => (
                      <div key={condition} className="flex items-center space-x-2">
                        <Checkbox
                          id={`cond-${condition}`}
                          checked={conditionImmunities.includes(condition)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setConditionImmunities([...conditionImmunities, condition]);
                            } else {
                              setConditionImmunities(conditionImmunities.filter(c => c !== condition));
                            }
                          }}
                        />
                        <label htmlFor={`cond-${condition}`} className="text-xs cursor-pointer">
                          {condition}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="senses" className="text-sm font-medium">Senses</Label>
                  <Input
                    id="senses"
                    value={senses}
                    onChange={(e) => setSenses(e.target.value)}
                    placeholder="e.g., darkvision 60 ft."
                    className="mt-1"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Passive Perception will be calculated automatically
                  </p>
                </div>

                <div>
                  <Label htmlFor="languages" className="text-sm font-medium">Languages</Label>
                  <Input
                    id="languages"
                    value={languages}
                    onChange={(e) => setLanguages(e.target.value)}
                    placeholder="e.g., Common, Goblin"
                    className="mt-1"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Use "—" if the creature doesn't speak
                  </p>
                </div>
              </div>
            </div>
              </div>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="advanced" className="border rounded-lg px-4">
            <AccordionTrigger className="hover:no-underline">
              <span className="text-base font-semibold">Advanced Creature Features (Optional)</span>
            </AccordionTrigger>
            <AccordionContent>
              <div className="space-y-4 pt-4">

            {canBeLegendary && (
              <div className="space-y-3 bg-secondary/20 rounded-lg p-4">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="legendary"
                    checked={isLegendary}
                    onCheckedChange={(checked) => setIsLegendary(checked as boolean)}
                  />
                  <label htmlFor="legendary" className="text-sm font-medium cursor-pointer">
                    Legendary Creature (CR 5+)
                  </label>
                </div>

                {isLegendary && (
                  <div>
                    <Label htmlFor="legendary-actions" className="text-sm">Legendary Actions Per Round</Label>
                    <Select
                      value={legendaryActionsPerRound.toString()}
                      onValueChange={(value) => setLegendaryActionsPerRound(parseInt(value))}
                    >
                      <SelectTrigger id="legendary-actions" className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">1 Action</SelectItem>
                        <SelectItem value="2">2 Actions</SelectItem>
                        <SelectItem value="3">3 Actions</SelectItem>
                        <SelectItem value="4">4 Actions</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground mt-1">
                      AI will generate thematic legendary actions
                    </p>
                  </div>
                )}
              </div>
            )}

            <div className="space-y-3 bg-secondary/20 rounded-lg p-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="spellcaster"
                  checked={isSpellcaster}
                  onCheckedChange={(checked) => setIsSpellcaster(checked as boolean)}
                />
                <label htmlFor="spellcaster" className="text-sm font-medium cursor-pointer">
                  Spellcaster
                </label>
              </div>

              {isSpellcaster && (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label htmlFor="casting-type" className="text-sm">Spellcasting Type</Label>
                      <Select
                        value={spellcastingType}
                        onValueChange={(value) => setSpellcastingType(value as 'standard' | 'innate')}
                      >
                        <SelectTrigger id="casting-type" className="mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="standard">Standard (spell slots)</SelectItem>
                          <SelectItem value="innate">Innate (limited uses)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="casting-ability" className="text-sm">Spellcasting Ability</Label>
                      <Select
                        value={spellcastingAbility}
                        onValueChange={(value) => setSpellcastingAbility(value as 'int' | 'wis' | 'cha')}
                      >
                        <SelectTrigger id="casting-ability" className="mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="int">Intelligence</SelectItem>
                          <SelectItem value="wis">Wisdom</SelectItem>
                          <SelectItem value="cha">Charisma</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {spellcastingType === 'standard' && (
                    <div>
                      <Label htmlFor="caster-level" className="text-sm">Caster Level</Label>
                      <Select
                        value={casterLevel.toString()}
                        onValueChange={(value) => setCasterLevel(parseInt(value))}
                      >
                        <SelectTrigger id="caster-level" className="mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Array.from({ length: 20 }, (_, i) => i + 1).map((level) => (
                            <SelectItem key={level} value={level.toString()}>
                              {level}th Level
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground mt-1">
                        Spell save DC and attack bonus will be calculated automatically
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {canHaveLair && (
              <div className="space-y-3 bg-secondary/20 rounded-lg p-4">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="has-lair"
                    checked={hasLair}
                    onCheckedChange={(checked) => setHasLair(checked as boolean)}
                  />
                  <label htmlFor="has-lair" className="text-sm font-medium cursor-pointer">
                    Has Lair (CR 10+ Legendary)
                  </label>
                </div>

                {hasLair && (
                  <div className="space-y-3">
                    <div>
                      <Label htmlFor="lair-initiative" className="text-sm">Lair Initiative Count</Label>
                      <Input
                        id="lair-initiative"
                        type="number"
                        value={lairInitiative}
                        onChange={(e) => setLairInitiative(parseInt(e.target.value) || 20)}
                        min={1}
                        max={30}
                        className="mt-1"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Usually 20 (loses initiative ties)
                      </p>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="regional-effects"
                        checked={hasRegionalEffects}
                        onCheckedChange={(checked) => setHasRegionalEffects(checked as boolean)}
                      />
                      <label htmlFor="regional-effects" className="text-sm cursor-pointer">
                        Include Regional Effects
                      </label>
                    </div>
                  </div>
                )}
              </div>
            )}
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>

        <div className="flex items-center space-x-2 pt-4">
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
        </TooltipProvider>

        <DialogFooter className="flex-row justify-between sm:justify-between mt-6">
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
              Generate Monster
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
