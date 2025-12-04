'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Search, Link2, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { ScrollArea } from '@/components/ui/scroll-area';

interface RelationsPickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campaignId: string;
  fromMemoryId: string;
  fromMemoryTitle: string;
  onSuccess: () => void;
}

interface SearchResult {
  id: string;
  title: string;
  type: string;
  forge_type?: string;
}

export const RELATION_TYPES = [
  { value: 'related_to', label: 'Related to', inverse: 'Related to' },
  { value: 'located_in', label: 'Located in', inverse: 'Contains' },
  { value: 'contains', label: 'Contains', inverse: 'Located in' },
  { value: 'works_for', label: 'Works for', inverse: 'Employs' },
  { value: 'employs', label: 'Employs', inverse: 'Works for' },
  { value: 'created_by', label: 'Created by', inverse: 'Created' },
  { value: 'created', label: 'Created', inverse: 'Created by' },
  { value: 'member_of', label: 'Member of', inverse: 'Has member' },
  { value: 'has_member', label: 'Has member', inverse: 'Member of' },
  { value: 'commands', label: 'Commands', inverse: 'Commanded by' },
  { value: 'commanded_by', label: 'Commanded by', inverse: 'Commands' },
  { value: 'guards', label: 'Guards', inverse: 'Guarded by' },
  { value: 'guarded_by', label: 'Guarded by', inverse: 'Guards' },
  { value: 'owns', label: 'Owns', inverse: 'Owned by' },
  { value: 'owned_by', label: 'Owned by', inverse: 'Owns' },
  { value: 'fears', label: 'Fears', inverse: 'Feared by' },
  { value: 'feared_by', label: 'Feared by', inverse: 'Fears' },
  { value: 'worships', label: 'Worships', inverse: 'Worshipped by' },
  { value: 'worshipped_by', label: 'Worshipped by', inverse: 'Worships' },
  { value: 'serves', label: 'Serves', inverse: 'Served by' },
  { value: 'served_by', label: 'Served by', inverse: 'Serves' },
  { value: 'betrayed_by', label: 'Betrayed by', inverse: 'Betrayed' },
  { value: 'betrayed', label: 'Betrayed', inverse: 'Betrayed by' },
  { value: 'indebted_to', label: 'Indebted to', inverse: 'Debt owed by' },
  { value: 'debt_owed_by', label: 'Debt owed by', inverse: 'Indebted to' },
  { value: 'mentored_by', label: 'Mentored by', inverse: 'Mentors' },
  { value: 'mentors', label: 'Mentors', inverse: 'Mentored by' },
  { value: 'rival_of', label: 'Rival of', inverse: 'Rival of' },
  { value: 'knows_secret_about', label: 'Knows secret about', inverse: 'Secret known by' },
  { value: 'secret_known_by', label: 'Secret known by', inverse: 'Knows secret about' },
  { value: 'allied_with', label: 'Allied with', inverse: 'Allied with' },
  { value: 'opposed_to', label: 'Opposed to', inverse: 'Opposed to' },
  { value: 'seeks', label: 'Seeks', inverse: 'Sought by' },
  { value: 'sought_by', label: 'Sought by', inverse: 'Seeks' },
  { value: 'inhabits', label: 'Inhabits', inverse: 'Inhabited by' },
  { value: 'inhabited_by', label: 'Inhabited by', inverse: 'Inhabits' },
  { value: 'runs', label: 'Runs', inverse: 'Run by' },
  { value: 'run_by', label: 'Run by', inverse: 'Runs' },
];

const TYPE_FILTER = [
  { value: 'all', label: 'All Types' },
  { value: 'npc', label: 'NPC' },
  { value: 'monster', label: 'Monster' },
  { value: 'location', label: 'Location' },
  { value: 'faction', label: 'Faction' },
  { value: 'item', label: 'Item' },
  { value: 'shop', label: 'Shop' },
  { value: 'town', label: 'Town' },
];

