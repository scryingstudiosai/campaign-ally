'use client';

import { useState, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { MemoryItem } from '@/types/memory';
import {
  Search,
  ArrowLeft,
  ChevronDown,
  ChevronRight,
  Pin,
  User,
  MapPin,
  Swords,
  Scroll,
  Calendar,
  FileText,
  Menu,
  X
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface WikiSidebarProps {
  entries: MemoryItem[];
  activeEntryId: string | null;
  onSelectEntry: (id: string) => void;
  onBackToCards: () => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

const TYPE_ICONS = {
  npc: User,
  location: MapPin,
  monster: Swords,
  item: Scroll,
  quest: Scroll,
  session: Calendar,
  custom: FileText,
};

const TYPE_LABELS = {
  npc: 'NPCs',
  location: 'Locations',
  monster: 'Monsters',
  item: 'Items',
  quest: 'Quests',
  session: 'Sessions',
  custom: 'Custom',
};

export function WikiSidebar({
  entries,
  activeEntryId,
  onSelectEntry,
  onBackToCards,
  collapsed,
  onToggleCollapse,
  searchQuery,
  onSearchChange,
}: WikiSidebarProps) {
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set());

  const toggleCategory = (category: string) => {
    setCollapsedCategories(prev => {
      const newSet = new Set(prev);
      if (newSet.has(category)) {
        newSet.delete(category);
      } else {
        newSet.add(category);
      }
      return newSet;
    });
  };

  const { pinnedEntries, categorizedEntries } = useMemo(() => {
    const pinned = entries.filter(e => e.is_pinned);
    const categorized: Record<string, MemoryItem[]> = {};

    entries.forEach(entry => {
      const type = entry.type || 'custom';
      if (!categorized[type]) {
        categorized[type] = [];
      }
      categorized[type].push(entry);
    });

    Object.keys(categorized).forEach(type => {
      categorized[type].sort((a, b) => a.title.localeCompare(b.title));
    });

    return { pinnedEntries: pinned, categorizedEntries: categorized };
  }, [entries]);

  if (collapsed) {
    return (
      <div className="w-12 border-r border-border bg-card flex flex-col items-center py-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggleCollapse}
          className="mb-4"
        >
          <Menu className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <div className="w-64 border-r border-border bg-card flex flex-col">
      <div className="p-4 border-b border-border space-y-3">
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={onBackToCards}
            className="flex items-center gap-2 text-sm"
          >
            <ArrowLeft className="h-4 w-4" />
            Cards View
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggleCollapse}
            className="h-8 w-8"
            title="Collapse sidebar"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="relative">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search entries..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-8"
          />
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-2 space-y-2">
          {pinnedEntries.length > 0 && (
            <Collapsible
              open={!collapsedCategories.has('pinned')}
              onOpenChange={() => toggleCategory('pinned')}
            >
              <CollapsibleTrigger className="flex items-center justify-between w-full px-2 py-1.5 text-sm font-medium text-foreground hover:bg-accent rounded-md">
                <div className="flex items-center gap-2">
                  <Pin className="h-4 w-4" />
                  <span>Pinned</span>
                  <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                    {pinnedEntries.length}
                  </Badge>
                </div>
                {collapsedCategories.has('pinned') ? (
                  <ChevronRight className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-0.5 mt-1">
                {pinnedEntries.map(entry => (
                  <button
                    key={entry.id}
                    onClick={() => onSelectEntry(entry.id)}
                    className={`
                      w-full text-left px-3 py-2 text-sm rounded-md transition-colors
                      ${activeEntryId === entry.id
                        ? 'bg-primary text-primary-foreground'
                        : 'hover:bg-accent text-foreground'
                      }
                    `}
                  >
                    <div className="flex items-center gap-2">
                      <Pin className="h-3 w-3 flex-shrink-0" />
                      <span className="truncate">{entry.title}</span>
                    </div>
                  </button>
                ))}
              </CollapsibleContent>
            </Collapsible>
          )}

          {Object.entries(categorizedEntries).map(([type, typeEntries]) => {
            const Icon = TYPE_ICONS[type as keyof typeof TYPE_ICONS] || FileText;
            const label = TYPE_LABELS[type as keyof typeof TYPE_LABELS] || type;

            return (
              <Collapsible
                key={type}
                open={!collapsedCategories.has(type)}
                onOpenChange={() => toggleCategory(type)}
              >
                <CollapsibleTrigger className="flex items-center justify-between w-full px-2 py-1.5 text-sm font-medium text-foreground hover:bg-accent rounded-md">
                  <div className="flex items-center gap-2">
                    <Icon className="h-4 w-4" />
                    <span>{label}</span>
                    <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                      {typeEntries.length}
                    </Badge>
                  </div>
                  {collapsedCategories.has(type) ? (
                    <ChevronRight className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-0.5 mt-1">
                  {typeEntries.map(entry => (
                    <button
                      key={entry.id}
                      onClick={() => onSelectEntry(entry.id)}
                      className={`
                        w-full text-left px-3 py-2 text-sm rounded-md transition-colors
                        ${activeEntryId === entry.id
                          ? 'bg-primary text-primary-foreground'
                          : 'hover:bg-accent text-foreground'
                        }
                      `}
                    >
                      <span className="truncate block">{entry.title}</span>
                      {entry.tags && entry.tags.length > 0 && (
                        <div className="flex gap-1 mt-1 flex-wrap">
                          {entry.tags.slice(0, 2).map((tag, i) => (
                            <Badge
                              key={i}
                              variant="outline"
                              className="h-4 px-1 text-[10px]"
                            >
                              {tag}
                            </Badge>
                          ))}
                          {entry.tags.length > 2 && (
                            <Badge
                              variant="outline"
                              className="h-4 px-1 text-[10px]"
                            >
                              +{entry.tags.length - 2}
                            </Badge>
                          )}
                        </div>
                      )}
                    </button>
                  ))}
                </CollapsibleContent>
              </Collapsible>
            );
          })}

          {entries.length === 0 && (
            <div className="px-3 py-8 text-center text-sm text-muted-foreground">
              {searchQuery ? 'No entries found' : 'No entries yet'}
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
