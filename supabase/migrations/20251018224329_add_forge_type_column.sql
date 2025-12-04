/*
  # Add forge_type Column

  1. New Column
    - `forge_type` (text) - Tracks which Forge type created this memory chunk
      Values: 'hero', 'villain', 'town', 'item', or null for non-Forge memories

  2. Changes
    - Make column nullable to support existing data and non-Forge memories
*/

-- Add forge_type column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'memory_chunks' AND column_name = 'forge_type'
  ) THEN
    ALTER TABLE public.memory_chunks ADD COLUMN forge_type text;
  END IF;
END $$;
