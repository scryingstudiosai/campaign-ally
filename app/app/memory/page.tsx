'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { supabase } from '@/lib/supabase/client';
import { toast } from 'sonner';
import {
  Search,
  Plus,
  Upload,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  LayoutGrid,
  BookOpen,
  RefreshCw,
} from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useDebounce } from '@/lib/hooks/useDebounce';
import { ErrorBoundary } from '@/components/error-boundary';

// Dynamic imports for heavy components
const MemoryEntryCard = dynamic(() => import('@/components/memory/MemoryEntryCard').then(mod => ({ default: mod.MemoryEntryCard })), {
  loading: () => <Skeleton className="h-48 w-full" />
});

const VirtualizedMemoryGrid = dynamic(() => import('@/components/memory/VirtualizedMemoryGrid').then(mod => ({ default: mod.VirtualizedMemoryGrid })), {
  loading: () => <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">{Array(6).fill(0).map((_, i) => <Skeleton key={i} className="h-48" />)}</div>
});

const AddMemoryModal = dynamic(() => import('@/components/memory/AddMemoryModal').then(mod => ({ default: mod.AddMemoryModal })), {
  ssr: false
});

const MemoryDetailModal = dynamic(() => import('@/components/memory/MemoryDetailModalLazy').then(mod => ({ default: mod.MemoryDetailModalLazy })), {
  ssr: false
});

const ImportModal = dynamic(() => import('@/components/memory/ImportModal').then(mod => ({ default: mod.ImportModal })), {
  ssr: false
});

const WikiView = dynamic(() => import('@/components/memory/wiki/WikiView').then(mod => ({ default: mod.WikiView })), {
  loading: () => <div className="flex items-center justify-center h-full"><Skeleton className="h-96 w-full" /></div>
});

const HighlightConjureMenu = dynamic(() => import('@/components/memory/HighlightConjureMenu').then(mod => ({ default: mod.HighlightConjureMenu })), {
  ssr: false
});

const ConjureFromTextModal = dynamic(() => import('@/components/memory/ConjureFromTextModal').then(mod => ({ default: mod.ConjureFromTextModal })), {
  ssr: false
});

interface MemoryEntry {
  id: string;
  name: string;
  type: string;
  category?: string;
  content?: string;
  summary?: string;
  dm_notes?: string;
  tags: string[];
  pinned: boolean;
  archived: boolean;
  first_appearance?: string;
  created_at: string;
  updated_at: string;
}

const MEMORY_TYPES = [
  { value: 'all', label: 'All Types', icon: '📚' },
  { value: 'npc', label: 'NPCs', icon: '🧑' },
  { value: 'location', label: 'Locations', icon: '🏛️' },
  { value: 'faction', label: 'Factions', icon: '🏰' },
  { value: 'monster', label: 'Monsters', icon: '🐉' },
  { value: 'item', label: 'Items', icon: '⚔️' },
  { value: 'quest', label: 'Quests', icon: '📜' },
  { value: 'hook', label: 'Hooks', icon: '🎣' },
  { value: 'session', label: 'Sessions', icon: '📅' },
  { value: 'event', label: 'Events', icon: '🌩️' },
  { value: 'puzzle', label: 'Puzzles', icon: '🧩' },
  { value: 'custom', label: 'Custom', icon: '📝' },
];

const SORT_OPTIONS = [
  { value: 'recent', label: 'Recent' },
  { value: 'oldest', label: 'Oldest first' },
  { value: 'alphabetical', label: 'Alphabetical (A-Z)' },
  { value: 'alphabetical-desc', label: 'Alphabetical (Z-A)' },
];

const FILTER_OPTIONS = [
  { value: 'all', label: 'All' },
  { value: 'pinned', label: 'Pinned only' },
  { value: 'recent', label: 'Recent (7 days)' },
  { value: 'archived', label: 'Archived' },
];

const VIRTUAL_SCROLL_THRESHOLD = 50;

