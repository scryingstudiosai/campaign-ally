'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Eye,
  Calendar,
  Copy,
  RefreshCw,
  ChevronDown,
  Check,
  Plus,
  Users,
  X,
} from 'lucide-react';
import { DifficultyBadge } from './DifficultyBadge';
import { MonsterStatBlock } from './MonsterStatBlock';
import { PhaseCard } from './PhaseCard';
import { useToast } from '@/hooks/use-toast';
import { formatEncounterAsMarkdown } from '@/lib/encounter-calculator';
import { supabase } from '@/lib/supabase/client';

interface TacticalEncounterDisplayProps {
  encounter: any;
  campaignId: string;
  onClose?: () => void;
}

export function TacticalEncounterDisplay({
  encounter,
  campaignId,
  onClose
}: TacticalEncounterDisplayProps) {
  const { toast } = useToast();
  const [generatedMonsters, setGeneratedMonsters] = useState<string[]>([]);
  const [generatingMonster, setGeneratingMonster] = useState<string | null>(null);

  const handleViewInMemory = () => {
    window.location.href = '/app/memory';
  };

  const handleCopyToClipboard = async () => {
    try {
      const markdown = formatEncounterAsMarkdown(encounter);
      await navigator.clipboard.writeText(markdown);

      toast({
        title: 'Copied to clipboard!',
        description: 'Encounter formatted as markdown',
      });
    } catch (error) {
      toast({
        title: 'Failed to copy',
        variant: 'destructive',
      });
    }
  };

  const handleGenerateMonster = async (monster: any) => {
    if (generatedMonsters.includes(monster.name)) return;

    setGeneratingMonster(monster.name);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const response = await fetch('/api/memory', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          title: `${monster.name} (${monster.quantity}×)`,
          type: 'monster',
          forge_type: 'monster',
          content: monster,
          campaign_id: campaignId,
          tags: ['monster', `cr-${monster.cr}`, monster.type],
        }),
      });

      if (!response.ok) throw new Error('Failed to generate');

      setGeneratedMonsters(prev => [...prev, monster.name]);

      toast({
        title: 'Monster added to Memory!',
        description: monster.name,
      });
    } catch (error) {
      console.error('Generate monster error:', error);
      toast({
        title: 'Failed to generate monster',
        variant: 'destructive',
      });
    } finally {
      setGeneratingMonster(null);
    }
  };

  const handleGenerateAllMonsters = async () => {
    if (!encounter.monsters) return;

    for (const monster of encounter.monsters) {
      if (!generatedMonsters.includes(monster.name)) {
        await handleGenerateMonster(monster);
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="space-y-2">
          <h2 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-violet-400">
            {encounter.name}
          </h2>
          <div className="flex flex-wrap items-center gap-2">
            <DifficultyBadge difficulty={encounter.difficulty} />
            <Badge variant="outline" className="bg-cyan-950/30 text-cyan-300 border-cyan-700/30">
              {encounter.partySize} × Level {encounter.partyLevel}
            </Badge>
          </div>
        </div>
      </div>

      <Card className="bg-gradient-to-r from-cyan-950/20 via-violet-950/20 to-cyan-950/20 border-cyan-700/30 p-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <div className="text-sm text-muted-foreground">Party</div>
            <div className="text-lg font-bold text-cyan-400">
              {encounter.partySize} × Lvl {encounter.partyLevel}
            </div>
          </div>
          <div>
            <div className="text-sm text-muted-foreground">XP Budget</div>
            <div className="text-lg font-bold text-foreground">
              {encounter.xpCalculation?.adjustedXP || 0}
            </div>
          </div>
          <div>
            <div className="text-sm text-muted-foreground">Difficulty</div>
            <div className="text-lg font-bold text-foreground capitalize">
              {encounter.difficulty}
            </div>
          </div>
          <div>
            <div className="text-sm text-muted-foreground">Duration</div>
            <div className="text-lg font-bold text-foreground">
              {encounter.dmNotes?.timeEstimate || '~30-45 min'}
            </div>
          </div>
        </div>
      </Card>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">📋 Overview</TabsTrigger>
          <TabsTrigger value="combat">⚔️ Combat</TabsTrigger>
          <TabsTrigger value="monsters">👹 Monsters</TabsTrigger>
          <TabsTrigger value="dm-notes">📝 DM Notes</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <Card className="bg-secondary/30 border-primary/20 p-6">
            <h3 className="text-xl font-bold text-cyan-400 mb-4">Overview</h3>
            <p className="text-foreground leading-relaxed whitespace-pre-wrap">
              {encounter.overview}
            </p>
          </Card>

          {encounter.positioning && (
            <Card className="bg-secondary/30 border-primary/20 p-6">
              <h3 className="text-xl font-bold text-cyan-400 mb-4">Initial Positioning</h3>
              <div className="text-foreground leading-relaxed whitespace-pre-wrap">
                {encounter.positioning}
              </div>
            </Card>
          )}

          {encounter.terrainFeatures && encounter.terrainFeatures.length > 0 && (
            <Card className="bg-secondary/30 border-primary/20 p-6">
              <h3 className="text-xl font-bold text-cyan-400 mb-4">Terrain Features</h3>
              <div className="space-y-3">
                {encounter.terrainFeatures.map((feature: any, idx: number) => (
                  <div key={idx} className="bg-cyan-950/20 border border-cyan-700/30 rounded-lg p-3">
                    <div className="font-bold text-cyan-300">{feature.name}</div>
                    <div className="text-sm text-foreground mt-1">{feature.mechanicalEffect}</div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {encounter.flair && (
            <Card className="bg-gradient-to-br from-violet-950/30 to-cyan-950/30 border-violet-700/30 p-6">
              <p className="text-foreground italic leading-relaxed">
                {encounter.flair}
              </p>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="combat" className="space-y-6">
          {encounter.phases && encounter.phases.map((phase: any, idx: number) => (
            <PhaseCard key={idx} phase={phase} phaseNumber={idx + 1} />
          ))}

          {encounter.triggers && encounter.triggers.length > 0 && (
            <Card className="bg-amber-950/20 border-amber-700/30 p-6">
              <h3 className="text-xl font-bold text-amber-400 mb-4">Triggers & Conditions</h3>
              <div className="space-y-3">
                {encounter.triggers.map((trigger: any, idx: number) => (
                  <div key={idx} className="bg-amber-950/30 border border-amber-700/30 rounded-lg p-3">
                    <div className="font-bold text-amber-300">{trigger.condition}</div>
                    <div className="text-sm text-foreground mt-1">{trigger.effect}</div>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="monsters" className="space-y-6">
          {encounter.monsters && encounter.monsters.map((monster: any, idx: number) => (
            <Card key={idx} className="bg-gradient-to-br from-red-950/20 to-amber-950/20 border-red-700/30 p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-2xl font-bold text-red-400">
                    {monster.name} × {monster.quantity}
                  </h3>
                  {monster.role && (
                    <p className="text-sm text-muted-foreground mt-1">Role: {monster.role}</p>
                  )}
                </div>

                <Button
                  onClick={() => handleGenerateMonster(monster)}
                  disabled={generatedMonsters.includes(monster.name) || generatingMonster === monster.name}
                  className={
                    generatedMonsters.includes(monster.name)
                      ? 'bg-green-600 hover:bg-green-700'
                      : 'bg-cyan-600 hover:bg-cyan-700'
                  }
                  size="sm"
                >
                  {generatingMonster === monster.name ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-1 animate-spin" />
                      Generating...
                    </>
                  ) : generatedMonsters.includes(monster.name) ? (
                    <>
                      <Check className="w-4 h-4 mr-1" />
                      In Memory
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4 mr-1" />
                      Add to Memory
                    </>
                  )}
                </Button>
              </div>

              <div className="flex flex-wrap gap-4 text-sm mb-4 pb-4 border-b border-red-700/30">
                <span><strong>AC</strong> {monster.ac}</span>
                <span><strong>HP</strong> {monster.hp}</span>
                <span><strong>Speed</strong> {monster.speed}ft</span>
                <span><strong>CR</strong> {monster.cr}</span>
              </div>

              {monster.positioning && (
                <div className="mb-4">
                  <h4 className="font-bold text-red-300 mb-2">Positioning:</h4>
                  <p className="text-sm text-foreground">{monster.positioning}</p>
                </div>
              )}

              {monster.tactics && (
                <div className="mb-4">
                  <h4 className="font-bold text-red-300 mb-2">Tactics:</h4>
                  <div className="space-y-2 text-sm">
                    <div>
                      <span className="font-semibold text-red-200">Initial Round:</span>{' '}
                      {monster.tactics.initialRound}
                    </div>
                    <div>
                      <span className="font-semibold text-red-200">Strategy:</span>{' '}
                      {monster.tactics.combatStrategy}
                    </div>
                    {monster.tactics.ifBloodied && (
                      <div>
                        <span className="font-semibold text-red-200">If Bloodied:</span>{' '}
                        {monster.tactics.ifBloodied}
                      </div>
                    )}
                    {monster.tactics.retreatCondition && (
                      <div>
                        <span className="font-semibold text-red-200">Retreat:</span>{' '}
                        {monster.tactics.retreatCondition}
                      </div>
                    )}
                  </div>
                </div>
              )}

              <Collapsible>
                <CollapsibleTrigger className="flex items-center gap-2 text-cyan-400 hover:text-cyan-300 transition-colors">
                  <ChevronDown className="w-4 h-4" />
                  View Full Stat Block
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-4">
                  <MonsterStatBlock {...monster} />
                </CollapsibleContent>
              </Collapsible>
            </Card>
          ))}

          {encounter.monsters && encounter.monsters.length > 0 && (
            <Button
              onClick={handleGenerateAllMonsters}
              disabled={generatedMonsters.length === encounter.monsters.length}
              className="w-full"
              variant="outline"
            >
              <Users className="w-4 h-4 mr-2" />
              Generate All Monsters to Memory ({generatedMonsters.length}/{encounter.monsters.length})
            </Button>
          )}
        </TabsContent>

        <TabsContent value="dm-notes" className="space-y-6">
          {encounter.dmNotes && (
            <>
              <Card className="bg-secondary/30 border-primary/20 p-6">
                <h3 className="text-xl font-bold text-cyan-400 mb-4">Running This Encounter</h3>
                <div className="space-y-4 text-sm">
                  {encounter.dmNotes.keyMoments && (
                    <div>
                      <div className="font-bold text-cyan-300 mb-2">Key Moments:</div>
                      <p className="text-foreground">{encounter.dmNotes.keyMoments}</p>
                    </div>
                  )}
                  {encounter.dmNotes.monsterPsychology && (
                    <div>
                      <div className="font-bold text-cyan-300 mb-2">Monster Psychology:</div>
                      <p className="text-foreground">{encounter.dmNotes.monsterPsychology}</p>
                    </div>
                  )}
                  {encounter.dmNotes.commonTactics && (
                    <div>
                      <div className="font-bold text-cyan-300 mb-2">Common Tactics:</div>
                      <p className="text-foreground">{encounter.dmNotes.commonTactics}</p>
                    </div>
                  )}
                  {encounter.dmNotes.counters && (
                    <div>
                      <div className="font-bold text-cyan-300 mb-2">Counters:</div>
                      <p className="text-foreground">{encounter.dmNotes.counters}</p>
                    </div>
                  )}
                </div>
              </Card>

              {encounter.dmNotes.scaling && (
                <Card className="bg-secondary/30 border-primary/20 p-6">
                  <h3 className="text-xl font-bold text-cyan-400 mb-4">Adjusting Difficulty</h3>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="bg-green-950/30 border border-green-700/30 rounded-lg p-4">
                      <h4 className="font-bold text-green-400 mb-3">Make Easier:</h4>
                      <ul className="space-y-2 text-sm">
                        {encounter.dmNotes.scaling.easier?.map((tip: string, idx: number) => (
                          <li key={idx} className="text-foreground">• {tip}</li>
                        ))}
                      </ul>
                    </div>
                    <div className="bg-red-950/30 border border-red-700/30 rounded-lg p-4">
                      <h4 className="font-bold text-red-400 mb-3">Make Harder:</h4>
                      <ul className="space-y-2 text-sm">
                        {encounter.dmNotes.scaling.harder?.map((tip: string, idx: number) => (
                          <li key={idx} className="text-foreground">• {tip}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </Card>
              )}

              {encounter.dmNotes.aftermath && (
                <Card className="bg-secondary/30 border-primary/20 p-6">
                  <h3 className="text-xl font-bold text-cyan-400 mb-4">Aftermath</h3>
                  <div className="space-y-3 text-sm">
                    {encounter.dmNotes.aftermath.victory && (
                      <div>
                        <div className="font-bold text-green-300 mb-1">Victory:</div>
                        <p className="text-foreground">{encounter.dmNotes.aftermath.victory}</p>
                      </div>
                    )}
                    {encounter.dmNotes.aftermath.defeat && (
                      <div>
                        <div className="font-bold text-red-300 mb-1">Defeat:</div>
                        <p className="text-foreground">{encounter.dmNotes.aftermath.defeat}</p>
                      </div>
                    )}
                    {encounter.dmNotes.aftermath.investigation && (
                      <div>
                        <div className="font-bold text-cyan-300 mb-1">Investigation:</div>
                        <p className="text-foreground">{encounter.dmNotes.aftermath.investigation}</p>
                      </div>
                    )}
                  </div>
                </Card>
              )}

              {encounter.loot && (
                <Card className="bg-amber-950/20 border-amber-700/30 p-6">
                  <h3 className="text-xl font-bold text-amber-400 mb-4">Loot & Treasure</h3>
                  <div className="space-y-3 text-sm">
                    {encounter.loot.onEnemies && (
                      <div>
                        <div className="font-bold text-amber-300 mb-1">On Enemies:</div>
                        <p className="text-foreground">{encounter.loot.onEnemies}</p>
                      </div>
                    )}
                    {encounter.loot.environmental && (
                      <div>
                        <div className="font-bold text-amber-300 mb-1">Environmental:</div>
                        <p className="text-foreground">{encounter.loot.environmental}</p>
                      </div>
                    )}
                    {encounter.loot.totalValue && (
                      <div>
                        <div className="font-bold text-amber-300 mb-1">Total Value:</div>
                        <p className="text-foreground">{encounter.loot.totalValue}</p>
                      </div>
                    )}
                  </div>
                </Card>
              )}
            </>
          )}
        </TabsContent>
      </Tabs>

      <div className="flex flex-wrap gap-3 pt-6 border-t border-primary/20">
        <Button
          onClick={handleViewInMemory}
          className="bg-gradient-to-r from-cyan-600 to-violet-600 hover:from-cyan-500 hover:to-violet-500"
        >
          <Eye className="w-4 h-4 mr-2" />
          View in Memory
        </Button>

        <Button onClick={handleCopyToClipboard} variant="outline">
          <Copy className="w-4 h-4 mr-2" />
          Copy to Clipboard
        </Button>

        {onClose && (
          <Button onClick={onClose} variant="outline">
            <X className="w-4 h-4 mr-2" />
            Close
          </Button>
        )}
      </div>
    </div>
  );
}
