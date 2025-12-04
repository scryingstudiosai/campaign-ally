'use client';

import { memo } from 'react';
import { Grid } from 'react-window';
import AutoSizer from 'react-virtualized-auto-sizer';
import { MemoryEntryCard } from './MemoryEntryCard';
import { ErrorBoundary } from '@/components/error-boundary';
import { AlertCircle } from 'lucide-react';

interface MemoryEntry {
  id: string;
  name: string;
  type: string;
  category?: string;
  tags: string[];
  pinned: boolean;
  archived: boolean;
  first_appearance?: string;
  created_at: string;
  updated_at: string;
}

interface VirtualizedMemoryGridProps {
  entries: MemoryEntry[];
  onView: (id: string) => void;
  onEdit: (id: string) => void;
  onPin: (id: string, pinned: boolean) => void;
  onArchive: (id: string) => void;
  onDelete: (id: string) => void;
  minCardWidth?: number;
  cardHeight?: number;
  gap?: number;
}

const CARD_HEIGHT = 280;
const MIN_CARD_WIDTH = 350;
const GAP = 16;

function CellRenderer({ columnIndex, rowIndex, style, entries, columnCount, handlers, gap }: any) {
  const index = rowIndex * columnCount + columnIndex;

  if (index >= entries.length) {
    return null;
  }

  const entry = entries[index];

  return (
    <div
      style={{
        ...style,
        left: Number(style.left) + gap / 2,
        top: Number(style.top) + gap / 2,
        width: Number(style.width) - gap,
        height: Number(style.height) - gap,
      }}
    >
      <ErrorBoundary
        fallbackComponent={
          <div className="bg-gray-900 border border-red-500 rounded-lg p-4 h-full">
            <div className="flex items-center gap-2 text-red-500">
              <AlertCircle className="h-4 w-4" />
              <span className="text-sm">Error loading memory card</span>
            </div>
          </div>
        }
      >
        <MemoryEntryCard
          entry={entry}
          onView={handlers.onView}
          onEdit={handlers.onEdit}
          onPin={handlers.onPin}
          onArchive={handlers.onArchive}
          onDelete={handlers.onDelete}
        />
      </ErrorBoundary>
    </div>
  );
}

const MemoizedCellRenderer = memo(CellRenderer);

export const VirtualizedMemoryGrid = memo(function VirtualizedMemoryGrid({
  entries,
  onView,
  onEdit,
  onPin,
  onArchive,
  onDelete,
  minCardWidth = MIN_CARD_WIDTH,
  cardHeight = CARD_HEIGHT,
  gap = GAP,
}: VirtualizedMemoryGridProps) {
  const calculateColumns = (width: number) => {
    return Math.max(1, Math.floor((width + gap) / (minCardWidth + gap)));
  };

  if (entries.length === 0) {
    return null;
  }

  return (
    <div className="w-full" style={{ height: 'calc(100vh - 300px)', minHeight: '400px' }}>
      <AutoSizer>
        {({ height, width }) => {
          const columnCount = calculateColumns(width);
          const rowCount = Math.ceil(entries.length / columnCount);
          const columnWidth = (width - gap) / columnCount;

          return (
            <div style={{ width, height }}>
              <Grid
                cellComponent={(props) => (
                  <MemoizedCellRenderer
                    {...props}
                    entries={entries}
                    columnCount={columnCount}
                    handlers={{
                      onView,
                      onEdit,
                      onPin,
                      onArchive,
                      onDelete,
                    }}
                    gap={gap}
                  />
                )}
                cellProps={{}}
                columnCount={columnCount}
                columnWidth={columnWidth}
                defaultHeight={height}
                defaultWidth={width}
                rowCount={rowCount}
                rowHeight={cardHeight + gap}
                overscanCount={2}
                className="scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-gray-900"
              />
            </div>
          );
        }}
      </AutoSizer>
    </div>
  );
});
