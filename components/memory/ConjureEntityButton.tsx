'use client';

import { useState } from 'react';
import { Sparkles, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase/client';

interface ConjureEntityButtonProps {
  entityName: string;
  entityType: 'NPC' | 'Location' | 'Town' | 'Item' | 'Monster' | 'Landmark' | 'Shop';
  sourceMemoryId: string;
  sourceMemoryType: string;
  sourceEntityName: string;
  contextKey: string;
  description?: string;
  additionalContext?: Record<string, any>;
  campaignId: string;
  onSuccess?: (newEntity: any) => void;
  onError?: (error: Error) => void;
  displayAs?: 'link' | 'button';
  className?: string;
}

export function ConjureEntityButton({
  entityName,
  entityType,
  sourceMemoryId,
  sourceMemoryType,
  sourceEntityName,
  contextKey,
  description,
  additionalContext,
  campaignId,
  onSuccess,
  onError,
  displayAs = 'link',
  className = ''
}: ConjureEntityButtonProps) {
  const [isGenerating, setIsGenerating] = useState(false);

  async function handleConjure(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();

    setIsGenerating(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Please sign in to generate entities');
        return;
      }

      toast.info(`Generating ${entityName}...`, { duration: 2000 });

      const contextPrompt = buildContextPrompt({
        entityName,
        entityType,
        sourceEntityName,
        sourceMemoryType,
        contextKey,
        description,
        additionalContext
      });

      const endpoint = getGenerationEndpoint(entityType);

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          name: entityName,
          campaignId,
          sourceContext: contextPrompt,
          sourceMemoryId,
          contextKey,
          quickGenerate: true,
          ...additionalContext
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to generate ${entityType}`);
      }

      const result = await response.json();
      const newEntity = result.data || result;

      try {
        const relationResponse = await fetch('/api/relations/auto-create', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            sourceMemoryId,
            targetMemoryId: newEntity.id || newEntity.memory_id,
            contextKey,
            campaignId
          })
        });

        if (relationResponse.ok) {
          const relationResult = await relationResponse.json();
          if (relationResult.created) {
            toast.success(`Created ${entityName} and linked relationships!`);
          } else {
            toast.success(`Created ${entityName}!`);
          }
        } else {
          toast.success(`Created ${entityName}!`);
        }
      } catch (err) {
        console.error('Relationship creation failed:', err);
        toast.success(`Created ${entityName}!`);
      }

      onSuccess?.(newEntity);

    } catch (error) {
      console.error('Conjure error:', error);
      toast.error(`Failed to create ${entityName}`);
      onError?.(error as Error);
    } finally {
      setIsGenerating(false);
    }
  }

  if (displayAs === 'button') {
    return (
      <button
        onClick={handleConjure}
        disabled={isGenerating}
        className={`inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-cyan-400 hover:text-cyan-300 hover:bg-cyan-400/10 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
      >
        {isGenerating ? (
          <>
            <Loader2 className="w-3 h-3 animate-spin" />
            Generating...
          </>
        ) : (
          <>
            <Sparkles className="w-3 h-3" />
            Conjure {entityType} Card
          </>
        )}
      </button>
    );
  }

  return (
    <button
      onClick={handleConjure}
      disabled={isGenerating}
      className={`inline text-amber-400 hover:text-amber-300 underline decoration-dotted underline-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
      title={`Click to conjure ${entityName}`}
    >
      {isGenerating ? (
        <span className="inline-flex items-center gap-1">
          <Loader2 className="w-3 h-3 animate-spin" />
          {entityName}
        </span>
      ) : (
        entityName
      )}
    </button>
  );
}

function buildContextPrompt(params: {
  entityName: string;
  entityType: string;
  sourceEntityName: string;
  sourceMemoryType: string;
  contextKey: string;
  description?: string;
  additionalContext?: Record<string, any>;
}): string {
  const {
    entityName,
    sourceEntityName,
    sourceMemoryType,
    contextKey,
    description,
    additionalContext
  } = params;

  let prompt = '';

  const relationshipContext = getRelationshipContext(contextKey, sourceMemoryType, sourceEntityName);
  if (relationshipContext) {
    prompt += relationshipContext + '\n\n';
  }

  if (description) {
    prompt += `Description: ${description}\n\n`;
  }

  if (additionalContext) {
    for (const [key, value] of Object.entries(additionalContext)) {
      if (value && typeof value === 'string') {
        prompt += `${key}: ${value}\n`;
      }
    }
  }

  return prompt.trim();
}

function getRelationshipContext(
  contextKey: string,
  sourceType: string,
  sourceName: string
): string | null {
  const contexts: Record<string, string> = {
    owner: `Owner of ${sourceName}`,
    innkeeper: `Innkeeper at ${sourceName}`,
    proprietor: `Proprietor of ${sourceName}`,
    staff: `Staff member at ${sourceName}`,
    patron: `Frequent patron at ${sourceName}`,
    current_patron: `Current patron at ${sourceName}`,
    item: `Item sold at ${sourceName}`,
    notable_item: `Notable item at ${sourceName}`,
    landmark: `Notable landmark in ${sourceName}`,
    notable: `Notable resident of ${sourceName}`,
    notable_npc: `Notable figure in ${sourceName}`,
    capital: `Capital city of ${sourceName}`,
    leader: `Leader of ${sourceName}`,
    key_leader: `Key leader of ${sourceName}`,
    headquarters: `Headquarters of ${sourceName}`,
    guildmaster: `Guild master of ${sourceName}`,
    minion: `Minion serving ${sourceName}`,
    follower: `Follower of ${sourceName}`,
    ally: `Ally of ${sourceName}`,
    enemy: `Enemy of ${sourceName}`
  };

  return contexts[contextKey] || null;
}

function getGenerationEndpoint(entityType: string): string {
  const endpoints: Record<string, string> = {
    NPC: '/api/ai/forge/hero',
    Location: '/api/ai/forge/landmark',
    Town: '/api/ai/forge/town',
    Landmark: '/api/ai/forge/landmark',
    Shop: '/api/ai/forge/shop',
    Item: '/api/ai/forge/item',
    Monster: '/api/ai/forge/monster'
  };

  return endpoints[entityType] || '/api/ai/forge/hero';
}
