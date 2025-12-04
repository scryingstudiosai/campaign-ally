/*
  # Drop and recreate search functions with correct types
*/

-- Drop existing functions
DROP FUNCTION IF EXISTS search_memories(UUID, TEXT, NUMERIC);
DROP FUNCTION IF EXISTS find_memory_by_name_or_alias(UUID, TEXT);
DROP FUNCTION IF EXISTS get_related_memories(UUID, INTEGER);

-- Recreate with correct types
CREATE FUNCTION search_memories(
  search_campaign_id UUID,
  search_term TEXT,
  min_similarity NUMERIC DEFAULT 0.3
)
RETURNS TABLE (
  memory_id UUID,
  memory_name TEXT,
  memory_type TEXT,
  name_score NUMERIC,
  content_score NUMERIC,
  best_score NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    m.id,
    m.name::TEXT,
    m.type::TEXT,
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

CREATE FUNCTION find_memory_by_name_or_alias(
  search_campaign_id UUID,
  search_name TEXT
)
RETURNS TABLE (
  memory_id UUID,
  memory_name TEXT,
  memory_type TEXT,
  matched_via TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    m.id,
    m.name::TEXT,
    m.type::TEXT,
    'name'::TEXT
  FROM memories m
  WHERE m.campaign_id = search_campaign_id
    AND m.archived = false
    AND LOWER(m.name) = LOWER(search_name)
  
  UNION ALL
  
  SELECT 
    m.id,
    m.name::TEXT,
    m.type::TEXT,
    'alias'::TEXT
  FROM memories m
  JOIN memory_aliases a ON a.memory_id = m.id
  WHERE a.campaign_id = search_campaign_id
    AND m.archived = false
    AND LOWER(a.alias) = LOWER(search_name)
    AND NOT EXISTS (
      SELECT 1
      FROM memories m2
      WHERE m2.id = m.id
      AND LOWER(m2.name) = LOWER(search_name)
    );
END;
$$ LANGUAGE plpgsql;

CREATE FUNCTION get_related_memories(entry_id UUID, max_depth INTEGER DEFAULT 1)
RETURNS TABLE (
  memory_id UUID,
  memory_name TEXT,
  memory_type TEXT,
  relationship_path TEXT,
  distance INTEGER
) AS $$
BEGIN
  RETURN QUERY
  WITH RECURSIVE related AS (
    SELECT 
      m.id,
      m.name::TEXT,
      m.type::TEXT,
      r.relationship_type::TEXT as relationship_path,
      1 as distance
    FROM memory_relationships r
    JOIN memories m ON m.id = r.to_entry_id
    WHERE r.from_entry_id = entry_id
    
    UNION ALL
    
    SELECT 
      m.id,
      m.name::TEXT,
      m.type::TEXT,
      rt.inverse_key::TEXT as relationship_path,
      1 as distance
    FROM memory_relationships r
    JOIN memories m ON m.id = r.from_entry_id
    JOIN relationship_types rt ON rt.key = r.relationship_type
    WHERE r.to_entry_id = entry_id
    
    UNION ALL
    
    SELECT 
      m.id,
      m.name::TEXT,
      m.type::TEXT,
      rel.relationship_path || ' → ' || r.relationship_type as relationship_path,
      rel.distance + 1
    FROM related rel
    JOIN memory_relationships r ON r.from_entry_id = rel.memory_id
    JOIN memories m ON m.id = r.to_entry_id
    WHERE rel.distance < max_depth
      AND m.id != entry_id
  )
  SELECT DISTINCT ON (memory_id)
    memory_id,
    memory_name,
    memory_type,
    relationship_path,
    distance
  FROM related
  ORDER BY memory_id, distance ASC
  LIMIT 50;
END;
$$ LANGUAGE plpgsql;
