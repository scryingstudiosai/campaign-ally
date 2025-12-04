'use client';

import { lazy, Suspense } from 'react';
import { MemoryItem } from '@/types/memory';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { DetailLoadingState } from './memory-details/shared/loading-state';

const MemoryDetailModal = lazy(() => import('./MemoryDetailModal').then(module => ({
  default: module.MemoryDetailModal
})));

interface MemoryDetailModalLazyProps {
  item: MemoryItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave?: () => void;
  onTextSelection?: (e: React.MouseEvent) => void;
}

export function MemoryDetailModalLazy({ item, open, onOpenChange, onSave, onTextSelection }: MemoryDetailModalLazyProps) {
  if (!open || !item) {
    return null;
  }

  return (
    <Suspense
      fallback={
        <Dialog open={open} onOpenChange={onOpenChange}>
          <DialogContent className="max-w-4xl">
            <DetailLoadingState />
          </DialogContent>
        </Dialog>
      }
    >
      <MemoryDetailModal
        item={item}
        open={open}
        onOpenChange={onOpenChange}
        onSave={onSave}
        onTextSelection={onTextSelection}
      />
    </Suspense>
  );
}
