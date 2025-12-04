'use client';

import { LogOut, Menu, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CampaignSelector } from './CampaignSelector';
import { DiceNavButton } from '@/components/dice/DiceNavButton';
import { GenerationCounter } from '@/components/shared/GenerationCounter';
import { Campaign } from '@/types/database';
import { supabase } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

interface HeaderProps {
  campaigns: Campaign[];
  currentCampaignId: string | null;
  onCampaignChange: (campaignId: string) => void;
  onCampaignsUpdate: () => void;
  userEmail: string | null;
  onMenuClick: () => void;
}

export function Header({
  campaigns,
  currentCampaignId,
  onCampaignChange,
  onCampaignsUpdate,
  userEmail,
  onMenuClick,
}: HeaderProps) {
  const router = useRouter();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/auth/sign-in');
    router.refresh();
  };

  return (
    <header className="h-16 md:h-20 border-b border-border/50 bg-card flex items-center justify-between px-3 md:px-6">
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={onMenuClick}
          className="lg:hidden"
        >
          <Menu className="h-5 w-5" />
        </Button>
        <div className="flex items-center gap-2">
          <Sparkles className="h-6 w-6 md:h-8 md:w-8 text-primary" />
          <span className="text-lg md:text-2xl font-bold text-foreground">Campaign Ally</span>
        </div>
      </div>

      <div className="flex items-center gap-2 md:gap-5">
        <CampaignSelector
          campaigns={campaigns}
          currentCampaignId={currentCampaignId}
          onCampaignChange={onCampaignChange}
          onCampaignsUpdate={onCampaignsUpdate}
        />
        <GenerationCounter />
        <div className="flex items-center gap-2 md:gap-3">
          <DiceNavButton />
          <span className="text-xs md:text-sm text-muted-foreground hidden sm:inline">{userEmail}</span>
          <Button variant="ghost" size="icon" onClick={handleSignOut}>
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </header>
  );
}
