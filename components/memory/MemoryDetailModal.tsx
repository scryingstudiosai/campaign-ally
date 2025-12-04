'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Save, X, Calendar, Clock, Link2, Plus, Sparkles } from 'lucide-react';
import { MemoryItem } from '@/types/memory';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase/client';
import { TagSelector } from './TagSelector';
import { ClickablePersonName } from '@/components/forge/ClickablePersonName';
import { ClickableInventoryItem } from '@/components/forge/ClickableInventoryItem';
import { ClickableLandmark } from '@/components/forge/ClickableLandmark';
import { ConjureEntityButton } from '@/components/memory/ConjureEntityButton';
import TavernForgeDialog from '@/components/forge/TavernForgeDialog';
import InnForgeDialog from '@/components/forge/InnForgeDialog';
import ShopForgeDialog from '@/components/forge/ShopForgeDialog';
import GuildForgeDialog from '@/components/forge/GuildForgeDialog';
import LandmarkForgeDialog from '@/components/forge/LandmarkForgeDialog';
import TownForgeDialog from '@/components/forge/TownForgeDialog';
import VillainForgeDialog from '@/components/forge/VillainForgeDialog';
import { EncounterCard } from './EncounterCard';
import { RelationsPicker, RELATION_TYPES } from './RelationsPicker';
import { ArrowRight, Trash2, ChevronDown, ChevronRight } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { EnrichedForgeContent } from '@/components/forge/EnrichedForgeContent';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

interface MemoryDetailModalProps {
  item: MemoryItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave?: () => void;
  onTextSelection?: (e: React.MouseEvent) => void;
}

interface Relation {
  id: string;
  relation_type: string;
  to_id?: string;
  from_id?: string;
  created_at: string;
  to?: { id: string; title: string; type: string; forge_type?: string };
  from?: { id: string; title: string; type: string; forge_type?: string };
}

const MEMORY_TYPES = [
  { value: 'npc', label: 'NPC' },
  { value: 'monster', label: 'Monster' },
  { value: 'location', label: 'Location' },
  { value: 'faction', label: 'Faction' },
  { value: 'item', label: 'Item' },
  { value: 'shop', label: 'Shop' },
  { value: 'town', label: 'Town' },
  { value: 'hook', label: 'Hook' },
  { value: 'tavern', label: 'Tavern' },
];

