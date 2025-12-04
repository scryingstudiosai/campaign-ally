'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Link, Search } from 'lucide-react';

interface Memory {
  id: string;
  title: string;
  type: string;
  tags?: string[];
  content?: string;
}

interface MemoryLinkerProps {
  campaignId: string;
  onLink: (memoryId: string) => void;
}

export default function MemoryLinker({ campaignId, onLink }: MemoryLinkerProps) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [memories, setMemories] = useState<Memory[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      fetchMemories();
    }
  }, [open, campaignId]);

  async function fetchMemories(query?: string) {
    setLoading(true);
    try {
      const url = query
        ? `/api/memory/search?campaignId=${campaignId}&query=${encodeURIComponent(query)}`
        : `/api/memory?campaignId=${campaignId}`;

      const res = await fetch(url);
      const data = await res.json();

      if (data.success) {
        setMemories(data.data || []);
      } else {
        toast({
          title: 'Error',
          description: data.error || 'Failed to load memories',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load memories',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }

  function handleSearch() {
    if (searchTerm.trim()) {
      fetchMemories(searchTerm);
    } else {
      fetchMemories();
    }
  }

  function handleLinkMemory(memory: Memory) {
    onLink(memory.id);
    toast({
      title: 'Memory Linked',
      description: `Linked: ${memory.title}`,
    });
    setOpen(false);
    setSearchTerm('');
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm">
          <Link className="h-3 w-3 mr-1" />
          Link Memory
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96" align="end">
        <div className="space-y-4">
          <div>
            <h4 className="font-semibold mb-2">Link a Memory</h4>
            <p className="text-sm text-muted-foreground mb-3">
              Search and link relevant memories to this scene
            </p>
          </div>

          <div className="flex gap-2">
            <Input
              placeholder="Search memories..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            />
            <Button size="sm" onClick={handleSearch} disabled={loading}>
              <Search className="h-4 w-4" />
            </Button>
          </div>

          <div className="max-h-64 overflow-y-auto space-y-2">
            {loading ? (
              <div className="text-center text-sm text-muted-foreground py-4">
                Loading...
              </div>
            ) : memories.length === 0 ? (
              <div className="text-center text-sm text-muted-foreground py-4">
                No memories found
              </div>
            ) : (
              memories.map((memory) => (
                <div
                  key={memory.id}
                  className="p-3 border rounded-lg hover:bg-accent cursor-pointer transition-colors"
                  onClick={() => handleLinkMemory(memory)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <h5 className="font-medium text-sm truncate">{memory.title}</h5>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="text-xs">
                          {memory.type}
                        </Badge>
                        {memory.tags && memory.tags.length > 0 && (
                          <span className="text-xs text-muted-foreground truncate">
                            {memory.tags.slice(0, 2).join(', ')}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  {memory.content && (
                    <p className="text-xs text-muted-foreground mt-2 line-clamp-2">
                      {memory.content}
                    </p>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
