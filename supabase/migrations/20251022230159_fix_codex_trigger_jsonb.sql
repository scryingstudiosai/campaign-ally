/*
  # Fix Codex Trigger with Correct JSONB Types
  
  Use jsonb arrays instead of jsonb[] for the codex fields
*/

DROP TRIGGER IF EXISTS on_campaign_created ON campaigns;
DROP FUNCTION IF EXISTS create_default_codex();

CREATE OR REPLACE FUNCTION create_default_codex()
RETURNS TRIGGER AS $$
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
    '[]'::jsonb,
    '[]'::jsonb,
    '[]'::jsonb,
    ARRAY[]::text[],
    ARRAY[]::text[],
    '{}'::jsonb,
    1
  )
  ON CONFLICT (campaign_id) DO NOTHING;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_campaign_created
  AFTER INSERT ON campaigns
  FOR EACH ROW
  EXECUTE FUNCTION create_default_codex();
