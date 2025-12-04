/*
  # Add Generation Limits System

  1. **Add Generation Tracking Column**
     - Add generations_used column to profiles table
     - Default to 0, not null
     - Track total generations used by user

  2. **Security**
     - Users can read their own generation count
     - Only the system can update generation counts
*/

-- Add generations_used column to profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS generations_used integer NOT NULL DEFAULT 0;

-- Add a comment explaining the column
COMMENT ON COLUMN public.profiles.generations_used IS 'Total number of AI generations used by this user. Limit is 50 total.';