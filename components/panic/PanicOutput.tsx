'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Copy, Save, RefreshCw } from 'lucide-react';
import { PanicResult, NPCResult, TavernResult, HookResult } from '@/types/panic';
import { useToast } from '@/hooks/use-toast';
import { ClickablePersonName } from '@/components/forge/ClickablePersonName';

interface PanicOutputProps {
  type: 'npc' | 'tavern' | 'hook';
  result: PanicResult;
  campaignId: string;
  onRegenerate: () => void;
}

export function PanicOutput({ type, result, campaignId, onRegenerate }: PanicOutputProps) {
  const [saving, setSaving] = useState(false);
  const [isGeneratingNPC, setIsGeneratingNPC] = useState(false);
  const { toast } = useToast();

  const handleGenerateNPC = async (name: string, context?: string) => {
    setIsGeneratingNPC(true);

    try {
      const { supabase } = await import('@/lib/supabase/client');
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        toast({
          title: 'Not logged in',
          description: 'Please sign in to generate NPCs.',
          variant: 'destructive',
        });
        return;
      }

      // Extract location/organization name from context for role field
      let roleContext = '';
      if (context) {
        const ownerMatch = context.match(/Owner of ([^,\.]+)/i);
        const shopOwnerMatch = context.match(/Shop owner of ([^,\.]+)/i);
        const tavernMatch = context.match(/tavern known for/i);

        if (shopOwnerMatch) {
          roleContext = ` IMPORTANT: Set the "role" field to exactly: "Shop Owner of ${shopOwnerMatch[1]}"`;
        } else if (ownerMatch && tavernMatch) {
          roleContext = ` IMPORTANT: Set the "role" field to exactly: "Tavern Owner of ${ownerMatch[1]}"`;
        }
      }

      const concept = context
        ? `Generate an NPC named "${name}". Context: ${context}. Create a fully developed character that fits this context, with personality, appearance, and story hooks.${roleContext}`
        : `Generate an NPC named "${name}". Create a fully developed character with personality, appearance, and story hooks.`;

      toast({
        title: 'Generating NPC',
        description: `Creating ${name}...`,
      });

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
          tags: context ? ['npc', 'contextual'] : ['npc', 'quick-gen'],
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate NPC');
      }

      const apiResult = await response.json();

      if (!apiResult.success) {
        throw new Error(apiResult.error || 'Failed to generate NPC');
      }

      if (!apiResult.data) {
        throw new Error('No NPC data returned from API');
      }

      const npcData = apiResult.data;

      toast({
        title: 'NPC Created',
        description: `${npcData.name} has been saved to your campaign memory. Refresh to see it in the list.`,
      });
    } catch (err) {
      console.error('NPC generation error:', err);
      toast({
        title: 'Generation failed',
        description: err instanceof Error ? err.message : 'Failed to generate NPC',
        variant: 'destructive',
      });
    } finally {
      setIsGeneratingNPC(false);
    }
  };

  const handleCopy = () => {
    const text = JSON.stringify(result, null, 2);
    navigator.clipboard.writeText(text);
    toast({
      title: 'Copied to clipboard',
      description: 'Content copied successfully',
    });
  };

  const handleSave = async () => {
    setSaving(true);

    try {
      const { supabase } = await import('@/lib/supabase/client');
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        toast({
          title: 'Not logged in',
          description: 'Please sign in to save.',
          variant: 'destructive',
        });
        setSaving(false);
        return;
      }

      const title = type === 'npc' ? (result as NPCResult).name :
                    type === 'tavern' ? (result as TavernResult).name :
                    (result as HookResult).hook.substring(0, 50);

      // Convert panic type to memory type (tavern -> location)
      const memoryType = type === 'tavern' ? 'location' : type;

      // Build rich text_content for taverns to include all details
      let textContent = undefined;
      if (type === 'tavern') {
        const tavern = result as TavernResult;
        textContent = `${tavern.name}\n\n${tavern.flair}\n\nOwner: ${tavern.owner}\nSignature Detail: ${tavern.signatureDetail}\nMenu Item: ${tavern.menuItem}\nHook: ${tavern.oneHook}`;
      }

      const response = await fetch('/api/memory/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          campaignId,
          type: memoryType,
          title,
          content: result,
          text_content: textContent,
          forge_type: type === 'tavern' ? 'tavern' : undefined,
        }),
      });

      if (!response.ok) {
        toast({
          title: 'Save failed',
          description: 'Could not save to memory.',
          variant: 'destructive',
        });
        return;
      }

      toast({
        title: 'Saved to Memory',
        description: 'Item saved successfully',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Connection lost. Check your internet.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const renderCore = () => {
    if (type === 'npc') {
      const npc = result as NPCResult;
      return (
        <div className="space-y-2">
          <div>
            <span className="font-semibold text-primary">Name:</span> {npc.name}
          </div>
          <div>
            <span className="font-semibold text-primary">Role:</span> {npc.role}
          </div>
          <div>
            <span className="font-semibold text-primary">Voice Hook:</span> {npc.voiceHook}
          </div>
          <div>
            <span className="font-semibold text-primary">Secret/Leverage:</span> {npc.secretOrLeverage}
          </div>
          <div>
            <span className="font-semibold text-primary">First Impression:</span> {npc.oneLineIntro}
          </div>
        </div>
      );
    }

    if (type === 'tavern') {
      const tavern = result as TavernResult;
      return (
        <div className="space-y-2">
          <div>
            <span className="font-semibold text-primary">Name:</span> {tavern.name}
          </div>
          <div>
            <span className="font-semibold text-primary">Owner:</span>{' '}
            <ClickablePersonName
              name={tavern.owner}
              context={`Owner of ${tavern.name}, a tavern known for: ${tavern.signatureDetail}. Current hook: ${tavern.oneHook}`}
              onGenerateNPC={handleGenerateNPC}
            />
          </div>
          <div>
            <span className="font-semibold text-primary">Signature Detail:</span> {tavern.signatureDetail}
          </div>
          <div>
            <span className="font-semibold text-primary">Current Hook:</span> {tavern.oneHook}
          </div>
          <div>
            <span className="font-semibold text-primary">Menu Item:</span> {tavern.menuItem}
          </div>
        </div>
      );
    }

    if (type === 'hook') {
      const hook = result as HookResult;
      return (
        <div className="space-y-2">
          <div>
            <span className="font-semibold text-primary">Hook:</span> {hook.hook}
          </div>
          <div>
            <span className="font-semibold text-primary">Angle:</span> {hook.angle}
          </div>
          <div>
            <span className="font-semibold text-primary">Who Cares:</span> {hook.whoCares}
          </div>
          <div>
            <span className="font-semibold text-primary">Escalation:</span> {hook.escalation}
          </div>
        </div>
      );
    }
  };

  const renderFlair = () => {
    const flair = (result as any).flair;
    if (!flair) return null;

    return (
      <div className="bg-secondary/50 rounded-lg p-4 border border-primary/10">
        <div className="font-semibold text-primary mb-2">Flair</div>
        <div className="text-sm italic text-muted-foreground">{flair}</div>
      </div>
    );
  };

  return (
    <>
      <div className="mt-6 space-y-4">
      <div className="space-y-4">
        <div className="bg-secondary/30 rounded-lg p-4 border border-primary/20">
          <div className="font-semibold text-lg mb-3">Core</div>
          {renderCore()}
        </div>
        {renderFlair()}
      </div>

      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={handleCopy}>
          <Copy className="h-4 w-4 mr-2" />
          Copy
        </Button>
        <Button variant="outline" size="sm" onClick={handleSave} disabled={saving}>
          <Save className="h-4 w-4 mr-2" />
          {saving ? 'Saving...' : 'Save to Memory'}
        </Button>
        <Button variant="outline" size="sm" onClick={onRegenerate}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Regenerate
        </Button>
      </div>
    </div>
  </>
  );
}
