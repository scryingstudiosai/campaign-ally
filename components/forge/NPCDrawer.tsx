'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Loader2, Save } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface NPCData {
  name: string;
  race: string;
  class: string;
  level: number;
  alignment: string;
  role: string;
  motivation: string;
  flaw: string;
  voiceHook: string;
  secretOrLeverage: string;
  oneLineIntro: string;
  signatureItem: string;
  flair: string;
  bonds?: string[];
  secrets?: string[];
}

interface NPCDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  npcName: string;
  npcContext?: string;
  campaignId: string;
  onSave?: (npc: NPCData) => void;
}

export function NPCDrawer({ isOpen, onClose, npcName, npcContext, campaignId, onSave }: NPCDrawerProps) {
  const [npcData, setNpcData] = useState<NPCData | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  const generateNPC = async () => {
    setIsGenerating(true);
    setError(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        throw new Error('Not logged in');
      }

      const concept = npcContext
        ? `Generate an NPC named "${npcName}". Context: ${npcContext}. Create a fully developed character that fits this context, with personality, appearance, and story hooks.`
        : `Generate an NPC named "${npcName}". Create a fully developed character with personality, appearance, and story hooks.`;

      const response = await fetch('/api/ai/forge/hero', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          campaignId,
          concept,
          level: 5,
          tags: npcContext ? ['npc', 'contextual'] : ['npc', 'quick-gen'],
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate NPC');
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to generate NPC');
      }

      if (!result.data) {
        throw new Error('No NPC data returned from API');
      }

      setNpcData(result.data);
    } catch (err) {
      console.error('NPC generation error:', err);
      setError(err instanceof Error ? err.message : 'Failed to generate NPC');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSaveToMemory = async () => {
    if (!npcData) return;

    setIsSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        throw new Error('Not logged in');
      }

      const response = await fetch('/api/memory/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          campaignId,
          type: 'npc',
          title: `${npcData.name} - ${npcData.class}`,
          content: npcData,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save to memory');
      }

      toast({
        title: 'Saved to Memory',
        description: `${npcData.name} has been saved to your campaign memory.`,
      });

      if (onSave) {
        onSave(npcData);
      }
    } catch (err) {
      console.error('Save error:', err);
      toast({
        title: 'Save failed',
        description: err instanceof Error ? err.message : 'Could not save to memory',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleOpen = (open: boolean) => {
    if (open && !npcData && !isGenerating) {
      generateNPC();
    } else if (!open) {
      onClose();
      setTimeout(() => {
        setNpcData(null);
        setError(null);
      }, 300);
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={handleOpen}>
      <SheetContent
        side="right"
        className="w-full sm:w-[540px] bg-background/95 backdrop-blur-sm border-l border-primary/20 overflow-y-auto"
      >
        <SheetHeader>
          <SheetTitle className="text-xl font-bold bg-gradient-to-r from-cyan-400 to-violet-400 bg-clip-text text-transparent">
            Conjured NPC
          </SheetTitle>
        </SheetHeader>

        <div className="mt-6 space-y-4 animate-in fade-in slide-in-from-right duration-500">
          {isGenerating && (
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
              <Loader2 className="h-8 w-8 animate-spin text-cyan-400" />
              <p className="text-sm text-muted-foreground italic">
                Weaving essence into form...
              </p>
            </div>
          )}

          {error && (
            <Card className="p-4 border-destructive/50 bg-destructive/10">
              <p className="text-sm text-destructive">{error}</p>
              <Button
                onClick={generateNPC}
                variant="outline"
                size="sm"
                className="mt-3"
              >
                Try Again
              </Button>
            </Card>
          )}

          {npcData && (
            <div className="space-y-4">
              <Card className="p-4 bg-card/50 border-cyan-500/30">
                <h3 className="text-lg font-bold text-cyan-300 mb-2">{npcData.name}</h3>
                <div className="flex flex-wrap gap-2 mb-3">
                  <Badge variant="outline" className="bg-blue-500/15 text-blue-300 border-blue-500/30">
                    {npcData.race}
                  </Badge>
                  <Badge variant="outline" className="bg-amber-500/15 text-amber-300 border-amber-500/30">
                    {npcData.class}
                  </Badge>
                  <Badge variant="outline" className="bg-green-500/15 text-green-300 border-green-500/30">
                    Level {npcData.level}
                  </Badge>
                </div>
              </Card>

              <Card className="p-4 bg-card/50 border-primary/20">
                <div className="space-y-2">
                  <div>
                    <span className="text-sm font-semibold text-primary">Role:</span>{' '}
                    <span className="text-sm text-muted-foreground">{npcData.role}</span>
                  </div>
                  <div>
                    <span className="text-sm font-semibold text-primary">Alignment:</span>{' '}
                    <span className="text-sm text-muted-foreground">{npcData.alignment}</span>
                  </div>
                </div>
              </Card>

              <Card className="p-4 bg-card/50 border-primary/20">
                <h4 className="text-sm font-semibold text-primary mb-2">First Impression</h4>
                <p className="text-sm text-muted-foreground leading-relaxed italic">{npcData.oneLineIntro}</p>
              </Card>

              <Card className="p-4 bg-card/50 border-primary/20">
                <h4 className="text-sm font-semibold text-primary mb-2">Appearance</h4>
                <p className="text-sm text-muted-foreground leading-relaxed">{npcData.flair}</p>
              </Card>

              <Card className="p-4 bg-card/50 border-violet-500/30">
                <h4 className="text-sm font-semibold text-violet-300 mb-2">Motivation</h4>
                <p className="text-sm text-muted-foreground leading-relaxed">{npcData.motivation}</p>
              </Card>

              <Card className="p-4 bg-card/50 border-orange-500/30">
                <h4 className="text-sm font-semibold text-orange-300 mb-2">Flaw</h4>
                <p className="text-sm text-muted-foreground leading-relaxed">{npcData.flaw}</p>
              </Card>

              <Card className="p-4 bg-card/50 border-primary/20">
                <h4 className="text-sm font-semibold text-primary mb-2">Voice Hook</h4>
                <p className="text-sm text-muted-foreground leading-relaxed italic">"{npcData.voiceHook}"</p>
              </Card>

              <Card className="p-4 bg-card/50 border-red-500/30">
                <h4 className="text-sm font-semibold text-red-300 mb-2">Secret/Leverage</h4>
                <p className="text-sm text-muted-foreground leading-relaxed">{npcData.secretOrLeverage}</p>
              </Card>

              <Card className="p-4 bg-card/50 border-primary/20">
                <h4 className="text-sm font-semibold text-primary mb-2">Signature Item</h4>
                <p className="text-sm text-muted-foreground leading-relaxed">{npcData.signatureItem}</p>
              </Card>

              {npcData.bonds && npcData.bonds.length > 0 && (
                <Card className="p-4 bg-card/50 border-primary/20">
                  <h4 className="text-sm font-semibold text-primary mb-2">Bonds</h4>
                  <ul className="list-disc list-inside space-y-1">
                    {npcData.bonds.map((bond, i) => (
                      <li key={i} className="text-sm text-muted-foreground">{bond}</li>
                    ))}
                  </ul>
                </Card>
              )}

              {npcData.secrets && npcData.secrets.length > 0 && (
                <Card className="p-4 bg-card/50 border-red-500/30">
                  <h4 className="text-sm font-semibold text-red-300 mb-2">Additional Secrets</h4>
                  <ul className="list-disc list-inside space-y-1">
                    {npcData.secrets.map((secret, i) => (
                      <li key={i} className="text-sm text-muted-foreground">{secret}</li>
                    ))}
                  </ul>
                </Card>
              )}

              <Button
                onClick={handleSaveToMemory}
                className="w-full"
                variant="outline"
                disabled={isSaving}
              >
                <Save className="h-4 w-4 mr-2" />
                {isSaving ? 'Saving...' : 'Save to Memory'}
              </Button>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
