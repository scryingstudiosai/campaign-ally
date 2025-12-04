'use client';

import { useState, useEffect } from 'react';
import { WikiSidebar } from './WikiSidebar';
import { WikiContent } from './WikiContent';
import { WikiInspector } from './WikiInspector';
import { MemoryItem } from '@/types/memory';
import { supabase } from '@/lib/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface WikiViewProps {
  campaignId: string;
  userId: string;
  initialEntries: MemoryItem[];
  onBackToCards: () => void;
}

interface Relationship {
  id: string;
  relation_type: string;
  to_id?: string;
  from_id?: string;
  to?: { id: string; title: string; type: string; forge_type?: string };
  from?: { id: string; title: string; type: string; forge_type?: string };
}

interface SessionNote {
  sessionNumber: number;
  sessionTitle: string;
  notes: string;
}

export function WikiView({ campaignId, userId, initialEntries, onBackToCards }: WikiViewProps) {
  const { toast } = useToast();
  const [entries, setEntries] = useState<MemoryItem[]>(initialEntries);
  const [currentEntryId, setCurrentEntryId] = useState<string | null>(
    initialEntries.length > 0 ? initialEntries[0].id : null
  );
  const [currentEntry, setCurrentEntry] = useState<MemoryItem | null>(null);
  const [relationships, setRelationships] = useState<{ outgoing: Relationship[]; incoming: Relationship[] }>({
    outgoing: [],
    incoming: []
  });
  const [sessions, setSessions] = useState<SessionNote[]>([]);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editedContent, setEditedContent] = useState<any>(null);
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set());
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [inspectorCollapsed, setInspectorCollapsed] = useState(false);
  const [loadingEntry, setLoadingEntry] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    setEntries(initialEntries);
  }, [initialEntries]);

  useEffect(() => {
    if (currentEntryId) {
      loadFullEntry(currentEntryId);
    }
  }, [currentEntryId]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isEditMode) {
          handleCancelEdit();
        }
      } else if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        if (isEditMode) {
          handleSave();
        }
      } else if ((e.metaKey || e.ctrlKey) && e.key === 'b') {
        e.preventDefault();
        onBackToCards();
      } else if (e.key === 'e' && !isEditMode && currentEntry) {
        enterEditMode();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isEditMode, currentEntry]);

  const loadFullEntry = async (entryId: string) => {
    setLoadingEntry(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch(`/api/memory/entries/${entryId}`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      if (response.ok) {
        const result = await response.json();
        setCurrentEntry(result.data);

        const relResponse = await fetch(`/api/relations?memoryId=${entryId}`, {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
          },
        });

        if (relResponse.ok) {
          const relData = await relResponse.json();
          setRelationships(relData);
        }
      }
    } catch (error) {
      console.error('Error loading entry:', error);
      toast({
        title: 'Error',
        description: 'Failed to load entry details',
        variant: 'destructive',
      });
    } finally {
      setLoadingEntry(false);
    }
  };

  const handleSelectEntry = (entryId: string) => {
    setCurrentEntryId(entryId);
    setIsEditMode(false);
    window.history.pushState({}, '', `/app/memory/wiki/${entryId}`);
  };

  const enterEditMode = () => {
    if (!currentEntry) return;
    setIsEditMode(true);
    setEditedContent({
      title: currentEntry.title,
      type: currentEntry.type,
      content: currentEntry.content,
      user_notes: currentEntry.user_notes || '',
      tags: currentEntry.tags || [],
    });
  };

  const handleCancelEdit = () => {
    const draftKey = `wiki-draft-${currentEntryId}`;
    localStorage.removeItem(draftKey);
    setIsEditMode(false);
    setEditedContent(null);
  };

  const handleSave = async () => {
    if (!currentEntry || !editedContent) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast({
          title: 'Error',
          description: 'Not authenticated',
          variant: 'destructive',
        });
        return;
      }

      const response = await fetch(`/api/memory/entries/${currentEntry.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: editedContent.title,
          type: editedContent.type,
          content: editedContent.content,
          dmNotes: editedContent.user_notes,
          tags: editedContent.tags,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        setCurrentEntry(result.data);
        setIsEditMode(false);
        setEditedContent(null);

        const draftKey = `wiki-draft-${currentEntryId}`;
        localStorage.removeItem(draftKey);

        setEntries(prev => prev.map(e => e.id === currentEntry.id ? result.data : e));

        toast({
          title: 'Success',
          description: 'Entry updated successfully',
        });
      } else {
        const errorData = await response.json();
        console.error('Save failed:', errorData);
        toast({
          title: 'Error',
          description: errorData.error || 'Failed to save changes',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error saving entry:', error);
      toast({
        title: 'Error',
        description: 'Failed to save changes',
        variant: 'destructive',
      });
    }
  };

  const handleArchive = async () => {
    if (!currentEntry) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch(`/api/memory/entries/${currentEntry.id}/archive`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      if (response.ok) {
        toast({
          title: 'Success',
          description: 'Entry archived successfully',
        });

        setEntries(prev => prev.filter(e => e.id !== currentEntry.id));

        if (entries.length > 1) {
          const nextEntry = entries.find(e => e.id !== currentEntry.id);
          if (nextEntry) {
            handleSelectEntry(nextEntry.id);
          }
        } else {
          onBackToCards();
        }
      }
    } catch (error) {
      console.error('Error archiving entry:', error);
      toast({
        title: 'Error',
        description: 'Failed to archive entry',
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async () => {
    if (!currentEntry) return;

    if (!confirm('Are you sure you want to delete this entry? This action cannot be undone.')) {
      return;
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch(`/api/memory/entries/${currentEntry.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      if (response.ok) {
        toast({
          title: 'Success',
          description: 'Entry deleted successfully',
        });

        setEntries(prev => prev.filter(e => e.id !== currentEntry.id));

        if (entries.length > 1) {
          const nextEntry = entries.find(e => e.id !== currentEntry.id);
          if (nextEntry) {
            handleSelectEntry(nextEntry.id);
          }
        } else {
          onBackToCards();
        }
      }
    } catch (error) {
      console.error('Error deleting entry:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete entry',
        variant: 'destructive',
      });
    }
  };

  const toggleSection = (sectionId: string) => {
    setCollapsedSections(prev => {
      const newSet = new Set(prev);
      if (newSet.has(sectionId)) {
        newSet.delete(sectionId);
      } else {
        newSet.add(sectionId);
      }
      return newSet;
    });
  };

  const filteredEntries = entries.filter(entry => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      entry.title.toLowerCase().includes(query) ||
      entry.type.toLowerCase().includes(query) ||
      entry.tags?.some(tag => tag.toLowerCase().includes(query))
    );
  });

  return (
    <div className="flex h-[calc(100vh-12rem)] gap-0 bg-background">
      <WikiSidebar
        entries={filteredEntries}
        activeEntryId={currentEntryId}
        onSelectEntry={handleSelectEntry}
        onBackToCards={onBackToCards}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
      />

      <WikiContent
        entry={currentEntry}
        relationships={relationships}
        sessions={sessions}
        isEditing={isEditMode}
        editedContent={editedContent}
        onEditedContentChange={setEditedContent}
        onEdit={enterEditMode}
        onSave={handleSave}
        onCancel={handleCancelEdit}
        collapsedSections={collapsedSections}
        onToggleSection={toggleSection}
        loading={loadingEntry}
        onNavigateToEntry={handleSelectEntry}
      />

      <WikiInspector
        entry={currentEntry}
        relationships={relationships}
        sessions={sessions}
        onNavigate={handleSelectEntry}
        onEditEntry={enterEditMode}
        onArchive={handleArchive}
        onDelete={handleDelete}
        collapsed={inspectorCollapsed}
        onToggleCollapse={() => setInspectorCollapsed(!inspectorCollapsed)}
      />
    </div>
  );
}
