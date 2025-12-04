/*
  # Create Default Codex on Campaign Creation

  1. Changes
    - Add trigger function to automatically create a default codex when a campaign is created
    - Sets default values for tone, narrative_voice, and pacing_preference
    - Uses ON CONFLICT DO NOTHING to safely handle edge cases

  2. Security
    - Trigger runs with SECURITY DEFINER to ensure it has proper permissions
    - Only creates codex, does not modify existing data
*/

-- Create trigger function to auto-create default codex
CREATE OR REPLACE FUNCTION create_default_codex()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO public.campaign_codex (
    campaign_id,
    tone,
    narrative_voice,
    pacing_preference,
    themes,
    pillars,
    banned_content,
    allowed_sources,
    factions,
    major_arcs,
    timeline,
    foreshadowing,
    open_questions,
    player_secrets,
    version
  )
  VALUES (
    NEW.id,
    '{"mood":"balanced","humor_level":"medium","violence":"medium"}'::jsonb,
    'cinematic',
    'balanced',
    ARRAY[]::text[],
    ARRAY[]::text[],
    ARRAY[]::text[],
    ARRAY[]::text[],
    ARRAY[]::jsonb,
    ARRAY[]::jsonb,
    ARRAY[]::jsonb,
    ARRAY[]::text[],
    ARRAY[]::text[],
    '{}'::jsonb,
    1
  )
  ON CONFLICT (campaign_id) DO NOTHING;

  RETURN NEW;
END;
$$;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS on_campaign_created ON public.campaigns;

-- Create trigger on campaigns table
CREATE TRIGGER on_campaign_created
  AFTER INSERT ON public.campaigns
  FOR EACH ROW
  EXECUTE FUNCTION create_default_codex();
