'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, Landmark, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { useGenerationCount } from '@/contexts/GenerationCountContext';

interface LandmarkForgeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campaignId: string;
  prefillName?: string;
  sourceDescription?: string;
  sourceMemoryId?: string;
  contextKey?: string;
  parentName?: string;
}

const LANDMARK_TYPES = [
  'Library / Archives',
  'Temple / Shrine / Cathedral',
  'Pier / Dock / Harbor',
  'Market / Plaza / Square',
  'Guild Hall',
  'Council Chambers / Government',
  'Keep / Castle / Fortress',
  'Arena / Colosseum',
  'Cemetery / Graveyard',
  'Barracks / Armory',
  'Bathhouse / Spa',
  'Warehouse',
  'Theater / Playhouse',
  'Academy / School',
  'Hospital / Infirmary',
  'Monument / Statue',
  'Bridge',
  'Other',
];

export default function LandmarkForgeDialog({ open, onOpenChange, campaignId, prefillName, sourceDescription, sourceMemoryId, contextKey, parentName }: LandmarkForgeDialogProps) {
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState('');

  useEffect(() => {
    if (prefillName) {
      setName(prefillName);
    }
  }, [prefillName]);
  const [type, setType] = useState<string>('Library / Archives');
  const [customType, setCustomType] = useState('');
  const [size, setSize] = useState<'small' | 'medium' | 'large' | 'massive'>('medium');
  const [condition, setCondition] = useState('Well-Maintained');
  const [age, setAge] = useState('Established');
  const [concept, setConcept] = useState('');
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

      const randomType = surpriseMe
        ? LANDMARK_TYPES[Math.floor(Math.random() * (LANDMARK_TYPES.length - 1))]
        : type;
      const randomSize = surpriseMe
        ? (['small', 'medium', 'large', 'massive'][Math.floor(Math.random() * 4)] as any)
        : size;
      const randomCondition = surpriseMe
        ? ['Pristine', 'Well-Maintained', 'Worn', 'Decrepit'][Math.floor(Math.random() * 4)]
        : condition;
      const randomAge = surpriseMe
        ? ['Ancient', 'Old', 'Established', 'Recent', 'Brand New'][Math.floor(Math.random() * 5)]
        : age;

      const requestBody = {
        name: surpriseMe ? '' : name,
        type: randomType,
        customType: randomType === 'Other' ? customType : undefined,
        size: randomSize,
        condition: randomCondition,
        age: randomAge,
        concept: surpriseMe ? '' : concept,
        campaignId,
        respectCodex,
        autoSave: true,
        sourceDescription,
        sourceMemoryId,
        contextKey,
        parentName,
      };

      const response = await fetch('/api/ai/forge/landmark', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(requestBody),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to generate landmark');
      }

      // Refresh the generation count after successful save (trigger auto-increments in DB)
      await refreshCount();

      toast({
        title: 'Success',
        description: `${result.data.name} has been created and saved to Memory!`,
      });

      onOpenChange(false);
      setName('');
      setConcept('');
      setCustomType('');
      setType('Library / Archives');
      setSize('medium');
      setCondition('Well-Maintained');
      setAge('Established');

      setTimeout(() => {
        router.push(`/app/memory?selected=${result.data.id}`);
      }, 500);
    } catch (error: any) {
      console.error('Error generating landmark:', error);
      toast({
        title: 'Generation Failed',
        description: error.message || 'Failed to generate landmark',
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
            <Landmark className="h-5 w-5 text-primary" />
            Landmark Forge
          </DialogTitle>
          <DialogDescription>Generate detailed landmarks and locations</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="landmark-name">Landmark Name (Optional)</Label>
            <Input
              id="landmark-name"
              placeholder="Leave empty for random name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="type">Type</Label>
            <Select value={type} onValueChange={setType} disabled={loading}>
              <SelectTrigger id="type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LANDMARK_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {type === 'Other' && (
            <div className="space-y-2">
              <Label htmlFor="custom-type">Custom Type</Label>
              <Input
                id="custom-type"
                placeholder="Enter custom landmark type"
                value={customType}
                onChange={(e) => setCustomType(e.target.value)}
                disabled={loading}
              />
            </div>
          )}

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="size">Size</Label>
              <Select value={size} onValueChange={(value: any) => setSize(value)} disabled={loading}>
                <SelectTrigger id="size">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="small">Small</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="large">Large</SelectItem>
                  <SelectItem value="massive">Massive</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="condition">Condition</Label>
              <Select value={condition} onValueChange={setCondition} disabled={loading}>
                <SelectTrigger id="condition">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Pristine">Pristine</SelectItem>
                  <SelectItem value="Well-Maintained">Well-Maintained</SelectItem>
                  <SelectItem value="Worn">Worn</SelectItem>
                  <SelectItem value="Decrepit">Decrepit</SelectItem>
                  <SelectItem value="Ruined">Ruined</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="age">Age</Label>
              <Select value={age} onValueChange={setAge} disabled={loading}>
                <SelectTrigger id="age">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Ancient">Ancient</SelectItem>
                  <SelectItem value="Old">Old</SelectItem>
                  <SelectItem value="Established">Established</SelectItem>
                  <SelectItem value="Recent">Recent</SelectItem>
                  <SelectItem value="Brand New">Brand New</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="concept">Concept (Optional)</Label>
            <Textarea
              id="concept"
              placeholder="Describe specific ideas for this landmark..."
              value={concept}
              onChange={(e) => setConcept(e.target.value)}
              disabled={loading}
              rows={3}
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
                <Landmark className="mr-2 h-4 w-4" />
                Generate Landmark
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
