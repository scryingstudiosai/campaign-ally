'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Dices, Copy, Download, Save, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase/client';
import {
  DICE_OPTIONS,
  DiceType,
  diceSides,
  downloadJson,
  copyToClipboard,
  rollDice,
  uuidv4,
} from '@/lib/forge-utils';

interface RandomTableForgeCardProps {
  campaignId: string;
}

export function RandomTableForgeCard({ campaignId }: RandomTableForgeCardProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  const [topic, setTopic] = useState('');
  const [description, setDescription] = useState('');
  const [dice, setDice] = useState<DiceType>('d20');

  const [json, setJson] = useState<any>(null);
  const [highlightedRoll, setHighlightedRoll] = useState<number | null>(null);

  async function generateTable() {
    if (!topic) {
      toast.error('Please enter a table name');
      return;
    }

    setIsGenerating(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();

      const response = await fetch('/api/forge/random-table', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token || ''}`,
        },
        body: JSON.stringify({
          topic,
          description: description || undefined,
          dice,
        }),
      });

      const result = await response.json();

      if (!result.success) {
        toast.error(result.error || 'Failed to generate table');
        return;
      }

      setJson(result.data.json);
      setHighlightedRoll(null);
      toast.success('Table generated successfully!');
    } catch (error) {
      console.error('Generation error:', error);
      toast.error('Failed to generate table');
    } finally {
      setIsGenerating(false);
    }
  }

  async function saveTable() {
    if (!json || !campaignId) {
      toast.error('No table to save');
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Not authenticated');
        return;
      }

      const { error } = await supabase.from('random_table_forges').insert({
        id: json.forge_id || uuidv4(),
        campaign_id: campaignId,
        user_id: user.id,
        forge_type: 'random-table',
        topic: json.topic,
        description: json.description,
        dice: json.dice,
        entries: json.entries,
      });

      if (error) throw error;

      toast.success('Table saved successfully!');
    } catch (error: any) {
      console.error('Save error:', error);
      toast.error(error.message || 'Failed to save table');
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
    setTopic('');
    setDescription('');
    setDice('d20');
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
              <Dices className="h-6 w-6 text-primary" />
            </div>
            <CardTitle className="text-lg font-bold group-hover:text-primary transition-colors">
              Random Table
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <CardDescription className="text-sm text-center">
            Generate custom random tables for any occasion
          </CardDescription>
        </CardContent>
      </Card>

      <Dialog open={isOpen} onOpenChange={(open) => { setIsOpen(open); if (!open) resetForm(); }}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>🎲 Random Table Forge</DialogTitle>
            <DialogDescription>Generate a custom random table</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="topic">Table Name *</Label>
                <Input
                  id="topic"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="e.g., Tavern Rumors, Body Scars"
                />
              </div>

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
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description (Optional)</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Optional context for the table"
                rows={2}
              />
            </div>

            <div className="flex flex-wrap gap-2">
              <Button onClick={generateTable} disabled={isGenerating}>
                {isGenerating ? 'Generating...' : 'Generate'}
              </Button>

              {json && (
                <>
                  <Button onClick={saveTable} variant="outline">
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
                      downloadJson(`${topic.replace(/\s+/g, '-')}.json`, json);
                      toast.success('JSON downloaded!');
                    }}
                    variant="outline"
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Download
                  </Button>

                  <Button onClick={rollOnTable} variant="outline">
                    <Dices className="mr-2 h-4 w-4" />
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
                      <th className="p-2 text-left">Description</th>
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
                        <td className="p-2 text-sm">{entry.description}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
