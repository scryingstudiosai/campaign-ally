'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, Swords } from 'lucide-react';

interface EncounterForgeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onGenerate: (params: EncounterParams) => Promise<void>;
  campaignId: string;
}

export interface EncounterParams {
  campaignId: string;
  encounterName?: string;
  concept: string;
  partySize: number;
  partyLevel: number;
  difficulty: 'trivial' | 'easy' | 'medium' | 'hard' | 'deadly';
  combatType: 'single' | 'multiple' | 'dynamic' | 'boss';
  environment: string;
  respectCodex: boolean;
}

export function EncounterForgeDialog({
  open,
  onOpenChange,
  onGenerate,
  campaignId
}: EncounterForgeDialogProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [encounterName, setEncounterName] = useState('');
  const [concept, setConcept] = useState('');
  const [partySize, setPartySize] = useState('4');
  const [partyLevel, setPartyLevel] = useState('5');
  const [difficulty, setDifficulty] = useState('medium');
  const [combatType, setCombatType] = useState('single');
  const [environment, setEnvironment] = useState('open');
  const [respectCodex, setRespectCodex] = useState(true);

  const handleGenerate = async () => {
    if (!concept.trim()) {
      return;
    }

    setIsGenerating(true);
    try {
      await onGenerate({
        campaignId,
        encounterName: encounterName.trim() || undefined,
        concept: concept.trim(),
        partySize: parseInt(partySize),
        partyLevel: parseInt(partyLevel),
        difficulty: difficulty as any,
        combatType: combatType as any,
        environment,
        respectCodex
      });

      setEncounterName('');
      setConcept('');
      onOpenChange(false);
    } catch (error) {
      console.error('Generate encounter error:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl">
            <Swords className="w-6 h-6 text-cyan-400" />
            Encounter Forge
          </DialogTitle>
          <DialogDescription>
            Design tactical encounters with monster stat blocks, phased combat, and strategic depth
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <section className="space-y-4">
            <h3 className="text-sm font-semibold text-cyan-400 uppercase tracking-wide">
              Basic Information
            </h3>

            <div className="space-y-2">
              <Label htmlFor="encounter-name">Encounter Name (Optional)</Label>
              <Input
                id="encounter-name"
                placeholder="e.g., Goblin Ambush at Dawnridge Hollow"
                value={encounterName}
                onChange={(e) => setEncounterName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="concept">Concept *</Label>
              <Textarea
                id="concept"
                placeholder="Describe the encounter concept: goblin ambush on merchant road, cultist ritual in abandoned temple, bandits defending their hideout, etc."
                value={concept}
                onChange={(e) => setConcept(e.target.value)}
                rows={3}
              />
            </div>
          </section>

          <section className="space-y-4">
            <h3 className="text-sm font-semibold text-cyan-400 uppercase tracking-wide">
              Party Information
            </h3>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="party-size">Party Size</Label>
                <Select value={partySize} onValueChange={setPartySize}>
                  <SelectTrigger id="party-size">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[2, 3, 4, 5, 6, 7, 8].map((size) => (
                      <SelectItem key={size} value={size.toString()}>
                        {size} players
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="party-level">Party Level</Label>
                <Select value={partyLevel} onValueChange={setPartyLevel}>
                  <SelectTrigger id="party-level">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 20 }, (_, i) => i + 1).map((level) => (
                      <SelectItem key={level} value={level.toString()}>
                        Level {level}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="difficulty">Difficulty Target</Label>
              <Select value={difficulty} onValueChange={setDifficulty}>
                <SelectTrigger id="difficulty">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="trivial">Trivial (Warm-up fight)</SelectItem>
                  <SelectItem value="easy">Easy (Low resource drain)</SelectItem>
                  <SelectItem value="medium">Medium (Moderate challenge)</SelectItem>
                  <SelectItem value="hard">Hard (Tough but fair)</SelectItem>
                  <SelectItem value="deadly">Deadly (Life-threatening)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Based on D&D 5e XP budgets and encounter multipliers
              </p>
            </div>
          </section>

          <section className="space-y-4">
            <h3 className="text-sm font-semibold text-cyan-400 uppercase tracking-wide">
              Encounter Structure
            </h3>

            <div className="space-y-2">
              <Label htmlFor="combat-type">Combat Type</Label>
              <Select value={combatType} onValueChange={setCombatType}>
                <SelectTrigger id="combat-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="single">Single Wave (all enemies at once)</SelectItem>
                  <SelectItem value="multiple">Multiple Waves (enemies in phases)</SelectItem>
                  <SelectItem value="dynamic">Dynamic (condition-based arrivals)</SelectItem>
                  <SelectItem value="boss">Boss Fight (powerful enemy + minions)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="environment">Environment Type</Label>
              <Select value={environment} onValueChange={setEnvironment}>
                <SelectTrigger id="environment">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="open">Open Terrain (plains, road, clearing)</SelectItem>
                  <SelectItem value="dense">Dense Cover (forest, ruins, urban)</SelectItem>
                  <SelectItem value="vertical">Vertical (cliffs, towers, multi-level)</SelectItem>
                  <SelectItem value="hazardous">Hazardous (lava, traps, dangers)</SelectItem>
                  <SelectItem value="enclosed">Enclosed (dungeon, cave, building)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </section>

          <div className="flex items-center space-x-2 pt-2">
            <Checkbox
              id="respect-codex"
              checked={respectCodex}
              onCheckedChange={(checked) => setRespectCodex(checked as boolean)}
            />
            <Label
              htmlFor="respect-codex"
              className="text-sm font-normal cursor-pointer"
            >
              Respect campaign codex (incorporate setting themes and factions)
            </Label>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isGenerating}
          >
            Cancel
          </Button>
          <Button
            onClick={handleGenerate}
            disabled={isGenerating || !concept.trim()}
            className="bg-gradient-to-r from-cyan-600 to-violet-600 hover:from-cyan-500 hover:to-violet-500"
          >
            {isGenerating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Forging Encounter...
              </>
            ) : (
              <>
                <Swords className="mr-2 h-4 w-4" />
                Generate Encounter
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
