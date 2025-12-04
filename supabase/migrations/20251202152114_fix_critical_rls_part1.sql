/*
  # Fix Critical RLS Performance Issues - Part 1

  Optimizes RLS policies for core tables by replacing auth.uid() with (select auth.uid()).
  This prevents re-evaluation for each row, dramatically improving query performance.

  Also removes duplicate policies on memory_chunks.
*/

-- Remove duplicate policies on memory_chunks  
DROP POLICY IF EXISTS "Authenticated users can select all memory chunks" ON public.memory_chunks;
DROP POLICY IF EXISTS "Authenticated users can insert memory chunks" ON public.memory_chunks;
DROP POLICY IF EXISTS "Authenticated users can update all memory chunks" ON public.memory_chunks;
DROP POLICY IF EXISTS "Authenticated users can delete memory chunks" ON public.memory_chunks;

-- PROFILES TABLE
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT TO authenticated
  USING (id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE TO authenticated
  USING (id = (select auth.uid()))
  WITH CHECK (id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT TO authenticated
  WITH CHECK (id = (select auth.uid()));

-- CAMPAIGNS TABLE
DROP POLICY IF EXISTS "Users can view own campaigns" ON public.campaigns;
CREATE POLICY "Users can view own campaigns" ON public.campaigns
  FOR SELECT TO authenticated
  USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can insert own campaigns" ON public.campaigns;
CREATE POLICY "Users can insert own campaigns" ON public.campaigns
  FOR INSERT TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can update own campaigns" ON public.campaigns;
CREATE POLICY "Users can update own campaigns" ON public.campaigns
  FOR UPDATE TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can delete own campaigns" ON public.campaigns;
CREATE POLICY "Users can delete own campaigns" ON public.campaigns
  FOR DELETE TO authenticated
  USING (user_id = (select auth.uid()));

-- MEMORY_CHUNKS TABLE
DROP POLICY IF EXISTS "Users can view campaign memory" ON public.memory_chunks;
CREATE POLICY "Users can view campaign memory" ON public.memory_chunks
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.campaigns
      WHERE campaigns.id = memory_chunks.campaign_id
      AND campaigns.user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can insert campaign memory" ON public.memory_chunks;
CREATE POLICY "Users can insert campaign memory" ON public.memory_chunks
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.campaigns
      WHERE campaigns.id = memory_chunks.campaign_id
      AND campaigns.user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can update campaign memory" ON public.memory_chunks;
CREATE POLICY "Users can update campaign memory" ON public.memory_chunks
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.campaigns
      WHERE campaigns.id = memory_chunks.campaign_id
      AND campaigns.user_id = (select auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.campaigns
      WHERE campaigns.id = memory_chunks.campaign_id
      AND campaigns.user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can delete campaign memory" ON public.memory_chunks;
CREATE POLICY "Users can delete campaign memory" ON public.memory_chunks
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.campaigns
      WHERE campaigns.id = memory_chunks.campaign_id
      AND campaigns.user_id = (select auth.uid())
    )
  );

-- PANIC_USES TABLE
DROP POLICY IF EXISTS "Users can view own panic uses" ON public.panic_uses;
CREATE POLICY "Users can view own panic uses" ON public.panic_uses
  FOR SELECT TO authenticated
  USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can insert own panic uses" ON public.panic_uses;
CREATE POLICY "Users can insert own panic uses" ON public.panic_uses
  FOR INSERT TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

-- CAMPAIGN_TAGS TABLE
DROP POLICY IF EXISTS "Users can view own campaign tags" ON public.campaign_tags;
CREATE POLICY "Users can view own campaign tags" ON public.campaign_tags
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.campaigns
      WHERE campaigns.id = campaign_tags.campaign_id
      AND campaigns.user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can create tags in own campaigns" ON public.campaign_tags;
CREATE POLICY "Users can create tags in own campaigns" ON public.campaign_tags
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.campaigns
      WHERE campaigns.id = campaign_tags.campaign_id
      AND campaigns.user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can update own campaign tags" ON public.campaign_tags;
CREATE POLICY "Users can update own campaign tags" ON public.campaign_tags
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.campaigns
      WHERE campaigns.id = campaign_tags.campaign_id
      AND campaigns.user_id = (select auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.campaigns
      WHERE campaigns.id = campaign_tags.campaign_id
      AND campaigns.user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can delete own campaign tags" ON public.campaign_tags;
CREATE POLICY "Users can delete own campaign tags" ON public.campaign_tags
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.campaigns
      WHERE campaigns.id = campaign_tags.campaign_id
      AND campaigns.user_id = (select auth.uid())
    )
  );

