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
import { Sparkles, Copy, Save, RefreshCw, Loader2, Wand2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase/client';
import { useGenerationLimit } from '@/hooks/useGenerationLimit';
import { GenerationLimitModal } from './GenerationLimitModal';
import { useGenerationCount } from '@/contexts/GenerationCountContext';

interface ItemForgeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campaignId: string;
}

interface ItemResult {
  name: string;
  rarity: string;
  attunement: boolean;
  itemType: string;
  effect: string;
  charges?: number | null;
  recharge?: string | null;
  history: string;
  curse?: string | null;
  flair: string;
}

export default function ItemForgeDialog({ open, onOpenChange, campaignId }: ItemForgeDialogProps) {
  const [itemName, setItemName] = useState('');
  const [concept, setConcept] = useState('');
  const [itemType, setItemType] = useState('any');
  const [rarity, setRarity] = useState('uncommon');
  const [attunement, setAttunement] = useState('no');
  const [slot, setSlot] = useState('any');
  const [powerLevel, setPowerLevel] = useState('minor');
  const [personality, setPersonality] = useState('none');
  const [effectType, setEffectType] = useState('any');
  const [theme, setTheme] = useState('any');
  const [drawback, setDrawback] = useState('none');
  const [respectCodex, setRespectCodex] = useState(true);

  const [includePhysical, setIncludePhysical] = useState(true);
  const [includeMechanics, setIncludeMechanics] = useState(true);
  const [includeUsage, setIncludeUsage] = useState(true);
  const [includeHistory, setIncludeHistory] = useState(true);
  const [includeOwners, setIncludeOwners] = useState(true);
  const [includePersonality, setIncludePersonality] = useState(true);
  const [includeSecrets, setIncludeSecrets] = useState(true);
  const [includeDrawbacks, setIncludeDrawbacks] = useState(true);
  const [includeValue, setIncludeValue] = useState(true);
  const [includeMaterial, setIncludeMaterial] = useState(true);

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ItemResult | null>(null);
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

        if (itemName.trim()) {
          detailParts.push(`name: ${itemName.trim()}`);
        }

        if (itemType !== 'any') detailParts.push(`${itemType}`);
        if (rarity !== 'uncommon') detailParts.push(`${rarity} rarity`);
        if (attunement !== 'no') detailParts.push(`attunement: ${attunement}`);
        if (slot !== 'any') detailParts.push(`slot: ${slot}`);
        if (powerLevel !== 'minor') detailParts.push(`${powerLevel} power`);
        if (personality !== 'none') detailParts.push(`${personality} personality`);
        if (effectType !== 'any') detailParts.push(`effect: ${effectType}`);
        if (theme !== 'any') detailParts.push(`theme: ${theme}`);
        if (drawback !== 'none') detailParts.push(`drawback: ${drawback}`);

        if (detailParts.length > 0) {
          if (conceptText) {
            conceptText += `. Details: ${detailParts.join(', ')}`;
          } else {
            conceptText = detailParts.join(', ');
          }
        }
      }

      if (!conceptText || conceptText.length < 3) {
        conceptText = 'Create an interesting magical item for my campaign';
      }

      const includeDetails = {
        physical: includePhysical,
        mechanics: includeMechanics,
        usage: includeUsage,
        history: includeHistory,
        owners: includeOwners,
        personality: includePersonality,
        secrets: includeSecrets,
        drawbacks: includeDrawbacks,
        value: includeValue,
        material: includeMaterial,
      };

      const payload: any = {
        campaignId,
        concept: conceptText,
        rarity: surpriseMe ? undefined : rarity,
        respectCodex,
        includeDetails,
      };

      const response = await fetch('/api/ai/forge/item', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to generate item');
      }

      setResult(data.result);
      toast({
        title: 'Item generated',
        description: 'Your magical item is ready!',
      });
    } catch (error: any) {
      console.error('Item generation error:', error);
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

    const text = `**${result.name}**\n${result.rarity}${result.attunement ? ' (Requires Attunement)' : ''}\n\n**Effect:** ${result.effect}\n\n**History:** ${result.history}${result.curse ? `\n\n**Curse:** ${result.curse}` : ''}`;

    navigator.clipboard.writeText(text);
    toast({
      title: 'Copied to clipboard',
      description: 'Item details copied successfully',
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
      const textContent = `${result.rarity}${result.attunement ? ' (Requires Attunement)' : ''}\n\n${result.effect}\n\n${result.history}`;

      const insertData = {
        campaign_id: campaignId,
        type: 'item',
        title,
        text_content: textContent,
        content: result,
        forge_type: 'item',
        tags: [result.rarity, result.itemType],
      };

      const { error } = await supabase.from('memory_chunks').insert(insertData);

      if (error) throw error;

      // Refresh the generation count after successful save (trigger auto-increments in DB)
      await refreshCount();

      toast({
        title: 'Saved to memory',
        description: 'Item has been saved to your campaign memory',
      });
    } catch (error: any) {
      console.error('Save error:', error);
      toast({
        title: 'Save failed',
        description: error?.message || 'Failed to save item to memory',
        variant: 'destructive',
      });
    }
  };

  const handleClose = () => {
    setItemName('');
    setConcept('');
    setItemType('any');
    setRarity('uncommon');
    setAttunement('no');
    setSlot('any');
    setPowerLevel('minor');
    setPersonality('none');
    setEffectType('any');
    setTheme('any');
    setDrawback('none');
    setResult(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Wand2 className="h-5 w-5 text-cyan-500" />
            <DialogTitle>Item Forge</DialogTitle>
          </div>
          <DialogDescription>
            Craft magical items with history and mechanical effects
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="itemName">Item Name (Optional)</Label>
            <Input
              id="itemName"
              placeholder="Leave empty for random name"
              value={itemName}
              onChange={(e) => setItemName(e.target.value)}
              disabled={loading}
            />
          </div>

          <div>
            <Label htmlFor="concept">Concept (Optional)</Label>
            <Textarea
              id="concept"
              placeholder="E.g., 'Ancient sword that glows near undead' or 'Ring that grants water breathing but slowly corrupts' or leave blank for random"
              value={concept}
              onChange={(e) => setConcept(e.target.value)}
              disabled={loading}
              rows={4}
              className="resize-none"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Describe the item's appearance, powers, or history
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="itemType">Item Type</Label>
              <Select value={itemType} onValueChange={setItemType} disabled={loading}>
                <SelectTrigger id="itemType">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="any">Any</SelectItem>
                  <SelectItem value="weapon-melee">Weapon (Melee)</SelectItem>
                  <SelectItem value="weapon-ranged">Weapon (Ranged)</SelectItem>
                  <SelectItem value="armor">Armor</SelectItem>
                  <SelectItem value="shield">Shield</SelectItem>
                  <SelectItem value="ring">Ring</SelectItem>
                  <SelectItem value="amulet">Amulet</SelectItem>
                  <SelectItem value="cloak">Cloak</SelectItem>
                  <SelectItem value="boots">Boots</SelectItem>
                  <SelectItem value="gloves">Gloves</SelectItem>
                  <SelectItem value="belt">Belt</SelectItem>
                  <SelectItem value="helmet">Helmet</SelectItem>
                  <SelectItem value="wand">Wand</SelectItem>
                  <SelectItem value="staff">Staff</SelectItem>
                  <SelectItem value="rod">Rod</SelectItem>
                  <SelectItem value="wondrous">Wondrous Item</SelectItem>
                  <SelectItem value="potion">Potion</SelectItem>
                  <SelectItem value="scroll">Scroll</SelectItem>
                  <SelectItem value="tool">Tool</SelectItem>
                  <SelectItem value="instrument">Instrument</SelectItem>
                  <SelectItem value="clothing">Clothing</SelectItem>
                  <SelectItem value="artifact-component">Artifact Component</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="rarity">Rarity</Label>
              <Select value={rarity} onValueChange={setRarity} disabled={loading}>
                <SelectTrigger id="rarity">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="common">Common</SelectItem>
                  <SelectItem value="uncommon">Uncommon</SelectItem>
                  <SelectItem value="rare">Rare</SelectItem>
                  <SelectItem value="very rare">Very Rare</SelectItem>
                  <SelectItem value="legendary">Legendary</SelectItem>
                  <SelectItem value="artifact">Artifact</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="attunement">Attunement Required</Label>
              <Select value={attunement} onValueChange={setAttunement} disabled={loading}>
                <SelectTrigger id="attunement">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="no">No</SelectItem>
                  <SelectItem value="yes">Yes</SelectItem>
                  <SelectItem value="yes-class">Yes (by specific class)</SelectItem>
                  <SelectItem value="yes-race">Yes (by specific race)</SelectItem>
                  <SelectItem value="yes-alignment">Yes (by alignment)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="slot">Equipment Slot</Label>
              <Select value={slot} onValueChange={setSlot} disabled={loading}>
                <SelectTrigger id="slot">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="any">Any</SelectItem>
                  <SelectItem value="head">Head</SelectItem>
                  <SelectItem value="neck">Neck</SelectItem>
                  <SelectItem value="body">Body/Chest</SelectItem>
                  <SelectItem value="hands">Hands</SelectItem>
                  <SelectItem value="finger">Finger</SelectItem>
                  <SelectItem value="feet">Feet</SelectItem>
                  <SelectItem value="waist">Waist</SelectItem>
                  <SelectItem value="back">Back/Cloak</SelectItem>
                  <SelectItem value="weapon-one">Weapon (One-Hand)</SelectItem>
                  <SelectItem value="weapon-two">Weapon (Two-Hand)</SelectItem>
                  <SelectItem value="shield">Shield</SelectItem>
                  <SelectItem value="held">Held/Wondrous</SelectItem>
                  <SelectItem value="consumable">Consumable (no slot)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="powerLevel">Power Level</Label>
              <Select value={powerLevel} onValueChange={setPowerLevel} disabled={loading}>
                <SelectTrigger id="powerLevel">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="minor">Minor Power</SelectItem>
                  <SelectItem value="moderate">Moderate Power</SelectItem>
                  <SelectItem value="major">Major Power</SelectItem>
                  <SelectItem value="legendary">Legendary Power</SelectItem>
                  <SelectItem value="sentient">Sentient/Intelligent</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="personality">Item Personality</Label>
              <Select value={personality} onValueChange={setPersonality} disabled={loading}>
                <SelectTrigger id="personality">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None/Mundane</SelectItem>
                  <SelectItem value="quirky">Quirky</SelectItem>
                  <SelectItem value="benevolent">Benevolent</SelectItem>
                  <SelectItem value="neutral">Neutral</SelectItem>
                  <SelectItem value="malevolent">Malevolent</SelectItem>
                  <SelectItem value="willful">Willful</SelectItem>
                  <SelectItem value="wise">Wise</SelectItem>
                  <SelectItem value="chaotic">Chaotic</SelectItem>
                  <SelectItem value="ancient">Ancient Consciousness</SelectItem>
                  <SelectItem value="bound-spirit">Bound Spirit</SelectItem>
                  <SelectItem value="cursed">Cursed Personality</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label htmlFor="effectType">Primary Effect Type (Optional)</Label>
            <Select value={effectType} onValueChange={setEffectType} disabled={loading}>
              <SelectTrigger id="effectType">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="any">Any</SelectItem>
                <SelectItem value="combat-bonus">Combat Bonus</SelectItem>
                <SelectItem value="defensive">Defensive Bonus</SelectItem>
                <SelectItem value="utility">Utility/Exploration</SelectItem>
                <SelectItem value="social">Social/Interaction</SelectItem>
                <SelectItem value="spellcasting">Spellcasting</SelectItem>
                <SelectItem value="movement">Movement</SelectItem>
                <SelectItem value="healing">Healing</SelectItem>
                <SelectItem value="damage">Damage</SelectItem>
                <SelectItem value="control">Control/Debuff</SelectItem>
                <SelectItem value="divination">Divination/Information</SelectItem>
                <SelectItem value="summoning">Summoning</SelectItem>
                <SelectItem value="transformation">Transformation</SelectItem>
                <SelectItem value="environmental">Environmental</SelectItem>
                <SelectItem value="protection">Protection from Type</SelectItem>
                <SelectItem value="communication">Communication</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="theme">Theme/Aesthetic (Optional)</Label>
            <Select value={theme} onValueChange={setTheme} disabled={loading}>
              <SelectTrigger id="theme">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="any">Any</SelectItem>
                <SelectItem value="fire">Elemental (Fire)</SelectItem>
                <SelectItem value="ice">Elemental (Ice)</SelectItem>
                <SelectItem value="lightning">Elemental (Lightning)</SelectItem>
                <SelectItem value="earth">Elemental (Earth)</SelectItem>
                <SelectItem value="nature">Nature/Druidic</SelectItem>
                <SelectItem value="holy">Holy/Divine</SelectItem>
                <SelectItem value="necrotic">Necrotic/Death</SelectItem>
                <SelectItem value="shadow">Shadow/Dark</SelectItem>
                <SelectItem value="celestial">Celestial/Light</SelectItem>
                <SelectItem value="arcane">Arcane/Mystical</SelectItem>
                <SelectItem value="mechanical">Mechanical/Construct</SelectItem>
                <SelectItem value="draconic">Draconic</SelectItem>
                <SelectItem value="fey">Fey/Feywild</SelectItem>
                <SelectItem value="infernal">Infernal/Demonic</SelectItem>
                <SelectItem value="aberrant">Aberrant/Eldritch</SelectItem>
                <SelectItem value="ancestral">Ancestral/Ancient</SelectItem>
                <SelectItem value="planar">Planar</SelectItem>
                <SelectItem value="technological">Technological</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="drawback">Drawback/Curse (Optional)</Label>
            <Select value={drawback} onValueChange={setDrawback} disabled={loading}>
              <SelectTrigger id="drawback">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                <SelectItem value="minor">Minor Inconvenience</SelectItem>
                <SelectItem value="personality">Personality Quirk Required</SelectItem>
                <SelectItem value="weakness">Conditional Weakness</SelectItem>
                <SelectItem value="drain">Resource Drain</SelectItem>
                <SelectItem value="corrupting">Corrupting Influence</SelectItem>
                <SelectItem value="physical">Physical Change</SelectItem>
                <SelectItem value="bound">Bound to User</SelectItem>
                <SelectItem value="danger">Attracts Danger</SelectItem>
                <SelectItem value="moral">Moral Dilemma</SelectItem>
                <SelectItem value="time">Time Limit</SelectItem>
                <SelectItem value="uncontrollable">Uncontrollable Power</SelectItem>
                <SelectItem value="conflict">Sentient Conflict</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Include Details</Label>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex items-center space-x-2">
                <Checkbox id="physical" checked={includePhysical} onCheckedChange={(checked) => setIncludePhysical(!!checked)} disabled={loading} />
                <label htmlFor="physical" className="text-sm cursor-pointer">Physical description & appearance</label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox id="mechanics" checked={includeMechanics} onCheckedChange={(checked) => setIncludeMechanics(!!checked)} disabled={loading} />
                <label htmlFor="mechanics" className="text-sm cursor-pointer">Mechanical effects & stats</label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox id="usage" checked={includeUsage} onCheckedChange={(checked) => setIncludeUsage(!!checked)} disabled={loading} />
                <label htmlFor="usage" className="text-sm cursor-pointer">Usage & activation method</label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox id="history" checked={includeHistory} onCheckedChange={(checked) => setIncludeHistory(!!checked)} disabled={loading} />
                <label htmlFor="history" className="text-sm cursor-pointer">History & origin story</label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox id="owners" checked={includeOwners} onCheckedChange={(checked) => setIncludeOwners(!!checked)} disabled={loading} />
                <label htmlFor="owners" className="text-sm cursor-pointer">Previous owners & legends</label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox id="personality-detail" checked={includePersonality} onCheckedChange={(checked) => setIncludePersonality(!!checked)} disabled={loading} />
                <label htmlFor="personality-detail" className="text-sm cursor-pointer">Personality (if sentient)</label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox id="secrets" checked={includeSecrets} onCheckedChange={(checked) => setIncludeSecrets(!!checked)} disabled={loading} />
                <label htmlFor="secrets" className="text-sm cursor-pointer">Hidden properties or secrets</label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox id="drawbacks-detail" checked={includeDrawbacks} onCheckedChange={(checked) => setIncludeDrawbacks(!!checked)} disabled={loading} />
                <label htmlFor="drawbacks-detail" className="text-sm cursor-pointer">Drawbacks or curses</label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox id="value" checked={includeValue} onCheckedChange={(checked) => setIncludeValue(!!checked)} disabled={loading} />
                <label htmlFor="value" className="text-sm cursor-pointer">Value & rarity in market</label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox id="material" checked={includeMaterial} onCheckedChange={(checked) => setIncludeMaterial(!!checked)} disabled={loading} />
                <label htmlFor="material" className="text-sm cursor-pointer">Material composition</label>
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
                  <>Generate Item</>
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
                  <p className="text-sm text-muted-foreground">{result.rarity}{result.attunement ? ' (Requires Attunement)' : ''}</p>
                </div>

                {result.effect && (
                  <div>
                    <Label className="text-cyan-500 text-xs font-semibold">Effect</Label>
                    <p className="text-sm mt-1 whitespace-pre-wrap">{result.effect}</p>
                  </div>
                )}

                {result.history && (
                  <div>
                    <Label className="text-cyan-500 text-xs font-semibold">History</Label>
                    <p className="text-sm mt-1 whitespace-pre-wrap">{result.history}</p>
                  </div>
                )}

                {result.curse && (
                  <div className="pt-2 border-t border-border/40">
                    <Label className="text-red-500 text-xs font-semibold">Curse</Label>
                    <p className="text-sm mt-1 whitespace-pre-wrap">{result.curse}</p>
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
      <GenerationLimitModal
        open={limitModalOpen}
        onOpenChange={setLimitModalOpen}
        used={limitInfo.used}
        limit={limitInfo.limit}
      />
    </Dialog>
  );
}
