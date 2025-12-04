/*
  # Campaign Ally - Phase 1 Database Schema

  ## Overview
  Complete database schema for Campaign Ally MVP including user profiles,
  campaigns, memory storage, and rate limiting for AI generations.

  ## New Tables
  
  ### `profiles`
  - `id` (uuid, primary key) - References auth.users
  - `email` (text, unique) - User email
  - `created_at` (timestamptz) - Account creation timestamp
  
  ### `campaigns`
  - `id` (uuid, primary key) - Campaign identifier
  - `user_id` (uuid) - References profiles, campaign owner
  - `name` (text) - Campaign name
  - `system` (text) - Game system (default: D&D 5e)
  - `party_level` (int) - Current party level (default: 1)
  - `created_at` (timestamptz) - Campaign creation timestamp
  
  ### `memory_chunks`
  - `id` (uuid, primary key) - Memory item identifier
  - `campaign_id` (uuid) - References campaigns
  - `type` (text) - Item type: 'npc', 'tavern', 'hook', etc.
  - `title` (text) - Item title/name
  - `content` (jsonb) - Full JSON content with core data and flair
  - `created_at` (timestamptz) - Save timestamp
  
  ### `panic_uses`
  - `id` (uuid, primary key) - Usage record identifier
  - `user_id` (uuid) - References profiles
  - `created_at` (timestamptz) - Usage timestamp
  - For tracking daily rate limits (3 uses per 24 hours)

  ## Security
  - RLS enabled on all tables
  - Users can only access their own data
  - Memory access controlled through campaign ownership
  - Panic usage tracked per user

  ## Important Notes
  1. Profile rows auto-created via trigger on auth.users insert
  2. Rate limiting enforced at API level using panic_uses table
  3. Memory content stored as JSONB for flexibility
  4. Phase 2 will add vector embeddings column to memory_chunks
*/

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text UNIQUE,
  created_at timestamptz DEFAULT now()
);

-- Campaigns table
CREATE TABLE IF NOT EXISTS public.campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  name text NOT NULL,
  system text DEFAULT 'D&D 5e',
  party_level int DEFAULT 1,
  created_at timestamptz DEFAULT now()
);

-- Memory chunks table
CREATE TABLE IF NOT EXISTS public.memory_chunks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid REFERENCES public.campaigns(id) ON DELETE CASCADE,
  type text NOT NULL,
  title text NOT NULL,
  content jsonb NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Rate limiting table
CREATE TABLE IF NOT EXISTS public.panic_uses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_panic_uses_user ON public.panic_uses(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_campaigns_user ON public.campaigns(user_id);
CREATE INDEX IF NOT EXISTS idx_memory_campaign ON public.memory_chunks(campaign_id);
CREATE INDEX IF NOT EXISTS idx_memory_type ON public.memory_chunks(type);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.memory_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.panic_uses ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- RLS Policies for campaigns
DROP POLICY IF EXISTS "Users can view own campaigns" ON public.campaigns;
CREATE POLICY "Users can view own campaigns"
  ON public.campaigns FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own campaigns" ON public.campaigns;
CREATE POLICY "Users can insert own campaigns"
  ON public.campaigns FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own campaigns" ON public.campaigns;
CREATE POLICY "Users can update own campaigns"
  ON public.campaigns FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own campaigns" ON public.campaigns;
CREATE POLICY "Users can delete own campaigns"
  ON public.campaigns FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- RLS Policies for memory_chunks
DROP POLICY IF EXISTS "Users can view campaign memory" ON public.memory_chunks;
CREATE POLICY "Users can view campaign memory"
  ON public.memory_chunks FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.campaigns c
      WHERE c.id = campaign_id AND c.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can insert campaign memory" ON public.memory_chunks;
CREATE POLICY "Users can insert campaign memory"
  ON public.memory_chunks FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.campaigns c
      WHERE c.id = campaign_id AND c.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can delete campaign memory" ON public.memory_chunks;
CREATE POLICY "Users can delete campaign memory"
  ON public.memory_chunks FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.campaigns c
      WHERE c.id = campaign_id AND c.user_id = auth.uid()
    )
  );

-- RLS Policies for panic_uses
DROP POLICY IF EXISTS "Users can view own panic uses" ON public.panic_uses;
CREATE POLICY "Users can view own panic uses"
  ON public.panic_uses FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own panic uses" ON public.panic_uses;
CREATE POLICY "Users can insert own panic uses"
  ON public.panic_uses FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Function to auto-create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (new.id, new.email);
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for auto-creating profile
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();