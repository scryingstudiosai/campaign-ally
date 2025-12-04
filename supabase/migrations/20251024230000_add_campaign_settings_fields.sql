/*
  # Add Campaign Settings Fields

  ## Summary
  Adds additional fields to the campaigns table to support comprehensive campaign settings
  including tagline, last updated tracking, and updated_at timestamp for tracking modifications.

  ## Changes to `campaigns` Table

  ### New Columns
  1. `tagline` - TEXT field for campaign tagline/brief description (optional, max 200 chars)
  2. `updated_at` - TIMESTAMPTZ to track when campaign settings were last modified

  ### Triggers
  - BEFORE UPDATE trigger to automatically update `updated_at` timestamp

  ## Notes
  - `system` field already exists with default 'D&D 5e'
  - `name` field already exists
  - `created_at` field already exists
  - Session count will be calculated dynamically from sessions table
  - Player count will be tracked via party_level field (existing)
*/

-- Add tagline column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'campaigns'
    AND column_name = 'tagline'
  ) THEN
    ALTER TABLE public.campaigns
    ADD COLUMN tagline TEXT;
  END IF;
END $$;

-- Add updated_at column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'campaigns'
    AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE public.campaigns
    ADD COLUMN updated_at TIMESTAMPTZ DEFAULT now();
  END IF;
END $$;

-- Create or replace trigger function to update updated_at
CREATE OR REPLACE FUNCTION update_campaigns_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists and recreate
DROP TRIGGER IF EXISTS set_campaigns_updated_at ON public.campaigns;
CREATE TRIGGER set_campaigns_updated_at
  BEFORE UPDATE ON public.campaigns
  FOR EACH ROW
  EXECUTE FUNCTION update_campaigns_updated_at();

-- Add check constraint for tagline length (max 200 characters)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'campaigns_tagline_length'
  ) THEN
    ALTER TABLE public.campaigns
    ADD CONSTRAINT campaigns_tagline_length
    CHECK (tagline IS NULL OR length(tagline) <= 200);
  END IF;
END $$;

-- Update existing campaigns to have updated_at equal to created_at if null
UPDATE public.campaigns
SET updated_at = created_at
WHERE updated_at IS NULL;
