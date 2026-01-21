-- =============================================================
-- DEMO SCENARIO SEEDING - Tables + RPC
-- =============================================================

-- 1. Add housing_text column to job_posts if not exists
ALTER TABLE public.job_posts 
ADD COLUMN IF NOT EXISTS housing_text text;

-- 2. Create demo_matches table for matches without real talent_user_id
CREATE TABLE IF NOT EXISTS public.demo_matches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL,
  job_post_id uuid NOT NULL,
  demo_card_id uuid REFERENCES public.demo_talent_cards(id) ON DELETE CASCADE,
  talent_user_id uuid, -- NULL for demo-card matches, real user_id for demo talents
  status text NOT NULL DEFAULT 'matched',
  is_seeded boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT demo_match_has_target CHECK (demo_card_id IS NOT NULL OR talent_user_id IS NOT NULL)
);

ALTER TABLE public.demo_matches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view demo matches"
  ON public.demo_matches FOR SELECT
  USING (is_org_member(auth.uid(), org_id));

CREATE POLICY "Org members can manage demo matches"
  ON public.demo_matches FOR ALL
  USING (is_org_member(auth.uid(), org_id))
  WITH CHECK (is_org_member(auth.uid(), org_id));

-- 3. Create demo_chat_threads table
CREATE TABLE IF NOT EXISTS public.demo_chat_threads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL,
  demo_match_id uuid REFERENCES public.demo_matches(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.demo_chat_threads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view demo threads"
  ON public.demo_chat_threads FOR SELECT
  USING (is_org_member(auth.uid(), org_id));

CREATE POLICY "Org members can manage demo threads"
  ON public.demo_chat_threads FOR ALL
  USING (is_org_member(auth.uid(), org_id))
  WITH CHECK (is_org_member(auth.uid(), org_id));

-- 4. Create demo_chat_messages table
CREATE TABLE IF NOT EXISTS public.demo_chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id uuid NOT NULL REFERENCES public.demo_chat_threads(id) ON DELETE CASCADE,
  sender_type text NOT NULL CHECK (sender_type IN ('org', 'talent')),
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.demo_chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view demo messages"
  ON public.demo_chat_messages FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.demo_chat_threads t 
    WHERE t.id = demo_chat_messages.thread_id 
    AND is_org_member(auth.uid(), t.org_id)
  ));

CREATE POLICY "Org members can manage demo messages"
  ON public.demo_chat_messages FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.demo_chat_threads t 
    WHERE t.id = demo_chat_messages.thread_id 
    AND is_org_member(auth.uid(), t.org_id)
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.demo_chat_threads t 
    WHERE t.id = demo_chat_messages.thread_id 
    AND is_org_member(auth.uid(), t.org_id)
  ));

-- 5. Create demo_shift_bookings table for bookings without real talent_user_id
CREATE TABLE IF NOT EXISTS public.demo_shift_bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL,
  demo_card_id uuid REFERENCES public.demo_talent_cards(id) ON DELETE CASCADE,
  talent_user_id uuid, -- NULL for demo-card bookings
  start_ts timestamptz NOT NULL,
  end_ts timestamptz NOT NULL,
  is_released boolean NOT NULL DEFAULT false,
  is_seeded boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT demo_booking_has_target CHECK (demo_card_id IS NOT NULL OR talent_user_id IS NOT NULL)
);

ALTER TABLE public.demo_shift_bookings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view demo bookings"
  ON public.demo_shift_bookings FOR SELECT
  USING (is_org_member(auth.uid(), org_id));

CREATE POLICY "Org members can manage demo bookings"
  ON public.demo_shift_bookings FOR ALL
  USING (is_org_member(auth.uid(), org_id))
  WITH CHECK (is_org_member(auth.uid(), org_id));

