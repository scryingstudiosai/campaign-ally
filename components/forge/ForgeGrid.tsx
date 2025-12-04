'use client';

import { useState, lazy, Suspense } from 'react';
import { Loader2 } from 'lucide-react';
import { ForgeCard } from './ForgeCard';
import { ForgeDialog } from './ForgeDialog';
import { FORGE_CATEGORIES } from '@/lib/forges';
import { ForgeType } from '@/types/forge';
import { getForgeDefinition } from '@/lib/forges';
import { useRouter } from 'next/navigation';

// Lazy load all forge dialog components for better performance
const NPCForgeDialog = lazy(() => import('./NPCForgeDialog'));
const TavernForgeDialog = lazy(() => import('./TavernForgeDialog'));
const HookForgeDialog = lazy(() => import('./HookForgeDialog'));
const NameForgeDialog = lazy(() => import('./NameForgeDialog'));
const InnForgeDialog = lazy(() => import('./InnForgeDialog'));
const LandmarkForgeDialog = lazy(() => import('./LandmarkForgeDialog'));
const HeroForgeDialog = lazy(() => import('./HeroForgeDialog'));
const VillainForgeDialog = lazy(() => import('./VillainForgeDialog'));
const MonsterForgeDialog = lazy(() => import('./MonsterForgeDialog'));
const WeatherForgeDialog = lazy(() => import('./WeatherForgeDialog'));
const PuzzleForgeDialog = lazy(() => import('./PuzzleForgeDialog'));
const WildMagicForgeDialog = lazy(() => import('./WildMagicForgeDialog'));
const RandomTableForgeDialog = lazy(() => import('./RandomTableForgeDialog'));
const TownForgeDialog = lazy(() => import('./TownForgeDialog'));
const ShopForgeDialog = lazy(() => import('./ShopForgeDialog'));
const NationForgeDialog = lazy(() => import('./NationForgeDialog'));
const GuildForgeDialog = lazy(() => import('./GuildForgeDialog'));
const ItemForgeDialog = lazy(() => import('./ItemForgeDialog'));
const ScrollForgeDialog = lazy(() => import('./ScrollForgeDialog'));
const TacticalEncounterForge = lazy(() => import('./TacticalEncounterForge'));
const TrapForgeDialog = lazy(() => import('./TrapForgeDialog'));
const BackstoryForgeDialog = lazy(() => import('./BackstoryForgeDialog'));
const OdditiesForgeDialog = lazy(() => import('./OdditiesForgeDialog'));
const LootForgeDialog = lazy(() => import('./LootForgeDialog'));

// Loading fallback component
const ForgeLoading = () => (
  <div className="flex flex-col items-center justify-center p-12">
    <Loader2 className="h-10 w-10 animate-spin text-teal-500 mb-4" />
    <p className="text-gray-400 text-sm">Loading forge...</p>
  </div>
);

interface ForgeGridProps {
  campaignId: string;
}

