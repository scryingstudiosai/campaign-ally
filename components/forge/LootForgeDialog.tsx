'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { Coins, Copy, Save, RefreshCw, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase/client';
import { useGenerationLimit } from '@/hooks/useGenerationLimit';
import { GenerationLimitModal } from './GenerationLimitModal';
import { useGenerationCount } from '@/contexts/GenerationCountContext';

interface LootForgeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campaignId: string;
}

interface LootResult {
  name: string;
  partyLevel: number;
  theme: string;
  totalValue: string;
  coins: {
    copper: number;
    silver: number;
    gold: number;
    platinum: number;
  };
  mundaneItems: Array<{
    item: string;
    quantity: number;
    value: string;
  }>;
  magicItems: Array<{
    item: string;
    rarity: string;
    description: string;
  }>;
  special: string | null;
  flair: string;
}

export default function LootForgeDialog({ open, onOpenChange, campaignId }: LootForgeDialogProps) {
  const [concept, setConcept] = useState('');
  const [partyLevel, setPartyLevel] = useState('5');
  const [rarity, setRarity] = useState<string>('rare');
  const [goldOnly, setGoldOnly] = useState(false);
  const [includeArtObjects, setIncludeArtObjects] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<LootResult | null>(null);
  const { toast } = useToast();
  const { checkLimit, limitModalOpen, setLimitModalOpen, limitInfo } = useGenerationLimit();
  const { refresh: refreshCount } = useGenerationCount();

  const handleGenerate = async () => {
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

      const conceptText = concept.trim() || 'Generate a balanced loot table';

      const payload: any = {
        campaignId,
        partyLevel: parseInt(partyLevel),
        concept: conceptText,
        rarity,
        goldOnly,
        includeArtObjects,
      };

      const response = await fetch('/api/ai/forge/loot', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to generate loot');
      }

      setResult(data.data);
    } catch (error: any) {
      toast({
        title: 'Generation failed',
        description: error.message || 'Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (!result) return;

    let text = `${result.name}\n`;
    text += `Level: ${result.partyLevel} | Theme: ${result.theme}\n`;
    text += `Total Value: ${result.totalValue}\n\n`;

    text += '💰 COINS:\n';
    if (result.coins.platinum > 0) text += `  ${result.coins.platinum} Platinum\n`;
    if (result.coins.gold > 0) text += `  ${result.coins.gold} Gold\n`;
    if (result.coins.silver > 0) text += `  ${result.coins.silver} Silver\n`;
    if (result.coins.copper > 0) text += `  ${result.coins.copper} Copper\n`;

    if (result.mundaneItems.length > 0) {
      text += '\n📦 MUNDANE ITEMS:\n';
      result.mundaneItems.forEach(item => {
        text += `  • ${item.item} (x${item.quantity}) - ${item.value}\n`;
      });
    }

    if (result.magicItems.length > 0) {
      text += '\n✨ MAGIC ITEMS:\n';
      result.magicItems.forEach(item => {
        text += `  • ${item.item} (${item.rarity})\n`;
        text += `    ${item.description}\n`;
      });
    }

    if (result.special) {
      text += `\n🌟 SPECIAL:\n  ${result.special}\n`;
    }

    text += `\n${result.flair}`;

    navigator.clipboard.writeText(text);
    toast({
      title: 'Copied to clipboard',
      description: 'Loot table copied successfully',
    });
  };

  const handleSave = async () => {
    if (!result) return;

    try {
      await refreshCount();

      toast({
        title: 'Saved to memory',
        description: 'Loot table has been saved to your campaign memory',
      });

      onOpenChange(false);
    } catch (error) {
      toast({
        title: 'Save failed',
        description: 'Could not save to memory',
        variant: 'destructive',
      });
    }
  };

  const handleClose = () => {
    setResult(null);
    setConcept('');
    setPartyLevel('5');
    setRarity('rare');
    setGoldOnly(false);
    setIncludeArtObjects(false);
    onOpenChange(false);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <Coins className="h-5 w-5 text-primary" />
              <DialogTitle>Loot Forge</DialogTitle>
            </div>
            <DialogDescription>
              Generate balanced treasure tables for any encounter
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {!result && (
              <>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="concept">Concept</Label>
                    <Textarea
                      id="concept"
                      placeholder="e.g., Dragon's hoard, Bandit camp loot, Ancient tomb treasures..."
                      value={concept}
                      onChange={(e) => setConcept(e.target.value)}
                      rows={3}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="partyLevel">Party Level</Label>
                      <Select value={partyLevel} onValueChange={setPartyLevel}>
                        <SelectTrigger id="partyLevel">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Array.from({ length: 20 }, (_, i) => i + 1).map((level) => (
                            <SelectItem key={level} value={level.toString()}>
                              Level {level}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="rarity">Max Magic Item Rarity</Label>
                      <Select value={rarity} onValueChange={setRarity}>
                        <SelectTrigger id="rarity">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="common">Common</SelectItem>
                          <SelectItem value="uncommon">Uncommon</SelectItem>
                          <SelectItem value="rare">Rare</SelectItem>
                          <SelectItem value="very-rare">Very Rare</SelectItem>
                          <SelectItem value="legendary">Legendary</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="goldOnly"
                        checked={goldOnly}
                        onCheckedChange={(checked) => setGoldOnly(checked as boolean)}
                      />
                      <label
                        htmlFor="goldOnly"
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                      >
                        Gold Only (no items)
                      </label>
                    </div>

                    {!goldOnly && (
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="includeArtObjects"
                          checked={includeArtObjects}
                          onCheckedChange={(checked) => setIncludeArtObjects(checked as boolean)}
                        />
                        <label
                          htmlFor="includeArtObjects"
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                        >
                          Include Art Objects (gems, jewelry, decorative treasures)
                        </label>
                      </div>
                    )}
                  </div>
                </div>

                <Button
                  onClick={() => handleGenerate()}
                  disabled={loading}
                  className="w-full"
                  size="lg"
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Coins className="mr-2 h-4 w-4" />
                      Generate Loot
                    </>
                  )}
                </Button>
              </>
            )}

            {result && (
              <div className="space-y-6">
                <div className="bg-card border border-border rounded-lg p-6 space-y-4">
                  <div>
                    <h3 className="text-2xl font-bold text-primary">{result.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      Level {result.partyLevel} • {result.theme} • Total Value: {result.totalValue}
                    </p>
                  </div>

                  <Separator />

                  <div>
                    <h4 className="text-lg font-semibold mb-2 flex items-center gap-2">
                      <Coins className="h-4 w-4" />
                      Coins
                    </h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                      {result.coins.platinum > 0 && (
                        <div className="bg-muted p-2 rounded">
                          <span className="font-bold">{result.coins.platinum}</span> Platinum
                        </div>
                      )}
                      {result.coins.gold > 0 && (
                        <div className="bg-muted p-2 rounded">
                          <span className="font-bold">{result.coins.gold}</span> Gold
                        </div>
                      )}
                      {result.coins.silver > 0 && (
                        <div className="bg-muted p-2 rounded">
                          <span className="font-bold">{result.coins.silver}</span> Silver
                        </div>
                      )}
                      {result.coins.copper > 0 && (
                        <div className="bg-muted p-2 rounded">
                          <span className="font-bold">{result.coins.copper}</span> Copper
                        </div>
                      )}
                    </div>
                  </div>

                  {result.mundaneItems.length > 0 && (
                    <>
                      <Separator />
                      <div>
                        <h4 className="text-lg font-semibold mb-2">Mundane Items</h4>
                        <ul className="space-y-1">
                          {result.mundaneItems.map((item, index) => (
                            <li key={index} className="text-sm">
                              • <span className="font-medium">{item.item}</span> (x{item.quantity}) - {item.value}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </>
                  )}

                  {result.magicItems.length > 0 && (
                    <>
                      <Separator />
                      <div>
                        <h4 className="text-lg font-semibold mb-2">Magic Items</h4>
                        <div className="space-y-2">
                          {result.magicItems.map((item, index) => (
                            <div key={index} className="bg-muted/50 p-3 rounded">
                              <div className="font-medium">
                                {item.item} <span className="text-xs text-muted-foreground">({item.rarity})</span>
                              </div>
                              <div className="text-sm text-muted-foreground mt-1">{item.description}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </>
                  )}

                  {result.special && (
                    <>
                      <Separator />
                      <div>
                        <h4 className="text-lg font-semibold mb-2">Special Treasure</h4>
                        <p className="text-sm">{result.special}</p>
                      </div>
                    </>
                  )}

                  <Separator />
                  <p className="text-sm italic text-muted-foreground">{result.flair}</p>
                </div>

                <div className="flex gap-2">
                  <Button onClick={handleCopy} variant="outline" className="flex-1">
                    <Copy className="mr-2 h-4 w-4" />
                    Copy
                  </Button>
                  <Button onClick={handleSave} className="flex-1">
                    <Save className="mr-2 h-4 w-4" />
                    Save to Memory
                  </Button>
                </div>

                <Button onClick={() => setResult(null)} variant="outline" className="w-full">
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Generate Another
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <GenerationLimitModal
        open={limitModalOpen}
        onOpenChange={setLimitModalOpen}
        used={limitInfo?.used || 0}
        limit={limitInfo?.limit || 0}
      />
    </>
  );
}
