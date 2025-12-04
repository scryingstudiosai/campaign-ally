/*
  # Add Tags and Metadata System

  ## Summary
  This migration adds comprehensive tag management and metadata tracking to Campaign Ally,
  including user notes, edit timestamps, session tracking, and a dedicated campaign tags table.

  ## Changes to `memory_chunks` Table
  
  ### New Columns
  1. `tags` - TEXT[] array for flexible tagging (preset, location, faction, custom tags)
  2. `user_notes` - TEXT field for DM notes and annotations
  3. `last_edited_at` - TIMESTAMPTZ to track when content was last modified
  4. `created_in_session_id` - UUID reference to track which session created this memory
  
  ### Indexes
  - GIN index on `tags` array for efficient tag searching and filtering
  
  ### Triggers
  - BEFORE UPDATE trigger to automatically update `last_edited_at` timestamp

  ## New Table: `campaign_tags`
  
  Centralized tag management per campaign with usage tracking and categorization.
  
  ### Columns
  - `id` - UUID primary key
  - `campaign_id` - UUID reference to campaigns table
  - `tag_name` - TEXT, the actual tag string
  - `tag_category` - TEXT, one of: 'preset', 'location', 'faction', 'custom'
  - `use_count` - INTEGER, tracks how many memory_chunks use this tag
  - `created_at` - TIMESTAMPTZ, when tag was first created
  
  ### Constraints
  - Unique constraint on (campaign_id, tag_name) to prevent duplicates
  - Check constraint on tag_category to ensure valid categories
  
  ### Indexes
  - Btree index on (campaign_id, tag_name) for fast lookups
  
  ### RLS Policies
  - Users can only access tags for campaigns they own
  - Full CRUD permissions for campaign owners

  ## Seed Function: `seed_preset_tags`
  
  Creates standard preset tags for new campaigns. Includes common D&D categories like
  Monster, NPC, Item, Hook, Location, Tavern, Quest, Faction, Lore, Secret, and workflow
  states like Active, Resolved, Foreshadowing, Backstory.
  
  Idempotent - safe to call multiple times without creating duplicates.

  ## Security
  - RLS enabled on campaign_tags table
  - Policies mirror campaign ownership model
  - All new columns in memory_chunks respect existing RLS policies
*/

-- ============================================================================
-- PART 1: ALTER memory_chunks table
-- ============================================================================

-- Add tags array column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'memory_chunks'
    AND column_name = 'tags'
  ) THEN
    ALTER TABLE public.memory_chunks
    ADD COLUMN tags TEXT[] DEFAULT '{}'::text[] NOT NULL;
  END IF;
END $$;

-- Add user_notes column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'memory_chunks'
    AND column_name = 'user_notes'
  ) THEN
    ALTER TABLE public.memory_chunks
    ADD COLUMN user_notes TEXT;
  END IF;
END $$;

-- Add last_edited_at column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'memory_chunks'
    AND column_name = 'last_edited_at'
  ) THEN
    ALTER TABLE public.memory_chunks
    ADD COLUMN last_edited_at TIMESTAMPTZ DEFAULT now() NOT NULL;
  END IF;
END $$;

-- Add created_in_session_id column (nullable, references sessions table if exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'memory_chunks'
    AND column_name = 'created_in_session_id'
  ) THEN
    -- Check if sessions table exists before adding foreign key
    IF EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = 'sessions'
    ) THEN
      ALTER TABLE public.memory_chunks
      ADD COLUMN created_in_session_id UUID REFERENCES public.sessions(id) ON DELETE SET NULL;
    ELSE
      -- Add column without foreign key if sessions table doesn't exist yet
      ALTER TABLE public.memory_chunks
      ADD COLUMN created_in_session_id UUID;
    END IF;
  END IF;
END $$;

-- ============================================================================
-- PART 2: CREATE campaign_tags table
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.campaign_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  tag_name TEXT NOT NULL,
  tag_category TEXT NOT NULL CHECK (tag_category IN ('preset', 'location', 'faction', 'custom')),
  use_count INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE (campaign_id, tag_name)
);

-- ============================================================================
-- PART 3: CREATE indexes
-- ============================================================================

