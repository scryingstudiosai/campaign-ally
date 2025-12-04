'use client';

import { DetailViewProps } from './types';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { EnrichedForgeContent } from '@/components/forge/EnrichedForgeContent';

export default function GenericDetailView({
  item,
  isEditing,
  editedTextContent,
  onTextContentChange,
}: DetailViewProps) {
  const content = item.content as any;
  const textContent = content?.text_content || content?.description || '';

  if (isEditing) {
    return (
      <div className="space-y-4">
        <div>
          <Label htmlFor="content">Content</Label>
          <Textarea
            id="content"
            value={editedTextContent}
            onChange={(e) => onTextContentChange(e.target.value)}
            rows={15}
            className="font-mono text-sm"
          />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {textContent && (
        <div className="prose prose-invert max-w-none">
          <EnrichedForgeContent content={textContent} campaignId={item.campaign_id} />
        </div>
      )}
      {!textContent && (
        <div className="text-muted-foreground text-center py-8">
          No content available
        </div>
      )}
    </div>
  );
}
