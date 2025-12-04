/*
  # Create Sessions and Scenes Tables

  1. New Tables
    - `sessions`
      - `id` (uuid, primary key) - Unique session identifier
      - `campaign_id` (uuid, foreign key) - Links to campaigns table
      - `title` (text) - Session title
      - `session_date` (timestamptz) - When the session is/was scheduled
      - `premise` (text) - Session premise/hook
      - `party_info` (jsonb) - Party details: {level, size, notes}
      - `outline` (jsonb) - Session outline: {goals[], beats[]}
      - `status` (text) - Session status: draft|ready|completed
      - `notes` (text) - DM scratchpad notes
      - `created_at` (timestamptz) - Creation timestamp
      - `updated_at` (timestamptz) - Last update timestamp

    - `scenes`
      - `id` (uuid, primary key) - Unique scene identifier
      - `session_id` (uuid, foreign key) - Links to sessions table
      - `index_order` (int) - Scene order within session
      - `title` (text) - Scene title
      - `data` (jsonb) - Scene payload/content
      - `canon_checked` (boolean) - Whether scene has been checked against canon
      - `last_canon_score` (numeric) - Last canon check score
      - `last_canon_checked_at` (timestamptz) - When canon was last checked
      - `created_at` (timestamptz) - Creation timestamp
      - `updated_at` (timestamptz) - Last update timestamp

  2. Indexes
    - `idx_sessions_campaign` - Fast lookup of sessions by campaign and date
    - `idx_scenes_session` - Fast lookup of scenes by session and order

  3. Security
    - Enable RLS on both tables
    - Sessions accessible only by campaign owner
    - Scenes accessible only by session owner (via campaign)
    - Both tables support all operations (SELECT, INSERT, UPDATE, DELETE)

  4. Triggers
    - Auto-update `updated_at` timestamp on both tables
    - Create reusable `update_updated_at_column()` function

  5. Views
    - `memory_relation_counts` - Count relationships for each memory chunk
*/

-- Tables
create table if not exists public.sessions (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  title text not null,
  session_date timestamptz,
  premise text,
  party_info jsonb,
  outline jsonb,
  status text default 'draft',
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.scenes (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions(id) on delete cascade,
  index_order int not null,
  title text,
  data jsonb not null default '{}'::jsonb,
  canon_checked boolean default false,
  last_canon_score numeric,
  last_canon_checked_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Indexes
create index if not exists idx_sessions_campaign on public.sessions(campaign_id, session_date desc);
create index if not exists idx_scenes_session on public.scenes(session_id, index_order);

-- RLS
alter table public.sessions enable row level security;
alter table public.scenes enable row level security;

-- Sessions policy (owner via campaign)
create policy "Sessions - owner access"
  on public.sessions for all
  to authenticated
  using (exists(
    select 1 from public.campaigns c 
    where c.id = campaign_id 
    and c.user_id = auth.uid()
  ))
  with check (exists(
    select 1 from public.campaigns c 
    where c.id = campaign_id 
    and c.user_id = auth.uid()
  ));

-- Scenes policy (owner via session->campaign)
create policy "Scenes - owner access"
  on public.scenes for all
  to authenticated
  using (exists(
    select 1 from public.sessions s
    join public.campaigns c on c.id = s.campaign_id
    where s.id = session_id 
    and c.user_id = auth.uid()
  ))
  with check (exists(
    select 1 from public.sessions s
    join public.campaigns c on c.id = s.campaign_id
    where s.id = session_id 
    and c.user_id = auth.uid()
  ));

-- updated_at triggers
create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_sessions_updated on public.sessions;
create trigger trg_sessions_updated before update on public.sessions
for each row execute function update_updated_at_column();

drop trigger if exists trg_scenes_updated on public.scenes;
create trigger trg_scenes_updated before update on public.scenes
for each row execute function update_updated_at_column();

-- Relation count view (using the correct 'relations' table name)
create or replace view public.memory_relation_counts as
select
  mc.id as memory_id,
  coalesce((
    select count(*) from public.relations r
    where r.from_id = mc.id or r.to_id = mc.id
  ), 0) as relation_count
from public.memory_chunks mc;
