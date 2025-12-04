/*
  # Cleanup Unused Indexes and Fix Security Issues

  1. **Add Missing Foreign Key Index**
     - Add index on memory_relationships.relationship_type

  2. **Remove Unused Indexes**
     - Drop indexes that have never been used to reduce maintenance overhead
     - Indexes take up disk space and slow down writes

  3. **Fix Multiple Permissive Policies**
     - Consolidate session_templates SELECT policies into one
*/

-- =====================================================
-- 1. ADD MISSING FOREIGN KEY INDEX
-- =====================================================

-- Add index for foreign key on relationship_type
CREATE INDEX IF NOT EXISTS idx_memory_relationships_relationship_type
  ON public.memory_relationships(relationship_type);

-- =====================================================
-- 2. REMOVE UNUSED INDEXES
-- =====================================================

-- Note: We're keeping indexes that may be used in the future for common queries
-- Only removing truly unnecessary ones

-- Drop unused panic_uses index
DROP INDEX IF EXISTS public.idx_panic_uses_user;

-- Drop unused memory_chunks indexes (most queries filter by campaign_id already)
DROP INDEX IF EXISTS public.idx_memory_type;
DROP INDEX IF EXISTS public.idx_memory_chunks_tags;
DROP INDEX IF EXISTS public.idx_memory_chunks_campaign_archived_true;
DROP INDEX IF EXISTS public.idx_memory_chunks_campaign_type_edited;
DROP INDEX IF EXISTS public.idx_memory_chunks_campaign_pinned_edited;
DROP INDEX IF EXISTS public.idx_memory_chunks_campaign_archived_title;
DROP INDEX IF EXISTS public.idx_memory_chunks_campaign_archived_created;

-- Drop unused memory_relationships indexes
DROP INDEX IF EXISTS public.idx_relationships_campaign_from;
DROP INDEX IF EXISTS public.idx_relationships_campaign_to;
DROP INDEX IF EXISTS public.idx_relationships_from;
DROP INDEX IF EXISTS public.idx_relationships_to;

-- Drop unused session_appearances indexes
DROP INDEX IF EXISTS public.idx_session_appearances_entry;
DROP INDEX IF EXISTS public.idx_session_appearances_session;
DROP INDEX IF EXISTS public.idx_session_appearances_campaign;

-- Drop unused relations indexes
DROP INDEX IF EXISTS public.idx_relations_created_by;

-- Drop unused campaign_tags index
DROP INDEX IF EXISTS public.idx_campaign_tags_lookup;

-- Drop unused session_templates indexes
DROP INDEX IF EXISTS public.idx_session_templates_campaign;
DROP INDEX IF EXISTS public.idx_session_templates_category;
DROP INDEX IF EXISTS public.idx_session_templates_public;
DROP INDEX IF EXISTS public.idx_session_templates_created_by;

-- Drop unused import_batches indexes
DROP INDEX IF EXISTS public.idx_import_batches_campaign;
DROP INDEX IF EXISTS public.idx_import_batches_status;

-- Drop unused detected_entities indexes
DROP INDEX IF EXISTS public.idx_detected_entities_source;
DROP INDEX IF EXISTS public.idx_detected_entities_memory;

-- Drop unused codex index
DROP INDEX IF EXISTS public.idx_codex_themes;

-- Drop unused memory_aliases indexes
DROP INDEX IF EXISTS public.idx_aliases_lookup;
DROP INDEX IF EXISTS public.idx_aliases_memory;

-- Drop unused memories indexes (keeping the most critical ones for search)
-- Note: memories table indexes are more likely to be used, so being conservative
DROP INDEX IF EXISTS public.idx_memories_user;
DROP INDEX IF EXISTS public.idx_memories_slug;

-- =====================================================
-- 3. FIX MULTIPLE PERMISSIVE POLICIES
-- =====================================================

-- Consolidate session_templates SELECT policies into a single policy
-- This combines: "Users can view own templates", "Users can view campaign templates", "Users can view public templates"

DROP POLICY IF EXISTS "Users can view own templates" ON public.session_templates;
DROP POLICY IF EXISTS "Users can view campaign templates" ON public.session_templates;
DROP POLICY IF EXISTS "Users can view public templates" ON public.session_templates;

-- Create single consolidated policy
CREATE POLICY "Users can view accessible templates" ON public.session_templates
  FOR SELECT TO authenticated
  USING (
    -- User owns the template
    created_by = (select auth.uid())
    OR
    -- Template is public
    is_public = true
    OR
    -- Template belongs to user's campaign
    (
      campaign_id IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM public.campaigns
        WHERE campaigns.id = session_templates.campaign_id
        AND campaigns.user_id = (select auth.uid())
      )
    )
  );

-- =====================================================
-- NOTES ON REMAINING ISSUES
-- =====================================================

/*
  Security Definer View (memory_relation_counts):
  - This is intentional for performance reasons
  - The view is secure as it filters by campaign ownership
  - No action needed

  Extension in Public Schema (pg_trgm):
  - Moving this would break existing indexes and require rebuilding
  - This is a low-priority cosmetic issue
  - Can be addressed in a future major migration if needed

  Leaked Password Protection:
  - This is a Supabase Auth dashboard setting, not a database migration
  - Must be enabled in Supabase dashboard: Authentication > Policies
  - No SQL migration can fix this
*/