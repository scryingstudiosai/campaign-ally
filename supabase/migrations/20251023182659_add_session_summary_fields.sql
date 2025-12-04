/*
  # Add Session Summary Fields

  1. Changes to sessions table
    - Add summary_raw_notes (text) - DM's input notes for summary generation
    - Add summary_tone (text) - Selected tone for summary generation
    - Add summary_key_events (jsonb) - Array of key events
    - Add summary_npcs (jsonb) - Array of NPCs encountered
    - Add summary_items (jsonb) - Array of items acquired
    - Add summary_locations (jsonb) - Array of locations visited
    - Add summary_consequences (jsonb) - Array of future hooks
    - Add summary_memorable_moments (jsonb) - Array of quotes/moments
    - Add summary_session_themes (text) - Session themes
    - Add summary_player_view (text) - Player-facing summary
    - Add summary_dm_view (text) - DM-only summary with secrets
    - Add summary_memory_tags (jsonb) - Array of tags for memory system
    - Add summary_generated_at (timestamp) - When summary was generated

  2. Notes
    - All summary fields are optional
    - Summary fields only populated when user generates a summary
    - Keeps session metadata separate from summary data
*/

-- Add summary fields to sessions table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sessions' AND column_name = 'summary_raw_notes'
  ) THEN
    ALTER TABLE sessions ADD COLUMN summary_raw_notes text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sessions' AND column_name = 'summary_tone'
  ) THEN
    ALTER TABLE sessions ADD COLUMN summary_tone text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sessions' AND column_name = 'summary_key_events'
  ) THEN
    ALTER TABLE sessions ADD COLUMN summary_key_events jsonb DEFAULT '[]'::jsonb;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sessions' AND column_name = 'summary_npcs'
  ) THEN
    ALTER TABLE sessions ADD COLUMN summary_npcs jsonb DEFAULT '[]'::jsonb;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sessions' AND column_name = 'summary_items'
  ) THEN
    ALTER TABLE sessions ADD COLUMN summary_items jsonb DEFAULT '[]'::jsonb;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sessions' AND column_name = 'summary_locations'
  ) THEN
    ALTER TABLE sessions ADD COLUMN summary_locations jsonb DEFAULT '[]'::jsonb;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sessions' AND column_name = 'summary_consequences'
  ) THEN
    ALTER TABLE sessions ADD COLUMN summary_consequences jsonb DEFAULT '[]'::jsonb;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sessions' AND column_name = 'summary_memorable_moments'
  ) THEN
    ALTER TABLE sessions ADD COLUMN summary_memorable_moments jsonb DEFAULT '[]'::jsonb;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sessions' AND column_name = 'summary_session_themes'
  ) THEN
    ALTER TABLE sessions ADD COLUMN summary_session_themes text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sessions' AND column_name = 'summary_player_view'
  ) THEN
    ALTER TABLE sessions ADD COLUMN summary_player_view text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sessions' AND column_name = 'summary_dm_view'
  ) THEN
    ALTER TABLE sessions ADD COLUMN summary_dm_view text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sessions' AND column_name = 'summary_memory_tags'
  ) THEN
    ALTER TABLE sessions ADD COLUMN summary_memory_tags jsonb DEFAULT '[]'::jsonb;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sessions' AND column_name = 'summary_generated_at'
  ) THEN
    ALTER TABLE sessions ADD COLUMN summary_generated_at timestamptz;
  END IF;
END $$;