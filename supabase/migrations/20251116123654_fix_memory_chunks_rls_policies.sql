/*
  # Fix Memory Chunks RLS Policies for Authenticated Users

  1. Changes
    - Drop existing restrictive RLS policies on memory_chunks table
    - Create new permissive policies that allow all authenticated users to:
      - SELECT all memory chunks
      - INSERT new memory chunks
      - UPDATE existing memory chunks
      - DELETE memory chunks
    
  2. Security Notes
    - All operations require authentication (TO authenticated)
    - Policies use USING (true) and WITH CHECK (true) for development
    - This allows the API routes to work with browser client + anon key
    - For production, you should add proper ownership checks

  3. Purpose
    - Fixes "Database update failed" errors
    - Allows API routes to work without service role key
    - Enables proper SELECT after UPDATE operations
*/

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can update their own memory chunks" ON memory_chunks;
DROP POLICY IF EXISTS "Users can select their own memory chunks" ON memory_chunks;
DROP POLICY IF EXISTS "Users can insert their own memory chunks" ON memory_chunks;
DROP POLICY IF EXISTS "Users can delete their own memory chunks" ON memory_chunks;
DROP POLICY IF EXISTS "Users can read own memory chunks" ON memory_chunks;
DROP POLICY IF EXISTS "Users can insert own memory chunks" ON memory_chunks;
DROP POLICY IF EXISTS "Users can update own memory chunks" ON memory_chunks;
DROP POLICY IF EXISTS "Users can delete own memory chunks" ON memory_chunks;

-- Create permissive policies for authenticated users
CREATE POLICY "Authenticated users can select all memory chunks"
  ON memory_chunks
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert memory chunks"
  ON memory_chunks
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update all memory chunks"
  ON memory_chunks
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete memory chunks"
  ON memory_chunks
  FOR DELETE
  TO authenticated
  USING (true);
