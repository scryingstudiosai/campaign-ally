'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Zap, Copy, Download, Save, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase/client';
import {
  DICE_OPTIONS,
  DiceType,
  SPELL_SCHOOLS,
  CHAOS_TIERS,
  ChaosTier,
  diceSides,
  downloadJson,
  copyToClipboard,
  rollDice,
} from '@/lib/forge-utils';

interface WildMagicForgeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campaignId: string;
}

export default function WildMagicForgeDialog({ open, onOpenChange, campaignId }: WildMagicForgeDialogProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [mode, setMode] = useState<'TABLE' | 'SURPRISE'>('TABLE');

  const [dice, setDice] = useState<DiceType>('d20');
  const [tableTopic, setTableTopic] = useState('');
  const [surpriseTheme, setSurpriseTheme] = useState('');
  const [tier, setTier] = useState<ChaosTier>('moderate');

  const [json, setJson] = useState<any>(null);
  const [highlightedRoll, setHighlightedRoll] = useState<number | null>(null);

  async function generateWildMagic() {
    setIsGenerating(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();

      const response = await fetch('/api/forge/wild-magic', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token || ''}`,
        },
        body: JSON.stringify({
          mode,
          dice: mode === 'TABLE' ? dice : 'd100',
          table_topic: mode === 'TABLE' ? (tableTopic || undefined) : undefined,
          surprise_theme: mode === 'SURPRISE' ? (surpriseTheme || 'SURPRISE_ME') : undefined,
          tier,
        }),
      });

      const result = await response.json();

      if (!result.success) {
        toast.error(result.error || 'Failed to generate wild magic');
        return;
      }

      setJson(result.data.json);
      setHighlightedRoll(null);
      toast.success(mode === 'TABLE' ? 'Table generated!' : 'Surge generated!');
    } catch (error) {
      console.error('Generation error:', error);
      toast.error('Failed to generate wild magic');
    } finally {
      setIsGenerating(false);
    }
  }

  async function saveToMemory() {
    if (!json) return;

    try {
      const { data, error } = await supabase.from('forge_results').insert({
        campaign_id: campaignId,
        forge_type: 'wild-magic',
        title: json.name || 'Wild Magic Table',
        description: json.description || '',
        result_json: json,
      });

      if (error) throw error;

      toast.success('Saved to Memory!');
    } catch (error: any) {
      console.error('Save error:', error);
      toast.error(error.message || 'Failed to save');
    }
  }

  function rollOnTable() {
    if (!json || !json.entries) {
      toast.error('No table to roll on');
      return;
    }

    const roll = rollDice(dice);
    setHighlightedRoll(roll);
    const entry = json.entries.find((e: any) => e.roll === roll);

    if (entry) {
      toast.success(`Rolled ${roll}: ${entry.title}`);
    }
  }

  function resetForm() {
    setMode('TABLE');
    setDice('d20');
    setTableTopic('');
    setSurpriseTheme('');
    setTier('moderate');
    setJson(null);
    setHighlightedRoll(null);
  }

  return (
    <Dialog open={open} onOpenChange={(newOpen) => {
      if (!newOpen) resetForm();
      onOpenChange(newOpen);
    }}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-cyan-500" />
            <div>
              <DialogTitle>Wild Magic</DialogTitle>
              <DialogDescription>
                Generate wild magic surges and tables
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <Tabs value={mode} onValueChange={(v) => setMode(v as 'TABLE' | 'SURPRISE')}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="TABLE">Custom Table</TabsTrigger>
            <TabsTrigger value="SURPRISE">Surprise Surge</TabsTrigger>
          </TabsList>

          <TabsContent value="TABLE" className="space-y-4 mt-4">
            <div>
              <Label htmlFor="dice">Dice Type</Label>
              <Select value={dice} onValueChange={(v) => setDice(v as DiceType)}>
                <SelectTrigger id="dice">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DICE_OPTIONS.map((d) => (
                    <SelectItem key={d} value={d}>
                      {d} ({diceSides(d)} entries)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="tableTopic">Table Topic (Optional)</Label>
              <Input
                id="tableTopic"
                placeholder="e.g., 'necromancy mishaps', 'time magic chaos'"
                value={tableTopic}
                onChange={(e) => setTableTopic(e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="tier">Chaos Tier</Label>
              <Select value={tier} onValueChange={(v) => setTier(v as ChaosTier)}>
                <SelectTrigger id="tier">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CHAOS_TIERS.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t.charAt(0).toUpperCase() + t.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </TabsContent>

          <TabsContent value="SURPRISE" className="space-y-4 mt-4">
            <div>
              <Label htmlFor="surpriseTheme">Theme (Optional)</Label>
              <Input
                id="surpriseTheme"
                placeholder="e.g., 'fire magic', 'portals', or leave blank"
                value={surpriseTheme}
                onChange={(e) => setSurpriseTheme(e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="tier2">Chaos Tier</Label>
              <Select value={tier} onValueChange={(v) => setTier(v as ChaosTier)}>
                <SelectTrigger id="tier2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CHAOS_TIERS.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t.charAt(0).toUpperCase() + t.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </TabsContent>
        </Tabs>

        <div className="flex gap-2 pt-4">
          <Button onClick={generateWildMagic} disabled={isGenerating} className="flex-1 bg-cyan-600 hover:bg-cyan-700">
            {isGenerating ? 'Generating...' : mode === 'TABLE' ? 'Generate Table' : 'Generate Surge'}
          </Button>
          {json && (
            <>
              <Button variant="outline" onClick={rollOnTable}>
                <Sparkles className="h-4 w-4 mr-2" />
                Roll
              </Button>
              <Button variant="outline" onClick={() => copyToClipboard(json)}>
                <Copy className="h-4 w-4" />
              </Button>
              <Button variant="outline" onClick={() => downloadJson(json, json.name || 'wild-magic')}>
                <Download className="h-4 w-4" />
              </Button>
              <Button variant="outline" onClick={saveToMemory}>
                <Save className="h-4 w-4" />
              </Button>
            </>
          )}
        </div>

        {json && json.entries && (
          <div className="mt-4 max-h-96 overflow-y-auto border rounded-lg p-4">
            <h3 className="font-semibold mb-2">{json.name || 'Wild Magic Table'}</h3>
            {json.description && <p className="text-sm text-muted-foreground mb-3">{json.description}</p>}
            <div className="space-y-1">
              {json.entries.map((entry: any) => (
                <div
                  key={entry.roll}
                  className={`p-2 rounded text-sm ${
                    highlightedRoll === entry.roll ? 'bg-primary/20' : 'hover:bg-muted'
                  }`}
                >
                  <span className="font-mono mr-2">{entry.roll}:</span>
                  <span className="font-medium">{entry.title}</span>
                  {entry.effect && <p className="text-xs text-muted-foreground ml-8 mt-1">{entry.effect}</p>}
                </div>
              ))}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
