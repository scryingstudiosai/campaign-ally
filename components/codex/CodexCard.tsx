'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Loader2, Edit2, Save, X, Sparkles } from 'lucide-react';

interface CodexCardProps {
  title: string;
  description?: string;
  value: string;
  onSave: (value: string) => Promise<void>;
  onAISuggest?: (onApply: (value: string) => void) => Promise<void>;
  multiline?: boolean;
  placeholder?: string;
  id?: string;
}

export function CodexCard({
  title,
  description,
  value,
  onSave,
  onAISuggest,
  multiline = false,
  placeholder,
  id,
}: CodexCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value);
  const [isSaving, setIsSaving] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave(editValue);
      setIsEditing(false);
    } catch (error) {
      console.error('Failed to save:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setEditValue(value);
    setIsEditing(false);
  };

  const handleAISuggest = async () => {
    console.log('[CodexCard] handleAISuggest called', { hasOnAISuggest: !!onAISuggest });
    if (!onAISuggest) return;
    setIsGenerating(true);
    try {
      console.log('[CodexCard] Calling onAISuggest...');
      await onAISuggest((newValue: string) => {
        console.log('[CodexCard] Applying suggestion:', newValue);
        setEditValue(newValue);
      });
      console.log('[CodexCard] onAISuggest completed');
    } catch (error) {
      console.error('[CodexCard] Failed to generate:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Card id={id} className="scroll-mt-20">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle>{title}</CardTitle>
            {description && <CardDescription className="mt-1.5">{description}</CardDescription>}
          </div>
          <div className="flex gap-2">
            {!isEditing && (
              <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
                <Edit2 className="h-4 w-4" />
              </Button>
            )}
            {isEditing && (
              <>
                {onAISuggest && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleAISuggest}
                    disabled={isGenerating || isSaving}
                  >
                    {isGenerating ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Sparkles className="h-4 w-4" />
                    )}
                  </Button>
                )}
                <Button variant="outline" size="sm" onClick={handleCancel} disabled={isSaving}>
                  <X className="h-4 w-4" />
                </Button>
                <Button size="sm" onClick={handleSave} disabled={isSaving}>
                  {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                </Button>
              </>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isEditing ? (
          multiline ? (
            <Textarea
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              placeholder={placeholder}
              rows={6}
              className="w-full resize-none"
            />
          ) : (
            <Input
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              placeholder={placeholder}
              className="w-full"
            />
          )
        ) : (
          <div className="text-sm text-muted-foreground whitespace-pre-wrap">
            {value || <span className="italic">No content yet</span>}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
