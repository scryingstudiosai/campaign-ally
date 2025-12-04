'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase/client';
import { getGenerationUsage } from '@/lib/generation-limits';
import { toast } from 'sonner';

interface GenerationCountContextType {
  used: number;
  limit: number;
  loading: boolean;
  refresh: () => Promise<void>;
  isLimitReached: boolean;
  checkLimit: () => boolean;
}

const GenerationCountContext = createContext<GenerationCountContextType | undefined>(undefined);

export function GenerationCountProvider({ children }: { children: React.ReactNode }) {
  const [used, setUsed] = useState(0);
  const [limit, setLimit] = useState(50);
  const [loading, setLoading] = useState(true);
  const lowGenerationWarningShown = useRef(false);
  const previousUsedRef = useRef(0);

  const checkLimit = useCallback(() => {
    return used >= limit;
  }, [used, limit]);

  const isLimitReached = used >= limit;

  const refresh = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        setUsed(0);
        setLoading(false);
        return;
      }

      const usage = await getGenerationUsage(user.id);
      const previousUsed = previousUsedRef.current;

      setUsed(usage.used);
      setLimit(usage.limit);
      previousUsedRef.current = usage.used;

      if (!lowGenerationWarningShown.current && usage.used >= 40 && usage.used < usage.limit && previousUsed < 40) {
        const remaining = usage.limit - usage.used;
        toast.warning(`You have ${remaining} generation${remaining !== 1 ? 's' : ''} remaining in your beta account`, {
          duration: 5000,
          icon: '⚠️',
        });
        lowGenerationWarningShown.current = true;
      }
    } catch (error) {
      console.error('Error fetching generation count:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();

    const { data: authListener } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        lowGenerationWarningShown.current = false;
        refresh();
      } else if (event === 'SIGNED_OUT') {
        setUsed(0);
        setLoading(false);
        lowGenerationWarningShown.current = false;
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [refresh]);

  return (
    <GenerationCountContext.Provider value={{ used, limit, loading, refresh, isLimitReached, checkLimit }}>
      {children}
    </GenerationCountContext.Provider>
  );
}

export function useGenerationCount() {
  const context = useContext(GenerationCountContext);
  if (context === undefined) {
    console.warn('useGenerationCount must be used within a GenerationCountProvider');
    return {
      used: 0,
      limit: 50,
      loading: true,
      refresh: async () => {},
      isLimitReached: false,
      checkLimit: () => false
    };
  }
  return context;
}
