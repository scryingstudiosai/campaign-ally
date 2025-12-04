'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, Hotel, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { useGenerationCount } from '@/contexts/GenerationCountContext';

interface InnForgeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campaignId: string;
  prefillName?: string;
}

export default function InnForgeDialog({ open, onOpenChange, campaignId, prefillName }: InnForgeDialogProps) {
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState('');

  useEffect(() => {
    if (prefillName) {
      setName(prefillName);
    }
  }, [prefillName]);
  const [concept, setConcept] = useState('');
  const [size, setSize] = useState<'small' | 'medium' | 'large'>('medium');
  const [quality, setQuality] = useState<'budget' | 'standard' | 'upscale' | 'luxury'>('standard');
  const [specialFeatures, setSpecialFeatures] = useState('');
  const [respectCodex, setRespectCodex] = useState(true);
  const { toast } = useToast();
  const router = useRouter();
  const { refresh: refreshCount } = useGenerationCount();

  const handleGenerate = async (surpriseMe = false) => {
    setLoading(true);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        toast({
          title: 'Not logged in',
          description: 'Please sign in to use the forge.',
          variant: 'destructive',
        });
        setLoading(false);
        return;
      }

      const randomSize = surpriseMe
        ? (['small', 'medium', 'large'][Math.floor(Math.random() * 3)] as any)
        : size;
      const randomQuality = surpriseMe
        ? (['budget', 'standard', 'upscale', 'luxury'][Math.floor(Math.random() * 4)] as any)
        : quality;

      const requestBody = {
        name: surpriseMe ? '' : name,
        concept: surpriseMe ? '' : concept,
        size: randomSize,
        quality: randomQuality,
        specialFeatures: surpriseMe ? '' : specialFeatures,
        campaignId,
        respectCodex,
        autoSave: true,
      };

      const response = await fetch('/api/ai/forge/inn', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(requestBody),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to generate inn');
      }

      toast({
        title: 'Success',
        description: `${result.data.name} has been created and saved to Memory!`,
      });

      onOpenChange(false);
      setName('');
      setConcept('');
      setSpecialFeatures('');
      setSize('medium');
      setQuality('standard');

      // Refresh the generation count after successful save (trigger auto-increments in DB)
      await refreshCount();

      setTimeout(() => {
        router.push(`/app/memory?selected=${result.data.id}`);
      }, 500);
    } catch (error: any) {
      console.error('Error generating inn:', error);
      toast({
        title: 'Generation Failed',
        description: error.message || 'Failed to generate inn',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Hotel className="h-5 w-5 text-primary" />
            Inn Forge
          </DialogTitle>
          <DialogDescription>Generate detailed inn and lodging establishments</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="inn-name">Inn Name (Optional)</Label>
            <Input
              id="inn-name"
              placeholder="Leave empty for random name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="concept">Concept (Optional)</Label>
            <Textarea
              id="concept"
              placeholder="E.g., cozy roadside inn, luxury mountain retreat, haunted waystation..."
              value={concept}
              onChange={(e) => setConcept(e.target.value)}
              disabled={loading}
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="size">Size</Label>
              <Select value={size} onValueChange={(value: any) => setSize(value)} disabled={loading}>
                <SelectTrigger id="size">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="small">Small (5-10 rooms)</SelectItem>
                  <SelectItem value="medium">Medium (10-20 rooms)</SelectItem>
                  <SelectItem value="large">Large (20+ rooms)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="quality">Quality</Label>
              <Select value={quality} onValueChange={(value: any) => setQuality(value)} disabled={loading}>
                <SelectTrigger id="quality">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="budget">Budget</SelectItem>
                  <SelectItem value="standard">Standard</SelectItem>
                  <SelectItem value="upscale">Upscale</SelectItem>
                  <SelectItem value="luxury">Luxury</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="features">Special Features (Optional)</Label>
            <Input
              id="features"
              placeholder="E.g., hot springs, extensive stables, attached tavern..."
              value={specialFeatures}
              onChange={(e) => setSpecialFeatures(e.target.value)}
              disabled={loading}
            />
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="respect-codex"
              checked={respectCodex}
              onCheckedChange={(checked) => setRespectCodex(checked as boolean)}
              disabled={loading}
            />
            <Label htmlFor="respect-codex" className="text-sm font-normal cursor-pointer">
              Respect campaign codex (recommended)
            </Label>
          </div>
        </div>

        <div className="flex gap-3 justify-end">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button variant="outline" onClick={() => handleGenerate(true)} disabled={loading}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Surprise Me
          </Button>
          <Button onClick={() => handleGenerate(false)} disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Hotel className="mr-2 h-4 w-4" />
                Generate
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
