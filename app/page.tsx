'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase, isSupabaseConfigured } from '@/lib/supabase/client';
import { Sparkles } from 'lucide-react';

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    // Skip during SSR
    if (typeof window === 'undefined') return;
    checkAuth();
  }, []);

  const checkAuth = async () => {
    // Skip during SSR
    if (typeof window === 'undefined') return;

    // Skip if Supabase not configured - just show loading
    if (!isSupabaseConfigured()) {
      console.log('Supabase not configured during build');
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        router.replace('/app');
      } else {
        router.replace('/auth/sign-in');
      }
    } catch (error) {
      console.error('Error checking auth:', error);
      // Fallback to sign-in on error
      router.replace('/auth/sign-in');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted">
      <div className="flex flex-col items-center gap-6">
        <div className="flex items-center gap-3">
          <Sparkles className="h-12 w-12 text-primary" />
          <h1 className="text-4xl font-bold text-primary">Campaign Ally</h1>
        </div>
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    </div>
  );
}
