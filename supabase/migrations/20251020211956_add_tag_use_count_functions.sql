/*
  # Add Tag Use Count Management Functions

  ## Summary
  This migration adds PostgreSQL functions to manage tag use counts automatically.
  These functions handle incrementing and decrementing use_count in campaign_tags
  when tags are added to or removed from memory_chunks.

  ## New Functions

  ### increment_tag_use_count
  Increments the use_count for a tag, or creates the tag if it doesn't exist.
  Used when adding tags to memory chunks.

  ### decrement_tag_use_count
  Decrements the use_count for a tag. If use_count reaches 0, optionally deletes
  the tag (for custom tags only, preserves preset tags).

  ### sync_tag_use_counts
  Utility function to recalculate all use_counts based on actual usage.
  Useful for maintenance or recovery.

  ## Security
  Functions are SECURITY DEFINER to allow authenticated users to modify tag counts
  while maintaining RLS on the underlying tables.
*/

-- ============================================================================
-- Function: increment_tag_use_count
-- ============================================================================

CREATE OR REPLACE FUNCTION increment_tag_use_count(
  p_campaign_id UUID,
  p_tag_name TEXT
)
RETURNS void AS $$
BEGIN
  INSERT INTO public.campaign_tags (campaign_id, tag_name, tag_category, use_count)
  VALUES (p_campaign_id, p_tag_name, 'custom', 1)
  ON CONFLICT (campaign_id, tag_name)
  DO UPDATE SET use_count = campaign_tags.use_count + 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION increment_tag_use_count(UUID, TEXT) TO authenticated;

-- ============================================================================
-- Function: decrement_tag_use_count
-- ============================================================================

CREATE OR REPLACE FUNCTION decrement_tag_use_count(
  p_campaign_id UUID,
  p_tag_name TEXT
)
RETURNS void AS $$
BEGIN
  UPDATE public.campaign_tags
  SET use_count = GREATEST(0, use_count - 1)
  WHERE campaign_id = p_campaign_id
  AND tag_name = p_tag_name;
  
  DELETE FROM public.campaign_tags
  WHERE campaign_id = p_campaign_id
  AND tag_name = p_tag_name
  AND use_count = 0
  AND tag_category != 'preset';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION decrement_tag_use_count(UUID, TEXT) TO authenticated;

-- ============================================================================
-- Function: sync_tag_use_counts
-- ============================================================================

CREATE OR REPLACE FUNCTION sync_tag_use_counts(p_campaign_id UUID DEFAULT NULL)
RETURNS void AS $$
DECLARE
  campaign_record RECORD;
  tag_record RECORD;
  actual_count INTEGER;
BEGIN
  IF p_campaign_id IS NOT NULL THEN
    FOR tag_record IN
      SELECT campaign_id, tag_name
      FROM campaign_tags
      WHERE campaign_id = p_campaign_id
    LOOP
      SELECT COUNT(*) INTO actual_count
      FROM memory_chunks
      WHERE campaign_id = tag_record.campaign_id
      AND tag_record.tag_name = ANY(tags);
      
      UPDATE campaign_tags
      SET use_count = actual_count
      WHERE campaign_id = tag_record.campaign_id
      AND tag_name = tag_record.tag_name;
      
      DELETE FROM campaign_tags
      WHERE campaign_id = tag_record.campaign_id
      AND tag_name = tag_record.tag_name
      AND use_count = 0
      AND tag_category != 'preset';
    END LOOP;
  ELSE
    FOR campaign_record IN SELECT id FROM campaigns
    LOOP
      PERFORM sync_tag_use_counts(campaign_record.id);
    END LOOP;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION sync_tag_use_counts(UUID) TO authenticated;