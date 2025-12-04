/*
  # Add Missing Fields to memory_chunks

  1. New Columns
    - `text_content` (text) - Plain text representation of content for search
    - `tags` (text[]) - Array of tags for categorization

  2. Changes
    - Make these columns nullable to support existing data
    - Add default values where appropriate

  Note: These fields are needed for Forge-generated content to be stored properly.
*/

-- Add text_content column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'memory_chunks' AND column_name = 'text_content'
  ) THEN
    ALTER TABLE public.memory_chunks ADD COLUMN text_content text;
  END IF;
END $$;

-- Add tags column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'memory_chunks' AND column_name = 'tags'
  ) THEN
    ALTER TABLE public.memory_chunks ADD COLUMN tags text[] DEFAULT '{}';
  END IF;
END $$;
