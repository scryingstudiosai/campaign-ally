/*
  # Fix Critical RLS Performance Issues - Part 2

  Continues RLS optimization for memories and related tables.
*/

-- MEMORIES TABLE
DROP POLICY IF EXISTS "Users can view own campaign memories" ON public.memories;
CREATE POLICY "Users can view own campaign memories" ON public.memories
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.campaigns
      WHERE campaigns.id = memories.campaign_id
      AND campaigns.user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can insert own campaign memories" ON public.memories;
CREATE POLICY "Users can insert own campaign memories" ON public.memories
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.campaigns
      WHERE campaigns.id = memories.campaign_id
      AND campaigns.user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can update own campaign memories" ON public.memories;
CREATE POLICY "Users can update own campaign memories" ON public.memories
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.campaigns
      WHERE campaigns.id = memories.campaign_id
      AND campaigns.user_id = (select auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.campaigns
      WHERE campaigns.id = memories.campaign_id
      AND campaigns.user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can delete own campaign memories" ON public.memories;
CREATE POLICY "Users can delete own campaign memories" ON public.memories
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.campaigns
      WHERE campaigns.id = memories.campaign_id
      AND campaigns.user_id = (select auth.uid())
    )
  );

-- MEMORY_ALIASES TABLE
DROP POLICY IF EXISTS "Users can view own campaign aliases" ON public.memory_aliases;
CREATE POLICY "Users can view own campaign aliases" ON public.memory_aliases
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.memories
      JOIN public.campaigns ON campaigns.id = memories.campaign_id
      WHERE memories.id = memory_aliases.memory_id
      AND campaigns.user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can insert own campaign aliases" ON public.memory_aliases;
CREATE POLICY "Users can insert own campaign aliases" ON public.memory_aliases
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.memories
      JOIN public.campaigns ON campaigns.id = memories.campaign_id
      WHERE memories.id = memory_aliases.memory_id
      AND campaigns.user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can update own campaign aliases" ON public.memory_aliases;
CREATE POLICY "Users can update own campaign aliases" ON public.memory_aliases
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.memories
      JOIN public.campaigns ON campaigns.id = memories.campaign_id
      WHERE memories.id = memory_aliases.memory_id
      AND campaigns.user_id = (select auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.memories
      JOIN public.campaigns ON campaigns.id = memories.campaign_id
      WHERE memories.id = memory_aliases.memory_id
      AND campaigns.user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can delete own campaign aliases" ON public.memory_aliases;
CREATE POLICY "Users can delete own campaign aliases" ON public.memory_aliases
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.memories
      JOIN public.campaigns ON campaigns.id = memories.campaign_id
      WHERE memories.id = memory_aliases.memory_id
      AND campaigns.user_id = (select auth.uid())
    )
  );

