/*
  # Entity Detection System

  1. New Tables
    - `memory_aliases`
      - Stores alternative names/nicknames for memory entries
      - Campaign-scoped
      - Links back to main memory entry

    - `detected_entities`
      - Stores all entity detections from text sources
      - Tracks confidence, method, position
      - Links to memory entries when identified
      - Stores suggestions for new entities

  2. Indexes
    - pg_trgm indexes for fuzzy matching
    - Campaign ID indexes for scoping
    - Source ID/type indexes for querying

  3. Security
    - Enable RLS on both tables
    - Users can only access their campaign's data
*/

-- Enable pg_trgm extension for fuzzy matching
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- =============================================
-- TABLE: memory_aliases
-- =============================================

CREATE TABLE IF NOT EXISTS memory_aliases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  memory_id uuid NOT NULL REFERENCES memories(id) ON DELETE CASCADE,
  alias text NOT NULL,
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),

  -- Ensure unique aliases per campaign
  CONSTRAINT unique_alias_per_campaign UNIQUE (campaign_id, alias)
);

-- Index for fast alias lookups
CREATE INDEX IF NOT EXISTS idx_memory_aliases_campaign
  ON memory_aliases(campaign_id);
CREATE INDEX IF NOT EXISTS idx_memory_aliases_memory
  ON memory_aliases(memory_id);
CREATE INDEX IF NOT EXISTS idx_memory_aliases_alias_trgm
  ON memory_aliases USING gin(alias gin_trgm_ops);

-- Enable RLS
ALTER TABLE memory_aliases ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view aliases in their campaigns"
  ON memory_aliases FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM campaigns
      WHERE campaigns.id = memory_aliases.campaign_id
      AND campaigns.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create aliases in their campaigns"
  ON memory_aliases FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM campaigns
      WHERE campaigns.id = memory_aliases.campaign_id
      AND campaigns.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update aliases in their campaigns"
  ON memory_aliases FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM campaigns
      WHERE campaigns.id = memory_aliases.campaign_id
      AND campaigns.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM campaigns
      WHERE campaigns.id = memory_aliases.campaign_id
      AND campaigns.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete aliases in their campaigns"
  ON memory_aliases FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM campaigns
      WHERE campaigns.id = memory_aliases.campaign_id
      AND campaigns.user_id = auth.uid()
    )
  );

-- =============================================
-- TABLE: detected_entities
-- =============================================

CREATE TABLE IF NOT EXISTS detected_entities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,

  -- Source tracking
  source_id text NOT NULL,
  source_type text NOT NULL, -- 'town_forge', 'npc_forge', 'session_outline', etc.

  -- Entity info
  entity_text text NOT NULL,
  entity_type text NOT NULL, -- 'NPC', 'Location', 'Monster', 'Item', 'Faction', 'Other'

  -- Detection metadata
  confidence_score decimal(3,2) NOT NULL CHECK (confidence_score >= 0 AND confidence_score <= 1),
  match_method text NOT NULL, -- 'exact', 'alias', 'fuzzy', 'regex'
  alias_matched boolean DEFAULT false,

  -- Position in source text
  start_position int,
  end_position int,
  context_snippet text,

  -- Link to memory entry (null if new/unlinked entity)
  memory_entry_id uuid REFERENCES memories(id) ON DELETE SET NULL,

  -- For unlinked entities
  suggested_name text,
  suggested_tags jsonb,

  -- For fuzzy matches
  fuzzy_candidates jsonb,

  -- Status
  status text DEFAULT 'pending', -- 'pending', 'linked', 'dismissed'
  dismissed_at timestamptz,

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_detected_entities_campaign
  ON detected_entities(campaign_id);
CREATE INDEX IF NOT EXISTS idx_detected_entities_source
  ON detected_entities(source_id, source_type);
CREATE INDEX IF NOT EXISTS idx_detected_entities_memory
  ON detected_entities(memory_entry_id);
CREATE INDEX IF NOT EXISTS idx_detected_entities_status
  ON detected_entities(status);
CREATE INDEX IF NOT EXISTS idx_detected_entities_confidence
  ON detected_entities(confidence_score DESC);
CREATE INDEX IF NOT EXISTS idx_detected_entities_text_trgm
  ON detected_entities USING gin(entity_text gin_trgm_ops);

-- Enable RLS
ALTER TABLE detected_entities ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view detected entities in their campaigns"
  ON detected_entities FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM campaigns
      WHERE campaigns.id = detected_entities.campaign_id
      AND campaigns.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create detected entities in their campaigns"
  ON detected_entities FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM campaigns
      WHERE campaigns.id = detected_entities.campaign_id
      AND campaigns.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update detected entities in their campaigns"
  ON detected_entities FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM campaigns
      WHERE campaigns.id = detected_entities.campaign_id
      AND campaigns.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM campaigns
      WHERE campaigns.id = detected_entities.campaign_id
      AND campaigns.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete detected entities in their campaigns"
  ON detected_entities FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM campaigns
      WHERE campaigns.id = detected_entities.campaign_id
      AND campaigns.user_id = auth.uid()
    )
  );

-- =============================================
-- HELPER FUNCTIONS
-- =============================================

-- Function to get memory dictionary for a campaign
CREATE OR REPLACE FUNCTION get_memory_dictionary(p_campaign_id uuid)
RETURNS TABLE (
  id uuid,
  name text,
  type text,
  slug text
) AS $$
BEGIN
  RETURN QUERY
  SELECT m.id, m.name, m.type, m.slug
  FROM memories m
  WHERE m.campaign_id = p_campaign_id
  ORDER BY length(m.name) DESC; -- Longest names first
END;
$$ LANGUAGE plpgsql STABLE;

-- Function to get alias dictionary for a campaign
CREATE OR REPLACE FUNCTION get_alias_dictionary(p_campaign_id uuid)
RETURNS TABLE (
  alias text,
  memory_id uuid,
  entry_name text,
  entry_type text
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    a.alias,
    a.memory_id,
    m.name as entry_name,
    m.type as entry_type
  FROM memory_aliases a
  JOIN memories m ON a.memory_id = m.id
  WHERE a.campaign_id = p_campaign_id
  ORDER BY length(a.alias) DESC; -- Longest aliases first
END;
$$ LANGUAGE plpgsql STABLE;

-- Function to find fuzzy matches
CREATE OR REPLACE FUNCTION find_fuzzy_matches(
  p_text text,
  p_campaign_id uuid,
  p_threshold decimal DEFAULT 0.7
)
RETURNS TABLE (
  id uuid,
  name text,
  type text,
  similarity real
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    m.id,
    m.name,
    m.type,
    similarity(m.name, p_text) as similarity
  FROM memories m
  WHERE m.campaign_id = p_campaign_id
    AND similarity(m.name, p_text) > p_threshold
  ORDER BY similarity DESC
  LIMIT 3;
END;
$$ LANGUAGE plpgsql STABLE;

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION update_detected_entities_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER detected_entities_update_timestamp
  BEFORE UPDATE ON detected_entities
  FOR EACH ROW
  EXECUTE FUNCTION update_detected_entities_timestamp();
