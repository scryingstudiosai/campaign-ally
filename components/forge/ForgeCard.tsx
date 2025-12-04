'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ForgeDefinition } from '@/types/forge';
import { User, Users, Skull, Bug, Home, Store, Flag, Sparkles, Wand, Coins, Swords, Hotel, Landmark, Cloud, Dices, Zap, Puzzle } from 'lucide-react';

const iconMap: Record<string, any> = {
  User,
  Users,
  Skull,
  Bug,
  Home,
  Store,
  Flag,
  Sparkles,
  Wand,
  Coins,
  Swords,
  Hotel,
  Landmark,
  Cloud,
  Puzzle,
  Dices,
  Zap,
};

interface ForgeCardProps {
  forge: ForgeDefinition;
  onClick: () => void;
}

export function ForgeCard({ forge, onClick }: ForgeCardProps) {
  const Icon = iconMap[forge.icon] || User;

  return (
    <Card
      className="group cursor-pointer hover:border-primary/50 transition-all duration-200 hover:shadow-lg hover:scale-[1.02]"
      onClick={onClick}
    >
      <CardHeader className="pb-3">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg group-hover:bg-primary/20 transition-colors">
            <Icon className="h-5 w-5 text-primary" />
          </div>
          <CardTitle className="text-lg group-hover:text-primary transition-colors">{forge.name}</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <CardDescription className="text-sm">{forge.description}</CardDescription>
      </CardContent>
    </Card>
  );
}
