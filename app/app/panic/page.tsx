'use client';

import { useEffect, useState } from 'react';
import NPCForgeDialog from '@/components/forge/NPCForgeDialog';
import TavernForgeDialog from '@/components/forge/TavernForgeDialog';
import HookForgeDialog from '@/components/forge/HookForgeDialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { User, Store, Swords } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';

export default function PanicPage() {
  const [campaignId, setCampaignId] = useState<string | null>(null);
  const [npcDialogOpen, setNpcDialogOpen] = useState(false);
  const [tavernDialogOpen, setTavernDialogOpen] = useState(false);
  const [hookDialogOpen, setHookDialogOpen] = useState(false);

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
    <>
      <div className="max-w-7xl mx-auto space-y-6 md:space-y-10 animate-fade-in">
        <div className="space-y-3">
          <h1 className="text-gradient font-bold text-3xl md:text-4xl lg:text-5xl">Panic Mode</h1>
          <p className="text-sm md:text-base text-muted-foreground max-w-3xl leading-relaxed">
            Quick generation for when you need something fast. Click any card to get started.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          <Card
            className="group cursor-pointer hover:border-primary/50 transition-all duration-200 hover:shadow-lg hover:scale-[1.02]"
            onClick={() => setNpcDialogOpen(true)}
          >
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg group-hover:bg-primary/20 transition-colors">
                  <User className="h-5 w-5 text-primary" />
                </div>
                <CardTitle className="text-lg group-hover:text-primary transition-colors">
                  NPC Generator
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-sm">
                Create a memorable character on the fly
              </CardDescription>
            </CardContent>
          </Card>

          <Card
            className="group cursor-pointer hover:border-primary/50 transition-all duration-200 hover:shadow-lg hover:scale-[1.02]"
            onClick={() => setTavernDialogOpen(true)}
          >
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg group-hover:bg-primary/20 transition-colors">
                  <Store className="h-5 w-5 text-primary" />
                </div>
                <CardTitle className="text-lg group-hover:text-primary transition-colors">
                  Tavern Generator
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-sm">
                Generate a unique establishment
              </CardDescription>
            </CardContent>
          </Card>

          <Card
            className="group cursor-pointer hover:border-primary/50 transition-all duration-200 hover:shadow-lg hover:scale-[1.02]"
            onClick={() => setHookDialogOpen(true)}
          >
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg group-hover:bg-primary/20 transition-colors">
                  <Swords className="h-5 w-5 text-primary" />
                </div>
                <CardTitle className="text-lg group-hover:text-primary transition-colors">
                  Hook Generator
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-sm">
                Create an engaging plot hook
              </CardDescription>
            </CardContent>
          </Card>
        </div>
      </div>

      <NPCForgeDialog
        open={npcDialogOpen}
        onOpenChange={setNpcDialogOpen}
        campaignId={campaignId}
      />

      <TavernForgeDialog
        open={tavernDialogOpen}
        onOpenChange={setTavernDialogOpen}
        campaignId={campaignId}
      />

      <HookForgeDialog
        open={hookDialogOpen}
        onOpenChange={setHookDialogOpen}
        campaignId={campaignId}
      />
    </>
  );
}
