'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Clock } from 'lucide-react';

interface Scene {
  data?: {
    estimatedDuration?: string;
  };
}

interface SessionProgressBarProps {
  scenes: Scene[];
  targetMinutes?: number;
}

function parseDuration(duration?: string): number {
  if (!duration) return 15;

  const match = duration.match(/(\d+)(?:-(\d+))?\s*(?:min|m)?/i);
  if (!match) return 15;

  const low = parseInt(match[1]);
  const high = match[2] ? parseInt(match[2]) : low;

  return (low + high) / 2;
}

export default function SessionProgressBar({ scenes, targetMinutes = 180 }: SessionProgressBarProps) {
  const totalMinutes = scenes.reduce((sum, scene) => {
    const duration = parseDuration(scene.data?.estimatedDuration);
    return sum + duration;
  }, 0);

  const hours = Math.floor(totalMinutes / 60);
  const minutes = Math.round(totalMinutes % 60);

  const percentage = (totalMinutes / targetMinutes) * 100;
  const targetHours = Math.floor(targetMinutes / 60);

  function getProgressColor(): string {
    if (percentage < 50) return 'bg-yellow-500';
    if (percentage >= 85 && percentage <= 115) return 'bg-green-500';
    if (percentage > 115) return 'bg-orange-500';
    return 'bg-blue-500';
  }

  function getStatusText(): string {
    if (percentage < 50) return 'Short session';
    if (percentage >= 85 && percentage <= 115) return 'Perfect timing';
    if (percentage > 115) return 'May run long';
    return 'Getting there';
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Clock className="h-4 w-4" />
          Session Duration
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div>
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="font-semibold">
              {hours}h {minutes}m
            </span>
            <span className="text-muted-foreground">
              Target: {targetHours}h
            </span>
          </div>
          <div className="w-full bg-secondary rounded-full h-2 overflow-hidden">
            <div
              className={`h-full transition-all ${getProgressColor()}`}
              style={{ width: `${Math.min(percentage, 100)}%` }}
            />
          </div>
        </div>

        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">{getStatusText()}</span>
          <span className={`font-medium ${
            percentage >= 85 && percentage <= 115
              ? 'text-green-600 dark:text-green-400'
              : percentage > 115
              ? 'text-orange-600 dark:text-orange-400'
              : 'text-yellow-600 dark:text-yellow-400'
          }`}>
            {percentage.toFixed(0)}%
          </span>
        </div>

        {scenes.length > 0 && (
          <div className="text-xs text-muted-foreground pt-2 border-t">
            {scenes.length} scene{scenes.length !== 1 ? 's' : ''} ·
            ~{Math.round(totalMinutes / scenes.length)} min average
          </div>
        )}
      </CardContent>
    </Card>
  );
}
