/*
  # Add UPDATE policy for memory_chunks

  1. Security
    - Add missing UPDATE policy for memory_chunks table
    - Allows authenticated users to update memory chunks in their own campaigns
    - Checks campaign ownership before allowing update
*/

CREATE POLICY "Users can update campaign memory"
  ON memory_chunks
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM campaigns c
      WHERE c.id = memory_chunks.campaign_id
      AND c.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM campaigns c
      WHERE c.id = memory_chunks.campaign_id
      AND c.user_id = auth.uid()
    )
  );
