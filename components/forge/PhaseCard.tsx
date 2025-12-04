'use client';

import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Target, Users, Zap, Cloud } from 'lucide-react';

interface PhaseCardProps {
  phase: {
    name: string;
    number?: number;
    trigger: string;
    activeMonsters?: string[];
    tactics?: string;
    environmental?: string;
    terrain?: string;
    lighting?: string;
    weather?: string;
    special?: string;
  };
  phaseNumber: number;
  className?: string;
}

export function PhaseCard({ phase, phaseNumber, className }: PhaseCardProps) {
  return (
    <Card className={`bg-gradient-to-br from-cyan-950/20 to-violet-950/20 border-cyan-700/30 p-6 ${className || ''}`}>
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-500/20 to-violet-500/20 border border-cyan-500/30 flex items-center justify-center">
          <span className="text-lg font-bold text-cyan-400">{phase.number || phaseNumber}</span>
        </div>
        <h3 className="text-xl font-bold text-cyan-300">{phase.name}</h3>
      </div>

      <div className="space-y-4">
        <div className="bg-violet-950/30 border border-violet-700/30 rounded-lg p-3">
          <div className="flex items-start gap-2">
            <Zap className="w-4 h-4 text-violet-400 mt-0.5 flex-shrink-0" />
            <div>
              <div className="text-xs font-bold text-violet-300 uppercase mb-1">Trigger</div>
              <div className="text-sm text-foreground">{phase.trigger}</div>
            </div>
          </div>
        </div>

        {phase.activeMonsters && phase.activeMonsters.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Users className="w-4 h-4 text-red-400" />
              <span className="text-sm font-bold text-red-300">Active Enemies</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {phase.activeMonsters.map((monster, idx) => (
                <Badge key={idx} variant="outline" className="bg-red-950/30 text-red-300 border-red-700/30">
                  {monster}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {phase.tactics && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Target className="w-4 h-4 text-amber-400" />
              <span className="text-sm font-bold text-amber-300">Tactics</span>
            </div>
            <div className="text-sm text-foreground bg-secondary/30 rounded-lg p-3 whitespace-pre-wrap">
              {phase.tactics}
            </div>
          </div>
        )}

        {(phase.environmental || phase.terrain || phase.lighting || phase.weather || phase.special) && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Cloud className="w-4 h-4 text-cyan-400" />
              <span className="text-sm font-bold text-cyan-300">Environment</span>
            </div>
            <div className="bg-cyan-950/30 border border-cyan-700/30 rounded-lg p-3 space-y-2 text-sm">
              {phase.environmental && (
                <div className="text-foreground">{phase.environmental}</div>
              )}
              {phase.terrain && (
                <div>
                  <span className="font-semibold text-cyan-300">Terrain:</span>{' '}
                  <span className="text-foreground">{phase.terrain}</span>
                </div>
              )}
              {phase.lighting && (
                <div>
                  <span className="font-semibold text-cyan-300">Lighting:</span>{' '}
                  <span className="text-foreground">{phase.lighting}</span>
                </div>
              )}
              {phase.weather && (
                <div>
                  <span className="font-semibold text-cyan-300">Weather:</span>{' '}
                  <span className="text-foreground">{phase.weather}</span>
                </div>
              )}
              {phase.special && (
                <div>
                  <span className="font-semibold text-cyan-300">Special:</span>{' '}
                  <span className="text-foreground">{phase.special}</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}
