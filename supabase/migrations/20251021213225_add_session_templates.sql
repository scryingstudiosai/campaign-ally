/*
  # Add Session Templates

  1. New Tables
    - `session_templates`
      - `id` (uuid, primary key)
      - `campaign_id` (uuid, nullable - null means global template)
      - `name` (text)
      - `description` (text, nullable)
      - `category` (text - e.g., 'combat', 'roleplay', 'exploration', 'mystery')
      - `template_data` (jsonb - contains premise, outline structure, default scenes)
      - `is_public` (boolean - whether template is shared globally)
      - `created_by` (uuid, references auth.users)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
      - `usage_count` (integer - track popularity)

  2. Security
    - Enable RLS on `session_templates` table
    - Users can read public templates or their own templates
    - Users can create templates for their campaigns
    - Users can update/delete only their own templates
*/

CREATE TABLE IF NOT EXISTS session_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid REFERENCES campaigns(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  category text DEFAULT 'general',
  template_data jsonb DEFAULT '{}'::jsonb,
  is_public boolean DEFAULT false,
  created_by uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  usage_count integer DEFAULT 0,
  
  CONSTRAINT valid_category CHECK (category IN ('combat', 'roleplay', 'exploration', 'mystery', 'social', 'general'))
);

CREATE INDEX IF NOT EXISTS idx_session_templates_campaign ON session_templates(campaign_id);
CREATE INDEX IF NOT EXISTS idx_session_templates_category ON session_templates(category);
CREATE INDEX IF NOT EXISTS idx_session_templates_public ON session_templates(is_public) WHERE is_public = true;
CREATE INDEX IF NOT EXISTS idx_session_templates_created_by ON session_templates(created_by);

ALTER TABLE session_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view public templates"
  ON session_templates
  FOR SELECT
  TO authenticated
  USING (is_public = true);

CREATE POLICY "Users can view own templates"
  ON session_templates
  FOR SELECT
  TO authenticated
  USING (created_by = auth.uid());

CREATE POLICY "Users can view campaign templates"
  ON session_templates
  FOR SELECT
  TO authenticated
  USING (
    campaign_id IN (
      SELECT id FROM campaigns WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create templates"
  ON session_templates
  FOR INSERT
  TO authenticated
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "Users can update own templates"
  ON session_templates
  FOR UPDATE
  TO authenticated
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "Users can delete own templates"
  ON session_templates
  FOR DELETE
  TO authenticated
  USING (created_by = auth.uid());
