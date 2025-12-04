'use client';

import { useState, useCallback } from 'react';
import { checkGenerationLimit, incrementGeneration, type GenerationLimitCheck } from '@/lib/generation-limits';
import { supabase } from '@/lib/supabase/client';
import { useGenerationCount } from '@/contexts/GenerationCountContext';

export function useGenerationLimit() {
  const [limitModalOpen, setLimitModalOpen] = useState(false);
  const [limitInfo, setLimitInfo] = useState<GenerationLimitCheck>({
    allowed: true,
    used: 0,
    limit: 50,
  });
  const { refresh: refreshCount } = useGenerationCount();

  /**
   * Check if generation is allowed before making an API call
   * Opens modal if limit is reached
   * @returns true if allowed to generate, false otherwise
   */
  const checkLimit = useCallback(async (): Promise<boolean> => {
    const { data: { session } } = await supabase.auth.getSession();

    if (!session?.user) {
      return false;
    }

    const check = await checkGenerationLimit(session.user.id);
    setLimitInfo(check);

    if (!check.allowed) {
      setLimitModalOpen(true);
      return false;
    }

    return true;
  }, []);

  /**
   * Increment generation count after successful save
   * Call this ONLY after saving to memory, not on generate/regenerate
   */
  const incrementCount = useCallback(async (): Promise<void> => {
    const { data: { session } } = await supabase.auth.getSession();

    if (!session?.user) {
      return;
    }

    await incrementGeneration(session.user.id);

    // Refresh the global counter display
    await refreshCount();
  }, [refreshCount]);

  return {
    checkLimit,
    incrementCount,
    limitModalOpen,
    setLimitModalOpen,
    limitInfo,
  };
}
