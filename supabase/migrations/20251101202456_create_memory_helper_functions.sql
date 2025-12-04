/*
  # Campaign Ally Memory System - Helper Functions
  
  Creates utility functions for:
  1. Getting all relationships for an entry (including inverses)
  2. Fuzzy search across memories
  3. Finding entities by alias
*/

-- =====================================================================
-- 1. FUNCTION: Get All Relationships for an Entry
-- Returns both outgoing and incoming relationships with proper labels
-- =====================================================================

CREATE OR REPLACE FUNCTION get_entry_relationships(entry_id UUID)
RETURNS TABLE (
  relationship_id UUID,
  related_entry_id UUID,
  related_entry_name TEXT,
  relationship_type VARCHAR(50),
  direction VARCHAR(10), -- 'outgoing' or 'incoming'
  status VARCHAR(50)
) AS $$
BEGIN
  RETURN QUERY
  -- Outgoing relationships
  SELECT 
    r.id,
    r.to_entry_id,
    m.name,
    r.relationship_type,
    'outgoing'::VARCHAR(10),
    r.status
  FROM memory_relationships r
  JOIN memories m ON r.to_entry_id = m.id
  WHERE r.from_entry_id = entry_id
  
  UNION ALL
  
  -- Incoming relationships (with inverse labels)
  SELECT 
    r.id,
    r.from_entry_id,
    m.name,
    rt.inverse_key,
    'incoming'::VARCHAR(10),
    r.status
  FROM memory_relationships r
  JOIN memories m ON r.from_entry_id = m.id
  JOIN relationship_types rt ON r.relationship_type = rt.key
  WHERE r.to_entry_id = entry_id;
END;
$$ LANGUAGE plpgsql;

-- =====================================================================
-- 2. FUNCTION: Fuzzy Search Memories
-- Searches across name and content using trigram similarity
-- =====================================================================

