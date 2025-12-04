'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Loader2, Edit2, Save, X, Sparkles } from 'lucide-react';

interface StyleCardProps {
  narrativeVoice: string;
  pacingPreference: string;
  styleGuide: string;
  flairLevel?: string;
  onSave: (data: { narrativeVoice: string; pacingPreference: string; styleGuide: string; flairLevel: string }) => Promise<void>;
  onAISuggest?: () => Promise<void>;
  id?: string;
}

const narrativeVoiceLabels: Record<string, string> = {
  cinematic: 'Cinematic',
  gritty: 'Gritty',
  comedic: 'Comedic',
  epic: 'Epic',
  noir: 'Noir',
  whimsical: 'Whimsical',
};

const pacingLabels: Record<string, string> = {
  slow_burn: 'Slow & Deliberate',
  balanced: 'Balanced',
  action_packed: 'Fast & Action-Packed',
};

const flairLabels: Record<string, string> = {
  minimal: 'Minimal - Concise and direct',
  balanced: 'Balanced - Moderate detail',
  rich: 'Rich - Vivid descriptions',
  verbose: 'Verbose - Highly detailed',
};

export function StyleCard({ narrativeVoice, pacingPreference, styleGuide, flairLevel = 'balanced', onSave, onAISuggest, id }: StyleCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  const [formData, setFormData] = useState({
    narrativeVoice,
    pacingPreference,
    styleGuide,
    flairLevel,
  });

  useEffect(() => {
    setFormData({
      narrativeVoice,
      pacingPreference,
      styleGuide,
      flairLevel,
    });
  }, [narrativeVoice, pacingPreference, styleGuide, flairLevel]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave(formData);
      setIsEditing(false);
    } catch (error) {
      console.error('Failed to save style:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setFormData({ narrativeVoice, pacingPreference, styleGuide, flairLevel });
    setIsEditing(false);
  };

  const handleAISuggest = async () => {
    if (!onAISuggest) return;
    setIsGenerating(true);
    try {
      await onAISuggest();
    } catch (error) {
      console.error('Failed to generate:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Card id={id} className="scroll-mt-20">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle>Style & Voice</CardTitle>
            <CardDescription className="mt-1.5">Narrative tone and pacing preferences</CardDescription>
          </div>
          <div className="flex gap-2">
            {!isEditing && (
              <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
                <Edit2 className="h-4 w-4" />
              </Button>
            )}
            {isEditing && (
              <>
                {onAISuggest && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleAISuggest}
                    disabled={isGenerating || isSaving}
                  >
                    {isGenerating ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Sparkles className="h-4 w-4" />
                    )}
                  </Button>
                )}
                <Button variant="outline" size="sm" onClick={handleCancel} disabled={isSaving}>
                  <X className="h-4 w-4" />
                </Button>
                <Button size="sm" onClick={handleSave} disabled={isSaving}>
                  {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                </Button>
              </>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isEditing ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="narrative_voice">Narrative Voice</Label>
              <select
                id="narrative_voice"
                value={formData.narrativeVoice}
                onChange={(e) => setFormData({ ...formData, narrativeVoice: e.target.value })}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="cinematic">Cinematic</option>
                <option value="gritty">Gritty</option>
                <option value="comedic">Comedic</option>
                <option value="epic">Epic</option>
                <option value="noir">Noir</option>
                <option value="whimsical">Whimsical</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="pacing_preference">Pacing Preference</Label>
              <select
                id="pacing_preference"
                value={formData.pacingPreference}
                onChange={(e) => setFormData({ ...formData, pacingPreference: e.target.value })}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="slow_burn">Slow & Deliberate</option>
                <option value="balanced">Balanced</option>
                <option value="action_packed">Fast & Action-Packed</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="flair_level">Descriptive Flair</Label>
              <select
                id="flair_level"
                value={formData.flairLevel}
                onChange={(e) => setFormData({ ...formData, flairLevel: e.target.value })}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="minimal">Minimal - Concise and direct</option>
                <option value="balanced">Balanced - Moderate detail</option>
                <option value="rich">Rich - Vivid descriptions</option>
                <option value="verbose">Verbose - Highly detailed</option>
              </select>
              <p className="text-xs text-muted-foreground">Controls how much descriptive detail is added to generated content</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="style_guide">Style Guide</Label>
              <Textarea
                id="style_guide"
                value={formData.styleGuide}
                onChange={(e) => setFormData({ ...formData, styleGuide: e.target.value })}
                placeholder="Additional style notes, tone guidelines, or narrative preferences..."
                rows={6}
                className="resize-none"
              />
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div>
              <span className="text-sm font-medium">Narrative Voice:</span>{' '}
              <span className="text-sm text-muted-foreground">{narrativeVoiceLabels[narrativeVoice] || narrativeVoice || 'Not set'}</span>
            </div>
            <div>
              <span className="text-sm font-medium">Pacing:</span>{' '}
              <span className="text-sm text-muted-foreground">{pacingLabels[pacingPreference] || pacingPreference || 'Not set'}</span>
            </div>
            <div>
              <span className="text-sm font-medium">Descriptive Flair:</span>{' '}
              <span className="text-sm text-muted-foreground">{flairLabels[flairLevel] || flairLevel || 'Balanced'}</span>
            </div>
            <div>
              <span className="text-sm font-medium">Style Guide:</span>
              <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">{styleGuide || <span className="italic">No content yet</span>}</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
