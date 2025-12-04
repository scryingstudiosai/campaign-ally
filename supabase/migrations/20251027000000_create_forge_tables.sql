/*
  # Create Forge Tables for Random Table and Wild Magic

  ## Summary
  Creates tables to store user-generated forges for Random Tables and Wild Magic surges.
  Each forge stores the complete configuration and generated content for reproducibility.

  ## New Tables

  ### `random_table_forges`
  - `id` (uuid, primary key)
  - `campaign_id` (uuid, foreign key to campaigns)
  - `user_id` (uuid, foreign key to profiles)
  - `forge_type` (text, always 'random-table')
  - `topic` (text, required - table name)
  - `description` (text, nullable)
  - `dice` (text, required - d4/d6/d8/d12/d20/d100)
  - `style` (text, nullable)
  - `tags` (text[], array of tags)
  - `seed` (text, nullable - for deterministic generation)
  - `rerolled_indices` (integer[], array of rerolled indices)
  - `entries` (jsonb, array of roll entries)
  - `created_at` (timestamptz, auto)
  - `updated_at` (timestamptz, auto)

  ### `wild_magic_forges`
  - `id` (uuid, primary key)
  - `campaign_id` (uuid, foreign key to campaigns)
  - `user_id` (uuid, foreign key to profiles)
  - `forge_type` (text, always 'wild-magic')
  - `mode` (text, 'TABLE' or 'SURPRISE')
  - `dice` (text, required for TABLE mode)
  - `table_topic` (text, nullable)
  - `surprise_theme` (text, nullable for SURPRISE mode)
  - `style` (text, nullable)
  - `caster_class` (text, nullable)
  - `spell_school` (text, nullable)
  - `environment` (text, nullable)
  - `tier` (text, required - minor/moderate/major)
  - `seed` (text, nullable)
  - `rerolled_indices` (integer[], for TABLE mode)
  - `reroll` (boolean, for SURPRISE mode)
  - `entries` (jsonb, array for TABLE or single object for SURPRISE)
  - `created_at` (timestamptz, auto)
  - `updated_at` (timestamptz, auto)

  ## Security
  - RLS enabled on all tables
  - Users can only access their own forges
  - Cascade delete when campaign or user is deleted
*/

-- Random Table Forges
CREATE TABLE IF NOT EXISTS public.random_table_forges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid REFERENCES public.campaigns(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  forge_type text DEFAULT 'random-table' NOT NULL,
  topic text NOT NULL,
  description text,
  dice text NOT NULL CHECK (dice IN ('d4', 'd6', 'd8', 'd12', 'd20', 'd100')),
  style text,
  tags text[] DEFAULT '{}',
  seed text,
  rerolled_indices integer[] DEFAULT '{}',
  entries jsonb NOT NULL DEFAULT '[]',
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Wild Magic Forges
CREATE TABLE IF NOT EXISTS public.wild_magic_forges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid REFERENCES public.campaigns(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  forge_type text DEFAULT 'wild-magic' NOT NULL,
  mode text NOT NULL CHECK (mode IN ('TABLE', 'SURPRISE')),
  dice text CHECK (dice IN ('d4', 'd6', 'd8', 'd12', 'd20', 'd100')),
  table_topic text,
  surprise_theme text,
  style text,
  caster_class text,
  spell_school text CHECK (spell_school IS NULL OR spell_school IN (
    'abjuration', 'conjuration', 'divination', 'enchantment',
    'evocation', 'illusion', 'necromancy', 'transmutation'
  )),
  environment text,
  tier text NOT NULL CHECK (tier IN ('minor', 'moderate', 'major')) DEFAULT 'moderate',
  seed text,
  rerolled_indices integer[] DEFAULT '{}',
  reroll boolean DEFAULT false,
  entries jsonb NOT NULL DEFAULT '[]',
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Enable RLS
ALTER TABLE public.random_table_forges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wild_magic_forges ENABLE ROW LEVEL SECURITY;

-- RLS Policies for random_table_forges
CREATE POLICY "Users can view own random table forges"
  ON public.random_table_forges FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own random table forges"
  ON public.random_table_forges FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own random table forges"
  ON public.random_table_forges FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own random table forges"
  ON public.random_table_forges FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- RLS Policies for wild_magic_forges
CREATE POLICY "Users can view own wild magic forges"
  ON public.wild_magic_forges FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own wild magic forges"
  ON public.wild_magic_forges FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own wild magic forges"
  ON public.wild_magic_forges FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own wild magic forges"
  ON public.wild_magic_forges FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_random_table_forges_campaign
  ON public.random_table_forges(campaign_id);
CREATE INDEX IF NOT EXISTS idx_random_table_forges_user
  ON public.random_table_forges(user_id);
CREATE INDEX IF NOT EXISTS idx_random_table_forges_created
  ON public.random_table_forges(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_wild_magic_forges_campaign
  ON public.wild_magic_forges(campaign_id);
CREATE INDEX IF NOT EXISTS idx_wild_magic_forges_user
  ON public.wild_magic_forges(user_id);
CREATE INDEX IF NOT EXISTS idx_wild_magic_forges_created
  ON public.wild_magic_forges(created_at DESC);

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_forge_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_random_table_forges_updated_at ON public.random_table_forges;
CREATE TRIGGER set_random_table_forges_updated_at
  BEFORE UPDATE ON public.random_table_forges
  FOR EACH ROW
  EXECUTE FUNCTION update_forge_updated_at();

DROP TRIGGER IF EXISTS set_wild_magic_forges_updated_at ON public.wild_magic_forges;
CREATE TRIGGER set_wild_magic_forges_updated_at
  BEFORE UPDATE ON public.wild_magic_forges
  FOR EACH ROW
  EXECUTE FUNCTION update_forge_updated_at();
