/*
  # Add Beta Agreement Acceptance Field

  1. **Schema Changes**
     - Add `beta_agreement_accepted` column to `profiles` table
       - Type: timestamptz (nullable)
       - Purpose: Tracks when user accepted beta terms
       - NULL = not yet accepted, needs to see modal
       - Timestamp = accepted at this time, can use app

  2. **Purpose**
     - One-time beta agreement modal for new users
     - Helps set expectations about beta software
     - Tracks user consent timestamp
*/

-- Add beta agreement acceptance timestamp column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'profiles'
    AND column_name = 'beta_agreement_accepted'
  ) THEN
    ALTER TABLE public.profiles
    ADD COLUMN beta_agreement_accepted timestamptz DEFAULT NULL;
  END IF;
END $$;

-- Add index for faster lookups when checking acceptance status
CREATE INDEX IF NOT EXISTS idx_profiles_beta_agreement
  ON public.profiles(beta_agreement_accepted)
  WHERE beta_agreement_accepted IS NULL;

-- Add helpful comment
COMMENT ON COLUMN public.profiles.beta_agreement_accepted IS 'Timestamp when user accepted beta agreement. NULL means not yet accepted.';
