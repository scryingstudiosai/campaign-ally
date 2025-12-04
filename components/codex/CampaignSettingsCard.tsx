'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Settings, Pencil, Check, X, ChevronDown, ChevronUp, Calendar, Users, Dices, Info, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase/client';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface CampaignSettings {
  name: string;
  system: string;
  tagline?: string;
  party_level?: number;
  created_at: string;
  updated_at?: string;
}

interface CampaignSettingsCardProps {
  campaignId: string;
  initialSettings: CampaignSettings;
  onSettingsUpdate?: (settings: CampaignSettings) => void;
  onCampaignsRefresh?: () => void;
}

const SYSTEM_OPTIONS = [
  { value: 'D&D 5e', label: 'D&D 5e', icon: '🐉', description: 'Dungeons & Dragons 5th Edition' },
  { value: 'Pathfinder 2e', label: 'Pathfinder 2e', icon: '⚔️', description: 'Pathfinder Second Edition' },
  { value: 'Call of Cthulhu', label: 'Call of Cthulhu', icon: '🦑', description: 'Lovecraftian horror RPG' },
  { value: 'Fate Core', label: 'Fate Core', icon: '🎲', description: 'Narrative-focused RPG' },
  { value: 'Savage Worlds', label: 'Savage Worlds', icon: '🌍', description: 'Fast, Furious, Fun!' },
  { value: 'Custom', label: 'Custom/Other', icon: '📖', description: 'Custom or other system' },
];

