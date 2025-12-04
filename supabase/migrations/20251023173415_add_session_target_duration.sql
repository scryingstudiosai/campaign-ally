/*
  # Add target duration to sessions

  1. Changes
    - Add `target_duration` column to sessions table
      - Stores the desired session length in minutes (e.g., 180 for 3 hours)
      - Optional field, defaults to null
      - Integer type for easy calculations
  
  2. Notes
    - This allows DMs to set a target session length
    - Used for pacing calculations and time estimates
    - Common values: 120 (2 hours), 180 (3 hours), 240 (4 hours)
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sessions' AND column_name = 'target_duration'
  ) THEN
    ALTER TABLE public.sessions ADD COLUMN target_duration integer;
  END IF;
END $$;
