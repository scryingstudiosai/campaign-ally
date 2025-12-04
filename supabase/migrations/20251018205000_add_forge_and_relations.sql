/*
  # Add Forge Support and Relations

  1. Changes to memory_chunks
    - Add `forge_type` column to track which Forge created each memory

  2. New Tables
    - `relations` - Track relationships between memory chunks
      - `id` (uuid, primary key)
      - `campaign_id` (uuid, foreign key to campaigns)
      - `from_id` (uuid, foreign key to memory_chunks)
      - `to_id` (uuid, foreign key to memory_chunks)
      - `relation_type` (text) - type of relationship
      - `created_at` (timestamptz)

  3. Security
    - Enable RLS on `relations` table
    - Add policy for campaign owners to manage relations

  4. Indexes
    - Add indexes on from_id, to_id, and campaign_id for performance
*/

-- Add forge_type to memory_chunks
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'memory_chunks' AND column_name = 'forge_type'
  ) THEN
    ALTER TABLE public.memory_chunks ADD COLUMN forge_type text;
  END IF;
END $$;

-- Create relations table
CREATE TABLE IF NOT EXISTS public.relations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid REFERENCES public.campaigns(id) ON DELETE CASCADE NOT NULL,
  from_id uuid REFERENCES public.memory_chunks(id) ON DELETE CASCADE NOT NULL,
  to_id uuid REFERENCES public.memory_chunks(id) ON DELETE CASCADE NOT NULL,
  relation_type text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_relations_from ON public.relations(from_id);
CREATE INDEX IF NOT EXISTS idx_relations_to ON public.relations(to_id);
CREATE INDEX IF NOT EXISTS idx_relations_campaign ON public.relations(campaign_id);

-- Enable RLS
ALTER TABLE public.relations ENABLE ROW LEVEL SECURITY;

-- Policy for relations
DROP POLICY IF EXISTS "relations by campaign owner" ON public.relations;
CREATE POLICY "relations by campaign owner"
  ON public.relations FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.campaigns c
      WHERE c.id = relations.campaign_id
      AND c.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.campaigns c
      WHERE c.id = relations.campaign_id
      AND c.user_id = auth.uid()
    )
  );
