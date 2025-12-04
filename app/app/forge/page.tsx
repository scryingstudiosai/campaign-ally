'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { supabase } from '@/lib/supabase/client';

// Dynamic import for ForgeGrid to reduce initial bundle
const ForgeGrid = dynamic(() => import('@/components/forge/ForgeGrid').then(mod => ({ default: mod.ForgeGrid })), {
  loading: () => (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
    </div>
  ),
  ssr: false
});

export default function ForgePage() {
  const [campaignId, setCampaignId] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      const stored = localStorage.getItem('currentCampaignId');
      if (stored) {
        setCampaignId(stored);
      } else {
        loadDefaultCampaign();
      }
    } catch (error) {
      console.error('Failed to read from localStorage:', error);
      loadDefaultCampaign();
    }
  }, []);

  const loadDefaultCampaign = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from('campaigns')
      .select('id')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (data) {
      setCampaignId(data.id);
    }
  };

  if (!campaignId) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6 md:space-y-10 animate-fade-in">
      <div className="space-y-3">
        <h1 className="text-gradient font-bold text-3xl md:text-4xl lg:text-5xl">Forge</h1>
        <p className="text-sm md:text-base text-muted-foreground max-w-3xl leading-relaxed">
          Create detailed world-building elements with AI assistance. Build characters, locations,
          items, and more for your campaign.
        </p>
      </div>

      <ForgeGrid campaignId={campaignId} />
    </div>
  );
}
