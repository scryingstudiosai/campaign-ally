'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Copy, Trash2 } from 'lucide-react';
import { MemoryItem } from '@/types/memory';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase/client';
import { ClickablePersonName } from '@/components/forge/ClickablePersonName';
import { EncounterCard } from './EncounterCard';
import { EnrichedForgeContent } from '@/components/forge/EnrichedForgeContent';

interface MemoryDialogProps {
  item: MemoryItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDelete: (id: string) => void;
  onRefresh?: () => void;
}

export function MemoryDialog({ item, open, onOpenChange, onDelete, onRefresh }: MemoryDialogProps) {
  const { toast } = useToast();
  const [isGeneratingNPC, setIsGeneratingNPC] = useState(false);

  if (!item) return null;

  const handleGenerateNPC = async (name: string, context?: string) => {
    setIsGeneratingNPC(true);

    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();

      if (!session) {
        toast({
          title: 'Not logged in',
          description: 'Please sign in to generate NPCs.',
          variant: 'destructive',
        });
        return;
      }

      const concept = context
        ? `Generate an NPC named "${name}". Context: ${context}. Create a fully developed character that fits this context, with personality, appearance, and story hooks.`
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
          campaignId: getCampaignId(),
          concept,
          level: 5,
          tags: context ? ['npc', 'contextual'] : ['npc', 'quick-gen'],
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

      const npcData = result.data;

      const saveResponse = await fetch('/api/memory/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          campaignId: getCampaignId(),
          title: npcData.name,
          type: 'npc',
          forge_type: 'hero',
          content: npcData,
          tags: npcData.tags || [],
        }),
      });

      if (!saveResponse.ok) {
        throw new Error('Failed to save to memory');
      }

      const savedData = await saveResponse.json();

      toast({
        title: 'NPC Created',
        description: `${npcData.name} has been saved to your campaign memory.`,
      });

      if (onRefresh) {
        onRefresh();
      }
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

  const getCampaignId = () => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('currentCampaignId') || '';
    }
    return '';
  };

  const handleCopy = () => {
    const text = JSON.stringify(item.content, null, 2);
    navigator.clipboard.writeText(text);
    toast({
      title: 'Copied to clipboard',
      description: 'Content copied successfully',
    });
  };

  const handleDelete = () => {
    onDelete(item.id);
    onOpenChange(false);
  };

  const typeColors: Record<string, string> = {
    npc: 'bg-blue-500/20 text-blue-300',
    monster: 'bg-red-500/20 text-red-300',
    tavern: 'bg-amber-500/20 text-amber-300',
    hook: 'bg-purple-500/20 text-purple-300',
    location: 'bg-green-500/20 text-green-300',
    item: 'bg-orange-500/20 text-orange-300',
    faction: 'bg-pink-500/20 text-pink-300',
    shop: 'bg-yellow-500/20 text-yellow-300',
    town: 'bg-emerald-500/20 text-emerald-300',
  };

  const renderContent = () => {
    if (item.type === 'npc' || item.forge_type === 'hero' || item.forge_type === 'villain') {
      const npc = item.content;
      return (
        <div className="space-y-3">
          <div>
            <span className="font-semibold text-primary">Name:</span>{' '}
            <span className="text-foreground">{npc.name}</span>
          </div>
          {(npc.race || npc.class || npc.level) && (
            <div>
              <span className="font-semibold text-primary">Details:</span>{' '}
              <span className="text-foreground">
                {npc.race && `${npc.race} `}
                {npc.class && `${npc.class} `}
                {npc.level && `(Level ${npc.level})`}
                {npc.cr && `(CR ${npc.cr})`}
              </span>
            </div>
          )}
          <div>
            <span className="font-semibold text-primary">Role:</span>{' '}
            <span className="text-foreground">{npc.role}</span>
          </div>
          <div>
            <span className="font-semibold text-primary">Voice Hook:</span>{' '}
            <span className="text-foreground">{npc.voiceHook}</span>
          </div>
          <div>
            <span className="font-semibold text-primary">Secret/Leverage:</span>{' '}
            <span className="text-foreground">{npc.secretOrLeverage}</span>
          </div>
          <div>
            <span className="font-semibold text-primary">First Impression:</span>{' '}
            <span className="text-foreground">{npc.oneLineIntro}</span>
          </div>
          {npc.flair && (
            <div className="bg-secondary/50 rounded-lg p-3 mt-4">
              <div className="font-semibold text-primary mb-2">Flair</div>
              <div className="text-sm italic text-muted-foreground">{npc.flair}</div>
            </div>
          )}
          {item.forge_type === 'hero' && (
            <div className="space-y-2 mt-4 pt-4 border-t border-border/40">
              {npc.alignment && (
                <div>
                  <span className="font-semibold text-primary">Alignment:</span>{' '}
                  <span className="text-foreground">{npc.alignment}</span>
                </div>
              )}
              {npc.motivation && (
                <div>
                  <span className="font-semibold text-primary">Motivation:</span>{' '}
                  <span className="text-foreground">{npc.motivation}</span>
                </div>
              )}
              {npc.flaw && (
                <div>
                  <span className="font-semibold text-primary">Flaw:</span>{' '}
                  <span className="text-foreground">{npc.flaw}</span>
                </div>
              )}
              {npc.signatureItem && (
                <div>
                  <span className="font-semibold text-primary">Signature Item:</span>{' '}
                  <span className="text-foreground">{npc.signatureItem}</span>
                </div>
              )}
              {npc.bonds && npc.bonds.length > 0 && (
                <div>
                  <div className="font-semibold text-primary mb-1">Bonds</div>
                  <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                    {npc.bonds.map((bond: string, i: number) => (
                      <li key={i}>{bond}</li>
                    ))}
                  </ul>
                </div>
              )}
              {npc.secrets && npc.secrets.length > 0 && (
                <div>
                  <div className="font-semibold text-primary mb-1">Secrets</div>
                  <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                    {npc.secrets.map((secret: string, i: number) => (
                      <li key={i}>{secret}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
          {item.forge_type === 'villain' && (
            <div className="space-y-2 mt-4 pt-4 border-t border-border/40">
              {npc.goal && (
                <div>
                  <span className="font-semibold text-primary">Goal:</span>{' '}
                  <span className="text-foreground">{npc.goal}</span>
                </div>
              )}
              {npc.method && (
                <div>
                  <span className="font-semibold text-primary">Method:</span>{' '}
                  <span className="text-foreground">{npc.method}</span>
                </div>
              )}
              {npc.weakness && (
                <div>
                  <span className="font-semibold text-primary">Weakness:</span>{' '}
                  <span className="text-foreground">{npc.weakness}</span>
                </div>
              )}
              {npc.symbol && (
                <div>
                  <span className="font-semibold text-primary">Symbol:</span>{' '}
                  <span className="text-foreground">{npc.symbol}</span>
                </div>
              )}
              {npc.monologue && (
                <div className="bg-secondary/30 rounded-lg p-3">
                  <div className="font-semibold text-primary mb-2">Monologue</div>
                  <div className="text-sm italic text-muted-foreground">"{npc.monologue}"</div>
                </div>
              )}
              {npc.lieutenant && (
                <div>
                  <span className="font-semibold text-primary">Lieutenant:</span>{' '}
                  <span className="text-foreground">{npc.lieutenant}</span>
                </div>
              )}
              {npc.minions && npc.minions.length > 0 && (
                <div>
                  <div className="font-semibold text-primary mb-1">Minions</div>
                  <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                    {npc.minions.map((minion: string, i: number) => (
                      <li key={i}>{minion}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      );
    }

    if (item.type === 'monster' || item.forge_type === 'monster') {
      const monster = item.content;
      return (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div>
              <span className="font-semibold text-primary">CR:</span>{' '}
              <span className="text-foreground">{monster.cr}</span>
            </div>
            <div>
              <span className="font-semibold text-primary">HP:</span>{' '}
              <span className="text-foreground">{monster.hp}</span>
            </div>
            <div>
              <span className="font-semibold text-primary">AC:</span>{' '}
              <span className="text-foreground">{monster.ac}</span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <span className="font-semibold text-primary">Type:</span>{' '}
              <span className="text-foreground capitalize">{monster.size} {monster.type}</span>
            </div>
            <div>
              <span className="font-semibold text-primary">Speed:</span>{' '}
              <span className="text-foreground">{monster.speed}</span>
            </div>
          </div>
          {monster.abilities && (
            <div className="bg-secondary/30 rounded-lg p-3">
              <div className="font-semibold text-primary mb-2">Ability Scores</div>
              <div className="grid grid-cols-6 gap-2 text-sm text-center">
                <div>
                  <div className="font-semibold text-muted-foreground">STR</div>
                  <div className="text-foreground">{monster.abilities.str}</div>
                </div>
                <div>
                  <div className="font-semibold text-muted-foreground">DEX</div>
                  <div className="text-foreground">{monster.abilities.dex}</div>
                </div>
                <div>
                  <div className="font-semibold text-muted-foreground">CON</div>
                  <div className="text-foreground">{monster.abilities.con}</div>
                </div>
                <div>
                  <div className="font-semibold text-muted-foreground">INT</div>
                  <div className="text-foreground">{monster.abilities.int}</div>
                </div>
                <div>
                  <div className="font-semibold text-muted-foreground">WIS</div>
                  <div className="text-foreground">{monster.abilities.wis}</div>
                </div>
                <div>
                  <div className="font-semibold text-muted-foreground">CHA</div>
                  <div className="text-foreground">{monster.abilities.cha}</div>
                </div>
              </div>
            </div>
          )}
          {monster.traits && monster.traits.length > 0 && (
            <div>
              <div className="font-semibold text-primary mb-2">Traits</div>
              <ul className="list-disc list-inside space-y-1">
                {monster.traits.map((trait: string, i: number) => (
                  <li key={i} className="text-foreground text-sm">{trait}</li>
                ))}
              </ul>
            </div>
          )}
          {monster.actions && monster.actions.length > 0 && (
            <div>
              <div className="font-semibold text-primary mb-2">Actions</div>
              <div className="space-y-2">
                {monster.actions.map((action: any, i: number) => (
                  <div key={i} className="bg-secondary/20 rounded-lg p-3">
                    <div className="font-medium text-foreground mb-1">{action.name}</div>
                    <div className="text-sm text-muted-foreground">{action.description}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
          {monster.specialActions && monster.specialActions.length > 0 && (
            <div>
              <div className="font-semibold text-primary mb-2">Special Actions</div>
              <div className="space-y-2">
                {monster.specialActions.map((action: any, i: number) => (
                  <div key={i} className="bg-secondary/30 rounded-lg p-3">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <div className="font-medium text-foreground">{action.name}</div>
                      {action.recharge && (
                        <div className="text-xs text-muted-foreground whitespace-nowrap">{action.recharge}</div>
                      )}
                    </div>
                    <div className="text-sm text-muted-foreground">{action.description}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
          {monster.tactics && (
            <div>
              <span className="font-semibold text-primary">Tactics:</span>{' '}
              <span className="text-foreground">{monster.tactics}</span>
            </div>
          )}
          {monster.weakness && (
            <div>
              <span className="font-semibold text-primary">Weakness:</span>{' '}
              <span className="text-foreground">{monster.weakness}</span>
            </div>
          )}
          {monster.lair && (
            <div>
              <div className="font-semibold text-primary mb-2">Lair</div>
              <div className="text-foreground bg-secondary/20 rounded-lg p-3">{monster.lair}</div>
            </div>
          )}
          {monster.loot && monster.loot.length > 0 && (
            <div>
              <div className="font-semibold text-primary mb-2">Loot</div>
              <ul className="list-disc list-inside space-y-1">
                {monster.loot.map((item: string, i: number) => (
                  <li key={i} className="text-foreground text-sm">{item}</li>
                ))}
              </ul>
            </div>
          )}
          {monster.flair && (
            <div className="bg-secondary/50 rounded-lg p-3 mt-4">
              <div className="font-semibold text-primary mb-2">Description</div>
              <div className="text-sm italic text-muted-foreground">{monster.flair}</div>
            </div>
          )}
        </div>
      );
    }

    if (item.type === 'tavern') {
      const tavern = item.content;
      return (
        <div className="space-y-3">
          <div>
            <span className="font-semibold text-primary">Name:</span>{' '}
            <span className="text-foreground">{tavern.name}</span>
          </div>
          <div>
            <span className="font-semibold text-primary">Owner:</span>{' '}
            <span className="text-foreground">
              <ClickablePersonName
                name={tavern.owner}
                context={`Owner of ${tavern.name}, a tavern known for: ${tavern.signatureDetail}. Current hook: ${tavern.oneHook}`}
                onGenerateNPC={handleGenerateNPC}
              />
            </span>
          </div>
          <div>
            <span className="font-semibold text-primary">Signature Detail:</span>{' '}
            <span className="text-foreground">{tavern.signatureDetail}</span>
          </div>
          <div>
            <span className="font-semibold text-primary">Current Hook:</span>{' '}
            <span className="text-foreground">{tavern.oneHook}</span>
          </div>
          <div>
            <span className="font-semibold text-primary">Menu Item:</span>{' '}
            <span className="text-foreground">{tavern.menuItem}</span>
          </div>
          {tavern.flair && (
            <div className="bg-secondary/50 rounded-lg p-3 mt-4">
              <div className="font-semibold text-primary mb-2">Flair</div>
              <div className="text-sm italic text-muted-foreground">{tavern.flair}</div>
            </div>
          )}
        </div>
      );
    }

    if (item.type === 'hook') {
      const hook = item.content;
      return (
        <div className="space-y-3">
          <div>
            <span className="font-semibold text-primary">Hook:</span>{' '}
            <span className="text-foreground">{hook.hook}</span>
          </div>
          <div>
            <span className="font-semibold text-primary">Angle:</span>{' '}
            <span className="text-foreground">{hook.angle}</span>
          </div>
          <div>
            <span className="font-semibold text-primary">Who Cares:</span>{' '}
            <span className="text-foreground">{hook.whoCares}</span>
          </div>
          <div>
            <span className="font-semibold text-primary">Escalation:</span>{' '}
            <span className="text-foreground">{hook.escalation}</span>
          </div>
          {hook.flair && (
            <div className="bg-secondary/50 rounded-lg p-3 mt-4">
              <div className="font-semibold text-primary mb-2">Flair</div>
              <div className="text-sm italic text-muted-foreground">{hook.flair}</div>
            </div>
          )}
        </div>
      );
    }

    if (item.forge_type === 'item') {
      const magicItem = item.content;
      return (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <span className="font-semibold text-primary">Type:</span>{' '}
              <span className="text-foreground capitalize">{magicItem.itemType}</span>
            </div>
            <div>
              <span className="font-semibold text-primary">Rarity:</span>{' '}
              <span className="text-foreground capitalize">{magicItem.rarity}</span>
            </div>
          </div>
          <div>
            <span className="font-semibold text-primary">Attunement:</span>{' '}
            <span className="text-foreground">{magicItem.attunement ? 'Required' : 'Not Required'}</span>
          </div>
          <div>
            <div className="font-semibold text-primary mb-2">Effect</div>
            <div className="text-foreground bg-secondary/20 rounded-lg p-3">{magicItem.effect}</div>
          </div>
          {(magicItem.charges || magicItem.recharge) && (
            <div className="bg-secondary/30 rounded-lg p-3">
              <div className="font-semibold text-primary mb-2">Charges</div>
              {magicItem.charges && (
                <div className="text-sm text-muted-foreground">
                  <span className="font-semibold">Charges:</span> {magicItem.charges}
                </div>
              )}
              {magicItem.recharge && (
                <div className="text-sm text-muted-foreground">
                  <span className="font-semibold">Recharge:</span> {magicItem.recharge}
                </div>
              )}
            </div>
          )}
          {magicItem.history && (
            <div>
              <div className="font-semibold text-primary mb-2">History</div>
              <div className="text-foreground">{magicItem.history}</div>
            </div>
          )}
          {magicItem.curse && (
            <div className="bg-red-950/30 border border-red-900/50 rounded-lg p-3">
              <div className="font-semibold text-red-400 mb-2">Curse</div>
              <div className="text-foreground">{magicItem.curse}</div>
            </div>
          )}
          {magicItem.flair && (
            <div className="bg-secondary/50 rounded-lg p-3 mt-4">
              <div className="font-semibold text-primary mb-2">Flair</div>
              <div className="text-sm italic text-muted-foreground">{magicItem.flair}</div>
            </div>
          )}
        </div>
      );
    }

    if (item.forge_type === 'shop') {
      const shop = item.content;
      return (
        <div className="space-y-4">
          <div>
            <span className="font-semibold text-primary">Type:</span>{' '}
            <span className="text-foreground">{shop.type}</span>
          </div>
          <div>
            <span className="font-semibold text-primary">Location:</span>{' '}
            <span className="text-foreground">{shop.location}</span>
          </div>
          <div>
            <span className="font-semibold text-primary">Atmosphere:</span>{' '}
            <span className="text-foreground">{shop.atmosphere}</span>
          </div>
          {shop.owner && (
            <div className="bg-secondary/30 rounded-lg p-3">
              <div className="font-semibold text-primary mb-2">Owner</div>
              <div className="font-medium text-foreground">
                <ClickablePersonName
                  name={shop.owner.name}
                  context={`${shop.owner.species} owner of ${item.title}, a ${shop.type} located at ${shop.location}. Personality: ${shop.owner.personality}. ${shop.owner.secret ? `Secret: ${shop.owner.secret}` : ''}`}
                  onGenerateNPC={handleGenerateNPC}
                />
              </div>
              <div className="text-sm text-muted-foreground mt-1">
                <span className="font-semibold">Species:</span> {shop.owner.species}
              </div>
              <div className="text-sm text-muted-foreground">
                <span className="font-semibold">Personality:</span> {shop.owner.personality}
              </div>
              {shop.owner.secret && (
                <div className="text-sm text-muted-foreground">
                  <span className="font-semibold">Secret:</span> {shop.owner.secret}
                </div>
              )}
            </div>
          )}
          {shop.inventory && shop.inventory.length > 0 && (
            <div>
              <div className="font-semibold text-primary mb-2">Inventory</div>
              <div className="space-y-2">
                {shop.inventory.map((item: any, i: number) => (
                  <div key={i} className="bg-secondary/20 rounded-lg p-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="font-medium text-foreground">{item.item}</div>
                      <div className="text-sm text-muted-foreground whitespace-nowrap">{item.price}</div>
                    </div>
                    {item.description && (
                      <div className="text-sm text-muted-foreground mt-1">{item.description}</div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
          <div>
            <span className="font-semibold text-primary">Current Hook:</span>{' '}
            <span className="text-foreground">{shop.hook}</span>
          </div>
          {shop.flair && (
            <div className="bg-secondary/50 rounded-lg p-3 mt-4">
              <div className="font-semibold text-primary mb-2">Flair</div>
              <div className="text-sm italic text-muted-foreground">{shop.flair}</div>
            </div>
          )}
        </div>
      );
    }

    if (item.forge_type === 'town') {
      const town = item.content;
      return (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <span className="font-semibold text-primary">Size:</span>{' '}
              <span className="text-foreground capitalize">{town.size}</span>
            </div>
            <div>
              <span className="font-semibold text-primary">Population:</span>{' '}
              <span className="text-foreground">{town.population}</span>
            </div>
          </div>
          <div>
            <span className="font-semibold text-primary">Government:</span>{' '}
            <EnrichedForgeContent
              content={town.government}
              campaignId={item.campaign_id}
              className="inline"
            />
          </div>
          <div>
            <span className="font-semibold text-primary">Atmosphere:</span>{' '}
            <EnrichedForgeContent
              content={town.atmosphere}
              campaignId={item.campaign_id}
              className="inline"
            />
          </div>
          <div>
            <span className="font-semibold text-primary">Problem:</span>{' '}
            <EnrichedForgeContent
              content={town.problem}
              campaignId={item.campaign_id}
              className="inline"
            />
          </div>
          <div>
            <span className="font-semibold text-primary">Secret History:</span>{' '}
            <EnrichedForgeContent
              content={town.secretHistory}
              campaignId={item.campaign_id}
              className="inline"
            />
          </div>
          {town.landmarks && town.landmarks.length > 0 && (
            <div>
              <div className="font-semibold text-primary mb-2">Landmarks</div>
              <ul className="list-disc list-inside space-y-1">
                {town.landmarks.map((landmark: string, i: number) => (
                  <li key={i} className="text-foreground">
                    <EnrichedForgeContent
                      content={landmark}
                      campaignId={item.campaign_id}
                      className="inline"
                    />
                  </li>
                ))}
              </ul>
            </div>
          )}
          {town.notableNPCs && town.notableNPCs.length > 0 && (
            <div>
              <div className="font-semibold text-primary mb-2">Notable NPCs</div>
              <div className="space-y-3">
                {town.notableNPCs.map((npc: any, i: number) => (
                  <div key={i} className="bg-secondary/30 rounded-lg p-3">
                    <div className="font-medium text-foreground">
                      <ClickablePersonName
                        name={npc.name}
                        context={`Notable NPC in ${item.title}. Role: ${npc.role}. Location: ${npc.location}. Quirk: ${npc.quirk}${npc.secret ? `. Secret: ${npc.secret}` : ''}`}
                        onGenerateNPC={handleGenerateNPC}
                      />
                    </div>
                    <div className="text-sm text-muted-foreground mt-1">
                      <span className="font-semibold">Role:</span>{' '}
                      <EnrichedForgeContent
                        content={npc.role}
                        campaignId={item.campaign_id}
                        className="inline"
                      />
                    </div>
                    <div className="text-sm text-muted-foreground">
                      <span className="font-semibold">Quirk:</span>{' '}
                      <EnrichedForgeContent
                        content={npc.quirk}
                        campaignId={item.campaign_id}
                        className="inline"
                      />
                    </div>
                    <div className="text-sm text-muted-foreground">
                      <span className="font-semibold">Location:</span>{' '}
                      <EnrichedForgeContent
                        content={npc.location}
                        campaignId={item.campaign_id}
                        className="inline"
                      />
                    </div>
                    {npc.secret && (
                      <div className="text-sm text-muted-foreground">
                        <span className="font-semibold">Secret:</span>{' '}
                        <EnrichedForgeContent
                          content={npc.secret}
                          campaignId={item.campaign_id}
                          className="inline"
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
          {town.flair && (
            <div className="bg-secondary/50 rounded-lg p-3 mt-4">
              <div className="font-semibold text-primary mb-2">Flair</div>
              <div className="text-sm italic text-muted-foreground">
                <EnrichedForgeContent
                  content={town.flair}
                  campaignId={item.campaign_id}
                />
              </div>
            </div>
          )}
        </div>
      );
    }

    if (item.forge_type === 'nation') {
      const nation = item.content;
      return (
        <div className="space-y-4">
          <div>
            <span className="font-semibold text-primary">Type:</span>{' '}
            <span className="text-foreground capitalize">{nation.type}</span>
          </div>
          <div>
            <span className="font-semibold text-primary">Territory:</span>{' '}
            <span className="text-foreground">{nation.territory}</span>
          </div>
          <div>
            <span className="font-semibold text-primary">Ideology:</span>{' '}
            <span className="text-foreground">{nation.ideology}</span>
          </div>
          {nation.leadership && (
            <div>
              <div className="font-semibold text-primary mb-2">Leadership</div>
              <div className="bg-secondary/30 rounded-lg p-3">
                <div className="text-sm text-muted-foreground mb-2">
                  <span className="font-semibold">Structure:</span> {nation.leadership.structure}
                </div>
                {nation.leadership.leaders && nation.leadership.leaders.length > 0 && (
                  <div className="space-y-2">
                    {nation.leadership.leaders.map((leader: any, i: number) => (
                      <div key={i} className="bg-secondary/20 rounded p-2">
                        <div className="font-medium text-foreground">
                          <ClickablePersonName
                            name={leader.name}
                            context={`Leader of ${item.title}. Title: ${leader.title}. Leadership structure: ${nation.leadership.structure}. Goal: ${leader.goal}`}
                            onGenerateNPC={handleGenerateNPC}
                          />
                        </div>
                        <div className="text-sm text-muted-foreground">
                          <span className="font-semibold">Title:</span> {leader.title}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          <span className="font-semibold">Goal:</span> {leader.goal}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
          {nation.resources && nation.resources.length > 0 && (
            <div>
              <div className="font-semibold text-primary mb-2">Resources</div>
              <ul className="list-disc list-inside space-y-1">
                {nation.resources.map((resource: string, i: number) => (
                  <li key={i} className="text-foreground">{resource}</li>
                ))}
              </ul>
            </div>
          )}
          <div>
            <span className="font-semibold text-primary">Military:</span>{' '}
            <span className="text-foreground">{nation.military}</span>
          </div>
          <div>
            <span className="font-semibold text-primary">Conflict:</span>{' '}
            <span className="text-foreground">{nation.conflict}</span>
          </div>
          <div>
            <span className="font-semibold text-primary">Hook:</span>{' '}
            <span className="text-foreground">{nation.hook}</span>
          </div>
          {nation.symbols && (
            <div className="bg-secondary/30 rounded-lg p-3">
              <div className="font-semibold text-primary mb-2">Symbols</div>
              <div className="text-sm text-muted-foreground">
                <span className="font-semibold">Banner:</span> {nation.symbols.banner}
              </div>
              <div className="text-sm text-muted-foreground">
                <span className="font-semibold">Motto:</span> {nation.symbols.motto}
              </div>
            </div>
          )}
          {nation.flair && (
            <div className="bg-secondary/50 rounded-lg p-3 mt-4">
              <div className="font-semibold text-primary mb-2">Flair</div>
              <div className="text-sm italic text-muted-foreground">{nation.flair}</div>
            </div>
          )}
        </div>
      );
    }

    if (item.forge_type === 'scroll') {
      const scroll = item.content;
      return (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <span className="font-semibold text-primary">Level:</span>{' '}
              <span className="text-foreground">{scroll.level}</span>
            </div>
            <div>
              <span className="font-semibold text-primary">School:</span>{' '}
              <span className="text-foreground">{scroll.school}</span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <span className="font-semibold text-primary">Casting Time:</span>{' '}
              <span className="text-foreground">{scroll.castingTime}</span>
            </div>
            <div>
              <span className="font-semibold text-primary">Range:</span>{' '}
              <span className="text-foreground">{scroll.range}</span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <span className="font-semibold text-primary">Components:</span>{' '}
              <span className="text-foreground">{scroll.components}</span>
            </div>
            <div>
              <span className="font-semibold text-primary">Duration:</span>{' '}
              <span className="text-foreground">{scroll.duration}</span>
            </div>
          </div>
          <div>
            <div className="font-semibold text-primary mb-2">Description</div>
            <div className="text-foreground bg-secondary/20 rounded-lg p-3">{scroll.description}</div>
          </div>
          {scroll.atHigherLevels && (
            <div>
              <div className="font-semibold text-primary mb-2">At Higher Levels</div>
              <div className="text-foreground">{scroll.atHigherLevels}</div>
            </div>
          )}
          {scroll.classes && scroll.classes.length > 0 && (
            <div>
              <span className="font-semibold text-primary">Classes:</span>{' '}
              <span className="text-foreground">{scroll.classes.join(', ')}</span>
            </div>
          )}
          {scroll.flair && (
            <div className="bg-secondary/50 rounded-lg p-3 mt-4">
              <div className="font-semibold text-primary mb-2">Flair</div>
              <div className="text-sm italic text-muted-foreground">{scroll.flair}</div>
            </div>
          )}
        </div>
      );
    }

    if (item.forge_type === 'loot') {
      const loot = item.content;
      return (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <span className="font-semibold text-primary">Party Level:</span>{' '}
              <span className="text-foreground">{loot.partyLevel}</span>
            </div>
            <div>
              <span className="font-semibold text-primary">Total Value:</span>{' '}
              <span className="text-foreground">{loot.totalValue}</span>
            </div>
          </div>
          <div>
            <span className="font-semibold text-primary">Theme:</span>{' '}
            <span className="text-foreground">{loot.theme}</span>
          </div>
          {loot.coins && (
            <div className="bg-secondary/30 rounded-lg p-3">
              <div className="font-semibold text-primary mb-2">Coins</div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="text-muted-foreground">
                  <span className="font-semibold">Copper:</span> {loot.coins.copper}
                </div>
                <div className="text-muted-foreground">
                  <span className="font-semibold">Silver:</span> {loot.coins.silver}
                </div>
                <div className="text-muted-foreground">
                  <span className="font-semibold">Gold:</span> {loot.coins.gold}
                </div>
                <div className="text-muted-foreground">
                  <span className="font-semibold">Platinum:</span> {loot.coins.platinum}
                </div>
              </div>
            </div>
          )}
          {loot.mundaneItems && loot.mundaneItems.length > 0 && (
            <div>
              <div className="font-semibold text-primary mb-2">Mundane Items</div>
              <div className="space-y-2">
                {loot.mundaneItems.map((item: any, i: number) => (
                  <div key={i} className="bg-secondary/20 rounded-lg p-2.5 flex justify-between">
                    <span className="text-foreground">{item.item} x{item.quantity}</span>
                    <span className="text-muted-foreground">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          {loot.magicItems && loot.magicItems.length > 0 && (
            <div>
              <div className="font-semibold text-primary mb-2">Magic Items</div>
              <div className="space-y-2">
                {loot.magicItems.map((item: any, i: number) => (
                  <div key={i} className="bg-secondary/30 rounded-lg p-2.5">
                    <div className="flex justify-between items-start mb-1">
                      <span className="font-medium text-foreground">{item.item}</span>
                      <span className="text-xs text-muted-foreground capitalize">{item.rarity}</span>
                    </div>
                    <div className="text-sm text-muted-foreground">{item.description}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
          {loot.special && (
            <div className="bg-secondary/40 rounded-lg p-3">
              <div className="font-semibold text-primary mb-2">Special Treasure</div>
              <div className="text-foreground">{loot.special}</div>
            </div>
          )}
          {loot.flair && (
            <div className="bg-secondary/50 rounded-lg p-3 mt-4">
              <div className="font-semibold text-primary mb-2">Flair</div>
              <div className="text-sm italic text-muted-foreground">{loot.flair}</div>
            </div>
          )}
        </div>
      );
    }

    if (item.forge_type === 'encounter-seq') {
      return (
        <EncounterCard
          title={item.title}
          encounter={item.content}
          tags={item.tags || []}
          date={new Date(item.created_at).toLocaleDateString()}
          onDelete={() => handleDelete()}
        />
      );
    }

    return <pre className="text-xs overflow-auto">{JSON.stringify(item.content, null, 2)}</pre>;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={item?.forge_type === 'encounter-seq' ? "max-w-7xl max-h-[90vh] overflow-y-auto" : "max-w-2xl max-h-[80vh] overflow-y-auto"} aria-describedby="memory-dialog-description">
        {item.forge_type === 'encounter-seq' ? (
          renderContent()
        ) : (
          <>
            <DialogHeader>
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <DialogTitle className="text-2xl">{item.title}</DialogTitle>
                  <DialogDescription id="memory-dialog-description">
                    {new Date(item.created_at).toLocaleDateString()}
                  </DialogDescription>
                </div>
                <Badge className={typeColors[item.type]}>
                  {item.type.toUpperCase()}
                </Badge>
              </div>
            </DialogHeader>
            <div className="py-4">
              {renderContent()}
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" size="sm" onClick={handleCopy}>
                <Copy className="h-4 w-4 mr-2" />
                Copy
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleDelete}
                className="text-destructive hover:text-destructive"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
