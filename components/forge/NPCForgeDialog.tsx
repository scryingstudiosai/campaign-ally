'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { User, Sparkles, Copy, Save, RefreshCw, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase/client';
import { useGenerationLimit } from '@/hooks/useGenerationLimit';
import { GenerationLimitModal } from './GenerationLimitModal';
import { useGenerationCount } from '@/contexts/GenerationCountContext';

interface NPCForgeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campaignId: string;
}

interface NPCResult {
  name: string;
  role: string;
  voice_hook: string;
  secret_leverage: string;
  first_impression: string;
  physical_description?: string;
  personality_traits?: string;
  background_hook?: string;
  speech_pattern?: string;
  secret_motivation?: string;
  flair?: string;
}

const NPC_TYPES = [
  { value: 'any', label: 'Any' },
  { value: 'commoner', label: 'Commoner' },
  { value: 'merchant', label: 'Merchant/Shopkeeper' },
  { value: 'guard', label: 'Guard/Soldier' },
  { value: 'noble', label: 'Noble/Official' },
  { value: 'criminal', label: 'Criminal/Rogue' },
  { value: 'sage', label: 'Sage/Scholar' },
  { value: 'priest', label: 'Priest/Clergy' },
  { value: 'artisan', label: 'Artisan/Craftsperson' },
  { value: 'entertainer', label: 'Entertainer' },
  { value: 'wilderness', label: 'Wilderness Guide' },
  { value: 'mysterious', label: 'Mysterious Stranger' },
];

const PERSONALITY_EMPHASIS = [
  { value: 'balanced', label: 'Balanced' },
  { value: 'friendly', label: 'Friendly/Helpful' },
  { value: 'suspicious', label: 'Suspicious/Guarded' },
  { value: 'eccentric', label: 'Eccentric/Quirky' },
  { value: 'gruff', label: 'Gruff/Tough' },
  { value: 'nervous', label: 'Nervous/Timid' },
  { value: 'arrogant', label: 'Arrogant/Pompous' },
  { value: 'wise', label: 'Wise/Mentorlike' },
];

