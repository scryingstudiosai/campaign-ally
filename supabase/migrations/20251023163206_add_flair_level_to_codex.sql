/*
  # Add flair_level to campaign_codex

  1. Changes
    - Add `flair_level` column to `campaign_codex` table to control descriptive detail in generated content
    - Default to 'balanced' for existing campaigns
  
  2. Notes
    - Flair levels: minimal, balanced, rich, verbose
    - This controls how much descriptive flair the AI adds to generated content
*/

-- Add flair_level column to campaign_codex
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'campaign_codex' AND column_name = 'flair_level'
  ) THEN
    ALTER TABLE public.campaign_codex 
    ADD COLUMN flair_level text DEFAULT 'balanced'
    CHECK (flair_level IN ('minimal', 'balanced', 'rich', 'verbose'));
  END IF;
END $$;
