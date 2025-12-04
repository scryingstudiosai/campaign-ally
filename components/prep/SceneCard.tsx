'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { Sparkles, Check, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import CanonPanel from './CanonPanel';
import MemoryLinker from './MemoryLinker';

interface Scene {
  id: string;
  session_id: string;
  index_order: number;
  title?: string;
  data?: {
    boxedText?: string;
    npcs?: string[];
    skillChecks?: string[];
    contingencies?: string[];
    rewards?: Record<string, any>;
    notes?: string;
    estimatedDuration?: string;
    mood?: string;
    mapRequired?: boolean;
    relatedMemories?: string[];
  };
  canon_checked?: boolean;
  last_canon_score?: number;
  last_canon_checked_at?: string;
  created_at: string;
}

interface SceneCardProps {
  scene: Scene;
  campaignId: string;
  sessionId: string;
  token: string;
  onUpdate: () => void;
  onDelete: () => void;
}

export default function SceneCard({ scene, campaignId, sessionId, token, onUpdate, onDelete }: SceneCardProps) {
  const { toast } = useToast();
  const [expanded, setExpanded] = useState(false);
  const [expanding, setExpanding] = useState(false);
  const [canonPanelOpen, setCanonPanelOpen] = useState(false);

  const [title, setTitle] = useState(scene.title || '');
  const [boxedText, setBoxedText] = useState(scene.data?.boxedText || '');
  const [mood, setMood] = useState(scene.data?.mood || 'balanced');
  const [estimatedDuration, setEstimatedDuration] = useState(scene.data?.estimatedDuration || '15-30 min');
  const [mapRequired, setMapRequired] = useState(scene.data?.mapRequired || false);
  const [notes, setNotes] = useState(scene.data?.notes || '');
  const [relatedMemories, setRelatedMemories] = useState<string[]>(scene.data?.relatedMemories || []);

  async function saveField(field: string, value: any) {
    try {
      const updates: any = {};

      if (field === 'title') {
        updates.title = value;
      } else if (field === 'data') {
        updates.data = {
          ...scene.data,
          ...value,
        };
      }

      const res = await fetch(`/api/prep/scenes/${scene.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(updates),
      });

      const data = await res.json();

      if (data.success) {
        onUpdate();
      } else {
        toast({
          title: 'Error',
          description: data.error || 'Failed to save changes',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to save changes',
        variant: 'destructive',
      });
    }
  }

  async function expandScene() {
    setExpanding(true);
    try {
      const res = await fetch('/api/ai/prep/expand-scene', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          campaignId,
          sessionId,
          sceneId: scene.id,
          beat: { title: scene.title || `Scene ${scene.index_order}` },
          useCanon: true,
        }),
      });

      const data = await res.json();

      if (data.success) {
        toast({
          title: 'Success',
          description: 'Scene expanded successfully',
        });
        onUpdate();

        setBoxedText(data.data.boxedText || boxedText);
        setMood(data.data.mood || mood);
        setEstimatedDuration(data.data.estimatedDuration || estimatedDuration);
        setMapRequired(data.data.mapRequired || mapRequired);
        setNotes(data.data.notes || notes);
      } else {
        toast({
          title: 'Error',
          description: data.error || 'Failed to expand scene',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to expand scene',
        variant: 'destructive',
      });
    } finally {
      setExpanding(false);
    }
  }

  function handleMemoryLinked(memoryId: string) {
    const updated = [...relatedMemories, memoryId];
    setRelatedMemories(updated);
    saveField('data', { ...scene.data, relatedMemories: updated });
  }

  function removeMemory(memoryId: string) {
    const updated = relatedMemories.filter((id) => id !== memoryId);
    setRelatedMemories(updated);
    saveField('data', { ...scene.data, relatedMemories: updated });
  }

  return (
    <>
      <Card className="border-l-4 border-l-primary/50">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2 flex-1">
              <Badge variant="outline">{scene.index_order}</Badge>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onBlur={() => saveField('title', title)}
                placeholder="Scene title..."
                className="h-8 font-semibold"
              />
            </div>
            <div className="flex items-center gap-1">
              {scene.last_canon_score !== undefined && (
                <Badge
                  variant={scene.canon_checked ? 'default' : 'secondary'}
                  className="text-xs"
                >
                  <Check className="h-3 w-3 mr-1" />
                  {(scene.last_canon_score * 100).toFixed(0)}%
                </Badge>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setExpanded(!expanded)}
              >
                {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        </CardHeader>

        {expanded && (
          <CardContent className="space-y-4">
            <div>
              <Label>Boxed Text (Read-Aloud)</Label>
              <Textarea
                value={boxedText}
                onChange={(e) => setBoxedText(e.target.value)}
                onBlur={() => saveField('data', { ...scene.data, boxedText })}
                placeholder="Evocative description for the DM to read..."
                rows={3}
                className="resize-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Mood</Label>
                <Select value={mood} onValueChange={(value) => {
                  setMood(value);
                  saveField('data', { ...scene.data, mood: value });
                }}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="tense">Tense</SelectItem>
                    <SelectItem value="mysterious">Mysterious</SelectItem>
                    <SelectItem value="lighthearted">Lighthearted</SelectItem>
                    <SelectItem value="dramatic">Dramatic</SelectItem>
                    <SelectItem value="balanced">Balanced</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Estimated Duration</Label>
                <Input
                  value={estimatedDuration}
                  onChange={(e) => setEstimatedDuration(e.target.value)}
                  onBlur={() => saveField('data', { ...scene.data, estimatedDuration })}
                  placeholder="e.g., 20-30 min"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id={`map-${scene.id}`}
                checked={mapRequired}
                onChange={(e) => {
                  setMapRequired(e.target.checked);
                  saveField('data', { ...scene.data, mapRequired: e.target.checked });
                }}
                className="rounded"
              />
              <Label htmlFor={`map-${scene.id}`} className="cursor-pointer">
                Map Required
              </Label>
            </div>

            <Separator />

            {scene.data?.npcs && scene.data.npcs.length > 0 && (
              <div>
                <Label className="text-xs text-muted-foreground">NPCs</Label>
                <div className="flex flex-wrap gap-1 mt-1">
                  {scene.data.npcs.map((npc, idx) => (
                    <Badge key={idx} variant="secondary">{npc}</Badge>
                  ))}
                </div>
              </div>
            )}

            {scene.data?.skillChecks && scene.data.skillChecks.length > 0 && (
              <div>
                <Label className="text-xs text-muted-foreground">Skill Checks</Label>
                <ul className="list-disc list-inside text-sm space-y-1 mt-1">
                  {scene.data.skillChecks.map((check, idx) => (
                    <li key={idx}>{check}</li>
                  ))}
                </ul>
              </div>
            )}

            {scene.data?.contingencies && scene.data.contingencies.length > 0 && (
              <div>
                <Label className="text-xs text-muted-foreground">Contingencies</Label>
                <ul className="list-disc list-inside text-sm space-y-1 mt-1">
                  {scene.data.contingencies.map((cont, idx) => (
                    <li key={idx}>{cont}</li>
                  ))}
                </ul>
              </div>
            )}

            {scene.data?.rewards && Object.keys(scene.data.rewards).length > 0 && (
              <div>
                <Label className="text-xs text-muted-foreground">Rewards</Label>
                <div className="text-sm mt-1">
                  {JSON.stringify(scene.data.rewards, null, 2)}
                </div>
              </div>
            )}

            <Separator />

            <div>
              <Label>DM Notes</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                onBlur={() => saveField('data', { ...scene.data, notes })}
                placeholder="Tips, lore, reminders..."
                rows={2}
                className="resize-none"
              />
            </div>

            <div>
              <Label className="flex items-center justify-between mb-2">
                Linked Memories
                <MemoryLinker
                  campaignId={campaignId}
                  onLink={handleMemoryLinked}
                />
              </Label>
              {relatedMemories.length > 0 ? (
                <div className="flex flex-wrap gap-1">
                  {relatedMemories.map((memId) => (
                    <Badge
                      key={memId}
                      variant="outline"
                      className="cursor-pointer hover:bg-destructive/10"
                      onClick={() => removeMemory(memId)}
                    >
                      {memId.substring(0, 8)}...
                    </Badge>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No memories linked</p>
              )}
            </div>

            <Separator />

            <div className="flex items-center gap-2">
              <Button
                onClick={expandScene}
                disabled={expanding}
                size="sm"
                variant="outline"
              >
                {expanding ? 'Expanding...' : 'Expand with AI'}
                <Sparkles className="h-3 w-3 ml-1" />
              </Button>
              <Button
                onClick={() => setCanonPanelOpen(true)}
                size="sm"
                variant="outline"
              >
                Canon Check
              </Button>
              <Button
                onClick={onDelete}
                size="sm"
                variant="outline"
                className="ml-auto"
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          </CardContent>
        )}
      </Card>

      <CanonPanel
        open={canonPanelOpen}
        onClose={() => setCanonPanelOpen(false)}
        campaignId={campaignId}
        sceneId={scene.id}
        content={boxedText || title || ''}
        type="scene"
        onComplete={onUpdate}
      />
    </>
  );
}
