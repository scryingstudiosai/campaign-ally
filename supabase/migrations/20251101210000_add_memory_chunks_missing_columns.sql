/*
  # Add Missing Columns to memory_chunks

  Add archived and is_pinned columns to memory_chunks table to support
  the Memory page functionality.

  1. New Columns
    - `archived` (boolean) - Whether entry is archived
    - `is_pinned` (boolean) - Whether entry is pinned to top

  2. Changes
    - Add default values (false for both)
    - Add index for archived column for performance
*/

-- Add archived column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'memory_chunks' AND column_name = 'archived'
  ) THEN
    ALTER TABLE memory_chunks ADD COLUMN archived BOOLEAN DEFAULT false;
  END IF;
END $$;

-- Add is_pinned column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'memory_chunks' AND column_name = 'is_pinned'
  ) THEN
    ALTER TABLE memory_chunks ADD COLUMN is_pinned BOOLEAN DEFAULT false;
  END IF;
END $$;

-- Add index for archived column for better query performance
CREATE INDEX IF NOT EXISTS idx_memory_chunks_archived ON memory_chunks(campaign_id, archived);

-- Add index for pinned column for better query performance
CREATE INDEX IF NOT EXISTS idx_memory_chunks_pinned ON memory_chunks(campaign_id, is_pinned);