export function MemoryDetailModal({ item, open, onOpenChange, onSave, onTextSelection }: MemoryDetailModalProps) {
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showRelationsPicker, setShowRelationsPicker] = useState(false);
  const [showCustomItemDialog, setShowCustomItemDialog] = useState(false);
  const [customItemPrompt, setCustomItemPrompt] = useState('');
  const [showCursePreview, setShowCursePreview] = useState(false);
  const [previewedCurse, setPreviewedCurse] = useState('');
  const [relations, setRelations] = useState<{ outgoing: Relation[]; incoming: Relation[] }>({ outgoing: [], incoming: [] });
  const [loadingRelations, setLoadingRelations] = useState(false);
  const [fullItem, setFullItem] = useState<MemoryItem | null>(null);
  const [loadingItem, setLoadingItem] = useState(false);

  const [openLandmarkForge, setOpenLandmarkForge] = useState<string | null>(null);
  const [landmarkName, setLandmarkName] = useState('');
  const [openTownForge, setOpenTownForge] = useState(false);
  const [townName, setTownName] = useState('');
  const [townSourceContext, setTownSourceContext] = useState<{
    description?: string;
    sourceMemoryId?: string;
    contextKey?: string;
    parentName?: string;
  }>({});
  const [openVillainForge, setOpenVillainForge] = useState(false);
  const [villainName, setVillainName] = useState('');

  const [statBlockExpanded, setStatBlockExpanded] = useState(false);
  const [showStatBlockForge, setShowStatBlockForge] = useState(false);
  const [showRemoveStatBlockDialog, setShowRemoveStatBlockDialog] = useState(false);
  const [isGeneratingStatBlock, setIsGeneratingStatBlock] = useState(false);

  const [editedTitle, setEditedTitle] = useState('');
  const [editedUserNotes, setEditedUserNotes] = useState('');
  const [editedTags, setEditedTags] = useState<string[]>([]);
  const [editedType, setEditedType] = useState('');
  const [editedTextContent, setEditedTextContent] = useState('');
  const [editedContent, setEditedContent] = useState<any>(null);

  useEffect(() => {
    if (item && open) {
      loadFullItem();
    }
  }, [item, open]);

  useEffect(() => {
    if (fullItem) {
      setEditedTitle(fullItem.title);
      setEditedUserNotes(fullItem.user_notes || '');
      setEditedTags(fullItem.tags || []);
      setEditedType(fullItem.type);
      setEditedTextContent(fullItem.text_content || '');
      setEditedContent(fullItem.content ? { ...fullItem.content } : null);
      setIsEditing(false);
      loadRelations(fullItem.id);
    }
  }, [fullItem]);

  const formatRelationType = (relationType: string): string => {
    return relationType
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const loadFullItem = async () => {
    if (!item) return;

    setLoadingItem(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch(`/api/memory/entries/${item.id}`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      if (response.ok) {
        const result = await response.json();
        setFullItem(result.data);
      }
    } catch (error) {
      console.error('Error loading full item:', error);
      toast({
        title: 'Error',
        description: 'Failed to load entry details',
        variant: 'destructive',
      });
    } finally {
      setLoadingItem(false);
    }
  };

  const loadRelations = async (memoryId?: string) => {
    const targetId = memoryId || fullItem?.id || item?.id;
    if (!targetId) return;

    setLoadingRelations(true);
    try {
      let session;
      try {
        const result = await supabase.auth.getSession();
        session = result.data.session;
      } catch (sessionError) {
        console.error('Error getting session:', sessionError);
        return;
      }

      if (!session) return;

      const response = await fetch(`/api/relations?memoryId=${targetId}`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setRelations(data);
      }
    } catch (error) {
      console.error('Error loading relations:', error);
    } finally {
      setLoadingRelations(false);
    }
  };

  const handleNavigateToEntry = async (entryId: string) => {
    try {
      setLoadingItem(true);

      let session;
      try {
        const result = await supabase.auth.getSession();
        session = result.data.session;
      } catch (sessionError) {
        console.error('Error getting session:', sessionError);
        return;
      }

      if (!session) return;

      // Fetch the full entry data
      const response = await fetch(`/api/memory/entries/${entryId}`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      if (response.ok) {
        const result = await response.json();
        // Setting fullItem will trigger the useEffect which loads everything
        setFullItem(result.data);
      }
    } catch (error) {
      console.error('Error navigating to entry:', error);
      toast({
        title: 'Error',
        description: 'Failed to load entry',
        variant: 'destructive',
      });
    } finally {
      setLoadingItem(false);
    }
  };

  const handleGenerateStatBlock = async () => {
    if (!fullItem) return;

    try {
      setIsGeneratingStatBlock(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast({
          title: 'Error',
          description: 'You must be logged in',
          variant: 'destructive',
        });
        return;
      }

      // Generate stat block via API
      const statBlockResponse = await fetch('/api/ai/forge/stat-block', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          campaignId: fullItem.campaign_id,
          name: fullItem.title,
          tier: fullItem.content?.cr ? (parseInt(fullItem.content.cr) <= 2 ? 1 : parseInt(fullItem.content.cr) >= 8 ? 3 : 2) : 2,
          smartDefaults: true,
        }),
      });

      if (!statBlockResponse.ok) {
        const errorData = await statBlockResponse.json();
        throw new Error(errorData.error || 'Failed to generate stat block');
      }

      const statBlockResult = await statBlockResponse.json();
      if (!statBlockResult.success || !statBlockResult.data) {
        throw new Error('Failed to generate stat block');
      }

      const monsterData = statBlockResult.data;

      // Save stat block to villain
      const currentContent = fullItem.content;
      const updatedContent = {
        ...currentContent,
        statBlock: monsterData,
      };

      const updateResponse = await fetch(`/api/memory/entries/${fullItem.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          content: updatedContent,
        }),
      });

      if (!updateResponse.ok) {
        throw new Error('Failed to update stat block');
      }

      const result = await updateResponse.json();
      setFullItem(result.data);
      setShowStatBlockForge(false);

      toast({
        title: 'Success',
        description: 'Stat block added successfully',
      });
    } catch (error) {
      console.error('Error generating stat block:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to generate stat block',
        variant: 'destructive',
      });
    } finally {
      setIsGeneratingStatBlock(false);
    }
  };

  const handleRemoveStatBlock = async () => {
    if (!fullItem) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast({
          title: 'Error',
          description: 'You must be logged in',
          variant: 'destructive',
        });
        return;
      }

      const currentContent = fullItem.content;
      const { statBlock, ...contentWithoutStatBlock } = currentContent;

      const response = await fetch(`/api/memory/entries/${fullItem.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          content: contentWithoutStatBlock,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to remove stat block');
      }

      const result = await response.json();
      setFullItem(result.data);
      setShowRemoveStatBlockDialog(false);

      toast({
        title: 'Success',
        description: 'Stat block removed',
      });
    } catch (error) {
      console.error('Error removing stat block:', error);
      toast({
        title: 'Error',
        description: 'Failed to remove stat block',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteRelation = async (relationId: string) => {
    try {
      let session;
      try {
        const result = await supabase.auth.getSession();
        session = result.data.session;
      } catch (sessionError) {
        console.error('Error getting session for delete:', sessionError);
        toast({
          title: 'Error',
          description: 'Failed to get authentication session',
          variant: 'destructive',
        });
        return;
      }

      if (!session) {
        toast({
          title: 'Error',
          description: 'You must be logged in to delete relations',
          variant: 'destructive',
        });
        return;
      }

      console.log('🗑️ DELETE relation called, id:', relationId);

      const response = await fetch(`/api/relations/${relationId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
      });

      // Parse response body
      let result;
      try {
        result = await response.json();
      } catch (jsonError) {
        console.error('Failed to parse response JSON:', jsonError);
        result = {};
      }

      console.log('Delete response:', { status: response.status, ok: response.ok, result });

      // Check if delete succeeded (either response.ok OR result.success)
      if (response.ok || result.success) {
        console.log('✅ Delete successful');
        toast({
          title: 'Relation deleted',
          description: result.message || 'Link removed successfully',
        });

        // Refresh relations
        await loadRelations();
      } else {
        console.error('❌ Delete failed:', response.status, result);
        const errorMessage = result.error || result.details || 'Failed to delete';
        throw new Error(errorMessage);
      }
    } catch (error) {
      console.error('Error deleting relation:', error);

      // Even if there's an error, try refreshing - it might have actually worked
      try {
        await loadRelations();
      } catch (refreshError) {
        console.error('Failed to refresh relations:', refreshError);
      }

      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to delete relation',
        variant: 'destructive',
      });
    }
  };

  if (!item) return null;

  const typeColors: Record<string, string> = {
    npc: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
    monster: 'bg-red-500/20 text-red-300 border-red-500/30',
    tavern: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
    hook: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
    location: 'bg-green-500/20 text-green-300 border-green-500/30',
    item: 'bg-orange-500/20 text-orange-300 border-orange-500/30',
    faction: 'bg-pink-500/20 text-pink-300 border-pink-500/30',
    shop: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
    town: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
  };

  const updateContentField = (fieldKey: string, value: string) => {
    setEditedContent((prev: any) => ({
      ...prev,
      [fieldKey]: value
    }));
  };

  const renderEditableStructuredContent = () => {
    if (!editedContent || typeof editedContent !== 'object') {
      return null;
    }

    const forgeType = fullItem?.forge_type;
    const type = fullItem?.type;

    // Hero fields (most detailed)
    if (forgeType === 'hero') {
      return (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Name</Label>
              <Input
                value={editedContent.name || ''}
                onChange={(e) => updateContentField('name', e.target.value)}
                placeholder="Character name"
              />
            </div>
            <div>
              <Label>Role</Label>
              <Input
                value={editedContent.role || ''}
                onChange={(e) => updateContentField('role', e.target.value)}
                placeholder="e.g., Warrior, Mage"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label>Race</Label>
              <Input
                value={editedContent.race || ''}
                onChange={(e) => updateContentField('race', e.target.value)}
                placeholder="e.g., Human, Elf"
              />
            </div>
            <div>
              <Label>Class</Label>
              <Input
                value={editedContent.class || ''}
                onChange={(e) => updateContentField('class', e.target.value)}
                placeholder="e.g., Fighter, Wizard"
              />
            </div>
            <div>
              <Label>Level</Label>
              <Input
                type="number"
                value={editedContent.level || ''}
                onChange={(e) => updateContentField('level', e.target.value)}
                placeholder="Level"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Alignment</Label>
              <Input
                value={editedContent.alignment || ''}
                onChange={(e) => updateContentField('alignment', e.target.value)}
                placeholder="e.g., Lawful Good, Chaotic Neutral"
              />
            </div>
            <div>
              <Label>Signature Item</Label>
              <Input
                value={editedContent.signatureItem || ''}
                onChange={(e) => updateContentField('signatureItem', e.target.value)}
                placeholder="Notable equipment or possession"
              />
            </div>
          </div>

          <div>
            <Label>Voice Hook</Label>
            <Textarea
              value={editedContent.voiceHook || ''}
              onChange={(e) => updateContentField('voiceHook', e.target.value)}
              placeholder="How they speak or a memorable phrase"
              rows={2}
            />
          </div>

          <div>
            <Label>First Impression</Label>
            <Textarea
              value={editedContent.oneLineIntro || ''}
              onChange={(e) => updateContentField('oneLineIntro', e.target.value)}
              placeholder="What players notice first"
              rows={2}
            />
          </div>

          <div>
            <Label>Motivation</Label>
            <Textarea
              value={editedContent.motivation || ''}
              onChange={(e) => updateContentField('motivation', e.target.value)}
              placeholder="What drives them"
              rows={2}
            />
          </div>

          <div>
            <Label>Flaw</Label>
            <Textarea
              value={editedContent.flaw || ''}
              onChange={(e) => updateContentField('flaw', e.target.value)}
              placeholder="Their weakness or character flaw"
              rows={2}
            />
          </div>

          <div>
            <Label>Flair</Label>
            <Textarea
              value={editedContent.flair || ''}
              onChange={(e) => updateContentField('flair', e.target.value)}
              placeholder="Additional atmospheric description"
              rows={3}
            />
          </div>

          <div>
            <Label>Bonds (one per line)</Label>
            <Textarea
              value={Array.isArray(editedContent.bonds) ? editedContent.bonds.join('\n') : (editedContent.bonds || '')}
              onChange={(e) => {
                const bonds = e.target.value.split('\n').filter(b => b.trim());
                setEditedContent((prev: any) => ({ ...prev, bonds }));
              }}
              placeholder="Enter bonds, one per line"
              rows={3}
            />
          </div>

          <div>
            <Label>Secrets (one per line)</Label>
            <Textarea
              value={Array.isArray(editedContent.secrets) ? editedContent.secrets.join('\n') : (editedContent.secrets || '')}
              onChange={(e) => {
                const secrets = e.target.value.split('\n').filter(s => s.trim());
                setEditedContent((prev: any) => ({ ...prev, secrets }));
              }}
              placeholder="Enter secrets, one per line"
              rows={3}
            />
          </div>
        </div>
      );
    }

    // NPC/Villain fields
    if ((type === 'npc' && forgeType !== 'backstory') || forgeType === 'villain') {
      return (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Name</Label>
              <Input
                value={editedContent.name || ''}
                onChange={(e) => updateContentField('name', e.target.value)}
                placeholder="Character name"
              />
            </div>
            <div>
              <Label>Role</Label>
              <Input
                value={editedContent.role || ''}
                onChange={(e) => updateContentField('role', e.target.value)}
                placeholder="e.g., Blacksmith, Guard"
              />
            </div>
          </div>

          {(editedContent.race !== undefined || editedContent.class !== undefined || editedContent.level !== undefined) && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {editedContent.race !== undefined && (
                <div>
                  <Label>Race</Label>
                  <Input
                    value={editedContent.race || ''}
                    onChange={(e) => updateContentField('race', e.target.value)}
                    placeholder="e.g., Human, Elf"
                  />
                </div>
              )}
              {editedContent.class !== undefined && (
                <div>
                  <Label>Class</Label>
                  <Input
                    value={editedContent.class || ''}
                    onChange={(e) => updateContentField('class', e.target.value)}
                    placeholder="e.g., Fighter, Wizard"
                  />
                </div>
              )}
              {editedContent.level !== undefined && (
                <div>
                  <Label>Level</Label>
                  <Input
                    type="number"
                    value={editedContent.level || ''}
                    onChange={(e) => updateContentField('level', e.target.value)}
                    placeholder="Level"
                  />
                </div>
              )}
            </div>
          )}

          <div>
            <Label>Voice Hook</Label>
            <Textarea
              value={editedContent.voiceHook || ''}
              onChange={(e) => updateContentField('voiceHook', e.target.value)}
              placeholder="How they speak or a memorable phrase"
              rows={2}
            />
          </div>

          <div>
            <Label>Secret/Leverage</Label>
            <Textarea
              value={editedContent.secretOrLeverage || ''}
              onChange={(e) => updateContentField('secretOrLeverage', e.target.value)}
              placeholder="A secret they keep or leverage against them"
              rows={2}
            />
          </div>

          <div>
            <Label>First Impression</Label>
            <Textarea
              value={editedContent.oneLineIntro || ''}
              onChange={(e) => updateContentField('oneLineIntro', e.target.value)}
              placeholder="What players notice first"
              rows={2}
            />
          </div>

          {editedContent.flair !== undefined && (
            <div>
              <Label>Flair</Label>
              <Textarea
                value={editedContent.flair || ''}
                onChange={(e) => updateContentField('flair', e.target.value)}
                placeholder="Additional atmospheric description"
                rows={2}
              />
            </div>
          )}

          {forgeType === 'villain' && (
            <>
              {editedContent.goal !== undefined && (
                <div>
                  <Label>Goal</Label>
                  <Textarea
                    value={editedContent.goal || ''}
                    onChange={(e) => updateContentField('goal', e.target.value)}
                    placeholder="What they're trying to achieve"
                    rows={2}
                  />
                </div>
              )}
              {editedContent.method !== undefined && (
                <div>
                  <Label>Method</Label>
                  <Textarea
                    value={editedContent.method || ''}
                    onChange={(e) => updateContentField('method', e.target.value)}
                    placeholder="How they operate"
                    rows={2}
                  />
                </div>
              )}
              {editedContent.weakness !== undefined && (
                <div>
                  <Label>Weakness</Label>
                  <Textarea
                    value={editedContent.weakness || ''}
                    onChange={(e) => updateContentField('weakness', e.target.value)}
                    placeholder="Their vulnerability"
                    rows={2}
                  />
                </div>
              )}
            </>
          )}
        </div>
      );
    }

    // Tavern/Inn fields
    if (type === 'tavern' || forgeType === 'inn' || forgeType === 'tavern') {
      return (
        <div className="space-y-4">
          <div>
            <Label>Name</Label>
            <Input
              value={editedContent.name || ''}
              onChange={(e) => updateContentField('name', e.target.value)}
              placeholder="Tavern name"
            />
          </div>
          <div>
            <Label>Owner</Label>
            <Input
              value={editedContent.owner || ''}
              onChange={(e) => updateContentField('owner', e.target.value)}
              placeholder="Owner's name"
            />
          </div>
          <div>
            <Label>Signature Detail</Label>
            <Textarea
              value={editedContent.signatureDetail || ''}
              onChange={(e) => updateContentField('signatureDetail', e.target.value)}
              placeholder="Unique feature or atmosphere"
              rows={2}
            />
          </div>
          <div>
            <Label>Menu Item</Label>
            <Input
              value={editedContent.menuItem || ''}
              onChange={(e) => updateContentField('menuItem', e.target.value)}
              placeholder="Signature food or drink"
            />
          </div>
          <div>
            <Label>Hook</Label>
            <Textarea
              value={editedContent.oneHook || ''}
              onChange={(e) => updateContentField('oneHook', e.target.value)}
              placeholder="Plot hook or interesting event"
              rows={2}
            />
          </div>
        </div>
      );
    }

    // Nation fields
    if (forgeType === 'nation') {
      const ideology = typeof editedContent.ideology === 'object' ? editedContent.ideology : {};
      const territory = typeof editedContent.territory === 'object' ? editedContent.territory : {};
      const resources = typeof editedContent.resources === 'object' ? editedContent.resources : {};
      const culture = typeof editedContent.culture === 'object' ? editedContent.culture : {};
      const conflicts = typeof editedContent.conflicts === 'object' ? editedContent.conflicts : {};

      return (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Name</Label>
              <Input
                value={editedContent.name || ''}
                onChange={(e) => updateContentField('name', e.target.value)}
                placeholder="Nation name"
              />
            </div>
            <div>
              <Label>Type</Label>
              <Input
                value={editedContent.type || ''}
                onChange={(e) => updateContentField('type', e.target.value)}
                placeholder="e.g., Kingdom, Empire"
              />
            </div>
          </div>
          <div>
            <Label>Population</Label>
            <Input
              value={editedContent.population || ''}
              onChange={(e) => updateContentField('population', e.target.value)}
              placeholder="Population size"
            />
          </div>
          <div>
            <Label>Description / Flair</Label>
            <Textarea
              value={editedContent.flair || ''}
              onChange={(e) => updateContentField('flair', e.target.value)}
              placeholder="Overall description"
              rows={3}
            />
          </div>

          <Separator className="my-4" />
          <div className="text-sm font-semibold text-primary">Ideology</div>
          <div className="space-y-3 pl-4 border-l-2 border-border">
            <div>
              <Label className="text-xs">Core Beliefs</Label>
              <Textarea
                value={ideology.core || ''}
                onChange={(e) => {
                  const updated = { ...ideology, core: e.target.value };
                  updateContentField('ideology', updated);
                }}
                placeholder="Core ideology"
                rows={2}
              />
            </div>
            <div>
              <Label className="text-xs">Practices</Label>
              <Textarea
                value={ideology.practices || ''}
                onChange={(e) => {
                  const updated = { ...ideology, practices: e.target.value };
                  updateContentField('ideology', updated);
                }}
                placeholder="How ideology is practiced"
                rows={2}
              />
            </div>
            <div>
              <Label className="text-xs">Tension</Label>
              <Textarea
                value={ideology.tension || ''}
                onChange={(e) => {
                  const updated = { ...ideology, tension: e.target.value };
                  updateContentField('ideology', updated);
                }}
                placeholder="Ideological tensions"
                rows={2}
              />
            </div>
          </div>

          <Separator className="my-4" />
          <div className="text-sm font-semibold text-primary">Territory</div>
          <div className="space-y-3 pl-4 border-l-2 border-border">
            <div>
              <Label className="text-xs">Lands</Label>
              <Textarea
                value={territory.lands || ''}
                onChange={(e) => {
                  const updated = { ...territory, lands: e.target.value };
                  updateContentField('territory', updated);
                }}
                placeholder="Lands controlled"
                rows={2}
              />
            </div>
            <div>
              <Label className="text-xs">Capital</Label>
              <Input
                value={territory.capital || ''}
                onChange={(e) => {
                  const updated = { ...territory, capital: e.target.value };
                  updateContentField('territory', updated);
                }}
                placeholder="Capital city"
              />
            </div>
            <div>
              <Label className="text-xs">Strategic Locations</Label>
              <Textarea
                value={territory.strategic || ''}
                onChange={(e) => {
                  const updated = { ...territory, strategic: e.target.value };
                  updateContentField('territory', updated);
                }}
                placeholder="Strategic importance"
                rows={2}
              />
            </div>
          </div>

          <Separator className="my-4" />
          <div className="text-sm font-semibold text-primary">Resources</div>
          <div className="space-y-3 pl-4 border-l-2 border-border">
            <div>
              <Label className="text-xs">Economic Resources (comma-separated)</Label>
              <Input
                value={Array.isArray(resources.economic) ? resources.economic.join(', ') : (resources.economic || '')}
                onChange={(e) => {
                  const economic = e.target.value.split(',').map(s => s.trim()).filter(s => s);
                  const updated = { ...resources, economic };
                  updateContentField('resources', updated);
                }}
                placeholder="e.g., Gold mines, Trade routes"
              />
            </div>
            <div>
              <Label className="text-xs">Magical Resources</Label>
              <Textarea
                value={resources.magical || ''}
                onChange={(e) => {
                  const updated = { ...resources, magical: e.target.value };
                  updateContentField('resources', updated);
                }}
                placeholder="Magical resources"
                rows={2}
              />
            </div>
            <div>
              <Label className="text-xs">Military Strength</Label>
              <Textarea
                value={resources.military || ''}
                onChange={(e) => {
                  const updated = { ...resources, military: e.target.value };
                  updateContentField('resources', updated);
                }}
                placeholder="Military capabilities"
                rows={2}
              />
            </div>
          </div>

          <Separator className="my-4" />
          <div className="text-sm font-semibold text-primary">Culture</div>
          <div className="space-y-3 pl-4 border-l-2 border-border">
            <div>
              <Label className="text-xs">Traditions</Label>
              <Textarea
                value={culture.traditions || ''}
                onChange={(e) => {
                  const updated = { ...culture, traditions: e.target.value };
                  updateContentField('culture', updated);
                }}
                placeholder="Cultural traditions"
                rows={2}
              />
            </div>
            <div>
              <Label className="text-xs">Reputation</Label>
              <Textarea
                value={culture.reputation || ''}
                onChange={(e) => {
                  const updated = { ...culture, reputation: e.target.value };
                  updateContentField('culture', updated);
                }}
                placeholder="How others see them"
                rows={2}
              />
            </div>
          </div>

          <Separator className="my-4" />
          <div className="text-sm font-semibold text-primary">Conflicts</div>
          <div className="space-y-3 pl-4 border-l-2 border-border">
            <div>
              <Label className="text-xs">Internal Conflicts</Label>
              <Textarea
                value={conflicts.internal || ''}
                onChange={(e) => {
                  const updated = { ...conflicts, internal: e.target.value };
                  updateContentField('conflicts', updated);
                }}
                placeholder="Internal strife"
                rows={2}
              />
            </div>
            <div>
              <Label className="text-xs">External Conflicts</Label>
              <Textarea
                value={conflicts.external || ''}
                onChange={(e) => {
                  const updated = { ...conflicts, external: e.target.value };
                  updateContentField('conflicts', updated);
                }}
                placeholder="External threats"
                rows={2}
              />
            </div>
          </div>

          <Separator className="my-4" />
          <div>
            <Label>Adventure Hooks (one per line)</Label>
            <Textarea
              value={Array.isArray(editedContent.hooks) ? editedContent.hooks.join('\n') : (editedContent.hooks || '')}
              onChange={(e) => {
                const hooks = e.target.value.split('\n').filter(h => h.trim());
                setEditedContent((prev: any) => ({ ...prev, hooks }));
              }}
              placeholder="Enter adventure hooks, one per line"
              rows={3}
            />
          </div>
          <div>
            <Label>Secrets</Label>
            <Textarea
              value={editedContent.secrets || ''}
              onChange={(e) => updateContentField('secrets', e.target.value)}
              placeholder="Hidden secrets about the nation"
              rows={2}
            />
          </div>
        </div>
      );
    }

    // Guild fields
    if (forgeType === 'guild') {
      return (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Name</Label>
              <Input
                value={editedContent.name || ''}
                onChange={(e) => updateContentField('name', e.target.value)}
                placeholder="Guild name"
              />
            </div>
            <div>
              <Label>Specialty</Label>
              <Input
                value={editedContent.specialty || ''}
                onChange={(e) => updateContentField('specialty', e.target.value)}
                placeholder="e.g., Mercenaries, Craftsmen"
              />
            </div>
          </div>
          <div>
            <Label>Flair / Description</Label>
            <Textarea
              value={editedContent.flair || ''}
              onChange={(e) => updateContentField('flair', e.target.value)}
              placeholder="Overall description"
              rows={2}
            />
          </div>
          <div>
            <Label>Motto</Label>
            <Input
              value={editedContent.motto || ''}
              onChange={(e) => updateContentField('motto', e.target.value)}
              placeholder="Guild motto or saying"
            />
          </div>

          <Separator className="my-4" />
          <div className="text-sm font-semibold text-primary">Headquarters</div>
          <div className="space-y-3 pl-4 border-l-2 border-border">
            <div>
              <Label className="text-xs">Name</Label>
              <Input
                value={editedContent.headquarters?.name || ''}
                onChange={(e) => {
                  const updated = { ...(editedContent.headquarters || {}), name: e.target.value };
                  updateContentField('headquarters', updated);
                }}
                placeholder="Headquarters name"
              />
            </div>
            <div>
              <Label className="text-xs">Location</Label>
              <Input
                value={editedContent.headquarters?.location || ''}
                onChange={(e) => {
                  const updated = { ...(editedContent.headquarters || {}), location: e.target.value };
                  updateContentField('headquarters', updated);
                }}
                placeholder="Where it's located"
              />
            </div>
            <div>
              <Label className="text-xs">Description</Label>
              <Textarea
                value={editedContent.headquarters?.description || ''}
                onChange={(e) => {
                  const updated = { ...(editedContent.headquarters || {}), description: e.target.value };
                  updateContentField('headquarters', updated);
                }}
                placeholder="Description of the headquarters"
                rows={2}
              />
            </div>
          </div>

          <Separator className="my-4" />
          <div className="text-sm font-semibold text-primary">Leadership</div>
          <div className="space-y-3 pl-4 border-l-2 border-border">
            <div>
              <Label className="text-xs">Structure</Label>
              <Textarea
                value={editedContent.leadership?.structure || ''}
                onChange={(e) => {
                  const updated = { ...(editedContent.leadership || {}), structure: e.target.value };
                  updateContentField('leadership', updated);
                }}
                placeholder="Leadership structure"
                rows={2}
              />
            </div>
          </div>

          <Separator className="my-4" />
          <div className="text-sm font-semibold text-primary">Membership</div>
          <div className="space-y-3 pl-4 border-l-2 border-border">
            <div>
              <Label className="text-xs">Size</Label>
              <Input
                value={editedContent.membership?.size || ''}
                onChange={(e) => {
                  const updated = { ...(editedContent.membership || {}), size: e.target.value };
                  updateContentField('membership', updated);
                }}
                placeholder="e.g., 200 members"
              />
            </div>
            <div>
              <Label className="text-xs">Recruitment</Label>
              <Textarea
                value={editedContent.membership?.recruitment || ''}
                onChange={(e) => {
                  const updated = { ...(editedContent.membership || {}), recruitment: e.target.value };
                  updateContentField('membership', updated);
                }}
                placeholder="How they recruit"
                rows={2}
              />
            </div>
            <div>
              <Label className="text-xs">Ranks (comma-separated)</Label>
              <Input
                value={Array.isArray(editedContent.membership?.ranks) ? editedContent.membership.ranks.join(', ') : (editedContent.membership?.ranks || '')}
                onChange={(e) => {
                  const ranks = e.target.value.split(',').map(s => s.trim()).filter(s => s);
                  const updated = { ...(editedContent.membership || {}), ranks };
                  updateContentField('membership', updated);
                }}
                placeholder="e.g., Initiate, Journeyman, Master"
              />
            </div>
            <div>
              <Label className="text-xs">Initiation</Label>
              <Textarea
                value={editedContent.membership?.initiation || ''}
                onChange={(e) => {
                  const updated = { ...(editedContent.membership || {}), initiation: e.target.value };
                  updateContentField('membership', updated);
                }}
                placeholder="Initiation process"
                rows={2}
              />
            </div>
          </div>

          <Separator className="my-4" />
          <div>
            <Label>Services Offered (one per line)</Label>
            <Textarea
              value={Array.isArray(editedContent.services) ? editedContent.services.join('\n') : (editedContent.services || '')}
              onChange={(e) => {
                const services = e.target.value.split('\n').filter(s => s.trim());
                setEditedContent((prev: any) => ({ ...prev, services }));
              }}
              placeholder="Enter services, one per line"
              rows={3}
            />
          </div>

          <Separator className="my-4" />
          <div className="text-sm font-semibold text-primary">Resources</div>
          <div className="space-y-3 pl-4 border-l-2 border-border">
            <div>
              <Label className="text-xs">Wealth</Label>
              <Textarea
                value={editedContent.resources?.wealth || ''}
                onChange={(e) => {
                  const updated = { ...(editedContent.resources || {}), wealth: e.target.value };
                  updateContentField('resources', updated);
                }}
                placeholder="Financial resources"
                rows={2}
              />
            </div>
            <div>
              <Label className="text-xs">Connections</Label>
              <Textarea
                value={editedContent.resources?.connections || ''}
                onChange={(e) => {
                  const updated = { ...(editedContent.resources || {}), connections: e.target.value };
                  updateContentField('resources', updated);
                }}
                placeholder="Important connections"
                rows={2}
              />
            </div>
            <div>
              <Label className="text-xs">Assets (comma-separated)</Label>
              <Input
                value={Array.isArray(editedContent.resources?.assets) ? editedContent.resources.assets.join(', ') : (editedContent.resources?.assets || '')}
                onChange={(e) => {
                  const assets = e.target.value.split(',').map(s => s.trim()).filter(s => s);
                  const updated = { ...(editedContent.resources || {}), assets };
                  updateContentField('resources', updated);
                }}
                placeholder="e.g., Ships, Warehouses, Trade routes"
              />
            </div>
          </div>

          <Separator className="my-4" />
          <div className="text-sm font-semibold text-primary">Culture</div>
          <div className="space-y-3 pl-4 border-l-2 border-border">
            <div>
              <Label className="text-xs">Traditions</Label>
              <Textarea
                value={editedContent.culture?.traditions || ''}
                onChange={(e) => {
                  const updated = { ...(editedContent.culture || {}), traditions: e.target.value };
                  updateContentField('culture', updated);
                }}
                placeholder="Guild traditions"
                rows={2}
              />
            </div>
            <div>
              <Label className="text-xs">Code of Conduct</Label>
              <Textarea
                value={editedContent.culture?.code || ''}
                onChange={(e) => {
                  const updated = { ...(editedContent.culture || {}), code: e.target.value };
                  updateContentField('culture', updated);
                }}
                placeholder="Code of conduct"
                rows={2}
              />
            </div>
            <div>
              <Label className="text-xs">Symbols</Label>
              <Textarea
                value={editedContent.culture?.symbols || ''}
                onChange={(e) => {
                  const updated = { ...(editedContent.culture || {}), symbols: e.target.value };
                  updateContentField('culture', updated);
                }}
                placeholder="Guild symbols"
                rows={2}
              />
            </div>
          </div>

          <Separator className="my-4" />
          <div>
            <Label>Reputation</Label>
            <Textarea
              value={editedContent.reputation || ''}
              onChange={(e) => updateContentField('reputation', e.target.value)}
              placeholder="Guild reputation"
              rows={2}
            />
          </div>

          <Separator className="my-4" />
          <div className="text-sm font-semibold text-primary">Conflicts</div>
          <div className="space-y-3 pl-4 border-l-2 border-border">
            <div>
              <Label className="text-xs">Internal Conflicts</Label>
              <Textarea
                value={editedContent.conflicts?.internal || ''}
                onChange={(e) => {
                  const updated = { ...(editedContent.conflicts || {}), internal: e.target.value };
                  updateContentField('conflicts', updated);
                }}
                placeholder="Internal strife"
                rows={2}
              />
            </div>
            <div>
              <Label className="text-xs">External Conflicts</Label>
              <Textarea
                value={editedContent.conflicts?.external || ''}
                onChange={(e) => {
                  const updated = { ...(editedContent.conflicts || {}), external: e.target.value };
                  updateContentField('conflicts', updated);
                }}
                placeholder="External threats"
                rows={2}
              />
            </div>
          </div>

          <Separator className="my-4" />
          <div>
            <Label>Adventure Hooks (one per line)</Label>
            <Textarea
              value={Array.isArray(editedContent.hooks) ? editedContent.hooks.join('\n') : (editedContent.hooks || '')}
              onChange={(e) => {
                const hooks = e.target.value.split('\n').filter(h => h.trim());
                setEditedContent((prev: any) => ({ ...prev, hooks }));
              }}
              placeholder="Enter adventure hooks, one per line"
              rows={3}
            />
          </div>
          <div>
            <Label>Secrets</Label>
            <Textarea
              value={editedContent.secrets || ''}
              onChange={(e) => updateContentField('secrets', e.target.value)}
              placeholder="Hidden secrets about the guild"
              rows={2}
            />
          </div>
        </div>
      );
    }

    // Monster fields
    if (type === 'monster' || forgeType === 'monster') {
      return (
        <div className="space-y-4">
          <div>
            <Label>Name</Label>
            <Input
              value={editedContent.name || ''}
              onChange={(e) => updateContentField('name', e.target.value)}
              placeholder="Monster name"
            />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label>CR</Label>
              <Input
                value={editedContent.cr || ''}
                onChange={(e) => updateContentField('cr', e.target.value)}
                placeholder="Challenge Rating"
              />
            </div>
            <div>
              <Label>HP</Label>
              <Input
                value={editedContent.hp || ''}
                onChange={(e) => updateContentField('hp', e.target.value)}
                placeholder="Hit Points"
              />
            </div>
            <div>
              <Label>AC</Label>
              <Input
                value={editedContent.ac || ''}
                onChange={(e) => updateContentField('ac', e.target.value)}
                placeholder="Armor Class"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Size</Label>
              <Input
                value={editedContent.size || ''}
                onChange={(e) => updateContentField('size', e.target.value)}
                placeholder="e.g., Medium, Large"
              />
            </div>
            <div>
              <Label>Type</Label>
              <Input
                value={editedContent.type || ''}
                onChange={(e) => updateContentField('type', e.target.value)}
                placeholder="e.g., Beast, Undead"
              />
            </div>
          </div>
          <div>
            <Label>Speed</Label>
            <Input
              value={editedContent.speed || ''}
              onChange={(e) => updateContentField('speed', e.target.value)}
              placeholder="e.g., 30 ft."
            />
          </div>

          <Separator className="my-4" />
          <div className="text-sm font-semibold text-primary">Ability Scores</div>
          <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
            <div>
              <Label className="text-xs">STR</Label>
              <Input
                type="number"
                value={editedContent.abilities?.str || ''}
                onChange={(e) => {
                  const abilities = { ...(editedContent.abilities || {}), str: parseInt(e.target.value) || 10 };
                  updateContentField('abilities', abilities);
                }}
                placeholder="10"
              />
            </div>
            <div>
              <Label className="text-xs">DEX</Label>
              <Input
                type="number"
                value={editedContent.abilities?.dex || ''}
                onChange={(e) => {
                  const abilities = { ...(editedContent.abilities || {}), dex: parseInt(e.target.value) || 10 };
                  updateContentField('abilities', abilities);
                }}
                placeholder="10"
              />
            </div>
            <div>
              <Label className="text-xs">CON</Label>
              <Input
                type="number"
                value={editedContent.abilities?.con || ''}
                onChange={(e) => {
                  const abilities = { ...(editedContent.abilities || {}), con: parseInt(e.target.value) || 10 };
                  updateContentField('abilities', abilities);
                }}
                placeholder="10"
              />
            </div>
            <div>
              <Label className="text-xs">INT</Label>
              <Input
                type="number"
                value={editedContent.abilities?.int || ''}
                onChange={(e) => {
                  const abilities = { ...(editedContent.abilities || {}), int: parseInt(e.target.value) || 10 };
                  updateContentField('abilities', abilities);
                }}
                placeholder="10"
              />
            </div>
            <div>
              <Label className="text-xs">WIS</Label>
              <Input
                type="number"
                value={editedContent.abilities?.wis || ''}
                onChange={(e) => {
                  const abilities = { ...(editedContent.abilities || {}), wis: parseInt(e.target.value) || 10 };
                  updateContentField('abilities', abilities);
                }}
                placeholder="10"
              />
            </div>
            <div>
              <Label className="text-xs">CHA</Label>
              <Input
                type="number"
                value={editedContent.abilities?.cha || ''}
                onChange={(e) => {
                  const abilities = { ...(editedContent.abilities || {}), cha: parseInt(e.target.value) || 10 };
                  updateContentField('abilities', abilities);
                }}
                placeholder="10"
              />
            </div>
          </div>
          <Separator className="my-4" />
          <div>
            <Label>Saving Throws</Label>
            <Input
              value={editedContent.savingThrows || ''}
              onChange={(e) => updateContentField('savingThrows', e.target.value)}
              placeholder="e.g., Str +3, Dex +2"
            />
          </div>
          <div>
            <Label>Skills</Label>
            <Input
              value={editedContent.skills || ''}
              onChange={(e) => updateContentField('skills', e.target.value)}
              placeholder="e.g., Perception +4, Stealth +6"
            />
          </div>
          <div>
            <Label>Damage Resistances</Label>
            <Input
              value={editedContent.resistances || editedContent.damageResistances || ''}
              onChange={(e) => updateContentField('resistances', e.target.value)}
              placeholder="e.g., Fire, Cold"
            />
          </div>
          <div>
            <Label>Condition Immunities</Label>
            <Input
              value={editedContent.conditionImmunities || ''}
              onChange={(e) => updateContentField('conditionImmunities', e.target.value)}
              placeholder="e.g., Charmed, Frightened"
            />
          </div>
          <div>
            <Label>Senses</Label>
            <Input
              value={editedContent.senses || ''}
              onChange={(e) => updateContentField('senses', e.target.value)}
              placeholder="e.g., Darkvision 60 ft."
            />
          </div>
          <div>
            <Label>Languages</Label>
            <Input
              value={editedContent.languages || ''}
              onChange={(e) => updateContentField('languages', e.target.value)}
              placeholder="e.g., Common, Draconic"
            />
          </div>
          <div>
            <Label>Traits (one per line: Name - Description)</Label>
            <Textarea
              value={Array.isArray(editedContent.traits)
                ? editedContent.traits.map((t: any) => typeof t === 'string' ? t : `${t.name} - ${t.description}`).join('\n')
                : (editedContent.traits || '')}
              onChange={(e) => {
                const lines = e.target.value.split('\n').filter(l => l.trim());
                const traits = lines.map(line => {
                  const match = line.match(/^(.+?)\s*-\s*(.+)$/);
                  if (match) {
                    return { name: match[1].trim(), description: match[2].trim() };
                  }
                  return line;
                });
                setEditedContent((prev: any) => ({ ...prev, traits }));
              }}
              placeholder="Pack Tactics - Advantage when ally is within 5 ft.\nKeen Smell - Advantage on Perception checks using smell"
              rows={4}
            />
          </div>
          <div>
            <Label>Actions (one per line: Name - Description)</Label>
            <Textarea
              value={Array.isArray(editedContent.actions)
                ? editedContent.actions.map((a: any) => typeof a === 'string' ? a : `${a.name} - ${a.description}`).join('\n')
                : (editedContent.actions || '')}
              onChange={(e) => {
                const lines = e.target.value.split('\n').filter(l => l.trim());
                const actions = lines.map(line => {
                  const match = line.match(/^(.+?)\s*-\s*(.+)$/);
                  if (match) {
                    return { name: match[1].trim(), description: match[2].trim() };
                  }
                  return line;
                });
                setEditedContent((prev: any) => ({ ...prev, actions }));
              }}
              placeholder="Bite - Melee Weapon Attack: +4 to hit, reach 5 ft., one target. Hit: 7 (1d8 + 3) piercing damage.\nClaw - Melee Weapon Attack: +4 to hit, reach 5 ft., one target. Hit: 5 (1d6 + 2) slashing damage"
              rows={4}
            />
          </div>
          <div>
            <Label>Tactics</Label>
            <Textarea
              value={editedContent.tactics || ''}
              onChange={(e) => updateContentField('tactics', e.target.value)}
              placeholder="How this monster fights"
              rows={2}
            />
          </div>
          <div>
            <Label>Weakness</Label>
            <Textarea
              value={editedContent.weakness || ''}
              onChange={(e) => updateContentField('weakness', e.target.value)}
              placeholder="Tactical weakness"
              rows={2}
            />
          </div>
          <div>
            <Label>Loot</Label>
            <Textarea
              value={editedContent.loot || ''}
              onChange={(e) => updateContentField('loot', e.target.value)}
              placeholder="What it drops"
              rows={2}
            />
          </div>
          <div>
            <Label>Description</Label>
            <Textarea
              value={editedContent.description || ''}
              onChange={(e) => updateContentField('description', e.target.value)}
              placeholder="Physical description"
              rows={3}
            />
          </div>
        </div>
      );
    }

    // Generic fallback for other types
    return (
      <div className="space-y-4">
        {Object.keys(editedContent).map((key) => {
          const value = editedContent[key];
          if (typeof value !== 'string' && typeof value !== 'number') return null;

          const label = key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1');
          const isLongText = typeof value === 'string' && value.length > 50;

          return (
            <div key={key}>
              <Label>{label}</Label>
              {isLongText ? (
                <Textarea
                  value={value || ''}
                  onChange={(e) => updateContentField(key, e.target.value)}
                  rows={3}
                />
              ) : (
                <Input
                  value={value || ''}
                  onChange={(e) => updateContentField(key, e.target.value)}
                />
              )}
            </div>
          );
        })}
      </div>
    );
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        toast({
          title: 'Not logged in',
          description: 'Please sign in to save changes.',
          variant: 'destructive',
        });
        return;
      }

      // Auto-generate text_content from structured content if not manually edited
      let finalTextContent = editedTextContent;
      if (editedContent && typeof editedContent === 'object' && !editedTextContent) {
        const contentParts: string[] = [];
        Object.entries(editedContent).forEach(([key, value]) => {
          if (typeof value === 'string' || typeof value === 'number') {
            const label = key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1');
            contentParts.push(`${label}: ${value}`);
          }
        });
        finalTextContent = contentParts.join('\n');
      }

      const bodyData: any = {
        title: editedTitle,
        user_notes: editedUserNotes || null,
        tags: editedTags,
        type: editedType,
        text_content: finalTextContent || null,
      };

      // Include edited structured content
      if (editedContent !== null && editedContent !== undefined) {
        bodyData.content = editedContent;
      }

      const response = await fetch(`/api/memory/${item.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(bodyData),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to save' }));

        if (response.status === 401) {
          toast({
            title: 'Session Expired',
            description: 'Your session has expired. Please sign out and sign back in.',
            variant: 'destructive',
          });
          return;
        }

        throw new Error(errorData.error || 'Failed to save changes');
      }

      const result = await response.json();

      toast({
        title: 'Saved',
        description: 'Changes saved successfully',
      });

      setIsEditing(false);

      // Reload the item to reflect changes
      await loadFullItem();

      if (onSave) {
        onSave();
      }
    } catch (error) {
      console.error('Save error:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to save changes',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    if (fullItem) {
      setEditedTitle(fullItem.title);
      setEditedUserNotes(fullItem.user_notes || '');
      setEditedTags(fullItem.tags || []);
      setEditedType(fullItem.type);
      setEditedTextContent(fullItem.text_content || '');
      setEditedContent(fullItem.content ? { ...fullItem.content } : null);
    }
    setIsEditing(false);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getCampaignId = () => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('currentCampaignId') || '';
    }
    return '';
  };

  const handleGenerateNPC = async (name: string, context?: string, contextKey?: string, sourceMemoryId?: string) => {
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();

      if (!session) {
        toast({
          title: 'Not logged in',
          description: 'Please sign in to generate NPCs.',
          variant: 'destructive',
        });
        return;
      }

      let roleContext = '';
      if (context) {
        const shopOwnerMatch = context.match(/Shop owner of ([^,\.]+)/i);
        const ownerMatch = context.match(/Owner of ([^,\.]+)/i);
        const tavernMatch = context.match(/tavern known for/i);

        if (shopOwnerMatch) {
          roleContext = ` IMPORTANT: Set the "role" field to exactly: "Shop Owner of ${shopOwnerMatch[1]}"`;
        } else if (ownerMatch && tavernMatch) {
          roleContext = ` IMPORTANT: Set the "role" field to exactly: "Tavern Owner of ${ownerMatch[1]}"`;
        }
      }

      const concept = context
        ? `Generate an NPC named "${name}". Context: ${context}. Create a fully developed character that fits this context, with personality, appearance, and story hooks.${roleContext}`
        : `Generate an NPC named "${name}". Create a fully developed character with personality, appearance, and story hooks.`;

      toast({
        title: 'Generating NPC',
        description: `Creating ${name}...`,
      });

      const response = await fetch('/api/ai/forge/hero', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          campaignId: getCampaignId(),
          concept,
          level: 5,
          tags: context ? ['npc', 'contextual'] : ['npc', 'quick-gen'],
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate NPC');
      }

      const result = await response.json();

      if (!result.success || !result.data) {
        throw new Error(result.error || 'Failed to generate NPC');
      }

      const npcData = result.data;
      const targetMemoryId = npcData.memory_id || npcData.id;

      console.log('NPC Generation Debug:', {
        contextKey,
        sourceMemoryId,
        targetMemoryId,
        npcData,
      });

      if (contextKey && sourceMemoryId && targetMemoryId) {
        try {
          const relationResponse = await fetch('/api/relations/auto-create', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${session.access_token}`,
            },
            body: JSON.stringify({
              sourceMemoryId: sourceMemoryId,
              targetMemoryId: targetMemoryId,
              contextKey: contextKey,
              campaignId: getCampaignId(),
            }),
          });

          if (relationResponse.ok) {
            const relationResult = await relationResponse.json();
            console.log('Relationship creation result:', relationResult);
            if (relationResult.created) {
              toast({
                title: 'Success',
                description: `Created ${name} and linked relationships`,
              });
            } else {
              toast({
                title: 'NPC Created',
                description: `${npcData.name} has been saved to your campaign memory.`,
              });
            }
          } else {
            const errorData = await relationResponse.json();
            console.error('Relationship creation failed:', errorData);
            toast({
              title: 'NPC Created',
              description: `${npcData.name} has been saved (relationships not linked).`,
            });
          }
        } catch (relErr) {
          console.error('Failed to auto-create relationship:', relErr);
          toast({
            title: 'NPC Created',
            description: `${npcData.name} has been saved to your campaign memory.`,
          });
        }
      } else {
        toast({
          title: 'NPC Created',
          description: `${npcData.name} has been saved to your campaign memory.`,
        });
      }

      if (onSave) {
        onSave();
      }
    } catch (err) {
      console.error('NPC generation error:', err);
      toast({
        title: 'Generation failed',
        description: err instanceof Error ? err.message : 'Failed to generate NPC',
        variant: 'destructive',
      });
    }
  };

  const handleGenerateItem = async (itemName: string, context: string, specificPrompt?: string, addToShopInventory: boolean = false) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast({
          title: 'Error',
          description: 'You must be logged in to generate items',
          variant: 'destructive',
        });
        return;
      }

      const concept = specificPrompt
        ? `${itemName}: ${specificPrompt}`
        : `${itemName}. Context: ${context}`;

      toast({
        title: 'Generating Item',
        description: `Creating ${itemName}...`,
      });

      const response = await fetch('/api/ai/forge/item', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          campaignId: getCampaignId(),
          concept,
          rarity: 'rare',
          tags: specificPrompt ? ['shop-item', 'custom'] : ['shop-item', 'contextual'],
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate item');
      }

      const result = await response.json();

      if (!result.success || !result.data) {
        throw new Error(result.error || 'Failed to generate item');
      }

      const itemData = result.data;

      if (addToShopInventory && fullItem && fullItem.forge_type === 'shop') {
        const shopContent = item.content;
        const newInventoryItem = {
          item: itemData.name,
          description: itemData.description || '',
          price: itemData.value || 'Unknown',
        };

        const updatedContent = {
          ...shopContent,
          inventory: [...(shopContent.inventory || []), newInventoryItem],
        };

        const updateResponse = await fetch(`/api/memory/${item.id}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ content: updatedContent }),
        });

        if (!updateResponse.ok) {
          console.error('Failed to update shop inventory');
        }
      }

      toast({
        title: 'Item Created',
        description: `${itemData.name} has been saved to your campaign memory.`,
      });

      if (onSave) {
        onSave();
      }
    } catch (err) {
      console.error('Item generation error:', err);
      toast({
        title: 'Generation failed',
        description: err instanceof Error ? err.message : 'Failed to generate item',
        variant: 'destructive',
      });
    }
  };

  const handleCustomItemGenerate = () => {
    if (!customItemPrompt.trim()) {
      toast({
        title: 'Error',
        description: 'Please describe the item you want to create',
        variant: 'destructive',
      });
      return;
    }

    const shopContext = fullItem?.title ? `Item for ${fullItem.title}. ` : '';
    const isShop = item?.forge_type === 'shop';
    handleGenerateItem(
      customItemPrompt.split(' ').slice(0, 3).join(' '),
      `${shopContext}${customItemPrompt}`,
      customItemPrompt,
      isShop
    );
    setShowCustomItemDialog(false);
    setCustomItemPrompt('');
  };

  const handleOpenLandmarkForge = (forgeName: string, name: string, sourceContext?: {
    description?: string;
    sourceMemoryId?: string;
    contextKey?: string;
    parentName?: string;
  }) => {
    setOpenLandmarkForge(forgeName);
    setLandmarkName(name);
  };

  // Removed handleTextSelection, handleConjure - now handled at page level

  const handleOpenTownForge = (name: string, sourceContext?: {
    description?: string;
    sourceMemoryId?: string;
    contextKey?: string;
    parentName?: string;
  }) => {
    setOpenTownForge(true);
    setTownName(name);
    setTownSourceContext(sourceContext || {});
  };

  const handleOpenVillainForge = (name: string) => {
    setOpenVillainForge(true);
    setVillainName(name);
  };

  const renderFormattedContent = () => {
    if (!fullItem) return null;

    try {
      let content = fullItem.content;

      // Handle legacy format where content was wrapped in { text: "..." }
      if (content && typeof content === 'object' && 'text' in content && typeof content.text === 'string') {
        content = content.text;
      }

      // If content is a string (plain text import), render it as-is
      if (typeof content === 'string') {
        return (
          <div className="prose prose-sm max-w-none text-foreground whitespace-pre-wrap">
            {content}
          </div>
        );
      }

      // If no structured content but text_content exists, use text_content
      if (!content && fullItem.text_content) {
        return (
          <div className="prose prose-sm max-w-none text-foreground whitespace-pre-wrap">
            {fullItem.text_content}
          </div>
        );
      }

      // Otherwise, handle structured content from forges
      if ((fullItem.type === 'npc' && fullItem.forge_type !== 'backstory') || fullItem.forge_type === 'hero' || fullItem.forge_type === 'villain') {
      const npc = content;
      return (
        <div className="space-y-3">
          <div>
            <span className="font-semibold text-primary">Name:</span>{' '}
            <span className="text-foreground">{npc.name}</span>
          </div>
          {(npc.race || npc.class || npc.level) && (
            <div>
              <span className="font-semibold text-primary">Details:</span>{' '}
              <span className="text-foreground">
                {npc.race && `${npc.race} `}
                {npc.class && `${npc.class} `}
                {npc.level && `(Level ${npc.level})`}
                {npc.cr && `(CR ${npc.cr})`}
              </span>
            </div>
          )}
          <div>
            <span className="font-semibold text-primary">Role:</span>{' '}
            <span className="text-foreground">{npc.role}</span>
          </div>
          <div>
            <span className="font-semibold text-primary">Voice Hook:</span>{' '}
            <span className="text-foreground">{npc.voiceHook}</span>
          </div>
          <div>
            <span className="font-semibold text-primary">Secret/Leverage:</span>{' '}
            <span className="text-foreground">{npc.secretOrLeverage}</span>
          </div>
          <div>
            <span className="font-semibold text-primary">First Impression:</span>{' '}
            <span className="text-foreground">{npc.oneLineIntro}</span>
          </div>
          {npc.flair && (
            <div className="bg-secondary/50 rounded-lg p-3 mt-4">
              <div className="font-semibold text-primary mb-2">Flair</div>
              <div className="text-sm italic text-muted-foreground">{npc.flair}</div>
            </div>
          )}
          {fullItem.forge_type === 'npc' && (
            <div className="space-y-2 mt-4 pt-4 border-t border-border/40">
              {npc.physicalDescription && (
                <div>
                  <span className="font-semibold text-primary">Physical Description:</span>{' '}
                  <span className="text-foreground">{npc.physicalDescription}</span>
                </div>
              )}
              {npc.personalityTraits && (
                <div>
                  <span className="font-semibold text-primary">Personality Traits:</span>{' '}
                  <span className="text-foreground">{npc.personalityTraits}</span>
                </div>
              )}
              {npc.speechPattern && (
                <div>
                  <span className="font-semibold text-primary">Speech Pattern:</span>{' '}
                  <span className="text-foreground">{npc.speechPattern}</span>
                </div>
              )}
              {npc.backgroundHook && (
                <div>
                  <span className="font-semibold text-primary">Background:</span>{' '}
                  <span className="text-foreground">{npc.backgroundHook}</span>
                </div>
              )}
              {npc.secretMotivation && (
                <div>
                  <span className="font-semibold text-primary">Secret/Motivation:</span>{' '}
                  <span className="text-foreground">{npc.secretMotivation}</span>
                </div>
              )}
            </div>
          )}
          {fullItem.forge_type === 'hero' && (
            <div className="space-y-2 mt-4 pt-4 border-t border-border/40">
              {npc.alignment && (
                <div>
                  <span className="font-semibold text-primary">Alignment:</span>{' '}
                  <span className="text-foreground">{npc.alignment}</span>
                </div>
              )}
              {npc.motivation && (
                <div>
                  <span className="font-semibold text-primary">Motivation:</span>{' '}
                  <span className="text-foreground">{npc.motivation}</span>
                </div>
              )}
              {npc.flaw && (
                <div>
                  <span className="font-semibold text-primary">Flaw:</span>{' '}
                  <span className="text-foreground">{npc.flaw}</span>
                </div>
              )}
              {npc.signatureItem && (
                <div>
                  <span className="font-semibold text-primary">Signature Item:</span>{' '}
                  <span className="text-foreground">{npc.signatureItem}</span>
                </div>
              )}
              {npc.bonds && npc.bonds.length > 0 && (
                <div>
                  <div className="font-semibold text-primary mb-1">Bonds</div>
                  <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                    {npc.bonds.map((bond: string, i: number) => (
                      <li key={i}>{bond}</li>
                    ))}
                  </ul>
                </div>
              )}
              {npc.secrets && npc.secrets.length > 0 && (
                <div>
                  <div className="font-semibold text-primary mb-1">Secrets</div>
                  <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                    {npc.secrets.map((secret: string, i: number) => (
                      <li key={i}>{secret}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
          {fullItem.forge_type === 'villain' && (
            <div className="space-y-2 mt-4 pt-4 border-t border-border/40">
              {npc.goal && (
                <div>
                  <span className="font-semibold text-primary">Goal:</span>{' '}
                  <span className="text-foreground">{npc.goal}</span>
                </div>
              )}
              {npc.method && (
                <div>
                  <span className="font-semibold text-primary">Method:</span>{' '}
                  <span className="text-foreground">{npc.method}</span>
                </div>
              )}
              {npc.weakness && (
                <div>
                  <span className="font-semibold text-primary">Weakness:</span>{' '}
                  <span className="text-foreground">{npc.weakness}</span>
                </div>
              )}
              {npc.symbol && (
                <div>
                  <span className="font-semibold text-primary">Symbol:</span>{' '}
                  <span className="text-foreground">{npc.symbol}</span>
                </div>
              )}
              {npc.monologue && (
                <div className="bg-secondary/30 rounded-lg p-3">
                  <div className="font-semibold text-primary mb-2">Monologue</div>
                  <div className="text-sm italic text-muted-foreground">"{npc.monologue}"</div>
                </div>
              )}
              {npc.lieutenant && (
                <div>
                  <span className="font-semibold text-primary">Lieutenant:</span>{' '}
                  <button
                    onClick={() => handleOpenVillainForge(npc.lieutenant)}
                    className="inline-flex items-center gap-1 text-amber-400 hover:text-amber-300 transition-all cursor-pointer group"
                    style={{ textShadow: '0 0 10px rgba(251, 191, 36, 0.5)' }}
                  >
                    {npc.lieutenant}
                    <Sparkles className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </button>
                </div>
              )}
              {npc.minions && npc.minions.length > 0 && (
                <div>
                  <div className="font-semibold text-primary mb-1">Minions</div>
                  <ul className="list-disc list-inside space-y-1 text-sm">
                    {npc.minions.map((minion: string, i: number) => (
                      <li key={i} className="text-muted-foreground">
                        <button
                          onClick={() => handleOpenVillainForge(minion)}
                          className="inline-flex items-center gap-1 text-amber-400 hover:text-amber-300 transition-all cursor-pointer group"
                          style={{ textShadow: '0 0 10px rgba(251, 191, 36, 0.5)' }}
                        >
                          {minion}
                          <Sparkles className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Combat Statistics Section */}
              <div className="mt-4 pt-4 border-t border-border/40">
                <div className="font-semibold text-primary mb-2">Combat Statistics</div>
                {!npc.statBlock ? (
                  <div className="bg-secondary/20 rounded-lg p-4">
                    <div className="text-sm text-muted-foreground mb-3">
                      No stat block yet
                    </div>
                    <Button
                      onClick={handleGenerateStatBlock}
                      disabled={isGeneratingStatBlock}
                      size="sm"
                      variant="outline"
                      className="gap-2"
                    >
                      <Plus className="h-4 w-4" />
                      {isGeneratingStatBlock ? 'Generating...' : 'Add Stat Block'}
                    </Button>
                  </div>
                ) : (
                  <div className="bg-secondary/20 rounded-lg">
                    {/* Collapsed/Expanded Header */}
                    <button
                      onClick={() => setStatBlockExpanded(!statBlockExpanded)}
                      className="w-full flex items-center justify-between p-4 text-left hover:bg-secondary/30 transition-colors rounded-lg"
                    >
                      <div className="flex items-center gap-2 text-sm">
                        {statBlockExpanded ? (
                          <ChevronDown className="h-4 w-4 text-cyan-500" />
                        ) : (
                          <ChevronRight className="h-4 w-4 text-cyan-500" />
                        )}
                        <span className="text-foreground font-mono">
                          {npc.statBlock.cr && `CR ${npc.statBlock.cr}`}
                          {npc.statBlock.ac && ` | AC ${npc.statBlock.ac}`}
                          {npc.statBlock.hp && ` | HP ${npc.statBlock.hp}`}
                          {npc.statBlock.speed && ` | Speed ${npc.statBlock.speed}`}
                        </span>
                      </div>
                    </button>

                    {/* Expanded Stat Block */}
                    {statBlockExpanded && (
                      <div className="px-4 pb-4 space-y-4">
                        <Separator />
                        {/* Render full monster stat block */}
                        <div className="space-y-4">
                          <div className="grid grid-cols-3 gap-3">
                            {npc.statBlock.cr && (
                              <div>
                                <span className="font-semibold text-primary">CR:</span>{' '}
                                <span className="text-foreground">{npc.statBlock.cr}</span>
                              </div>
                            )}
                            {npc.statBlock.hp && (
                              <div>
                                <span className="font-semibold text-primary">HP:</span>{' '}
                                <span className="text-foreground">{npc.statBlock.hp}</span>
                              </div>
                            )}
                            {npc.statBlock.ac && (
                              <div>
                                <span className="font-semibold text-primary">AC:</span>{' '}
                                <span className="text-foreground">{npc.statBlock.ac}</span>
                              </div>
                            )}
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            {(npc.statBlock.size || npc.statBlock.type) && (
                              <div>
                                <span className="font-semibold text-primary">Type:</span>{' '}
                                <span className="text-foreground capitalize">{npc.statBlock.size} {npc.statBlock.type}</span>
                              </div>
                            )}
                            {npc.statBlock.speed && (
                              <div>
                                <span className="font-semibold text-primary">Speed:</span>{' '}
                                <span className="text-foreground">{npc.statBlock.speed}</span>
                              </div>
                            )}
                          </div>
                          {npc.statBlock.abilities && (
                            <div className="bg-secondary/30 rounded-lg p-3">
                              <div className="font-semibold text-primary mb-2">Ability Scores</div>
                              <div className="grid grid-cols-6 gap-2 text-sm text-center">
                                <div>
                                  <div className="font-semibold text-muted-foreground">STR</div>
                                  <div className="text-foreground">{npc.statBlock.abilities.str}</div>
                                </div>
                                <div>
                                  <div className="font-semibold text-muted-foreground">DEX</div>
                                  <div className="text-foreground">{npc.statBlock.abilities.dex}</div>
                                </div>
                                <div>
                                  <div className="font-semibold text-muted-foreground">CON</div>
                                  <div className="text-foreground">{npc.statBlock.abilities.con}</div>
                                </div>
                                <div>
                                  <div className="font-semibold text-muted-foreground">INT</div>
                                  <div className="text-foreground">{npc.statBlock.abilities.int}</div>
                                </div>
                                <div>
                                  <div className="font-semibold text-muted-foreground">WIS</div>
                                  <div className="text-foreground">{npc.statBlock.abilities.wis}</div>
                                </div>
                                <div>
                                  <div className="font-semibold text-muted-foreground">CHA</div>
                                  <div className="text-foreground">{npc.statBlock.abilities.cha}</div>
                                </div>
                              </div>
                            </div>
                          )}
                          {/* Display all other stat block fields using the same patterns as monster cards */}
                          {(npc.statBlock.savingThrows && npc.statBlock.savingThrows.length > 0) && (
                            <div>
                              <span className="font-semibold text-primary">Saving Throws:</span>{' '}
                              <span className="text-foreground">{npc.statBlock.savingThrows.join(', ')}</span>
                            </div>
                          )}
                          {(npc.statBlock.skills && npc.statBlock.skills.length > 0) && (
                            <div>
                              <span className="font-semibold text-primary">Skills:</span>{' '}
                              <span className="text-foreground">{npc.statBlock.skills.join(', ')}</span>
                            </div>
                          )}
                          {(npc.statBlock.damageResistances && npc.statBlock.damageResistances.length > 0) && (
                            <div>
                              <span className="font-semibold text-primary">Damage Resistances:</span>{' '}
                              <span className="text-foreground">{npc.statBlock.damageResistances.join(', ')}</span>
                            </div>
                          )}
                          {(npc.statBlock.damageImmunities && npc.statBlock.damageImmunities.length > 0) && (
                            <div>
                              <span className="font-semibold text-primary">Damage Immunities:</span>{' '}
                              <span className="text-foreground">{npc.statBlock.damageImmunities.join(', ')}</span>
                            </div>
                          )}
                          {(npc.statBlock.senses) && (
                            <div>
                              <span className="font-semibold text-primary">Senses:</span>{' '}
                              <span className="text-foreground">{npc.statBlock.senses}</span>
                            </div>
                          )}
                          {(npc.statBlock.languages) && (
                            <div>
                              <span className="font-semibold text-primary">Languages:</span>{' '}
                              <span className="text-foreground">{npc.statBlock.languages}</span>
                            </div>
                          )}
                          {/* Traits, Actions, etc. - abbreviated for space */}
                          {npc.statBlock.traits && npc.statBlock.traits.length > 0 && (
                            <div>
                              <div className="font-semibold text-primary mb-2">Traits</div>
                              <div className="space-y-2">
                                {npc.statBlock.traits.map((trait: any, i: number) => (
                                  <div key={i} className="bg-secondary/30 rounded-lg p-3">
                                    <div className="font-bold text-amber-300 italic mb-1">{trait.name}.</div>
                                    <div className="text-sm text-foreground">{trait.description}</div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                          {npc.statBlock.actions && npc.statBlock.actions.length > 0 && (
                            <div>
                              <div className="font-semibold text-primary mb-2">Actions</div>
                              <div className="space-y-2">
                                {npc.statBlock.actions.map((action: any, i: number) => (
                                  <div key={i} className="bg-secondary/30 rounded-lg p-3">
                                    <div className="font-bold text-amber-300 italic mb-1">{action.name}.</div>
                                    <div className="text-sm text-foreground whitespace-pre-wrap">{action.description}</div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>

                        <div className="flex gap-2 pt-2">
                          <Button
                            onClick={handleGenerateStatBlock}
                            disabled={isGeneratingStatBlock}
                            size="sm"
                            variant="outline"
                          >
                            {isGeneratingStatBlock ? 'Regenerating...' : 'Regenerate'}
                          </Button>
                          <Button
                            onClick={() => setShowRemoveStatBlockDialog(true)}
                            size="sm"
                            variant="destructive"
                          >
                            Remove
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      );
    }

    if (fullItem.type === 'monster' || fullItem.forge_type === 'monster') {
      const monster = content;
      return (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            {monster.cr && (
              <div>
                <span className="font-semibold text-primary">CR:</span>{' '}
                <span className="text-foreground">{monster.cr}</span>
              </div>
            )}
            {monster.hp && (
              <div>
                <span className="font-semibold text-primary">HP:</span>{' '}
                <span className="text-foreground">{monster.hp}</span>
              </div>
            )}
            {monster.ac && (
              <div>
                <span className="font-semibold text-primary">AC:</span>{' '}
                <span className="text-foreground">{monster.ac}</span>
              </div>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            {(monster.size || monster.type) && (
              <div>
                <span className="font-semibold text-primary">Type:</span>{' '}
                <span className="text-foreground capitalize">{monster.size} {monster.type}</span>
              </div>
            )}
            {monster.speed && (
              <div>
                <span className="font-semibold text-primary">Speed:</span>{' '}
                <span className="text-foreground">{monster.speed}</span>
              </div>
            )}
          </div>
          {monster.abilities && (
            <div className="bg-secondary/30 rounded-lg p-3">
              <div className="font-semibold text-primary mb-2">Ability Scores</div>
              <div className="grid grid-cols-6 gap-2 text-sm text-center">
                <div>
                  <div className="font-semibold text-muted-foreground">STR</div>
                  <div className="text-foreground">{monster.abilities.str}</div>
                </div>
                <div>
                  <div className="font-semibold text-muted-foreground">DEX</div>
                  <div className="text-foreground">{monster.abilities.dex}</div>
                </div>
                <div>
                  <div className="font-semibold text-muted-foreground">CON</div>
                  <div className="text-foreground">{monster.abilities.con}</div>
                </div>
                <div>
                  <div className="font-semibold text-muted-foreground">INT</div>
                  <div className="text-foreground">{monster.abilities.int}</div>
                </div>
                <div>
                  <div className="font-semibold text-muted-foreground">WIS</div>
                  <div className="text-foreground">{monster.abilities.wis}</div>
                </div>
                <div>
                  <div className="font-semibold text-muted-foreground">CHA</div>
                  <div className="text-foreground">{monster.abilities.cha}</div>
                </div>
              </div>
            </div>
          )}
          {(monster.savingThrows && monster.savingThrows.length > 0) && (
            <div>
              <span className="font-semibold text-primary">Saving Throws:</span>{' '}
              <span className="text-foreground">{monster.savingThrows.join(', ')}</span>
            </div>
          )}
          {(monster.skills && monster.skills.length > 0) && (
            <div>
              <span className="font-semibold text-primary">Skills:</span>{' '}
              <span className="text-foreground">{monster.skills.join(', ')}</span>
            </div>
          )}
          {(monster.damageResistances && monster.damageResistances.length > 0) && (
            <div>
              <span className="font-semibold text-primary">Damage Resistances:</span>{' '}
              <span className="text-foreground">{monster.damageResistances.join(', ')}</span>
            </div>
          )}
          {(monster.damageImmunities && monster.damageImmunities.length > 0) && (
            <div>
              <span className="font-semibold text-primary">Damage Immunities:</span>{' '}
              <span className="text-foreground">{monster.damageImmunities.join(', ')}</span>
            </div>
          )}
          {(monster.damageVulnerabilities && monster.damageVulnerabilities.length > 0) && (
            <div>
              <span className="font-semibold text-primary">Damage Vulnerabilities:</span>{' '}
              <span className="text-foreground">{monster.damageVulnerabilities.join(', ')}</span>
            </div>
          )}
          {(monster.conditionImmunities && monster.conditionImmunities.length > 0) && (
            <div>
              <span className="font-semibold text-primary">Condition Immunities:</span>{' '}
              <span className="text-foreground">{monster.conditionImmunities.join(', ')}</span>
            </div>
          )}
          {monster.senses && (
            <div>
              <span className="font-semibold text-primary">Senses:</span>{' '}
              <span className="text-foreground">{monster.senses}</span>
            </div>
          )}
          {monster.languages && (
            <div>
              <span className="font-semibold text-primary">Languages:</span>{' '}
              <span className="text-foreground">{monster.languages}</span>
            </div>
          )}
          {monster.traits && monster.traits.length > 0 && (
            <div>
              <div className="font-semibold text-primary mb-2">Traits</div>
              <div className="space-y-2">
                {monster.traits.map((trait: any, i: number) => (
                  <div key={i} className="bg-secondary/20 rounded-lg p-3">
                    {typeof trait === 'string' ? (
                      <div className="text-foreground text-sm">{trait}</div>
                    ) : (
                      <>
                        <div className="font-bold text-amber-300 italic mb-1">{trait.name}.</div>
                        <div className="text-sm text-foreground">{trait.description}</div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
          {monster.actions && monster.actions.length > 0 && (
            <div>
              <div className="font-semibold text-primary mb-2">Actions</div>
              <div className="space-y-2">
                {monster.actions.map((action: any, i: number) => (
                  <div key={i} className="bg-secondary/20 rounded-lg p-3">
                    <div className="font-bold text-amber-300 italic mb-1">{action.name}.</div>
                    <div className="text-sm text-foreground whitespace-pre-wrap">{action.description}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
          {monster.reactions && monster.reactions.length > 0 && (
            <div>
              <div className="font-semibold text-primary mb-2">Reactions</div>
              <div className="space-y-2">
                {monster.reactions.map((reaction: any, i: number) => (
                  <div key={i} className="bg-secondary/25 rounded-lg p-3">
                    <div className="font-bold text-amber-300 italic mb-1">{reaction.name}.</div>
                    <div className="text-sm text-foreground whitespace-pre-wrap">{reaction.description}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
          {((monster.specialActions && monster.specialActions.length > 0) || (monster.specialAbilities && monster.specialAbilities.length > 0)) && (
            <div>
              <div className="font-semibold text-primary mb-2">Special Abilities</div>
              <div className="space-y-2">
                {(monster.specialAbilities || monster.specialActions).map((action: any, i: number) => (
                  <div key={i} className="bg-secondary/30 rounded-lg p-3">
                    <div className="font-bold text-amber-300 italic mb-1">
                      {action.name}{action.recharge ? ` (${action.recharge})` : ''}.
                    </div>
                    <div className="text-sm text-foreground whitespace-pre-wrap">{action.description}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
          {monster.spellcasting && (
            <div>
              <div className="font-semibold text-primary mb-2">Spellcasting</div>
              <div className="bg-secondary/30 rounded-lg p-3 space-y-2 text-sm">
                <div className="text-foreground">
                  {monster.spellcasting.type === 'innate' ? 'Innate Spellcasting. ' : `Spellcasting. The creature is a ${monster.spellcasting.level}${monster.spellcasting.level === 1 ? 'st' : monster.spellcasting.level === 2 ? 'nd' : monster.spellcasting.level === 3 ? 'rd' : 'th'}-level spellcaster. `}
                  Its spellcasting ability is {monster.spellcasting.ability} (spell save DC {monster.spellcasting.saveDC}, +{monster.spellcasting.attackBonus} to hit with spell attacks).
                  {monster.spellcasting.type === 'innate' && ' It can innately cast the following spells, requiring no material components:'}
                  {monster.spellcasting.type === 'standard' && ' It has the following spells prepared:'}
                </div>
                {monster.spellcasting.spells && (
                  <div className="space-y-1">
                    {monster.spellcasting.spells.cantrips && monster.spellcasting.spells.cantrips.length > 0 && (
                      <div>
                        <span className="font-semibold text-amber-300">Cantrips (at will):</span>{' '}
                        <span className="text-foreground italic">{monster.spellcasting.spells.cantrips.join(', ')}</span>
                      </div>
                    )}
                    {monster.spellcasting.spells.atWill && monster.spellcasting.spells.atWill.length > 0 && (
                      <div>
                        <span className="font-semibold text-amber-300">At will:</span>{' '}
                        <span className="text-foreground italic">{monster.spellcasting.spells.atWill.join(', ')}</span>
                      </div>
                    )}
                    {['1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th', '9th'].map((level) => {
                      const spellData = monster.spellcasting.spells[level];
                      if (spellData && spellData.spells && spellData.spells.length > 0) {
                        return (
                          <div key={level}>
                            <span className="font-semibold text-amber-300">
                              {level} level ({spellData.slots} slots):
                            </span>{' '}
                            <span className="text-foreground italic">{spellData.spells.join(', ')}</span>
                          </div>
                        );
                      }
                      return null;
                    })}
                    {monster.spellcasting.spells.perDay3 && monster.spellcasting.spells.perDay3.length > 0 && (
                      <div>
                        <span className="font-semibold text-amber-300">3/day each:</span>{' '}
                        <span className="text-foreground italic">{monster.spellcasting.spells.perDay3.join(', ')}</span>
                      </div>
                    )}
                    {monster.spellcasting.spells.perDay1 && monster.spellcasting.spells.perDay1.length > 0 && (
                      <div>
                        <span className="font-semibold text-amber-300">1/day each:</span>{' '}
                        <span className="text-foreground italic">{monster.spellcasting.spells.perDay1.join(', ')}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
          {monster.legendaryActions && monster.legendaryActions.length > 0 && (
            <div>
              <div className="font-semibold text-primary mb-2">Legendary Actions</div>
              <div className="bg-secondary/35 rounded-lg p-3 space-y-2">
                <div className="text-sm text-foreground italic">
                  The {monster.name} can take {monster.legendaryActionsPerRound || 3} legendary actions, choosing from the options below. Only one legendary action can be used at a time and only at the end of another creature's turn. The {monster.name} regains spent legendary actions at the start of its turn.
                </div>
                <div className="space-y-2 mt-3">
                  {monster.legendaryActions.map((action: any, i: number) => (
                    <div key={i}>
                      <div className="font-bold text-amber-300 italic">
                        {action.name}{action.cost > 1 ? ` (Costs ${action.cost} Actions)` : ''}.
                      </div>
                      <div className="text-sm text-foreground">{action.description}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
          {monster.lairActions && monster.lairActions.length > 0 && (
            <div>
              <div className="font-semibold text-primary mb-2">Lair Actions</div>
              <div className="bg-secondary/35 rounded-lg p-3 space-y-2">
                <div className="text-sm text-foreground italic">
                  On initiative count {monster.lairInitiative || 20} (losing initiative ties), the creature can take a lair action to cause one of the following effects; it can't use the same effect two rounds in a row:
                </div>
                <ul className="list-disc list-inside space-y-1 mt-2">
                  {monster.lairActions.map((action: string, i: number) => (
                    <li key={i} className="text-sm text-foreground">{action}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}
          {monster.regionalEffects && monster.regionalEffects.length > 0 && (
            <div>
              <div className="font-semibold text-primary mb-2">Regional Effects</div>
              <div className="bg-secondary/35 rounded-lg p-3 space-y-2">
                <div className="text-sm text-foreground italic">
                  The region containing the creature's lair is warped by its presence, which creates one or more of the following effects:
                </div>
                <ul className="list-disc list-inside space-y-1 mt-2">
                  {monster.regionalEffects.map((effect: string, i: number) => (
                    <li key={i} className="text-sm text-foreground">{effect}</li>
                  ))}
                </ul>
                <div className="text-sm text-foreground italic mt-2">
                  If the creature dies, these effects fade over 1d10 days.
                </div>
              </div>
            </div>
          )}
          {monster.tactics && (
            <div>
              <span className="font-semibold text-primary">Tactics:</span>{' '}
              <span className="text-foreground">{monster.tactics}</span>
            </div>
          )}
          {monster.weakness && (
            <div>
              <span className="font-semibold text-primary">Weakness:</span>{' '}
              <span className="text-foreground">{monster.weakness}</span>
            </div>
          )}
          {monster.lair && (
            <div>
              <div className="font-semibold text-primary mb-2">Lair</div>
              <div className="text-foreground bg-secondary/20 rounded-lg p-3">{monster.lair}</div>
            </div>
          )}
          {monster.loot && monster.loot.length > 0 && (
            <div>
              <div className="font-semibold text-primary mb-2">Loot</div>
              <ul className="list-disc list-inside space-y-1">
                {monster.loot.map((item: string, i: number) => (
                  <li key={i} className="text-foreground text-sm">{item}</li>
                ))}
              </ul>
            </div>
          )}
          {monster.flair && (
            <div className="bg-secondary/50 rounded-lg p-3 mt-4">
              <div className="font-semibold text-primary mb-2">Description</div>
              <div className="text-sm italic text-muted-foreground">{monster.flair}</div>
            </div>
          )}
        </div>
      );
    }

    if (fullItem.type === 'hook') {
      const hook = content;
      return (
        <div className="space-y-3">
          <div>
            <span className="font-semibold text-primary">Hook:</span>{' '}
            <span className="text-foreground">{hook.hook || hook.name}</span>
          </div>
          {hook.beasts && (
            <div>
              <span className="font-semibold text-primary">Beasts:</span>{' '}
              <span className="text-foreground">{JSON.stringify(hook.beasts)}</span>
            </div>
          )}
          {hook.failure && (
            <div>
              <span className="font-semibold text-primary">Failure:</span>{' '}
              <span className="text-foreground">{hook.failure}</span>
            </div>
          )}
          {hook.success && (
            <div>
              <span className="font-semibold text-primary">Success:</span>{' '}
              <span className="text-foreground">{hook.success}</span>
            </div>
          )}
          {hook.trigger && (
            <div>
              <span className="font-semibold text-primary">Trigger:</span>{' '}
              <span className="text-foreground">{hook.trigger}</span>
            </div>
          )}
          {hook.challenge && (
            <div>
              <span className="font-semibold text-primary">Challenge:</span>{' '}
              <span className="text-foreground">{hook.challenge}</span>
            </div>
          )}
          {hook.angle && (
            <div>
              <span className="font-semibold text-primary">Angle:</span>{' '}
              <span className="text-foreground">{hook.angle}</span>
            </div>
          )}
          {hook.whoCares && (
            <div>
              <span className="font-semibold text-primary">Who Cares:</span>{' '}
              <span className="text-foreground">{hook.whoCares}</span>
            </div>
          )}
          {hook.escalation && (
            <div>
              <span className="font-semibold text-primary">Escalation:</span>{' '}
              <span className="text-foreground">{hook.escalation}</span>
            </div>
          )}
          {hook.flair && (
            <div className="bg-secondary/50 rounded-lg p-3 mt-4">
              <div className="font-semibold text-primary mb-2">Flair</div>
              <div className="text-sm italic text-muted-foreground">{hook.flair}</div>
            </div>
          )}
        </div>
      );
    }

    if (fullItem.forge_type === 'inn' || fullItem.forge_type === 'tavern') {
      const inn = content;

      // Check if we have NEW comprehensive inn data (not the Panic tavern format)
      const hasComprehensiveData = inn && (inn.lodging || inn.amenities || (inn.staff && typeof inn.staff === 'object' && inn.staff.innkeeper));

      if (hasComprehensiveData) {
        return (
          <div className="space-y-4">
            {inn.description && (
              <div>
                <span className="font-semibold text-primary">Description:</span>{' '}
                <span className="text-foreground">{inn.description}</span>
              </div>
            )}
            {inn.atmosphere && (
              <div>
                <span className="font-semibold text-primary">Atmosphere:</span>{' '}
                <span className="text-foreground">{inn.atmosphere}</span>
              </div>
            )}
            {inn.reputation && (
              <div>
                <span className="font-semibold text-primary">Reputation:</span>{' '}
                <span className="text-foreground">{inn.reputation}</span>
              </div>
            )}

            {inn.staff?.innkeeper && (
              <div className="bg-secondary/30 rounded-lg p-4 space-y-2">
                <div className="font-semibold text-primary text-lg">Innkeeper</div>
                <div>
                  <span className="font-semibold">Name:</span>{' '}
                  <ClickablePersonName
                    name={inn.staff.innkeeper.name}
                    context={`Innkeeper of ${fullItem.title}. ${inn.staff.innkeeper.personality}. ${inn.staff.innkeeper.secret}`}
                    contextKey="innkeeper"
                    sourceMemoryId={fullItem.id}
                    onGenerateNPC={handleGenerateNPC}
                  />
                </div>
                {inn.staff.innkeeper.personality && (
                  <div><span className="font-semibold">Personality:</span> {inn.staff.innkeeper.personality}</div>
                )}
                {inn.staff.innkeeper.quirk && (
                  <div><span className="font-semibold">Quirk:</span> {inn.staff.innkeeper.quirk}</div>
                )}
                {inn.staff.innkeeper.secret && (
                  <div><span className="font-semibold text-amber-600">Secret:</span> <span className="italic">{inn.staff.innkeeper.secret}</span></div>
                )}
              </div>
            )}

            {inn.staff?.additional?.length > 0 && (
              <div>
                <div className="font-semibold text-primary mb-2">Staff</div>
                <div className="space-y-1">
                  {inn.staff.additional.map((staff: any, idx: number) => (
                    <div key={idx}>
                      <ClickablePersonName
                        name={staff.name}
                        context={`${staff.role} at ${fullItem.title}`}
                        contextKey="staff"
                        sourceMemoryId={fullItem.id}
                        onGenerateNPC={handleGenerateNPC}
                      />
                      {staff.role && <span className="text-muted-foreground"> - {staff.role}</span>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {inn.lodging?.rooms?.length > 0 && (
              <div>
                <div className="font-semibold text-primary mb-2">Lodging</div>
                <div className="space-y-2">
                  {inn.lodging.rooms.map((room: any, idx: number) => (
                    <div key={idx} className="border-l-2 border-primary/30 pl-3">
                      <div className="font-semibold">{room.type} - {room.price}</div>
                      <div className="text-sm text-muted-foreground">{room.description}</div>
                      {room.amenities?.length > 0 && (
                        <div className="text-sm">Amenities: {room.amenities.join(', ')}</div>
                      )}
                    </div>
                  ))}
                  {inn.lodging.occupancy && (
                    <div className="text-sm text-muted-foreground mt-2">Currently: {inn.lodging.occupancy}</div>
                  )}
                </div>
              </div>
            )}

            {inn.menuHighlights?.length > 0 && (
              <div>
                <div className="font-semibold text-primary mb-2">Menu Highlights</div>
                <ul className="list-disc list-inside space-y-1">
                  {inn.menuHighlights.map((item: string, idx: number) => (
                    <li key={idx} className="text-sm">{item}</li>
                  ))}
                </ul>
              </div>
            )}

            {inn.currentGuests?.length > 0 && (
              <div>
                <div className="font-semibold text-primary mb-2">Current Guests</div>
                <div className="space-y-2">
                  {inn.currentGuests.map((guest: any, idx: number) => (
                    <div key={idx} className="border-l-2 border-secondary pl-3">
                      <div className="font-semibold">
                        <ClickablePersonName
                          name={guest.name}
                          context={`Guest at ${fullItem.title}. ${guest.reason}. ${guest.detail}`}
                          contextKey="patron"
                          sourceMemoryId={fullItem.id}
                          onGenerateNPC={handleGenerateNPC}
                        />
                      </div>
                      <div className="text-sm text-muted-foreground">{guest.reason}</div>
                      {guest.detail && <div className="text-sm italic">{guest.detail}</div>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {inn.amenities && (
              <div>
                <div className="font-semibold text-primary mb-2">Amenities</div>
                <div className="space-y-1 text-sm">
                  {inn.amenities.commonRoom && <div>• Common Room: {inn.amenities.commonRoom}</div>}
                  {inn.amenities.dining && <div>• Dining: {inn.amenities.dining}</div>}
                  {inn.amenities.stables && <div>• Stables available</div>}
                  {inn.amenities.baths && <div>• Baths: {inn.amenities.baths}</div>}
                  {inn.amenities.otherServices?.length > 0 && (
                    <div>• Other services: {inn.amenities.otherServices.join(', ')}</div>
                  )}
                </div>
              </div>
            )}

            {inn.specialFeature && (
              <div className="bg-amber-500/10 rounded-lg p-3">
                <div className="font-semibold text-amber-700 dark:text-amber-400 mb-1">Special Feature</div>
                <div className="text-sm">{inn.specialFeature}</div>
              </div>
            )}

            {inn.hooks?.length > 0 && (
              <div className="bg-secondary/30 rounded-lg p-3">
                <div className="font-semibold text-primary mb-2">Plot Hooks</div>
                <ul className="list-disc list-inside space-y-1 text-sm">
                  {inn.hooks.map((hook: string, idx: number) => (
                    <li key={idx}>{hook}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        );
      }

      // Check if we have NEW Panic Tavern Forge format
      const hasNewTavernData = inn && (inn.owner || inn.staff || inn.signature_item || inn.unique_feature || inn.patrons || inn.plot_hooks || inn.secret);

      if (hasNewTavernData) {
        return (
          <div className="space-y-4">
            {inn.description && (
              <div>
                <span className="font-semibold text-primary">Description:</span>{' '}
                <span className="text-foreground">{inn.description}</span>
              </div>
            )}

            {inn.owner && (
              <div className="bg-secondary/30 rounded-lg p-4">
                <div className="font-semibold text-primary text-lg mb-2">Owner</div>
                <ClickablePersonName
                  name={inn.owner.split(',')[0].split('-')[0].trim()}
                  context={`Owner of ${fullItem.title}. ${inn.owner}`}
                  contextKey="owner"
                  sourceMemoryId={fullItem.id}
                  onGenerateNPC={handleGenerateNPC}
                />
                <div className="text-sm mt-1">{inn.owner}</div>
              </div>
            )}

            {inn.staff && (
              <div>
                <div className="font-semibold text-primary mb-2">Notable Staff</div>
                <div className="space-y-1">
                  {(() => {
                    // Handle both array format (new) and string format (old)
                    if (Array.isArray(inn.staff)) {
                      return inn.staff.map((staff: any, idx: number) => (
                        <div key={idx}>
                          <ClickablePersonName
                            name={staff.name}
                            context={`${staff.role || 'Staff member'} at ${fullItem.title}`}
                            contextKey="staff"
                            sourceMemoryId={fullItem.id}
                            onGenerateNPC={handleGenerateNPC}
                          />
                          {staff.role && <span className="text-muted-foreground"> - {staff.role}</span>}
                        </div>
                      ));
                    }

                    // Fallback for old string format
                    const staffText = inn.staff;
                    const lines = staffText.split('\n').map((l: string) => l.trim()).filter(Boolean);
                    const staffMembers: Array<{name: string, description: string}> = [];

                    for (let i = 0; i < lines.length; i++) {
                      const line = lines[i];
                      if (line.includes(' - ') || line.includes(' – ') || line.includes(' — ')) {
                        const parts = line.split(/\s+[-–—]\s+/);
                        staffMembers.push({ name: parts[0].trim(), description: parts.slice(1).join(' - ') });
                      } else {
                        const nextLine = i + 1 < lines.length ? lines[i + 1] : '';
                        if (nextLine && /^[a-z]/.test(nextLine)) {
                          staffMembers.push({ name: line, description: nextLine });
                          i++;
                        } else {
                          staffMembers.push({ name: line, description: '' });
                        }
                      }
                    }

                    return staffMembers.map((staff, idx) => (
                      <div key={idx}>
                        <ClickablePersonName
                          name={staff.name}
                          context={`Staff member at ${fullItem.title}. ${staff.description || staff.name}`}
                          contextKey="staff"
                          sourceMemoryId={fullItem.id}
                          onGenerateNPC={handleGenerateNPC}
                        />
                        {staff.description && <span className="text-muted-foreground"> {staff.description}</span>}
                      </div>
                    ));
                  })()}
                </div>
              </div>
            )}

            {inn.signature_item && (
              <div>
                <span className="font-semibold text-primary">Signature Item:</span>{' '}
                <span className="text-foreground">{inn.signature_item}</span>
              </div>
            )}

            {inn.unique_feature && (
              <div className="bg-amber-500/10 rounded-lg p-3">
                <div className="font-semibold text-amber-700 dark:text-amber-400 mb-1">Unique Feature</div>
                <div className="text-sm">{inn.unique_feature}</div>
              </div>
            )}

            {inn.patrons && (
              <div>
                <div className="font-semibold text-primary mb-2">Current Patrons</div>
                <div className="space-y-1">
                  {(() => {
                    // Handle both array format (new) and string format (old)
                    if (Array.isArray(inn.patrons)) {
                      return inn.patrons.map((patron: any, idx: number) => (
                        <div key={idx} className="text-sm">
                          <ClickablePersonName
                            name={patron.name}
                            context={`Patron at ${fullItem.title}. ${patron.description || patron.name}`}
                            contextKey="patron"
                            sourceMemoryId={fullItem.id}
                            onGenerateNPC={handleGenerateNPC}
                          />
                          {patron.description && <span className="text-muted-foreground"> {patron.description}</span>}
                        </div>
                      ));
                    }

                    // Fallback for old string format
                    const patronsText = inn.patrons;
                    const lines = patronsText.split('\n').map((l: string) => l.trim()).filter(Boolean);
                    const patrons: Array<{name: string, description: string}> = [];

                    for (let i = 0; i < lines.length; i++) {
                      const line = lines[i];
                      if (line.includes(';')) {
                        line.split(';').forEach((p: string) => {
                          const parts = p.trim().split(/\s+[-–—]\s+/);
                          if (parts.length > 1) {
                            patrons.push({ name: parts[0].trim(), description: parts.slice(1).join(' - ') });
                          } else {
                            patrons.push({ name: p.trim(), description: '' });
                          }
                        });
                      } else if (line.includes(' - ') || line.includes(' – ') || line.includes(' — ')) {
                        const parts = line.split(/\s+[-–—]\s+/);
                        patrons.push({ name: parts[0].trim(), description: parts.slice(1).join(' - ') });
                      } else {
                        const nextLine = i + 1 < lines.length ? lines[i + 1] : '';
                        if (nextLine && /^[a-z]/.test(nextLine)) {
                          patrons.push({ name: line, description: nextLine });
                          i++;
                        } else {
                          patrons.push({ name: line, description: '' });
                        }
                      }
                    }

                    return patrons.map((patron, idx) => (
                      <div key={idx} className="text-sm">
                        <ClickablePersonName
                          name={patron.name}
                          context={`Patron at ${fullItem.title}. ${patron.description || patron.name}`}
                          contextKey="patron"
                          sourceMemoryId={fullItem.id}
                          onGenerateNPC={handleGenerateNPC}
                        />
                        {patron.description && <span className="text-muted-foreground"> {patron.description}</span>}
                      </div>
                    ));
                  })()}
                </div>
              </div>
            )}

            {inn.plot_hooks && (
              <div className="bg-secondary/30 rounded-lg p-3">
                <div className="font-semibold text-primary mb-2">Plot Hooks</div>
                <div className="text-sm whitespace-pre-wrap">{inn.plot_hooks}</div>
              </div>
            )}

            {inn.secret && (
              <div className="bg-red-500/10 rounded-lg p-3">
                <div className="font-semibold text-red-700 dark:text-red-400 mb-1">Secret</div>
                <div className="text-sm italic">{inn.secret}</div>
              </div>
            )}

            {inn.flair && (
              <div className="bg-secondary/50 rounded-lg p-3 mt-4">
                <div className="text-sm italic text-muted-foreground">{inn.flair}</div>
              </div>
            )}
          </div>
        );
      }

      // Check if we have structured tavern data or just text_content
      const hasStructuredData = inn && (inn.owner || inn.signatureDetail || inn.menuItem || inn.oneHook);

      if (!hasStructuredData && fullItem.text_content) {
        // Fallback: Parse text_content for old tavern cards
        const lines = fullItem.text_content.split('\n');
        const parsedTavern: any = {};

        lines.forEach(line => {
          if (line.startsWith('Owner: ')) parsedTavern.owner = line.replace('Owner: ', '');
          else if (line.startsWith('Signature Detail: ')) parsedTavern.signatureDetail = line.replace('Signature Detail: ', '');
          else if (line.startsWith('Menu Item: ')) parsedTavern.menuItem = line.replace('Menu Item: ', '');
          else if (line.startsWith('Hook: ')) parsedTavern.oneHook = line.replace('Hook: ', '');
          else if (!parsedTavern.flair && line.trim() && !line.includes(fullItem.title)) parsedTavern.flair = line;
        });

        return (
          <div className="space-y-4">
            {parsedTavern.flair && (
              <div className="bg-secondary/50 rounded-lg p-3 mb-4">
                <div className="text-sm italic text-muted-foreground">{parsedTavern.flair}</div>
              </div>
            )}
            {parsedTavern.owner && (
              <div>
                <span className="font-semibold text-primary">Owner:</span>{' '}
                <span className="text-foreground">
                  <ClickablePersonName
                    name={parsedTavern.owner.split(' - ')[0] || parsedTavern.owner}
                    context={`Owner of ${fullItem.title}, a tavern known for ${parsedTavern.signatureDetail}. ${parsedTavern.oneHook}`}
                    onGenerateNPC={handleGenerateNPC}
                  />
                  {parsedTavern.owner.includes(' - ') && (
                    <span className="text-muted-foreground ml-2">({parsedTavern.owner.split(' - ')[1]})</span>
                  )}
                </span>
              </div>
            )}
            {parsedTavern.signatureDetail && (
              <div>
                <span className="font-semibold text-primary">Signature Detail:</span>{' '}
                <span className="text-foreground">{parsedTavern.signatureDetail}</span>
              </div>
            )}
            {parsedTavern.menuItem && (
              <div>
                <span className="font-semibold text-primary">Notable Menu Item:</span>{' '}
                <span className="text-foreground">{parsedTavern.menuItem}</span>
              </div>
            )}
            {parsedTavern.oneHook && (
              <div className="bg-secondary/30 rounded-lg p-3">
                <div className="font-semibold text-primary mb-2">Current Hook</div>
                <div className="text-sm text-foreground">{parsedTavern.oneHook}</div>
              </div>
            )}
          </div>
        );
      }

      // Render structured data normally (OLD tavern format)
      return (
        <div className="space-y-4">
          {inn.flair && (
            <div className="bg-secondary/50 rounded-lg p-3 mb-4">
              <div className="text-sm italic text-muted-foreground">{inn.flair}</div>
            </div>
          )}
          {inn.owner && (
            <div>
              <span className="font-semibold text-primary">Owner:</span>{' '}
              <span className="text-foreground">
                <ClickablePersonName
                  name={inn.owner.split(' - ')[0] || inn.owner}
                  context={`Owner of ${fullItem.title}, a tavern known for ${inn.signatureDetail}. ${inn.oneHook}`}
                  onGenerateNPC={handleGenerateNPC}
                />
                {inn.owner.includes(' - ') && (
                  <span className="text-muted-foreground ml-2">({inn.owner.split(' - ')[1]})</span>
                )}
              </span>
            </div>
          )}
          {inn.signatureDetail && (
            <div>
              <span className="font-semibold text-primary">Signature Detail:</span>{' '}
              <span className="text-foreground">{inn.signatureDetail}</span>
            </div>
          )}
          {inn.menuItem && (
            <div>
              <span className="font-semibold text-primary">Notable Menu Item:</span>{' '}
              <span className="text-foreground">{inn.menuItem}</span>
            </div>
          )}
          {inn.oneHook && (
            <div className="bg-secondary/30 rounded-lg p-3">
              <div className="font-semibold text-primary mb-2">Current Hook</div>
              <div className="text-sm text-foreground">{inn.oneHook}</div>
            </div>
          )}
        </div>
      );
    }

    if (fullItem.forge_type === 'landmark') {
      const landmark = content;
      return (
        <div className="space-y-4">
          {landmark.description && (
            <div>
              <span className="font-semibold text-primary">Description:</span>{' '}
              <span className="text-foreground">{landmark.description}</span>
            </div>
          )}

          {(landmark.size || landmark.condition || landmark.age) && (
            <div className="flex gap-3 flex-wrap">
              {landmark.size && <Badge variant="outline">Size: {landmark.size}</Badge>}
              {landmark.condition && <Badge variant="outline">Condition: {landmark.condition}</Badge>}
              {landmark.age && <Badge variant="outline">Age: {landmark.age}</Badge>}
            </div>
          )}

          {landmark.architecturalStyle && (
            <div>
              <span className="font-semibold text-primary">Architectural Style:</span>{' '}
              <span className="text-foreground">{landmark.architecturalStyle}</span>
            </div>
          )}

          {landmark.appearance && (
            <div>
              <span className="font-semibold text-primary">Appearance:</span>{' '}
              <span className="text-foreground">{landmark.appearance}</span>
            </div>
          )}

          {landmark.atmosphere && (
            <div>
              <span className="font-semibold text-primary">Atmosphere:</span>{' '}
              <span className="text-foreground">{landmark.atmosphere}</span>
            </div>
          )}

          {landmark.notableFeatures?.length > 0 && (
            <div>
              <div className="font-semibold text-primary mb-2">Notable Features</div>
              <ul className="list-disc list-inside space-y-1">
                {landmark.notableFeatures.map((feature: string, idx: number) => (
                  <li key={idx} className="text-sm">{feature}</li>
                ))}
              </ul>
            </div>
          )}

          {landmark.primaryFigure && (
            <div className="bg-secondary/30 rounded-lg p-4 space-y-2">
              <div className="font-semibold text-primary text-lg">{landmark.primaryFigure.role || 'Primary Figure'}</div>
              <div>
                <span className="font-semibold">Name:</span>{' '}
                <ClickablePersonName
                  name={landmark.primaryFigure.name}
                  context={`${landmark.primaryFigure.role} of ${fullItem.title}. ${landmark.primaryFigure.personality}. ${landmark.primaryFigure.secret}`}
                  contextKey="notable"
                  sourceMemoryId={fullItem.id}
                  onGenerateNPC={handleGenerateNPC}
                />
              </div>
              {landmark.primaryFigure.appearance && (
                <div><span className="font-semibold">Appearance:</span> {landmark.primaryFigure.appearance}</div>
              )}
              {landmark.primaryFigure.personality && (
                <div><span className="font-semibold">Personality:</span> {landmark.primaryFigure.personality}</div>
              )}
              {landmark.primaryFigure.quirk && (
                <div><span className="font-semibold">Quirk:</span> {landmark.primaryFigure.quirk}</div>
              )}
              {landmark.primaryFigure.secret && (
                <div><span className="font-semibold text-amber-600">Secret:</span> <span className="italic">{landmark.primaryFigure.secret}</span></div>
              )}
            </div>
          )}

          {landmark.additionalPeople?.length > 0 && (
            <div>
              <div className="font-semibold text-primary mb-2">Key People</div>
              <div className="space-y-2">
                {landmark.additionalPeople.map((person: any, idx: number) => (
                  <div key={idx} className="border-l-2 border-secondary pl-3">
                    <div className="font-semibold">
                      <ClickablePersonName
                        name={person.name}
                        context={`${person.role} at ${fullItem.title}. ${person.detail}`}
                        contextKey="notable"
                        sourceMemoryId={fullItem.id}
                        onGenerateNPC={handleGenerateNPC}
                      />
                      {person.role && <span className="text-muted-foreground"> - {person.role}</span>}
                    </div>
                    {person.detail && <div className="text-sm text-muted-foreground">{person.detail}</div>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {landmark.typicalVisitors && (
            <div>
              <span className="font-semibold text-primary">Typical Visitors:</span>{' '}
              <span className="text-foreground">{landmark.typicalVisitors}</span>
            </div>
          )}

          {landmark.specialFeatures?.length > 0 && (
            <div>
              <div className="font-semibold text-primary mb-2">Special Features</div>
              <ul className="list-disc list-inside space-y-1">
                {landmark.specialFeatures.map((feature: string, idx: number) => (
                  <li key={idx} className="text-sm">{feature}</li>
                ))}
              </ul>
            </div>
          )}

          {landmark.secrets?.length > 0 && (
            <div className="bg-amber-500/10 rounded-lg p-3">
              <div className="font-semibold text-amber-700 dark:text-amber-400 mb-2">Secrets</div>
              <ul className="list-disc list-inside space-y-1 text-sm">
                {landmark.secrets.map((secret: string, idx: number) => (
                  <li key={idx}>{secret}</li>
                ))}
              </ul>
            </div>
          )}

          {landmark.hooks?.length > 0 && (
            <div className="bg-secondary/30 rounded-lg p-3">
              <div className="font-semibold text-primary mb-2">Plot Hooks</div>
              <ul className="list-disc list-inside space-y-1 text-sm">
                {landmark.hooks.map((hook: string, idx: number) => (
                  <li key={idx}>{hook}</li>
                ))}
              </ul>
            </div>
          )}

          {landmark.history && (
            <div>
              <span className="font-semibold text-primary">History:</span>{' '}
              <EnrichedForgeContent content={landmark.history} campaignId={fullItem.campaign_id} className="inline" onEntityConjured={onSave} />
            </div>
          )}
        </div>
      );
    }

    if (fullItem.forge_type === 'shop') {
      const shop = content;
      return (
        <div className="space-y-4">
          {shop.type && (
            <div>
              <span className="font-semibold text-primary">Shop Type:</span>{' '}
              <span className="text-foreground">{shop.type}</span>
            </div>
          )}
          {shop.location && (
            <div>
              <span className="font-semibold text-primary">Location:</span>{' '}
              <span className="text-foreground">{shop.location}</span>
            </div>
          )}
          {shop.atmosphere && (
            <div>
              <span className="font-semibold text-primary">Atmosphere:</span>{' '}
              <span className="text-foreground">{shop.atmosphere}</span>
            </div>
          )}
          {shop.owner && (
            <div className="bg-secondary/30 rounded-lg p-4 space-y-2">
              <div className="font-semibold text-primary mb-2">Owner</div>
              <div className="font-medium text-foreground">
                <ClickablePersonName
                  name={shop.owner.name}
                  context={`Shop owner of ${fullItem.title}. ${shop.owner.personality}${shop.owner.secret ? ` Secret: ${shop.owner.secret}` : ''}`}
                  contextKey="owner"
                  sourceMemoryId={fullItem.id}
                  onGenerateNPC={handleGenerateNPC}
                />
                {shop.owner.species && (
                  <span className="text-muted-foreground ml-2">({shop.owner.species})</span>
                )}
              </div>
              {shop.owner.personality && (
                <div className="text-sm text-muted-foreground">
                  <span className="font-semibold">Personality:</span> {shop.owner.personality}
                </div>
              )}
              {shop.owner.secret && (
                <div className="text-sm text-muted-foreground">
                  <span className="font-semibold">Secret:</span> {shop.owner.secret}
                </div>
              )}
            </div>
          )}
          {shop.inventory && shop.inventory.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <div className="font-semibold text-primary">Inventory</div>
                <button
                  onClick={() => setShowCustomItemDialog(true)}
                  className="flex items-center gap-1 text-sm text-primary hover:text-primary/80 hover:underline transition-colors group"
                  title="Create a custom item for this shop"
                >
                  <Plus className="h-3.5 w-3.5 group-hover:scale-110 transition-transform" />
                  <span className="font-medium">Add Item</span>
                </button>
              </div>
              <div className="space-y-2">
                {shop.inventory.map((shopItem: any, i: number) => (
                  <div key={i} className="bg-secondary/20 rounded-lg p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <ClickableInventoryItem
                          itemName={shopItem.item}
                          itemDescription={shopItem.description}
                          itemPrice={shopItem.price}
                          context={`Item from ${fullItem.title}. ${shopItem.description || ''} Price: ${shopItem.price || 'unknown'}`}
                          onGenerateItem={handleGenerateItem}
                        />
                      </div>
                      {shopItem.price && (
                        <div className="text-sm font-semibold text-primary whitespace-nowrap">
                          {shopItem.price}
                        </div>
                      )}
                    </div>
                    {shopItem.description && (
                      <div className="text-sm text-muted-foreground mt-1">
                        {shopItem.description}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
          {shop.hook && (
            <div className="bg-purple-950/30 border border-purple-900/50 rounded-lg p-3">
              <div className="font-semibold text-purple-400 mb-2">Hook</div>
              <div className="text-foreground">{shop.hook}</div>
            </div>
          )}
          {shop.flair && (
            <div className="bg-secondary/50 rounded-lg p-3">
              <div className="font-semibold text-primary mb-2">Description</div>
              <div className="text-sm italic text-muted-foreground">{shop.flair}</div>
            </div>
          )}
        </div>
      );
    }

    if (fullItem.forge_type === 'nation') {
      const nation = content;
      return (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <span className="font-semibold text-primary">Type:</span>{' '}
              <span className="text-foreground capitalize">{nation.type}</span>
            </div>
            {nation.population && (
              <div>
                <span className="font-semibold text-primary">Population:</span>{' '}
                <span className="text-foreground">{nation.population}</span>
              </div>
            )}
          </div>
          {nation.flair && (
            <div className="bg-secondary/50 rounded-lg p-3">
              <div className="font-semibold text-primary mb-2">Description</div>
              <div className="text-sm italic text-muted-foreground">{nation.flair}</div>
            </div>
          )}
          {nation.leadership && (
            <div>
              <div className="font-semibold text-primary mb-2">Leadership</div>
              <div className="bg-secondary/30 rounded-lg p-3 space-y-3">
                <div className="text-sm text-muted-foreground">
                  <span className="font-semibold">Structure:</span> {nation.leadership.structure}
                </div>
                {nation.leadership.leaders && nation.leadership.leaders.length > 0 && (
                  <div>
                    <div className="text-xs font-semibold text-primary mb-2">Key Leaders</div>
                    <div className="space-y-2">
                      {nation.leadership.leaders.map((leader: any, i: number) => (
                        <div key={i} className="bg-secondary/50 rounded p-2 text-sm">
                          <div className="font-medium">
                            <ClickablePersonName
                              name={leader.name}
                              context={`${leader.title} of ${nation.name}. ${leader.personality}. Goal: ${leader.goal}. ${leader.conflict}`}
                              contextKey="leader"
                              sourceMemoryId={fullItem.id}
                              onGenerateNPC={handleGenerateNPC}
                            />
                            {' '}({leader.title})
                          </div>
                          <div className="text-xs text-muted-foreground mt-1">
                            <span className="font-semibold">Personality:</span> {leader.personality}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            <span className="font-semibold">Goal:</span> {leader.goal}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            <span className="font-semibold">Conflict:</span> {leader.conflict}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
          {nation.ideology && (
            <div>
              <div className="font-semibold text-primary mb-2">Ideology</div>
              <div className="bg-secondary/30 rounded-lg p-3 space-y-2 text-sm">
                <div className="text-muted-foreground">
                  <span className="font-semibold">Core:</span> {nation.ideology.core || nation.ideology}
                </div>
                {nation.ideology.practices && (
                  <div className="text-muted-foreground">
                    <span className="font-semibold">Practices:</span> {nation.ideology.practices}
                  </div>
                )}
                {nation.ideology.tension && (
                  <div className="text-muted-foreground">
                    <span className="font-semibold">Tension:</span> {nation.ideology.tension}
                  </div>
                )}
              </div>
            </div>
          )}
          {nation.territory && (
            <div>
              <div className="font-semibold text-primary mb-2">Territory</div>
              <div className="bg-secondary/30 rounded-lg p-3 space-y-2 text-sm">
                <div className="text-muted-foreground">
                  <span className="font-semibold">Lands:</span> {nation.territory.lands || nation.territory}
                </div>
                {nation.territory.capital && (
                  <div className="text-muted-foreground">
                    <span className="font-semibold">Capital:</span>{' '}
                    {(() => {
                      const capitalText = nation.territory.capital;
                      const capitalName = capitalText.split(',')[0].trim();
                      const restOfText = capitalText.includes(',') ? capitalText.substring(capitalText.indexOf(',')) : '';
                      const description = capitalText.includes(',') ? capitalText.substring(capitalText.indexOf(',') + 1).trim() : '';

                      return (
                        <>
                          <ConjureEntityButton
                            entityName={capitalName}
                            entityType="Town"
                            sourceMemoryId={fullItem.id}
                            sourceMemoryType="Nation"
                            sourceEntityName={nation.name}
                            contextKey="capital"
                            description={description}
                            additionalContext={{ size: 'city', parentName: nation.name }}
                            campaignId={getCampaignId()}
                            onSuccess={onSave}
                          />
                          {restOfText}
                        </>
                      );
                    })()}
                  </div>
                )}
                {nation.territory.strategic && (
                  <div className="text-muted-foreground">
                    <span className="font-semibold">Strategic:</span> {nation.territory.strategic}
                  </div>
                )}
              </div>
            </div>
          )}
          {nation.resources && (
            <div>
              <div className="font-semibold text-primary mb-2">Resources</div>
              <div className="bg-secondary/30 rounded-lg p-3 space-y-2 text-sm">
                {nation.resources.economic && nation.resources.economic.length > 0 && (
                  <div className="text-muted-foreground">
                    <span className="font-semibold">Economic:</span> {nation.resources.economic.join(', ')}
                  </div>
                )}
                {nation.resources.magical && (
                  <div className="text-muted-foreground">
                    <span className="font-semibold">Magical:</span> {nation.resources.magical}
                  </div>
                )}
                {nation.resources.military && (
                  <div className="text-muted-foreground">
                    <span className="font-semibold">Military:</span> {nation.resources.military}
                  </div>
                )}
              </div>
            </div>
          )}
          {nation.culture && (
            <div>
              <div className="font-semibold text-primary mb-2">Culture</div>
              <div className="bg-secondary/30 rounded-lg p-3 space-y-2 text-sm">
                {nation.culture.traditions && (
                  <div className="text-muted-foreground">
                    <span className="font-semibold">Traditions:</span> {nation.culture.traditions}
                  </div>
                )}
                {nation.culture.reputation && (
                  <div className="text-muted-foreground">
                    <span className="font-semibold">Reputation:</span> {nation.culture.reputation}
                  </div>
                )}
                {nation.culture.symbols && (
                  <div className="space-y-1">
                    {nation.culture.symbols.banner && (
                      <div className="text-muted-foreground">
                        <span className="font-semibold">Banner:</span> {nation.culture.symbols.banner}
                      </div>
                    )}
                    {nation.culture.symbols.motto && (
                      <div className="text-muted-foreground italic">
                        <span className="font-semibold">Motto:</span> "{nation.culture.symbols.motto}"
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
          {nation.conflicts && (
            <div>
              <div className="font-semibold text-primary mb-2">Conflicts</div>
              <div className="bg-secondary/30 rounded-lg p-3 space-y-2 text-sm">
                {nation.conflicts.internal && (
                  <div className="text-muted-foreground">
                    <span className="font-semibold">Internal:</span> {nation.conflicts.internal}
                  </div>
                )}
                {nation.conflicts.external && (
                  <div className="text-muted-foreground">
                    <span className="font-semibold">External:</span> {nation.conflicts.external}
                  </div>
                )}
              </div>
            </div>
          )}
          {nation.hooks && nation.hooks.length > 0 && (
            <div>
              <div className="font-semibold text-primary mb-2">Adventure Hooks</div>
              <ul className="list-disc list-inside space-y-1">
                {nation.hooks.map((hook: string, i: number) => (
                  <li key={i} className="text-foreground text-sm">{hook}</li>
                ))}
              </ul>
            </div>
          )}
          {nation.secrets && (
            <div className="bg-purple-950/30 border border-purple-900/50 rounded-lg p-3">
              <div className="font-semibold text-purple-400 mb-2">Secrets</div>
              <div className="text-foreground text-sm">{nation.secrets}</div>
            </div>
          )}
        </div>
      );
    }

    if (fullItem.forge_type === 'guild') {
      const guild = content;
      return (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <span className="font-semibold text-primary">Specialty:</span>{' '}
              <span className="text-foreground capitalize">{guild.specialty}</span>
            </div>
            {guild.membership?.size && (
              <div>
                <span className="font-semibold text-primary">Members:</span>{' '}
                <span className="text-foreground">{guild.membership.size}</span>
              </div>
            )}
          </div>
          {guild.flair && (
            <div className="bg-secondary/50 rounded-lg p-3">
              <div className="text-sm italic text-muted-foreground">{guild.flair}</div>
            </div>
          )}
          {guild.motto && (
            <div className="bg-primary/10 border border-primary/20 rounded-lg p-3">
              <div className="text-sm italic text-foreground">"{guild.motto}"</div>
            </div>
          )}
          {guild.headquarters && (
            <div>
              <div className="font-semibold text-primary mb-2">Headquarters</div>
              <div className="bg-secondary/30 rounded-lg p-3 space-y-2 text-sm">
                <div className="font-medium text-foreground">
                  <ConjureEntityButton
                    entityName={guild.headquarters.name}
                    entityType="Landmark"
                    sourceMemoryId={fullItem.id}
                    sourceMemoryType="Guild"
                    sourceEntityName={guild.name}
                    contextKey="headquarters"
                    description={guild.headquarters.description || `Headquarters of ${guild.name}`}
                    additionalContext={{ location: guild.headquarters.location }}
                    campaignId={getCampaignId()}
                    onSuccess={onSave}
                  />
                </div>
                <div className="text-muted-foreground">
                  <span className="font-semibold">Location:</span> {guild.headquarters.location}
                </div>
                {guild.headquarters.description && (
                  <div className="text-muted-foreground">{guild.headquarters.description}</div>
                )}
              </div>
            </div>
          )}
          {guild.leadership && (
            <div>
              <div className="font-semibold text-primary mb-2">Leadership</div>
              <div className="bg-secondary/30 rounded-lg p-3 space-y-3">
                <div className="text-sm text-muted-foreground">
                  <span className="font-semibold">Structure:</span> {guild.leadership.structure}
                </div>
                {guild.leadership.members && guild.leadership.members.length > 0 && (
                  <div>
                    <div className="text-xs font-semibold text-primary mb-2">Key Members</div>
                    <div className="space-y-2">
                      {guild.leadership.members.map((member: any, i: number) => (
                        <div key={i} className="bg-secondary/50 rounded p-2 text-sm">
                          <div className="font-medium">
                            <ClickablePersonName
                              name={member.name}
                              context={`${member.rank} of ${guild.name}. ${member.personality}. Specialty: ${member.specialty}. ${member.agenda}`}
                              contextKey="guildmaster"
                              sourceMemoryId={fullItem.id}
                              onGenerateNPC={handleGenerateNPC}
                            />
                            {' '}({member.rank})
                          </div>
                          <div className="text-xs text-muted-foreground mt-1">
                            <span className="font-semibold">Personality:</span> {member.personality}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            <span className="font-semibold">Specialty:</span> {member.specialty}
                          </div>
                          {member.agenda && (
                            <div className="text-xs text-muted-foreground">
                              <span className="font-semibold">Agenda:</span> {member.agenda}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
          {guild.membership && (
            <div>
              <div className="font-semibold text-primary mb-2">Membership</div>
              <div className="bg-secondary/30 rounded-lg p-3 space-y-2 text-sm">
                {guild.membership.recruitment && (
                  <div className="text-muted-foreground">
                    <span className="font-semibold">Recruitment:</span> {guild.membership.recruitment}
                  </div>
                )}
                {guild.membership.ranks && guild.membership.ranks.length > 0 && (
                  <div className="text-muted-foreground">
                    <span className="font-semibold">Ranks:</span> {guild.membership.ranks.join(' → ')}
                  </div>
                )}
                {guild.membership.initiation && (
                  <div className="text-muted-foreground">
                    <span className="font-semibold">Initiation:</span> {guild.membership.initiation}
                  </div>
                )}
              </div>
            </div>
          )}
          {guild.services && guild.services.length > 0 && (
            <div>
              <div className="font-semibold text-primary mb-2">Services Offered</div>
              <ul className="list-disc list-inside space-y-1">
                {guild.services.map((service: string, i: number) => (
                  <li key={i} className="text-foreground text-sm">{service}</li>
                ))}
              </ul>
            </div>
          )}
          {guild.resources && (
            <div>
              <div className="font-semibold text-primary mb-2">Resources</div>
              <div className="bg-secondary/30 rounded-lg p-3 space-y-2 text-sm">
                {guild.resources.wealth && (
                  <div className="text-muted-foreground">
                    <span className="font-semibold">Wealth:</span> {guild.resources.wealth}
                  </div>
                )}
                {guild.resources.connections && (
                  <div className="text-muted-foreground">
                    <span className="font-semibold">Connections:</span> {guild.resources.connections}
                  </div>
                )}
                {guild.resources.assets && guild.resources.assets.length > 0 && (
                  <div className="text-muted-foreground">
                    <span className="font-semibold">Assets:</span> {guild.resources.assets.join(', ')}
                  </div>
                )}
              </div>
            </div>
          )}
          {guild.culture && (
            <div>
              <div className="font-semibold text-primary mb-2">Culture</div>
              <div className="bg-secondary/30 rounded-lg p-3 space-y-2 text-sm">
                {guild.culture.traditions && (
                  <div className="text-muted-foreground">
                    <span className="font-semibold">Traditions:</span> {guild.culture.traditions}
                  </div>
                )}
                {guild.culture.code && (
                  <div className="text-muted-foreground">
                    <span className="font-semibold">Code:</span> {guild.culture.code}
                  </div>
                )}
                {guild.culture.symbols && (
                  <div className="text-muted-foreground">
                    <span className="font-semibold">Symbols:</span> {guild.culture.symbols}
                  </div>
                )}
              </div>
            </div>
          )}
          {guild.reputation && (
            <div className="bg-secondary/30 rounded-lg p-3">
              <div className="font-semibold text-primary mb-2">Reputation</div>
              <div className="text-foreground text-sm">{guild.reputation}</div>
            </div>
          )}
          {guild.conflicts && (
            <div>
              <div className="font-semibold text-primary mb-2">Conflicts</div>
              <div className="bg-secondary/30 rounded-lg p-3 space-y-2 text-sm">
                {guild.conflicts.internal && (
                  <div className="text-muted-foreground">
                    <span className="font-semibold">Internal:</span> {guild.conflicts.internal}
                  </div>
                )}
                {guild.conflicts.external && (
                  <div className="text-muted-foreground">
                    <span className="font-semibold">External:</span> {guild.conflicts.external}
                  </div>
                )}
              </div>
            </div>
          )}
          {guild.hooks && guild.hooks.length > 0 && (
            <div>
              <div className="font-semibold text-primary mb-2">Adventure Hooks</div>
              <ul className="list-disc list-inside space-y-1">
                {guild.hooks.map((hook: string, i: number) => (
                  <li key={i} className="text-foreground text-sm">{hook}</li>
                ))}
              </ul>
            </div>
          )}
          {guild.secrets && (
            <div className="bg-purple-950/30 border border-purple-900/50 rounded-lg p-3">
              <div className="font-semibold text-purple-400 mb-2">Secrets</div>
              <div className="text-foreground text-sm">{guild.secrets}</div>
            </div>
          )}
        </div>
      );
    }

    if (fullItem.type === 'location' || fullItem.forge_type === 'town') {
      const location = content;
      return (
        <div className="space-y-4">
          {location.size && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <span className="font-semibold text-primary">Size:</span>{' '}
                <span className="text-foreground capitalize">{location.size}</span>
              </div>
              {location.population && (
                <div>
                  <span className="font-semibold text-primary">Population:</span>{' '}
                  <span className="text-foreground">{location.population}</span>
                </div>
              )}
            </div>
          )}
          {location.flair && (
            <div>
              <span className="font-semibold text-primary">Description:</span>{' '}
              <EnrichedForgeContent
                content={location.flair}
                campaignId={fullItem.campaign_id}
                className="inline"
                onEntityConjured={onSave}
              />
            </div>
          )}
          {location.government && (
            <div>
              <span className="font-semibold text-primary">Government:</span>{' '}
              <EnrichedForgeContent
                content={location.government}
                campaignId={fullItem.campaign_id}
                className="inline"
                onEntityConjured={onSave}
              />
            </div>
          )}
          {location.atmosphere && (
            <div>
              <span className="font-semibold text-primary">Atmosphere:</span>{' '}
              <EnrichedForgeContent
                content={location.atmosphere}
                campaignId={fullItem.campaign_id}
                className="inline"
                onEntityConjured={onSave}
              />
            </div>
          )}
          {location.problem && (
            <div>
              <span className="font-semibold text-primary">Problem:</span>{' '}
              <EnrichedForgeContent
                content={location.problem}
                campaignId={fullItem.campaign_id}
                className="inline"
                onEntityConjured={onSave}
              />
            </div>
          )}
          {location.secretHistory && (
            <div>
              <span className="font-semibold text-primary">Secret History:</span>{' '}
              <EnrichedForgeContent
                content={location.secretHistory}
                campaignId={fullItem.campaign_id}
                className="inline"
                onEntityConjured={onSave}
              />
            </div>
          )}
          {location.landmarks && location.landmarks.length > 0 && (
            <div>
              <div className="font-semibold text-primary mb-2">Landmarks</div>
              <ul className="list-disc list-inside space-y-1">
                {location.landmarks.map((landmark: string, i: number) => (
                  <li key={i} className="text-foreground">
                    <ConjureEntityButton
                      entityName={landmark}
                      entityType="Landmark"
                      sourceMemoryId={fullItem.id}
                      sourceMemoryType={fullItem.type}
                      sourceEntityName={fullItem.title}
                      contextKey="landmark"
                      description={`Notable landmark in ${fullItem.title}`}
                      campaignId={getCampaignId()}
                      onSuccess={onSave}
                    />
                  </li>
                ))}
              </ul>
            </div>
          )}
          {location.notableNPCs && location.notableNPCs.length > 0 && (
            <div>
              <div className="font-semibold text-primary mb-2">Notable NPCs</div>
              <div className="space-y-3">
                {location.notableNPCs.map((npc: any, i: number) => (
                  <div key={i} className="bg-secondary/30 rounded-lg p-3">
                    <div className="font-medium text-foreground">
                      <ClickablePersonName
                        name={npc.name}
                        context={`Notable NPC in ${fullItem.title}. Role: ${npc.role}. Location: ${npc.location}. Quirk: ${npc.quirk}${npc.secret ? `. Secret: ${npc.secret}` : ''}`}
                        contextKey="notable"
                        sourceMemoryId={fullItem.id}
                        onGenerateNPC={handleGenerateNPC}
                      />
                    </div>
                    <div className="text-sm text-muted-foreground mt-1">
                      <span className="font-semibold">Role:</span>{' '}
                      <EnrichedForgeContent
                        content={npc.role}
                        campaignId={fullItem.campaign_id}
                        className="inline"
                        onEntityConjured={onSave}
                      />
                    </div>
                    <div className="text-sm text-muted-foreground">
                      <span className="font-semibold">Quirk:</span>{' '}
                      <EnrichedForgeContent
                        content={npc.quirk}
                        campaignId={fullItem.campaign_id}
                        className="inline"
                        onEntityConjured={onSave}
                      />
                    </div>
                    <div className="text-sm text-muted-foreground">
                      <span className="font-semibold">Location:</span>{' '}
                      <EnrichedForgeContent
                        content={npc.location}
                        campaignId={fullItem.campaign_id}
                        className="inline"
                        onEntityConjured={onSave}
                      />
                    </div>
                    {npc.secret && (
                      <div className="text-sm text-muted-foreground">
                        <span className="font-semibold">Secret:</span>{' '}
                        <EnrichedForgeContent
                          content={npc.secret}
                          campaignId={fullItem.campaign_id}
                          className="inline"
                          onEntityConjured={onSave}
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      );
    }

    if (fullItem.forge_type === 'item') {
      const magicItem = content;
      return (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <span className="font-semibold text-primary">Type:</span>{' '}
              <span className="text-foreground capitalize">{magicItem.itemType}</span>
            </div>
            <div>
              <span className="font-semibold text-primary">Rarity:</span>{' '}
              <span className="text-foreground capitalize">{magicItem.rarity}</span>
            </div>
          </div>
          <div>
            <span className="font-semibold text-primary">Attunement:</span>{' '}
            <span className="text-foreground">{magicItem.attunement ? 'Required' : 'Not Required'}</span>
          </div>
          <div>
            <div className="font-semibold text-primary mb-2">Effect</div>
            <div className="text-foreground bg-secondary/20 rounded-lg p-3">{magicItem.effect}</div>
          </div>
          {(magicItem.charges || magicItem.recharge) && (
            <div className="bg-secondary/30 rounded-lg p-3">
              <div className="font-semibold text-primary mb-2">Charges</div>
              {magicItem.charges && (
                <div className="text-sm text-muted-foreground">
                  <span className="font-semibold">Charges:</span> {magicItem.charges}
                </div>
              )}
              {magicItem.recharge && (
                <div className="text-sm text-muted-foreground">
                  <span className="font-semibold">Recharge:</span> {magicItem.recharge}
                </div>
              )}
            </div>
          )}
          {magicItem.history && (
            <div>
              <div className="font-semibold text-primary mb-2">History</div>
              <div className="text-foreground">{magicItem.history}</div>
            </div>
          )}
          {magicItem.curse ? (
            <div className="bg-red-950/30 border border-red-900/50 rounded-lg p-3 group">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  <div className="font-semibold text-red-400 mb-2">Curse</div>
                  <div className="text-foreground">{magicItem.curse}</div>
                </div>
                {isEditing && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 text-red-400 hover:text-red-300 hover:bg-red-950/50 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={async () => {
                      const updatedContent = { ...magicItem, curse: null };
                      try {
                        const { data: { session } } = await supabase.auth.getSession();
                        if (!session) return;

                        const response = await fetch(`/api/memory/${item.id}`, {
                          method: 'PATCH',
                          headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${session.access_token}`,
                          },
                          body: JSON.stringify({ content: updatedContent }),
                        });

                        if (response.ok) {
                          toast({
                            title: 'Curse removed',
                            description: 'The curse has been lifted from this item',
                          });
                          if (onSave) onSave();
                        }
                      } catch (error) {
                        console.error('Error removing curse:', error);
                        toast({
                          title: 'Error',
                          description: 'Failed to remove curse',
                          variant: 'destructive',
                        });
                      }
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          ) : isEditing && (
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="flex-1 border-red-900/50 text-red-400 hover:bg-red-950/30 hover:text-red-300"
                onClick={async () => {
                  try {
                    const { data: { session } } = await supabase.auth.getSession();
                    if (!session) return;

                    toast({
                      title: 'Generating Curse',
                      description: 'Creating a sinister curse for this item...',
                    });

                    const response = await fetch('/api/ai/forge/item', {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${session.access_token}`,
                      },
                      body: JSON.stringify({
                        generateCurse: true,
                        itemContext: {
                          name: magicItem.name,
                          effect: magicItem.effect,
                          rarity: magicItem.rarity,
                        },
                      }),
                    });

                    if (!response.ok) throw new Error('Failed to generate curse');

                    const result = await response.json();
                    if (!result.success || !result.curse) throw new Error('No curse generated');

                    setPreviewedCurse(result.curse);
                    setShowCursePreview(true);
                  } catch (error) {
                    console.error('Error generating curse:', error);
                    toast({
                      title: 'Error',
                      description: 'Failed to generate curse',
                      variant: 'destructive',
                    });
                  }
                }}
              >
                Generate Curse
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="flex-1 border-red-900/50 text-red-400 hover:bg-red-950/30 hover:text-red-300"
                onClick={async () => {
                  try {
                    const { data: { session } } = await supabase.auth.getSession();
                    if (!session) return;

                    toast({
                      title: 'Generating Curse',
                      description: 'Creating a mysterious curse for this item...',
                    });

                    const response = await fetch('/api/ai/forge/item', {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${session.access_token}`,
                      },
                      body: JSON.stringify({
                        generateCurse: true,
                        itemContext: {
                          name: magicItem.name,
                          effect: magicItem.effect,
                          rarity: magicItem.rarity,
                        },
                      }),
                    });

                    if (!response.ok) throw new Error('Failed to generate curse');

                    const result = await response.json();
                    if (!result.success || !result.curse) throw new Error('No curse generated');

                    const updatedContent = { ...magicItem, curse: result.curse };
                    const updateResponse = await fetch(`/api/memory/${item.id}`, {
                      method: 'PATCH',
                      headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${session.access_token}`,
                      },
                      body: JSON.stringify({ content: updatedContent }),
                    });

                    if (updateResponse.ok) {
                      toast({
                        title: 'Curse Added',
                        description: 'A mysterious curse has been bound to this item',
                      });
                      if (onSave) onSave();
                    }
                  } catch (error) {
                    console.error('Error generating surprise curse:', error);
                    toast({
                      title: 'Error',
                      description: 'Failed to generate curse',
                      variant: 'destructive',
                    });
                  }
                }}
              >
                Surprise Me
              </Button>
            </div>
          )}
          {magicItem.flair && (
            <div className="bg-secondary/50 rounded-lg p-3 mt-4">
              <div className="font-semibold text-primary mb-2">Flair</div>
              <div className="text-sm italic text-muted-foreground">{magicItem.flair}</div>
            </div>
          )}
        </div>
      );
    }

    if (fullItem.forge_type === 'scroll') {
      const scroll = content;
      return (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <span className="font-semibold text-primary">Level:</span>{' '}
              <span className="text-foreground">{scroll.level}</span>
            </div>
            <div>
              <span className="font-semibold text-primary">School:</span>{' '}
              <span className="text-foreground">{scroll.school}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <span className="font-semibold text-primary">Casting Time:</span>{' '}
              <span className="text-foreground">{scroll.castingTime}</span>
            </div>
            <div>
              <span className="font-semibold text-primary">Range:</span>{' '}
              <span className="text-foreground">{scroll.range}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <span className="font-semibold text-primary">Duration:</span>{' '}
              <span className="text-foreground">{scroll.duration}</span>
            </div>
            <div>
              <span className="font-semibold text-primary">Components:</span>{' '}
              <span className="text-foreground">{scroll.components}</span>
            </div>
          </div>

          {scroll.description && (
            <div>
              <div className="font-semibold text-primary mb-2">Description</div>
              <div className="text-foreground bg-secondary/20 rounded-lg p-3 whitespace-pre-wrap">{scroll.description}</div>
            </div>
          )}

          {scroll.atHigherLevels && (
            <div>
              <div className="font-semibold text-primary mb-2">At Higher Levels</div>
              <div className="text-foreground bg-secondary/20 rounded-lg p-3">{scroll.atHigherLevels}</div>
            </div>
          )}

          {scroll.classes && scroll.classes.length > 0 && (
            <div>
              <span className="font-semibold text-primary">Classes:</span>{' '}
              <span className="text-foreground">{scroll.classes.join(', ')}</span>
            </div>
          )}

          {scroll.flair && (
            <div className="bg-secondary/50 rounded-lg p-3 mt-4">
              <div className="font-semibold text-primary mb-2">Flair</div>
              <div className="text-sm italic text-muted-foreground">{scroll.flair}</div>
            </div>
          )}
        </div>
      );
    }

    if (fullItem.forge_type === 'encounter-seq') {
      const encounter = content;
      return (
        <div className="space-y-4">
          {encounter.overview && (
            <div className="bg-secondary/50 rounded-lg p-3">
              <div className="font-semibold text-primary mb-1">Overview</div>
              <div className="text-foreground">{encounter.overview}</div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            {encounter.partySize && (
              <div>
                <span className="font-semibold text-primary">Party Size:</span>{' '}
                <span className="text-foreground">{encounter.partySize} × Level {encounter.partyLevel}</span>
              </div>
            )}
            {encounter.difficulty && (
              <div>
                <span className="font-semibold text-primary">Difficulty:</span>{' '}
                <Badge variant="outline" className="ml-1">{encounter.difficulty.toUpperCase()}</Badge>
              </div>
            )}
            {encounter.environment && (
              <div>
                <span className="font-semibold text-primary">Environment:</span>{' '}
                <span className="text-foreground capitalize">{encounter.environment}</span>
              </div>
            )}
            {encounter.xpTotal && (
              <div>
                <span className="font-semibold text-primary">XP Total:</span>{' '}
                <span className="text-foreground">{encounter.xpTotal}</span>
              </div>
            )}
          </div>

          {encounter.positioning && (
            <div>
              <div className="font-semibold text-primary mb-1">Initial Positioning</div>
              <div className="text-foreground text-sm whitespace-pre-wrap">{encounter.positioning}</div>
            </div>
          )}

          {encounter.monsters && encounter.monsters.length > 0 && (
            <div>
              <div className="font-semibold text-primary mb-2">Monsters</div>
              <div className="space-y-3">
                {encounter.monsters.map((monster: any, i: number) => (
                  <div key={i} className="bg-secondary/30 rounded p-3">
                    <div className="font-medium text-foreground mb-2">
                      {monster.quantity || monster.count}× {monster.name} (CR {monster.cr})
                    </div>
                    {monster.role && (
                      <div className="text-xs text-muted-foreground mb-2">Role: {monster.role}</div>
                    )}
                    {monster.positioning && (
                      <div className="text-xs mb-2">
                        <span className="font-medium text-primary">Position:</span>{' '}
                        <span className="text-foreground">{monster.positioning}</span>
                      </div>
                    )}
                    {monster.tactics && typeof monster.tactics === 'object' && (
                      <div className="text-xs mt-2 space-y-1 border-t border-border/30 pt-2">
                        <div className="font-medium text-primary mb-1">Tactics:</div>
                        {monster.tactics.initialRound && (
                          <div><span className="text-muted-foreground">Round 1:</span> {monster.tactics.initialRound}</div>
                        )}
                        {monster.tactics.combatStrategy && (
                          <div><span className="text-muted-foreground">Strategy:</span> {monster.tactics.combatStrategy}</div>
                        )}
                        {monster.tactics.ifBloodied && (
                          <div><span className="text-muted-foreground">If Bloodied:</span> {monster.tactics.ifBloodied}</div>
                        )}
                        {monster.tactics.retreatCondition && (
                          <div><span className="text-muted-foreground">Retreat:</span> {monster.tactics.retreatCondition}</div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {encounter.terrainFeatures && encounter.terrainFeatures.length > 0 && (
            <div>
              <div className="font-semibold text-primary mb-2">Terrain Features</div>
              <ul className="space-y-1">
                {encounter.terrainFeatures.map((feature: any, i: number) => (
                  <li key={i} className="text-sm">
                    <span className="font-medium text-foreground">{feature.name}:</span>{' '}
                    <span className="text-muted-foreground">{feature.mechanicalEffect}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {encounter.phases && encounter.phases.length > 0 && (
            <div>
              <div className="font-semibold text-primary mb-2">Combat Phases</div>
              <div className="space-y-3">
                {encounter.phases.map((phase: any, i: number) => (
                  <div key={i} className="bg-secondary/30 rounded p-3">
                    <div className="font-medium text-primary mb-1">
                      Phase {phase.number}: {phase.name}
                    </div>
                    {phase.trigger && (
                      <div className="text-xs text-muted-foreground mb-2">
                        <span className="font-medium">Trigger:</span> {phase.trigger}
                      </div>
                    )}
                    {phase.enemyActions && (
                      <div className="text-sm text-foreground mb-1">{phase.enemyActions}</div>
                    )}
                    {phase.tactics && (
                      <div className="text-xs text-muted-foreground mt-1">
                        <span className="font-medium">Tactics:</span> {phase.tactics}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {encounter.loot && (
            <div>
              <div className="font-semibold text-primary mb-1">Loot</div>
              <div className="text-sm space-y-1">
                {encounter.loot.onEnemies && (
                  <div><span className="text-muted-foreground">On Enemies:</span> {encounter.loot.onEnemies}</div>
                )}
                {encounter.loot.environmental && (
                  <div><span className="text-muted-foreground">Environmental:</span> {encounter.loot.environmental}</div>
                )}
                {encounter.loot.totalValue && (
                  <div><span className="text-muted-foreground">Total Value:</span> {encounter.loot.totalValue}</div>
                )}
              </div>
            </div>
          )}

          {encounter.dmNotes && (
            <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
              <div className="font-semibold text-amber-900 dark:text-amber-100 mb-2">DM Notes</div>
              <div className="text-sm text-amber-800 dark:text-amber-200 space-y-2">
                {encounter.dmNotes.keyMoments && (
                  <div><span className="font-medium">Key Moments:</span> {encounter.dmNotes.keyMoments}</div>
                )}
                {encounter.dmNotes.monsterPsychology && (
                  <div><span className="font-medium">Psychology:</span> {encounter.dmNotes.monsterPsychology}</div>
                )}
                {encounter.dmNotes.timeEstimate && (
                  <div><span className="font-medium">Time:</span> {encounter.dmNotes.timeEstimate}</div>
                )}
              </div>
            </div>
          )}

          {encounter.flair && (
            <div className="bg-secondary/50 rounded-lg p-3">
              <div className="font-semibold text-primary mb-2">Flair</div>
              <div className="text-sm italic text-muted-foreground">{encounter.flair}</div>
            </div>
          )}
        </div>
      );
    }

    if (fullItem.forge_type === 'weather') {
      const weather = content;
      return (
        <div className="space-y-3">
          {weather.summary && (
            <div className="bg-secondary/50 rounded-lg p-3">
              <div className="font-semibold text-primary mb-1">Summary</div>
              <div className="text-foreground">{weather.summary}</div>
            </div>
          )}
          {weather.detailed_description && (
            <div>
              <span className="font-semibold text-primary">Description:</span>
              <div className="text-foreground mt-1 whitespace-pre-wrap">{weather.detailed_description}</div>
            </div>
          )}
          {weather.mechanical_effects && (
            <div>
              <span className="font-semibold text-primary">Mechanical Effects:</span>
              <div className="text-foreground mt-1">{weather.mechanical_effects}</div>
            </div>
          )}
          {weather.ambient_sounds && weather.ambient_sounds.length > 0 && (
            <div>
              <span className="font-semibold text-primary">Ambient Sounds:</span>
              <ul className="list-disc list-inside mt-1 space-y-1">
                {weather.ambient_sounds.map((sound: string, i: number) => (
                  <li key={i} className="text-foreground">{sound}</li>
                ))}
              </ul>
            </div>
          )}
          {weather.visual_prompts && weather.visual_prompts.length > 0 && (
            <div>
              <span className="font-semibold text-primary">Visual Prompts:</span>
              <ul className="list-disc list-inside mt-1 space-y-1">
                {weather.visual_prompts.map((visual: string, i: number) => (
                  <li key={i} className="text-foreground">{visual}</li>
                ))}
              </ul>
            </div>
          )}
          {weather.dynamic_shift && (
            <div>
              <span className="font-semibold text-primary">Dynamic Shift:</span>
              <div className="text-foreground mt-1">{weather.dynamic_shift}</div>
            </div>
          )}
          {weather.dm_notes && (
            <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3 mt-4">
              <div className="font-semibold text-amber-900 dark:text-amber-100 mb-2">DM Notes</div>
              <div className="text-sm text-amber-800 dark:text-amber-200">{weather.dm_notes}</div>
            </div>
          )}
          {weather.flair && (
            <div className="bg-secondary/50 rounded-lg p-3 mt-4">
              <div className="font-semibold text-primary mb-2">Flair</div>
              <div className="text-sm italic text-muted-foreground">{weather.flair}</div>
            </div>
          )}
        </div>
      );
    }

    if (fullItem.forge_type === 'trap') {
      const trap = content;
      return (
        <div className="space-y-4">
          {trap.summary && (
            <div className="bg-secondary/50 rounded-lg p-3">
              <div className="text-foreground">{trap.summary}</div>
            </div>
          )}
          {trap.difficulty && (
            <div>
              <span className="font-semibold text-primary">Difficulty:</span>{' '}
              <Badge variant="outline" className="capitalize">{trap.difficulty}</Badge>
            </div>
          )}
          {trap.trigger && (
            <div>
              <div className="font-semibold text-primary mb-2">Trigger</div>
              <div className="space-y-2 pl-3">
                {trap.trigger.mechanism && (
                  <div>
                    <span className="text-sm font-medium text-muted-foreground">Mechanism:</span>{' '}
                    <span className="text-foreground">{trap.trigger.mechanism}</span>
                  </div>
                )}
                {trap.trigger.area && (
                  <div>
                    <span className="text-sm font-medium text-muted-foreground">Area:</span>{' '}
                    <span className="text-foreground">{trap.trigger.area}</span>
                  </div>
                )}
                {trap.trigger.description && (
                  <div className="text-sm text-foreground">{trap.trigger.description}</div>
                )}
              </div>
            </div>
          )}
          {trap.effect && (
            <div>
              <div className="font-semibold text-primary mb-2">Effect</div>
              <div className="space-y-2 pl-3">
                {trap.effect.description && (
                  <div className="text-sm text-foreground">{trap.effect.description}</div>
                )}
                {trap.effect.damage && (
                  <div>
                    <span className="text-sm font-medium text-muted-foreground">Damage:</span>{' '}
                    <span className="text-foreground">{trap.effect.damage}</span>
                    {trap.effect.damageType && <span className="text-muted-foreground"> ({trap.effect.damageType})</span>}
                    {trap.effect.averageDamage && <span className="text-muted-foreground"> - avg {trap.effect.averageDamage}</span>}
                  </div>
                )}
                {trap.effect.savingThrow && (
                  <div>
                    <span className="text-sm font-medium text-muted-foreground">Saving Throw:</span>{' '}
                    <span className="text-foreground">
                      {typeof trap.effect.savingThrow === 'string'
                        ? trap.effect.savingThrow
                        : `${trap.effect.savingThrow.ability} DC ${trap.effect.savingThrow.dc} - ${trap.effect.savingThrow.effect}`}
                    </span>
                  </div>
                )}
                {trap.effect.additionalEffects && (
                  <div className="text-sm text-amber-600 dark:text-amber-400">
                    <span className="font-medium">Additional Effects:</span> {trap.effect.additionalEffects}
                  </div>
                )}
              </div>
            </div>
          )}
          {trap.detection && (
            <div>
              <div className="font-semibold text-primary mb-2">Detection & Disarming</div>
              <div className="space-y-2 pl-3">
                {trap.detection.dc && (
                  <div>
                    <span className="text-sm font-medium text-muted-foreground">Detection DC:</span>{' '}
                    <span className="text-foreground">{trap.detection.dc}</span>
                  </div>
                )}
                {trap.detection.clues && trap.detection.clues.length > 0 && (
                  <div>
                    <div className="text-sm font-medium text-muted-foreground mb-1">Clues:</div>
                    <div className="space-y-2">
                      {trap.detection.clues.map((clue: any, i: number) => (
                        <div key={i} className="bg-secondary/30 rounded p-2 text-sm">
                          <div className="font-medium text-foreground capitalize">{clue.type}</div>
                          <div className="text-foreground text-xs mt-1">{clue.description}</div>
                          {clue.perceptionDC && (
                            <div className="text-xs text-muted-foreground mt-1">DC {clue.perceptionDC}</div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
          {trap.disarmMethods && trap.disarmMethods.length > 0 && (
            <div>
              <div className="font-semibold text-primary mb-2">Disarm Methods</div>
              <div className="space-y-2 pl-3">
                {trap.disarmMethods.map((method: any, i: number) => (
                  <div key={i} className="bg-secondary/30 rounded p-2">
                    <div className="font-medium text-foreground">{method.method} (DC {method.dc})</div>
                    <div className="text-sm text-foreground mt-1">{method.description}</div>
                    <div className="text-xs text-muted-foreground mt-1">Time: {method.timeRequired}</div>
                    {method.failureConsequence && (
                      <div className="text-xs text-rose-600 dark:text-rose-400 mt-1">Failure: {method.failureConsequence}</div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
          {trap.bypass && (
            <div>
              <div className="font-semibold text-primary mb-2">Bypass</div>
              <div className="text-sm text-foreground pl-3">{trap.bypass}</div>
            </div>
          )}
          {trap.components && trap.components.length > 0 && (
            <div>
              <div className="font-semibold text-primary mb-2">Components</div>
              <ul className="list-disc list-inside space-y-1 pl-3">
                {trap.components.map((component: string, i: number) => (
                  <li key={i} className="text-sm text-foreground">{component}</li>
                ))}
              </ul>
            </div>
          )}
          {trap.reset && (
            <div>
              <div className="font-semibold text-primary mb-2">Reset Mechanism</div>
              <div className="space-y-1 pl-3 text-sm">
                {trap.reset.automatic !== undefined && (
                  <div>
                    <span className="font-medium text-muted-foreground">Automatic:</span>{' '}
                    <span className="text-foreground">{trap.reset.automatic ? 'Yes' : 'No'}</span>
                  </div>
                )}
                {trap.reset.timeToReset && (
                  <div>
                    <span className="font-medium text-muted-foreground">Reset Time:</span>{' '}
                    <span className="text-foreground">{trap.reset.timeToReset}</span>
                  </div>
                )}
                {trap.reset.method && (
                  <div className="text-foreground">{trap.reset.method}</div>
                )}
              </div>
            </div>
          )}
          {trap.dmNotes && (
            <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
              <div className="font-semibold text-amber-900 dark:text-amber-100 mb-2">DM Notes</div>
              <div className="space-y-2 text-sm text-amber-800 dark:text-amber-200">
                {trap.dmNotes.setup && <div><span className="font-medium">Setup:</span> {trap.dmNotes.setup}</div>}
                {trap.dmNotes.commonMistakes && (
                  <div>
                    <span className="font-medium">Common Mistakes:</span>
                    <p className="mt-1">{trap.dmNotes.commonMistakes}</p>
                  </div>
                )}
                {trap.dmNotes.variations && (
                  <div>
                    <span className="font-medium">Variations:</span>
                    <p className="mt-1">{trap.dmNotes.variations}</p>
                  </div>
                )}
              </div>
            </div>
          )}
          {trap.flair && (
            <div className="bg-secondary/50 rounded-lg p-3 italic">
              <div className="text-sm text-muted-foreground">{trap.flair}</div>
            </div>
          )}
        </div>
      );
    }

    if (fullItem.forge_type === 'backstory' || (content && content.lifeHistory)) {
      const backstory = content;
      return (
        <div className="space-y-4">
          {backstory.summary && (
            <div className="bg-secondary/50 rounded-lg p-3 italic">
              <div className="text-foreground">{backstory.summary}</div>
            </div>
          )}

          {backstory.demographics && (
            <div>
              <div className="font-semibold text-primary mb-2">Demographics</div>
              <div className="grid grid-cols-2 gap-2 pl-3 text-sm">
                {backstory.demographics.birthplace && (
                  <div><span className="font-medium text-muted-foreground">Birthplace:</span> {backstory.demographics.birthplace}</div>
                )}
                {backstory.demographics.currentResidence && (
                  <div><span className="font-medium text-muted-foreground">Current Home:</span> {backstory.demographics.currentResidence}</div>
                )}
                {backstory.demographics.birthdate && (
                  <div><span className="font-medium text-muted-foreground">Born:</span> {backstory.demographics.birthdate}</div>
                )}
                {backstory.age && (
                  <div><span className="font-medium text-muted-foreground">Age:</span> {backstory.age}</div>
                )}
              </div>
              {backstory.demographics.physicalDescription && (
                <p className="text-sm text-foreground mt-2 pl-3">{backstory.demographics.physicalDescription}</p>
              )}
            </div>
          )}

          {backstory.lifeHistory && (
            <div>
              <div className="font-semibold text-primary mb-2">Life History</div>
              <div className="space-y-3 pl-3">
                {backstory.lifeHistory.childhood && (
                  <div>
                    <div className="text-sm font-medium text-muted-foreground mb-1">Childhood</div>
                    <div className="text-sm text-foreground whitespace-pre-wrap">{backstory.lifeHistory.childhood}</div>
                  </div>
                )}
                {backstory.lifeHistory.adolescence && (
                  <div>
                    <div className="text-sm font-medium text-muted-foreground mb-1">Adolescence</div>
                    <div className="text-sm text-foreground whitespace-pre-wrap">{backstory.lifeHistory.adolescence}</div>
                  </div>
                )}
                {backstory.lifeHistory.adulthood && (
                  <div>
                    <div className="text-sm font-medium text-muted-foreground mb-1">Adulthood</div>
                    <div className="text-sm text-foreground whitespace-pre-wrap">{backstory.lifeHistory.adulthood}</div>
                  </div>
                )}
                {backstory.lifeHistory.turningPoint && (
                  <div className="bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-800 rounded-lg p-3">
                    <div className="font-semibold text-rose-900 dark:text-rose-100 mb-1">Turning Point</div>
                    <div className="text-sm text-rose-800 dark:text-rose-200">{backstory.lifeHistory.turningPoint}</div>
                  </div>
                )}
              </div>
            </div>
          )}

          {backstory.personality && (
            <div>
              <div className="font-semibold text-primary mb-2">Personality</div>
              <div className="space-y-2 pl-3">
                {backstory.personality.traits && backstory.personality.traits.length > 0 && (
                  <div>
                    <span className="text-sm font-medium text-muted-foreground">Traits:</span>{' '}
                    <span className="text-sm text-foreground">{backstory.personality.traits.join(', ')}</span>
                  </div>
                )}
                {backstory.personality.ideals && backstory.personality.ideals.length > 0 && (
                  <div>
                    <span className="text-sm font-medium text-muted-foreground">Ideals:</span>{' '}
                    <span className="text-sm text-foreground">{backstory.personality.ideals.join(', ')}</span>
                  </div>
                )}
                {backstory.personality.bonds && backstory.personality.bonds.length > 0 && (
                  <div>
                    <span className="text-sm font-medium text-muted-foreground">Bonds:</span>{' '}
                    <span className="text-sm text-foreground">{backstory.personality.bonds.join(', ')}</span>
                  </div>
                )}
                {backstory.personality.flaws && backstory.personality.flaws.length > 0 && (
                  <div>
                    <span className="text-sm font-medium text-muted-foreground">Flaws:</span>{' '}
                    <span className="text-sm text-foreground">{backstory.personality.flaws.join(', ')}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {backstory.currentSituation && (
            <div>
              <div className="font-semibold text-primary mb-2">Current Situation</div>
              <div className="space-y-2 pl-3">
                {backstory.currentSituation.occupation && (
                  <div>
                    <span className="text-sm font-medium text-muted-foreground">Occupation:</span>{' '}
                    <span className="text-sm text-foreground">{backstory.currentSituation.occupation}</span>
                  </div>
                )}
                {backstory.currentSituation.goals && backstory.currentSituation.goals.length > 0 && (
                  <div>
                    <div className="text-sm font-medium text-muted-foreground mb-1">Goals:</div>
                    <ul className="list-disc list-inside space-y-1">
                      {backstory.currentSituation.goals.map((goal: string, i: number) => (
                        <li key={i} className="text-sm text-foreground">{goal}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {backstory.currentSituation.secrets && backstory.currentSituation.secrets.length > 0 && (
                  <div className="bg-secondary/50 rounded-lg p-2">
                    <div className="text-sm font-medium text-muted-foreground mb-1">Secrets:</div>
                    <ul className="list-disc list-inside space-y-1">
                      {backstory.currentSituation.secrets.map((secret: string, i: number) => (
                        <li key={i} className="text-sm text-foreground italic">{secret}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      );
    }

    if (fullItem.forge_type === 'oddity') {
      const oddities = content.items || [content];
      return (
        <div className="space-y-3">
          {oddities.map((oddity: any, index: number) => (
            <div key={index} className="border border-border/40 rounded-lg p-4 hover:border-teal-500/40 transition-colors">
              <div className="font-semibold text-primary text-lg mb-2">{oddity.name}</div>

              {oddity.appearance && (
                <p className="text-sm text-foreground mb-2">{oddity.appearance}</p>
              )}

              <div className="grid grid-cols-2 gap-2 text-xs mb-2">
                {oddity.value && (
                  <div><span className="font-medium text-muted-foreground">Value:</span> {oddity.value}</div>
                )}
                {oddity.condition && (
                  <div><span className="font-medium text-muted-foreground">Condition:</span> <Badge variant="outline" className="capitalize text-xs">{oddity.condition}</Badge></div>
                )}
              </div>

              {oddity.origin && (
                <div className="text-sm text-muted-foreground italic mb-2">
                  Origin: {oddity.origin}
                </div>
              )}

              {oddity.sensoryDetails && (
                <div className="bg-secondary/30 rounded p-2 text-xs space-y-1 mb-2">
                  {oddity.sensoryDetails.touch && <div><span className="font-medium">Touch:</span> {oddity.sensoryDetails.touch}</div>}
                  {oddity.sensoryDetails.smell && <div><span className="font-medium">Smell:</span> {oddity.sensoryDetails.smell}</div>}
                  {oddity.sensoryDetails.sound && <div><span className="font-medium">Sound:</span> {oddity.sensoryDetails.sound}</div>}
                </div>
              )}

              {oddity.hiddenProperty && (
                <div className="bg-teal-50 dark:bg-teal-950/20 border border-teal-200 dark:border-teal-800 rounded p-2 text-xs mb-2">
                  <span className="font-medium text-teal-900 dark:text-teal-100">Hidden:</span>{' '}
                  <span className="text-teal-800 dark:text-teal-200">{oddity.hiddenProperty}</span>
                </div>
              )}

              {oddity.rumor && (
                <div className="bg-secondary/50 rounded p-2 text-xs italic mb-2">
                  <span className="font-medium">Rumor:</span> {oddity.rumor}
                </div>
              )}

              {oddity.plotHook && (
                <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded p-2 text-xs">
                  <span className="font-medium text-amber-900 dark:text-amber-100">Plot Hook:</span>{' '}
                  <span className="text-amber-800 dark:text-amber-200">{oddity.plotHook}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      );
    }

    if (fullItem.forge_type === 'puzzle' || fullItem.type === 'puzzle') {
      const puzzle = content;
      return (
        <div className="space-y-3">
          {puzzle.title && (
            <div>
              <span className="font-semibold text-primary">Title:</span>{' '}
              <span className="text-foreground">{puzzle.title}</span>
            </div>
          )}
          {puzzle.description && (
            <div>
              <span className="font-semibold text-primary">Description:</span>
              <div className="text-foreground mt-1 whitespace-pre-wrap">{puzzle.description}</div>
            </div>
          )}
          {puzzle.solution && (
            <div>
              <span className="font-semibold text-primary">Solution:</span>
              <div className="text-foreground mt-1">{puzzle.solution}</div>
            </div>
          )}
          {puzzle.difficulty && (
            <div>
              <span className="font-semibold text-primary">Difficulty:</span>{' '}
              <Badge variant="outline">{puzzle.difficulty}</Badge>
            </div>
          )}
          {puzzle.hints && puzzle.hints.length > 0 && (
            <div>
              <span className="font-semibold text-primary">Hints:</span>
              <ol className="list-decimal list-inside mt-1 space-y-1">
                {puzzle.hints.map((hint: string, i: number) => (
                  <li key={i} className="text-foreground">{hint}</li>
                ))}
              </ol>
            </div>
          )}
          {puzzle.if_they_fail && (
            <div className="bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-800 rounded-lg p-3 mt-4">
              <div className="font-semibold text-rose-900 dark:text-rose-100 mb-2">If They Fail</div>
              <div className="text-sm text-rose-800 dark:text-rose-200">{puzzle.if_they_fail}</div>
            </div>
          )}
          {puzzle.dm_notes && (
            <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3 mt-4">
              <div className="font-semibold text-amber-900 dark:text-amber-100 mb-2">DM Notes</div>
              <div className="text-sm text-amber-800 dark:text-amber-200">{puzzle.dm_notes}</div>
            </div>
          )}
        </div>
      );
    }

      return null;
    } catch (error) {
      console.error('Error rendering content:', error);
      return (
        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded">
          <p className="text-sm text-yellow-800 mb-2">
            Unable to display formatted content. Showing raw data:
          </p>
          <pre className="mt-2 text-xs overflow-auto max-h-96 bg-white p-2 rounded border">
            {JSON.stringify(item || {}, null, 2)}
          </pre>
          <div className="mt-2 text-xs text-gray-600">
            <div>Type: {item?.type || 'unknown'}</div>
            <div>Title: {item?.title || 'unknown'}</div>
            <div>Content type: {typeof item?.content}</div>
          </div>
        </div>
      );
    }
  };

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-4xl max-h-[90vh] flex flex-col"
        aria-describedby="memory-detail-description"
      >
        <DialogHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 space-y-2">
              {isEditing ? (
                <div className="space-y-2">
                  <Label htmlFor="title">Title</Label>
                  <Input
                    id="title"
                    value={editedTitle}
                    onChange={(e) => setEditedTitle(e.target.value)}
                    className="text-xl font-semibold"
                    placeholder="Memory title"
                  />
                </div>
              ) : (
                <DialogTitle className="text-2xl">{fullItem?.title || item.title}</DialogTitle>
              )}
            </div>
            <Badge className={`${typeColors[fullItem?.type || item.type]} border shrink-0`}>
              {(fullItem?.forge_type || item.forge_type) === 'hero' ? 'NPC' : (fullItem?.type || item.type).toUpperCase()}
            </Badge>
          </div>
          <DialogDescription id="memory-detail-description" className="sr-only">
            View and edit memory details
          </DialogDescription>
        </DialogHeader>

        <div
          className="space-y-6 py-4 overflow-y-auto flex-1"
          onMouseUp={!isEditing ? onTextSelection : undefined}
        >
          {loadingItem ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center space-y-2">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                <p className="text-sm text-muted-foreground">Loading details...</p>
              </div>
            </div>
          ) : isEditing ? (
            <>
              <Separator />

              <div className="space-y-2">
                <Label htmlFor="entity-type">Entity Type</Label>
                <Select value={editedType} onValueChange={setEditedType}>
                  <SelectTrigger id="entity-type">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    {MEMORY_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Separator />

              {editedContent && typeof editedContent === 'object' ? (
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-foreground">Content</h3>
                  {renderEditableStructuredContent()}
                </div>
              ) : (
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-foreground">Content</h3>
                  <p className="text-xs text-muted-foreground">
                    No structured content available for this entry type.
                  </p>
                </div>
              )}

              <Separator />

              <div className="space-y-2">
                <Label htmlFor="user-notes">User Notes</Label>
                <Textarea
                  id="user-notes"
                  value={editedUserNotes}
                  onChange={(e) => setEditedUserNotes(e.target.value)}
                  className="min-h-[100px]"
                  placeholder="Add your personal notes here..."
                />
              </div>

              <div className="space-y-2">
                <Label>Tags</Label>
                <TagSelector
                  campaignId={item.campaign_id}
                  selectedTags={editedTags}
                  onChange={setEditedTags}
                />
              </div>
            </>
          ) : (
            <>
              <div className="space-y-3">
                <div className="flex flex-wrap gap-2">
                  {item.tags && item.tags.length > 0 ? (
                    item.tags.map((tag, index) => (
                      <Badge
                        key={index}
                        variant="secondary"
                        className="text-xs px-2 py-0.5"
                      >
                        {tag}
                      </Badge>
                    ))
                  ) : (
                    <span className="text-sm text-muted-foreground">No tags</span>
                  )}
                </div>
              </div>

              <Separator />

              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-foreground">Content</h3>
                <div className="bg-secondary/30 rounded-lg p-4 max-h-[400px] overflow-auto">
                  {renderFormattedContent() || (
                    <pre className="text-sm text-foreground whitespace-pre-wrap break-words">
                      {typeof item.content === 'string'
                        ? item.content
                        : JSON.stringify(item.content, null, 2)}
                    </pre>
                  )}
                </div>
              </div>

              {item.user_notes && (
                <>
                  <Separator />
                  <div className="space-y-3">
                    <h3 className="text-sm font-semibold text-foreground">User Notes</h3>
                    <div className="bg-secondary/30 rounded-lg p-4">
                      <p className="text-sm text-foreground whitespace-pre-wrap">{item.user_notes}</p>
                    </div>
                  </div>
                </>
              )}

              <Separator />

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-foreground">
                    Relations {relations.outgoing.length > 0 && (
                      <Badge variant="secondary" className="ml-2 text-xs">
                        {relations.outgoing.length}
                      </Badge>
                    )}
                  </h3>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowRelationsPicker(true)}
                  >
                    <Link2 className="h-3 w-3 mr-1" />
                    Link to...
                  </Button>
                </div>

                {loadingRelations ? (
                  <div className="text-sm text-muted-foreground">Loading relations...</div>
                ) : relations.outgoing.length === 0 ? (
                  <div className="text-sm text-muted-foreground">No relations yet</div>
                ) : (
                  <div className="space-y-2">
                    {relations.outgoing.map((rel) => (
                      <div
                        key={rel.id}
                        className="flex items-center justify-between gap-2 p-2 bg-secondary/30 rounded-lg group"
                      >
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <ArrowRight className="h-3 w-3 text-muted-foreground shrink-0" />
                          <span className="text-xs text-muted-foreground shrink-0">
                            {formatRelationType(rel.relation_type)}:
                          </span>
                          <button
                            onClick={() => rel.to_id && handleNavigateToEntry(rel.to_id)}
                            className="text-sm font-medium truncate text-cyan-400 hover:text-cyan-300 hover:underline cursor-pointer transition-colors text-left"
                            disabled={!rel.to_id}
                          >
                            {rel.to?.title}
                          </button>
                          <Badge variant="outline" className="text-xs shrink-0">
                            {rel.to?.type}
                          </Badge>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => handleDeleteRelation(rel.id)}
                        >
                          <Trash2 className="h-3 w-3 text-destructive" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <Separator />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  <div>
                    <span className="font-medium">Created:</span>{' '}
                    {formatDate(item.created_at)}
                  </div>
                </div>
                {item.last_edited_at && (
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    <div>
                      <span className="font-medium">Last Edited:</span>{' '}
                      {formatDate(item.last_edited_at)}
                    </div>
                  </div>
                )}
                {item.created_in_session_id && (
                  <div className="flex items-center gap-2 col-span-full">
                    <Link2 className="h-4 w-4" />
                    <div>
                      <span className="font-medium">Session:</span>{' '}
                      <code className="text-xs bg-secondary/50 px-2 py-0.5 rounded">
                        {item.created_in_session_id.slice(0, 8)}...
                      </code>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        <DialogFooter className="gap-2 pt-4 border-t">
          {isEditing ? (
            <>
              <Button
                variant="outline"
                onClick={handleCancel}
                disabled={isSaving}
              >
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                disabled={isSaving || !editedTitle.trim()}
              >
                <Save className="h-4 w-4 mr-2" />
                {isSaving ? 'Saving...' : 'Save Changes'}
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Close
              </Button>
              <Button
                onClick={() => setIsEditing(true)}
              >
                Edit
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>

      {item && (
        <RelationsPicker
          open={showRelationsPicker}
          onOpenChange={setShowRelationsPicker}
          campaignId={item.campaign_id}
          fromMemoryId={item.id}
          fromMemoryTitle={fullItem?.title || item.title}
          onSuccess={loadRelations}
        />
      )}

      <Dialog open={showCustomItemDialog} onOpenChange={setShowCustomItemDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Create Custom Item</DialogTitle>
            <DialogDescription>
              Describe the item you want to add to this shop
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="customItem" className="text-sm font-medium mb-2 block">
                Item Description
              </Label>
              <Textarea
                id="customItem"
                placeholder="E.g., 'A legendary flaming greatsword that belonged to a dragon slayer'"
                value={customItemPrompt}
                onChange={(e) => setCustomItemPrompt(e.target.value)}
                rows={3}
                className="resize-none"
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="ghost" onClick={() => {
              setShowCustomItemDialog(false);
              setCustomItemPrompt('');
            }}>
              Cancel
            </Button>
            <Button onClick={handleCustomItemGenerate}>
              Generate Item
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showCursePreview} onOpenChange={setShowCursePreview}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle className="text-red-400">Preview Curse</DialogTitle>
            <DialogDescription>
              Review the generated curse before adding it to the item
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="bg-red-950/30 border border-red-900/50 rounded-lg p-4">
              <p className="text-foreground whitespace-pre-wrap">{previewedCurse}</p>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="ghost"
              onClick={() => {
                setShowCursePreview(false);
                setPreviewedCurse('');
              }}
            >
              Cancel
            </Button>
            <Button
              variant="outline"
              className="border-red-900/50 text-red-400 hover:bg-red-950/30 hover:text-red-300"
              onClick={async () => {
                try {
                  const { data: { session } } = await supabase.auth.getSession();
                  if (!session || !item) return;

                  const magicItem = item.content;
                  const updatedContent = { ...magicItem, curse: previewedCurse };
                  const updateResponse = await fetch(`/api/memory/${item.id}`, {
                    method: 'PATCH',
                    headers: {
                      'Content-Type': 'application/json',
                      'Authorization': `Bearer ${session.access_token}`,
                    },
                    body: JSON.stringify({ content: updatedContent }),
                  });

                  if (updateResponse.ok) {
                    toast({
                      title: 'Curse Added',
                      description: 'A dark curse now binds this item',
                    });
                    setShowCursePreview(false);
                    setPreviewedCurse('');
                    if (onSave) onSave();
                  }
                } catch (error) {
                  console.error('Error adding curse:', error);
                  toast({
                    title: 'Error',
                    description: 'Failed to add curse',
                    variant: 'destructive',
                  });
                }
              }}
            >
              Add This Curse
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Dialog>

    <TavernForgeDialog
      open={openLandmarkForge === 'tavern'}
      onOpenChange={(open) => {
        if (!open) {
          setOpenLandmarkForge(null);
          setLandmarkName('');
          if (onSave) onSave();
        }
      }}
      campaignId={fullItem?.campaign_id || ''}
      prefillName={landmarkName}
    />

    <InnForgeDialog
      open={openLandmarkForge === 'inn'}
      onOpenChange={(open) => {
        if (!open) {
          setOpenLandmarkForge(null);
          setLandmarkName('');
          if (onSave) onSave();
        }
      }}
      campaignId={fullItem?.campaign_id || ''}
      prefillName={landmarkName}
    />

    <ShopForgeDialog
      open={openLandmarkForge === 'shop'}
      onOpenChange={(open) => {
        if (!open) {
          setOpenLandmarkForge(null);
          setLandmarkName('');
          if (onSave) onSave();
        }
      }}
      campaignId={fullItem?.campaign_id || ''}
      prefillName={landmarkName}
    />

    <GuildForgeDialog
      open={openLandmarkForge === 'guild'}
      onOpenChange={(open) => {
        if (!open) {
          setOpenLandmarkForge(null);
          setLandmarkName('');
          if (onSave) onSave();
        }
      }}
      campaignId={fullItem?.campaign_id || ''}
      prefillName={landmarkName}
    />

    <LandmarkForgeDialog
      open={openLandmarkForge === 'landmark'}
      onOpenChange={(open) => {
        if (!open) {
          setOpenLandmarkForge(null);
          setLandmarkName('');
          if (onSave) onSave();
        }
      }}
      campaignId={fullItem?.campaign_id || ''}
      prefillName={landmarkName}
    />

    <TownForgeDialog
      open={openTownForge}
      onOpenChange={(open) => {
        if (!open) {
          setOpenTownForge(false);
          setTownName('');
          setTownSourceContext({});
          if (onSave) onSave();
        }
      }}
      campaignId={fullItem?.campaign_id || ''}
      prefillName={townName}
      sourceDescription={townSourceContext.description}
      sourceMemoryId={townSourceContext.sourceMemoryId}
      contextKey={townSourceContext.contextKey}
      parentName={townSourceContext.parentName}
    />

    <VillainForgeDialog
      open={openVillainForge}
      onOpenChange={(open) => {
        if (!open) {
          setOpenVillainForge(false);
          setVillainName('');
          if (onSave) onSave();
        }
      }}
      campaignId={fullItem?.campaign_id || ''}
      prefillName={villainName}
    />

    <AlertDialog open={showRemoveStatBlockDialog} onOpenChange={setShowRemoveStatBlockDialog}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Remove stat block?</AlertDialogTitle>
          <AlertDialogDescription>
            This will permanently remove the combat statistics from this villain. This cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleRemoveStatBlock} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
            Remove
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </>
  );
}
