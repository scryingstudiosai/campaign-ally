'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Sparkles, Loader2, X } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase/client';

interface ConjureFromTextModalProps {
  selectedText: string;
  entityType: string;
  sourceMemoryId: string;
  sourceMemoryName: string;
  sourceMemoryType: string;
  campaignId: string;
  onClose: () => void;
  onSuccess: (entity: any) => void;
}

export function ConjureFromTextModal({
  selectedText,
  entityType,
  sourceMemoryId,
  sourceMemoryName,
  sourceMemoryType,
  campaignId,
  onClose,
  onSuccess
}: ConjureFromTextModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Initialize state only once on mount
  useEffect(() => {
    console.log('🎬 ConjureFromTextModal mounted with:', { entityType, selectedText });
    setName(extractName(selectedText));
    setDescription(selectedText);
    setMounted(true);
  }, []);

  // Prevent rendering until mounted
  if (!mounted) {
    return null;
  }

  async function handleConjure() {
    if (!name.trim()) {
      toast.error('Please provide a name');
      return;
    }

    setIsGenerating(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Please sign in to generate entities');
        return;
      }

      toast.info(`Generating ${name}...`, { duration: 2000 });

      const sourceContext = `${description}\n\nContext: Found in ${sourceMemoryName} (${sourceMemoryType})`;
      const contextKey = inferContextKey(sourceMemoryType, entityType);

      const endpoint = getEndpoint(entityType);

      // Build request body based on entity type
      let requestBody: any = {
        campaignId,
      };

      // Item endpoint expects different fields
      if (entityType === 'Item') {
        requestBody.concept = `${name}: ${description}`;
        requestBody.rarity = 'uncommon'; // Default rarity
      } else {
        // Other endpoints use the standard pattern
        requestBody.name = name;
        requestBody.sourceContext = sourceContext;
        requestBody.sourceMemoryId = sourceMemoryId;
        requestBody.contextKey = contextKey;
        requestBody.quickGenerate = true;
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Generation failed');
      }

      const result = await response.json();
      const newEntity = result.data || result;

      console.log('🎯 Entity created:', {
        entityId: newEntity.id || newEntity.memory_id,
        entityName: name,
        sourceMemoryId,
        contextKey
      });

      try {
        const targetMemoryId = newEntity.id || newEntity.memory_id;

        if (!targetMemoryId) {
          console.error('❌ No entity ID found in response:', result);
          toast.success(`Created ${name}!`);
          onSuccess(newEntity);
          onClose();
          return;
        }

        console.log('🔗 Creating relationship:', {
          sourceMemoryId,
          targetMemoryId,
          contextKey,
          campaignId
        });

        const relationResponse = await fetch('/api/relations/auto-create', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            sourceMemoryId,
            targetMemoryId,
            contextKey,
            campaignId
          })
        });

        const relationResult = await relationResponse.json();

        console.log('🔗 Relationship response:', relationResult);

        if (relationResponse.ok) {
          if (relationResult.created) {
            toast.success(`Created ${name} and linked relationships!`);
          } else {
            toast.success(`Created ${name}! ${relationResult.message || ''}`);
          }
        } else {
          console.error('❌ Relationship creation failed:', relationResult);
          toast.success(`Created ${name}!`);
        }
      } catch (err) {
        console.error('❌ Relationship creation error:', err);
        toast.success(`Created ${name}!`);
      }

      onSuccess(newEntity);
      onClose();

    } catch (error) {
      console.error('Conjure error:', error);
      toast.error(`Failed to create ${name}`);
    } finally {
      setIsGenerating(false);
    }
  }

  const modal = (
    <div
      className="fixed inset-0 bg-black/70 flex items-center justify-center z-[9999]"
      onClick={(e) => {
        // Only close if clicking the backdrop itself
        if (e.target === e.currentTarget) {
          console.log('🚪 Backdrop clicked, closing modal');
          onClose();
        }
      }}
      onMouseDown={(e) => e.stopPropagation()}
      onMouseUp={(e) => e.stopPropagation()}
    >
      <div
        className="bg-gray-800 border border-cyan-500/50 rounded-lg p-6 max-w-2xl w-full mx-4 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-cyan-400" />
            Conjure {entityType}
          </h2>
          <button
            onClick={() => {
              console.log('❌ X button clicked, closing modal');
              onClose();
            }}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
              placeholder={`${entityType} name...`}
              autoFocus
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Selected Text (Context)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div className="bg-gray-900 border border-gray-700 rounded p-3">
            <div className="text-sm text-gray-400">
              Will be linked to: <span className="text-cyan-400 font-medium">{sourceMemoryName}</span>
            </div>
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button
            onClick={() => {
              console.log('❌ Cancel button clicked');
              onClose();
            }}
            disabled={isGenerating}
            className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleConjure}
            disabled={isGenerating || !name.trim()}
            className="flex-1 px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                Conjure {entityType}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );

  return typeof window !== 'undefined' ? createPortal(modal, document.body) : null;
}

function extractName(text: string): string {
  const match = text.match(/^([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/);
  if (match) return match[1];

  const quotedMatch = text.match(/"([^"]+)"/);
  if (quotedMatch) return quotedMatch[1];

  return text.split(/[,.\n]/)[0].trim().slice(0, 50);
}

function inferContextKey(sourceType: string, targetType: string): string {
  if (sourceType === 'Town' && targetType === 'Location') return 'landmark';
  if (sourceType === 'Town' && targetType === 'NPC') return 'notable';
  if (sourceType === 'Location' && targetType === 'NPC') return 'notable';
  if (sourceType === 'Nation' && targetType === 'Town') return 'capital';
  if (sourceType === 'Location' && targetType === 'Item') return 'item';
  return 'related_to';
}

function getEndpoint(entityType: string): string {
  const endpoints: Record<string, string> = {
    NPC: '/api/ai/forge/hero',
    Location: '/api/ai/forge/landmark',
    Town: '/api/ai/forge/town',
    Item: '/api/ai/forge/item',
    Monster: '/api/ai/forge/monster'
  };
  return endpoints[entityType] || '/api/ai/forge/hero';
}
