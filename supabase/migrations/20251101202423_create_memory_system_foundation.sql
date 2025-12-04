/*
  # Campaign Ally Memory System - Complete Database Foundation
  
  This migration creates a comprehensive Memory system with:
  
  ## 1. Core Tables
  - `memories` - Central memory entries table with campaign namespacing
  - `memory_aliases` - Alternate names and nicknames for memory entries
  - `relationship_types` - Defines valid relationship types and their inverses
  - `memory_relationships` - Connections between memory entries
  
  ## 2. Tracking Tables
  - `session_appearances` - Tracks when entries appear in sessions
  - `import_batches` - Manages bulk import operations
  - `detected_entities` - AI entity detection results
  
  ## 3. Features
  - Campaign-scoped data (prevents cross-campaign leakage)
  - Fuzzy text search via pg_trgm extension
  - Full-text search capabilities
  - Optimized indexes for common query patterns
  - Bidirectional relationship tracking
  - URL-friendly slugs
  
  ## 4. Security
  - Row Level Security (RLS) enabled on all tables
  - All queries must be campaign-scoped
  - User isolation enforced
*/

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- =====================================================================
-- 1. CORE MEMORIES TABLE
-- =====================================================================

CREATE TABLE IF NOT EXISTS memories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  name VARCHAR(255) NOT NULL,
  type VARCHAR(50) NOT NULL, -- NPC, Location, Monster, Item, Quest, Session, Custom
  category VARCHAR(50), -- Same as type or custom category
  content TEXT,
  summary TEXT, -- AI-generated short summary
  dm_notes TEXT, -- Private DM notes
  tags TEXT[] DEFAULT '{}',
  color_code VARCHAR(20), -- For UI color coding
  pinned BOOLEAN DEFAULT false,
  archived BOOLEAN DEFAULT false,
  first_appearance VARCHAR(50), -- Session number
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  -- Generate slug for URL-friendly names
  slug TEXT GENERATED ALWAYS AS (
    regexp_replace(lower(name), '[^a-z0-9]+', '-', 'g')
  ) STORED
);

-- Enable RLS
ALTER TABLE memories ENABLE ROW LEVEL SECURITY;

