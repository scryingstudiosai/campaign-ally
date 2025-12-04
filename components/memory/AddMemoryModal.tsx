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
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';

const MEMORY_TYPES = [
  { value: 'NPC', label: 'NPC' },
  { value: 'Location', label: 'Location' },
  { value: 'Monster', label: 'Monster' },
  { value: 'Item', label: 'Item' },
  { value: 'Quest', label: 'Quest' },
  { value: 'Session', label: 'Session' },
  { value: 'Custom', label: 'Custom' },
];

interface AddMemoryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campaignId: string;
  userId: string;
  onSuccess: () => void;
}

export function AddMemoryModal({
  open,
  onOpenChange,
  campaignId,
  userId,
  onSuccess,
}: AddMemoryModalProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    type: 'NPC',
    tags: '',
    content: '',
    dmNotes: '',
    pinned: false,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const tags = formData.tags
        .split(',')
        .map((tag) => tag.trim())
        .filter((tag) => tag.length > 0);

      const response = await fetch('/api/memory/entries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          campaignId,
          userId,
          name: formData.name,
          type: formData.type,
          tags,
          content: formData.content,
          dmNotes: formData.dmNotes,
          pinned: formData.pinned,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to create memory entry');
      }

      toast.success('Memory entry created!');
      setFormData({
        name: '',
        type: 'NPC',
        tags: '',
        content: '',
        dmNotes: '',
        pinned: false,
      });
      onOpenChange(false);
      onSuccess();
    } catch (error) {
      console.error('Error creating memory:', error);
      toast.error(
        error instanceof Error ? error.message : 'Failed to create memory entry'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Memory Entry</DialogTitle>
          <DialogDescription>
            Add a new entry to your campaign memory
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              placeholder="e.g., Captain Thorne Vale"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="type">Type *</Label>
            <Select
              value={formData.type}
              onValueChange={(value) =>
                setFormData({ ...formData, type: value })
              }
            >
              <SelectTrigger id="type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MEMORY_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="tags">Tags</Label>
            <Input
              id="tags"
              value={formData.tags}
              onChange={(e) =>
                setFormData({ ...formData, tags: e.target.value })
              }
              placeholder="Comma separated: Military, Human, Quest Giver"
            />
            <p className="text-xs text-muted-foreground">
              Enter tags separated by commas
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="content">Content</Label>
            <Textarea
              id="content"
              value={formData.content}
              onChange={(e) =>
                setFormData({ ...formData, content: e.target.value })
              }
              placeholder="Description and details about this entry..."
              rows={6}
              className="resize-none"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="dmNotes">DM Notes</Label>
            <Textarea
              id="dmNotes"
              value={formData.dmNotes}
              onChange={(e) =>
                setFormData({ ...formData, dmNotes: e.target.value })
              }
              placeholder="Private notes for the DM..."
              rows={4}
              className="resize-none"
            />
            <p className="text-xs text-muted-foreground">
              These notes are private and won't be visible to players
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="pinned"
              checked={formData.pinned}
              onCheckedChange={(checked) =>
                setFormData({ ...formData, pinned: checked as boolean })
              }
            />
            <Label
              htmlFor="pinned"
              className="text-sm font-normal cursor-pointer"
            >
              Pin this entry
            </Label>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Creating...' : 'Create Entry'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