export function RelationsPicker({
  open,
  onOpenChange,
  campaignId,
  fromMemoryId,
  fromMemoryTitle,
  onSuccess
}: RelationsPickerProps) {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [relationType, setRelationType] = useState('located_in');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [selectedMemory, setSelectedMemory] = useState<SearchResult | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    if (open && searchQuery) {
      searchMemories();
    }
  }, [searchQuery, typeFilter, open]);

  const searchMemories = async () => {
    setIsSearching(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const params = new URLSearchParams({
        campaignId,
        limit: '20'
      });
      if (searchQuery) params.append('q', searchQuery);
      if (typeFilter && typeFilter !== 'all') params.append('type', typeFilter);

      const response = await fetch(`/api/memory/search?${params.toString()}`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setResults((data.items || []).filter((item: SearchResult) => item.id !== fromMemoryId));
      }
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setIsSearching(false);
    }
  };

  const handleCreate = async () => {
    if (!selectedMemory) {
      toast({
        title: 'No memory selected',
        description: 'Please select a memory to link to',
        variant: 'destructive',
      });
      return;
    }

    setIsCreating(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast({
          title: 'Not authenticated',
          description: 'Please sign in to create relations',
          variant: 'destructive',
        });
        return;
      }

      const response = await fetch('/api/relations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          campaignId,
          fromId: fromMemoryId,
          toId: selectedMemory.id,
          relationType,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        console.error('Create relation error:', errorData);
        throw new Error(errorData.error || 'Failed to create relation');
      }

      toast({
        title: 'Relation created',
        description: `Linked "${fromMemoryTitle}" to "${selectedMemory.title}"`,
      });

      setSearchQuery('');
      setSelectedMemory(null);
      setResults([]);
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error('Create relation error:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to create relation',
        variant: 'destructive',
      });
    } finally {
      setIsCreating(false);
    }
  };

  const getTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      npc: 'bg-blue-500/15 text-blue-300',
      monster: 'bg-red-500/15 text-red-300',
      location: 'bg-green-500/15 text-green-300',
      faction: 'bg-pink-500/15 text-pink-300',
      item: 'bg-orange-500/15 text-orange-300',
      shop: 'bg-yellow-500/15 text-yellow-300',
      town: 'bg-emerald-500/15 text-emerald-300',
    };
    return colors[type] || 'bg-gray-500/15 text-gray-300';
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Create Relationship</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Relation Type</Label>
            <Select value={relationType} onValueChange={setRelationType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {RELATION_TYPES.map(type => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              "{fromMemoryTitle}" {RELATION_TYPES.find(t => t.value === relationType)?.label.toLowerCase()} →
            </p>
          </div>

          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search memories..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="All types" />
              </SelectTrigger>
              <SelectContent>
                {TYPE_FILTER.map(type => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <ScrollArea className="h-64 border border-border rounded-lg p-2">
            {isSearching ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : results.length === 0 ? (
              <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                {searchQuery ? 'No results found' : 'Start typing to search'}
              </div>
            ) : (
              <div className="space-y-2">
                {results.map((result) => (
                  <button
                    key={result.id}
                    onClick={() => setSelectedMemory(result)}
                    className={`w-full text-left p-3 rounded-lg border transition-colors ${
                      selectedMemory?.id === result.id
                        ? 'border-primary bg-primary/10'
                        : 'border-border hover:border-primary/50 hover:bg-accent/50'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium">{result.title}</span>
                      <Badge className={getTypeColor(result.type)}>
                        {result.type.toUpperCase()}
                      </Badge>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </ScrollArea>

          {selectedMemory && (
            <div className="p-3 bg-accent/50 rounded-lg border border-border">
              <p className="text-sm">
                <span className="font-medium">{fromMemoryTitle}</span>
                <span className="text-muted-foreground mx-2">
                  {RELATION_TYPES.find(t => t.value === relationType)?.label.toLowerCase()}
                </span>
                <span className="font-medium">{selectedMemory.title}</span>
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleCreate}
            disabled={!selectedMemory || isCreating}
          >
            {isCreating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <Link2 className="h-4 w-4 mr-2" />
                Create Link
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
