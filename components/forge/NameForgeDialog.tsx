'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { User, Sparkles, Copy, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface NameForgeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campaignId: string;
}

const NAME_ORIGINS = [
  { value: 'fantasy', label: 'Fantasy' },
  { value: 'human', label: 'Human' },
  { value: 'elven', label: 'Elven' },
  { value: 'dwarven', label: 'Dwarven' },
  { value: 'orcish', label: 'Orcish' },
  { value: 'halfling', label: 'Halfling' },
  { value: 'dragonborn', label: 'Dragonborn' },
  { value: 'tiefling', label: 'Tiefling' },
  { value: 'gnomish', label: 'Gnomish' },
];

const GENDERS = [
  { value: 'any', label: 'Any' },
  { value: 'masculine', label: 'Masculine' },
  { value: 'feminine', label: 'Feminine' },
  { value: 'neutral', label: 'Neutral' },
];

export default function NameForgeDialog({ open, onOpenChange, campaignId }: NameForgeDialogProps) {
  const [origin, setOrigin] = useState('fantasy');
  const [gender, setGender] = useState('any');
  const [generatedNames, setGeneratedNames] = useState<string[]>([]);
  const { toast } = useToast();

  const generateNames = (surpriseMe: boolean = false) => {
    const names: string[] = [];
    const count = 8;

    const useOrigin = surpriseMe ? NAME_ORIGINS[Math.floor(Math.random() * NAME_ORIGINS.length)].value : origin;
    const useGender = surpriseMe ? GENDERS[Math.floor(Math.random() * GENDERS.length)].value : gender;

    for (let i = 0; i < count; i++) {
      const name = generateSingleName(useOrigin, useGender);
      names.push(name);
    }

    setGeneratedNames(names);
  };

  const generateSingleName = (origin: string, gender: string): string => {
    const syllables = getSyllablesForOrigin(origin, gender);
    const nameLength = Math.floor(Math.random() * 2) + 2;
    let name = '';

    for (let i = 0; i < nameLength; i++) {
      const syllable = syllables[Math.floor(Math.random() * syllables.length)];
      name += i === 0 ? syllable.charAt(0).toUpperCase() + syllable.slice(1) : syllable;
    }

    return name;
  };

  const getSyllablesForOrigin = (origin: string, gender: string): string[] => {
    const syllableSets: Record<string, string[]> = {
      fantasy: ['ara', 'bel', 'cor', 'del', 'eld', 'far', 'gal', 'hor', 'ith', 'jor', 'kal', 'lor', 'mor', 'nar', 'oth', 'pel', 'qua', 'ral', 'sar', 'thal', 'uth', 'val', 'wis', 'xan', 'yor', 'zel'],
      human: ['an', 'ben', 'cal', 'den', 'el', 'fer', 'gar', 'han', 'ian', 'jon', 'kar', 'len', 'mar', 'ner', 'ol', 'per', 'ran', 'ser', 'tar', 'van', 'wil', 'zan'],
      elven: ['ael', 'the', 'las', 'sil', 'fin', 'gal', 'len', 'mir', 'nal', 'orn', 'riel', 'tir', 'wen', 'aer', 'cir', 'dor', 'eth', 'lor', 'rin'],
      dwarven: ['bor', 'dor', 'gar', 'grim', 'thor', 'bral', 'drak', 'fal', 'kal', 'mor', 'nar', 'rok', 'thar', 'vor', 'zar'],
      orcish: ['grak', 'throk', 'mog', 'gor', 'drog', 'gul', 'nazg', 'rak', 'sha', 'urk', 'zog', 'bur', 'dum', 'ghash', 'lug'],
      halfling: ['bil', 'bun', 'dun', 'fil', 'mer', 'pip', 'sam', 'tod', 'wil', 'bag', 'cot', 'far', 'green', 'ham', 'took'],
      dragonborn: ['ara', 'bel', 'drak', 'esh', 'fen', 'ghar', 'hed', 'kal', 'lorn', 'mar', 'nar', 'oth', 'rex', 'sham', 'thor', 'vor', 'zar'],
      tiefling: ['aza', 'bel', 'dam', 'dis', 'era', 'graz', 'ith', 'lil', 'meph', 'neth', 'paz', 'raz', 'sab', 'tav', 'zar'],
      gnomish: ['bim', 'dim', 'fim', 'gim', 'nim', 'pim', 'rim', 'sim', 'tim', 'wim', 'bel', 'fon', 'jib', 'nib', 'wick'],
    };

    return syllableSets[origin] || syllableSets.fantasy;
  };

  const handleCopy = (name: string) => {
    navigator.clipboard.writeText(name);
    toast({
      title: 'Copied to clipboard',
      description: `"${name}" copied successfully`,
    });
  };

  const handleCopyAll = () => {
    const allNames = generatedNames.join('\n');
    navigator.clipboard.writeText(allNames);
    toast({
      title: 'Copied to clipboard',
      description: 'All names copied successfully',
    });
  };

  const handleClose = () => {
    setOrigin('fantasy');
    setGender('any');
    setGeneratedNames([]);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <User className="h-5 w-5 text-primary" />
            <DialogTitle>Name Forge</DialogTitle>
          </div>
          <DialogDescription>
            Generate random names for any character
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name-origin">Origin</Label>
            <Select value={origin} onValueChange={setOrigin}>
              <SelectTrigger id="name-origin">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {NAME_ORIGINS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="name-gender">Gender Style</Label>
            <Select value={gender} onValueChange={setGender}>
              <SelectTrigger id="name-gender">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {GENDERS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {generatedNames.length === 0 && (
            <div className="flex gap-2 justify-end">
              <Button
                onClick={handleClose}
                variant="ghost"
              >
                Cancel
              </Button>
              <Button
                onClick={() => generateNames(true)}
                variant="outline"
              >
                <Sparkles className="h-4 w-4 mr-2" />
                Surprise Me
              </Button>
              <Button
                onClick={() => generateNames(false)}
              >
                Generate Names
              </Button>
            </div>
          )}

          {generatedNames.length > 0 && (
            <>
              <Separator />

              <div className="space-y-3 bg-secondary/30 rounded-lg p-4 border border-primary/20">
                <div className="flex items-center justify-between mb-3">
                  <div className="font-semibold text-lg">Generated Names</div>
                  <Button size="sm" variant="ghost" onClick={handleCopyAll}>
                    <Copy className="h-4 w-4 mr-1" />
                    Copy All
                  </Button>
                </div>
                <div className="space-y-2">
                  {generatedNames.map((name, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between bg-background/50 rounded px-3 py-2 border border-border/40"
                    >
                      <span className="font-medium">{name}</span>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleCopy(name)}
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex gap-2 justify-end">
                <Button
                  onClick={() => generateNames(false)}
                  variant="outline"
                  size="sm"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Generate More
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
