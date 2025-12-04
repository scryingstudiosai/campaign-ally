/*
  # Add Monster Type Support

  1. Changes
    - Adds 'monster' as a valid type in memory_chunks table
    - This allows monsters to be stored separately from NPCs
    - Monsters have different card structure (CR, HP, AC, actions) vs NPCs (role, voice hook, etc.)

  2. Notes
    - The type column is currently text without constraints, so this migration is precautionary
    - Ensures 'monster' is explicitly supported alongside 'npc', 'tavern', 'hook', 'location', 'item'
*/

-- Add comment to document the valid types for memory_chunks.type
COMMENT ON COLUMN public.memory_chunks.type IS 'Valid types: npc, monster, tavern, hook, location, item';
