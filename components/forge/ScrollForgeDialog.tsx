'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { Sparkles, Copy, Save, RefreshCw, Loader2, ScrollText } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase/client';
import { useGenerationLimit } from '@/hooks/useGenerationLimit';
import { GenerationLimitModal } from './GenerationLimitModal';
import { useGenerationCount } from '@/contexts/GenerationCountContext';

interface ScrollForgeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campaignId: string;
}

interface ScrollResult {
  name: string;
  level: number;
  school: string;
  castingTime: string;
  range: string;
  duration: string;
  components: string;
  description: string;
  flair: string;
}

export default function ScrollForgeDialog({ open, onOpenChange, campaignId }: ScrollForgeDialogProps) {
  const [scrollName, setScrollName] = useState('');
  const [concept, setConcept] = useState('');
  const [level, setLevel] = useState('1');
  const [scrollType, setScrollType] = useState('arcane');
  const [castingTime, setCastingTime] = useState('action');
  const [duration, setDuration] = useState('instantaneous');
  const [range, setRange] = useState('self');
  const [area, setArea] = useState('single');
  const [primaryEffect, setPrimaryEffect] = useState('any');
  const [damageType, setDamageType] = useState('none');
  const [components, setComponents] = useState('none');
  const [limitation, setLimitation] = useState('single-use');
  const [rarity, setRarity] = useState('uncommon');
  const [saveType, setSaveType] = useState('none');
  const [sideEffect, setSideEffect] = useState('none');
  const [respectCodex, setRespectCodex] = useState(true);

  const [includePhysical, setIncludePhysical] = useState(true);
  const [includeMechanics, setIncludeMechanics] = useState(true);
  const [includeActivation, setIncludeActivation] = useState(true);
  const [includeSaveDC, setIncludeSaveDC] = useState(true);
  const [includeComponents, setIncludeComponents] = useState(true);
  const [includeLore, setIncludeLore] = useState(true);
  const [includeCreator, setIncludeCreator] = useState(true);
  const [includeRisks, setIncludeRisks] = useState(true);
  const [includeValue, setIncludeValue] = useState(true);
  const [includeSchool, setIncludeSchool] = useState(true);

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ScrollResult | null>(null);
  const { toast } = useToast();
  const { checkLimit, limitModalOpen, setLimitModalOpen, limitInfo } = useGenerationLimit();
  const { refresh: refreshCount } = useGenerationCount();

  const handleGenerate = async (surpriseMe: boolean = false) => {
    // Check generation limit before proceeding
    const allowed = await checkLimit();
    if (!allowed) {
      return;
    }

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

      let conceptText = concept.trim();

      if (!surpriseMe) {
        const detailParts: string[] = [];

        if (scrollName.trim()) {
          detailParts.push(`name: ${scrollName.trim()}`);
        }

        detailParts.push(`level ${level}`);
        if (scrollType !== 'arcane') detailParts.push(`${scrollType}`);
        if (castingTime !== 'action') detailParts.push(`casting time: ${castingTime}`);
        if (duration !== 'instantaneous') detailParts.push(`duration: ${duration}`);
        if (range !== 'self') detailParts.push(`range: ${range}`);
        if (area !== 'single') detailParts.push(`area: ${area}`);
        if (primaryEffect !== 'any') detailParts.push(`effect: ${primaryEffect}`);
        if (damageType !== 'none') detailParts.push(`damage type: ${damageType}`);
        if (components !== 'none') detailParts.push(`requires: ${components}`);
        if (limitation !== 'single-use') detailParts.push(`${limitation}`);
        if (rarity !== 'uncommon') detailParts.push(`${rarity} rarity`);
        if (saveType !== 'none') detailParts.push(`save: ${saveType}`);
        if (sideEffect !== 'none') detailParts.push(`side effect: ${sideEffect}`);

        if (detailParts.length > 0) {
          if (conceptText) {
            conceptText += `. Details: ${detailParts.join(', ')}`;
          } else {
            conceptText = detailParts.join(', ');
          }
        }
      }

      if (!conceptText || conceptText.length < 3) {
        conceptText = 'Create an interesting spell scroll for my campaign';
      }

      const includeDetails = {
        physical: includePhysical,
        mechanics: includeMechanics,
        activation: includeActivation,
        saveDC: includeSaveDC,
        components: includeComponents,
        lore: includeLore,
        creator: includeCreator,
        risks: includeRisks,
        value: includeValue,
        school: includeSchool,
      };

      const payload: any = {
        campaignId,
        concept: conceptText,
        level: parseInt(level),
        respectCodex,
        includeDetails,
      };

      const response = await fetch('/api/ai/forge/scroll', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to generate scroll');
      }

      setResult(data.result);
      toast({
        title: 'Scroll generated',
        description: 'Your spell scroll is ready!',
      });
    } catch (error: any) {
      console.error('Scroll generation error:', error);
      toast({
        title: 'Generation failed',
        description: error?.message || 'Something went wrong',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (!result) return;

    const text = `**${result.name}**\nLevel ${result.level} ${result.school}\n\n**Casting Time:** ${result.castingTime}\n**Range:** ${result.range}\n**Duration:** ${result.duration}\n**Components:** ${result.components}\n\n${result.description}`;

    navigator.clipboard.writeText(text);
    toast({
      title: 'Copied to clipboard',
      description: 'Scroll details copied successfully',
    });
  };

  const handleSave = async () => {
    if (!result) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: 'Not authenticated',
          description: 'Please sign in to save',
          variant: 'destructive',
        });
        return;
      }

      const title = result.name;
      const textContent = `Level ${result.level} ${result.school}\n\nCasting Time: ${result.castingTime}\nRange: ${result.range}\nDuration: ${result.duration}\n\n${result.description}`;

      const insertData = {
        campaign_id: campaignId,
        type: 'scroll',
        title,
        text_content: textContent,
        content: result,
        forge_type: 'scroll',
        tags: [result.school, `level-${result.level}`],
      };

      const { error } = await supabase.from('memory_chunks').insert(insertData);

      if (error) throw error;

      // Refresh the generation count after successful save (trigger auto-increments in DB)
      await refreshCount();

      toast({
        title: 'Saved to memory',
        description: 'Scroll has been saved to your campaign memory',
      });
    } catch (error: any) {
      console.error('Save error:', error);
      toast({
        title: 'Save failed',
        description: error?.message || 'Failed to save scroll to memory',
        variant: 'destructive',
      });
    }
  };

  const handleClose = () => {
    setScrollName('');
    setConcept('');
    setLevel('1');
    setScrollType('arcane');
    setCastingTime('action');
    setDuration('instantaneous');
    setRange('self');
    setArea('single');
    setPrimaryEffect('any');
    setDamageType('none');
    setComponents('none');
    setLimitation('single-use');
    setRarity('uncommon');
    setSaveType('none');
    setSideEffect('none');
    setResult(null);
    onOpenChange(false);
  };

  return (
    <>
      <GenerationLimitModal
        open={limitModalOpen}
        onOpenChange={setLimitModalOpen}
        used={limitInfo.used}
        limit={limitInfo.limit}
      />
      <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <ScrollText className="h-5 w-5 text-cyan-500" />
            <DialogTitle>Scroll Forge</DialogTitle>
          </div>
          <DialogDescription>
            Design custom scrolls with balanced mechanics
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="scrollName">Scroll Name (Optional)</Label>
            <Input
              id="scrollName"
              placeholder="Leave empty for random name"
              value={scrollName}
              onChange={(e) => setScrollName(e.target.value)}
              disabled={loading}
            />
          </div>

          <div>
            <Label htmlFor="concept">Concept (Optional)</Label>
            <Textarea
              id="concept"
              placeholder="E.g., 'Ancient scroll that summons spectral guardians' or 'Ritual scroll requiring blood sacrifice' or leave blank for random"
              value={concept}
              onChange={(e) => setConcept(e.target.value)}
              disabled={loading}
              rows={4}
              className="resize-none"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Describe the scroll's effect, appearance, or requirements
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="level">Scroll Level (0-9)</Label>
              <Input
                id="level"
                type="number"
                min="0"
                max="9"
                value={level}
                onChange={(e) => setLevel(e.target.value)}
                disabled={loading}
              />
            </div>

            <div>
              <Label htmlFor="scrollType">Scroll Type</Label>
              <Select value={scrollType} onValueChange={setScrollType} disabled={loading}>
                <SelectTrigger id="scrollType">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="arcane">Arcane Spell</SelectItem>
                  <SelectItem value="divine">Divine Spell</SelectItem>
                  <SelectItem value="ritual">Ritual</SelectItem>
                  <SelectItem value="enchantment">Enchantment</SelectItem>
                  <SelectItem value="transmutation">Transmutation</SelectItem>
                  <SelectItem value="evocation">Evocation</SelectItem>
                  <SelectItem value="necromancy">Necromancy</SelectItem>
                  <SelectItem value="divination">Divination</SelectItem>
                  <SelectItem value="abjuration">Abjuration</SelectItem>
                  <SelectItem value="conjuration">Conjuration</SelectItem>
                  <SelectItem value="illusion">Illusion</SelectItem>
                  <SelectItem value="ancient">Ancient Magic</SelectItem>
                  <SelectItem value="forbidden">Forbidden Knowledge</SelectItem>
                  <SelectItem value="custom">Unique/Custom</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="castingTime">Casting Time</Label>
              <Select value={castingTime} onValueChange={setCastingTime} disabled={loading}>
                <SelectTrigger id="castingTime">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="action">Action</SelectItem>
                  <SelectItem value="bonus">Bonus Action</SelectItem>
                  <SelectItem value="reaction">Reaction</SelectItem>
                  <SelectItem value="1-minute">1 Minute</SelectItem>
                  <SelectItem value="10-minutes">10 Minutes</SelectItem>
                  <SelectItem value="1-hour">1 Hour</SelectItem>
                  <SelectItem value="8-hours">8 Hours</SelectItem>
                  <SelectItem value="ritual">Ritual (10 min)</SelectItem>
                  <SelectItem value="variable">Variable</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="duration">Duration</Label>
              <Select value={duration} onValueChange={setDuration} disabled={loading}>
                <SelectTrigger id="duration">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="instantaneous">Instantaneous</SelectItem>
                  <SelectItem value="1-round">1 Round</SelectItem>
                  <SelectItem value="1-minute">1 Minute</SelectItem>
                  <SelectItem value="10-minutes">10 Minutes</SelectItem>
                  <SelectItem value="1-hour">1 Hour</SelectItem>
                  <SelectItem value="8-hours">8 Hours</SelectItem>
                  <SelectItem value="24-hours">24 Hours</SelectItem>
                  <SelectItem value="dispelled">Until Dispelled</SelectItem>
                  <SelectItem value="conc-1min">Concentration (up to 1 min)</SelectItem>
                  <SelectItem value="conc-10min">Concentration (up to 10 min)</SelectItem>
                  <SelectItem value="conc-1hr">Concentration (up to 1 hour)</SelectItem>
                  <SelectItem value="permanent">Permanent</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="range">Range</Label>
              <Select value={range} onValueChange={setRange} disabled={loading}>
                <SelectTrigger id="range">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="self">Self</SelectItem>
                  <SelectItem value="touch">Touch</SelectItem>
                  <SelectItem value="30ft">30 feet</SelectItem>
                  <SelectItem value="60ft">60 feet</SelectItem>
                  <SelectItem value="90ft">90 feet</SelectItem>
                  <SelectItem value="120ft">120 feet</SelectItem>
                  <SelectItem value="300ft">300 feet</SelectItem>
                  <SelectItem value="1mile">1 mile</SelectItem>
                  <SelectItem value="sight">Sight</SelectItem>
                  <SelectItem value="unlimited">Unlimited</SelectItem>
                  <SelectItem value="special">Special</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="area">Area of Effect</Label>
              <Select value={area} onValueChange={setArea} disabled={loading}>
                <SelectTrigger id="area">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="single">Single Target</SelectItem>
                  <SelectItem value="5ft-radius">5-foot radius</SelectItem>
                  <SelectItem value="10ft-radius">10-foot radius</SelectItem>
                  <SelectItem value="15ft-radius">15-foot radius</SelectItem>
                  <SelectItem value="20ft-radius">20-foot radius</SelectItem>
                  <SelectItem value="30ft-radius">30-foot radius</SelectItem>
                  <SelectItem value="15ft-cone">15-foot cone</SelectItem>
                  <SelectItem value="30ft-cone">30-foot cone</SelectItem>
                  <SelectItem value="60ft-cone">60-foot cone</SelectItem>
                  <SelectItem value="30ft-line">30-foot line</SelectItem>
                  <SelectItem value="60ft-line">60-foot line</SelectItem>
                  <SelectItem value="100ft-line">100-foot line</SelectItem>
                  <SelectItem value="self-only">Self only</SelectItem>
                  <SelectItem value="multiple">Multiple targets</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="primaryEffect">Primary Effect</Label>
              <Select value={primaryEffect} onValueChange={setPrimaryEffect} disabled={loading}>
                <SelectTrigger id="primaryEffect">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="any">Any</SelectItem>
                  <SelectItem value="damage">Damage</SelectItem>
                  <SelectItem value="healing">Healing</SelectItem>
                  <SelectItem value="buff">Buff/Enhancement</SelectItem>
                  <SelectItem value="debuff">Debuff/Weakness</SelectItem>
                  <SelectItem value="control">Control/Disable</SelectItem>
                  <SelectItem value="utility">Utility</SelectItem>
                  <SelectItem value="movement">Movement</SelectItem>
                  <SelectItem value="protection">Protection</SelectItem>
                  <SelectItem value="summoning">Summoning</SelectItem>
                  <SelectItem value="information">Information</SelectItem>
                  <SelectItem value="environmental">Environmental Change</SelectItem>
                  <SelectItem value="transformation">Transformation</SelectItem>
                  <SelectItem value="creation">Creation</SelectItem>
                  <SelectItem value="banishment">Banishment</SelectItem>
                  <SelectItem value="resurrection">Resurrection</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="damageType">Damage/Healing Type</Label>
              <Select value={damageType} onValueChange={setDamageType} disabled={loading}>
                <SelectTrigger id="damageType">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  <SelectItem value="fire">Fire</SelectItem>
                  <SelectItem value="cold">Cold</SelectItem>
                  <SelectItem value="lightning">Lightning</SelectItem>
                  <SelectItem value="thunder">Thunder</SelectItem>
                  <SelectItem value="acid">Acid</SelectItem>
                  <SelectItem value="poison">Poison</SelectItem>
                  <SelectItem value="necrotic">Necrotic</SelectItem>
                  <SelectItem value="radiant">Radiant</SelectItem>
                  <SelectItem value="force">Force</SelectItem>
                  <SelectItem value="psychic">Psychic</SelectItem>
                  <SelectItem value="bludgeoning">Bludgeoning</SelectItem>
                  <SelectItem value="piercing">Piercing</SelectItem>
                  <SelectItem value="slashing">Slashing</SelectItem>
                  <SelectItem value="healing">Healing</SelectItem>
                  <SelectItem value="multiple">Multiple Types</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="components">Components Required</Label>
              <Select value={components} onValueChange={setComponents} disabled={loading}>
                <SelectTrigger id="components">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  <SelectItem value="material">Material Components</SelectItem>
                  <SelectItem value="costly">Costly Materials</SelectItem>
                  <SelectItem value="rare">Rare Materials</SelectItem>
                  <SelectItem value="blood">Blood/Sacrifice</SelectItem>
                  <SelectItem value="divine">Divine Focus</SelectItem>
                  <SelectItem value="environmental">Environmental Requirement</SelectItem>
                  <SelectItem value="location">Specific Location</SelectItem>
                  <SelectItem value="time">Time of Day/Season</SelectItem>
                  <SelectItem value="multiple-casters">Multiple Casters</SelectItem>
                  <SelectItem value="creature-type">Specific Creature Type</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="limitation">Usage Limitation</Label>
              <Select value={limitation} onValueChange={setLimitation} disabled={loading}>
                <SelectTrigger id="limitation">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="single-use">Single Use</SelectItem>
                  <SelectItem value="multiple">Multiple Uses</SelectItem>
                  <SelectItem value="daily">Rechargeable (daily)</SelectItem>
                  <SelectItem value="weekly">Rechargeable (weekly)</SelectItem>
                  <SelectItem value="charges-d6">Charges (1d6)</SelectItem>
                  <SelectItem value="charges-d4">Charges (1d4+1)</SelectItem>
                  <SelectItem value="permanent">Permanent until used</SelectItem>
                  <SelectItem value="conditional">Conditional activation</SelectItem>
                  <SelectItem value="moon">Limited by moon phase</SelectItem>
                  <SelectItem value="location-limited">Limited by location</SelectItem>
                  <SelectItem value="deteriorates">Deteriorates over time</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="rarity">Rarity/Power</Label>
              <Select value={rarity} onValueChange={setRarity} disabled={loading}>
                <SelectTrigger id="rarity">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="common">Common</SelectItem>
                  <SelectItem value="uncommon">Uncommon</SelectItem>
                  <SelectItem value="rare">Rare</SelectItem>
                  <SelectItem value="very-rare">Very Rare</SelectItem>
                  <SelectItem value="legendary">Legendary</SelectItem>
                  <SelectItem value="forbidden">Forbidden/Lost</SelectItem>
                  <SelectItem value="unique">Unique</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="saveType">Save/Attack Type</Label>
              <Select value={saveType} onValueChange={setSaveType} disabled={loading}>
                <SelectTrigger id="saveType">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  <SelectItem value="str">Strength Save</SelectItem>
                  <SelectItem value="dex">Dexterity Save</SelectItem>
                  <SelectItem value="con">Constitution Save</SelectItem>
                  <SelectItem value="int">Intelligence Save</SelectItem>
                  <SelectItem value="wis">Wisdom Save</SelectItem>
                  <SelectItem value="cha">Charisma Save</SelectItem>
                  <SelectItem value="spell-attack">Spell Attack Roll</SelectItem>
                  <SelectItem value="weapon-attack">Weapon Attack Roll</SelectItem>
                  <SelectItem value="no-save">No save/attack</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label htmlFor="sideEffect">Side Effect/Risk (Optional)</Label>
            <Select value={sideEffect} onValueChange={setSideEffect} disabled={loading}>
              <SelectTrigger id="sideEffect">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                <SelectItem value="backlash">Minor Backlash</SelectItem>
                <SelectItem value="exhaustion">Exhaustion</SelectItem>
                <SelectItem value="weakness">Temporary Weakness</SelectItem>
                <SelectItem value="drain">Resource Drain</SelectItem>
                <SelectItem value="attention">Attracts Attention</SelectItem>
                <SelectItem value="mental">Mental Strain</SelectItem>
                <SelectItem value="pain">Physical Pain</SelectItem>
                <SelectItem value="random">Random Effect</SelectItem>
                <SelectItem value="summoning-risk">Summoning Risk</SelectItem>
                <SelectItem value="planar">Planar Instability</SelectItem>
                <SelectItem value="moral">Moral Cost</SelectItem>
                <SelectItem value="time">Time Distortion</SelectItem>
                <SelectItem value="memory">Memory Loss</SelectItem>
                <SelectItem value="aging">Aging Effect</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Include Details</Label>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex items-center space-x-2">
                <Checkbox id="physical" checked={includePhysical} onCheckedChange={(checked) => setIncludePhysical(!!checked)} disabled={loading} />
                <label htmlFor="physical" className="text-sm cursor-pointer">Physical description (scroll appearance)</label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox id="mechanics" checked={includeMechanics} onCheckedChange={(checked) => setIncludeMechanics(!!checked)} disabled={loading} />
                <label htmlFor="mechanics" className="text-sm cursor-pointer">Complete mechanical effects</label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox id="activation" checked={includeActivation} onCheckedChange={(checked) => setIncludeActivation(!!checked)} disabled={loading} />
                <label htmlFor="activation" className="text-sm cursor-pointer">Activation method & requirements</label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox id="saveDC" checked={includeSaveDC} onCheckedChange={(checked) => setIncludeSaveDC(!!checked)} disabled={loading} />
                <label htmlFor="saveDC" className="text-sm cursor-pointer">Save DC and damage/healing amounts</label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox id="components-detail" checked={includeComponents} onCheckedChange={(checked) => setIncludeComponents(!!checked)} disabled={loading} />
                <label htmlFor="components-detail" className="text-sm cursor-pointer">Components & material costs</label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox id="lore" checked={includeLore} onCheckedChange={(checked) => setIncludeLore(!!checked)} disabled={loading} />
                <label htmlFor="lore" className="text-sm cursor-pointer">Lore & origin of the spell</label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox id="creator" checked={includeCreator} onCheckedChange={(checked) => setIncludeCreator(!!checked)} disabled={loading} />
                <label htmlFor="creator" className="text-sm cursor-pointer">Who created it & why</label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox id="risks" checked={includeRisks} onCheckedChange={(checked) => setIncludeRisks(!!checked)} disabled={loading} />
                <label htmlFor="risks" className="text-sm cursor-pointer">Risks & side effects</label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox id="value" checked={includeValue} onCheckedChange={(checked) => setIncludeValue(!!checked)} disabled={loading} />
                <label htmlFor="value" className="text-sm cursor-pointer">Market value & rarity</label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox id="school" checked={includeSchool} onCheckedChange={(checked) => setIncludeSchool(!!checked)} disabled={loading} />
                <label htmlFor="school" className="text-sm cursor-pointer">Academic/magical school analysis</label>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox id="respectCodex" checked={respectCodex} onCheckedChange={(checked) => setRespectCodex(!!checked)} disabled={loading} />
            <label htmlFor="respectCodex" className="text-sm cursor-pointer">
              Respect Campaign Codex
            </label>
          </div>
          <p className="text-xs text-muted-foreground">
            Generate content aligned with your campaign themes and style
          </p>

          {!result && (
            <div className="flex gap-2 justify-end pt-4">
              <Button
                onClick={handleClose}
                variant="ghost"
                disabled={loading}
              >
                Cancel
              </Button>
              <Button
                onClick={() => handleGenerate(true)}
                variant="outline"
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
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>Generate Scroll</>
                )}
              </Button>
            </div>
          )}

          {result && (
            <>
              <Separator />

              <div className="space-y-4 bg-secondary/30 rounded-lg p-4 border border-cyan-500/20">
                <div>
                  <h3 className="text-lg font-bold text-cyan-500">{result.name}</h3>
                  <p className="text-sm text-muted-foreground">Level {result.level} {result.school}</p>
                </div>

                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="font-semibold">Casting Time:</span> {result.castingTime}
                  </div>
                  <div>
                    <span className="font-semibold">Range:</span> {result.range}
                  </div>
                  <div>
                    <span className="font-semibold">Duration:</span> {result.duration}
                  </div>
                  <div>
                    <span className="font-semibold">Components:</span> {result.components}
                  </div>
                </div>

                {result.description && (
                  <div>
                    <p className="text-sm whitespace-pre-wrap">{result.description}</p>
                  </div>
                )}

                {result.flair && (
                  <div className="pt-2 border-t border-border/40">
                    <p className="text-sm italic text-muted-foreground">{result.flair}</p>
                  </div>
                )}
              </div>

              <div className="flex gap-2 justify-end">
                <Button
                  onClick={handleCopy}
                  variant="outline"
                  size="sm"
                >
                  <Copy className="h-4 w-4 mr-2" />
                  Copy
                </Button>
                <Button
                  onClick={handleSave}
                  variant="outline"
                  size="sm"
                >
                  <Save className="h-4 w-4 mr-2" />
                  Save to Memory
                </Button>
                <Button
                  onClick={() => handleGenerate(false)}
                  variant="outline"
                  size="sm"
                  disabled={loading}
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Regenerate
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
    </>
  );
}