-- 6. Create demo_release_offers table
CREATE TABLE IF NOT EXISTS public.demo_release_offers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  from_org_id uuid NOT NULL,
  demo_booking_id uuid REFERENCES public.demo_shift_bookings(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'open',
  taken_by_org_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.demo_release_offers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view demo release offers"
  ON public.demo_release_offers FOR SELECT
  USING (is_org_member(auth.uid(), from_org_id));

CREATE POLICY "Org members can manage demo release offers"
  ON public.demo_release_offers FOR ALL
  USING (is_org_member(auth.uid(), from_org_id))
  WITH CHECK (is_org_member(auth.uid(), from_org_id));

-- 7. Create the idempotent seed_demo_scenario RPC
CREATE OR REPLACE FUNCTION public.seed_demo_scenario(p_org_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_demo boolean;
  v_demo_talent_user_id uuid := NULL;
  v_demo_card_id uuid := NULL;
  v_use_demo_tables boolean := false;
  v_job_id uuid;
  v_circle_id uuid := NULL;
  v_borrow_request_id uuid;
  v_borrow_offer_id uuid;
  v_match_id uuid;
  v_thread_id uuid;
  v_booking_id uuid;
  v_release_offer_id uuid;
  v_start_ts timestamptz;
  v_end_ts timestamptz;
  v_jobs_ensured int := 0;
BEGIN
  -- Validate org is demo
  SELECT is_demo INTO v_is_demo FROM orgs WHERE id = p_org_id;
  
  IF v_is_demo IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Org not found');
  END IF;
  
  IF NOT v_is_demo THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Not a demo org');
  END IF;
  
  -- Check authorization
  IF NOT is_org_admin(auth.uid(), p_org_id) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Not authorized');
  END IF;

  -- ============================================================
  -- STEP 0: Clean up previous seeded data
  -- ============================================================
  
  -- Clean demo tables
  DELETE FROM demo_chat_messages WHERE thread_id IN (
    SELECT id FROM demo_chat_threads WHERE org_id = p_org_id
  );
  DELETE FROM demo_chat_threads WHERE org_id = p_org_id;
  DELETE FROM demo_release_offers WHERE from_org_id = p_org_id;
  DELETE FROM demo_shift_bookings WHERE org_id = p_org_id;
  DELETE FROM demo_matches WHERE org_id = p_org_id;
  
  -- Clean seeded borrow data
  DELETE FROM borrow_offers WHERE borrow_request_id IN (
    SELECT id FROM borrow_requests WHERE org_id = p_org_id AND is_demo = true
  );
  DELETE FROM borrow_requests WHERE org_id = p_org_id AND is_demo = true;
  
  -- Clean seeded real matches/threads/messages
  DELETE FROM messages WHERE thread_id IN (
    SELECT t.id FROM threads t
    JOIN matches m ON m.id = t.match_id
    WHERE m.org_id = p_org_id AND m.is_demo = true
  );
  DELETE FROM threads WHERE match_id IN (
    SELECT id FROM matches WHERE org_id = p_org_id AND is_demo = true
  );
  DELETE FROM matches WHERE org_id = p_org_id AND is_demo = true;
  
  -- Clean seeded shift bookings and release offers
  DELETE FROM release_offers WHERE booking_id IN (
    SELECT id FROM shift_bookings WHERE org_id = p_org_id AND is_demo = true
  );
  DELETE FROM shift_bookings WHERE org_id = p_org_id AND is_demo = true;

  -- ============================================================
  -- STEP 1: Ensure 6 demo jobs with 2 having housing
  -- ============================================================
  
  -- Count existing demo jobs
  SELECT count(*) INTO v_jobs_ensured FROM job_posts 
  WHERE org_id = p_org_id AND is_demo = true;
  
  -- If less than 6, create more
  IF v_jobs_ensured < 6 THEN
    FOR i IN (v_jobs_ensured + 1)..6 LOOP
      INSERT INTO job_posts (
        org_id, title, role_key, location, start_date, end_date, 
        status, is_demo, housing_offered, housing_text
      ) VALUES (
        p_org_id,
        CASE i
          WHEN 1 THEN 'Bartender Säsong'
          WHEN 2 THEN 'Servitör Kväll'
          WHEN 3 THEN 'Kock Sommaren'
          WHEN 4 THEN 'Diskare Helg'
          WHEN 5 THEN 'Eventpersonal Festival'
          WHEN 6 THEN 'Servitör Brunch'
        END,
        CASE i
          WHEN 1 THEN 'bartender'
          WHEN 2 THEN 'servitor'
          WHEN 3 THEN 'kock'
          WHEN 4 THEN 'diskare'
          WHEN 5 THEN 'event'
          WHEN 6 THEN 'servitor'
        END,
        'Visby',
        CURRENT_DATE,
        CURRENT_DATE + interval '90 days',
        'published',
        true,
        i <= 2, -- First 2 have housing
        CASE WHEN i <= 2 THEN 'Boende ingår i liten lägenhet nära arbetsplatsen' ELSE NULL END
      );
    END LOOP;
  ELSE
    -- Ensure at least 2 jobs have housing
    UPDATE job_posts 
    SET housing_offered = true, housing_text = 'Boende ingår i liten lägenhet nära arbetsplatsen'
    WHERE org_id = p_org_id 
      AND is_demo = true 
      AND housing_offered = false
      AND id IN (
        SELECT id FROM job_posts 
        WHERE org_id = p_org_id AND is_demo = true
        ORDER BY created_at 
        LIMIT 2
      );
  END IF;

  -- Pick one demo job for the scenario
  SELECT id INTO v_job_id FROM job_posts 
  WHERE org_id = p_org_id AND is_demo = true 
  ORDER BY created_at 
  LIMIT 1;

  -- ============================================================
  -- STEP 2: Find seed talent (real demo user or demo card)
  -- ============================================================
  
  -- Try to find a real demo talent
  SELECT user_id INTO v_demo_talent_user_id
  FROM profiles
  WHERE is_demo = true AND type IN ('talent', 'both')
  LIMIT 1;
  
  IF v_demo_talent_user_id IS NULL THEN
    -- Use demo card instead
    v_use_demo_tables := true;
    SELECT id INTO v_demo_card_id FROM demo_talent_cards LIMIT 1;
    
    IF v_demo_card_id IS NULL THEN
      -- Create a demo card
      INSERT INTO demo_talent_cards (name, location, role_key, skills, legacy_score)
      VALUES ('Demo Talang', 'Visby', 'bartender', ARRAY['service', 'cocktails'], 85)
      RETURNING id INTO v_demo_card_id;
    END IF;
  END IF;

  -- ============================================================
  -- STEP 3: Create borrow request + offer
  -- ============================================================
  
  v_start_ts := (CURRENT_DATE + interval '2 days')::timestamptz + interval '18 hours';
  v_end_ts := (CURRENT_DATE + interval '2 days')::timestamptz + interval '26 hours';
  
  -- Check if org has circles
  SELECT id INTO v_circle_id FROM circles WHERE owner_org_id = p_org_id LIMIT 1;
  
  INSERT INTO borrow_requests (
    org_id, created_by, location, role_key, start_ts, end_ts, 
    scope, circle_id, status, is_demo, message
  ) VALUES (
    p_org_id,
    auth.uid(),
    'Visby',
    'bartender',
    v_start_ts,
    v_end_ts,
    CASE WHEN v_circle_id IS NOT NULL THEN 'circle' ELSE 'local' END,
    v_circle_id,
    'open',
    true,
    'Behöver hjälp med bartending i helgen!'
  )
  RETURNING id INTO v_borrow_request_id;
  
  -- Create borrow offer
  IF v_demo_talent_user_id IS NOT NULL THEN
    INSERT INTO borrow_offers (borrow_request_id, talent_user_id, status)
    VALUES (v_borrow_request_id, v_demo_talent_user_id, 'pending')
    RETURNING id INTO v_borrow_offer_id;
  END IF;

  -- ============================================================
  -- STEP 4: Create match + chat
  -- ============================================================
  
  IF v_demo_talent_user_id IS NOT NULL THEN
    -- Use real tables
    INSERT INTO matches (org_id, job_post_id, talent_user_id, status, is_demo)
    VALUES (p_org_id, v_job_id, v_demo_talent_user_id, 'chatting', true)
    RETURNING id INTO v_match_id;
    
    INSERT INTO threads (match_id)
    VALUES (v_match_id)
    RETURNING id INTO v_thread_id;
    
    -- Seed messages
    INSERT INTO messages (thread_id, sender_user_id, body, created_at)
    VALUES 
      (v_thread_id, v_demo_talent_user_id, 'Hej! Jag kan ta passet, har erfarenhet från liknande jobb.', now() - interval '2 hours'),
      (v_thread_id, auth.uid(), 'Toppen! Kan du 18–02 på fredag?', now() - interval '1 hour'),
      (v_thread_id, v_demo_talent_user_id, 'Ja det funkar bra! Ser fram emot det.', now() - interval '30 minutes');
  ELSE
    -- Use demo tables
    INSERT INTO demo_matches (org_id, job_post_id, demo_card_id, status)
    VALUES (p_org_id, v_job_id, v_demo_card_id, 'chatting')
    RETURNING id INTO v_match_id;
    
    INSERT INTO demo_chat_threads (org_id, demo_match_id)
    VALUES (p_org_id, v_match_id)
    RETURNING id INTO v_thread_id;
    
    -- Seed demo messages
    INSERT INTO demo_chat_messages (thread_id, sender_type, body, created_at)
    VALUES 
      (v_thread_id, 'talent', 'Hej! Jag kan ta passet, har erfarenhet från liknande jobb.', now() - interval '2 hours'),
      (v_thread_id, 'org', 'Toppen! Kan du 18–02 på fredag?', now() - interval '1 hour'),
      (v_thread_id, 'talent', 'Ja det funkar bra! Ser fram emot det.', now() - interval '30 minutes');
  END IF;

  -- ============================================================
  -- STEP 5: Create scheduler booking + busy block
  -- ============================================================
  
  IF v_demo_talent_user_id IS NOT NULL THEN
    -- Use real shift_bookings
    INSERT INTO shift_bookings (org_id, talent_user_id, start_ts, end_ts, is_demo)
    VALUES (p_org_id, v_demo_talent_user_id, v_start_ts, v_end_ts, true)
    RETURNING id INTO v_booking_id;
    
    -- Create busy block (if view accepts insert, otherwise skip)
    -- Note: talent_busy_blocks_public might be a view - we'll let this fail silently
    BEGIN
      INSERT INTO talent_busy_blocks_public (talent_user_id, start_ts, end_ts)
      VALUES (v_demo_talent_user_id, v_start_ts, v_end_ts);
    EXCEPTION WHEN OTHERS THEN
      -- View might not support inserts, that's OK
      NULL;
    END;
  ELSE
    -- Use demo_shift_bookings
    INSERT INTO demo_shift_bookings (org_id, demo_card_id, start_ts, end_ts)
    VALUES (p_org_id, v_demo_card_id, v_start_ts, v_end_ts)
    RETURNING id INTO v_booking_id;
  END IF;

  -- ============================================================
  -- STEP 6: Create release offer
  -- ============================================================
  
  -- Create a second booking and release it
  IF v_demo_talent_user_id IS NOT NULL THEN
    DECLARE
      v_release_booking_id uuid;
    BEGIN
      INSERT INTO shift_bookings (
        org_id, talent_user_id, start_ts, end_ts, is_demo, is_released
      ) VALUES (
        p_org_id, 
        v_demo_talent_user_id, 
        v_start_ts + interval '1 day', 
        v_end_ts + interval '1 day', 
        true,
        true
      )
      RETURNING id INTO v_release_booking_id;
      
      INSERT INTO release_offers (from_org_id, booking_id, status)
      VALUES (p_org_id, v_release_booking_id, 'open')
      RETURNING id INTO v_release_offer_id;
    END;
  ELSE
    DECLARE
      v_demo_release_booking_id uuid;
    BEGIN
      INSERT INTO demo_shift_bookings (
        org_id, demo_card_id, start_ts, end_ts, is_released
      ) VALUES (
        p_org_id, 
        v_demo_card_id, 
        v_start_ts + interval '1 day', 
        v_end_ts + interval '1 day',
        true
      )
      RETURNING id INTO v_demo_release_booking_id;
      
      INSERT INTO demo_release_offers (from_org_id, demo_booking_id, status)
      VALUES (p_org_id, v_demo_release_booking_id, 'open')
      RETURNING id INTO v_release_offer_id;
    END;
  END IF;

  -- ============================================================
  -- RETURN SUMMARY
  -- ============================================================
  
  RETURN jsonb_build_object(
    'ok', true,
    'seeded', jsonb_build_object(
      'job_id', v_job_id,
      'borrow_request_id', v_borrow_request_id,
      'borrow_offer_id', v_borrow_offer_id,
      'match_id', v_match_id,
      'thread_id', v_thread_id,
      'booking_id', v_booking_id,
      'release_offer_id', v_release_offer_id,
      'used_demo_tables', v_use_demo_tables,
      'talent_source', CASE 
        WHEN v_demo_talent_user_id IS NOT NULL THEN 'real_demo_user'
        ELSE 'demo_card'
      END
    )
  );
END;
$$;