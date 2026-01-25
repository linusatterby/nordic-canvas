-- ============================================
-- OFFER & ACCEPTANCE SYSTEM (v0)
-- Race-safe offer flow for post-match hiring
-- ============================================

-- 1. Create offers table
CREATE TABLE public.offers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.orgs(id) ON DELETE CASCADE,
  talent_user_id uuid NOT NULL,
  match_id uuid REFERENCES public.matches(id) ON DELETE SET NULL,
  listing_id uuid REFERENCES public.job_posts(id) ON DELETE SET NULL,
  listing_type text NOT NULL DEFAULT 'job' CHECK (listing_type IN ('job', 'shift_cover')),
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'accepted', 'declined', 'withdrawn', 'expired')),
  message text,
  
  -- Offer payload
  location text,
  role_title text,
  start_date date,
  end_date date,
  shift_start timestamptz,
  shift_end timestamptz,
  hours_per_week numeric,
  hourly_rate numeric,
  currency text NOT NULL DEFAULT 'SEK',
  housing_included boolean NOT NULL DEFAULT false,
  housing_note text,
  
  -- Audit fields
  created_by uuid,
  sent_at timestamptz,
  responded_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  
  -- Constraints
  CONSTRAINT offers_sent_has_sent_at CHECK (
    NOT (status IN ('sent', 'accepted', 'declined') AND sent_at IS NULL)
  ),
  CONSTRAINT offers_responded_has_responded_at CHECK (
    NOT (status IN ('accepted', 'declined') AND responded_at IS NULL)
  ),
  CONSTRAINT offers_shift_cover_complete CHECK (
    NOT (listing_type = 'shift_cover' AND (shift_start IS NULL OR shift_end IS NULL))
  ),
  CONSTRAINT offers_shift_order CHECK (
    shift_end IS NULL OR shift_start IS NULL OR shift_end > shift_start
  ),
  CONSTRAINT offers_expires_valid CHECK (
    expires_at IS NULL OR expires_at > created_at
  )
);

-- Indexes for offers
CREATE INDEX idx_offers_org_created ON public.offers(org_id, created_at DESC);
CREATE INDEX idx_offers_talent_created ON public.offers(talent_user_id, created_at DESC);
CREATE INDEX idx_offers_status_created ON public.offers(status, created_at DESC);
CREATE INDEX idx_offers_match ON public.offers(match_id) WHERE match_id IS NOT NULL;

-- Enable RLS
ALTER TABLE public.offers ENABLE ROW LEVEL SECURITY;

-- 2. Create offer_events audit log (append-only)
CREATE TABLE public.offer_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  offer_id uuid NOT NULL REFERENCES public.offers(id) ON DELETE CASCADE,
  actor_user_id uuid NOT NULL,
  event_type text NOT NULL CHECK (event_type IN ('created', 'sent', 'accepted', 'declined', 'withdrawn', 'expired', 'edited')),
  metadata jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Index for offer_events
CREATE INDEX idx_offer_events_offer ON public.offer_events(offer_id, created_at DESC);

-- Enable RLS
ALTER TABLE public.offer_events ENABLE ROW LEVEL SECURITY;

-- 3. RLS Policies for offers

-- Org members can view their org's offers
CREATE POLICY "Org members can view org offers"
  ON public.offers FOR SELECT
  USING (is_org_member(auth.uid(), org_id));

-- Talent can view offers sent to them
CREATE POLICY "Talent can view own offers"
  ON public.offers FOR SELECT
  USING (talent_user_id = auth.uid());

-- Org members can insert draft offers
CREATE POLICY "Org members can insert draft offers"
  ON public.offers FOR INSERT
  WITH CHECK (
    is_org_member(auth.uid(), org_id) 
    AND status = 'draft' 
    AND created_by = auth.uid()
  );

-- Org members can update their own drafts only
CREATE POLICY "Org members can update draft offers"
  ON public.offers FOR UPDATE
  USING (
    is_org_member(auth.uid(), org_id) 
    AND status = 'draft'
  );

-- No direct deletes (use withdraw instead)
CREATE POLICY "No direct delete on offers"
  ON public.offers FOR DELETE
  USING (false);

-- 4. RLS Policies for offer_events

