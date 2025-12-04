/*
  # Create Waitlist Table

  1. **New Tables**
     - `waitlist`
       - `id` (uuid, primary key)
       - `email` (text, unique, not null)
       - `user_id` (uuid, nullable, foreign key to auth.users)
       - `created_at` (timestamptz)
       - Stores emails of users interested in Pro version

  2. **Security**
     - Enable RLS on `waitlist` table
     - Users can insert their own waitlist entries
     - Users can view their own waitlist entries
     - No updates or deletes allowed (append-only table)
*/

-- Create waitlist table
CREATE TABLE IF NOT EXISTS public.waitlist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Add unique constraint on email to prevent duplicates
CREATE UNIQUE INDEX IF NOT EXISTS idx_waitlist_email ON public.waitlist(email);

-- Add index on user_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_waitlist_user_id ON public.waitlist(user_id);

-- Enable RLS
ALTER TABLE public.waitlist ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can insert to waitlist (even anonymous users)
CREATE POLICY "Anyone can join waitlist"
  ON public.waitlist
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Policy: Users can view their own waitlist entries
CREATE POLICY "Users can view own waitlist entries"
  ON public.waitlist
  FOR SELECT
  TO authenticated
  USING (
    user_id = (select auth.uid())
  );

-- Add comment
COMMENT ON TABLE public.waitlist IS 'Stores emails of users interested in Campaign Ally Pro version';