/*
  # Update Narrative Voice Constraint
  
  1. Changes
    - Drop old check constraint on narrative_voice
    - Add new check constraint with correct values: cinematic, gritty, comedic, epic, noir, whimsical
  
  2. Notes
    - This aligns the database constraint with the UI options
    - Preserves existing 'cinematic' value which is valid in both old and new constraints
*/

-- Drop the old constraint
alter table campaign_codex drop constraint if exists campaign_codex_narrative_voice_check;

-- Add the new constraint with the correct values
alter table campaign_codex 
  add constraint campaign_codex_narrative_voice_check 
  check (narrative_voice in ('cinematic', 'gritty', 'comedic', 'epic', 'noir', 'whimsical'));