export default function MemoryPage() {
  const router = useRouter();
  const [campaignId, setCampaignId] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [memories, setMemories] = useState<MemoryEntry[]>([]);
  const [filteredMemories, setFilteredMemories] = useState<MemoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearchQuery = useDebounce(searchQuery, 300);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedType, setSelectedType] = useState('all');
  const [sortBy, setSortBy] = useState('recent');
  const [filter, setFilter] = useState('all');
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<MemoryEntry | null>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [collapsedCategories, setCollapsedCategories] = useState<Record<string, boolean>>({});
  const [viewMode, setViewMode] = useState<'cards' | 'wiki'>('cards');

  // Highlight menu state (at page level, not inside modal)
  const [highlightMenu, setHighlightMenu] = useState<{
    show: boolean;
    text: string;
    position: { x: number; y: number };
    sourceMemoryId: string;
    sourceMemoryName: string;
    sourceMemoryType: string;
  } | null>(null);

  // Conjure modal state
  const [conjureModal, setConjureModal] = useState<{
    show: boolean;
    text: string;
    type: string;
    sourceMemoryId: string;
    sourceMemoryName: string;
    sourceMemoryType: string;
  } | null>(null);

  useEffect(() => {
    const initializePage = async () => {
      console.log('[Memory Page] Initializing...');
      const stored = localStorage.getItem('currentCampaignId');
      console.log('[Memory Page] Stored campaignId:', stored);
      if (stored) {
        setCampaignId(stored);
      }

      const { data: { user } } = await supabase.auth.getUser();
      console.log('[Memory Page] User:', user?.id);
      if (user) {
        setUserId(user.id);
      }

      const savedCollapsed = localStorage.getItem('memoryCollapsedCategories');
      if (savedCollapsed) {
        try {
          setCollapsedCategories(JSON.parse(savedCollapsed));
        } catch (e) {
          console.error('Failed to parse collapsed categories:', e);
        }
      }

      const savedViewMode = localStorage.getItem('memoryViewMode');
      if (savedViewMode === 'wiki' || savedViewMode === 'cards') {
        setViewMode(savedViewMode);
      }
    };

    initializePage();
  }, []);

  useEffect(() => {
    localStorage.setItem('memoryViewMode', viewMode);
  }, [viewMode]);

  const loadMemories = useCallback(async () => {
    if (!campaignId) {
      console.log('[Memory Page] No campaignId, skipping load');
      return;
    }

    console.log('[Memory Page] Loading memories for campaign:', campaignId);
    setLoading(true);
    try {
      // Get the current session token
      const { data: { session } } = await supabase.auth.getSession();

      const params = new URLSearchParams({
        campaignId,
        sort: sortBy,
        filter,
      });

      if (selectedType !== 'all') {
        params.append('type', selectedType);
      }

      const url = `/api/memory/entries?${params.toString()}`;
      console.log('[Memory Page] Fetching:', url);

      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };

      // Add authorization header if we have a session
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
        console.log('[Memory Page] Added auth token to request');
      } else {
        console.warn('[Memory Page] No session token available');
      }

      const response = await fetch(url, {
        headers,
        cache: 'no-store',
      });
      const data = await response.json();

      console.log('[Memory Page] Response:', { ok: response.ok, status: response.status, data });

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to load memories');
      }

      console.log('[Memory Page] Setting memories:', data.data?.length || 0);
      setMemories(data.data || []);
    } catch (error) {
      console.error('[Memory Page] Error loading memories:', error);
      toast.error('Failed to load memories');
    } finally {
      setLoading(false);
    }
  }, [campaignId, selectedType, sortBy, filter]);

  const filterAndSearchMemories = useCallback(() => {
    console.log('[Memory Page] filterAndSearchMemories called');
    console.log('[Memory Page] memories.length:', memories.length);
    console.log('[Memory Page] debouncedSearchQuery:', debouncedSearchQuery);

    let filtered = [...memories];

    if (debouncedSearchQuery) {
      const query = debouncedSearchQuery.toLowerCase();
      filtered = filtered.filter(
        (entry) =>
          entry.name.toLowerCase().includes(query) ||
          entry.content?.toLowerCase().includes(query) ||
          entry.tags.some((tag) => tag.toLowerCase().includes(query))
      );
      console.log('[Memory Page] After search filter:', filtered.length);
    }

    console.log('[Memory Page] Setting filteredMemories:', filtered.length);
    setFilteredMemories(filtered);
    setIsSearching(false);
  }, [memories, debouncedSearchQuery]);

  useEffect(() => {
    if (campaignId) {
      loadMemories();
    }
  }, [campaignId, loadMemories]);

  // Reload memories when the page becomes visible (e.g., navigating from Forge)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && campaignId) {
        console.log('[Memory Page] Page visible, reloading memories');
        loadMemories();
      }
    };

    const handleFocus = () => {
      if (campaignId) {
        console.log('[Memory Page] Window focused, reloading memories');
        loadMemories();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, [campaignId, loadMemories]);

  // Track when user is typing vs when debounced search actually runs
  useEffect(() => {
    if (searchQuery !== debouncedSearchQuery) {
      setIsSearching(true);
    }
  }, [searchQuery, debouncedSearchQuery]);

  useEffect(() => {
    console.log('[Memory Page] useEffect triggered - about to filter');
    console.log('[Memory Page] memories.length in useEffect:', memories.length);
    filterAndSearchMemories();
  }, [filterAndSearchMemories]);

  const handleView = useCallback((id: string) => {
    const entry = memories.find((m) => m.id === id);
    if (entry) {
      setSelectedEntry(entry);
      setDetailModalOpen(true);
    }
  }, [memories]);

  const handleEdit = useCallback((id: string) => {
    const entry = memories.find((m) => m.id === id);
    if (entry) {
      setSelectedEntry(entry);
      setDetailModalOpen(true);
    }
  }, [memories]);

  // Handle text selection from memory cards (page level)
  const handleTextSelection = useCallback((e: React.MouseEvent) => {
    if (!selectedEntry) return;

    setTimeout(() => {
      const selection = window.getSelection();
      const selectedText = selection?.toString().trim();

      console.log('📝 Text selection detected at page level:', {
        selectedText,
        length: selectedText?.length || 0,
        sourceMemory: selectedEntry.name
      });

      if (selectedText && selectedText.length > 2) {
        const range = selection?.getRangeAt(0);
        const rect = range?.getBoundingClientRect();

        if (rect) {
          const position = {
            x: Math.min(rect.right + 10, window.innerWidth - 220),
            y: Math.max(rect.top, 60)
          };

          console.log('✅ Showing highlight menu at:', position);

          setHighlightMenu({
            show: true,
            text: selectedText,
            position,
            sourceMemoryId: selectedEntry.id,
            sourceMemoryName: selectedEntry.name,
            sourceMemoryType: selectedEntry.type
          });
        }
      } else {
        setHighlightMenu(null);
      }
    }, 10);
  }, [selectedEntry]);

  // Handle conjure from highlight menu (page level)
  const handleConjure = useCallback((type: string, text: string) => {
    if (!highlightMenu) return;

    console.log('🎨 handleConjure at page level:', { type, text });

    // Close highlight menu
    setHighlightMenu(null);

    // Close the memory detail modal
    setDetailModalOpen(false);
    setSelectedEntry(null);

    // Open conjure modal
    setConjureModal({
      show: true,
      text,
      type,
      sourceMemoryId: highlightMenu.sourceMemoryId,
      sourceMemoryName: highlightMenu.sourceMemoryName,
      sourceMemoryType: highlightMenu.sourceMemoryType
    });

    console.log('✅ Conjure modal state set at page level');
  }, [highlightMenu]);

  const handlePin = useCallback(async (id: string, pinned: boolean) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Not authenticated');
        return;
      }

      const response = await fetch(`/api/memory/entries/${id}/pin`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ pinned }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to update pin status');
      }

      toast.success(pinned ? 'Entry pinned' : 'Entry unpinned');
      loadMemories();
    } catch (error) {
      console.error('Error updating pin:', error);
      toast.error('Failed to update pin status');
    }
  }, [loadMemories]);

  const handleArchive = useCallback(async (id: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Not authenticated');
        return;
      }

      const response = await fetch(`/api/memory/entries/${id}/archive`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ archived: true }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to archive entry');
      }

      toast.success('Entry archived');
      loadMemories();
    } catch (error) {
      console.error('Error archiving:', error);
      toast.error('Failed to archive entry');
    }
  }, [loadMemories]);

  const handleDelete = useCallback(async (id: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Not authenticated');
        return;
      }

      const response = await fetch(`/api/memory/entries/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to delete entry');
      }

      toast.success('Entry deleted');
      loadMemories();
    } catch (error) {
      console.error('Error deleting:', error);
      toast.error('Failed to delete entry');
    }
  }, [loadMemories]);

  const toggleCategory = (type: string) => {
    const newCollapsed = {
      ...collapsedCategories,
      [type]: !collapsedCategories[type],
    };
    setCollapsedCategories(newCollapsed);
    localStorage.setItem('memoryCollapsedCategories', JSON.stringify(newCollapsed));
  };

  const getEntriesByType = (type: string) => {
    return filteredMemories.filter((entry) =>
      entry.type?.toLowerCase() === type?.toLowerCase()
    );
  };

  const pinnedEntries = filteredMemories.filter((entry) => entry.pinned);
  const categorizedTypes = MEMORY_TYPES.filter((t) => t.value !== 'all');

  if (!campaignId) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center space-y-4">
          <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto" />
          <p className="text-muted-foreground">No campaign selected</p>
          <Button onClick={() => router.push('/app')}>Select Campaign</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h1 className="text-3xl font-bold">Memory</h1>
          <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as 'cards' | 'wiki')}>
            <TabsList>
              <TabsTrigger value="cards" className="gap-2">
                <LayoutGrid className="h-4 w-4" />
                Cards
              </TabsTrigger>
              <TabsTrigger value="wiki" className="gap-2">
                <BookOpen className="h-4 w-4" />
                Wiki
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => loadMemories()}
            disabled={loading}
            title="Refresh memories"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
          <Button onClick={() => setAddModalOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Entry
          </Button>
          <Button variant="outline" onClick={() => setImportModalOpen(true)}>
            <Upload className="h-4 w-4 mr-2" />
            Import
          </Button>
        </div>
      </div>

      {viewMode === 'wiki' ? (
        <WikiView
          campaignId={campaignId}
          userId={userId!}
          initialEntries={memories as any[]}
          onBackToCards={() => setViewMode('cards')}
        />
      ) : (
        <>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search memories..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-10"
            />
            {isSearching && (
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                <RefreshCw className="h-4 w-4 animate-spin text-muted-foreground" />
              </div>
            )}
          </div>

          <div className="flex flex-wrap gap-4">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Type:</span>
          <Select value={selectedType} onValueChange={setSelectedType}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MEMORY_TYPES.map((type) => (
                <SelectItem key={type.value} value={type.value}>
                  {type.icon} {type.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Sort:</span>
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SORT_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Filter:</span>
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {FILTER_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-64" />
          ))}
        </div>
      ) : filteredMemories.length === 0 ? (
        <div className="text-center py-20">
          <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-xl font-semibold mb-2">No memory entries yet</h3>
          <p className="text-muted-foreground mb-4">
            Create your first entry to start building your campaign world
          </p>
          <Button onClick={() => setAddModalOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create Entry
          </Button>
        </div>
      ) : (
        <div className="space-y-8">
          {pinnedEntries.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold flex items-center gap-2">
                📌 Pinned ({pinnedEntries.length})
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {pinnedEntries.map((entry) => (
                  <MemoryEntryCard
                    key={entry.id}
                    entry={entry}
                    onView={handleView}
                    onEdit={handleEdit}
                    onPin={handlePin}
                    onArchive={handleArchive}
                    onDelete={handleDelete}
                  />
                ))}
              </div>
            </div>
          )}

          {categorizedTypes.map((typeInfo) => {
            const entries = getEntriesByType(typeInfo.value);
            if (entries.length === 0) return null;

            return (
              <Collapsible
                key={typeInfo.value}
                open={!collapsedCategories[typeInfo.value]}
                onOpenChange={() => toggleCategory(typeInfo.value)}
              >
                <div className="space-y-4">
                  <CollapsibleTrigger asChild>
                    <button className="flex items-center justify-between w-full text-xl font-semibold hover:text-primary transition-colors">
                      <span className="flex items-center gap-2">
                        {typeInfo.icon} {typeInfo.label} ({entries.length})
                      </span>
                      {collapsedCategories[typeInfo.value] ? (
                        <ChevronDown className="h-5 w-5" />
                      ) : (
                        <ChevronUp className="h-5 w-5" />
                      )}
                    </button>
                  </CollapsibleTrigger>

                  <CollapsibleContent>
                    {entries.length > VIRTUAL_SCROLL_THRESHOLD ? (
                      <VirtualizedMemoryGrid
                        entries={entries}
                        onView={handleView}
                        onEdit={handleEdit}
                        onPin={handlePin}
                        onArchive={handleArchive}
                        onDelete={handleDelete}
                      />
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {entries.map((entry) => (
                          <ErrorBoundary
                            key={entry.id}
                            fallbackComponent={
                              <div className="bg-gray-900 border border-red-500 rounded-lg p-4">
                                <div className="flex items-center gap-2 text-red-500">
                                  <AlertCircle className="h-4 w-4" />
                                  <span className="text-sm">Error loading memory card</span>
                                </div>
                              </div>
                            }
                          >
                            <MemoryEntryCard
                              entry={entry}
                              onView={handleView}
                              onEdit={handleEdit}
                              onPin={handlePin}
                              onArchive={handleArchive}
                              onDelete={handleDelete}
                            />
                          </ErrorBoundary>
                        ))}
                      </div>
                    )}
                  </CollapsibleContent>
                </div>
              </Collapsible>
            );
          })}
        </div>
      )}
        </>
      )}

      {campaignId && userId && (
        <AddMemoryModal
          open={addModalOpen}
          onOpenChange={setAddModalOpen}
          campaignId={campaignId}
          userId={userId}
          onSuccess={loadMemories}
        />
      )}

      {selectedEntry && (
        <MemoryDetailModal
          open={detailModalOpen}
          onOpenChange={setDetailModalOpen}
          item={selectedEntry as any}
          onSave={loadMemories}
          onTextSelection={handleTextSelection}
        />
      )}

      {/* Highlight menu at page level */}
      {highlightMenu?.show && campaignId && (
        <HighlightConjureMenu
          selectedText={highlightMenu.text}
          position={highlightMenu.position}
          sourceMemoryId={highlightMenu.sourceMemoryId}
          sourceMemoryName={highlightMenu.sourceMemoryName}
          sourceMemoryType={highlightMenu.sourceMemoryType}
          campaignId={campaignId}
          onClose={() => {
            console.log('❌ Closing highlight menu at page level');
            setHighlightMenu(null);
          }}
          onConjure={handleConjure}
        />
      )}

      {/* Conjure modal at page level */}
      {conjureModal?.show && campaignId && (
        <ConjureFromTextModal
          selectedText={conjureModal.text}
          entityType={conjureModal.type}
          sourceMemoryId={conjureModal.sourceMemoryId}
          sourceMemoryName={conjureModal.sourceMemoryName}
          sourceMemoryType={conjureModal.sourceMemoryType}
          campaignId={campaignId}
          onClose={() => {
            console.log('🚪 Closing conjure modal at page level');
            setConjureModal(null);
          }}
          onSuccess={(entity) => {
            console.log('🎉 Entity created successfully at page level:', entity?.title);
            setConjureModal(null);
            loadMemories();
          }}
        />
      )}

      {campaignId && userId && (
        <ImportModal
          open={importModalOpen}
          onOpenChange={setImportModalOpen}
          campaignId={campaignId}
          userId={userId}
          onSuccess={loadMemories}
        />
      )}
    </div>
  );
}
