'use client';

import { lazy, Suspense } from 'react';
import { DetailLoadingState } from '../memory-details/shared/loading-state';
import { DetailViewProps } from './types';

const NPCDetailView = lazy(() => import('./NPCDetailView'));
const HeroDetailView = lazy(() => import('./HeroDetailView'));
const VillainDetailView = lazy(() => import('./VillainDetailView'));
const MonsterDetailView = lazy(() => import('./MonsterDetailView'));
const InnTavernDetailView = lazy(() => import('./InnTavernDetailView'));
const ShopDetailView = lazy(() => import('./ShopDetailView'));
const TownDetailView = lazy(() => import('./TownDetailView'));
const ItemDetailView = lazy(() => import('./ItemDetailView'));
const LandmarkDetailView = lazy(() => import('./LandmarkDetailView'));
const NationDetailView = lazy(() => import('./NationDetailView'));
const GuildDetailView = lazy(() => import('./GuildDetailView'));
const ScrollDetailView = lazy(() => import('./ScrollDetailView'));
const EncounterDetailView = lazy(() => import('./EncounterDetailView'));
const WeatherDetailView = lazy(() => import('./WeatherDetailView'));
const TrapDetailView = lazy(() => import('./TrapDetailView'));
const BackstoryDetailView = lazy(() => import('./BackstoryDetailView'));
const OddityDetailView = lazy(() => import('./OddityDetailView'));
const PuzzleDetailView = lazy(() => import('./PuzzleDetailView'));
const GenericDetailView = lazy(() => import('./GenericDetailView'));

interface DetailViewLoaderProps extends DetailViewProps {}

export function DetailViewLoader(props: DetailViewLoaderProps) {
  const { item } = props;
  const forgeType = item.forge_type;
  const type = item.type;

  let Component = GenericDetailView;

  if (forgeType === 'npc') {
    Component = NPCDetailView;
  } else if (forgeType === 'hero') {
    Component = HeroDetailView;
  } else if (forgeType === 'villain') {
    Component = VillainDetailView;
  } else if (type === 'monster' || forgeType === 'monster') {
    Component = MonsterDetailView;
  } else if (forgeType === 'inn' || forgeType === 'tavern') {
    Component = InnTavernDetailView;
  } else if (forgeType === 'shop') {
    Component = ShopDetailView;
  } else if (type === 'location' || forgeType === 'town') {
    Component = TownDetailView;
  } else if (forgeType === 'item') {
    Component = ItemDetailView;
  } else if (forgeType === 'landmark') {
    Component = LandmarkDetailView;
  } else if (forgeType === 'nation') {
    Component = NationDetailView;
  } else if (forgeType === 'guild') {
    Component = GuildDetailView;
  } else if (forgeType === 'scroll') {
    Component = ScrollDetailView;
  } else if (forgeType === 'encounter-seq') {
    Component = EncounterDetailView;
  } else if (forgeType === 'weather') {
    Component = WeatherDetailView;
  } else if (forgeType === 'trap') {
    Component = TrapDetailView;
  } else if (forgeType === 'backstory') {
    Component = BackstoryDetailView;
  } else if (forgeType === 'oddity') {
    Component = OddityDetailView;
  } else if (forgeType === 'puzzle' || type === 'puzzle') {
    Component = PuzzleDetailView;
  }

  return (
    <Suspense fallback={<DetailLoadingState />}>
      <Component {...props} />
    </Suspense>
  );
}
