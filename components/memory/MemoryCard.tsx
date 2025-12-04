'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tag as TagIcon, Link2 } from 'lucide-react';
import { MemoryPreview } from '@/types/memory';

interface MemoryCardProps {
  memory: MemoryPreview;
  onView: () => void;
  onTagClick?: (tag: string) => void;
}

export function MemoryCard({ memory, onView, onTagClick }: MemoryCardProps) {
  const typeColors: Record<string, string> = {
    npc: 'bg-blue-500/15 text-blue-300 border-blue-500/30',
    monster: 'bg-red-500/15 text-red-300 border-red-500/30',
    tavern: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
    hook: 'bg-purple-500/15 text-purple-300 border-purple-500/30',
    location: 'bg-green-500/15 text-green-300 border-green-500/30',
    item: 'bg-orange-500/15 text-orange-300 border-orange-500/30',
    faction: 'bg-pink-500/15 text-pink-300 border-pink-500/30',
    spell: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30',
    shop: 'bg-yellow-500/15 text-yellow-300 border-yellow-500/30',
    town: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
    lore: 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30',
    quest: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
    puzzle: 'bg-violet-500/15 text-violet-300 border-violet-500/30',
  };

  const getDisplayType = () => {
    if (memory.forge_type === 'hero') return 'NPC';
    if (memory.forge_type === 'trap') return 'TRAP';
    return memory.type.toUpperCase();
  };

  const displayTags = memory.tags?.slice(0, 6) || [];
  const hasMoreTags = (memory.tags?.length || 0) > 6;

  return (
    <Card
      className="bg-card border border-border/40 hover:border-teal-500/40 transition-all duration-300 card-soft-shadow card-hover overflow-hidden group cursor-pointer"
      onClick={onView}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-base font-semibold leading-snug pr-2 flex-1 line-clamp-2">
            {memory.title}
          </CardTitle>
          <Badge className={`${typeColors[memory.type] || 'bg-gray-500/15 text-gray-300 border-gray-500/30'} border px-2 py-0.5 rounded-md text-xs font-medium shrink-0`}>
            {getDisplayType()}
          </Badge>
        </div>
        <div className="flex items-center gap-2 pt-1">
          <p className="text-xs text-muted-foreground/60">
            {new Date(memory.created_at).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric'
            })}
          </p>
          {memory.relations_count && memory.relations_count > 0 && (
            <Badge variant="outline" className="text-xs px-1.5 py-0 h-5 gap-1">
              <Link2 className="h-2.5 w-2.5" />
              {memory.relations_count}
            </Badge>
          )}
        </div>
      </CardHeader>

      {displayTags.length > 0 && (
        <CardContent className="pb-4 pt-0">
          <div className="flex flex-wrap gap-1.5">
            {displayTags.map((tag, index) => (
              <Badge
                key={index}
                variant="secondary"
                className="text-xs px-2 py-0.5 bg-secondary/50 hover:bg-secondary/70 transition-colors cursor-pointer"
                onClick={(e) => {
                  e.stopPropagation();
                  if (onTagClick) onTagClick(tag);
                }}
              >
                <TagIcon className="h-2.5 w-2.5 mr-1" />
                {tag}
              </Badge>
            ))}
            {hasMoreTags && (
              <Badge
                variant="secondary"
                className="text-xs px-2 py-0.5 bg-secondary/30 text-muted-foreground"
              >
                +{(memory.tags?.length || 0) - 6}
              </Badge>
            )}
          </div>
        </CardContent>
      )}
    </Card>
  );
}
