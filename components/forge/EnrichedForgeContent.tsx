'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { enrichForgeContent, DetectedEntity } from '@/lib/entityDetection';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase/client';

interface EnrichedForgeContentProps {
  content: string;
  campaignId: string;
  className?: string;
  onEntityConjured?: () => void;
}

function buildEnrichedHtml(content: string, entities: DetectedEntity[]): string {
  if (!entities.length) {
    return content;
  }

  const sortedEntities = [...entities].sort((a, b) => b.startIndex - a.startIndex);

  let enrichedContent = content;

  sortedEntities.forEach((entity) => {
    const before = enrichedContent.substring(0, entity.startIndex);
    const after = enrichedContent.substring(entity.endIndex);

    let replacement: string;

    if (entity.existsInMemory) {
      replacement = `<span class="entity-link memory-link" data-memory-id="${entity.memoryId}" data-entity-type="${entity.type}">${entity.text}</span>`;
    } else {
      const entityJson = JSON.stringify({
        name: entity.name,
        type: entity.type,
        forgeType: entity.forgeType,
        landmarkType: entity.landmarkType,
      }).replace(/"/g, '&quot;').replace(/'/g, '&apos;');
      replacement = `<span class="entity-link conjure-link" data-entity='${entityJson}' title="Conjure ${entity.type}">${entity.text}<span class="sparkle">✨</span></span>`;
    }

    enrichedContent = before + replacement + after;
  });

  return enrichedContent;
}

export function EnrichedForgeContent({ content, campaignId, className = '', onEntityConjured }: EnrichedForgeContentProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [enrichedHtml, setEnrichedHtml] = useState<string>(content);
  const [isEnriching, setIsEnriching] = useState(true);
  const [isConjuring, setIsConjuring] = useState(false);

  useEffect(() => {
    const enrichContent = async () => {
      try {
        setIsEnriching(true);
        const entities = await enrichForgeContent(content, campaignId);
        const html = buildEnrichedHtml(content, entities);
        setEnrichedHtml(html);
      } catch (error) {
        console.error('Error enriching forge content:', error);
        setEnrichedHtml(content);
      } finally {
        setIsEnriching(false);
      }
    };

    if (content && campaignId) {
      enrichContent();
    }
  }, [content, campaignId]);

  const openMemoryCard = (memoryId: string) => {
    router.push(`/app/memory?selected=${memoryId}`);
  };

  const conjureEntity = async (entityData: { name: string; type: string; forgeType?: string; landmarkType?: string }, targetElement: HTMLElement) => {
    if (isConjuring) return;

    setIsConjuring(true);
    targetElement.classList.add('conjuring');
    const originalHtml = targetElement.innerHTML;
    targetElement.innerHTML = '⏳ Generating...';

    try {
      toast({
        title: 'Generating',
        description: `Creating ${entityData.name}...`,
      });

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Not authenticated');
      }

      // Comprehensive forge routing configuration
      const FORGE_ROUTES: Record<string, { endpoint: string; buildRequest: (name: string, campaignId: string, extra?: any) => any }> = {
        hero: {
          endpoint: '/api/ai/forge/hero',
          buildRequest: (name, campaignId) => ({
            campaignId,
            concept: `Generate ${name}`,
            level: 5,
            respectCodex: true,
            autoSave: true,
          }),
        },
        villain: {
          endpoint: '/api/ai/forge/villain',
          buildRequest: (name, campaignId) => ({
            campaignId,
            concept: `Generate ${name}`,
            level: 5,
            respectCodex: true,
            autoSave: true,
          }),
        },
        inn: {
          endpoint: '/api/ai/forge/inn',
          buildRequest: (name, campaignId) => ({
            campaignId,
            name,
            quality: 'standard',
            size: 'medium',
            respectCodex: true,
            autoSave: true,
          }),
        },
        tavern: {
          endpoint: '/api/ai/forge/inn',
          buildRequest: (name, campaignId) => ({
            campaignId,
            name,
            quality: 'budget',
            size: 'small',
            respectCodex: true,
            autoSave: true,
          }),
        },
        landmark: {
          endpoint: '/api/ai/forge/landmark',
          buildRequest: (name, campaignId, extra) => ({
            campaignId,
            name,
            type: extra?.landmarkType || 'landmark',
            customType: extra?.landmarkType,
            size: 'medium',
            condition: 'intact',
            age: 'old',
            respectCodex: true,
            autoSave: true,
          }),
        },
        shop: {
          endpoint: '/api/ai/forge/shop',
          buildRequest: (name, campaignId) => ({
            campaignId,
            name,
            tier: 2,
            respectCodex: true,
            autoSave: true,
          }),
        },
        town: {
          endpoint: '/api/ai/forge/town',
          buildRequest: (name, campaignId) => ({
            campaignId,
            concept: `Generate ${name}`,
            size: 'town',
            respectCodex: true,
            autoSave: true,
          }),
        },
        guild: {
          endpoint: '/api/ai/forge/guild',
          buildRequest: (name, campaignId) => ({
            campaignId,
            concept: `Generate ${name}`,
            respectCodex: true,
            autoSave: true,
          }),
        },
        item: {
          endpoint: '/api/ai/forge/item',
          buildRequest: (name, campaignId) => ({
            campaignId,
            concept: `Generate ${name}`,
            rarity: 'uncommon',
            respectCodex: true,
            autoSave: true,
          }),
        },
        monster: {
          endpoint: '/api/ai/forge/monster',
          buildRequest: (name, campaignId) => ({
            campaignId,
            concept: `Generate ${name}`,
            level: 5,
            respectCodex: true,
            autoSave: true,
          }),
        },
      };

      // Determine which forge to use
      const forgeType = entityData.forgeType || (() => {
        // Fallback to type-based routing if no forgeType
        const typeMapping: Record<string, string> = {
          NPC: 'hero',
          Location: 'town',
          Item: 'item',
          Organization: 'guild',
        };
        return typeMapping[entityData.type] || 'hero';
      })();

      const forgeConfig = FORGE_ROUTES[forgeType];
      if (!forgeConfig) {
        throw new Error(`Unknown forge type: ${forgeType}`);
      }

      const requestBody = forgeConfig.buildRequest(entityData.name, campaignId, {
        landmarkType: entityData.landmarkType,
      });

      const response = await fetch(forgeConfig.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(requestBody),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Generation failed');
      }

      toast({
        title: 'Success',
        description: `${entityData.name} created successfully!`,
      });

      // Trigger parent refresh if callback provided
      if (onEntityConjured) {
        onEntityConjured();
      }

      setTimeout(() => {
        router.push(`/app/memory?selected=${result.data.id}`);
      }, 500);
    } catch (error: any) {
      console.error('Failed to conjure entity:', error);
      toast({
        title: 'Error',
        description: error.message || `Failed to generate ${entityData.name}`,
        variant: 'destructive',
      });
      targetElement.innerHTML = originalHtml;
      targetElement.classList.remove('conjuring');
      setIsConjuring(false);
    }
  };

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    const entityLink = target.closest('.entity-link') as HTMLElement | null;

    if (!entityLink) return;

    e.preventDefault();
    e.stopPropagation();

    try {
      if (entityLink.classList.contains('memory-link')) {
        const memoryId = entityLink.getAttribute('data-memory-id');
        if (memoryId) {
          openMemoryCard(memoryId);
        }
      } else if (entityLink.classList.contains('conjure-link')) {
        const entityJson = entityLink.getAttribute('data-entity');
        if (entityJson) {
          const cleanedJson = entityJson.replace(/&quot;/g, '"').replace(/&apos;/g, "'");
          const entityData = JSON.parse(cleanedJson);
          conjureEntity(entityData, entityLink);
        }
      }
    } catch (error) {
      console.error('Error handling entity click:', error, entityLink);
    }
  };

  return (
    <div
      className={`forge-content enriched ${className}`}
      onClick={handleClick}
      dangerouslySetInnerHTML={{ __html: enrichedHtml }}
      style={{
        whiteSpace: 'pre-wrap',
      }}
    />
  );
}