export function CampaignSettingsCard({ campaignId, initialSettings, onSettingsUpdate, onCampaignsRefresh }: CampaignSettingsCardProps) {
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(true);
  const [isEditingName, setIsEditingName] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [sessionCount, setSessionCount] = useState<number>(0);

  const [name, setName] = useState(initialSettings.name);
  const [system, setSystem] = useState(initialSettings.system);
  const [tagline, setTagline] = useState(initialSettings.tagline || '');
  const [error, setError] = useState<string | null>(null);
  const [showSaved, setShowSaved] = useState(false);

  useEffect(() => {
    fetchSessionCount();
  }, [campaignId]);

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'e') {
        e.preventDefault();
        setIsEditingName(true);
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, []);

  async function fetchSessionCount() {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch(`/api/prep/sessions?campaignId=${campaignId}`, {
        headers: {
          'Authorization': `Bearer ${session?.access_token || ''}`,
        },
      });
      const result = await response.json();
      if (result.success && result.data) {
        setSessionCount(result.data.length);
      }
    } catch (error) {
      console.error('Failed to fetch session count:', error);
    }
  }

  async function updateCampaignSettings(updates: Partial<CampaignSettings>) {
    setIsSaving(true);
    setError(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setError('Not authenticated');
        return false;
      }

      console.log('Updating campaign settings:', updates);

      const { data, error: updateError } = await supabase
        .from('campaigns')
        .update(updates)
        .eq('id', campaignId)
        .select()
        .single();

      if (updateError) {
        console.error('Failed to update campaign:', updateError);
        setError(updateError.message);
        toast({
          title: 'Error',
          description: 'Failed to save campaign settings',
          variant: 'destructive',
        });
        return false;
      }

      console.log('Campaign updated:', data);
      console.log('Triggering campaigns refresh in dropdown');

      setShowSaved(true);
      setTimeout(() => setShowSaved(false), 2000);

      // Update local state callback
      if (onSettingsUpdate && data) {
        onSettingsUpdate(data as CampaignSettings);
      }

      // CRITICAL: Refresh campaigns list in dropdown to show updated name
      if (onCampaignsRefresh) {
        console.log('Calling onCampaignsRefresh to update dropdown');
        onCampaignsRefresh();
      }

      return true;
    } catch (error) {
      console.error('Error updating campaign:', error);
      setError(error instanceof Error ? error.message : 'Failed to save');
      toast({
        title: 'Error',
        description: 'Failed to save campaign settings',
        variant: 'destructive',
      });
      return false;
    } finally {
      setIsSaving(false);
    }
  }

  async function handleNameSave() {
    if (!name.trim()) {
      setError('Campaign name is required');
      setName(initialSettings.name);
      setIsEditingName(false);
      return;
    }

    if (name === initialSettings.name) {
      setIsEditingName(false);
      return;
    }

    const success = await updateCampaignSettings({ name });
    if (success) {
      setIsEditingName(false);
    }
  }

  async function handleSystemChange(newSystem: string) {
    // TODO: Add confirmation dialog if campaign has existing content
    // TODO: Load system-specific stat block templates
    // TODO: Enable/disable system-specific fields

    setSystem(newSystem);
    await updateCampaignSettings({ system: newSystem });
  }

  async function handleTaglineSave() {
    await updateCampaignSettings({ tagline: tagline || undefined });
  }

  const selectedSystem = SYSTEM_OPTIONS.find(opt => opt.value === system) || SYSTEM_OPTIONS[0];

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-card to-primary/5">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3 flex-1">
              <Settings className="h-6 w-6 text-primary" />
              <div className="flex-1">
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" className="p-0 h-auto hover:bg-transparent">
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-xl">Campaign Settings</CardTitle>
                      {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </div>
                  </Button>
                </CollapsibleTrigger>
                <CardDescription>Configure your campaign details and system</CardDescription>
              </div>
            </div>
            {showSaved && (
              <Badge variant="default" className="bg-green-500 hover:bg-green-500">
                <Check className="h-3 w-3 mr-1" />
                Saved
              </Badge>
            )}
          </div>
        </CardHeader>

        <CollapsibleContent>
          <CardContent className="space-y-6">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-4">
              <div>
                <Label className="text-base font-semibold">Campaign Name</Label>
                <div className="flex items-center gap-2 mt-2">
                  {isEditingName ? (
                    <>
                      <Input
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        onBlur={handleNameSave}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleNameSave();
                          if (e.key === 'Escape') {
                            setName(initialSettings.name);
                            setIsEditingName(false);
                          }
                        }}
                        className="text-lg font-bold"
                        autoFocus
                        disabled={isSaving}
                      />
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={handleNameSave}
                        disabled={isSaving}
                      >
                        <Check className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setName(initialSettings.name);
                          setIsEditingName(false);
                        }}
                        disabled={isSaving}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </>
                  ) : (
                    <>
                      <div
                        className="text-2xl font-bold flex-1 cursor-pointer hover:text-primary transition-colors"
                        onDoubleClick={() => setIsEditingName(true)}
                      >
                        {name}
                      </div>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setIsEditingName(true)}
                              className="opacity-60 hover:opacity-100"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Edit campaign name (Ctrl+E)</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </>
                  )}
                </div>
              </div>

              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Label className="text-base font-semibold">Game System</Label>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs">
                        <p>Choose your RPG system. This will enable system-specific features in the future.</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <Select value={system} onValueChange={handleSystemChange} disabled={isSaving}>
                  <SelectTrigger className="w-full">
                    <SelectValue>
                      <div className="flex items-center gap-2">
                        <span className="text-xl">{selectedSystem.icon}</span>
                        <span>{selectedSystem.label}</span>
                      </div>
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {SYSTEM_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        <div className="flex items-center gap-2">
                          <span className="text-xl">{option.icon}</span>
                          <div>
                            <div className="font-medium">{option.label}</div>
                            <div className="text-xs text-muted-foreground">{option.description}</div>
                          </div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="tagline" className="text-base font-semibold">
                  Campaign Tagline
                </Label>
                <p className="text-xs text-muted-foreground mb-2">Optional brief description (max 200 characters)</p>
                <Textarea
                  id="tagline"
                  value={tagline}
                  onChange={(e) => setTagline(e.target.value)}
                  onBlur={handleTaglineSave}
                  placeholder="A brief description of your campaign..."
                  maxLength={200}
                  rows={2}
                  disabled={isSaving}
                  className="resize-none"
                />
                <p className="text-xs text-muted-foreground text-right mt-1">
                  {tagline.length}/200
                </p>
              </div>

              <div className="border-t pt-4">
                <Label className="text-base font-semibold mb-3 block">Campaign Details</Label>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <div className="text-muted-foreground">Created</div>
                      <div className="font-medium">
                        {new Date(initialSettings.created_at).toLocaleDateString()}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <div className="text-muted-foreground">Last Modified</div>
                      <div className="font-medium">
                        {initialSettings.updated_at
                          ? new Date(initialSettings.updated_at).toLocaleDateString()
                          : new Date(initialSettings.created_at).toLocaleDateString()}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Dices className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <div className="text-muted-foreground">Sessions Played</div>
                      <div className="font-medium">{sessionCount}</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <div className="text-muted-foreground">Party Level</div>
                      <div className="font-medium">{initialSettings.party_level || 1}</div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-muted/50 rounded-lg p-3 text-xs text-muted-foreground">
                <p className="font-medium mb-1">Future System Integration</p>
                <ul className="space-y-1 ml-4 list-disc">
                  <li>System-specific stat block templates</li>
                  <li>Appropriate dice notation and mechanics</li>
                  <li>Filtered tags and memory card fields</li>
                  <li>Custom rules and homebrew support</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
