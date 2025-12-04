'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Flag, Loader2, Sparkles } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase/client';

interface NationForgeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campaignId: string;
}

export default function NationForgeDialog({ open, onOpenChange, campaignId }: NationForgeDialogProps) {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const [nationName, setNationName] = useState('');
  const [concept, setConcept] = useState('');
  const [sizePower, setSizePower] = useState('small-kingdom');
  const [government, setGovernment] = useState('any');
  const [culture, setCulture] = useState('any');
  const [techLevel, setTechLevel] = useState('medieval');
  const [economy, setEconomy] = useState('any');
  const [military, setMilitary] = useState('standard');
  const [terrain, setTerrain] = useState('any');
  const [climate, setClimate] = useState('any');
  const [relations, setRelations] = useState('neutral');
  const [stability, setStability] = useState('stable');
  const [majorIssue, setMajorIssue] = useState('none');
  const [respectCodex, setRespectCodex] = useState(true);

  const [includeAll, setIncludeAll] = useState(true);

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

      const payload: any = {
        campaignId,
        name: surpriseMe ? null : (nationName.trim() || null),
        concept: surpriseMe ? 'Create something interesting and unique for my campaign' : (concept.trim() || null),
        sizePower,
        government: government === 'any' ? null : government,
        culture: culture === 'any' ? null : culture,
        techLevel,
        economy: economy === 'any' ? null : economy,
        military,
        terrain: terrain === 'any' ? null : terrain,
        climate: climate === 'any' ? null : climate,
        relations,
        stability,
        majorIssue: majorIssue === 'none' ? null : majorIssue,
        respectCodex,
      };

      const response = await fetch('/api/ai/forge/nation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to generate nation');
      }

      toast({
        title: 'Nation generated',
        description: 'Your nation has been saved to Memory.',
      });

      onOpenChange(false);
      resetForm();
    } catch (error) {
      console.error('Nation generation error:', error);
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
    setNationName('');
    setConcept('');
    setSizePower('small-kingdom');
    setGovernment('any');
    setCulture('any');
    setTechLevel('medieval');
    setEconomy('any');
    setMilitary('standard');
    setTerrain('any');
    setClimate('any');
    setRelations('neutral');
    setStability('stable');
    setMajorIssue('none');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Flag className="h-5 w-5 text-cyan-500" />
            <div>
              <DialogTitle>Nation Forge</DialogTitle>
              <DialogDescription>
                Design nations, kingdoms, and political entities
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="nationName">Nation Name (Optional)</Label>
            <Input
              id="nationName"
              placeholder="Leave empty for random name"
              value={nationName}
              onChange={(e) => setNationName(e.target.value)}
            />
          </div>

          <div>
            <Label htmlFor="concept">Concept (Optional)</Label>
            <Textarea
              id="concept"
              placeholder="E.g., 'Maritime republic ruled by merchant princes' or 'Theocratic empire spreading through conquest' or 'Decentralized tribal confederation' or leave blank"
              value={concept}
              onChange={(e) => setConcept(e.target.value)}
              rows={4}
              className="resize-none"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Describe the nation's identity, values, or current situation
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="sizePower">Size/Power</Label>
              <Select value={sizePower} onValueChange={setSizePower}>
                <SelectTrigger id="sizePower">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="city-state">City-State</SelectItem>
                  <SelectItem value="small-kingdom">Small Kingdom</SelectItem>
                  <SelectItem value="regional-power">Regional Power</SelectItem>
                  <SelectItem value="major-kingdom">Major Kingdom</SelectItem>
                  <SelectItem value="empire">Empire</SelectItem>
                  <SelectItem value="confederation">Confederation</SelectItem>
                  <SelectItem value="declining">Declining Power</SelectItem>
                  <SelectItem value="emerging">Emerging Power</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="government">Government Type</Label>
              <Select value={government} onValueChange={setGovernment}>
                <SelectTrigger id="government">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="any">Any</SelectItem>
                  <SelectItem value="monarchy-absolute">Monarchy (Absolute)</SelectItem>
                  <SelectItem value="monarchy-constitutional">Monarchy (Constitutional)</SelectItem>
                  <SelectItem value="oligarchy">Oligarchy</SelectItem>
                  <SelectItem value="theocracy">Theocracy</SelectItem>
                  <SelectItem value="democracy">Democracy</SelectItem>
                  <SelectItem value="republic">Republic</SelectItem>
                  <SelectItem value="military-dictatorship">Military Dictatorship</SelectItem>
                  <SelectItem value="magocracy">Magocracy</SelectItem>
                  <SelectItem value="tribal">Tribal Council</SelectItem>
                  <SelectItem value="feudal">Feudal System</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="culture">Primary Culture</Label>
              <Select value={culture} onValueChange={setCulture}>
                <SelectTrigger id="culture">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="any">Any</SelectItem>
                  <SelectItem value="human">Human (diverse)</SelectItem>
                  <SelectItem value="elven">Elven</SelectItem>
                  <SelectItem value="dwarven">Dwarven</SelectItem>
                  <SelectItem value="orcish">Orcish</SelectItem>
                  <SelectItem value="mixed">Mixed/Cosmopolitan</SelectItem>
                  <SelectItem value="gnomish">Gnomish</SelectItem>
                  <SelectItem value="halfling">Halfling</SelectItem>
                  <SelectItem value="dragonborn">Dragonborn</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="techLevel">Technological Level</Label>
              <Select value={techLevel} onValueChange={setTechLevel}>
                <SelectTrigger id="techLevel">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="primitive">Primitive</SelectItem>
                  <SelectItem value="medieval">Medieval</SelectItem>
                  <SelectItem value="renaissance">Renaissance</SelectItem>
                  <SelectItem value="early-industrial">Early Industrial</SelectItem>
                  <SelectItem value="magic-tech">Magic-Tech Hybrid</SelectItem>
                  <SelectItem value="advanced">Advanced (steampunk)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="economy">Primary Economy</Label>
              <Select value={economy} onValueChange={setEconomy}>
                <SelectTrigger id="economy">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="any">Any</SelectItem>
                  <SelectItem value="agriculture">Agriculture</SelectItem>
                  <SelectItem value="trade">Trade/Commerce</SelectItem>
                  <SelectItem value="mining">Mining/Resources</SelectItem>
                  <SelectItem value="magic">Magic/Arcane</SelectItem>
                  <SelectItem value="military">Military Conquest</SelectItem>
                  <SelectItem value="manufacturing">Manufacturing</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="military">Military Strength</Label>
              <Select value={military} onValueChange={setMilitary}>
                <SelectTrigger id="military">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="weak">Weak/Defenseless</SelectItem>
                  <SelectItem value="small">Small Defense Force</SelectItem>
                  <SelectItem value="standard">Standard Military</SelectItem>
                  <SelectItem value="strong">Strong Military</SelectItem>
                  <SelectItem value="elite">Elite/Legendary Forces</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="terrain">Terrain/Geography</Label>
              <Select value={terrain} onValueChange={setTerrain}>
                <SelectTrigger id="terrain">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="any">Any</SelectItem>
                  <SelectItem value="coastal">Coastal</SelectItem>
                  <SelectItem value="island">Island Chain</SelectItem>
                  <SelectItem value="mountainous">Mountainous</SelectItem>
                  <SelectItem value="plains">Plains/Grassland</SelectItem>
                  <SelectItem value="forest">Forest</SelectItem>
                  <SelectItem value="desert">Desert</SelectItem>
                  <SelectItem value="tundra">Tundra/Arctic</SelectItem>
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
                  <SelectItem value="varied">Varied by Region</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="relations">Relations with Neighbors</Label>
              <Select value={relations} onValueChange={setRelations}>
                <SelectTrigger id="relations">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="peaceful">Peaceful/Allied</SelectItem>
                  <SelectItem value="neutral">Neutral</SelectItem>
                  <SelectItem value="tense">Tense</SelectItem>
                  <SelectItem value="conflict">Active Conflict</SelectItem>
                  <SelectItem value="isolated">Isolated</SelectItem>
                  <SelectItem value="expansionist">Expansionist</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="stability">Internal Stability</Label>
              <Select value={stability} onValueChange={setStability}>
                <SelectTrigger id="stability">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="stable">Stable & Peaceful</SelectItem>
                  <SelectItem value="minor-unrest">Minor Unrest</SelectItem>
                  <SelectItem value="tensions">Regional Tensions</SelectItem>
                  <SelectItem value="civil-conflict">Civil Conflict</SelectItem>
                  <SelectItem value="revolution">Revolution Brewing</SelectItem>
                  <SelectItem value="fractured">Fractured/Divided</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label htmlFor="majorIssue">Current Major Issue (Optional)</Label>
            <Select value={majorIssue} onValueChange={setMajorIssue}>
              <SelectTrigger id="majorIssue">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                <SelectItem value="war">War (external)</SelectItem>
                <SelectItem value="civil-war">Civil War</SelectItem>
                <SelectItem value="succession">Succession Crisis</SelectItem>
                <SelectItem value="economic">Economic Collapse</SelectItem>
                <SelectItem value="famine">Famine/Plague</SelectItem>
                <SelectItem value="monster">Monster Invasion</SelectItem>
                <SelectItem value="magical">Magical Catastrophe</SelectItem>
                <SelectItem value="religious">Religious Schism</SelectItem>
                <SelectItem value="rebellion">Rebellion/Resistance</SelectItem>
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
              Generate Nation
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
