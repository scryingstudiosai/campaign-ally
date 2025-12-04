'use client';

import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Swords,
  Target,
  Users,
  AlertTriangle,
  Sparkles,
  MapPin,
  Skull,
  Coins,
  Play,
  FileText,
  Copy,
  Trash2
} from 'lucide-react';

interface EncounterBeat {
  number: number;
  trigger: string;
  challenge: string;
  dc: number | null;
  enemies: string[] | null;
  success: string;
  failure: string;
}

interface EncounterRewards {
  xp: number;
  treasure: string;
  story: string;
}

interface EncounterData {
  name: string;
  partyLevel: number;
  difficulty: 'easy' | 'medium' | 'hard' | 'deadly';
  setup: string;
  beats: EncounterBeat[];
  rewards?: EncounterRewards;
  flair?: string;
}

interface EncounterCardProps {
  title: string;
  encounter: EncounterData;
  tags?: string[];
  date?: string;
  onDelete?: () => void;
}

export function EncounterCard({
  title,
  encounter,
  tags = [],
  date,
  onDelete
}: EncounterCardProps) {
  const difficultyColors = {
    easy: 'bg-green-500/15 text-green-300 border-green-500/30',
    medium: 'bg-yellow-500/15 text-yellow-300 border-yellow-500/30',
    hard: 'bg-orange-500/15 text-orange-300 border-orange-500/30',
    deadly: 'bg-red-500/15 text-red-300 border-red-500/30',
  };

  const handleCopySummary = () => {
    const summary = `${title}\nLevel ${encounter.partyLevel} - ${encounter.difficulty.toUpperCase()}\n\n${encounter.setup}`;
    navigator.clipboard.writeText(summary);
  };

  const allEnemies = encounter.beats
    ?.flatMap(beat => beat.enemies || [])
    .filter((enemy, index, self) => self.indexOf(enemy) === index) || [];

  return (
    <Card className="group relative overflow-hidden bg-gradient-to-br from-[#0b0d10] to-[#13161a] border-primary/20 hover:border-cyan-500/40 transition-all duration-500 animate-in fade-in slide-in-from-bottom-4">
      <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/5 via-violet-500/5 to-cyan-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

      <div className="relative p-6 space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
          <div className="flex-1 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <h3 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-violet-400" style={{ fontFamily: 'Cinzel, serif' }}>
                {title}
              </h3>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="bg-blue-500/15 text-blue-300 border-blue-500/30">
                <Target className="h-3 w-3 mr-1" />
                Level {encounter.partyLevel}
              </Badge>
              <Badge variant="outline" className={difficultyColors[encounter.difficulty]}>
                <Swords className="h-3 w-3 mr-1" />
                {encounter.difficulty.toUpperCase()}
              </Badge>
              {tags.map((tag, i) => (
                <Badge key={i} variant="outline" className="bg-primary/10 text-primary border-primary/30">
                  {tag}
                </Badge>
              ))}
              {date && (
                <span className="text-xs text-muted-foreground ml-auto">{date}</span>
              )}
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-r from-cyan-500/10 via-violet-500/10 to-cyan-500/10 rounded-lg p-4 border border-primary/20">
          <p className="text-foreground leading-relaxed italic">
            {encounter.setup}
          </p>
        </div>

        <div className="grid lg:grid-cols-[1fr_300px] gap-6">
          <div className="space-y-4">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Sparkles className="h-4 w-4 text-cyan-400" />
                <h4 className="text-lg font-semibold text-cyan-300" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
                  Encounter Beats
                </h4>
              </div>
              <div className="space-y-3">
                {encounter.beats?.map((beat, i) => (
                  <Card key={i} className="bg-secondary/30 border-primary/10 p-4 hover:border-cyan-500/30 transition-colors">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="flex items-center justify-center w-7 h-7 rounded-full bg-gradient-to-br from-cyan-500/20 to-violet-500/20 border border-cyan-500/30">
                        <span className="text-sm font-bold text-cyan-300">{beat.number}</span>
                      </div>
                      <span className="text-sm font-semibold text-primary">Beat {beat.number}</span>
                    </div>

                    <div className="space-y-2 text-sm">
                      <div className="flex items-start gap-2">
                        <Play className="h-4 w-4 text-violet-400 mt-0.5 flex-shrink-0" />
                        <div>
                          <span className="font-semibold text-violet-300">Trigger:</span>{' '}
                          <span className="text-muted-foreground">{beat.trigger}</span>
                        </div>
                      </div>

                      <div className="flex items-start gap-2">
                        <Target className="h-4 w-4 text-amber-400 mt-0.5 flex-shrink-0" />
                        <div>
                          <span className="font-semibold text-amber-300">Challenge:</span>{' '}
                          <span className="text-muted-foreground">
                            {beat.challenge}
                            {beat.dc && <span className="text-amber-300 font-semibold"> (DC {beat.dc})</span>}
                          </span>
                        </div>
                      </div>

                      {beat.enemies && beat.enemies.length > 0 && (
                        <div className="flex items-start gap-2">
                          <Skull className="h-4 w-4 text-red-400 mt-0.5 flex-shrink-0" />
                          <div>
                            <span className="font-semibold text-red-300">Enemies:</span>{' '}
                            <span className="text-muted-foreground">{beat.enemies.join(', ')}</span>
                          </div>
                        </div>
                      )}

                      <div className="grid sm:grid-cols-2 gap-2 mt-3 pt-3 border-t border-primary/10">
                        <div className="bg-green-500/10 rounded p-2 border border-green-500/20">
                          <div className="text-xs font-semibold text-green-400 mb-1">✓ Success</div>
                          <div className="text-xs text-muted-foreground">{beat.success}</div>
                        </div>
                        <div className="bg-red-500/10 rounded p-2 border border-red-500/20">
                          <div className="text-xs font-semibold text-red-400 mb-1">✗ Failure</div>
                          <div className="text-xs text-muted-foreground">{beat.failure}</div>
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>

            {encounter.flair && (
              <Card className="bg-gradient-to-br from-violet-500/10 to-cyan-500/10 border-violet-500/30 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="h-4 w-4 text-violet-400" />
                  <h4 className="text-sm font-semibold text-violet-300">Flair</h4>
                </div>
                <p className="text-sm italic text-muted-foreground leading-relaxed">
                  {encounter.flair}
                </p>
              </Card>
            )}
          </div>

          <div className="space-y-4 lg:sticky lg:top-6 self-start">
            <Card className="bg-secondary/50 border-primary/20 p-4">
              <h4 className="text-sm font-semibold text-primary mb-3 flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Quick Reference
              </h4>

              <div className="space-y-3 text-sm">
                {allEnemies.length > 0 && (
                  <div>
                    <div className="font-semibold text-red-300 mb-1 flex items-center gap-1.5">
                      <Skull className="h-3.5 w-3.5" />
                      Enemies
                    </div>
                    <ul className="space-y-0.5">
                      {allEnemies.map((enemy, i) => (
                        <li key={i} className="text-muted-foreground pl-5">• {enemy}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {encounter.rewards && (
                  <>
                    <div className="border-t border-primary/10 pt-3">
                      <div className="font-semibold text-amber-300 mb-1 flex items-center gap-1.5">
                        <Coins className="h-3.5 w-3.5" />
                        Rewards
                      </div>
                      <div className="space-y-1 text-muted-foreground">
                        <div className="flex justify-between">
                          <span>XP:</span>
                          <span className="font-semibold text-foreground">{encounter.rewards.xp}</span>
                        </div>
                        <div>
                          <span className="font-semibold">Treasure:</span> {encounter.rewards.treasure}
                        </div>
                        <div>
                          <span className="font-semibold">Story:</span> {encounter.rewards.story}
                        </div>
                      </div>
                    </div>
                  </>
                )}

                <div className="border-t border-primary/10 pt-3">
                  <div className="font-semibold text-cyan-300 mb-1 flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5" />
                    Environment
                  </div>
                  <p className="text-muted-foreground text-xs">
                    {encounter.beats?.length || 0} phases with escalating challenges
                  </p>
                </div>
              </div>
            </Card>

            <div className="flex flex-col gap-2">
              <Button
                variant="default"
                className="w-full bg-gradient-to-r from-cyan-600 to-violet-600 hover:from-cyan-500 hover:to-violet-500 text-white border-0"
              >
                <Play className="h-4 w-4 mr-2" />
                Run in Session
              </Button>
              <Button
                variant="outline"
                className="w-full border-primary/30 hover:bg-primary/10"
              >
                <FileText className="h-4 w-4 mr-2" />
                Open in Prep Mode
              </Button>
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="flex-1 hover:bg-cyan-500/10 hover:text-cyan-300"
                  onClick={handleCopySummary}
                >
                  <Copy className="h-4 w-4 mr-1" />
                  Copy
                </Button>
                {onDelete && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="flex-1 hover:bg-red-500/10 hover:text-red-300"
                    onClick={onDelete}
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    Delete
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-500">
        <div className="absolute inset-0 shadow-[inset_0_0_20px_rgba(6,182,212,0.1)]" />
      </div>
    </Card>
  );
}
