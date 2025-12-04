'use client';

import { useState, memo } from 'react';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Eye,
  Edit,
  Pin,
  PinOff,
  Archive,
  Trash2,
  Link as LinkIcon,
  Calendar
} from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

const TYPE_COLORS: Record<string, string> = {
  NPC: '#4A90E2',
  Location: '#7ED321',
  Monster: '#D0021B',
  Item: '#9013FE',
  Quest: '#F5A623',
  Session: '#9B9B9B',
  Custom: '#50E3C2',
};

const TYPE_ICONS: Record<string, string> = {
  NPC: '🧑',
  Location: '🏛️',
  Monster: '🐉',
  Item: '⚔️',
  Quest: '📜',
  Session: '📅',
  Custom: '📝',
};

interface MemoryEntry {
  id: string;
  name: string;
  type: string;
  category?: string;
  tags: string[];
  pinned: boolean;
  archived: boolean;
  first_appearance?: string;
  created_at: string;
  updated_at: string;
}

interface MemoryEntryCardProps {
  entry: MemoryEntry;
  onView: (id: string) => void;
  onEdit: (id: string) => void;
  onPin: (id: string, pinned: boolean) => void;
  onArchive: (id: string) => void;
  onDelete: (id: string) => void;
  relationshipCount?: number;
  sessionAppearances?: number[];
}

export const MemoryEntryCard = memo(function MemoryEntryCard({
  entry,
  onView,
  onEdit,
  onPin,
  onArchive,
  onDelete,
  relationshipCount = 0,
  sessionAppearances = [],
}: MemoryEntryCardProps) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const typeColor = TYPE_COLORS[entry.type] || '#9B9B9B';
  const typeIcon = TYPE_ICONS[entry.type] || '📝';

  const isRecent = () => {
    const dayAgo = new Date();
    dayAgo.setDate(dayAgo.getDate() - 1);
    return new Date(entry.created_at) > dayAgo;
  };

  const cardClasses = `
    group
    transition-all duration-200
    hover:scale-[1.02] hover:shadow-xl
    ${entry.pinned ? 'border-[#F5A623] border-2' : ''}
    ${isRecent() ? 'ring-2 ring-blue-500/20' : ''}
    ${entry.archived ? 'opacity-60 grayscale' : ''}
    ${sessionAppearances.length === 0 ? 'opacity-80' : ''}
  `;

  return (
    <>
      <Card className={cardClasses}>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2 flex-1">
              <span className="text-2xl" aria-label={entry.type}>
                {typeIcon}
              </span>
              <h3 className="font-semibold text-base leading-tight line-clamp-2">
                {entry.name}
              </h3>
            </div>
            {entry.pinned && (
              <Pin className="h-4 w-4 text-[#F5A623] fill-[#F5A623]" />
            )}
          </div>
        </CardHeader>

        <CardContent className="space-y-3 pb-3">
          <div className="flex items-center gap-2">
            <span
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: typeColor }}
              aria-label="Type indicator"
            />
            <span className="text-sm text-muted-foreground">
              {entry.type}
            </span>
          </div>

          {entry.tags && entry.tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {entry.tags.slice(0, 3).map((tag) => (
                <Badge key={tag} variant="secondary" className="text-xs">
                  {tag}
                </Badge>
              ))}
              {entry.tags.length > 3 && (
                <Badge variant="secondary" className="text-xs">
                  +{entry.tags.length - 3}
                </Badge>
              )}
            </div>
          )}

          {sessionAppearances.length > 0 && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Calendar className="h-3 w-3" />
              <span>
                Session {sessionAppearances.slice(0, 3).join(', ')}
                {sessionAppearances.length > 3 && `, +${sessionAppearances.length - 3}`}
              </span>
            </div>
          )}

          {relationshipCount > 0 && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <LinkIcon className="h-3 w-3" />
              <span>{relationshipCount} {relationshipCount === 1 ? 'link' : 'links'}</span>
            </div>
          )}
        </CardContent>

        <CardFooter className="pt-3 border-t flex flex-col gap-2">
          <div className="flex gap-2 w-full">
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={() => onView(entry.id)}
            >
              <Eye className="h-3 w-3 mr-1" />
              View
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={() => onEdit(entry.id)}
            >
              <Edit className="h-3 w-3 mr-1" />
              Edit
            </Button>
          </div>

          <div className="flex gap-1 w-full">
            <Button
              variant="ghost"
              size="sm"
              className="flex-1"
              onClick={() => onPin(entry.id, !entry.pinned)}
            >
              {entry.pinned ? (
                <>
                  <PinOff className="h-3 w-3 mr-1" />
                  Unpin
                </>
              ) : (
                <>
                  <Pin className="h-3 w-3 mr-1" />
                  Pin
                </>
              )}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onArchive(entry.id)}
            >
              <Archive className="h-3 w-3" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowDeleteDialog(true)}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        </CardFooter>
      </Card>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Memory Entry?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{entry.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                onDelete(entry.id);
                setShowDeleteDialog(false);
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
});
