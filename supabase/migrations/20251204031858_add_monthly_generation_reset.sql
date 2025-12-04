/*
  # Add Monthly Generation Reset System

  ## Overview
  Convert generation limits from lifetime total to monthly reset system.
  Users now get 50 generations per month that reset on the 1st of each month.

  ## Changes

  1. **New Columns**
     - `generation_reset_date` (timestamptz)
       - Tracks when the generation count was last reset
       - Defaults to current timestamp for existing users
       - Used to determine if a new month has started

  2. **Updated Functions**
     - Modified `increment_user_generations` to check and reset monthly
     - Automatically resets counter when new month detected
     - Updates reset date after each reset

  ## Migration Notes
  - Existing users will have their generation_reset_date set to now()
  - Their current generation count will be preserved
  - On next generation, the system will check if a reset is needed
  - This means existing users start fresh in their current month
*/

-- Add generation_reset_date column to profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS generation_reset_date timestamptz DEFAULT now();

-- Add comment explaining the column
COMMENT ON COLUMN public.profiles.generation_reset_date IS 'Timestamp of when generations_used was last reset. Used to track monthly reset cycle.';

-- Drop the old increment function
DROP FUNCTION IF EXISTS increment_user_generations(uuid);

-- Create updated increment function with monthly reset logic
CREATE OR REPLACE FUNCTION increment_user_generations(user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_reset_date timestamptz;
  should_reset boolean;
BEGIN
  -- Get the current reset date for this user
  SELECT generation_reset_date INTO current_reset_date
  FROM profiles
  WHERE id = user_id;

  -- Check if we need to reset (if we're in a different month)
  -- Compare year and month components
  should_reset := (
    EXTRACT(YEAR FROM current_reset_date) < EXTRACT(YEAR FROM now()) OR
    (EXTRACT(YEAR FROM current_reset_date) = EXTRACT(YEAR FROM now()) AND
     EXTRACT(MONTH FROM current_reset_date) < EXTRACT(MONTH FROM now()))
  );

  -- If we need to reset, set generations_used to 1 and update reset date
  -- Otherwise, just increment
  IF should_reset THEN
    UPDATE profiles
    SET 
      generations_used = 1,
      generation_reset_date = now()
    WHERE id = user_id;
  ELSE
    UPDATE profiles
    SET generations_used = generations_used + 1
    WHERE id = user_id;
  END IF;
END;
$$;

-- Update the comment on generations_used column
COMMENT ON COLUMN public.profiles.generations_used IS 'Number of AI generations used this month. Limit is 50 per month. Resets on the 1st of each month.';