-- CAMPAIGN_CODEX TABLE
DROP POLICY IF EXISTS "Campaign owners can view their codex" ON public.campaign_codex;
CREATE POLICY "Campaign owners can view their codex" ON public.campaign_codex
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.campaigns
      WHERE campaigns.id = campaign_codex.campaign_id
      AND campaigns.user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Campaign owners can insert their codex" ON public.campaign_codex;
CREATE POLICY "Campaign owners can insert their codex" ON public.campaign_codex
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.campaigns
      WHERE campaigns.id = campaign_codex.campaign_id
      AND campaigns.user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Campaign owners can update their codex" ON public.campaign_codex;
CREATE POLICY "Campaign owners can update their codex" ON public.campaign_codex
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.campaigns
      WHERE campaigns.id = campaign_codex.campaign_id
      AND campaigns.user_id = (select auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.campaigns
      WHERE campaigns.id = campaign_codex.campaign_id
      AND campaigns.user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Campaign owners can delete their codex" ON public.campaign_codex;
CREATE POLICY "Campaign owners can delete their codex" ON public.campaign_codex
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.campaigns
      WHERE campaigns.id = campaign_codex.campaign_id
      AND campaigns.user_id = (select auth.uid())
    )
  );

-- SESSIONS TABLE
DROP POLICY IF EXISTS "Sessions - owner access" ON public.sessions;
CREATE POLICY "Sessions - owner access" ON public.sessions
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.campaigns
      WHERE campaigns.id = sessions.campaign_id
      AND campaigns.user_id = (select auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.campaigns
      WHERE campaigns.id = sessions.campaign_id
      AND campaigns.user_id = (select auth.uid())
    )
  );

-- SCENES TABLE
DROP POLICY IF EXISTS "Scenes - owner access" ON public.scenes;
CREATE POLICY "Scenes - owner access" ON public.scenes
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.sessions
      JOIN public.campaigns ON campaigns.id = sessions.campaign_id
      WHERE sessions.id = scenes.session_id
      AND campaigns.user_id = (select auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.sessions
      JOIN public.campaigns ON campaigns.id = sessions.campaign_id
      WHERE sessions.id = scenes.session_id
      AND campaigns.user_id = (select auth.uid())
    )
  );

-- SESSION_TEMPLATES TABLE
DROP POLICY IF EXISTS "Users can view own templates" ON public.session_templates;
CREATE POLICY "Users can view own templates" ON public.session_templates
  FOR SELECT TO authenticated
  USING (created_by = (select auth.uid()));

DROP POLICY IF EXISTS "Users can view campaign templates" ON public.session_templates;
CREATE POLICY "Users can view campaign templates" ON public.session_templates
  FOR SELECT TO authenticated
  USING (
    campaign_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.campaigns
      WHERE campaigns.id = session_templates.campaign_id
      AND campaigns.user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can create templates" ON public.session_templates;
CREATE POLICY "Users can create templates" ON public.session_templates
  FOR INSERT TO authenticated
  WITH CHECK (created_by = (select auth.uid()));

DROP POLICY IF EXISTS "Users can update own templates" ON public.session_templates;
CREATE POLICY "Users can update own templates" ON public.session_templates
  FOR UPDATE TO authenticated
  USING (created_by = (select auth.uid()))
  WITH CHECK (created_by = (select auth.uid()));

DROP POLICY IF EXISTS "Users can delete own templates" ON public.session_templates;
CREATE POLICY "Users can delete own templates" ON public.session_templates
  FOR DELETE TO authenticated
  USING (created_by = (select auth.uid()));