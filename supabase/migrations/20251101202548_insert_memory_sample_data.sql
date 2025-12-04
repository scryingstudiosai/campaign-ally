/*
  # Campaign Ally Memory System - Sample Data
  
  Inserts sample data for immediate testing:
  1. Sample memory entries (NPCs, Locations, Monsters)
  2. Sample aliases for entries
  3. Sample relationships between entries
  4. Demonstrates the memory system capabilities
*/

-- =====================================================================
-- 1. INSERT SAMPLE MEMORY ENTRIES
-- =====================================================================

-- Get first campaign and user for sample data
DO $$
DECLARE
  sample_campaign_id UUID;
  sample_user_id UUID;
  npc_thorne_id UUID;
  loc_tavern_id UUID;
  monster_drake_id UUID;
  loc_mountains_id UUID;
  npc_marcus_id UUID;
  quest_investigation_id UUID;
BEGIN
  -- Get first available campaign
  SELECT id, user_id INTO sample_campaign_id, sample_user_id
  FROM campaigns
  ORDER BY created_at DESC
  LIMIT 1;
  
  -- Only proceed if we have a campaign
  IF sample_campaign_id IS NOT NULL THEN
    
    -- Insert Captain Thorne Vale (NPC)
    INSERT INTO memories (
      campaign_id, user_id, name, type, category,
      content, summary, tags, pinned, first_appearance
    )
    VALUES (
      sample_campaign_id,
      sample_user_id,
      'Captain Thorne Vale',
      'NPC',
      'NPC',
      'A grizzled captain of the city watch with a scar across his left eye. Known for his no-nonsense attitude but rumors suggest he accepts bribes from the Thieves Guild. Wears a distinctive silver badge and carries a longsword with his family crest.',
      'Corrupt city watch captain, scarred veteran with connections to criminal underworld',
      ARRAY['Military', 'Human', 'Quest Giver', 'Corrupt'],
      true,
      'Session 1'
    )
    RETURNING id INTO npc_thorne_id;
    
    -- Insert Greystone Tavern (Location)
    INSERT INTO memories (
      campaign_id, user_id, name, type, category,
      content, summary, tags, pinned
    )
    VALUES (
      sample_campaign_id,
      sample_user_id,
      'Greystone Tavern',
      'Location',
      'Location',
      'A warm and welcoming tavern in the heart of the city. The proprietor, Marcus Grey, serves the best ale in town. Popular gathering spot for adventurers. Features a large fireplace, worn oak tables, and walls covered in trophies from past adventures.',
      'Cozy city tavern run by Marcus Grey, popular adventurer hangout',
      ARRAY['City', 'Social Hub', 'Tavern', 'Safe Haven'],
      true
    )
    RETURNING id INTO loc_tavern_id;
    
    -- Insert Ice Drake (Monster)
    INSERT INTO memories (
      campaign_id, user_id, name, type, category,
      content, summary, tags, dm_notes
    )
    VALUES (
      sample_campaign_id,
      sample_user_id,
      'Frostfang the Ice Drake',
      'Monster',
      'Monster',
      'A fearsome white dragon that has claimed the northern mountains as its lair. Known to attack travelers on the mountain pass. Breathes devastating frost that can freeze victims solid.',
      'Ancient white dragon terrorizing northern mountain pass',
      ARRAY['Dragon', 'Boss', 'Cold', 'Ancient'],
      'CR 15. Has collected tribute from nearby villages for years. Possible negotiation opportunity if players discover its hoard contains a cursed artifact.'
    )
    RETURNING id INTO monster_drake_id;
    
    -- Insert Northern Mountains (Location)
    INSERT INTO memories (
      campaign_id, user_id, name, type, category,
      content, summary, tags
    )
    VALUES (
      sample_campaign_id,
      sample_user_id,
      'Northern Mountains',
      'Location',
      'Location',
      'A treacherous mountain range covered in perpetual snow and ice. The high peaks are home to dangerous creatures and ancient ruins. A crucial trade route runs through the lower passes.',
      'Dangerous frozen mountain range with trade routes and ruins',
      ARRAY['Mountains', 'Wilderness', 'Dangerous', 'Cold']
    )
    RETURNING id INTO loc_mountains_id;
    
    -- Insert Marcus Grey (NPC)
    INSERT INTO memories (
      campaign_id, user_id, name, type, category,
      content, tags
    )
    VALUES (
      sample_campaign_id,
      sample_user_id,
      'Marcus Grey',
      'NPC',
      'NPC',
      'Friendly tavern keeper of the Greystone Tavern. Former adventurer who retired after losing his leg. Has extensive knowledge of local rumors and always has a story to tell.',
      ARRAY['Human', 'Tavern Keeper', 'Retired Adventurer', 'Friendly']
    )
    RETURNING id INTO npc_marcus_id;
    
    -- Insert a Quest
    INSERT INTO memories (
      campaign_id, user_id, name, type, category,
      content, summary, tags, first_appearance
    )
    VALUES (
      sample_campaign_id,
      sample_user_id,
      'Investigation: The Missing Caravan',
      'Quest',
      'Quest',
      'Captain Vale has asked the party to investigate the disappearance of a merchant caravan on the northern pass. Three caravans have gone missing in the past month. Survivors speak of a "white shadow" and the sound of beating wings.',
      'Investigate missing caravans on mountain pass, dragon suspected',
      ARRAY['Main Quest', 'Investigation', 'Active'],
      'Session 2'
    )
    RETURNING id INTO quest_investigation_id;
    
    -- =====================================================================
    -- 2. INSERT SAMPLE ALIASES
    -- =====================================================================
    
    -- Aliases for Captain Thorne Vale
    INSERT INTO memory_aliases (memory_id, campaign_id, alias, created_by)
    VALUES 
      (npc_thorne_id, sample_campaign_id, 'Vale', 'user'),
      (npc_thorne_id, sample_campaign_id, 'Captain', 'user'),
      (npc_thorne_id, sample_campaign_id, 'The Captain', 'user');
    
    -- Aliases for Greystone Tavern
    INSERT INTO memory_aliases (memory_id, campaign_id, alias, created_by)
    VALUES 
      (loc_tavern_id, sample_campaign_id, 'The Greystone', 'user'),
      (loc_tavern_id, sample_campaign_id, 'Grey''s Place', 'ai');
    
    -- Aliases for Ice Drake
    INSERT INTO memory_aliases (memory_id, campaign_id, alias, created_by)
    VALUES 
      (monster_drake_id, sample_campaign_id, 'Frostfang', 'user'),
      (monster_drake_id, sample_campaign_id, 'The White Shadow', 'ai'),
      (monster_drake_id, sample_campaign_id, 'The Drake', 'user');
    
    -- Aliases for Marcus Grey
    INSERT INTO memory_aliases (memory_id, campaign_id, alias, created_by)
    VALUES 
      (npc_marcus_id, sample_campaign_id, 'Marcus', 'user'),
      (npc_marcus_id, sample_campaign_id, 'Grey', 'user');
    
    -- =====================================================================
    -- 3. INSERT SAMPLE RELATIONSHIPS
    -- =====================================================================
    
    -- Marcus Grey works at Greystone Tavern
    INSERT INTO memory_relationships (
      campaign_id, from_entry_id, to_entry_id, 
      relationship_type, status, created_by
    )
    VALUES (
      sample_campaign_id, npc_marcus_id, loc_tavern_id,
      'works_for', 'confirmed', 'manual'
    );
    
    -- Frostfang lives in Northern Mountains
    INSERT INTO memory_relationships (
      campaign_id, from_entry_id, to_entry_id,
      relationship_type, status, created_by
    )
    VALUES (
      sample_campaign_id, monster_drake_id, loc_mountains_id,
      'located_in', 'confirmed', 'manual'
    );
    
    -- Captain Vale gives quest
    INSERT INTO memory_relationships (
      campaign_id, from_entry_id, to_entry_id,
      relationship_type, status, created_by
    )
    VALUES (
      sample_campaign_id, npc_thorne_id, quest_investigation_id,
      'gives_quest', 'confirmed', 'manual'
    );
    
    -- Quest mentions the Drake (AI-detected relationship)
    INSERT INTO memory_relationships (
      campaign_id, from_entry_id, to_entry_id,
      relationship_type, status, confidence_score, created_by, source_text
    )
    VALUES (
      sample_campaign_id, quest_investigation_id, monster_drake_id,
      'mentions', 'suggested', 0.85, 'ai',
      'Survivors speak of a "white shadow" and the sound of beating wings.'
    );
    
    -- Captain Vale knows Marcus Grey (social connection)
    INSERT INTO memory_relationships (
      campaign_id, from_entry_id, to_entry_id,
      relationship_type, status, created_by
    )
    VALUES (
      sample_campaign_id, npc_thorne_id, npc_marcus_id,
      'knows', 'confirmed', 'manual'
    );
    
    -- =====================================================================
    -- 4. INSERT SESSION APPEARANCES
    -- =====================================================================
    
    -- Captain Vale appeared in Session 1
    INSERT INTO session_appearances (
      campaign_id, memory_entry_id, session_number,
      notes, scene
    )
    VALUES (
      sample_campaign_id, npc_thorne_id, 1,
      'First encounter with the party. Gave them their initial quest.', 
      'Opening Scene'
    );
    
    -- Greystone Tavern in Session 1
    INSERT INTO session_appearances (
      campaign_id, memory_entry_id, session_number,
      notes
    )
    VALUES (
      sample_campaign_id, loc_tavern_id, 1,
      'Party met at the tavern and received quest hook from Marcus.'
    );
    
    -- Marcus Grey in Session 1
    INSERT INTO session_appearances (
      campaign_id, memory_entry_id, session_number,
      notes
    )
    VALUES (
      sample_campaign_id, npc_marcus_id, 1,
      'Provided rumors about the missing caravans.'
    );
    
  END IF;
END $$;
