'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Loader2, Sparkles } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase/client';

interface OdditiesForgeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campaignId: string;
  onSuccess?: () => void;
}

export default function OdditiesForgeDialog({ open, onOpenChange, campaignId, onSuccess }: OdditiesForgeDialogProps) {
  const { toast } = useToast();
  const [isGenerating, setIsGenerating] = useState(false);

  const [count, setCount] = useState('3');
  const [theme, setTheme] = useState('');
  const [saveIndividually, setSaveIndividually] = useState(false);

  const handleGenerate = async () => {
    const itemCount = parseInt(count);
    if (itemCount < 1 || itemCount > 10) {
      toast({
        title: 'Invalid Count',
        description: 'Please generate between 1 and 10 oddities',
        variant: 'destructive',
      });
      return;
    }

    setIsGenerating(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Not authenticated');
      }

      const response = await fetch('/api/ai/forge/oddities', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          campaignId,
          count: itemCount,
          theme: theme.trim() || undefined,
          saveIndividually,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate oddities');
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Generation failed');
      }

      const itemsGenerated = result.data.items.length;
      toast({
        title: 'Oddities Generated!',
        description: `${itemsGenerated} ${itemsGenerated === 1 ? 'oddity has' : 'oddities have'} been saved to your campaign memory`,
      });

      setCount('3');
      setTheme('');
      setSaveIndividually(false);
      onOpenChange(false);

      if (onSuccess) {
        onSuccess();
      }

    } catch (error) {
      console.error('Oddities generation error:', error);
      toast({
        title: 'Generation Failed',
        description: error instanceof Error ? error.message : 'Failed to generate oddities',
        variant: 'destructive',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            Oddities Forge
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="count">Number of Oddities (1-10)</Label>
            <Input
              id="count"
              type="number"
              min="1"
              max="10"
              value={count}
              onChange={(e) => setCount(e.target.value)}
              className="mt-1"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Generate multiple trinkets at once
            </p>
          </div>

          <div>
            <Label htmlFor="theme">Theme (Optional)</Label>
            <Textarea
              id="theme"
              placeholder="Describe a theme... (e.g., 'nautical items from a shipwreck' or 'creepy witch's belongings')"
              value={theme}
              onChange={(e) => setTheme(e.target.value)}
              rows={2}
              className="mt-1"
            />
          </div>

          <div className="flex items-center justify-between p-3 border rounded-lg">
            <div className="space-y-0.5">
              <Label htmlFor="saveIndividually">Save Each Item Separately</Label>
              <p className="text-xs text-muted-foreground">
                Create individual memory entries for each oddity instead of one collection
              </p>
            </div>
            <Switch
              id="saveIndividually"
              checked={saveIndividually}
              onCheckedChange={setSaveIndividually}
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isGenerating}
            >
              Cancel
            </Button>
            <Button
              onClick={handleGenerate}
              disabled={isGenerating}
            >
              {isGenerating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Forging Oddities...
                </>
              ) : (
                'Generate Oddities'
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
