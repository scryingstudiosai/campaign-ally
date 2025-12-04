import { cn } from '@/lib/utils';

interface DifficultyBadgeProps {
  difficulty: 'trivial' | 'easy' | 'medium' | 'hard' | 'deadly';
  className?: string;
}

export function DifficultyBadge({ difficulty, className }: DifficultyBadgeProps) {
  const colors = {
    trivial: 'bg-gray-600 text-gray-200 border-gray-500',
    easy: 'bg-green-600 text-white border-green-500',
    medium: 'bg-yellow-600 text-white border-yellow-500',
    hard: 'bg-orange-600 text-white border-orange-500',
    deadly: 'bg-red-600 text-white border-red-500'
  };

  return (
    <span
      className={cn(
        'px-3 py-1 rounded-full text-sm font-bold uppercase border',
        colors[difficulty] || colors.medium,
        className
      )}
    >
      {difficulty}
    </span>
  );
}
