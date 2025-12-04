'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Home, Loader2, Sparkles } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase/client';

interface TownForgeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campaignId: string;
  prefillName?: string;
  sourceDescription?: string;
  sourceMemoryId?: string;
  contextKey?: string;
  parentName?: string;
}

export default function TownForgeDialog({ open, onOpenChange, campaignId, prefillName, sourceDescription, sourceMemoryId, contextKey, parentName }: TownForgeDialogProps) {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const [townName, setTownName] = useState('');

  useEffect(() => {
    if (prefillName && open) {
      setTownName(prefillName);
    }
  }, [prefillName, open]);
  const [concept, setConcept] = useState('');
  const [size, setSize] = useState('small-town');
  const [prosperity, setProsperity] = useState('modest');
  const [settlementType, setSettlementType] = useState('any');
  const [primaryEconomy, setPrimaryEconomy] = useState('any');
  const [location, setLocation] = useState('any');
  const [climate, setClimate] = useState('any');
  const [governance, setGovernance] = useState('any');
  const [atmosphere, setAtmosphere] = useState('any');
  const [conflict, setConflict] = useState('none');
  const [respectCodex, setRespectCodex] = useState(true);

  const [includePhysical, setIncludePhysical] = useState(true);
  const [includeLocations, setIncludeLocations] = useState(true);
  const [includeNPCs, setIncludeNPCs] = useState(true);
  const [includeDemographics, setIncludeDemographics] = useState(true);
  const [includeEvents, setIncludeEvents] = useState(true);
  const [includeGovernment, setIncludeGovernment] = useState(true);
  const [includeEconomy, setIncludeEconomy] = useState(true);
  const [includeDefense, setIncludeDefense] = useState(true);
  const [includeHooks, setIncludeHooks] = useState(true);
  const [includeFeatures, setIncludeFeatures] = useState(true);

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

      const sizeMap: Record<string, string> = {
        'hamlet': 'hamlet',
        'village': 'village',
        'small-town': 'town',
        'large-town': 'town',
        'small-city': 'city',
      };

      let conceptText = concept.trim();

      if (!surpriseMe) {
        const detailParts: string[] = [];
        if (prosperity !== 'modest') detailParts.push(`${prosperity} prosperity`);
        if (settlementType !== 'any') detailParts.push(`${settlementType} settlement`);
        if (primaryEconomy !== 'any') detailParts.push(`${primaryEconomy} economy`);
        if (location !== 'any') detailParts.push(`${location} location`);
        if (climate !== 'any') detailParts.push(`${climate} climate`);
        if (governance !== 'any') detailParts.push(`${governance} governance`);
        if (atmosphere !== 'any') detailParts.push(`${atmosphere} atmosphere`);
        if (conflict !== 'none') detailParts.push(`current issue: ${conflict}`);

        if (detailParts.length > 0) {
          if (conceptText) {
            conceptText += `. Details: ${detailParts.join(', ')}`;
          } else {
            conceptText = detailParts.join(', ');
          }
        }
      }

      if (!conceptText || conceptText.length < 3) {
        conceptText = 'Create an interesting and unique settlement for my campaign';
      }

      const payload: any = {
        campaignId,
        name: townName || undefined,
        size: sizeMap[size] || 'town',
        concept: conceptText,
        sourceDescription,
        sourceMemoryId,
        contextKey,
        parentName,
      };

      const response = await fetch('/api/ai/forge/town', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to generate town');
      }

      toast({
        title: 'Town generated',
        description: 'Your town has been saved to Memory.',
      });

      onOpenChange(false);
      resetForm();
    } catch (error) {
      console.error('Town generation error:', error);
      toast({
        title: 'Generation failed',
        description: error instanceof Error ? error.message : 'Something went wrong',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setTownName('');
    setConcept('');
    setSize('small-town');
    setProsperity('modest');
    setSettlementType('any');
    setPrimaryEconomy('any');
    setLocation('any');
    setClimate('any');
    setGovernance('any');
    setAtmosphere('any');
    setConflict('none');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Home className="h-5 w-5 text-cyan-500" />
            <div>
              <DialogTitle>Town Forge</DialogTitle>
              <DialogDescription>
                Build living settlements with NPCs and plot hooks
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="townName">Town Name (Optional)</Label>
            <Input
              id="townName"
              placeholder="Leave empty for random name"
              value={townName}
              onChange={(e) => setTownName(e.target.value)}
            />
          </div>

          <div>
            <Label htmlFor="concept">Concept (Optional)</Label>
            <Textarea
              id="concept"
              placeholder="E.g., 'Frontier mining town with tensions between miners and nobility' or 'Coastal trading hub with pirate problems' or leave blank for random"
              value={concept}
              onChange={(e) => setConcept(e.target.value)}
              rows={4}
              className="resize-none"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Describe the town's character, history, or current situation
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="size">Size</Label>
              <Select value={size} onValueChange={setSize}>
                <SelectTrigger id="size">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="hamlet">Hamlet (20-80 people)</SelectItem>
                  <SelectItem value="village">Village (80-400 people)</SelectItem>
                  <SelectItem value="small-town">Small Town (400-2,000 people)</SelectItem>
                  <SelectItem value="large-town">Large Town (2,000-10,000 people)</SelectItem>
                  <SelectItem value="small-city">Small City (10,000-25,000 people)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="prosperity">Prosperity</Label>
              <Select value={prosperity} onValueChange={setProsperity}>
                <SelectTrigger id="prosperity">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="struggling">Struggling</SelectItem>
                  <SelectItem value="poor">Poor</SelectItem>
                  <SelectItem value="modest">Modest</SelectItem>
                  <SelectItem value="prosperous">Prosperous</SelectItem>
                  <SelectItem value="wealthy">Wealthy</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="settlementType">Settlement Type</Label>
              <Select value={settlementType} onValueChange={setSettlementType}>
                <SelectTrigger id="settlementType">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="any">Any</SelectItem>
                  <SelectItem value="farming">Farming Community</SelectItem>
                  <SelectItem value="mining">Mining Town</SelectItem>
                  <SelectItem value="trading">Trading Hub</SelectItem>
                  <SelectItem value="fishing">Fishing Village</SelectItem>
                  <SelectItem value="military">Military Outpost</SelectItem>
                  <SelectItem value="religious">Religious Center</SelectItem>
                  <SelectItem value="frontier">Frontier Settlement</SelectItem>
                  <SelectItem value="border">Border Town</SelectItem>
                  <SelectItem value="crossroads">Crossroads</SelectItem>
                  <SelectItem value="university">University Town</SelectItem>
                  <SelectItem value="resort">Resort/Spa</SelectItem>
                  <SelectItem value="ghost">Ghost Town (haunted)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="primaryEconomy">Primary Economy</Label>
              <Select value={primaryEconomy} onValueChange={setPrimaryEconomy}>
                <SelectTrigger id="primaryEconomy">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="any">Any</SelectItem>
                  <SelectItem value="agriculture">Agriculture</SelectItem>
                  <SelectItem value="mining">Mining</SelectItem>
                  <SelectItem value="trade">Trade/Commerce</SelectItem>
                  <SelectItem value="fishing">Fishing</SelectItem>
                  <SelectItem value="crafting">Crafting/Artisan</SelectItem>
                  <SelectItem value="military">Military</SelectItem>
                  <SelectItem value="tourism">Tourism</SelectItem>
                  <SelectItem value="magic">Magic/Arcane</SelectItem>
                  <SelectItem value="religious">Religious Pilgrimage</SelectItem>
                  <SelectItem value="logging">Logging/Forestry</SelectItem>
                  <SelectItem value="smuggling">Smuggling/Black Market</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="location">Location/Terrain</Label>
              <Select value={location} onValueChange={setLocation}>
                <SelectTrigger id="location">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="any">Any</SelectItem>
                  <SelectItem value="forest">Forest</SelectItem>
                  <SelectItem value="plains">Plains/Grassland</SelectItem>
                  <SelectItem value="mountains">Mountains</SelectItem>
                  <SelectItem value="hills">Hills</SelectItem>
                  <SelectItem value="coastal">Coastal</SelectItem>
                  <SelectItem value="riverbank">Riverbank</SelectItem>
                  <SelectItem value="lake">Lake/Wetland</SelectItem>
                  <SelectItem value="desert">Desert Oasis</SelectItem>
                  <SelectItem value="underground">Underground</SelectItem>
                  <SelectItem value="island">Island</SelectItem>
                  <SelectItem value="cliffside">Cliffside</SelectItem>
                  <SelectItem value="valley">Valley</SelectItem>
                  <SelectItem value="crossroads-terrain">Crossroads</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="climate">Climate</Label>
              <Select value={climate} onValueChange={setClimate}>
                <SelectTrigger id="climate">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="any">Any</SelectItem>
                  <SelectItem value="temperate">Temperate</SelectItem>
                  <SelectItem value="cold">Cold/Arctic</SelectItem>
                  <SelectItem value="hot">Hot/Arid</SelectItem>
                  <SelectItem value="tropical">Tropical</SelectItem>
                  <SelectItem value="mediterranean">Mediterranean</SelectItem>
                  <SelectItem value="alpine">Alpine</SelectItem>
                  <SelectItem value="seasonal">Seasonal Extremes</SelectItem>
                  <SelectItem value="magical">Magical Weather</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="governance">Governance</Label>
              <Select value={governance} onValueChange={setGovernance}>
                <SelectTrigger id="governance">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="any">Any</SelectItem>
                  <SelectItem value="mayor">Mayor/Council</SelectItem>
                  <SelectItem value="noble">Noble Lord</SelectItem>
                  <SelectItem value="military-leader">Military Commander</SelectItem>
                  <SelectItem value="religious-leader">Religious Leader</SelectItem>
                  <SelectItem value="merchant-guild">Merchant Guild</SelectItem>
                  <SelectItem value="elder">Elder Council</SelectItem>
                  <SelectItem value="democratic">Democratic Assembly</SelectItem>
                  <SelectItem value="anarchic">Anarchic/No Leadership</SelectItem>
                  <SelectItem value="secret">Secret Ruler</SelectItem>
                  <SelectItem value="contested">Contested Leadership</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="atmosphere">Atmosphere</Label>
              <Select value={atmosphere} onValueChange={setAtmosphere}>
                <SelectTrigger id="atmosphere">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="any">Any</SelectItem>
                  <SelectItem value="peaceful">Peaceful/Welcoming</SelectItem>
                  <SelectItem value="suspicious">Suspicious/Xenophobic</SelectItem>
                  <SelectItem value="lawless">Lawless/Dangerous</SelectItem>
                  <SelectItem value="festive">Festive/Lively</SelectItem>
                  <SelectItem value="oppressed">Oppressed/Fearful</SelectItem>
                  <SelectItem value="mysterious">Mysterious</SelectItem>
                  <SelectItem value="declining">Declining/Decaying</SelectItem>
                  <SelectItem value="thriving">Thriving/Bustling</SelectItem>
                  <SelectItem value="tense">Tense/On Edge</SelectItem>
                  <SelectItem value="magical-atmos">Magical/Otherworldly</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label htmlFor="conflict">Current Conflict/Hook (Optional)</Label>
            <Select value={conflict} onValueChange={setConflict}>
              <SelectTrigger id="conflict">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                <SelectItem value="political">Political Intrigue</SelectItem>
                <SelectItem value="criminal">Criminal Activity</SelectItem>
                <SelectItem value="monster">Monster Threat</SelectItem>
                <SelectItem value="economic">Economic Crisis</SelectItem>
                <SelectItem value="religious-tension">Religious Tension</SelectItem>
                <SelectItem value="war">War Preparations</SelectItem>
                <SelectItem value="plague">Plague/Disease</SelectItem>
                <SelectItem value="disaster">Natural Disaster Aftermath</SelectItem>
                <SelectItem value="corruption">Magical Corruption</SelectItem>
                <SelectItem value="missing">Missing Persons</SelectItem>
                <SelectItem value="rival">Rival Settlement</SelectItem>
                <SelectItem value="rebellion">Internal Rebellion</SelectItem>
                <SelectItem value="secret-dark">Dark Secret</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="mb-2 block">Include Details</Label>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="includePhysical"
                  checked={includePhysical}
                  onCheckedChange={(checked) => setIncludePhysical(!!checked)}
                />
                <label htmlFor="includePhysical" className="text-sm cursor-pointer">
                  Physical description & layout
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="includeLocations"
                  checked={includeLocations}
                  onCheckedChange={(checked) => setIncludeLocations(!!checked)}
                />
                <label htmlFor="includeLocations" className="text-sm cursor-pointer">
                  Notable locations
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="includeNPCs"
                  checked={includeNPCs}
                  onCheckedChange={(checked) => setIncludeNPCs(!!checked)}
                />
                <label htmlFor="includeNPCs" className="text-sm cursor-pointer">
                  Key NPCs
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="includeDemographics"
                  checked={includeDemographics}
                  onCheckedChange={(checked) => setIncludeDemographics(!!checked)}
                />
                <label htmlFor="includeDemographics" className="text-sm cursor-pointer">
                  Demographics & culture
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="includeEvents"
                  checked={includeEvents}
                  onCheckedChange={(checked) => setIncludeEvents(!!checked)}
                />
                <label htmlFor="includeEvents" className="text-sm cursor-pointer">
                  Current events & rumors
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="includeGovernment"
                  checked={includeGovernment}
                  onCheckedChange={(checked) => setIncludeGovernment(!!checked)}
                />
                <label htmlFor="includeGovernment" className="text-sm cursor-pointer">
                  Government & laws
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="includeEconomy"
                  checked={includeEconomy}
                  onCheckedChange={(checked) => setIncludeEconomy(!!checked)}
                />
                <label htmlFor="includeEconomy" className="text-sm cursor-pointer">
                  Economy & trade goods
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="includeDefense"
                  checked={includeDefense}
                  onCheckedChange={(checked) => setIncludeDefense(!!checked)}
                />
                <label htmlFor="includeDefense" className="text-sm cursor-pointer">
                  Defense & threats
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="includeHooks"
                  checked={includeHooks}
                  onCheckedChange={(checked) => setIncludeHooks(!!checked)}
                />
                <label htmlFor="includeHooks" className="text-sm cursor-pointer">
                  Plot hooks & adventure seeds
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="includeFeatures"
                  checked={includeFeatures}
                  onCheckedChange={(checked) => setIncludeFeatures(!!checked)}
                />
                <label htmlFor="includeFeatures" className="text-sm cursor-pointer">
                  Unique features or secrets
                </label>
              </div>
            </div>
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

        <DialogFooter className="flex-row justify-between sm:justify-between gap-2">
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
              Generate Town
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
