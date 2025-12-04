'use client';

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase/client';
import { CodexShell } from '@/components/codex/CodexShell';
import { CodexCard } from '@/components/codex/CodexCard';
import { CampaignSettingsCard } from '@/components/codex/CampaignSettingsCard';
import { FactionsCard } from '@/components/codex/FactionsCard';
import { ArcsCard } from '@/components/codex/ArcsCard';
import { TimelineCard } from '@/components/codex/TimelineCard';
import { HouseRulesCard } from '@/components/codex/HouseRulesCard';
import { StyleCard } from '@/components/codex/StyleCard';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Sparkles, X } from 'lucide-react';
import type { CampaignCodex, ToneSetting } from '@/types/codex';
import { useCampaignContext } from '@/contexts/CampaignContext';

type QuickStartTemplate = {
  id: string;
  icon: string;
  label: string;
  themes: string[];
  tone: ToneSetting;
};

const QUICK_START_TEMPLATES: QuickStartTemplate[] = [
  {
    id: 'high-fantasy',
    icon: '🏰',
    label: 'High Fantasy',
    themes: ['heroism', 'destiny', 'sacrifice'],
    tone: { mood: 'epic', humor_level: 'medium', violence: 'medium' },
  },
  {
    id: 'dark-fantasy',
    icon: '🌑',
    label: 'Dark Fantasy',
    themes: ['corruption', 'moral ambiguity', 'survival'],
    tone: { mood: 'dark', humor_level: 'low', violence: 'high' },
  },
  {
    id: 'sci-fi',
    icon: '🔬',
    label: 'Sci-Fi',
    themes: ['technology vs humanity', 'exploration', 'isolation'],
    tone: { mood: 'tense', humor_level: 'low', violence: 'medium' },
  },
  {
    id: 'mystery',
    icon: '🕵️',
    label: 'Mystery',
    themes: ['truth', 'deception', 'justice'],
    tone: { mood: 'mysterious', humor_level: 'medium', violence: 'low' },
  },
  {
    id: 'custom',
    icon: '📖',
    label: 'Custom (Blank)',
    themes: [],
    tone: { mood: 'balanced', humor_level: 'medium', violence: 'medium' },
  },
];

