'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
} from '@/lib/forge-utils';

interface RandomTableForgeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campaignId: string;
}

export default function RandomTableForgeDialog({ open, onOpenChange, campaignId }: RandomTableForgeDialogProps) {
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
      toast.success('Table generated!');
    } catch (error) {
      console.error('Generation error:', error);
      toast.error('Failed to generate table');
    } finally {
      setIsGenerating(false);
    }
  }

  async function saveToMemory() {
    if (!json) return;

    try {
      const { data, error } = await supabase.from('forge_results').insert({
        campaign_id: campaignId,
        forge_type: 'random-table',
        title: json.name || topic,
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
    <Dialog open={open} onOpenChange={(newOpen) => {
      if (!newOpen) resetForm();
      onOpenChange(newOpen);
    }}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Dices className="h-5 w-5 text-cyan-500" />
            <div>
              <DialogTitle>Random Table</DialogTitle>
              <DialogDescription>
                Generate custom random tables for any occasion
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="topic">Table Name *</Label>
            <Input
              id="topic"
              placeholder="e.g., 'Tavern Encounters', 'Weather Events', 'NPC Quirks'"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
            />
          </div>

          <div>
            <Label htmlFor="description">Description (Optional)</Label>
            <Textarea
              id="description"
              placeholder="Additional context or theme for the table..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="resize-none"
            />
          </div>

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
        </div>

        <div className="flex gap-2 pt-4">
          <Button onClick={generateTable} disabled={isGenerating || !topic} className="flex-1 bg-cyan-600 hover:bg-cyan-700">
            {isGenerating ? 'Generating...' : 'Generate Table'}
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
              <Button variant="outline" onClick={() => downloadJson(json, topic || 'random-table')}>
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
            <h3 className="font-semibold mb-2">{json.name || topic}</h3>
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
                  {entry.description && <p className="text-xs text-muted-foreground ml-8 mt-1">{entry.description}</p>}
                </div>
              ))}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
