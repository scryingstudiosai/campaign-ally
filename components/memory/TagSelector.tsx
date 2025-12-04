'use client';

import { useState, useEffect, useRef, KeyboardEvent } from 'react';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { X, Plus, Tag as TagIcon } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase/client';

interface Tag {
  tag_name: string;
  tag_category: 'preset' | 'location' | 'faction' | 'custom';
  use_count: number;
}

interface TagSelectorProps {
  campaignId: string;
  selectedTags: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
  createNewTags?: boolean;
}

export function TagSelector({ campaignId, selectedTags, onChange, placeholder = 'Search or create tags...', createNewTags = true }: TagSelectorProps) {
  const [availableTags, setAvailableTags] = useState<Tag[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchTags();
  }, [campaignId]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchTags = async () => {
    try {
      setIsLoading(true);
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        console.error('No session found for fetching tags');
        setIsLoading(false);
        return;
      }

      const response = await fetch(`/api/campaigns/${campaignId}/tags`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });
      if (!response.ok) {
        throw new Error('Failed to fetch tags');
      }
      const data = await response.json();
      setAvailableTags(data.tags || []);
    } catch (error) {
      console.error('Error fetching tags:', error);
      toast({
        title: 'Error',
        description: 'Failed to load tags',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const createNewTag = async (tagName: string, category: 'custom' | 'location' | 'faction' = 'custom') => {
    try {
      setIsCreating(true);
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        toast({
          title: 'Not logged in',
          description: 'Please sign in to create tags.',
          variant: 'destructive',
        });
        return null;
      }

      const response = await fetch(`/api/campaigns/${campaignId}/tags`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          tag_name: tagName,
          tag_category: category,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        if (response.status === 409) {
          toast({
            title: 'Tag exists',
            description: 'This tag already exists in your campaign',
          });
          return null;
        }
        throw new Error(error.error || 'Failed to create tag');
      }

      const data = await response.json();
      const newTag = data.tag;

      setAvailableTags(prev => [...prev, newTag]);

      toast({
        title: 'Tag created',
        description: `"${newTag.tag_name}" has been added to your campaign`,
      });

      return newTag.tag_name;
    } catch (error) {
      console.error('Error creating tag:', error);
      toast({
        title: 'Error',
        description: 'Failed to create tag',
        variant: 'destructive',
      });
      return null;
    } finally {
      setIsCreating(false);
    }
  };

  const handleSelectTag = (tagName: string) => {
    if (!selectedTags.includes(tagName)) {
      onChange([...selectedTags, tagName]);
    }
    setSearchQuery('');
    setIsOpen(false);
    inputRef.current?.focus();
  };

  const handleRemoveTag = (tagName: string) => {
    onChange(selectedTags.filter(t => t !== tagName));
  };

  const handleKeyDown = async (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();

      const query = searchQuery.trim();
      if (!query) return;

      const exactMatch = availableTags.find(
        t => t.tag_name.toLowerCase() === query.toLowerCase()
      );

      if (exactMatch) {
        handleSelectTag(exactMatch.tag_name);
      } else if (createNewTags) {
        const newTagName = await createNewTag(query);
        if (newTagName) {
          handleSelectTag(newTagName);
        }
      }
    } else if (e.key === 'Backspace' && searchQuery === '' && selectedTags.length > 0) {
      e.preventDefault();
      const lastTag = selectedTags[selectedTags.length - 1];
      handleRemoveTag(lastTag);
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  const filteredTags = availableTags.filter(tag => {
    const matchesSearch = tag.tag_name.toLowerCase().includes(searchQuery.toLowerCase());
    const notSelected = !selectedTags.includes(tag.tag_name);
    return matchesSearch && notSelected;
  });

  const presetTags = filteredTags
    .filter(t => t.tag_category === 'preset')
    .sort((a, b) => a.tag_name.localeCompare(b.tag_name));

  const customTags = filteredTags
    .filter(t => t.tag_category !== 'preset')
    .sort((a, b) => b.use_count - a.use_count || a.tag_name.localeCompare(b.tag_name));

  const showCreateOption = createNewTags && searchQuery.trim() &&
    !availableTags.some(t => t.tag_name.toLowerCase() === searchQuery.trim().toLowerCase());

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2 min-h-[32px]">
        {selectedTags.map(tag => (
          <Badge
            key={tag}
            variant="secondary"
            className="flex items-center gap-1 px-2 py-1"
          >
            <TagIcon className="h-3 w-3" />
            {tag}
            <button
              type="button"
              onClick={() => handleRemoveTag(tag)}
              className="ml-1 hover:bg-secondary-foreground/20 rounded-full p-0.5"
            >
              <X className="h-3 w-3" />
            </button>
          </Badge>
        ))}
      </div>

      <div className="relative">
        <Input
          ref={inputRef}
          type="text"
          placeholder={placeholder}
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          disabled={isCreating}
          className="w-full"
        />

        {isOpen && (
          <div
            ref={dropdownRef}
            className="absolute z-50 w-full mt-1 bg-popover border border-border rounded-md shadow-lg"
          >
            <div className="max-h-[300px] overflow-y-auto">
              <div className="p-2 space-y-1">
                {isLoading && (
                  <div className="py-6 text-center text-sm text-muted-foreground">
                    Loading tags...
                  </div>
                )}

                {!isLoading && filteredTags.length === 0 && !showCreateOption && (
                  <div className="py-6 text-center text-sm text-muted-foreground">
                    {searchQuery ? 'No tags found' : 'No tags available'}
                  </div>
                )}

                {showCreateOption && (
                  <Button
                    type="button"
                    variant="ghost"
                    className="w-full justify-start text-left font-normal"
                    onClick={async () => {
                      const newTagName = await createNewTag(searchQuery.trim());
                      if (newTagName) {
                        handleSelectTag(newTagName);
                      }
                    }}
                    disabled={isCreating}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Create &quot;{searchQuery.trim()}&quot;
                  </Button>
                )}

                {presetTags.length > 0 && (
                  <div>
                    <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Preset
                    </div>
                    {presetTags.map(tag => (
                      <Button
                        key={tag.tag_name}
                        type="button"
                        variant="ghost"
                        className="w-full justify-start text-left font-normal"
                        onClick={() => handleSelectTag(tag.tag_name)}
                      >
                        <TagIcon className="h-4 w-4 mr-2" />
                        {tag.tag_name}
                        {tag.use_count > 0 && (
                          <span className="ml-auto text-xs text-muted-foreground">
                            {tag.use_count}
                          </span>
                        )}
                      </Button>
                    ))}
                  </div>
                )}

                {customTags.length > 0 && (
                  <div>
                    <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Custom
                    </div>
                    {customTags.map(tag => (
                      <Button
                        key={tag.tag_name}
                        type="button"
                        variant="ghost"
                        className="w-full justify-start text-left font-normal"
                        onClick={() => handleSelectTag(tag.tag_name)}
                      >
                        <TagIcon className="h-4 w-4 mr-2" />
                        {tag.tag_name}
                        <span className="ml-1 text-xs text-muted-foreground">
                          ({tag.tag_category})
                        </span>
                        {tag.use_count > 0 && (
                          <span className="ml-auto text-xs text-muted-foreground">
                            {tag.use_count}
                          </span>
                        )}
                      </Button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {createNewTags && (
        <p className="text-xs text-muted-foreground">
          Press Enter to add, Backspace to remove last tag
        </p>
      )}
    </div>
  );
}