-- MEMORY_RELATIONSHIPS TABLE (using correct column names)
DROP POLICY IF EXISTS "Users can view own campaign relationships" ON public.memory_relationships;
CREATE POLICY "Users can view own campaign relationships" ON public.memory_relationships
  FOR SELECT TO authenticated
  USING (
    campaign_id IN (
      SELECT id FROM public.campaigns WHERE user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can insert own campaign relationships" ON public.memory_relationships;
CREATE POLICY "Users can insert own campaign relationships" ON public.memory_relationships
  FOR INSERT TO authenticated
  WITH CHECK (
    campaign_id IN (
      SELECT id FROM public.campaigns WHERE user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can update own campaign relationships" ON public.memory_relationships;
CREATE POLICY "Users can update own campaign relationships" ON public.memory_relationships
  FOR UPDATE TO authenticated
  USING (
    campaign_id IN (
      SELECT id FROM public.campaigns WHERE user_id = (select auth.uid())
    )
  )
  WITH CHECK (
    campaign_id IN (
      SELECT id FROM public.campaigns WHERE user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can delete own campaign relationships" ON public.memory_relationships;
CREATE POLICY "Users can delete own campaign relationships" ON public.memory_relationships
  FOR DELETE TO authenticated
  USING (
    campaign_id IN (
      SELECT id FROM public.campaigns WHERE user_id = (select auth.uid())
    )
  );

-- SESSION_APPEARANCES TABLE
DROP POLICY IF EXISTS "Users can view own campaign session appearances" ON public.session_appearances;
CREATE POLICY "Users can view own campaign session appearances" ON public.session_appearances
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.memories
      JOIN public.campaigns ON campaigns.id = memories.campaign_id
      WHERE memories.id = session_appearances.memory_entry_id
      AND campaigns.user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can insert own campaign session appearances" ON public.session_appearances;
CREATE POLICY "Users can insert own campaign session appearances" ON public.session_appearances
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.memories
      JOIN public.campaigns ON campaigns.id = memories.campaign_id
      WHERE memories.id = session_appearances.memory_entry_id
      AND campaigns.user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can update own campaign session appearances" ON public.session_appearances;
CREATE POLICY "Users can update own campaign session appearances" ON public.session_appearances
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.memories
      JOIN public.campaigns ON campaigns.id = memories.campaign_id
      WHERE memories.id = session_appearances.memory_entry_id
      AND campaigns.user_id = (select auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.memories
      JOIN public.campaigns ON campaigns.id = memories.campaign_id
      WHERE memories.id = session_appearances.memory_entry_id
      AND campaigns.user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can delete own campaign session appearances" ON public.session_appearances;
CREATE POLICY "Users can delete own campaign session appearances" ON public.session_appearances
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.memories
      JOIN public.campaigns ON campaigns.id = memories.campaign_id
      WHERE memories.id = session_appearances.memory_entry_id
      AND campaigns.user_id = (select auth.uid())
    )
  );

-- IMPORT_BATCHES TABLE
DROP POLICY IF EXISTS "Users can view own import batches" ON public.import_batches;
CREATE POLICY "Users can view own import batches" ON public.import_batches
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.campaigns
      WHERE campaigns.id = import_batches.campaign_id
      AND campaigns.user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can insert own import batches" ON public.import_batches;
CREATE POLICY "Users can insert own import batches" ON public.import_batches
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.campaigns
      WHERE campaigns.id = import_batches.campaign_id
      AND campaigns.user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can update own import batches" ON public.import_batches;
CREATE POLICY "Users can update own import batches" ON public.import_batches
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.campaigns
      WHERE campaigns.id = import_batches.campaign_id
      AND campaigns.user_id = (select auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.campaigns
      WHERE campaigns.id = import_batches.campaign_id
      AND campaigns.user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can delete own import batches" ON public.import_batches;
CREATE POLICY "Users can delete own import batches" ON public.import_batches
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.campaigns
      WHERE campaigns.id = import_batches.campaign_id
      AND campaigns.user_id = (select auth.uid())
    )
  );

-- DETECTED_ENTITIES TABLE
DROP POLICY IF EXISTS "Users can view own campaign detected entities" ON public.detected_entities;
CREATE POLICY "Users can view own campaign detected entities" ON public.detected_entities
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.campaigns
      WHERE campaigns.id = detected_entities.campaign_id
      AND campaigns.user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can insert own campaign detected entities" ON public.detected_entities;
CREATE POLICY "Users can insert own campaign detected entities" ON public.detected_entities
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.campaigns
      WHERE campaigns.id = detected_entities.campaign_id
      AND campaigns.user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can update own campaign detected entities" ON public.detected_entities;
CREATE POLICY "Users can update own campaign detected entities" ON public.detected_entities
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.campaigns
      WHERE campaigns.id = detected_entities.campaign_id
      AND campaigns.user_id = (select auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.campaigns
      WHERE campaigns.id = detected_entities.campaign_id
      AND campaigns.user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can delete own campaign detected entities" ON public.detected_entities;
CREATE POLICY "Users can delete own campaign detected entities" ON public.detected_entities
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.campaigns
      WHERE campaigns.id = detected_entities.campaign_id
      AND campaigns.user_id = (select auth.uid())
    )
  );

-- RELATIONS TABLE
DROP POLICY IF EXISTS "Users can view relations in their campaigns" ON public.relations;
CREATE POLICY "Users can view relations in their campaigns" ON public.relations
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.campaigns
      WHERE campaigns.id = relations.campaign_id
      AND campaigns.user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can create relations in their campaigns" ON public.relations;
CREATE POLICY "Users can create relations in their campaigns" ON public.relations
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.campaigns
      WHERE campaigns.id = relations.campaign_id
      AND campaigns.user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can update relations in their campaigns" ON public.relations;
CREATE POLICY "Users can update relations in their campaigns" ON public.relations
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.campaigns
      WHERE campaigns.id = relations.campaign_id
      AND campaigns.user_id = (select auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.campaigns
      WHERE campaigns.id = relations.campaign_id
      AND campaigns.user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can delete relations in their campaigns" ON public.relations;
CREATE POLICY "Users can delete relations in their campaigns" ON public.relations
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.campaigns
      WHERE campaigns.id = relations.campaign_id
      AND campaigns.user_id = (select auth.uid())
    )
  );