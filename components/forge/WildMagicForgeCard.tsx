'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
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
  uuidv4,
} from '@/lib/forge-utils';

interface WildMagicForgeCardProps {
  campaignId: string;
}

export function WildMagicForgeCard({ campaignId }: WildMagicForgeCardProps) {
  const [isOpen, setIsOpen] = useState(false);
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

  async function saveWildMagic() {
    if (!json || !campaignId) {
      toast.error('Nothing to save');
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Not authenticated');
        return;
      }

      const { error } = await supabase.from('wild_magic_forges').insert({
        id: json.forge_id || uuidv4(),
        campaign_id: campaignId,
        user_id: user.id,
        forge_type: 'wild-magic',
        mode: json.mode,
        dice: json.dice,
        table_topic: json.table_topic,
        surprise_theme: json.surprise_theme,
        tier: json.tier,
        entries: mode === 'TABLE' ? json.entries : json.result,
      });

      if (error) throw error;

      toast.success('Wild magic saved!');
    } catch (error: any) {
      console.error('Save error:', error);
      toast.error(error.message || 'Failed to save');
    }
  }

  function rollOnTable() {
    if (mode !== 'TABLE' || !json || !json.entries) {
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
    setDice('d20');
    setTableTopic('');
    setSurpriseTheme('');
    setTier('moderate');
    setJson(null);
    setHighlightedRoll(null);
  }

  return (
    <>
      <Card
        className="group cursor-pointer hover:border-primary/50 transition-all duration-200 hover:shadow-lg hover:scale-[1.02] bg-gradient-to-br from-card to-card/50"
        onClick={() => setIsOpen(true)}
      >
        <CardHeader className="pb-3">
          <div className="flex flex-col items-center text-center space-y-3 py-4">
            <div className="p-3 bg-primary/10 rounded-lg group-hover:bg-primary/20 transition-colors shadow-lg">
              <Zap className="h-6 w-6 text-primary" />
            </div>
            <CardTitle className="text-lg font-bold group-hover:text-primary transition-colors">
              Wild Magic
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <CardDescription className="text-sm text-center">
            Generate wild magic surges and tables
          </CardDescription>
        </CardContent>
      </Card>

      <Dialog open={isOpen} onOpenChange={(open) => { setIsOpen(open); if (!open) resetForm(); }}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>⚡ Wild Magic Forge</DialogTitle>
            <DialogDescription>Generate wild magic tables or single surges</DialogDescription>
          </DialogHeader>

          <Tabs value={mode} onValueChange={(v) => setMode(v as 'TABLE' | 'SURPRISE')}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="TABLE">Table Mode</TabsTrigger>
              <TabsTrigger value="SURPRISE">Surprise Mode</TabsTrigger>
            </TabsList>

            <TabsContent value="TABLE" className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="dice">Dice *</Label>
                  <Select value={dice} onValueChange={(v) => setDice(v as DiceType)}>
                    <SelectTrigger id="dice">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {DICE_OPTIONS.map((d) => (
                        <SelectItem key={d} value={d}>
                          {d}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="tier">Chaos Tier *</Label>
                  <Select value={tier} onValueChange={(v) => setTier(v as ChaosTier)}>
                    <SelectTrigger id="tier">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CHAOS_TIERS.map((t) => (
                        <SelectItem key={t} value={t}>
                          {t}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="tableTopic">Table Topic (Optional)</Label>
                <Input
                  id="tableTopic"
                  value={tableTopic}
                  onChange={(e) => setTableTopic(e.target.value)}
                  placeholder="e.g., Feywild Oddities, Arcane Flux"
                />
              </div>

              <div className="flex flex-wrap gap-2">
                <Button onClick={generateWildMagic} disabled={isGenerating}>
                  {isGenerating ? 'Generating...' : 'Generate Table'}
                </Button>

                {json && mode === 'TABLE' && (
                  <>
                    <Button onClick={saveWildMagic} variant="outline">
                      <Save className="mr-2 h-4 w-4" />
                      Save
                    </Button>

                    <Button
                      onClick={() => {
                        copyToClipboard(JSON.stringify(json, null, 2));
                        toast.success('JSON copied!');
                      }}
                      variant="outline"
                    >
                      <Copy className="mr-2 h-4 w-4" />
                      Copy JSON
                    </Button>

                    <Button
                      onClick={() => {
                        const filename = tableTopic || 'wild-magic-table';
                        downloadJson(`${filename.replace(/\s+/g, '-')}.json`, json);
                        toast.success('JSON downloaded!');
                      }}
                      variant="outline"
                    >
                      <Download className="mr-2 h-4 w-4" />
                      Download
                    </Button>

                    <Button onClick={rollOnTable} variant="outline">
                      <Sparkles className="mr-2 h-4 w-4" />
                      Roll
                    </Button>
                  </>
                )}
              </div>

              {json && json.entries && (
                <div className="border rounded-lg overflow-hidden mt-6">
                  <table className="w-full">
                    <thead className="bg-secondary">
                      <tr>
                        <th className="p-2 text-left w-16">Roll</th>
                        <th className="p-2 text-left">Title</th>
                        <th className="p-2 text-left">Effect</th>
                      </tr>
                    </thead>
                    <tbody>
                      {json.entries.map((entry: any) => (
                        <tr
                          key={entry.roll}
                          className={
                            highlightedRoll === entry.roll
                              ? 'bg-primary/20 border-l-4 border-primary'
                              : 'border-b hover:bg-secondary/30'
                          }
                        >
                          <td className="p-2 font-mono text-center font-semibold">{entry.roll}</td>
                          <td className="p-2 font-semibold">{entry.title}</td>
                          <td className="p-2 text-sm">{entry.effect}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </TabsContent>

            <TabsContent value="SURPRISE" className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="surpriseTheme">Theme (Optional)</Label>
                  <Input
                    id="surpriseTheme"
                    value={surpriseTheme}
                    onChange={(e) => setSurpriseTheme(e.target.value)}
                    placeholder="Leave blank for surprise"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="tier2">Chaos Tier *</Label>
                  <Select value={tier} onValueChange={(v) => setTier(v as ChaosTier)}>
                    <SelectTrigger id="tier2">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CHAOS_TIERS.map((t) => (
                        <SelectItem key={t} value={t}>
                          {t}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button onClick={generateWildMagic} disabled={isGenerating}>
                  {isGenerating ? 'Generating...' : 'Generate Surge'}
                </Button>

                {json && mode === 'SURPRISE' && (
                  <>
                    <Button onClick={saveWildMagic} variant="outline">
                      <Save className="mr-2 h-4 w-4" />
                      Save
                    </Button>

                    <Button
                      onClick={() => {
                        copyToClipboard(JSON.stringify(json, null, 2));
                        toast.success('JSON copied!');
                      }}
                      variant="outline"
                    >
                      <Copy className="mr-2 h-4 w-4" />
                      Copy JSON
                    </Button>
                  </>
                )}
              </div>

              {json && json.result && (
                <div className="border rounded-lg p-6 mt-6 bg-gradient-to-br from-primary/5 to-secondary/20">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="text-6xl font-bold text-primary">{json.result.roll}</div>
                      <div className="text-sm text-muted-foreground">
                        Theme: {json.surprise_theme}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <h3 className="text-xl font-bold">{json.result.title}</h3>
                      <p className="text-muted-foreground">{json.result.effect}</p>
                    </div>
                  </div>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
    </>
  );
}
