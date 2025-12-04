'use client';

import { useState } from 'react';
import { EncounterForgeDialog, EncounterParams } from './EncounterForgeDialog';
import { TacticalEncounterDisplay } from './TacticalEncounterDisplay';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase/client';
import { Loader2 } from 'lucide-react';

interface TacticalEncounterForgeProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campaignId: string;
}

export default function TacticalEncounterForge({
  open,
  onOpenChange,
  campaignId
}: TacticalEncounterForgeProps) {
  const { toast } = useToast();
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedEncounter, setGeneratedEncounter] = useState<any>(null);
  const [showDialog, setShowDialog] = useState(true);

  const handleGenerate = async (params: EncounterParams) => {
    setIsGenerating(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast({
          title: 'Not authenticated',
          description: 'Please sign in to generate encounters',
          variant: 'destructive',
        });
        return;
      }

      const response = await fetch('/api/ai/forge/encounter-seq', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(params),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to generate encounter');
      }

      const data = await response.json();

      if (!data.success || !data.result) {
        throw new Error('Invalid response from server');
      }

      setGeneratedEncounter(data.result);
      setShowDialog(false);

      toast({
        title: 'Encounter generated!',
        description: 'Reviewing your tactical encounter',
      });
    } catch (error: any) {
      console.error('Generate encounter error:', error);
      toast({
        title: 'Failed to generate encounter',
        description: error.message || 'Please try again',
        variant: 'destructive',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleClose = () => {
    setGeneratedEncounter(null);
    setShowDialog(true);
    onOpenChange(false);
  };

  if (isGenerating) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md">
          <div className="flex flex-col items-center justify-center py-12 space-y-4">
            <Loader2 className="w-12 h-12 animate-spin text-cyan-400" />
            <div className="text-center space-y-2">
              <h3 className="text-xl font-bold text-foreground">
                Forging Tactical Encounter...
              </h3>
              <p className="text-sm text-muted-foreground">
                Creating monsters, positioning, and phases
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (generatedEncounter && !showDialog) {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <TacticalEncounterDisplay
            encounter={generatedEncounter}
            campaignId={campaignId}
            onClose={handleClose}
          />
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <EncounterForgeDialog
      open={open && showDialog}
      onOpenChange={(isOpen) => {
        if (!isOpen) handleClose();
      }}
      onGenerate={handleGenerate}
      campaignId={campaignId}
    />
  );
}
