'use client';

import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { GripVertical } from 'lucide-react';
import SceneCard from './SceneCard';

interface Scene {
  id: string;
  session_id: string;
  index_order: number;
  title?: string;
  data?: any;
  canon_checked?: boolean;
  last_canon_score?: number;
  last_canon_checked_at?: string;
  created_at: string;
}

interface DraggableSceneListProps {
  scenes: Scene[];
  campaignId: string;
  sessionId: string;
  token: string;
  onUpdate: () => void;
  onDelete: (sceneId: string) => void;
  onReorder: (sceneIds: string[]) => void;
}

export default function DraggableSceneList({
  scenes,
  campaignId,
  sessionId,
  token,
  onUpdate,
  onDelete,
  onReorder,
}: DraggableSceneListProps) {
  const { toast } = useToast();
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  function handleDragStart(e: React.DragEvent, index: number) {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  }

  function handleDragOver(e: React.DragEvent, index: number) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverIndex(index);
  }

  function handleDragLeave() {
    setDragOverIndex(null);
  }

  async function handleDrop(e: React.DragEvent, dropIndex: number) {
    e.preventDefault();

    if (draggedIndex === null || draggedIndex === dropIndex) {
      setDraggedIndex(null);
      setDragOverIndex(null);
      return;
    }

    const reorderedScenes = [...scenes];
    const [draggedScene] = reorderedScenes.splice(draggedIndex, 1);
    reorderedScenes.splice(dropIndex, 0, draggedScene);

    const sceneIds = reorderedScenes.map((s) => s.id);
    onReorder(sceneIds);

    setDraggedIndex(null);
    setDragOverIndex(null);
  }

  function handleDragEnd() {
    setDraggedIndex(null);
    setDragOverIndex(null);
  }

  return (
    <div className="space-y-4">
      {scenes.map((scene, index) => (
        <div
          key={scene.id}
          draggable
          onDragStart={(e) => handleDragStart(e, index)}
          onDragOver={(e) => handleDragOver(e, index)}
          onDragLeave={handleDragLeave}
          onDrop={(e) => handleDrop(e, index)}
          onDragEnd={handleDragEnd}
          className={`relative transition-all ${
            draggedIndex === index ? 'opacity-50' : ''
          } ${
            dragOverIndex === index && draggedIndex !== index
              ? 'border-t-2 border-primary pt-2'
              : ''
          }`}
        >
          <div className="flex items-start gap-2">
            <div className="mt-4 cursor-grab active:cursor-grabbing">
              <GripVertical className="h-5 w-5 text-muted-foreground" />
            </div>
            <div className="flex-1">
              <SceneCard
                scene={scene}
                campaignId={campaignId}
                sessionId={sessionId}
                token={token}
                onUpdate={onUpdate}
                onDelete={() => onDelete(scene.id)}
              />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
