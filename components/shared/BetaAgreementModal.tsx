'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Sparkles, Shield, TrendingUp, Zap } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { toast } from 'sonner';

interface BetaAgreementModalProps {
  open: boolean;
  onAccepted: () => void;
}

export function BetaAgreementModal({ open, onAccepted }: BetaAgreementModalProps) {
  const [isAccepting, setIsAccepting] = useState(false);

  const handleAccept = async () => {
    setIsAccepting(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        toast.error('Authentication error. Please refresh and try again.');
        setIsAccepting(false);
        return;
      }

      const { error } = await supabase
        .from('profiles')
        .update({
          beta_agreement_accepted: new Date().toISOString(),
        })
        .eq('id', user.id);

      if (error) {
        throw error;
      }

      toast.success('Welcome to Campaign Ally!');
      onAccepted();
    } catch (error) {
      console.error('Error accepting beta agreement:', error);
      toast.error('Failed to save agreement. Please try again.');
      setIsAccepting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent
        className="sm:max-w-[550px]"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-purple-600">
              <Sparkles className="h-7 w-7 text-white" />
            </div>
            <DialogTitle className="text-2xl">
              Welcome to Campaign Ally Beta!
            </DialogTitle>
          </div>
          <DialogDescription className="text-base space-y-4 pt-4">
            <p className="text-foreground text-lg">
              Thanks for being an early tester! A few things to know:
            </p>

            <div className="space-y-3 py-2">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-950/30 flex-shrink-0">
                  <Shield className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                </div>
                <div className="flex-1 pt-1">
                  <p className="text-foreground font-medium">This is beta software</p>
                  <p className="text-sm text-muted-foreground">Bugs may happen as we improve the experience</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100 dark:bg-green-950/30 flex-shrink-0">
                  <TrendingUp className="h-5 w-5 text-green-600 dark:text-green-400" />
                </div>
                <div className="flex-1 pt-1">
                  <p className="text-foreground font-medium">Export important campaigns periodically</p>
                  <p className="text-sm text-muted-foreground">We recommend backing up your work regularly</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-950/30 flex-shrink-0">
                  <Sparkles className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="flex-1 pt-1">
                  <p className="text-foreground font-medium">Your feedback helps shape the product</p>
                  <p className="text-sm text-muted-foreground">Tell us what works and what doesn't!</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-100 dark:bg-purple-950/30 flex-shrink-0">
                  <Zap className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                </div>
                <div className="flex-1 pt-1">
                  <p className="text-foreground font-medium">You get 50 free AI generations to test with</p>
                  <p className="text-sm text-muted-foreground">More than enough to explore all the forges!</p>
                </div>
              </div>
            </div>
          </DialogDescription>
        </DialogHeader>

        <div className="pt-4">
          <Button
            onClick={handleAccept}
            disabled={isAccepting}
            className="w-full h-12 text-base font-semibold"
            size="lg"
          >
            {isAccepting ? 'Setting up your account...' : "I understand - let's forge! 🎲"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
