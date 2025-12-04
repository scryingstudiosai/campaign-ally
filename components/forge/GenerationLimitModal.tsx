'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Zap, CheckCircle2, Sparkles } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { toast } from 'sonner';

interface GenerationLimitModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  used: number;
  limit: number;
}

export function GenerationLimitModal({ open, onOpenChange, used, limit }: GenerationLimitModalProps) {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleClose = () => {
    setEmail('');
    setSubmitted(false);
    onOpenChange(false);
  };

  const handleJoinWaitlist = async () => {
    if (!email.trim()) {
      toast.error('Please enter an email address');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast.error('Please enter a valid email address');
      return;
    }

    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();

      const { error } = await supabase
        .from('waitlist')
        .insert({
          email: email.trim().toLowerCase(),
          user_id: user?.id || null,
        });

      if (error) {
        if (error.code === '23505') {
          toast.info('This email is already on the waitlist!');
          setSubmitted(true);
        } else {
          throw error;
        }
      } else {
        setSubmitted(true);
      }
    } catch (error) {
      console.error('Error joining waitlist:', error);
      toast.error('Failed to join waitlist. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        {!submitted ? (
          <>
            <DialogHeader>
              <div className="flex items-center gap-3 mb-2">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-950/30">
                  <Zap className="h-6 w-6 text-amber-600 dark:text-amber-400" />
                </div>
                <DialogTitle className="text-2xl">Generation Limit Reached</DialogTitle>
              </div>
              <DialogDescription className="text-base space-y-3 pt-2">
                <p>
                  You've used all <strong>{limit} generations</strong> for this month. Your limit will reset on the 1st of next month!
                </p>
                <p className="flex items-center gap-2 text-foreground">
                  <Sparkles className="h-4 w-4 text-blue-500" />
                  <span>Want unlimited generations? Join the waitlist for Campaign Ally Pro!</span>
                </p>
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium">
                  Email address (optional)
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && email.trim()) {
                      handleJoinWaitlist();
                    }
                  }}
                  disabled={loading}
                  className="h-11"
                />
              </div>

              <div className="flex gap-3 pt-2">
                {email.trim() && (
                  <Button
                    onClick={handleJoinWaitlist}
                    disabled={loading}
                    className="flex-1"
                  >
                    {loading ? 'Joining...' : 'Join Waitlist'}
                  </Button>
                )}
                <Button
                  onClick={handleClose}
                  variant="outline"
                  className={email.trim() ? 'flex-1' : 'w-full'}
                >
                  {email.trim() ? 'Skip' : 'Close'}
                </Button>
              </div>
            </div>
          </>
        ) : (
          <>
            <DialogHeader>
              <div className="flex items-center gap-3 mb-2">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100 dark:bg-green-950/30">
                  <CheckCircle2 className="h-6 w-6 text-green-600 dark:text-green-400" />
                </div>
                <DialogTitle className="text-2xl">You're on the list!</DialogTitle>
              </div>
              <DialogDescription className="text-base space-y-3 pt-2">
                <p>
                  Thank you for your interest in Campaign Ally Pro! We'll notify you at <strong>{email}</strong> when unlimited generations are available.
                </p>
                <p className="text-muted-foreground text-sm">
                  We appreciate your support during the beta phase.
                </p>
              </DialogDescription>
            </DialogHeader>

            <div className="pt-4">
              <Button onClick={handleClose} className="w-full">
                Close
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