CREATE OR REPLACE FUNCTION search_memories(
  search_campaign_id UUID,
  search_term TEXT,
  min_similarity NUMERIC DEFAULT 0.3
)
RETURNS TABLE (
  memory_id UUID,
  memory_name TEXT,
  memory_type VARCHAR(50),
  name_score NUMERIC,
  content_score NUMERIC,
  best_score NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    m.id,
    m.name,
    m.type,
    similarity(m.name, search_term) as name_score,
    similarity(COALESCE(m.content, ''), search_term) as content_score,
    GREATEST(
      similarity(m.name, search_term),
      similarity(COALESCE(m.content, ''), search_term)
    ) as best_score
  FROM memories m
  WHERE m.campaign_id = search_campaign_id
    AND m.archived = false
    AND (
      similarity(m.name, search_term) > min_similarity
      OR similarity(COALESCE(m.content, ''), search_term) > min_similarity * 0.7
    )
  ORDER BY best_score DESC
  LIMIT 20;
END;
$$ LANGUAGE plpgsql;

-- =====================================================================
-- 3. FUNCTION: Find Memory by Name or Alias
-- Returns memory entries that match by exact name or alias
-- =====================================================================

CREATE OR REPLACE FUNCTION find_memory_by_name_or_alias(
  search_campaign_id UUID,
  search_name TEXT
)
RETURNS TABLE (
  memory_id UUID,
  memory_name TEXT,
  memory_type VARCHAR(50),
  matched_via TEXT -- 'name' or 'alias'
) AS $$
BEGIN
  RETURN QUERY
  -- Exact name matches
  SELECT 
    m.id,
    m.name,
    m.type,
    'name'::TEXT
  FROM memories m
  WHERE m.campaign_id = search_campaign_id
    AND m.archived = false
    AND LOWER(m.name) = LOWER(search_name)
  
  UNION ALL
  
  -- Alias matches
  SELECT 
    m.id,
    m.name,
    m.type,
    'alias'::TEXT
  FROM memories m
  JOIN memory_aliases a ON a.memory_id = m.id
  WHERE a.campaign_id = search_campaign_id
    AND m.archived = false
    AND LOWER(a.alias) = LOWER(search_name)
    AND NOT EXISTS (
      -- Avoid duplicates if alias matches name
      SELECT 1
      FROM memories m2
      WHERE m2.id = m.id
      AND LOWER(m2.name) = LOWER(search_name)
    );
END;
$$ LANGUAGE plpgsql;

-- =====================================================================
-- 4. FUNCTION: Get Memory Statistics
-- Returns useful stats about a campaign's memory system
-- =====================================================================

CREATE OR REPLACE FUNCTION get_memory_stats(search_campaign_id UUID)
RETURNS TABLE (
  total_entries BIGINT,
  entries_by_type JSONB,
  total_relationships BIGINT,
  total_aliases BIGINT,
  pinned_count BIGINT,
  archived_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    (SELECT COUNT(*) FROM memories WHERE campaign_id = search_campaign_id)::BIGINT,
    (
      SELECT jsonb_object_agg(type, count)
      FROM (
        SELECT type, COUNT(*)::INTEGER as count
        FROM memories
        WHERE campaign_id = search_campaign_id
        GROUP BY type
      ) type_counts
    ),
    (SELECT COUNT(*) FROM memory_relationships WHERE campaign_id = search_campaign_id)::BIGINT,
    (SELECT COUNT(*) FROM memory_aliases WHERE campaign_id = search_campaign_id)::BIGINT,
    (SELECT COUNT(*) FROM memories WHERE campaign_id = search_campaign_id AND pinned = true)::BIGINT,
    (SELECT COUNT(*) FROM memories WHERE campaign_id = search_campaign_id AND archived = true)::BIGINT;
END;
$$ LANGUAGE plpgsql;

-- =====================================================================
-- 5. FUNCTION: Get Related Memories (Network)
-- Returns all memories related to a given entry (1-hop network)
-- =====================================================================

CREATE OR REPLACE FUNCTION get_related_memories(entry_id UUID, max_depth INTEGER DEFAULT 1)
RETURNS TABLE (
  memory_id UUID,
  memory_name TEXT,
  memory_type VARCHAR(50),
  relationship_path TEXT,
  distance INTEGER
) AS $$
BEGIN
  RETURN QUERY
  WITH RECURSIVE related AS (
    -- Start with direct relationships
    SELECT 
      m.id,
      m.name,
      m.type,
      r.relationship_type::TEXT as relationship_path,
      1 as distance
    FROM memory_relationships r
    JOIN memories m ON m.id = r.to_entry_id
    WHERE r.from_entry_id = entry_id
    
    UNION ALL
    
    -- Inverse relationships
    SELECT 
      m.id,
      m.name,
      m.type,
      rt.inverse_key::TEXT as relationship_path,
      1 as distance
    FROM memory_relationships r
    JOIN memories m ON m.id = r.from_entry_id
    JOIN relationship_types rt ON rt.key = r.relationship_type
    WHERE r.to_entry_id = entry_id
    
    UNION ALL
    
    -- Recursive step (if max_depth > 1)
    SELECT 
      m.id,
      m.name,
      m.type,
      rel.relationship_path || ' → ' || r.relationship_type as relationship_path,
      rel.distance + 1
    FROM related rel
    JOIN memory_relationships r ON r.from_entry_id = rel.memory_id
    JOIN memories m ON m.id = r.to_entry_id
    WHERE rel.distance < max_depth
      AND m.id != entry_id -- Prevent cycles back to origin
  )
  SELECT DISTINCT ON (memory_id)
    memory_id,
    memory_name,
    memory_type,
    relationship_path,
    distance
  FROM related
  ORDER BY memory_id, distance ASC
  LIMIT 50; -- Safety limit
END;
$$ LANGUAGE plpgsql;