-- Org members and talent can view events for their offers
CREATE POLICY "Parties can view offer events"
  ON public.offer_events FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.offers o
      WHERE o.id = offer_events.offer_id
      AND (is_org_member(auth.uid(), o.org_id) OR o.talent_user_id = auth.uid())
    )
  );

-- No direct insert (via RPC only)
CREATE POLICY "No direct insert on offer_events"
  ON public.offer_events FOR INSERT
  WITH CHECK (false);

-- No updates or deletes (append-only)
CREATE POLICY "No update on offer_events"
  ON public.offer_events FOR UPDATE
  USING (false);

CREATE POLICY "No delete on offer_events"
  ON public.offer_events FOR DELETE
  USING (false);

-- 5. Helper function to check offer access
CREATE OR REPLACE FUNCTION public.has_offer_access(p_user_id uuid, p_offer_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.offers
    WHERE id = p_offer_id
    AND (talent_user_id = p_user_id OR is_org_member(p_user_id, org_id))
  )
$$;

-- 6. RPC: send_offer (draft -> sent)
CREATE OR REPLACE FUNCTION public.send_offer(p_offer_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_offer offers%ROWTYPE;
  v_user_id uuid := auth.uid();
BEGIN
  -- Get and lock the offer
  SELECT * INTO v_offer FROM offers WHERE id = p_offer_id FOR UPDATE;
  
  IF v_offer IS NULL THEN
    RETURN jsonb_build_object('success', false, 'reason', 'not_found');
  END IF;
  
  -- Check caller is org member
  IF NOT is_org_member(v_user_id, v_offer.org_id) THEN
    RETURN jsonb_build_object('success', false, 'reason', 'forbidden');
  END IF;
  
  -- Check status is draft
  IF v_offer.status <> 'draft' THEN
    RETURN jsonb_build_object('success', false, 'reason', 'invalid_status', 'current_status', v_offer.status);
  END IF;
  
  -- Update to sent
  UPDATE offers 
  SET status = 'sent', sent_at = now(), updated_at = now()
  WHERE id = p_offer_id;
  
  -- Log event
  INSERT INTO offer_events (offer_id, actor_user_id, event_type, metadata)
  VALUES (p_offer_id, v_user_id, 'sent', jsonb_build_object('sent_at', now()));
  
  -- Create notification for talent
  PERFORM create_notification(
    p_recipient_user_id := v_offer.talent_user_id,
    p_notification_type := 'offer_sent',
    p_title := 'Nytt erbjudande',
    p_body := COALESCE(v_offer.role_title, 'Ett erbjudande') || ' från arbetsgivare',
    p_entity_type := 'offer',
    p_entity_id := p_offer_id,
    p_href := '/talent/inbox?tab=offers&offerId=' || p_offer_id::text,
    p_org_id := v_offer.org_id,
    p_talent_user_id := v_offer.talent_user_id,
    p_severity := 'info',
    p_source := 'rpc',
    p_dedup_key := 'offer_sent:' || p_offer_id::text
  );
  
  -- Create activity event for org
  PERFORM create_activity_event(
    p_event_type := 'offer_sent',
    p_entity_type := 'offer',
    p_entity_id := p_offer_id,
    p_title := 'Erbjudande skickat',
    p_summary := 'Erbjudande för ' || COALESCE(v_offer.role_title, 'position') || ' skickat',
    p_org_id := v_offer.org_id,
    p_talent_user_id := v_offer.talent_user_id,
    p_actor_user_id := v_user_id,
    p_severity := 'info',
    p_source := 'rpc',
    p_dedup_key := 'offer_sent:' || p_offer_id::text
  );
  
  RETURN jsonb_build_object('success', true, 'offer_id', p_offer_id);
END;
$$;

-- 7. RPC: respond_offer (sent -> accepted/declined) - RACE-SAFE
CREATE OR REPLACE FUNCTION public.respond_offer(p_offer_id uuid, p_action text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_offer offers%ROWTYPE;
  v_user_id uuid := auth.uid();
  v_new_status text;
  v_rows_updated int;
  v_org_member_ids uuid[];
BEGIN
  -- Validate action
  IF p_action NOT IN ('accept', 'decline') THEN
    RETURN jsonb_build_object('success', false, 'reason', 'invalid_action');
  END IF;
  
  v_new_status := CASE p_action WHEN 'accept' THEN 'accepted' ELSE 'declined' END;
  
  -- Atomic update with race-safety check
  UPDATE offers
  SET status = v_new_status, responded_at = now(), updated_at = now()
  WHERE id = p_offer_id
    AND status = 'sent'
    AND talent_user_id = v_user_id
    AND (expires_at IS NULL OR expires_at > now())
  RETURNING * INTO v_offer;
  
  GET DIAGNOSTICS v_rows_updated = ROW_COUNT;
  
  IF v_rows_updated = 0 THEN
    -- Check why it failed
    SELECT * INTO v_offer FROM offers WHERE id = p_offer_id;
    
    IF v_offer IS NULL THEN
      RETURN jsonb_build_object('success', false, 'reason', 'not_found');
    END IF;
    
    IF v_offer.talent_user_id <> v_user_id THEN
      RETURN jsonb_build_object('success', false, 'reason', 'forbidden');
    END IF;
    
    IF v_offer.status <> 'sent' THEN
      RETURN jsonb_build_object('success', false, 'reason', 'already_responded', 'current_status', v_offer.status);
    END IF;
    
    IF v_offer.expires_at IS NOT NULL AND v_offer.expires_at <= now() THEN
      -- Auto-expire the offer
      UPDATE offers SET status = 'expired', updated_at = now() WHERE id = p_offer_id;
      INSERT INTO offer_events (offer_id, actor_user_id, event_type)
      VALUES (p_offer_id, v_user_id, 'expired');
      RETURN jsonb_build_object('success', false, 'reason', 'expired');
    END IF;
    
    RETURN jsonb_build_object('success', false, 'reason', 'unknown_error');
  END IF;
  
  -- Refetch for notification data
  SELECT * INTO v_offer FROM offers WHERE id = p_offer_id;
  
  -- Log event
  INSERT INTO offer_events (offer_id, actor_user_id, event_type, metadata)
  VALUES (p_offer_id, v_user_id, p_action || 'ed', jsonb_build_object('responded_at', now()));
  
  -- If accepted, update match status
  IF p_action = 'accept' AND v_offer.match_id IS NOT NULL THEN
    UPDATE matches SET status = 'accepted' WHERE id = v_offer.match_id;
  END IF;
  
  -- Get org member IDs for notifications
  SELECT array_agg(user_id) INTO v_org_member_ids
  FROM org_members WHERE org_id = v_offer.org_id;
  
  -- Create notifications for org members
  IF v_org_member_ids IS NOT NULL THEN
    FOR i IN 1..array_length(v_org_member_ids, 1) LOOP
      PERFORM create_notification(
        p_recipient_user_id := v_org_member_ids[i],
        p_notification_type := 'offer_' || p_action || 'ed',
        p_title := CASE p_action WHEN 'accept' THEN 'Erbjudande accepterat!' ELSE 'Erbjudande avböjt' END,
        p_body := 'Talangen har ' || CASE p_action WHEN 'accept' THEN 'accepterat' ELSE 'avböjt' END || ' ditt erbjudande',
        p_entity_type := 'offer',
        p_entity_id := p_offer_id,
        p_href := '/employer/inbox?tab=offers&offerId=' || p_offer_id::text,
        p_org_id := v_offer.org_id,
        p_talent_user_id := v_offer.talent_user_id,
        p_severity := CASE p_action WHEN 'accept' THEN 'success' ELSE 'info' END,
        p_source := 'rpc',
        p_dedup_key := 'offer_' || p_action || 'ed:' || p_offer_id::text || ':' || v_org_member_ids[i]::text
      );
    END LOOP;
  END IF;
  
  -- Activity event
  PERFORM create_activity_event(
    p_event_type := 'offer_' || p_action || 'ed',
    p_entity_type := 'offer',
    p_entity_id := p_offer_id,
    p_title := CASE p_action WHEN 'accept' THEN 'Erbjudande accepterat' ELSE 'Erbjudande avböjt' END,
    p_summary := 'Talent har ' || CASE p_action WHEN 'accept' THEN 'accepterat' ELSE 'avböjt' END || ' erbjudandet',
    p_org_id := v_offer.org_id,
    p_talent_user_id := v_offer.talent_user_id,
    p_actor_user_id := v_user_id,
    p_severity := CASE p_action WHEN 'accept' THEN 'success' ELSE 'info' END,
    p_source := 'rpc',
    p_dedup_key := 'offer_' || p_action || 'ed:' || p_offer_id::text
  );
  
  RETURN jsonb_build_object(
    'success', true, 
    'offer_id', p_offer_id, 
    'new_status', v_new_status,
    'match_id', v_offer.match_id
  );
END;
$$;

-- 8. RPC: withdraw_offer (draft/sent -> withdrawn)
CREATE OR REPLACE FUNCTION public.withdraw_offer(p_offer_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_offer offers%ROWTYPE;
  v_user_id uuid := auth.uid();
  v_was_sent boolean;
BEGIN
  -- Get and lock the offer
  SELECT * INTO v_offer FROM offers WHERE id = p_offer_id FOR UPDATE;
  
  IF v_offer IS NULL THEN
    RETURN jsonb_build_object('success', false, 'reason', 'not_found');
  END IF;
  
  -- Check caller is org member
  IF NOT is_org_member(v_user_id, v_offer.org_id) THEN
    RETURN jsonb_build_object('success', false, 'reason', 'forbidden');
  END IF;
  
  -- Check status allows withdrawal
  IF v_offer.status NOT IN ('draft', 'sent') THEN
    RETURN jsonb_build_object('success', false, 'reason', 'invalid_status', 'current_status', v_offer.status);
  END IF;
  
  v_was_sent := v_offer.status = 'sent';
  
  -- Update to withdrawn
  UPDATE offers 
  SET status = 'withdrawn', updated_at = now()
  WHERE id = p_offer_id;
  
  -- Log event
  INSERT INTO offer_events (offer_id, actor_user_id, event_type, metadata)
  VALUES (p_offer_id, v_user_id, 'withdrawn', jsonb_build_object('was_sent', v_was_sent));
  
  -- Notify talent if it was sent
  IF v_was_sent THEN
    PERFORM create_notification(
      p_recipient_user_id := v_offer.talent_user_id,
      p_notification_type := 'offer_withdrawn',
      p_title := 'Erbjudande återkallat',
      p_body := 'Ett erbjudande har återkallats av arbetsgivaren',
      p_entity_type := 'offer',
      p_entity_id := p_offer_id,
      p_href := '/talent/inbox?tab=offers',
      p_org_id := v_offer.org_id,
      p_talent_user_id := v_offer.talent_user_id,
      p_severity := 'warning',
      p_source := 'rpc',
      p_dedup_key := 'offer_withdrawn:' || p_offer_id::text
    );
    
    PERFORM create_activity_event(
      p_event_type := 'offer_withdrawn',
      p_entity_type := 'offer',
      p_entity_id := p_offer_id,
      p_title := 'Erbjudande återkallat',
      p_org_id := v_offer.org_id,
      p_talent_user_id := v_offer.talent_user_id,
      p_actor_user_id := v_user_id,
      p_severity := 'warning',
      p_source := 'rpc',
      p_dedup_key := 'offer_withdrawn:' || p_offer_id::text
    );
  END IF;
  
  RETURN jsonb_build_object('success', true, 'offer_id', p_offer_id);
END;
$$;

-- 9. Update seed_demo_scenario to include an offer
CREATE OR REPLACE FUNCTION public.seed_demo_scenario(p_org_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_demo_job_id uuid;
  v_demo_match_id uuid;
  v_demo_card_id uuid;
  v_thread_id uuid;
  v_booking_id uuid;
  v_offer_id uuid;
  v_user_id uuid := auth.uid();
BEGIN
  -- 1. Create/find demo job
  SELECT id INTO v_demo_job_id FROM job_posts 
  WHERE org_id = p_org_id AND is_demo = true 
  ORDER BY created_at DESC LIMIT 1;
  
  IF v_demo_job_id IS NULL THEN
    INSERT INTO job_posts (
      org_id, title, role_key, location, start_date, end_date, 
      housing_offered, housing_text, is_demo, status
    ) VALUES (
      p_org_id, 'Demo Sommarjobb', 'server', 'Stockholm', 
      CURRENT_DATE + 30, CURRENT_DATE + 120,
      true, 'Delat rum i personalboende', true, 'published'
    ) RETURNING id INTO v_demo_job_id;
  END IF;
  
  -- 2. Get a demo card for match
  SELECT id INTO v_demo_card_id FROM demo_talent_cards 
  WHERE is_demo = true ORDER BY RANDOM() LIMIT 1;
  
  -- 3. Create demo match
  INSERT INTO demo_matches (org_id, job_post_id, demo_card_id, status, is_seeded)
  VALUES (p_org_id, v_demo_job_id, v_demo_card_id, 'matched', true)
  ON CONFLICT DO NOTHING
  RETURNING id INTO v_demo_match_id;
  
  IF v_demo_match_id IS NULL THEN
    SELECT id INTO v_demo_match_id FROM demo_matches 
    WHERE org_id = p_org_id AND is_seeded = true LIMIT 1;
  END IF;
  
  -- 4. Create demo chat thread
  INSERT INTO demo_chat_threads (org_id, demo_match_id)
  VALUES (p_org_id, v_demo_match_id)
  ON CONFLICT DO NOTHING
  RETURNING id INTO v_thread_id;
  
  IF v_thread_id IS NULL THEN
    SELECT id INTO v_thread_id FROM demo_chat_threads 
    WHERE org_id = p_org_id LIMIT 1;
  END IF;
  
  -- 5. Create demo messages
  IF v_thread_id IS NOT NULL THEN
    INSERT INTO demo_chat_messages (thread_id, sender_type, body)
    VALUES 
      (v_thread_id, 'talent', 'Hej! Jag såg ert jobb och är väldigt intresserad.'),
      (v_thread_id, 'employer', 'Tack för ditt intresse! Kan du berätta lite om dig själv?')
    ON CONFLICT DO NOTHING;
  END IF;
  
  -- 6. Create demo booking
  INSERT INTO demo_shift_bookings (org_id, demo_card_id, start_ts, end_ts, is_seeded)
  VALUES (
    p_org_id, v_demo_card_id, 
    now() + interval '7 days', 
    now() + interval '7 days' + interval '8 hours',
    true
  )
  ON CONFLICT DO NOTHING
  RETURNING id INTO v_booking_id;
  
  -- 7. Create demo release offer
  IF v_booking_id IS NOT NULL THEN
    INSERT INTO demo_release_offers (from_org_id, demo_booking_id, status)
    VALUES (p_org_id, v_booking_id, 'open')
    ON CONFLICT DO NOTHING;
  END IF;
  
  -- 8. Create demo borrow request
  INSERT INTO borrow_requests (
    org_id, created_by, role_key, location, start_ts, end_ts, 
    scope, message, is_demo
  ) VALUES (
    p_org_id, v_user_id, 'server', 'Stockholm',
    now() + interval '14 days',
    now() + interval '14 days' + interval '6 hours',
    'local', 'Vi behöver förstärkning till helgen!', true
  ) ON CONFLICT DO NOTHING;
  
  -- 9. Create demo OFFER (NEW!) - sent status so talent can respond
  -- First check if we have a real talent user to send to (for demo purposes, use current user or a demo account)
  -- For true demo, we'll create an offer linked to the demo match
  INSERT INTO offers (
    org_id, 
    talent_user_id, 
    match_id,
    listing_id,
    listing_type,
    status,
    role_title,
    location,
    start_date,
    end_date,
    hours_per_week,
    hourly_rate,
    currency,
    housing_included,
    housing_note,
    message,
    created_by,
    sent_at
  ) VALUES (
    p_org_id,
    v_user_id, -- In demo, send to current user so they can see it
    NULL, -- No real match_id for demo
    v_demo_job_id,
    'job',
    'sent',
    'Sommarjobb - Servering',
    'Stockholm',
    CURRENT_DATE + 30,
    CURRENT_DATE + 120,
    40,
    165,
    'SEK',
    true,
    'Delat rum i personalboende ingår',
    'Vi vill gärna ha dig med i teamet! Hör av dig om du har frågor.',
    v_user_id,
    now()
  )
  ON CONFLICT DO NOTHING
  RETURNING id INTO v_offer_id;
  
  -- Log the offer event
  IF v_offer_id IS NOT NULL THEN
    INSERT INTO offer_events (offer_id, actor_user_id, event_type, metadata)
    VALUES (v_offer_id, v_user_id, 'sent', '{"demo": true}'::jsonb)
    ON CONFLICT DO NOTHING;
  END IF;
  
  RETURN jsonb_build_object(
    'success', true,
    'demo_job_id', v_demo_job_id,
    'demo_match_id', v_demo_match_id,
    'demo_thread_id', v_thread_id,
    'demo_booking_id', v_booking_id,
    'demo_offer_id', v_offer_id
  );
END;
$$;