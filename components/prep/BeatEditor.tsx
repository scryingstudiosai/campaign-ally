'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Pencil, Trash2, RotateCw, Sparkles, Save, X } from 'lucide-react';

interface Beat {
  title: string;
  description?: string;
  duration?: number;
  objectives?: string[];
  challenges?: string[];
}

interface BeatEditorProps {
  beat: Beat;
  index: number;
  sessionTitle: string;
  campaignId: string;
  sessionId: string;
  allBeats: Beat[];
  token: string;
  onUpdate: (updatedBeats: Beat[], commentary?: string) => void;
  onDelete: () => void;
}

export default function BeatEditor({
  beat,
  index,
  sessionTitle,
  campaignId,
  sessionId,
  allBeats,
  token,
  onUpdate,
  onDelete,
}: BeatEditorProps) {
  const { toast } = useToast();
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [editedTitle, setEditedTitle] = useState(beat.title);
  const [editedDescription, setEditedDescription] = useState(beat.description || '');

  async function handleEdit() {
    if (!editedTitle.trim()) {
      toast({
        title: 'Error',
        description: 'Title cannot be empty',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/ai/prep/edit-beat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          campaignId,
          sessionId,
          sessionTitle,
          previousBeats: allBeats,
          action: 'edit',
          beatIndex: index,
          userEditText: `${editedTitle}. ${editedDescription}`,
          tone: 'neutral',
        }),
      });

      const data = await res.json();

      if (data.success) {
        const aiBeats = data.data.updated_beats;
        const updatedBeats = allBeats.map((b, idx) => {
          const aiBeat = aiBeats.find((ab: any) => ab.index === idx + 1) || aiBeats[idx];
          if (aiBeat) {
            return {
              ...b,
              title: aiBeat.title,
              description: aiBeat.description,
              objectives: aiBeat.objectives || b.objectives,
              challenges: aiBeat.challenges || b.challenges,
              duration: aiBeat.duration || b.duration,
            };
          }
          return b;
        });

        onUpdate(updatedBeats, data.data.ai_commentary);
        setEditing(false);
        toast({
          title: 'Success',
          description: 'Beat updated successfully',
        });
      } else {
        toast({
          title: 'Error',
          description: data.error || 'Failed to update beat',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update beat',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }

  async function handleRegenerate() {
    setLoading(true);
    try {
      const res = await fetch('/api/ai/prep/edit-beat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          campaignId,
          sessionId,
          sessionTitle,
          previousBeats: allBeats,
          action: 'regenerate',
          beatIndex: index,
          tone: 'neutral',
        }),
      });

      const data = await res.json();

      if (data.success) {
        const aiBeats = data.data.updated_beats;
        const updatedBeats = allBeats.map((b, idx) => {
          const aiBeat = aiBeats.find((ab: any) => ab.index === idx + 1) || aiBeats[idx];
          if (aiBeat) {
            return {
              ...b,
              title: aiBeat.title,
              description: aiBeat.description,
              objectives: aiBeat.objectives || b.objectives,
              challenges: aiBeat.challenges || b.challenges,
              duration: aiBeat.duration || b.duration,
            };
          }
          return b;
        });

        onUpdate(updatedBeats, data.data.ai_commentary);
        toast({
          title: 'Success',
          description: 'Beat regenerated successfully',
        });
      } else {
        toast({
          title: 'Error',
          description: data.error || 'Failed to regenerate beat',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to regenerate beat',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }

  function handleCancel() {
    setEditedTitle(beat.title);
    setEditedDescription(beat.description || '');
    setEditing(false);
  }

  if (editing) {
    return (
      <Card className="border-l-4 border-l-primary">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Badge variant="outline">{index + 1}</Badge>
            <Input
              value={editedTitle}
              onChange={(e) => setEditedTitle(e.target.value)}
              placeholder="Beat title..."
              className="h-8 font-semibold"
            />
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <Textarea
            value={editedDescription}
            onChange={(e) => setEditedDescription(e.target.value)}
            placeholder="Beat description..."
            rows={3}
            className="resize-none"
          />
          <div className="flex items-center gap-2">
            <Button
              onClick={handleEdit}
              disabled={loading}
              size="sm"
            >
              {loading ? 'Saving...' : 'Save'}
              <Save className="h-3 w-3 ml-1" />
            </Button>
            <Button
              onClick={handleCancel}
              disabled={loading}
              size="sm"
              variant="outline"
            >
              Cancel
              <X className="h-3 w-3 ml-1" />
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-l-4 border-l-primary/30 hover:border-l-primary transition-colors">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-start gap-2 flex-1">
            <Badge variant="outline">{index + 1}</Badge>
            <div className="flex-1">
              <h3 className="font-semibold">{beat.title}</h3>
              {beat.description && (
                <p className="text-sm text-muted-foreground mt-1">{beat.description}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Button
              onClick={() => setEditing(true)}
              size="sm"
              variant="ghost"
              className="h-7 w-7 p-0"
            >
              <Pencil className="h-3 w-3" />
            </Button>
            <Button
              onClick={handleRegenerate}
              disabled={loading}
              size="sm"
              variant="ghost"
              className="h-7 w-7 p-0"
            >
              <RotateCw className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} />
            </Button>
            <Button
              onClick={onDelete}
              disabled={loading}
              size="sm"
              variant="ghost"
              className="h-7 w-7 p-0 text-destructive"
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </CardHeader>
      {(beat.objectives && beat.objectives.length > 0) || (beat.challenges && beat.challenges.length > 0) ? (
        <CardContent className="pt-0 space-y-2">
          {beat.objectives && beat.objectives.length > 0 && (
            <div>
              <p className="text-xs text-muted-foreground mb-1">Objectives:</p>
              <ul className="list-disc list-inside text-sm space-y-0.5">
                {beat.objectives.map((obj, idx) => (
                  <li key={idx}>{obj}</li>
                ))}
              </ul>
            </div>
          )}
          {beat.challenges && beat.challenges.length > 0 && (
            <div>
              <p className="text-xs text-muted-foreground mb-1">Challenges:</p>
              <ul className="list-disc list-inside text-sm space-y-0.5">
                {beat.challenges.map((ch, idx) => (
                  <li key={idx}>{ch}</li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      ) : null}
    </Card>
  );
}