export default function NPCForgeDialog({ open, onOpenChange, campaignId }: NPCForgeDialogProps) {
  const [npcName, setNpcName] = useState('');
  const [concept, setConcept] = useState('');
  const [npcType, setNpcType] = useState('any');
  const [personalityEmphasis, setPersonalityEmphasis] = useState('balanced');
  const [includePhysical, setIncludePhysical] = useState(true);
  const [includePersonality, setIncludePersonality] = useState(true);
  const [includeBackground, setIncludeBackground] = useState(true);
  const [includeSpeech, setIncludeSpeech] = useState(true);
  const [includeSecret, setIncludeSecret] = useState(true);
  const [respectCodex, setRespectCodex] = useState(true);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<NPCResult | null>(null);
  const { toast } = useToast();
  const { checkLimit, limitModalOpen, setLimitModalOpen, limitInfo } = useGenerationLimit();
  const { refresh: refreshCount } = useGenerationCount();

  const handleGenerate = async (surpriseMe: boolean = false) => {
    // Check generation limit before proceeding
    const allowed = await checkLimit();
    if (!allowed) {
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        toast({
          title: 'Not logged in',
          description: 'Please sign in to use forges.',
          variant: 'destructive',
        });
        return;
      }

      const response = await fetch('/api/ai/panic', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          type: 'npc',
          campaignId,
          npcName: surpriseMe ? undefined : (npcName || undefined),
          concept: surpriseMe ? undefined : (concept || undefined),
          npcType: surpriseMe ? undefined : npcType,
          personalityEmphasis: surpriseMe ? undefined : personalityEmphasis,
          includeDetails: {
            physical: includePhysical,
            personality: includePersonality,
            background: includeBackground,
            speech: includeSpeech,
            secret: includeSecret,
          },
          respectCodex,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        toast({
          title: 'Generation failed',
          description: data.error || 'Failed to generate NPC',
          variant: 'destructive',
        });
        return;
      }

      setResult(data.result);
      toast({
        title: 'NPC generated',
        description: 'Your NPC is ready!',
      });
    } catch (error) {
      console.error('NPC generation error:', error);
      toast({
        title: 'Generation failed',
        description: 'Something went wrong',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (!result) return;

    let text = `**${result.name}**\n\n**Role:** ${result.role}\n\n`;

    if (result.physical_description) {
      text += `**Physical Description:** ${result.physical_description}\n\n`;
    }

    if (result.personality_traits) {
      text += `**Personality Traits:** ${result.personality_traits}\n\n`;
    }

    text += `**Voice Hook:** ${result.voice_hook}\n\n`;

    if (result.speech_pattern) {
      text += `**Speech Pattern:** ${result.speech_pattern}\n\n`;
    }

    if (result.background_hook) {
      text += `**Background:** ${result.background_hook}\n\n`;
    }

    if (result.secret_motivation) {
      text += `**Secret/Motivation:** ${result.secret_motivation}\n\n`;
    }

    text += `**Secret/Leverage:** ${result.secret_leverage}\n\n`;
    text += `**First Impression:** ${result.first_impression}`;

    if (result.flair) {
      text += `\n\n**Flair:** ${result.flair}`;
    }

    navigator.clipboard.writeText(text);
    toast({
      title: 'Copied to clipboard',
      description: 'NPC details copied successfully',
    });
  };

  const handleSave = async () => {
    console.log('[NPCForge] handleSave called, result:', result);
    if (!result) {
      console.log('[NPCForge] No result, returning early');
      return;
    }

    try {
      console.log('[NPCForge] Getting user...');
      const { data: { user } } = await supabase.auth.getUser();
      console.log('[NPCForge] User:', user?.id);
      if (!user) {
        console.error('[NPCForge] No user found');
        toast({
          title: 'Not authenticated',
          description: 'Please sign in to save',
          variant: 'destructive',
        });
        return;
      }

      console.log('[NPCForge] Building description...');
      const title = result.name;
      let textContent = `${result.name}\n${result.role}\n\n`;

      if (result.physical_description) {
        textContent += `Physical Description: ${result.physical_description}\n\n`;
      }

      if (result.personality_traits) {
        textContent += `Personality Traits: ${result.personality_traits}\n\n`;
      }

      textContent += `Voice Hook: ${result.voice_hook}\n\n`;

      if (result.speech_pattern) {
        textContent += `Speech Pattern: ${result.speech_pattern}\n\n`;
      }

      if (result.background_hook) {
        textContent += `Background: ${result.background_hook}\n\n`;
      }

      if (result.secret_motivation) {
        textContent += `Secret/Motivation: ${result.secret_motivation}\n\n`;
      }

      textContent += `Secret/Leverage: ${result.secret_leverage}\n`;
      textContent += `First Impression: ${result.first_impression}`;

      // Transform to camelCase format for consistency with hero/villain display
      const transformedContent = {
        name: result.name,
        role: result.role,
        voiceHook: result.voice_hook,
        secretOrLeverage: result.secret_leverage,
        oneLineIntro: result.first_impression,
        physicalDescription: result.physical_description,
        personalityTraits: result.personality_traits,
        backgroundHook: result.background_hook,
        speechPattern: result.speech_pattern,
        secretMotivation: result.secret_motivation,
        flair: result.flair,
      };

      const insertData = {
        campaign_id: campaignId,
        type: 'npc',
        title,
        text_content: textContent,
        content: transformedContent,
        forge_type: 'npc',
        tags: [],
      };

      console.log('[NPCForge] Saving NPC to memory_chunks:', insertData);
      console.log('[NPCForge] Campaign ID:', campaignId);

      const { data, error } = await supabase.from('memory_chunks').insert(insertData).select();

      console.log('[NPCForge] Insert response - data:', data, 'error:', error);

      if (error) {
        console.error('[NPCForge] Save error details:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        });
        throw error;
      }

      console.log('[NPCForge] Saved successfully:', data);

      // Refresh the generation count after successful save (trigger auto-increments in DB)
      await refreshCount();

      toast({
        title: 'Saved to memory',
        description: 'NPC has been saved to your campaign memory',
      });
    } catch (error: any) {
      console.error('[NPCForge] Save error:', error);
      toast({
        title: 'Save failed',
        description: error?.message || 'Failed to save NPC to memory',
        variant: 'destructive',
      });
    }
  };

  const handleClose = () => {
    setNpcName('');
    setConcept('');
    setNpcType('any');
    setPersonalityEmphasis('balanced');
    setIncludePhysical(true);
    setIncludePersonality(true);
    setIncludeBackground(true);
    setIncludeSpeech(true);
    setIncludeSecret(true);
    setRespectCodex(true);
    setResult(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <User className="h-5 w-5 text-primary" />
            <DialogTitle>NPC Forge</DialogTitle>
          </div>
          <DialogDescription>
            Create a memorable character on the fly
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="npc-name">Name (Optional)</Label>
            <Input
              id="npc-name"
              placeholder="Leave empty for random name"
              value={npcName}
              onChange={(e) => setNpcName(e.target.value)}
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="npc-concept">Concept (Optional)</Label>
            <Textarea
              id="npc-concept"
              placeholder="E.g., 'A grizzled tavern owner with a hidden past' or 'Guard captain, suspicious of outsiders' or leave blank for random"
              value={concept}
              onChange={(e) => setConcept(e.target.value)}
              disabled={loading}
              rows={5}
              className="resize-none"
            />
            <p className="text-xs text-muted-foreground">
              Describe the NPC's role, personality, appearance, or situation
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="npc-type">NPC Type</Label>
              <Select value={npcType} onValueChange={setNpcType} disabled={loading}>
                <SelectTrigger id="npc-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {NPC_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="personality-emphasis">Personality Emphasis</Label>
              <Select value={personalityEmphasis} onValueChange={setPersonalityEmphasis} disabled={loading}>
                <SelectTrigger id="personality-emphasis">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PERSONALITY_EMPHASIS.map((personality) => (
                    <SelectItem key={personality.value} value={personality.value}>
                      {personality.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-3">
            <Label>Include Details</Label>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="include-physical"
                  checked={includePhysical}
                  onCheckedChange={(checked) => setIncludePhysical(!!checked)}
                  disabled={loading}
                />
                <Label htmlFor="include-physical" className="text-sm font-normal cursor-pointer">
                  Physical description
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="include-personality"
                  checked={includePersonality}
                  onCheckedChange={(checked) => setIncludePersonality(!!checked)}
                  disabled={loading}
                />
                <Label htmlFor="include-personality" className="text-sm font-normal cursor-pointer">
                  Personality traits
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="include-background"
                  checked={includeBackground}
                  onCheckedChange={(checked) => setIncludeBackground(!!checked)}
                  disabled={loading}
                />
                <Label htmlFor="include-background" className="text-sm font-normal cursor-pointer">
                  Background hook
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="include-speech"
                  checked={includeSpeech}
                  onCheckedChange={(checked) => setIncludeSpeech(!!checked)}
                  disabled={loading}
                />
                <Label htmlFor="include-speech" className="text-sm font-normal cursor-pointer">
                  Speech pattern/quirk
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="include-secret"
                  checked={includeSecret}
                  onCheckedChange={(checked) => setIncludeSecret(!!checked)}
                  disabled={loading}
                />
                <Label htmlFor="include-secret" className="text-sm font-normal cursor-pointer">
                  Secret or motivation
                </Label>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="respect-codex"
              checked={respectCodex}
              onCheckedChange={(checked) => setRespectCodex(!!checked)}
              disabled={loading}
            />
            <Label htmlFor="respect-codex" className="text-sm cursor-pointer">
              Respect Campaign Codex
            </Label>
          </div>

          {!result && (
            <div className="flex gap-2 justify-end">
              <Button
                onClick={handleClose}
                variant="ghost"
                disabled={loading}
              >
                Cancel
              </Button>
              <Button
                onClick={() => handleGenerate(true)}
                variant="outline"
                disabled={loading}
              >
                <Sparkles className="h-4 w-4 mr-2" />
                Surprise Me
              </Button>
              <Button
                onClick={() => handleGenerate(false)}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>Generate NPC</>
                )}
              </Button>
            </div>
          )}

          {result && (
            <>
              <Separator />

              <div className="space-y-4 bg-secondary/30 rounded-lg p-4 border border-primary/20">
                <div>
                  <h3 className="text-xl font-bold mb-4">{result.name}</h3>
                </div>

                <div className="space-y-3">
                  <div>
                    <Label className="text-primary text-xs font-semibold">Role</Label>
                    <p className="text-sm mt-1">{result.role}</p>
                  </div>

                  {result.physical_description && (
                    <div>
                      <Label className="text-primary text-xs font-semibold">Physical Description</Label>
                      <p className="text-sm mt-1">{result.physical_description}</p>
                    </div>
                  )}

                  {result.personality_traits && (
                    <div>
                      <Label className="text-primary text-xs font-semibold">Personality Traits</Label>
                      <p className="text-sm mt-1">{result.personality_traits}</p>
                    </div>
                  )}

                  <div>
                    <Label className="text-primary text-xs font-semibold">Voice Hook</Label>
                    <p className="text-sm mt-1">{result.voice_hook}</p>
                  </div>

                  {result.speech_pattern && (
                    <div>
                      <Label className="text-primary text-xs font-semibold">Speech Pattern</Label>
                      <p className="text-sm mt-1">{result.speech_pattern}</p>
                    </div>
                  )}

                  {result.background_hook && (
                    <div>
                      <Label className="text-primary text-xs font-semibold">Background</Label>
                      <p className="text-sm mt-1">{result.background_hook}</p>
                    </div>
                  )}

                  {result.secret_motivation && (
                    <div>
                      <Label className="text-primary text-xs font-semibold">Secret/Motivation</Label>
                      <p className="text-sm mt-1">{result.secret_motivation}</p>
                    </div>
                  )}

                  <div>
                    <Label className="text-primary text-xs font-semibold">Secret/Leverage</Label>
                    <p className="text-sm mt-1">{result.secret_leverage}</p>
                  </div>

                  <div>
                    <Label className="text-primary text-xs font-semibold">First Impression</Label>
                    <p className="text-sm mt-1">{result.first_impression}</p>
                  </div>

                  {result.flair && (
                    <div className="pt-2 border-t border-border/40">
                      <p className="text-sm italic text-muted-foreground">{result.flair}</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex gap-2 justify-end">
                <Button
                  onClick={handleCopy}
                  variant="outline"
                  size="sm"
                >
                  <Copy className="h-4 w-4 mr-2" />
                  Copy
                </Button>
                <Button
                  onClick={handleSave}
                  variant="outline"
                  size="sm"
                >
                  <Save className="h-4 w-4 mr-2" />
                  Save to Memory
                </Button>
                <Button
                  onClick={() => handleGenerate(false)}
                  variant="outline"
                  size="sm"
                  disabled={loading}
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Regenerate
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>

      <GenerationLimitModal
        open={limitModalOpen}
        onOpenChange={setLimitModalOpen}
        used={limitInfo.used}
        limit={limitInfo.limit}
      />
    </Dialog>
  );
}
