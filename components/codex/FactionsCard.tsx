'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Plus, Edit2, Trash2, Loader2, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import type { Faction } from '@/types/codex';

interface FactionsCardProps {
  factions: Faction[];
  onSave: (factions: Faction[]) => Promise<void>;
  id?: string;
  campaignId?: string;
}

export function FactionsCard({ factions, onSave, id, campaignId }: FactionsCardProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingFaction, setEditingFaction] = useState<Faction | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    goals: '',
    status: 'active' as 'active' | 'defeated' | 'allied',
  });

  const openDialog = (faction?: Faction) => {
    if (faction) {
      setEditingFaction(faction);
      setFormData(faction);
    } else {
      setEditingFaction(null);
      setFormData({ name: '', description: '', goals: '', status: 'active' });
    }
    setIsDialogOpen(true);
  };

  const handleAIGenerate = async () => {
    if (!campaignId) {
      toast.error('Campaign ID is required');
      return;
    }

    if (!formData.name.trim()) {
      toast.error('Please enter a faction name first');
      return;
    }

    setIsGenerating(true);
    try {
      const response = await fetch('/api/codex/ai/generate-faction', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          campaignId,
          factionName: formData.name,
        }),
      });

      const result = await response.json();

      if (result.success) {
        setFormData({
          ...formData,
          description: result.data.description,
          goals: result.data.goals,
          status: result.data.status || 'active',
        });
        toast.success('Faction details generated!');
      } else {
        toast.error(result.error || 'Failed to generate faction');
      }
    } catch (error) {
      console.error('AI generation error:', error);
      toast.error('Failed to generate faction');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      let updatedFactions: Faction[];

      if (editingFaction) {
        updatedFactions = factions.map(f =>
          f.name === editingFaction.name ? formData : f
        );
      } else {
        updatedFactions = [...factions, formData];
      }

      await onSave(updatedFactions);
      setIsDialogOpen(false);
    } catch (error) {
      console.error('Failed to save faction:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (factionName: string) => {
    setIsSaving(true);
    try {
      const updatedFactions = factions.filter(f => f.name !== factionName);
      await onSave(updatedFactions);
    } catch (error) {
      console.error('Failed to delete faction:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-blue-500';
      case 'defeated': return 'bg-red-500';
      case 'allied': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <>
      <Card id={id} className="scroll-mt-20">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle>Factions</CardTitle>
              <CardDescription className="mt-1.5">Major groups, organizations, and power players</CardDescription>
            </div>
            <Button size="sm" onClick={() => openDialog()}>
              <Plus className="h-4 w-4 mr-2" />
              Add Faction
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {factions.length === 0 ? (
            <p className="text-sm text-muted-foreground italic">No factions yet</p>
          ) : (
            <div className="space-y-4">
              {factions.map((faction) => (
                <div key={faction.name} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold">{faction.name}</h4>
                      <Badge variant="outline" className={getStatusColor(faction.status)}>
                        {faction.status}
                      </Badge>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openDialog(faction)}
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(faction.name)}
                        disabled={isSaving}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground mb-2">{faction.description}</p>
                  {faction.goals && (
                    <p className="text-sm">
                      <span className="font-medium">Goals:</span> {faction.goals}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingFaction ? 'Edit Faction' : 'Add Faction'}</DialogTitle>
            <DialogDescription>
              Define a major group or organization in your campaign
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="name">Name</Label>
                {campaignId && formData.name && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleAIGenerate}
                    disabled={isGenerating}
                    className="h-7 text-xs"
                  >
                    {isGenerating ? (
                      <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                    ) : (
                      <Sparkles className="h-3.5 w-3.5 mr-1.5" />
                    )}
                    Generate Details
                  </Button>
                )}
              </div>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="The Shadow Council"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="A secretive organization of wealthy merchants..."
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="goals">Goals</Label>
              <Input
                id="goals"
                value={formData.goals}
                onChange={(e) => setFormData({ ...formData, goals: e.target.value })}
                placeholder="Control trade routes and influence politics"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <select
                id="status"
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="active">Active</option>
                <option value="allied">Allied</option>
                <option value="defeated">Defeated</option>
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isSaving || !formData.name}>
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
