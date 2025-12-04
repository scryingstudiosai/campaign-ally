'use client';

import { useState, useEffect } from 'react';
import { FileText, Plus, Loader2 } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { supabase } from '@/lib/supabase/client';

interface InteractiveEntityLinkProps {
  entityName: string;
  entityType: 'npc' | 'item' | 'location';
  campaignId: string;
  onClick: (exists: boolean, memoryId?: string) => void;
}

export function InteractiveEntityLink({
  entityName,
  entityType,
  campaignId,
  onClick,
}: InteractiveEntityLinkProps) {
  const [exists, setExists] = useState<boolean | null>(null);
  const [memoryId, setMemoryId] = useState<string | undefined>();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    checkMemoryExists();
  }, [entityName, entityType, campaignId]);

  async function checkMemoryExists() {
    try {
      const { data, error } = await supabase
        .from('memory_chunks')
        .select('id')
        .eq('campaign_id', campaignId)
        .eq('type', entityType)
        .ilike('title', entityName)
        .maybeSingle();

      if (error) {
        console.error('Error checking memory:', error);
        setExists(false);
      } else {
        setExists(!!data);
        setMemoryId(data?.id);
      }
    } catch (error) {
      console.error('Error checking memory:', error);
      setExists(false);
    } finally {
      setIsChecking(false);
    }
  }

  if (isChecking) {
    return (
      <span className="inline-flex items-center gap-1 text-muted-foreground">
        {entityName}
        <Loader2 className="h-3 w-3 animate-spin" />
      </span>
    );
  }

  const handleClick = () => {
    onClick(exists || false, memoryId);
  };

  if (exists) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={handleClick}
              className="inline-flex items-center gap-1 text-blue-600 dark:text-blue-400 underline decoration-solid hover:text-blue-700 dark:hover:text-blue-300 transition-colors cursor-pointer font-medium"
              role="link"
              aria-label={`View ${entityType} ${entityName}`}
            >
              {entityName}
              <FileText className="h-3 w-3" />
            </button>
          </TooltipTrigger>
          <TooltipContent>
            <p>View {entityName}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={handleClick}
            className="inline-flex items-center gap-1 text-foreground underline decoration-dotted hover:text-primary transition-colors cursor-pointer font-medium hover:scale-105 transform"
            role="button"
            aria-label={`Create memory card for ${entityName}`}
          >
            {entityName}
            <Plus className="h-3 w-3" />
          </button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Create memory card for {entityName}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