export default function CodexPage() {
  const { refreshCampaigns } = useCampaignContext();
  const [codex, setCodex] = useState<CampaignCodex | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [campaignId, setCampaignId] = useState<string>('');
  const [campaignSettings, setCampaignSettings] = useState<any>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');

  const fetchCodex = useCallback(async (campaignId: string) => {
    try {
      console.log('Fetching codex for campaign:', campaignId);
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch(`/api/codex?campaignId=${campaignId}`, {
        headers: {
          'Authorization': `Bearer ${session?.access_token || ''}`,
        },
      });
      const result = await response.json();

      console.log('Codex fetch result:', result);

      if (result.success && result.data) {
        setCodex(result.data);
      } else {
        console.error('Failed to load codex:', result.error);
        toast.error(result.error || 'Failed to load codex');
        setCodex(null);
      }
    } catch (error) {
      console.error('Failed to fetch codex:', error);
      toast.error('Failed to load codex');
      setCodex(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchCampaignSettings = useCallback(async (campaignId: string) => {
    try {
      const { data, error } = await supabase
        .from('campaigns')
        .select('*')
        .eq('id', campaignId)
        .single();

      if (error) {
        console.error('Failed to fetch campaign settings:', error);
        return;
      }

      setCampaignSettings(data);
    } catch (error) {
      console.error('Error fetching campaign settings:', error);
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      const storedCampaignId = localStorage.getItem('currentCampaignId');
      console.log('Codex page: stored campaign ID:', storedCampaignId);
      if (storedCampaignId) {
        setCampaignId(storedCampaignId);
        fetchCodex(storedCampaignId);
        fetchCampaignSettings(storedCampaignId);
      } else {
        console.log('Codex page: no campaign ID found in localStorage');
        setIsLoading(false);
        toast.error('No campaign selected');
      }
    } catch (error) {
      console.error('Failed to read from localStorage:', error);
      setIsLoading(false);
    }
  }, [fetchCodex, fetchCampaignSettings]);

  const updateCodex = async (updates: Partial<CampaignCodex>) => {
    if (!campaignId) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch('/api/codex', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token || ''}`,
        },
        body: JSON.stringify({ campaignId, ...updates }),
      });

      const result = await response.json();

      if (result.success) {
        setCodex(result.data);
        toast.success('Codex updated');
      } else {
        toast.error(result.error || 'Failed to update codex');
      }
    } catch (error) {
      console.error('Failed to update codex:', error);
      toast.error('Failed to update codex');
    }
  };

  const handleAISuggestion = async (
    field: string,
    currentValue: string,
    fieldDescription: string,
    onApplySuggestion?: (value: string) => void
  ) => {
    console.log('[AI Suggestion] Called with:', { field, currentValue, fieldDescription, campaignId, hasCodex: !!codex });
    if (!campaignId || !codex) {
      console.log('[AI Suggestion] Early return - missing campaignId or codex');
      return;
    }

    const context = `
Campaign Premise: ${codex.premise || 'Not set'}
Themes: ${codex.themes?.join(', ') || 'Not set'}
Pillars: ${codex.pillars?.join(', ') || 'Not set'}
Tone: ${codex.tone ? `${(codex.tone as any).mood || 'balanced'} mood, ${(codex.tone as any).humor_level || 'medium'} humor` : 'Not set'}
Narrative Voice: ${codex.narrative_voice || 'Not set'}
    `.trim();

    try {
      console.log('[AI Suggestion] Getting session...');
      const { data: { session } } = await supabase.auth.getSession();
      console.log('[AI Suggestion] Session:', !!session);
      console.log('[AI Suggestion] Fetching from /api/codex/ai/coach...');
      const response = await fetch('/api/codex/ai/coach', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token || ''}`,
        },
        body: JSON.stringify({
          campaignId,
          inputText: context,
          field: field,
          fieldValue: currentValue
        }),
      });

      const result = await response.json();
      console.log('[AI Suggestion] Response:', result);

      if (result.success) {
        console.log('[AI Suggestion] Success! Data:', result.data);

        // Ensure all values are strings and filter out empty/meaningless responses
        const keep = (typeof result.data.keep === 'string' && result.data.keep.trim() && result.data.keep.toLowerCase() !== 'n/a')
          ? result.data.keep.trim()
          : '';
        const adjust = (typeof result.data.adjust === 'string' && result.data.adjust.trim() && result.data.adjust.toLowerCase() !== 'n/a')
          ? result.data.adjust.trim()
          : '';
        const rewrite = (typeof result.data.rewrite === 'string' && result.data.rewrite.trim() && result.data.rewrite.toLowerCase() !== 'n/a')
          ? result.data.rewrite.trim()
          : '';

        // If no content, show error
        if (!keep && !adjust && !rewrite) {
          toast.error('No feedback received. Please try again.');
          return;
        }

        toast.custom((t) => (
          <div className="bg-background border rounded-lg shadow-lg p-4 max-w-md">
            <div className="flex items-start justify-between mb-3">
              <h3 className="font-semibold text-sm">Campaign Ally Feedback</h3>
              <button
                onClick={() => toast.dismiss(t)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="space-y-3 text-sm">
              {keep && (
                <div>
                  <div className="font-medium text-green-600 dark:text-green-400 mb-1">✓ Keep</div>
                  <div className="text-muted-foreground">{keep}</div>
                </div>
              )}
              {adjust && (
                <div>
                  <div className="font-medium text-yellow-600 dark:text-yellow-400 mb-1">⚠ Adjust</div>
                  <div className="text-muted-foreground">{adjust}</div>
                </div>
              )}
              {rewrite && (
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <div className="font-medium text-blue-600 dark:text-blue-400">✎ Rewrite</div>
                    {onApplySuggestion && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          onApplySuggestion(rewrite);
                          toast.dismiss(t);
                          toast.success('Suggestion applied!');
                        }}
                        className="h-7 text-xs"
                      >
                        Apply
                      </Button>
                    )}
                  </div>
                  <div className="text-muted-foreground">{rewrite}</div>
                </div>
              )}
            </div>
          </div>
        ), {
          duration: 10000,
        });
      } else {
        console.log('[AI Suggestion] Error:', result.error);
        toast.error(result.error || 'Failed to get AI feedback');
      }
    } catch (error) {
      console.error('Failed to get AI feedback:', error);
      toast.error('Failed to get AI feedback');
    }
  };

  const applyTemplate = async (templateId: string) => {
    const template = QUICK_START_TEMPLATES.find(t => t.id === templateId);
    if (!template || !codex) return;

    await updateCodex({
      themes: template.themes,
      tone: template.tone,
    });

    toast.success('Template applied', {
      description: `${template.label} template has been applied to your codex`,
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <LoadingSpinner />
      </div>
    );
  }

  if (!codex) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-muted-foreground">No campaign selected</p>
      </div>
    );
  }

  return (
    <CodexShell>
      {campaignSettings && (
        <div className="mb-6">
          <CampaignSettingsCard
            campaignId={campaignId}
            initialSettings={campaignSettings}
            onSettingsUpdate={(updated) => {
              setCampaignSettings(updated);
              fetchCampaignSettings(campaignId);
            }}
            onCampaignsRefresh={refreshCampaigns}
          />
        </div>
      )}

      <div className="mb-6 p-4 border rounded-lg bg-card">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <h3 className="text-sm font-semibold mb-1">Quick Start Templates</h3>
            <p className="text-xs text-muted-foreground mb-3">
              Jump-start your codex with a campaign template
            </p>
            <div className="flex gap-2">
              <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
                <SelectTrigger className="w-[280px]">
                  <SelectValue placeholder="Choose a template..." />
                </SelectTrigger>
                <SelectContent>
                  {QUICK_START_TEMPLATES.map((template) => (
                    <SelectItem key={template.id} value={template.id}>
                      <span className="mr-2">{template.icon}</span>
                      {template.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                size="sm"
                onClick={() => selectedTemplate && applyTemplate(selectedTemplate)}
                disabled={!selectedTemplate}
              >
                <Sparkles className="h-4 w-4 mr-2" />
                Apply Template
              </Button>
            </div>
          </div>
        </div>
      </div>

      <CodexCard
        id="premise"
        title="Campaign Premise"
        description="The core concept and elevator pitch for your campaign"
        value={codex.premise || ''}
        onSave={(value) => updateCodex({ premise: value })}
        onAISuggest={(onApply) => handleAISuggestion('premise', codex.premise || '', 'Premise', onApply)}
        multiline
        placeholder="A group of adventurers must prevent an ancient evil from awakening..."
      />

      <CodexCard
        id="elevator-pitch"
        title="Elevator Pitch"
        description="A one-sentence hook for your campaign"
        value={codex.elevator_pitch || ''}
        onSave={(value) => updateCodex({ elevator_pitch: value })}
        onAISuggest={() => handleAISuggestion('elevator_pitch', codex.elevator_pitch || '', 'Elevator Pitch')}
        placeholder="What if Lord of the Rings met Ocean's Eleven?"
      />

      <CodexCard
        id="themes"
        title="Themes"
        description="Major themes explored in your campaign (comma-separated)"
        value={codex.themes?.join(', ') || ''}
        onSave={(value) => updateCodex({ themes: value.split(',').map(t => t.trim()).filter(Boolean) })}
        onAISuggest={(onApply) => handleAISuggestion('themes', codex.themes?.join(', ') || '', 'Themes', onApply)}
        placeholder="Redemption, sacrifice, found family"
      />

      <CodexCard
        id="pillars"
        title="Campaign Pillars"
        description="Core gameplay pillars (e.g., Combat, Exploration, Social, Mystery)"
        value={codex.pillars?.join(', ') || ''}
        onSave={(value) => updateCodex({ pillars: value.split(',').map(p => p.trim()).filter(Boolean) })}
        onAISuggest={(onApply) => handleAISuggestion('pillars', codex.pillars?.join(', ') || '', 'Campaign Pillars', onApply)}
        placeholder="Combat, Intrigue, Exploration"
      />

      <CodexCard
        id="banned-content"
        title="Banned Content"
        description="Topics or content to avoid (comma-separated)"
        value={codex.banned_content?.join(', ') || ''}
        onSave={(value) => updateCodex({ banned_content: value.split(',').map(b => b.trim()).filter(Boolean) })}
        placeholder="Spiders, harm to children"
      />

      <FactionsCard
        id="factions"
        factions={codex.factions || []}
        onSave={(factions) => updateCodex({ factions })}
        campaignId={campaignId}
      />

      <ArcsCard
        id="arcs"
        arcs={codex.major_arcs || []}
        campaignId={campaignId}
        onSave={(major_arcs) => updateCodex({ major_arcs })}
      />

      <TimelineCard
        id="timeline"
        timeline={codex.timeline || []}
        campaignId={campaignId}
        onSave={(timeline) => updateCodex({ timeline })}
      />

      <HouseRulesCard
        id="house-rules"
        houseRules={codex.house_rules || ''}
        onSave={(house_rules) => updateCodex({ house_rules })}
        onAISuggest={(onApply) => handleAISuggestion('house_rules', codex.house_rules || '', 'House Rules', onApply)}
      />

      <StyleCard
        id="style"
        narrativeVoice={codex.narrative_voice || 'cinematic'}
        pacingPreference={codex.pacing_preference || 'balanced'}
        styleGuide={codex.style_guide || ''}
        flairLevel={codex.flair_level || 'balanced'}
        onSave={(data) => updateCodex({
          narrative_voice: data.narrativeVoice as any,
          pacing_preference: data.pacingPreference as any,
          style_guide: data.styleGuide,
          flair_level: data.flairLevel as any,
        })}
        onAISuggest={() => handleAISuggestion('style', `Voice: ${codex.narrative_voice}, Pacing: ${codex.pacing_preference}, Guide: ${codex.style_guide}`, 'Style & Voice')}
      />

      <CodexCard
        id="foreshadowing"
        title="Foreshadowing"
        description="Clues and hints planted for future reveals"
        value={codex.foreshadowing?.join('\n') || ''}
        onSave={(value) => updateCodex({ foreshadowing: value.split('\n').filter(Boolean) })}
        onAISuggest={() => handleAISuggestion('foreshadowing', codex.foreshadowing?.join('\n') || '', 'Foreshadowing')}
        multiline
        placeholder="The mysterious stranger is actually the king in disguise..."
      />

      <CodexCard
        id="open-questions"
        title="Open Questions"
        description="Mysteries and unresolved plot threads"
        value={codex.open_questions?.join('\n') || ''}
        onSave={(value) => updateCodex({ open_questions: value.split('\n').filter(Boolean) })}
        onAISuggest={() => handleAISuggestion('open_questions', codex.open_questions?.join('\n') || '', 'Open Questions')}
        multiline
        placeholder="Who hired the assassins? What's in the locked vault?"
      />
    </CodexShell>
  );
}
