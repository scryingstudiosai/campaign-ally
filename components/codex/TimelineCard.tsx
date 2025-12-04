'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Plus, Edit2, Trash2, Loader2, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import type { TimelineEvent } from '@/types/codex';

interface TimelineCardProps {
  timeline: TimelineEvent[];
  onSave: (timeline: TimelineEvent[]) => Promise<void>;
  id?: string;
  campaignId?: string;
}

export function TimelineCard({ timeline, onSave, id, campaignId }: TimelineCardProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<TimelineEvent | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  const [formData, setFormData] = useState({
    date: '',
    event: '',
    details: '',
  });

  const openDialog = (event?: TimelineEvent) => {
    if (event) {
      setEditingEvent(event);
      setFormData(event);
    } else {
      setEditingEvent(null);
      setFormData({ date: '', event: '', details: '' });
    }
    setIsDialogOpen(true);
  };

  const handleAIGenerate = async () => {
    if (!campaignId) {
      toast.error('Campaign ID is required');
      return;
    }

    if (!formData.event.trim()) {
      toast.error('Please enter an event name first');
      return;
    }

    setIsGenerating(true);
    try {
      const response = await fetch('/api/codex/ai/generate-timeline-event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          campaignId,
          eventName: formData.event,
          suggestedDate: formData.date,
        }),
      });

      const result = await response.json();

      if (result.success) {
        setFormData({
          ...formData,
          date: result.data.date || formData.date,
          details: result.data.details,
        });
        toast.success('Event details generated!');
      } else {
        toast.error(result.error || 'Failed to generate event');
      }
    } catch (error) {
      console.error('AI generation error:', error);
      toast.error('Failed to generate event');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      let updatedTimeline: TimelineEvent[];

      if (editingEvent) {
        updatedTimeline = timeline.map(e =>
          e.date === editingEvent.date && e.event === editingEvent.event ? formData : e
        );
      } else {
        updatedTimeline = [...timeline, formData];
      }

      updatedTimeline.sort((a, b) => a.date.localeCompare(b.date));

      await onSave(updatedTimeline);
      setIsDialogOpen(false);
    } catch (error) {
      console.error('Failed to save timeline event:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (date: string, event: string) => {
    setIsSaving(true);
    try {
      const updatedTimeline = timeline.filter(e => !(e.date === date && e.event === event));
      await onSave(updatedTimeline);
    } catch (error) {
      console.error('Failed to delete timeline event:', error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <Card id={id} className="scroll-mt-20">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle>Timeline</CardTitle>
              <CardDescription className="mt-1.5">Important dates and events in your campaign</CardDescription>
            </div>
            <Button size="sm" onClick={() => openDialog()}>
              <Plus className="h-4 w-4 mr-2" />
              Add Event
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {timeline.length === 0 ? (
            <p className="text-sm text-muted-foreground italic">No timeline events yet</p>
          ) : (
            <div className="space-y-3">
              {timeline.map((event, idx) => (
                <div key={`${event.date}-${idx}`} className="flex gap-4 border-l-2 border-primary pl-4 py-2">
                  <div className="min-w-[120px] text-sm font-medium text-muted-foreground">
                    {event.date}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-1">
                      <h4 className="font-semibold text-sm">{event.event}</h4>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openDialog(event)}
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(event.date, event.event)}
                          disabled={isSaving}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                    {event.details && (
                      <p className="text-sm text-muted-foreground">{event.details}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingEvent ? 'Edit Timeline Event' : 'Add Timeline Event'}</DialogTitle>
            <DialogDescription>
              Record an important date or event in your campaign
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="date">Date</Label>
              <Input
                id="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                placeholder="Year 1487, Midsummer"
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="event">Event</Label>
                {campaignId && formData.event && (
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
                id="event"
                value={formData.event}
                onChange={(e) => setFormData({ ...formData, event: e.target.value })}
                placeholder="The Great War begins"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="details">Details</Label>
              <Textarea
                id="details"
                value={formData.details}
                onChange={(e) => setFormData({ ...formData, details: e.target.value })}
                placeholder="Additional context about this event..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isSaving || !formData.date || !formData.event}>
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
