'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase, isSupabaseConfigured } from '@/lib/supabase/client';
import { Sidebar } from '@/components/layout/Sidebar';
import { Header } from '@/components/layout/Header';
import { Campaign } from '@/types/database';
import { Toaster } from '@/components/ui/sonner';
import { CampaignProvider } from '@/contexts/CampaignContext';
import { DiceRollerProvider } from '@/contexts/DiceRollerContext';
import { GenerationCountProvider } from '@/contexts/GenerationCountContext';
import { DicePopover } from '@/components/dice/DicePopover';
import { DiceFab } from '@/components/dice/DiceFab';
import { BetaAgreementModal } from '@/components/shared/BetaAgreementModal';
import { ErrorBoundary } from '@/components/error-boundary';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [currentCampaignId, setCurrentCampaignId] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showBetaAgreement, setShowBetaAgreement] = useState(false);
  const [checkingBetaAgreement, setCheckingBetaAgreement] = useState(true);
  const router = useRouter();

  // Detect if we're in deployment/build mode (no window, or specific build env)
  const isDeploymentMode = typeof window === 'undefined' || process.env.NODE_ENV === 'production' && !process.env.NEXT_PUBLIC_SUPABASE_URL;

  useEffect(() => {
    // Skip all auth logic during SSR
    if (typeof window === 'undefined') {
      setLoading(false);
      return;
    }

    let mounted = true;
    let subscription: any = null;

    const initialize = async () => {
      if (!mounted) return;
      await checkAuth();
    };

    initialize();

    // Use async IIFE to prevent deadlock in auth state change callback
    const setupListener = () => {
      const { data } = supabase.auth.onAuthStateChange((event, session) => {
        if (!mounted || typeof window === 'undefined') return;

        (async () => {
          try {
            console.log('Auth state changed:', event, !!session);
            if (event === 'SIGNED_IN' && session) {
              await initializeUser(session.user.id, session.user.email || null);
            } else if (event === 'SIGNED_OUT') {
              router.push('/auth/sign-in');
            }
          } catch (error) {
            console.error('Error in auth state change handler:', error);
          }
        })();
      });
      subscription = data.subscription;
    };

    setupListener();

    return () => {
      mounted = false;
      if (subscription) {
        subscription.unsubscribe();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const checkBetaAgreement = async (userId: string) => {
    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('beta_agreement_accepted')
        .eq('id', userId)
        .maybeSingle();

      if (error) {
        console.error('Error checking beta agreement:', error);
        setCheckingBetaAgreement(false);
        return;
      }

      if (!profile?.beta_agreement_accepted) {
        setShowBetaAgreement(true);
      }

      setCheckingBetaAgreement(false);
    } catch (error) {
      console.error('Error in checkBetaAgreement:', error);
      setCheckingBetaAgreement(false);
    }
  };

  const initializeUser = async (userId: string, email: string | null) => {
    console.log('Initializing user data...');
    setUserEmail(email);
    await loadCampaigns(userId);
    await checkBetaAgreement(userId);
    setLoading(false);
  };

  const checkAuth = async () => {
    console.log('App layout: checking auth...');

    // Skip auth check during SSR or if Supabase isn't configured
    if (typeof window === 'undefined') {
      console.log('App layout: SSR mode, skipping auth');
      setLoading(false);
      return;
    }

    // Skip if Supabase isn't properly configured
    if (!isSupabaseConfigured()) {
      console.log('App layout: Supabase not configured, skipping auth');
      setLoading(false);
      return;
    }

    try {
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Auth check timeout')), 5000)
      );

      const authPromise = supabase.auth.getSession();

      const { data: { session }, error } = await Promise.race([authPromise, timeoutPromise]) as any;

      console.log('App layout: getSession result:', {
        hasSession: !!session,
        sessionId: session?.access_token?.substring(0, 20),
        error: error?.message
      });

      if (!session) {
        console.log('App layout: no session, redirecting to sign-in');
        // Only redirect if we're actually in a browser
        if (typeof window !== 'undefined') {
          router.push('/auth/sign-in');
        } else {
          setLoading(false);
        }
        return;
      }

      console.log('App layout: session found, loading data');
      await initializeUser(session.user.id, session.user.email || null);
    } catch (error) {
      console.error('App layout: auth check failed:', error);
      // Only redirect if we're actually in a browser
      if (typeof window !== 'undefined') {
        router.push('/auth/sign-in');
      } else {
        setLoading(false);
      }
    }
  };

  const loadCampaigns = async (userId: string) => {
    const { data, error } = await supabase
      .from('campaigns')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (data && data.length > 0) {
      setCampaigns(data);
      let stored: string | null = null;
      try {
        stored = typeof window !== 'undefined' ? localStorage.getItem('currentCampaignId') : null;
      } catch (e) {
        console.warn('Failed to read from localStorage:', e);
      }
      const validStored = stored && data.some((c) => c.id === stored);
      const campaignToUse = validStored ? stored : data[0].id;
      setCurrentCampaignId(campaignToUse);
      try {
        if (typeof window !== 'undefined') {
          localStorage.setItem('currentCampaignId', campaignToUse);
        }
      } catch (e) {
        console.warn('Failed to write to localStorage:', e);
      }
    } else {
      console.log('No campaigns found, creating default campaign...');
      const { data: newCampaign, error: createError } = await supabase
        .from('campaigns')
        .insert({
          user_id: userId,
          name: 'My Campaign',
          system: 'D&D 5e',
          party_level: 1,
        })
        .select()
        .single();

      if (newCampaign) {
        console.log('Default campaign created:', newCampaign.id);
        setCampaigns([newCampaign]);
        setCurrentCampaignId(newCampaign.id);
        try {
          if (typeof window !== 'undefined') {
            localStorage.setItem('currentCampaignId', newCampaign.id);
          }
        } catch (e) {
          console.warn('Failed to write to localStorage:', e);
        }
      } else {
        console.error('Failed to create default campaign:', createError);
      }
    }
  };

  const handleCampaignChange = (campaignId: string) => {
    setCurrentCampaignId(campaignId);
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem('currentCampaignId', campaignId);
      }
    } catch (e) {
      console.warn('Failed to write to localStorage:', e);
    }
  };

  const handleCampaignsUpdate = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await loadCampaigns(user.id);
    }
  };

  const handleBetaAgreementAccepted = () => {
    setShowBetaAgreement(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading your campaigns...</p>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <GenerationCountProvider>
        <CampaignProvider refreshCampaigns={handleCampaignsUpdate}>
          <DiceRollerProvider>
          <div className="min-h-screen flex flex-col">
            <Header
              campaigns={campaigns}
              currentCampaignId={currentCampaignId}
              onCampaignChange={handleCampaignChange}
              onCampaignsUpdate={handleCampaignsUpdate}
              userEmail={userEmail}
              onMenuClick={() => setMobileMenuOpen(true)}
            />
            <div className="flex flex-1">
              <Sidebar
                mobileOpen={mobileMenuOpen}
                onMobileClose={() => setMobileMenuOpen(false)}
              />
              <main className="flex-1 p-4 md:p-8 overflow-auto">
                {children}
              </main>
            </div>
            <Toaster />
            <DicePopover />
            <DiceFab />
            <BetaAgreementModal
              open={showBetaAgreement}
              onAccepted={handleBetaAgreementAccepted}
            />
          </div>
          </DiceRollerProvider>
        </CampaignProvider>
      </GenerationCountProvider>
    </ErrorBoundary>
  );
}
