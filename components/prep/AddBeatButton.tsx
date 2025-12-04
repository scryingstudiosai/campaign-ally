'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Plus, Sparkles } from 'lucide-react';

interface Beat {
  title: string;
  description?: string;
  duration?: number;
  objectives?: string[];
  challenges?: string[];
}

interface AddBeatButtonProps {
  sessionTitle: string;
  campaignId: string;
  sessionId: string;
  allBeats: Beat[];
  token: string;
  onUpdate: (updatedBeats: Beat[], commentary?: string) => void;
}

export default function AddBeatButton({
  sessionTitle,
  campaignId,
  sessionId,
  allBeats,
  token,
  onUpdate,
}: AddBeatButtonProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  async function handleAdd(surprise: boolean = false) {
    setLoading(true);
    try {
      const res = await fetch('/api/ai/prep/edit-beat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          campaignId,
          sessionId,
          sessionTitle,
          previousBeats: allBeats,
          action: surprise ? 'surprise' : 'add',
          tone: 'neutral',
        }),
      });

      const data = await res.json();

      if (data.success) {
        const newBeats = data.data.updated_beats.map((b: any) => ({
          title: b.title,
          description: b.description,
        }));

        onUpdate(newBeats, data.data.ai_commentary);
        toast({
          title: 'Success',
          description: surprise ? 'Surprise beat added!' : 'New beat added successfully',
        });
      } else {
        toast({
          title: 'Error',
          description: data.error || 'Failed to add beat',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to add beat',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <Button
        onClick={() => handleAdd(false)}
        disabled={loading}
        size="sm"
        variant="outline"
      >
        {loading ? 'Adding...' : 'Add Beat'}
        <Plus className="h-3 w-3 ml-1" />
      </Button>
      <Button
        onClick={() => handleAdd(true)}
        disabled={loading}
        size="sm"
        variant="outline"
      >
        {loading ? 'Adding...' : 'Surprise Me'}
        <Sparkles className="h-3 w-3 ml-1" />
      </Button>
    </div>
  );
}
