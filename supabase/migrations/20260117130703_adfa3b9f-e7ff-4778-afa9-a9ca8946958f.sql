-- ============================================
-- Demo Seed: Multiple Circles with Different Members
-- ============================================

-- Get demo org IDs
DO $$
DECLARE
  v_strandhotell_id uuid;
  v_kneippbyn_id uuid;
  v_circle1_id uuid;
  v_circle2_id uuid;
BEGIN
  -- Find demo orgs
  SELECT id INTO v_strandhotell_id FROM orgs WHERE name ILIKE '%Strandhotell%' AND is_demo = true LIMIT 1;
  SELECT id INTO v_kneippbyn_id FROM orgs WHERE name ILIKE '%Kneippbyn%' AND is_demo = true LIMIT 1;
  
  -- Only proceed if demo orgs exist
  IF v_strandhotell_id IS NOT NULL THEN
    -- Create Circle 1: "Hamnens krögare"
    INSERT INTO circles (owner_org_id, name)
    VALUES (v_strandhotell_id, 'Hamnens krögare')
    ON CONFLICT (owner_org_id, name) DO NOTHING
    RETURNING id INTO v_circle1_id;
    
    IF v_circle1_id IS NULL THEN
      SELECT id INTO v_circle1_id FROM circles WHERE owner_org_id = v_strandhotell_id AND name = 'Hamnens krögare';
    END IF;
    
    -- Create Circle 2: "Hotellgruppen"
    INSERT INTO circles (owner_org_id, name)
    VALUES (v_strandhotell_id, 'Hotellgruppen')
    ON CONFLICT (owner_org_id, name) DO NOTHING
    RETURNING id INTO v_circle2_id;
    
    IF v_circle2_id IS NULL THEN
      SELECT id INTO v_circle2_id FROM circles WHERE owner_org_id = v_strandhotell_id AND name = 'Hotellgruppen';
    END IF;
    
    -- Add Kneippbyn to Circle 1 only (if trusted partner exists)
    IF v_kneippbyn_id IS NOT NULL AND v_circle1_id IS NOT NULL THEN
      INSERT INTO circle_members (circle_id, member_org_id)
      VALUES (v_circle1_id, v_kneippbyn_id)
      ON CONFLICT (circle_id, member_org_id) DO NOTHING;
    END IF;
    
    -- Note: Circle 2 left empty or with different members to show difference
  END IF;
END $$;