/*
  # Add Campaign Codex

  1. New Tables
    - `campaign_codex`
      - `id` (uuid, primary key)
      - `campaign_id` (uuid, unique, foreign key to campaigns)
      - `premise` (text) - Core premise of the campaign
      - `elevator_pitch` (text) - Quick summary
      - `themes` (text[]) - Major themes (e.g., redemption, betrayal)
      - `tone` (jsonb) - Mood, humor level, violence level
      - `pillars` (text[]) - Core pillars (combat, exploration, roleplay, etc.)
      - `style_guide` (text) - Writing style guidelines
      - `narrative_voice` (text) - POV preference
      - `pacing_preference` (text) - Campaign pacing
      - `house_rules` (text) - Custom rules
      - `banned_content` (text[]) - Content to avoid
      - `allowed_sources` (text[]) - Approved source books
      - `factions` (jsonb) - Array of faction objects
      - `major_arcs` (jsonb) - Array of story arc objects
      - `timeline` (jsonb) - Array of timeline events
      - `foreshadowing` (jsonb) - Array of foreshadowing seeds
      - `open_questions` (text[]) - Unresolved plot threads
      - `player_secrets` (jsonb) - Secret info per player
      - `last_canon_check` (timestamptz) - Last canon review
      - `version` (int) - Version tracking
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on `campaign_codex` table
    - Add policy for campaign owners to manage their codex

  3. Triggers
    - Auto-increment version on update
    - Auto-update updated_at timestamp
*/

-- Campaign Codex (one per campaign)
create table if not exists public.campaign_codex (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid unique not null references public.campaigns(id) on delete cascade,

  -- Core Identity
  premise text,
  elevator_pitch text,
  themes text[] default '{}',
  tone jsonb default '{"mood":"balanced","humor_level":"medium","violence":"medium"}',
  pillars text[] default '{}',

  -- Style & Voice
  style_guide text,
  narrative_voice text check (narrative_voice in ('first_person','third_person_limited','third_person_omniscient','cinematic')),
  pacing_preference text check (pacing_preference in ('slow_burn','balanced','action_packed')),

  -- Rules & Canon
  house_rules text,
  banned_content text[] default '{}',
  allowed_sources text[] default '{}',

  -- World Structure
  factions jsonb default '[]',
  major_arcs jsonb default '[]',
  timeline jsonb default '[]',

  -- DM Tools
  foreshadowing jsonb default '[]',
  open_questions text[] default '{}',
  player_secrets jsonb default '{}',

  -- Meta
  last_canon_check timestamptz,
  version int default 1,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- RLS
alter table public.campaign_codex enable row level security;

create policy "Campaign owners can view their codex"
  on public.campaign_codex
  for select
  to authenticated
  using (
    exists(
      select 1 from public.campaigns c 
      where c.id = campaign_id 
      and c.user_id = auth.uid()
    )
  );

create policy "Campaign owners can insert their codex"
  on public.campaign_codex
  for insert
  to authenticated
  with check (
    exists(
      select 1 from public.campaigns c 
      where c.id = campaign_id 
      and c.user_id = auth.uid()
    )
  );

create policy "Campaign owners can update their codex"
  on public.campaign_codex
  for update
  to authenticated
  using (
    exists(
      select 1 from public.campaigns c 
      where c.id = campaign_id 
      and c.user_id = auth.uid()
    )
  )
  with check (
    exists(
      select 1 from public.campaigns c 
      where c.id = campaign_id 
      and c.user_id = auth.uid()
    )
  );

create policy "Campaign owners can delete their codex"
  on public.campaign_codex
  for delete
  to authenticated
  using (
    exists(
      select 1 from public.campaigns c 
      where c.id = campaign_id 
      and c.user_id = auth.uid()
    )
  );

-- Indexes
create index if not exists idx_codex_campaign on public.campaign_codex (campaign_id);
create index if not exists idx_codex_themes on public.campaign_codex using gin (themes);

-- Version + updated_at trigger
create or replace function public.increment_codex_version()
returns trigger as $$
begin
  new.version = old.version + 1;
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists codex_version_bump on public.campaign_codex;
create trigger codex_version_bump
before update on public.campaign_codex
for each row execute function public.increment_codex_version();