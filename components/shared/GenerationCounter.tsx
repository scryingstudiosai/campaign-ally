'use client';

import { Zap } from 'lucide-react';
import { useGenerationCount } from '@/contexts/GenerationCountContext';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';

export function GenerationCounter() {
  const { used, limit, loading } = useGenerationCount();

  if (loading) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/50">
        <Zap className="h-4 w-4 text-muted-foreground" />
        <Skeleton className="h-4 w-20" />
      </div>
    );
  }

  const percentage = (used / limit) * 100;

  const getColorClasses = () => {
    if (percentage < 60) {
      return {
        text: 'text-green-600 dark:text-green-400',
        icon: 'text-green-600 dark:text-green-400',
        bg: 'bg-green-50 dark:bg-green-950/30',
      };
    } else if (percentage < 92) {
      return {
        text: 'text-amber-600 dark:text-amber-400',
        icon: 'text-amber-600 dark:text-amber-400',
        bg: 'bg-amber-50 dark:bg-amber-950/30',
      };
    } else {
      return {
        text: 'text-red-600 dark:text-red-400',
        icon: 'text-red-600 dark:text-red-400',
        bg: 'bg-red-50 dark:bg-red-950/30',
      };
    }
  };

  const colors = getColorClasses();

  return (
    <div
      className={cn(
        'flex items-center gap-2 px-3 py-2 rounded-lg transition-colors',
        colors.bg
      )}
      title={`${used} of ${limit} AI generations used this month`}
    >
      <Zap className={cn('h-4 w-4', colors.icon)} />
      <span className={cn('text-sm font-medium', colors.text)}>
        {used} / {limit}
      </span>
    </div>
  );
}