-- RLS Policies for memories
CREATE POLICY "Users can view own campaign memories"
  ON memories FOR SELECT
  TO authenticated
  USING (
    campaign_id IN (
      SELECT id FROM campaigns WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own campaign memories"
  ON memories FOR INSERT
  TO authenticated
  WITH CHECK (
    campaign_id IN (
      SELECT id FROM campaigns WHERE user_id = auth.uid()
    )
    AND user_id = auth.uid()
  );

CREATE POLICY "Users can update own campaign memories"
  ON memories FOR UPDATE
  TO authenticated
  USING (
    campaign_id IN (
      SELECT id FROM campaigns WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    campaign_id IN (
      SELECT id FROM campaigns WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own campaign memories"
  ON memories FOR DELETE
  TO authenticated
  USING (
    campaign_id IN (
      SELECT id FROM campaigns WHERE user_id = auth.uid()
    )
  );

-- =====================================================================
-- 2. MEMORY ALIASES TABLE
-- =====================================================================

CREATE TABLE IF NOT EXISTS memory_aliases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  memory_id UUID NOT NULL REFERENCES memories(id) ON DELETE CASCADE,
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  alias TEXT NOT NULL,
  created_by VARCHAR(50) DEFAULT 'user', -- user, ai, import
  created_at TIMESTAMPTZ DEFAULT now(),
  
  UNIQUE(campaign_id, memory_id, alias)
);

-- Enable RLS
ALTER TABLE memory_aliases ENABLE ROW LEVEL SECURITY;

-- RLS Policies for aliases
CREATE POLICY "Users can view own campaign aliases"
  ON memory_aliases FOR SELECT
  TO authenticated
  USING (
    campaign_id IN (
      SELECT id FROM campaigns WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own campaign aliases"
  ON memory_aliases FOR INSERT
  TO authenticated
  WITH CHECK (
    campaign_id IN (
      SELECT id FROM campaigns WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own campaign aliases"
  ON memory_aliases FOR UPDATE
  TO authenticated
  USING (
    campaign_id IN (
      SELECT id FROM campaigns WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    campaign_id IN (
      SELECT id FROM campaigns WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own campaign aliases"
  ON memory_aliases FOR DELETE
  TO authenticated
  USING (
    campaign_id IN (
      SELECT id FROM campaigns WHERE user_id = auth.uid()
    )
  );

-- =====================================================================
-- 3. RELATIONSHIP TYPES TABLE
-- =====================================================================

CREATE TABLE IF NOT EXISTS relationship_types (
  key VARCHAR(50) PRIMARY KEY,
  inverse_key VARCHAR(50) NOT NULL,
  description TEXT
);

-- Enable RLS (but this is a shared reference table)
ALTER TABLE relationship_types ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to read relationship types
CREATE POLICY "Anyone can view relationship types"
  ON relationship_types FOR SELECT
  TO authenticated
  USING (true);

-- Seed with standard relationship types
INSERT INTO relationship_types (key, inverse_key, description) VALUES
  ('located_in', 'contains', 'Physical location relationship'),
  ('works_for', 'employs', 'Employment relationship'),
  ('owns', 'owned_by', 'Ownership relationship'),
  ('knows', 'knows', 'Social connection (symmetric)'),
  ('enemies_with', 'enemies_with', 'Adversarial relationship (symmetric)'),
  ('gives_quest', 'quest_given_by', 'Quest assignment'),
  ('part_of', 'contains', 'Hierarchical membership'),
  ('leads', 'led_by', 'Leadership relationship'),
  ('married_to', 'married_to', 'Marriage (symmetric)'),
  ('parent_of', 'child_of', 'Family relationship'),
  ('created_by', 'created', 'Creation relationship'),
  ('guards', 'guarded_by', 'Protection relationship'),
  ('mentions', 'mentioned_by', 'General reference')
ON CONFLICT (key) DO NOTHING;

-- =====================================================================
-- 4. MEMORY RELATIONSHIPS TABLE
-- =====================================================================

CREATE TABLE IF NOT EXISTS memory_relationships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  from_entry_id UUID NOT NULL REFERENCES memories(id) ON DELETE CASCADE,
  to_entry_id UUID NOT NULL REFERENCES memories(id) ON DELETE CASCADE,
  relationship_type VARCHAR(50) NOT NULL REFERENCES relationship_types(key),
  status VARCHAR(50) DEFAULT 'confirmed', -- confirmed, suggested, dismissed
  confidence_score NUMERIC(3,2), -- 0.00 to 1.00 for AI suggestions
  source_text TEXT, -- Context where relationship was detected
  created_by VARCHAR(50) DEFAULT 'manual', -- manual, ai, session_summary
  created_at TIMESTAMPTZ DEFAULT now(),
  
  UNIQUE(from_entry_id, to_entry_id, relationship_type),
  CHECK (from_entry_id != to_entry_id) -- Prevent self-references
);

-- Enable RLS
ALTER TABLE memory_relationships ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own campaign relationships"
  ON memory_relationships FOR SELECT
  TO authenticated
  USING (
    campaign_id IN (
      SELECT id FROM campaigns WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own campaign relationships"
  ON memory_relationships FOR INSERT
  TO authenticated
  WITH CHECK (
    campaign_id IN (
      SELECT id FROM campaigns WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own campaign relationships"
  ON memory_relationships FOR UPDATE
  TO authenticated
  USING (
    campaign_id IN (
      SELECT id FROM campaigns WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    campaign_id IN (
      SELECT id FROM campaigns WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own campaign relationships"
  ON memory_relationships FOR DELETE
  TO authenticated
  USING (
    campaign_id IN (
      SELECT id FROM campaigns WHERE user_id = auth.uid()
    )
  );

-- =====================================================================
-- 5. SESSION APPEARANCES TABLE
-- =====================================================================

CREATE TABLE IF NOT EXISTS session_appearances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  memory_entry_id UUID NOT NULL REFERENCES memories(id) ON DELETE CASCADE,
  session_number INTEGER NOT NULL,
  session_id UUID, -- Reference to actual session if exists
  notes TEXT, -- What happened with this entry in this session
  scene VARCHAR(100), -- Optional scene/beat tracking
  created_at TIMESTAMPTZ DEFAULT now(),
  
  UNIQUE(memory_entry_id, session_number)
);

-- Enable RLS
ALTER TABLE session_appearances ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own campaign session appearances"
  ON session_appearances FOR SELECT
  TO authenticated
  USING (
    campaign_id IN (
      SELECT id FROM campaigns WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own campaign session appearances"
  ON session_appearances FOR INSERT
  TO authenticated
  WITH CHECK (
    campaign_id IN (
      SELECT id FROM campaigns WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own campaign session appearances"
  ON session_appearances FOR UPDATE
  TO authenticated
  USING (
    campaign_id IN (
      SELECT id FROM campaigns WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    campaign_id IN (
      SELECT id FROM campaigns WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own campaign session appearances"
  ON session_appearances FOR DELETE
  TO authenticated
  USING (
    campaign_id IN (
      SELECT id FROM campaigns WHERE user_id = auth.uid()
    )
  );

-- =====================================================================
-- 6. IMPORT BATCHES TABLE
-- =====================================================================

CREATE TABLE IF NOT EXISTS import_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  source_name VARCHAR(255), -- Filename
  source_type VARCHAR(50), -- file, paste, api
  status VARCHAR(50) DEFAULT 'processing', -- processing, review, completed, cancelled
  idempotency_key TEXT, -- Prevent duplicate imports
  entry_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ
);

-- Unique index for idempotency
CREATE UNIQUE INDEX IF NOT EXISTS uniq_import_idem 
  ON import_batches(campaign_id, idempotency_key) 
  WHERE idempotency_key IS NOT NULL;

-- Enable RLS
ALTER TABLE import_batches ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own import batches"
  ON import_batches FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own import batches"
  ON import_batches FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own import batches"
  ON import_batches FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own import batches"
  ON import_batches FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- =====================================================================
-- 7. DETECTED ENTITIES TABLE
-- =====================================================================

CREATE TABLE IF NOT EXISTS detected_entities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  source_id UUID NOT NULL, -- ID of forge output, session, etc.
  source_type VARCHAR(50) NOT NULL, -- town_forge, session_outline, etc.
  entity_text VARCHAR(255) NOT NULL, -- The actual text detected
  entity_type VARCHAR(50) NOT NULL, -- NPC, Location, Monster, Item
  confidence_score NUMERIC(3,2), -- 0.00 to 1.00
  context_snippet TEXT, -- Surrounding text for context
  start_position INTEGER,
  end_position INTEGER,
  match_method VARCHAR(50), -- exact, alias, fuzzy, regex
  alias_matched BOOLEAN DEFAULT false,
  memory_entry_id UUID REFERENCES memories(id), -- If linked to memory
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE detected_entities ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own campaign detected entities"
  ON detected_entities FOR SELECT
  TO authenticated
  USING (
    campaign_id IN (
      SELECT id FROM campaigns WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own campaign detected entities"
  ON detected_entities FOR INSERT
  TO authenticated
  WITH CHECK (
    campaign_id IN (
      SELECT id FROM campaigns WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own campaign detected entities"
  ON detected_entities FOR UPDATE
  TO authenticated
  USING (
    campaign_id IN (
      SELECT id FROM campaigns WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    campaign_id IN (
      SELECT id FROM campaigns WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own campaign detected entities"
  ON detected_entities FOR DELETE
  TO authenticated
  USING (
    campaign_id IN (
      SELECT id FROM campaigns WHERE user_id = auth.uid()
    )
  );

-- =====================================================================
-- 8. INDEXES FOR PERFORMANCE
-- =====================================================================

-- Fuzzy search indexes
CREATE INDEX IF NOT EXISTS idx_memories_trgm_name 
  ON memories USING gin (name gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_memories_trgm_content 
  ON memories USING gin (content gin_trgm_ops);

-- Full-text search index
CREATE INDEX IF NOT EXISTS idx_memories_fulltext 
  ON memories USING GIN(
    to_tsvector('english', name || ' ' || COALESCE(content, '') || ' ' || COALESCE(dm_notes, ''))
  );

-- Campaign-scoped queries
CREATE INDEX IF NOT EXISTS idx_memories_campaign_type 
  ON memories(campaign_id, type);

CREATE INDEX IF NOT EXISTS idx_memories_campaign_pinned 
  ON memories(campaign_id, pinned) WHERE pinned = true;

CREATE INDEX IF NOT EXISTS idx_memories_campaign_archived 
  ON memories(campaign_id, archived);

CREATE INDEX IF NOT EXISTS idx_memories_user 
  ON memories(user_id);

CREATE INDEX IF NOT EXISTS idx_memories_slug 
  ON memories(campaign_id, slug);

-- Tags array search
CREATE INDEX IF NOT EXISTS idx_memories_tags 
  ON memories USING gin (tags);

-- Relationships
CREATE INDEX IF NOT EXISTS idx_relationships_campaign_from 
  ON memory_relationships(campaign_id, from_entry_id);

CREATE INDEX IF NOT EXISTS idx_relationships_campaign_to 
  ON memory_relationships(campaign_id, to_entry_id);

CREATE INDEX IF NOT EXISTS idx_relationships_from 
  ON memory_relationships(from_entry_id);

CREATE INDEX IF NOT EXISTS idx_relationships_to 
  ON memory_relationships(to_entry_id);

-- Aliases
CREATE INDEX IF NOT EXISTS idx_aliases_lookup 
  ON memory_aliases(campaign_id, alias);

CREATE INDEX IF NOT EXISTS idx_aliases_memory 
  ON memory_aliases(memory_id);

-- Session appearances
CREATE INDEX IF NOT EXISTS idx_session_appearances_entry 
  ON session_appearances(memory_entry_id);

CREATE INDEX IF NOT EXISTS idx_session_appearances_session 
  ON session_appearances(session_number);

CREATE INDEX IF NOT EXISTS idx_session_appearances_campaign 
  ON session_appearances(campaign_id, session_number);

-- Detected entities
CREATE INDEX IF NOT EXISTS idx_detected_entities_source 
  ON detected_entities(campaign_id, source_id, source_type);

CREATE INDEX IF NOT EXISTS idx_detected_entities_memory 
  ON detected_entities(memory_entry_id);

-- Import batches
CREATE INDEX IF NOT EXISTS idx_import_batches_campaign 
  ON import_batches(campaign_id);

CREATE INDEX IF NOT EXISTS idx_import_batches_status 
  ON import_batches(status);