export function ForgeGrid({ campaignId }: ForgeGridProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedForge, setSelectedForge] = useState<ForgeType | null>(null);
  const [npcDialogOpen, setNpcDialogOpen] = useState(false);
  const [tavernDialogOpen, setTavernDialogOpen] = useState(false);
  const [hookDialogOpen, setHookDialogOpen] = useState(false);
  const [nameDialogOpen, setNameDialogOpen] = useState(false);
  const [innDialogOpen, setInnDialogOpen] = useState(false);
  const [landmarkDialogOpen, setLandmarkDialogOpen] = useState(false);
  const [heroDialogOpen, setHeroDialogOpen] = useState(false);
  const [villainDialogOpen, setVillainDialogOpen] = useState(false);
  const [monsterDialogOpen, setMonsterDialogOpen] = useState(false);
  const [weatherDialogOpen, setWeatherDialogOpen] = useState(false);
  const [puzzleDialogOpen, setPuzzleDialogOpen] = useState(false);
  const [wildMagicDialogOpen, setWildMagicDialogOpen] = useState(false);
  const [randomTableDialogOpen, setRandomTableDialogOpen] = useState(false);
  const [townDialogOpen, setTownDialogOpen] = useState(false);
  const [shopDialogOpen, setShopDialogOpen] = useState(false);
  const [nationDialogOpen, setNationDialogOpen] = useState(false);
  const [guildDialogOpen, setGuildDialogOpen] = useState(false);
  const [itemDialogOpen, setItemDialogOpen] = useState(false);
  const [scrollDialogOpen, setScrollDialogOpen] = useState(false);
  const [encounterDialogOpen, setEncounterDialogOpen] = useState(false);
  const [trapDialogOpen, setTrapDialogOpen] = useState(false);
  const [backstoryDialogOpen, setBackstoryDialogOpen] = useState(false);
  const [odditiesDialogOpen, setOdditiesDialogOpen] = useState(false);
  const [lootDialogOpen, setLootDialogOpen] = useState(false);
  const router = useRouter();

  const handleForgeClick = (forgeType: ForgeType) => {
    setSelectedForge(forgeType);
    setDialogOpen(true);
  };

  const handleSuccess = (data: any) => {
    if (data.id) {
      router.push(`/app/memory`);
    }
  };

  const forgeDefinition = selectedForge ? getForgeDefinition(selectedForge) : null;

  return (
    <>
      <div className="space-y-10">
        {FORGE_CATEGORIES.map((category) => (
          <div key={category.id} className="space-y-4">
            <h2 className="text-2xl font-bold text-primary">{category.name}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {category.forges.map((forge) => {
                if (forge.type === 'npc') {
                  return (
                    <ForgeCard
                      key={forge.type}
                      forge={forge}
                      onClick={() => setNpcDialogOpen(true)}
                    />
                  );
                }
                if (forge.type === 'hero') {
                  return (
                    <ForgeCard
                      key={forge.type}
                      forge={forge}
                      onClick={() => setHeroDialogOpen(true)}
                    />
                  );
                }
                if (forge.type === 'villain') {
                  return (
                    <ForgeCard
                      key={forge.type}
                      forge={forge}
                      onClick={() => setVillainDialogOpen(true)}
                    />
                  );
                }
                if (forge.type === 'monster') {
                  return (
                    <ForgeCard
                      key={forge.type}
                      forge={forge}
                      onClick={() => setMonsterDialogOpen(true)}
                    />
                  );
                }
                if (forge.type === 'tavern') {
                  return (
                    <ForgeCard
                      key={forge.type}
                      forge={forge}
                      onClick={() => setTavernDialogOpen(true)}
                    />
                  );
                }
                if (forge.type === 'hook') {
                  return (
                    <ForgeCard
                      key={forge.type}
                      forge={forge}
                      onClick={() => setHookDialogOpen(true)}
                    />
                  );
                }
                if (forge.type === 'name') {
                  return (
                    <ForgeCard
                      key={forge.type}
                      forge={forge}
                      onClick={() => setNameDialogOpen(true)}
                    />
                  );
                }
                if (forge.type === 'backstory') {
                  return (
                    <ForgeCard
                      key={forge.type}
                      forge={forge}
                      onClick={() => setBackstoryDialogOpen(true)}
                    />
                  );
                }
                if (forge.type === 'weather') {
                  return (
                    <ForgeCard
                      key={forge.type}
                      forge={forge}
                      onClick={() => setWeatherDialogOpen(true)}
                    />
                  );
                }
                if (forge.type === 'puzzle') {
                  return (
                    <ForgeCard
                      key={forge.type}
                      forge={forge}
                      onClick={() => setPuzzleDialogOpen(true)}
                    />
                  );
                }
                if (forge.type === 'trap') {
                  return (
                    <ForgeCard
                      key={forge.type}
                      forge={forge}
                      onClick={() => setTrapDialogOpen(true)}
                    />
                  );
                }
                if (forge.type === 'random-table') {
                  return (
                    <ForgeCard
                      key={forge.type}
                      forge={forge}
                      onClick={() => setRandomTableDialogOpen(true)}
                    />
                  );
                }
                if (forge.type === 'wild-magic') {
                  return (
                    <ForgeCard
                      key={forge.type}
                      forge={forge}
                      onClick={() => setWildMagicDialogOpen(true)}
                    />
                  );
                }
                if (forge.type === 'oddity') {
                  return (
                    <ForgeCard
                      key={forge.type}
                      forge={forge}
                      onClick={() => setOdditiesDialogOpen(true)}
                    />
                  );
                }
                if (forge.type === 'inn') {
                  return (
                    <ForgeCard
                      key={forge.type}
                      forge={forge}
                      onClick={() => setInnDialogOpen(true)}
                    />
                  );
                }
                if (forge.type === 'landmark') {
                  return (
                    <ForgeCard
                      key={forge.type}
                      forge={forge}
                      onClick={() => setLandmarkDialogOpen(true)}
                    />
                  );
                }
                if (forge.type === 'town') {
                  return (
                    <ForgeCard
                      key={forge.type}
                      forge={forge}
                      onClick={() => setTownDialogOpen(true)}
                    />
                  );
                }
                if (forge.type === 'shop') {
                  return (
                    <ForgeCard
                      key={forge.type}
                      forge={forge}
                      onClick={() => setShopDialogOpen(true)}
                    />
                  );
                }
                if (forge.type === 'nation') {
                  return (
                    <ForgeCard
                      key={forge.type}
                      forge={forge}
                      onClick={() => setNationDialogOpen(true)}
                    />
                  );
                }
                if (forge.type === 'guild') {
                  return (
                    <ForgeCard
                      key={forge.type}
                      forge={forge}
                      onClick={() => setGuildDialogOpen(true)}
                    />
                  );
                }
                if (forge.type === 'item') {
                  return (
                    <ForgeCard
                      key={forge.type}
                      forge={forge}
                      onClick={() => setItemDialogOpen(true)}
                    />
                  );
                }
                if (forge.type === 'scroll') {
                  return (
                    <ForgeCard
                      key={forge.type}
                      forge={forge}
                      onClick={() => setScrollDialogOpen(true)}
                    />
                  );
                }
                if (forge.type === 'loot') {
                  return (
                    <ForgeCard
                      key={forge.type}
                      forge={forge}
                      onClick={() => setLootDialogOpen(true)}
                    />
                  );
                }
                if (forge.type === 'encounter-seq') {
                  return (
                    <ForgeCard
                      key={forge.type}
                      forge={forge}
                      onClick={() => setEncounterDialogOpen(true)}
                    />
                  );
                }
                return (
                  <ForgeCard
                    key={forge.type}
                    forge={forge}
                    onClick={() => handleForgeClick(forge.type)}
                  />
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <ForgeDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        forgeType={selectedForge}
        forgeName={forgeDefinition?.name || ''}
        campaignId={campaignId}
        onSuccess={handleSuccess}
      />

      {npcDialogOpen && (
        <Suspense fallback={<ForgeLoading />}>
          <NPCForgeDialog
            open={npcDialogOpen}
            onOpenChange={setNpcDialogOpen}
            campaignId={campaignId}
          />
        </Suspense>
      )}

      {tavernDialogOpen && (
        <Suspense fallback={<ForgeLoading />}>
          <TavernForgeDialog
            open={tavernDialogOpen}
            onOpenChange={setTavernDialogOpen}
            campaignId={campaignId}
          />
        </Suspense>
      )}

      {hookDialogOpen && (
        <Suspense fallback={<ForgeLoading />}>
          <HookForgeDialog
            open={hookDialogOpen}
            onOpenChange={setHookDialogOpen}
            campaignId={campaignId}
          />
        </Suspense>
      )}

      {nameDialogOpen && (
        <Suspense fallback={<ForgeLoading />}>
          <NameForgeDialog
            open={nameDialogOpen}
            onOpenChange={setNameDialogOpen}
            campaignId={campaignId}
          />
        </Suspense>
      )}

      {innDialogOpen && (
        <Suspense fallback={<ForgeLoading />}>
          <InnForgeDialog
            open={innDialogOpen}
            onOpenChange={setInnDialogOpen}
            campaignId={campaignId}
          />
        </Suspense>
      )}

      {landmarkDialogOpen && (
        <Suspense fallback={<ForgeLoading />}>
          <LandmarkForgeDialog
            open={landmarkDialogOpen}
            onOpenChange={setLandmarkDialogOpen}
            campaignId={campaignId}
          />
        </Suspense>
      )}

      {heroDialogOpen && (
        <Suspense fallback={<ForgeLoading />}>
          <HeroForgeDialog
            open={heroDialogOpen}
            onOpenChange={setHeroDialogOpen}
            campaignId={campaignId}
          />
        </Suspense>
      )}

      {villainDialogOpen && (
        <Suspense fallback={<ForgeLoading />}>
          <VillainForgeDialog
            open={villainDialogOpen}
            onOpenChange={setVillainDialogOpen}
            campaignId={campaignId}
          />
        </Suspense>
      )}

      {monsterDialogOpen && (
        <Suspense fallback={<ForgeLoading />}>
          <MonsterForgeDialog
            open={monsterDialogOpen}
            onOpenChange={setMonsterDialogOpen}
            campaignId={campaignId}
          />
        </Suspense>
      )}

      {weatherDialogOpen && (
        <Suspense fallback={<ForgeLoading />}>
          <WeatherForgeDialog
            open={weatherDialogOpen}
            onOpenChange={setWeatherDialogOpen}
            campaignId={campaignId}
          />
        </Suspense>
      )}

      {puzzleDialogOpen && (
        <Suspense fallback={<ForgeLoading />}>
          <PuzzleForgeDialog
            open={puzzleDialogOpen}
            onOpenChange={setPuzzleDialogOpen}
            campaignId={campaignId}
          />
        </Suspense>
      )}

      {wildMagicDialogOpen && (
        <Suspense fallback={<ForgeLoading />}>
          <WildMagicForgeDialog
            open={wildMagicDialogOpen}
            onOpenChange={setWildMagicDialogOpen}
            campaignId={campaignId}
          />
        </Suspense>
      )}

      {randomTableDialogOpen && (
        <Suspense fallback={<ForgeLoading />}>
          <RandomTableForgeDialog
            open={randomTableDialogOpen}
            onOpenChange={setRandomTableDialogOpen}
            campaignId={campaignId}
          />
        </Suspense>
      )}

      {townDialogOpen && (
        <Suspense fallback={<ForgeLoading />}>
          <TownForgeDialog
            open={townDialogOpen}
            onOpenChange={setTownDialogOpen}
            campaignId={campaignId}
          />
        </Suspense>
      )}

      {shopDialogOpen && (
        <Suspense fallback={<ForgeLoading />}>
          <ShopForgeDialog
            open={shopDialogOpen}
            onOpenChange={setShopDialogOpen}
            campaignId={campaignId}
          />
        </Suspense>
      )}

      {nationDialogOpen && (
        <Suspense fallback={<ForgeLoading />}>
          <NationForgeDialog
            open={nationDialogOpen}
            onOpenChange={setNationDialogOpen}
            campaignId={campaignId}
          />
        </Suspense>
      )}

      {guildDialogOpen && (
        <Suspense fallback={<ForgeLoading />}>
          <GuildForgeDialog
            open={guildDialogOpen}
            onOpenChange={setGuildDialogOpen}
            campaignId={campaignId}
          />
        </Suspense>
      )}

      {itemDialogOpen && (
        <Suspense fallback={<ForgeLoading />}>
          <ItemForgeDialog
            open={itemDialogOpen}
            onOpenChange={setItemDialogOpen}
            campaignId={campaignId}
          />
        </Suspense>
      )}

      {scrollDialogOpen && (
        <Suspense fallback={<ForgeLoading />}>
          <ScrollForgeDialog
            open={scrollDialogOpen}
            onOpenChange={setScrollDialogOpen}
            campaignId={campaignId}
          />
        </Suspense>
      )}

      {encounterDialogOpen && (
        <Suspense fallback={<ForgeLoading />}>
          <TacticalEncounterForge
            open={encounterDialogOpen}
            onOpenChange={setEncounterDialogOpen}
            campaignId={campaignId}
          />
        </Suspense>
      )}

      {trapDialogOpen && (
        <Suspense fallback={<ForgeLoading />}>
          <TrapForgeDialog
            open={trapDialogOpen}
            onOpenChange={setTrapDialogOpen}
            campaignId={campaignId}
          />
        </Suspense>
      )}

      {backstoryDialogOpen && (
        <Suspense fallback={<ForgeLoading />}>
          <BackstoryForgeDialog
            open={backstoryDialogOpen}
            onOpenChange={setBackstoryDialogOpen}
            campaignId={campaignId}
          />
        </Suspense>
      )}

      {odditiesDialogOpen && (
        <Suspense fallback={<ForgeLoading />}>
          <OdditiesForgeDialog
            open={odditiesDialogOpen}
            onOpenChange={setOdditiesDialogOpen}
            campaignId={campaignId}
          />
        </Suspense>
      )}

      {lootDialogOpen && (
        <Suspense fallback={<ForgeLoading />}>
          <LootForgeDialog
            open={lootDialogOpen}
            onOpenChange={setLootDialogOpen}
            campaignId={campaignId}
          />
        </Suspense>
      )}
    </>
  );
}
