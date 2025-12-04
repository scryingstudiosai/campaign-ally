/*
  # Add session_number column to sessions table

  1. Changes
    - Add session_number column (integer, optional)
    - This allows tracking session order/numbering in campaigns
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sessions' AND column_name = 'session_number'
  ) THEN
    ALTER TABLE sessions ADD COLUMN session_number integer;
  END IF;
END $$;