'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { ForgeType } from '@/types/forge';
import { Loader2, Sparkles } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase/client';
import { RaritySlider, LootRarity } from './RaritySlider';

interface ForgeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  forgeType: ForgeType | null;
  forgeName: string;
  campaignId: string;
  onSuccess: (data: any) => void;
}

export function ForgeDialog({
  open,
  onOpenChange,
  forgeType,
  forgeName,
  campaignId,
  onSuccess,
}: ForgeDialogProps) {
  const [loading, setLoading] = useState(false);
  const [concept, setConcept] = useState('');
  const [level, setLevel] = useState('5');
  const [tier, setTier] = useState('2');
  const [size, setSize] = useState('town');
  const [rarity, setRarity] = useState('uncommon');
  const [scrollLevel, setScrollLevel] = useState('1');
  const [partyLevel, setPartyLevel] = useState('5');
  const [lootRarity, setLootRarity] = useState<LootRarity>('uncommon');
  const [includeArtObjects, setIncludeArtObjects] = useState(false);
  const [respectCodex, setRespectCodex] = useState(true);
  const { toast } = useToast();

  const handleGenerate = async (useConcept: boolean) => {
    if (!forgeType) return;
    if (useConcept && !concept.trim()) return;

    setLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        toast({
          title: 'Not logged in',
          description: 'Please sign in to use the forge.',
          variant: 'destructive',
        });
        setLoading(false);
        return;
      }

      const body: any = {
        campaignId,
        concept: useConcept && concept.trim() ? concept.trim() : 'Create something interesting and unique for my campaign',
        respectCodex,
      };

      if (forgeType === 'hero') body.level = parseInt(level);
      if (forgeType === 'villain' || forgeType === 'monster') body.tier = parseInt(tier);
      if (forgeType === 'town') body.size = size;
      if (forgeType === 'item') body.rarity = rarity;
      if (forgeType === 'scroll') body.level = parseInt(scrollLevel);
      if (forgeType === 'loot') {
        body.partyLevel = parseInt(partyLevel);
        body.rarity = lootRarity;
        body.goldOnly = lootRarity === 'gold';
        body.includeArtObjects = includeArtObjects;
      }
      if (forgeType === 'encounter-seq') body.partyLevel = parseInt(partyLevel);

      const response = await fetch(`/api/ai/forge/${forgeType}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(body),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        const errorMsg = result.error || 'Failed to generate';
        const details = result.details ? `: ${JSON.stringify(result.details)}` : '';
        throw new Error(errorMsg + details);
      }

      toast({
        title: 'Success',
        description: `${forgeName} created successfully!`,
      });

      onSuccess(result.data);
      onOpenChange(false);
      setConcept('');
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to generate. Try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await handleGenerate(true);
  };

  const handleSurpriseMe = async () => {
    await handleGenerate(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl" aria-describedby="forge-dialog-description">
        <DialogHeader>
          <DialogTitle>{forgeName}</DialogTitle>
          <DialogDescription id="forge-dialog-description">
            Describe what you want to create. Be as specific or vague as you like.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="concept">Concept (Optional)</Label>
            <Textarea
              id="concept"
              value={concept}
              onChange={(e) => setConcept(e.target.value)}
              placeholder="E.g., 'A grizzled veteran with a hidden past' or leave blank and click Surprise Me"
              rows={3}
            />
          </div>

          {forgeType === 'hero' && (
            <div className="space-y-2">
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
          )}

          {forgeType === 'villain' && (
            <div className="space-y-2">
              <Label htmlFor="tier">Tier</Label>
              <Select value={tier} onValueChange={setTier}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Tier 1 - Minion (CR 1-4)</SelectItem>
                  <SelectItem value="2">Tier 2 - Lieutenant (CR 5-10)</SelectItem>
                  <SelectItem value="3">Tier 3 - BBEG (CR 11+)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {forgeType === 'monster' && (
            <div className="space-y-2">
              <Label htmlFor="tier">Tier</Label>
              <Select value={tier} onValueChange={setTier}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Tier 1 - Common (CR 1-4)</SelectItem>
                  <SelectItem value="2">Tier 2 - Elite (CR 5-10)</SelectItem>
                  <SelectItem value="3">Tier 3 - Legendary (CR 11+)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {forgeType === 'town' && (
            <div className="space-y-2">
              <Label htmlFor="size">Size</Label>
              <Select value={size} onValueChange={setSize}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="hamlet">Hamlet</SelectItem>
                  <SelectItem value="village">Village</SelectItem>
                  <SelectItem value="town">Town</SelectItem>
                  <SelectItem value="city">City</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {forgeType === 'item' && (
            <div className="space-y-2">
              <Label htmlFor="rarity">Rarity</Label>
              <Select value={rarity} onValueChange={setRarity}>
                <SelectTrigger>
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
          )}

          {forgeType === 'scroll' && (
            <div className="space-y-2">
              <Label htmlFor="scrollLevel">Scroll Level (0-9)</Label>
              <Input
                id="scrollLevel"
                type="number"
                min="0"
                max="9"
                value={scrollLevel}
                onChange={(e) => setScrollLevel(e.target.value)}
              />
            </div>
          )}

          {forgeType === 'loot' && (
            <>
              <div className="space-y-2">
                <Label htmlFor="partyLevel">Party Level (1-20)</Label>
                <Input
                  id="partyLevel"
                  type="number"
                  min="1"
                  max="20"
                  value={partyLevel}
                  onChange={(e) => setPartyLevel(e.target.value)}
                />
              </div>

              <div className="space-y-3">
                <Label>Maximum Rarity</Label>
                <RaritySlider value={lootRarity} onChange={setLootRarity} />
              </div>

              <div className="space-y-3 pt-2">
                <div className="flex items-center space-x-2 bg-secondary/30 rounded-lg p-3">
                  <Checkbox
                    id="art-objects"
                    checked={includeArtObjects}
                    onCheckedChange={(checked) => setIncludeArtObjects(checked === true)}
                  />
                  <div className="space-y-0.5">
                    <Label
                      htmlFor="art-objects"
                      className="text-sm font-medium cursor-pointer"
                    >
                      Include Art Objects
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Add decorative treasures like gems and sculptures
                    </p>
                  </div>
                </div>
              </div>
            </>
          )}

          {forgeType === 'encounter-seq' && (
            <div className="space-y-2">
              <Label htmlFor="partyLevel">Party Level (1-20)</Label>
              <Input
                id="partyLevel"
                type="number"
                min="1"
                max="20"
                value={partyLevel}
                onChange={(e) => setPartyLevel(e.target.value)}
              />
            </div>
          )}

          <div className="space-y-3 pt-2 border-t">
            <div className="flex items-center space-x-2 bg-secondary/30 rounded-lg p-3 mt-3">
              <Checkbox
                id="respect-codex"
                checked={respectCodex}
                onCheckedChange={(checked) => setRespectCodex(checked === true)}
              />
              <div className="space-y-0.5">
                <Label
                  htmlFor="respect-codex"
                  className="text-sm font-medium cursor-pointer"
                >
                  Respect Codex
                </Label>
                <p className="text-xs text-muted-foreground">
                  Generate content aligned with your campaign themes and style
                </p>
              </div>
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <Button type="submit" disabled={loading || !concept.trim()} className="flex-1">
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Weaving the Weave...
                </>
              ) : (
                'Generate'
              )}
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={handleSurpriseMe}
              disabled={loading}
              className="flex-1"
            >
              <Sparkles className="h-4 w-4 mr-2" />
              Surprise Me
            </Button>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
