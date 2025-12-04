'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { MemoryItem } from '@/types/memory';
import {
  Edit,
  Save,
  X,
  ChevronDown,
  ChevronRight,
  Clock,
  Calendar,
  Link2,
  Plus,
  FileText,
  User,
  Hash
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface WikiContentProps {
  entry: MemoryItem | null;
  relationships: any;
  sessions: any[];
  isEditing: boolean;
  editedContent: any;
  onEditedContentChange: (content: any) => void;
  onEdit: () => void;
  onSave: () => void;
  onCancel: () => void;
  collapsedSections: Set<string>;
  onToggleSection: (section: string) => void;
  loading: boolean;
  onNavigateToEntry: (id: string) => void;
}

export function WikiContent({
  entry,
  relationships,
  sessions,
  isEditing,
  editedContent,
  onEditedContentChange,
  onEdit,
  onSave,
  onCancel,
  collapsedSections,
  onToggleSection,
  loading,
  onNavigateToEntry,
}: WikiContentProps) {
  const [newTag, setNewTag] = useState('');

  useEffect(() => {
    if (isEditing && entry) {
      const interval = setInterval(() => {
        const draftKey = `wiki-draft-${entry.id}`;
        localStorage.setItem(draftKey, JSON.stringify(editedContent));
      }, 30000);

      return () => clearInterval(interval);
    }
  }, [isEditing, entry, editedContent]);

  useEffect(() => {
    if (entry && !isEditing) {
      const draftKey = `wiki-draft-${entry.id}`;
      const draft = localStorage.getItem(draftKey);
      if (draft) {
        const shouldRestore = confirm('Found unsaved changes. Would you like to restore them?');
        if (shouldRestore) {
          try {
            const parsed = JSON.parse(draft);
            onEditedContentChange(parsed);
            onEdit();
          } catch (error) {
            console.error('Failed to restore draft:', error);
          }
        } else {
          localStorage.removeItem(draftKey);
        }
      }
    }
  }, [entry]);

  const handleAddTag = () => {
    if (newTag.trim() && editedContent) {
      const tags = editedContent.tags || [];
      if (!tags.includes(newTag.trim())) {
        onEditedContentChange({
          ...editedContent,
          tags: [...tags, newTag.trim()],
        });
      }
      setNewTag('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    if (editedContent) {
      onEditedContentChange({
        ...editedContent,
        tags: editedContent.tags.filter((t: string) => t !== tagToRemove),
      });
    }
  };

  const renderContent = () => {
    if (!entry) return null;

    let content = entry.content;

    if (content && typeof content === 'object' && 'text' in content && typeof content.text === 'string') {
      content = content.text;
    }

    if (typeof content === 'string') {
      return (
        <div className="prose prose-sm max-w-none whitespace-pre-wrap text-foreground">
          {content}
        </div>
      );
    }

    if (entry.type === 'npc' || entry.forge_type === 'hero' || entry.forge_type === 'villain') {
      const npc = content;
      return (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            {npc.name && (
              <div>
                <span className="text-sm font-semibold text-muted-foreground">Name</span>
                <p className="text-foreground">{npc.name}</p>
              </div>
            )}
            {npc.race && (
              <div>
                <span className="text-sm font-semibold text-muted-foreground">Race</span>
                <p className="text-foreground">{npc.race}</p>
              </div>
            )}
            {npc.class && (
              <div>
                <span className="text-sm font-semibold text-muted-foreground">Class</span>
                <p className="text-foreground">{npc.class}</p>
              </div>
            )}
            {npc.role && (
              <div>
                <span className="text-sm font-semibold text-muted-foreground">Role</span>
                <p className="text-foreground">{npc.role}</p>
              </div>
            )}
          </div>

          {npc.voiceHook && (
            <div>
              <span className="text-sm font-semibold text-muted-foreground">Voice Hook</span>
              <p className="text-foreground mt-1">{npc.voiceHook}</p>
            </div>
          )}

          {npc.oneLineIntro && (
            <div>
              <span className="text-sm font-semibold text-muted-foreground">First Impression</span>
              <p className="text-foreground mt-1">{npc.oneLineIntro}</p>
            </div>
          )}

          {npc.secretOrLeverage && (
            <div>
              <span className="text-sm font-semibold text-muted-foreground">Secret/Leverage</span>
              <p className="text-foreground mt-1">{npc.secretOrLeverage}</p>
            </div>
          )}

          {npc.flair && (
            <div className="bg-secondary/50 rounded-lg p-3">
              <span className="text-sm font-semibold text-muted-foreground">Flair</span>
              <p className="text-foreground mt-1 italic">{npc.flair}</p>
            </div>
          )}
        </div>
      );
    }

    if (entry.type === 'monster' || entry.forge_type === 'monster') {
      const monster = content;
      return (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            {monster.name && (
              <div>
                <span className="text-sm font-semibold text-muted-foreground">Name</span>
                <p className="text-foreground">{monster.name}</p>
              </div>
            )}
            {monster.size && (
              <div>
                <span className="text-sm font-semibold text-muted-foreground">Size</span>
                <p className="text-foreground">{monster.size}</p>
              </div>
            )}
            {monster.type && (
              <div>
                <span className="text-sm font-semibold text-muted-foreground">Type</span>
                <p className="text-foreground">{monster.type}</p>
              </div>
            )}
            {monster.cr && (
              <div>
                <span className="text-sm font-semibold text-muted-foreground">CR</span>
                <p className="text-foreground">{monster.cr}</p>
              </div>
            )}
            {monster.ac && (
              <div>
                <span className="text-sm font-semibold text-muted-foreground">AC</span>
                <p className="text-foreground">{monster.ac}</p>
              </div>
            )}
            {monster.hp && (
              <div>
                <span className="text-sm font-semibold text-muted-foreground">HP</span>
                <p className="text-foreground">{monster.hp}</p>
              </div>
            )}
          </div>

          {monster.lair && (
            <div>
              <span className="text-sm font-semibold text-muted-foreground">Lair</span>
              <p className="text-foreground mt-1">{monster.lair}</p>
            </div>
          )}

          {monster.flair && (
            <div className="bg-secondary/50 rounded-lg p-3">
              <span className="text-sm font-semibold text-muted-foreground">Flair</span>
              <p className="text-foreground mt-1 italic">{monster.flair}</p>
            </div>
          )}

          {monster.loot && Array.isArray(monster.loot) && monster.loot.length > 0 && (
            <div>
              <span className="text-sm font-semibold text-muted-foreground mb-2 block">Loot</span>
              <ul className="list-disc list-inside space-y-1 text-sm">
                {monster.loot.map((item: string, i: number) => (
                  <li key={i} className="text-foreground">{item}</li>
                ))}
              </ul>
            </div>
          )}

          {monster.traits && Array.isArray(monster.traits) && monster.traits.length > 0 && (
            <div>
              <span className="text-sm font-semibold text-muted-foreground mb-2 block">Traits</span>
              <ul className="list-disc list-inside space-y-1 text-sm">
                {monster.traits.map((trait: string, i: number) => (
                  <li key={i} className="text-foreground">{trait}</li>
                ))}
              </ul>
            </div>
          )}

          {monster.speed && (
            <div>
              <span className="text-sm font-semibold text-muted-foreground">Speed</span>
              <p className="text-foreground mt-1">{monster.speed}</p>
            </div>
          )}
        </div>
      );
    }

    if (entry.type === 'item' || entry.forge_type === 'item' || entry.forge_type === 'scroll') {
      const item = content;
      return (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            {item.name && (
              <div>
                <span className="text-sm font-semibold text-muted-foreground">Name</span>
                <p className="text-foreground">{item.name}</p>
              </div>
            )}
            {item.level && (
              <div>
                <span className="text-sm font-semibold text-muted-foreground">Level</span>
                <p className="text-foreground">{item.level}</p>
              </div>
            )}
            {item.school && (
              <div>
                <span className="text-sm font-semibold text-muted-foreground">School</span>
                <p className="text-foreground">{item.school}</p>
              </div>
            )}
            {item.range && (
              <div>
                <span className="text-sm font-semibold text-muted-foreground">Range</span>
                <p className="text-foreground">{item.range}</p>
              </div>
            )}
            {item.rarity && (
              <div>
                <span className="text-sm font-semibold text-muted-foreground">Rarity</span>
                <p className="text-foreground">{item.rarity}</p>
              </div>
            )}
          </div>

          {item.flair && (
            <div className="bg-secondary/50 rounded-lg p-3">
              <span className="text-sm font-semibold text-muted-foreground">Flair</span>
              <p className="text-foreground mt-1 italic">{item.flair}</p>
            </div>
          )}

          {item.classes && Array.isArray(item.classes) && item.classes.length > 0 && (
            <div>
              <span className="text-sm font-semibold text-muted-foreground mb-2 block">Classes</span>
              <div className="flex flex-wrap gap-2">
                {item.classes.map((cls: string, i: number) => (
                  <Badge key={i} variant="secondary">{cls}</Badge>
                ))}
              </div>
            </div>
          )}

          {item.materialComponents && (
            <div>
              <span className="text-sm font-semibold text-muted-foreground">Material Components</span>
              <p className="text-foreground mt-1">{item.materialComponents}</p>
            </div>
          )}

          {item.effect && (
            <div>
              <span className="text-sm font-semibold text-muted-foreground">Effect</span>
              <p className="text-foreground mt-1 whitespace-pre-wrap">{item.effect}</p>
            </div>
          )}

          {item.description && (
            <div>
              <span className="text-sm font-semibold text-muted-foreground">Description</span>
              <p className="text-foreground mt-1 whitespace-pre-wrap">{item.description}</p>
            </div>
          )}
        </div>
      );
    }

    if (content && typeof content === 'object') {
      const hasReadableText = content.text || content.description || content.name;
      if (hasReadableText) {
        return (
          <div className="prose prose-sm max-w-none text-foreground space-y-3">
            {content.name && <p className="font-semibold">{content.name}</p>}
            {content.description && <p className="whitespace-pre-wrap">{content.description}</p>}
            {content.text && <p className="whitespace-pre-wrap">{content.text}</p>}
          </div>
        );
      }
    }

    return (
      <div className="bg-secondary/30 rounded-lg p-4">
        <pre className="text-sm whitespace-pre-wrap text-foreground overflow-x-auto">
          {JSON.stringify(content, null, 2)}
        </pre>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex-1 border-r border-border bg-background">
        <div className="p-6 space-y-6">
          <Skeleton className="h-8 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
          <Separator />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      </div>
    );
  }

  if (!entry) {
    return (
      <div className="flex-1 border-r border-border bg-background flex items-center justify-center">
        <div className="text-center space-y-2">
          <FileText className="h-12 w-12 mx-auto text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Select an entry to view details</p>
        </div>
      </div>
    );
  }

  // Only show outgoing relationships (inverse relationships are already created bidirectionally)
  const displayRelationships = relationships.outgoing || [];

  console.log('🔍 WikiContent - Displaying relationships:', {
    outgoingCount: relationships.outgoing?.length || 0,
    incomingCount: relationships.incoming?.length || 0,
    displayCount: displayRelationships.length,
  });

  return (
    <div className="flex-1 border-r border-border bg-background flex flex-col">
      <div className="p-6 border-b border-border">
        <div className="flex items-start justify-between mb-4">
          {isEditing ? (
            <div className="flex-1 space-y-3">
              <Input
                value={editedContent?.title || ''}
                onChange={(e) =>
                  onEditedContentChange({ ...editedContent, title: e.target.value })
                }
                className="text-2xl font-semibold h-auto py-2"
                placeholder="Entry title"
              />
              <div className="flex gap-2">
                <Button onClick={onSave} size="sm" className="gap-2">
                  <Save className="h-4 w-4" />
                  Save Changes
                </Button>
                <Button onClick={onCancel} size="sm" variant="outline" className="gap-2">
                  <X className="h-4 w-4" />
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <>
              <div className="flex-1">
                <h1 className="text-3xl font-bold text-foreground mb-2">{entry.title}</h1>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    <span>
                      Modified{' '}
                      {formatDistanceToNow(new Date(entry.last_edited_at || entry.created_at), {
                        addSuffix: true,
                      })}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    <span>
                      Created{' '}
                      {formatDistanceToNow(new Date(entry.created_at), { addSuffix: true })}
                    </span>
                  </div>
                </div>
              </div>
              <Button onClick={onEdit} size="sm" className="gap-2 flex-shrink-0">
                <Edit className="h-4 w-4" />
                Edit
              </Button>
            </>
          )}
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="secondary">
            {entry.forge_type === 'hero' || entry.forge_type === 'villain' ? 'NPC' : entry.type.toUpperCase()}
          </Badge>
          {isEditing ? (
            <div className="flex gap-2 flex-wrap items-center">
              {(editedContent?.tags || []).map((tag: string) => (
                <Badge key={tag} variant="outline" className="gap-1">
                  {tag}
                  <button
                    onClick={() => handleRemoveTag(tag)}
                    className="ml-1 hover:text-destructive"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
              <div className="flex gap-1">
                <Input
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddTag();
                    }
                  }}
                  placeholder="Add tag..."
                  className="h-7 w-32 text-sm"
                />
                <Button onClick={handleAddTag} size="sm" variant="outline" className="h-7 px-2">
                  <Plus className="h-3 w-3" />
                </Button>
              </div>
            </div>
          ) : (
            <>
              {entry.tags?.map((tag) => (
                <Badge key={tag} variant="outline">
                  {tag}
                </Badge>
              ))}
            </>
          )}
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-6 space-y-6">
          <Collapsible
            open={!collapsedSections.has('description')}
            onOpenChange={() => onToggleSection('description')}
          >
            <CollapsibleTrigger className="flex items-center gap-2 w-full text-left">
              <h2 className="text-xl font-semibold text-foreground">Description</h2>
              {collapsedSections.has('description') ? (
                <ChevronRight className="h-5 w-5" />
              ) : (
                <ChevronDown className="h-5 w-5" />
              )}
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-4">
              {isEditing ? (
                <Textarea
                  value={(() => {
                    const content = editedContent?.content;
                    if (typeof content === 'string') {
                      return content;
                    }
                    if (content && typeof content === 'object' && 'text' in content && typeof content.text === 'string') {
                      return content.text;
                    }
                    if (content && typeof content === 'object') {
                      return JSON.stringify(content, null, 2);
                    }
                    return '';
                  })()}
                  onChange={(e) =>
                    onEditedContentChange({ ...editedContent, content: e.target.value })
                  }
                  rows={12}
                  className="font-mono text-sm"
                />
              ) : (
                renderContent()
              )}
            </CollapsibleContent>
          </Collapsible>

          <Separator />

          {displayRelationships.length > 0 && (
            <>
              <Collapsible
                open={!collapsedSections.has('relationships')}
                onOpenChange={() => onToggleSection('relationships')}
              >
                <CollapsibleTrigger className="flex items-center gap-2 w-full text-left">
                  <h2 className="text-xl font-semibold text-foreground">
                    Relationships
                    <Badge variant="secondary" className="ml-2">
                      {displayRelationships.length}
                    </Badge>
                  </h2>
                  {collapsedSections.has('relationships') ? (
                    <ChevronRight className="h-5 w-5" />
                  ) : (
                    <ChevronDown className="h-5 w-5" />
                  )}
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-4 space-y-2">
                  {displayRelationships.map((rel: any) => {
                    if (!rel.to) return null;

                    return (
                      <button
                        key={rel.id}
                        onClick={() => onNavigateToEntry(rel.to.id)}
                        className="flex items-center gap-2 w-full p-2 rounded-lg hover:bg-accent text-left transition-colors"
                      >
                        <Link2 className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                        <div className="flex-1">
                          <div className="text-sm font-medium text-foreground">
                            {rel.to.title}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {rel.relation_type.replace(/_/g, ' ')}
                          </div>
                        </div>
                        <Badge variant="secondary" className="text-xs">
                          {rel.to.type}
                        </Badge>
                      </button>
                    );
                  })}
                </CollapsibleContent>
              </Collapsible>
              <Separator />
            </>
          )}

          <Collapsible
            open={!collapsedSections.has('dm_notes')}
            onOpenChange={() => onToggleSection('dm_notes')}
          >
            <CollapsibleTrigger className="flex items-center gap-2 w-full text-left">
              <h2 className="text-xl font-semibold text-foreground">DM Notes</h2>
              {collapsedSections.has('dm_notes') ? (
                <ChevronRight className="h-5 w-5" />
              ) : (
                <ChevronDown className="h-5 w-5" />
              )}
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-4">
              {isEditing ? (
                <Textarea
                  value={editedContent?.user_notes || ''}
                  onChange={(e) =>
                    onEditedContentChange({ ...editedContent, user_notes: e.target.value })
                  }
                  rows={6}
                  placeholder="Add private DM notes here. Only you can see these."
                  className="font-mono text-sm"
                />
              ) : entry.user_notes ? (
                <div className="prose prose-sm max-w-none whitespace-pre-wrap bg-secondary/30 p-4 rounded-lg">
                  {entry.user_notes}
                </div>
              ) : (
                <div className="text-sm text-muted-foreground italic">
                  No DM notes yet. Add private notes that only you can see.
                </div>
              )}
            </CollapsibleContent>
          </Collapsible>
        </div>
      </ScrollArea>
    </div>
  );
}
