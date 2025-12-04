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
import type { MajorArc } from '@/types/codex';

/**
 * TODO: Add Arc Planner endpoint (Studio): expand an arc to 3 acts with beats
 * TODO: Add Foreshadowing Engine (Studio): generate 3-5 seeds tied to an arc
 * TODO: Relations view: show which Memories link to a Faction/Arc (Phase 2.5)
 */

interface ArcsCardProps {
  arcs: MajorArc[];
  onSave: (arcs: MajorArc[]) => Promise<void>;
  onAIPlanNextAct?: (arc: MajorArc) => Promise<void>;
  id?: string;
  campaignId?: string;
}

export function ArcsCard({ arcs, onSave, onAIPlanNextAct, id, campaignId }: ArcsCardProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingArc, setEditingArc] = useState<MajorArc | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [planningArc, setPlanningArc] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    current_act: 1,
    total_acts: 3,
    status: 'active' as 'planning' | 'active' | 'completed' | 'paused',
  });

  const openDialog = (arc?: MajorArc) => {
    if (arc) {
      setEditingArc(arc);
      setFormData(arc);
    } else {
      setEditingArc(null);
      setFormData({ title: '', description: '', current_act: 1, total_acts: 3, status: 'planning' });
    }
    setIsDialogOpen(true);
  };

  const handleAIGenerate = async () => {
    if (!campaignId) {
      toast.error('Campaign ID is required');
      return;
    }

    if (!formData.title.trim()) {
      toast.error('Please enter an arc title first');
      return;
    }

    setIsGenerating(true);
    try {
      const response = await fetch('/api/codex/ai/generate-arc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          campaignId,
          arcTitle: formData.title,
        }),
      });

      const result = await response.json();

      if (result.success) {
        setFormData({
          ...formData,
          description: result.data.description,
          current_act: result.data.current_act || 1,
          total_acts: result.data.total_acts || 3,
          status: result.data.status || 'planning',
        });
        toast.success('Arc details generated!');
      } else {
        toast.error(result.error || 'Failed to generate arc');
      }
    } catch (error) {
      console.error('AI generation error:', error);
      toast.error('Failed to generate arc');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      let updatedArcs: MajorArc[];

      if (editingArc) {
        updatedArcs = arcs.map(a =>
          a.title === editingArc.title ? formData : a
        );
      } else {
        updatedArcs = [...arcs, formData];
      }

      await onSave(updatedArcs);
      setIsDialogOpen(false);
    } catch (error) {
      console.error('Failed to save arc:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (arcTitle: string) => {
    setIsSaving(true);
    try {
      const updatedArcs = arcs.filter(a => a.title !== arcTitle);
      await onSave(updatedArcs);
    } catch (error) {
      console.error('Failed to delete arc:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handlePlanNextAct = async (arc: MajorArc) => {
    if (!onAIPlanNextAct) return;
    setPlanningArc(arc.title);
    try {
      await onAIPlanNextAct(arc);
    } catch (error) {
      console.error('Failed to plan next act:', error);
    } finally {
      setPlanningArc(null);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'planning': return 'bg-yellow-500';
      case 'active': return 'bg-blue-500';
      case 'completed': return 'bg-green-500';
      case 'paused': return 'bg-gray-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <>
      <Card id={id} className="scroll-mt-20">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle>Major Story Arcs</CardTitle>
              <CardDescription className="mt-1.5">Campaign storylines and plot threads</CardDescription>
            </div>
            <Button size="sm" onClick={() => openDialog()}>
              <Plus className="h-4 w-4 mr-2" />
              Add Arc
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {arcs.length === 0 ? (
            <p className="text-sm text-muted-foreground italic">No story arcs yet</p>
          ) : (
            <div className="space-y-4">
              {arcs.map((arc) => (
                <div key={arc.title} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold">{arc.title}</h4>
                      <Badge variant="outline" className={getStatusColor(arc.status)}>
                        {arc.status}
                      </Badge>
                      <Badge variant="secondary">
                        Act {arc.current_act}/{arc.total_acts}
                      </Badge>
                    </div>
                    <div className="flex gap-1">
                      {onAIPlanNextAct && arc.status === 'active' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handlePlanNextAct(arc)}
                          disabled={planningArc === arc.title}
                        >
                          {planningArc === arc.title ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Sparkles className="h-3.5 w-3.5" />
                          )}
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openDialog(arc)}
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(arc.title)}
                        disabled={isSaving}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">{arc.description}</p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingArc ? 'Edit Story Arc' : 'Add Story Arc'}</DialogTitle>
            <DialogDescription>
              Define a major storyline in your campaign
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="title">Title</Label>
                {campaignId && formData.title && (
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
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="The Rise of the Shadow King"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="An ancient evil awakens in the north..."
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="current_act">Current Act</Label>
                <Input
                  id="current_act"
                  type="number"
                  min={1}
                  value={formData.current_act}
                  onChange={(e) => setFormData({ ...formData, current_act: parseInt(e.target.value) || 1 })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="total_acts">Total Acts</Label>
                <Input
                  id="total_acts"
                  type="number"
                  min={1}
                  value={formData.total_acts}
                  onChange={(e) => setFormData({ ...formData, total_acts: parseInt(e.target.value) || 3 })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <select
                id="status"
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="planning">Planning</option>
                <option value="active">Active</option>
                <option value="paused">Paused</option>
                <option value="completed">Completed</option>
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isSaving || !formData.title}>
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
