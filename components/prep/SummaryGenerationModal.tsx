'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Sparkles, FileText } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase/client';

interface SummaryGenerationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sessionId: string;
  sessionTitle: string;
  sessionNumber: number | null;
  onSummaryGenerated: () => void;
  existingNotes?: string;
  existingTone?: string;
}

export default function SummaryGenerationModal({
  open,
  onOpenChange,
  sessionId,
  sessionTitle,
  sessionNumber,
  onSummaryGenerated,
  existingNotes = '',
  existingTone = 'neutral',
}: SummaryGenerationModalProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [rawNotes, setRawNotes] = useState(existingNotes);
  const [tone, setTone] = useState(existingTone);
  const [includePlayerView, setIncludePlayerView] = useState(true);
  const [includeDmView, setIncludeDmView] = useState(true);
  const [loadingScenes, setLoadingScenes] = useState(false);

  async function handleAutoFill() {
    setLoadingScenes(true);
    try {
      const { data: session, error: sessionError } = await supabase
        .from('sessions')
        .select('outline, premise, notes')
        .eq('id', sessionId)
        .maybeSingle();

      if (sessionError) throw sessionError;

      const { data: scenes, error: scenesError } = await supabase
        .from('scenes')
        .select('title, data, index_order')
        .eq('session_id', sessionId)
        .order('index_order', { ascending: true });

      if (scenesError) throw scenesError;

      let autoFilledText = '';

      if (session?.premise) {
        autoFilledText += `SESSION PREMISE:\n${session.premise}\n\n`;
      }

      if (session?.outline) {
        const outline = session.outline as any;
        if (outline?.summary) {
          autoFilledText += `OUTLINE SUMMARY:\n${outline.summary}\n\n`;
        }
        if (outline?.beats && Array.isArray(outline.beats)) {
          autoFilledText += `PLANNED BEATS:\n`;
          outline.beats.forEach((beat: any, idx: number) => {
            autoFilledText += `${idx + 1}. ${beat.description || beat.title || 'Unnamed beat'}\n`;
          });
          autoFilledText += '\n';
        }
      }

      if (scenes && scenes.length > 0) {
        autoFilledText += `SCENE DETAILS:\n\n`;
        scenes.forEach((scene, index) => {
          const sceneData = scene.data as any;
          autoFilledText += `Scene ${index + 1}: ${scene.title || 'Untitled'}\n`;

          if (sceneData?.description) {
            autoFilledText += `${sceneData.description}\n`;
          }

          if (sceneData?.notes) {
            autoFilledText += `Notes: ${sceneData.notes}\n`;
          }

          if (sceneData?.beats && Array.isArray(sceneData.beats)) {
            autoFilledText += `Beats:\n`;
            sceneData.beats.forEach((beat: any, beatIndex: number) => {
              if (beat.description) {
                autoFilledText += `  - ${beat.description}\n`;
              }
            });
          }

          autoFilledText += '\n';
        });
      }

      if (session?.notes) {
        autoFilledText += `SESSION NOTES:\n${session.notes}\n`;
      }

      if (!autoFilledText.trim()) {
        toast({
          title: 'No Content Found',
          description: 'No outline, scenes, or notes have been added to this session yet',
          variant: 'destructive',
        });
        return;
      }

      setRawNotes(autoFilledText.trim());
      const itemCount = (scenes?.length || 0) + (session?.outline ? 1 : 0);
      toast({
        title: 'Auto-filled',
        description: `Loaded session outline and ${scenes?.length || 0} scene(s)`,
      });
    } catch (error) {
      console.error('Error loading session data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load session data',
        variant: 'destructive',
      });
    } finally {
      setLoadingScenes(false);
    }
  }

  async function handleGenerate() {
    if (!rawNotes.trim()) {
      toast({
        title: 'Notes Required',
        description: 'Please enter what happened during the session',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast({
          title: 'Not authenticated',
          description: 'Please sign in to generate summaries',
          variant: 'destructive',
        });
        return;
      }

      console.log('[Summary Gen] Sending request for session:', sessionId);
      const res = await fetch(`/api/prep/sessions/${sessionId}/summary`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          rawNotes,
          tone,
          includePlayerView,
          includeDmView,
        }),
      });

      const data = await res.json();

      if (data.success) {
        toast({
          title: 'Summary Generated',
          description: 'Your session summary has been created successfully',
        });
        onSummaryGenerated();
        onOpenChange(false);
      } else {
        toast({
          title: 'Generation Failed',
          description: data.error || 'Failed to generate summary',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'An error occurred while generating the summary',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            Generate Session Summary
          </DialogTitle>
          <DialogDescription>
            Create a comprehensive summary for {sessionTitle}
            {sessionNumber && ` (Session ${sessionNumber})`}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="notes">What happened this session?</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAutoFill}
                disabled={loadingScenes || loading}
              >
                <FileText className="h-4 w-4 mr-2" />
                {loadingScenes ? 'Loading...' : 'Auto-fill from Beats'}
              </Button>
            </div>
            <Textarea
              id="notes"
              placeholder="Enter your session notes here... Include major events, NPC interactions, combat encounters, story developments, player decisions, loot found, locations visited, and anything memorable..."
              value={rawNotes}
              onChange={(e) => setRawNotes(e.target.value)}
              rows={12}
              className="resize-none"
            />
            <p className="text-xs text-muted-foreground">
              The more detail you provide, the better the summary will be
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Tone</Label>
              <Select value={tone} onValueChange={setTone}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="neutral">Neutral</SelectItem>
                  <SelectItem value="cinematic">Cinematic</SelectItem>
                  <SelectItem value="comedic">Comedic</SelectItem>
                  <SelectItem value="grimdark">Grimdark</SelectItem>
                  <SelectItem value="heroic">Heroic</SelectItem>
                  <SelectItem value="documentary">Documentary</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="playerView"
                checked={includePlayerView}
                onCheckedChange={(checked) => setIncludePlayerView(checked as boolean)}
              />
              <Label htmlFor="playerView" className="cursor-pointer font-normal">
                Include Player View (shareable summary for players)
              </Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="dmView"
                checked={includeDmView}
                onCheckedChange={(checked) => setIncludeDmView(checked as boolean)}
              />
              <Label htmlFor="dmView" className="cursor-pointer font-normal">
                Include DM View (private notes with secrets and prep)
              </Label>
            </div>
          </div>

          <div className="flex gap-2 pt-4">
            <Button onClick={handleGenerate} disabled={loading} className="flex-1">
              {loading ? 'Generating...' : existingNotes ? 'Regenerate Summary' : 'Generate Summary'}
              <Sparkles className="h-4 w-4 ml-2" />
            </Button>
            <Button onClick={() => onOpenChange(false)} variant="outline" disabled={loading}>
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
