'use client';

import { useEffect, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { TagSelector } from './TagSelector';
import { Badge } from '@/components/ui/badge';
import { Search, X, SlidersHorizontal } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export interface MemoryFilterState {
  searchQuery: string;
  type: string;
  tags: string[];
  sort: string;
}

interface MemoryFiltersProps {
  campaignId: string;
  initialState: MemoryFilterState;
  onChange: (filters: MemoryFilterState) => void;
}

const MEMORY_TYPES = [
  { value: '', label: 'All Types' },
  { value: 'npc', label: 'NPC' },
  { value: 'monster', label: 'Monster' },
  { value: 'item', label: 'Item' },
  { value: 'hook', label: 'Hook' },
  { value: 'location', label: 'Location' },
  { value: 'faction', label: 'Faction' },
  { value: 'spell', label: 'Spell' },
  { value: 'shop', label: 'Shop' },
  { value: 'town', label: 'Town' },
  { value: 'lore', label: 'Lore' },
  { value: 'quest', label: 'Quest' },
];

const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest' },
  { value: 'oldest', label: 'Oldest' },
  { value: 'title-asc', label: 'Title A-Z' },
  { value: 'title-desc', label: 'Title Z-A' },
];

export function MemoryFilters({ campaignId, initialState, onChange }: MemoryFiltersProps) {
  const [searchQuery, setSearchQuery] = useState(initialState.searchQuery);
  const [type, setType] = useState(initialState.type);
  const [tags, setTags] = useState<string[]>(initialState.tags);
  const [sort, setSort] = useState(initialState.sort);
  const [isExpanded, setIsExpanded] = useState(false);
  const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout | null>(null);

  const hasActiveFilters = searchQuery || type || tags.length > 0 || sort !== 'newest';

  useEffect(() => {
    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }

    const timeout = setTimeout(() => {
      onChange({ searchQuery, type, tags, sort });
    }, 300);

    setSearchTimeout(timeout);

    return () => {
      if (timeout) clearTimeout(timeout);
    };
  }, [searchQuery, type, tags, sort]);

  const clearFilters = () => {
    setSearchQuery('');
    setType('');
    setTags([]);
    setSort('newest');
  };

  const removeTag = (tagToRemove: string) => {
    setTags(prev => prev.filter(t => t !== tagToRemove));
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground/60" />
          <Input
            placeholder="Search title, content, tags..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button
          variant={isExpanded ? 'default' : 'outline'}
          size="icon"
          onClick={() => setIsExpanded(!isExpanded)}
          className="shrink-0"
        >
          <SlidersHorizontal className="h-4 w-4" />
        </Button>
      </div>

      {isExpanded && (
        <div className="space-y-4 p-4 border border-border rounded-lg bg-card/50">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium">Advanced Filters</Label>
            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                className="h-8 px-2 text-xs"
              >
                <X className="h-3 w-3 mr-1" />
                Clear All
              </Button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Type</Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger>
                  <SelectValue placeholder="All types" />
                </SelectTrigger>
                <SelectContent>
                  {MEMORY_TYPES.map(option => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Sort By</Label>
              <Select value={sort} onValueChange={setSort}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SORT_OPTIONS.map(option => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Tags</Label>
            <TagSelector
              campaignId={campaignId}
              selectedTags={tags}
              onChange={setTags}
              placeholder="Filter by tags..."
              createNewTags={false}
            />
          </div>
        </div>
      )}

      {hasActiveFilters && (
        <div className="flex gap-2 flex-wrap">
          {searchQuery && (
            <Badge variant="secondary" className="gap-1 pr-1">
              Search: {searchQuery.substring(0, 20)}
              {searchQuery.length > 20 && '...'}
              <button
                onClick={() => setSearchQuery('')}
                className="ml-1 hover:bg-secondary-foreground/20 rounded-full p-0.5"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
          {type && (
            <Badge variant="secondary" className="gap-1 pr-1">
              {MEMORY_TYPES.find(t => t.value === type)?.label || type}
              <button
                onClick={() => setType('')}
                className="ml-1 hover:bg-secondary-foreground/20 rounded-full p-0.5"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
          {tags.map(tag => (
            <Badge key={tag} variant="secondary" className="gap-1 pr-1">
              {tag}
              <button
                onClick={() => removeTag(tag)}
                className="ml-1 hover:bg-secondary-foreground/20 rounded-full p-0.5"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
          {sort !== 'newest' && (
            <Badge variant="secondary" className="gap-1 pr-1">
              Sort: {SORT_OPTIONS.find(s => s.value === sort)?.label}
              <button
                onClick={() => setSort('newest')}
                className="ml-1 hover:bg-secondary-foreground/20 rounded-full p-0.5"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
        </div>
      )}
    </div>
  );
}