-- GIN index on memory_chunks.tags for efficient array searches
CREATE INDEX IF NOT EXISTS idx_memory_chunks_tags 
ON public.memory_chunks USING GIN (tags);

-- Btree index on campaign_tags for fast tag lookups
CREATE INDEX IF NOT EXISTS idx_campaign_tags_lookup 
ON public.campaign_tags (campaign_id, tag_name);

-- Additional helpful index on tag_category for filtering
CREATE INDEX IF NOT EXISTS idx_campaign_tags_category 
ON public.campaign_tags (campaign_id, tag_category);

-- ============================================================================
-- PART 4: CREATE trigger for last_edited_at
-- ============================================================================

-- Function to update last_edited_at timestamp
CREATE OR REPLACE FUNCTION update_memory_chunks_last_edited()
RETURNS TRIGGER AS $$
BEGIN
  NEW.last_edited_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists and recreate
DROP TRIGGER IF EXISTS memory_chunks_update_last_edited ON public.memory_chunks;

CREATE TRIGGER memory_chunks_update_last_edited
  BEFORE UPDATE ON public.memory_chunks
  FOR EACH ROW
  EXECUTE FUNCTION update_memory_chunks_last_edited();

-- ============================================================================
-- PART 5: ENABLE RLS and CREATE policies for campaign_tags
-- ============================================================================

ALTER TABLE public.campaign_tags ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view tags for their own campaigns
CREATE POLICY "Users can view own campaign tags"
  ON public.campaign_tags
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.campaigns
      WHERE campaigns.id = campaign_tags.campaign_id
      AND campaigns.user_id = auth.uid()
    )
  );

-- Policy: Users can insert tags for their own campaigns
CREATE POLICY "Users can create tags in own campaigns"
  ON public.campaign_tags
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.campaigns
      WHERE campaigns.id = campaign_tags.campaign_id
      AND campaigns.user_id = auth.uid()
    )
  );

-- Policy: Users can update tags for their own campaigns
CREATE POLICY "Users can update own campaign tags"
  ON public.campaign_tags
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.campaigns
      WHERE campaigns.id = campaign_tags.campaign_id
      AND campaigns.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.campaigns
      WHERE campaigns.id = campaign_tags.campaign_id
      AND campaigns.user_id = auth.uid()
    )
  );

-- Policy: Users can delete tags from their own campaigns
CREATE POLICY "Users can delete own campaign tags"
  ON public.campaign_tags
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.campaigns
      WHERE campaigns.id = campaign_tags.campaign_id
      AND campaigns.user_id = auth.uid()
    )
  );

-- ============================================================================
-- PART 6: CREATE seed_preset_tags function
-- ============================================================================

CREATE OR REPLACE FUNCTION seed_preset_tags(campaign_uuid UUID)
RETURNS void AS $$
DECLARE
  preset_tags TEXT[] := ARRAY[
    'Monster', 'NPC', 'Item', 'Hook', 'Location', 'Tavern', 
    'Quest', 'Faction', 'Lore', 'Secret',
    'Active', 'Resolved', 'Foreshadowing', 'Backstory'
  ];
  current_tag TEXT;
BEGIN
  -- Verify campaign exists
  IF NOT EXISTS (SELECT 1 FROM public.campaigns WHERE id = campaign_uuid) THEN
    RAISE EXCEPTION 'Campaign % does not exist', campaign_uuid;
  END IF;

  -- Insert each preset tag (ON CONFLICT DO NOTHING makes it idempotent)
  FOREACH current_tag IN ARRAY preset_tags
  LOOP
    INSERT INTO public.campaign_tags (campaign_id, tag_name, tag_category, use_count)
    VALUES (campaign_uuid, current_tag, 'preset', 0)
    ON CONFLICT (campaign_id, tag_name) DO NOTHING;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION seed_preset_tags(UUID) TO authenticated;

-- ============================================================================
-- PART 7: Seed preset tags for existing campaigns
-- ============================================================================

-- Seed preset tags for all existing campaigns
DO $$
DECLARE
  campaign_record RECORD;
BEGIN
  FOR campaign_record IN SELECT id FROM public.campaigns
  LOOP
    PERFORM seed_preset_tags(campaign_record.id);
  END LOOP;
END $$;