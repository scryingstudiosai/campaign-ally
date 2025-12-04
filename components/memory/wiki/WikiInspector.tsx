'use client';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MemoryItem } from '@/types/memory';
import {
  Link2,
  Hash,
  Calendar,
  Edit,
  Archive,
  Trash2,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

interface WikiInspectorProps {
  entry: MemoryItem | null;
  relationships: any;
  sessions: any[];
  onNavigate: (id: string) => void;
  onEditEntry: () => void;
  onArchive: () => void;
  onDelete: () => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
}

export function WikiInspector({
  entry,
  relationships,
  sessions,
  onNavigate,
  onEditEntry,
  onArchive,
  onDelete,
  collapsed,
  onToggleCollapse,
}: WikiInspectorProps) {
  if (collapsed) {
    return (
      <div className="w-12 border-l border-border bg-card flex flex-col items-center py-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggleCollapse}
          className="mb-4"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  const allRelationships = entry ? [
    ...relationships.outgoing.map((r: any) => ({ ...r, direction: 'outgoing' })),
    ...relationships.incoming.map((r: any) => ({ ...r, direction: 'incoming' })),
  ] : [];

  return (
    <div className="w-80 border-l border-border bg-card flex flex-col">
      <div className="p-4 border-b border-border flex items-center justify-between">
        <h3 className="font-semibold text-foreground">Quick Reference</h3>
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggleCollapse}
          className="h-8 w-8"
          title="Collapse inspector"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {!entry ? (
        <div className="flex-1 flex items-center justify-center p-6">
          <p className="text-sm text-muted-foreground text-center">
            Select an entry to view details
          </p>
        </div>
      ) : (
        <ScrollArea className="flex-1">
          <div className="p-4 space-y-6">
            {allRelationships.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                  <Link2 className="h-4 w-4" />
                  <span>Related Entries</span>
                </div>
                <div className="space-y-2">
                  {allRelationships.slice(0, 5).map((rel: any) => {
                    const relatedEntry = rel.direction === 'outgoing' ? rel.to : rel.from;
                    if (!relatedEntry) return null;

                    return (
                      <button
                        key={rel.id}
                        onClick={() => onNavigate(relatedEntry.id)}
                        className="w-full text-left p-2 rounded-lg hover:bg-accent transition-colors"
                      >
                        <div className="text-sm font-medium text-foreground truncate">
                          {relatedEntry.title}
                        </div>
                        <div className="text-xs text-muted-foreground truncate">
                          {rel.relation_type}
                        </div>
                      </button>
                    );
                  })}
                  {allRelationships.length > 5 && (
                    <div className="text-xs text-muted-foreground px-2">
                      +{allRelationships.length - 5} more
                    </div>
                  )}
                </div>
              </div>
            )}

            {allRelationships.length > 0 && (entry.tags?.length || 0) > 0 && <Separator />}

            {entry.tags && entry.tags.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                  <Hash className="h-4 w-4" />
                  <span>Tags</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {entry.tags.map((tag) => (
                    <Badge key={tag} variant="secondary" className="cursor-pointer hover:bg-secondary/80">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {entry.tags && entry.tags.length > 0 && <Separator />}

            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <Calendar className="h-4 w-4" />
                <span>Metadata</span>
              </div>
              <div className="space-y-2 text-sm">
                <div>
                  <div className="text-muted-foreground">Type</div>
                  <div className="text-foreground font-medium">
                    {entry.forge_type === 'hero' || entry.forge_type === 'villain' ? 'NPC' : entry.type}
                  </div>
                </div>
                <div>
                  <div className="text-muted-foreground">Created</div>
                  <div className="text-foreground">
                    {new Date(entry.created_at).toLocaleDateString()}
                  </div>
                </div>
                <div>
                  <div className="text-muted-foreground">Last Modified</div>
                  <div className="text-foreground">
                    {new Date(entry.last_edited_at || entry.created_at).toLocaleDateString()}
                  </div>
                </div>
                {entry.forge_type && (
                  <div>
                    <div className="text-muted-foreground">Source</div>
                    <div className="text-foreground">
                      <Badge variant="outline" className="text-xs">
                        {entry.forge_type}
                      </Badge>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <Separator />

            <div className="space-y-2">
              <Button
                onClick={onEditEntry}
                variant="outline"
                className="w-full justify-start gap-2"
              >
                <Edit className="h-4 w-4" />
                Edit Entry
              </Button>
              <Button
                onClick={onArchive}
                variant="outline"
                className="w-full justify-start gap-2"
              >
                <Archive className="h-4 w-4" />
                Archive
              </Button>
              <Button
                onClick={onDelete}
                variant="outline"
                className="w-full justify-start gap-2 text-destructive hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
                Delete
              </Button>
            </div>

            {entry.user_notes && (
              <>
                <Separator />
                <div className="space-y-2">
                  <div className="text-sm font-semibold text-foreground">Quick Notes</div>
                  <div className="text-xs text-muted-foreground bg-secondary/30 p-3 rounded-lg max-h-32 overflow-auto">
                    {entry.user_notes.substring(0, 200)}
                    {entry.user_notes.length > 200 && '...'}
                  </div>
                </div>
              </>
            )}
          </div>
        </ScrollArea>
      )}
    </div>
  );
}
