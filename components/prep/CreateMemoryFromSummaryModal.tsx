'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase/client';
import { Loader2, X, Sparkles, AlertCircle } from 'lucide-react';
import { TagSelector } from '@/components/memory/TagSelector';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface CreateMemoryFromSummaryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entityName: string;
  entityType: 'npc' | 'item' | 'location';
  campaignId: string;
  sessionContext: string;
  suggestedTags: string[];
  onMemoryCreated: () => void;
}

export function CreateMemoryFromSummaryModal({
  open,
  onOpenChange,
  entityName,
  entityType,
  campaignId,
  sessionContext,
  suggestedTags,
  onMemoryCreated,
}: CreateMemoryFromSummaryModalProps) {
  const { toast } = useToast();
  const [isCreating, setIsCreating] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [title, setTitle] = useState(entityName);
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState<string[]>(suggestedTags);
  const [error, setError] = useState<string | null>(null);
  const [generatedContent, setGeneratedContent] = useState<any>(null);

  async function handleGenerateWithAI() {
    setIsGenerating(true);
    setError(null);

    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();

      if (sessionError || !session) {
        setError('Not authenticated - please sign in');
        return;
      }

      const apiEndpoint = entityType === 'npc'
        ? '/api/ai/forge/hero'
        : entityType === 'item'
        ? '/api/ai/forge/item'
        : '/api/ai/forge/town';

      const concept = `Generate ${entityType === 'npc' ? 'an NPC' : entityType === 'item' ? 'an item' : 'a location'} named "${title}". Context from session: ${sessionContext}. ${description ? `Additional details: ${description}` : ''}`;

      console.log('Generating with AI:', {
        endpoint: apiEndpoint,
        concept,
        entityType
      });

      const response = await fetch(apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          campaignId,
          concept,
          level: 5,
          tags: tags,
        }),
      });

      console.log('AI Response status:', response.status);

      if (!response.ok) {
        const errorData = await response.json();
        console.error('AI Generation error:', errorData);
        throw new Error(errorData.error || 'Failed to generate content');
      }

      const result = await response.json();
      console.log('AI Generation result:', result);

      if (!result.success || !result.data) {
        throw new Error(result.error || 'No content generated');
      }

      setGeneratedContent(result.data);

      if (result.data.description) {
        setDescription(result.data.description);
      }

      toast({
        title: 'Generated',
        description: 'AI content generated successfully',
      });
    } catch (error) {
      console.error('Error generating with AI:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to generate content';
      setError(errorMessage);
      toast({
        title: 'Generation Failed',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsGenerating(false);
    }
  }

  async function handleCreate() {
    if (!title.trim()) {
      setError('Name is required');
      return;
    }

    setIsCreating(true);
    setError(null);
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();

      if (sessionError || !session) {
        setError('Not authenticated - please sign in');
        return;
      }

      const content = generatedContent || {
        name: title,
        description: description || sessionContext,
        type: entityType,
        source: 'session_summary',
        sessionContext,
      };

      const requestBody = {
        campaignId,
        title,
        type: entityType,
        content,
        tags,
        user_notes: `Created from session summary. Context: ${sessionContext}`,
      };

      console.log('Creating memory with data:', requestBody);

      const response = await fetch('/api/memory/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(requestBody),
      });

      console.log('Save response status:', response.status);

      const result = await response.json();
      console.log('Save response data:', result);

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Unauthorized - please sign in again');
        } else if (response.status === 400) {
          throw new Error(result.error || 'Invalid data - please check all fields');
        } else if (response.status === 404) {
          throw new Error('Campaign not found - please refresh and try again');
        } else if (response.status >= 500) {
          throw new Error('Server error - please try again later');
        } else {
          throw new Error(result.error || 'Failed to create memory');
        }
      }

      if (!result.data) {
        throw new Error('No data returned from server');
      }

      toast({
        title: 'Memory Created',
        description: `${title} has been added to your memories`,
      });

      onMemoryCreated();
      onOpenChange(false);
      resetForm();
    } catch (error) {
      console.error('Error creating memory:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to create memory';
      setError(errorMessage);
      toast({
        title: 'Creation Failed',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsCreating(false);
    }
  }

  function resetForm() {
    setTitle(entityName);
    setDescription('');
    setTags(suggestedTags);
    setError(null);
    setGeneratedContent(null);
  }

  function removeTag(tagToRemove: string) {
    setTags(tags.filter(t => t !== tagToRemove));
  }

  const typeLabel = entityType === 'npc' ? 'NPC' : entityType === 'item' ? 'Item' : 'Location';

  return (
    <Dialog open={open} onOpenChange={(newOpen) => {
      onOpenChange(newOpen);
      if (!newOpen) resetForm();
    }}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create {typeLabel} Memory</DialogTitle>
          <DialogDescription>
            Add {entityName} to your campaign memories
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <div>
            <Label htmlFor="title">Name</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={`Enter ${typeLabel.toLowerCase()} name`}
              disabled={isCreating || isGenerating}
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <Label htmlFor="description">Description</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleGenerateWithAI}
                disabled={isGenerating || isCreating || !title.trim()}
                className="gap-2"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-3 w-3" />
                    Generate with AI
                  </>
                )}
              </Button>
            </div>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add additional details or use AI to generate..."
              rows={6}
              disabled={isCreating || isGenerating}
            />
            {generatedContent && (
              <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                ✓ AI content generated and ready to save
              </p>
            )}
          </div>

          <div>
            <Label>Session Context</Label>
            <div className="text-sm text-muted-foreground border rounded-md p-3 bg-muted/50 mt-1 leading-relaxed">
              {sessionContext}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              This context will be saved with the memory
            </p>
          </div>

          <div>
            <Label>Tags</Label>
            <div className="flex flex-wrap gap-2 mt-2">
              {tags.map((tag, i) => (
                <Badge key={i} variant="secondary" className="gap-1">
                  {tag}
                  <button
                    onClick={() => removeTag(tag)}
                    className="ml-1 hover:text-destructive"
                    aria-label={`Remove ${tag} tag`}
                    disabled={isCreating || isGenerating}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
            <div className="mt-2">
              <TagSelector
                campaignId={campaignId}
                selectedTags={tags}
                onChange={setTags}
              />
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isCreating || isGenerating}
          >
            Cancel
          </Button>
          {error && (
            <Button
              variant="secondary"
              onClick={handleCreate}
              disabled={isCreating || isGenerating}
            >
              Retry
            </Button>
          )}
          <Button
            onClick={handleCreate}
            disabled={isCreating || isGenerating || !title.trim()}
          >
            {isCreating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Create Memory
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
