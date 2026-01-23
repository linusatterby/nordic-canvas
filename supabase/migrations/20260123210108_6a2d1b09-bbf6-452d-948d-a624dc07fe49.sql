-- =============================================================
-- Activity Events + Notifications Tables + RLS + RPC + Triggers
-- =============================================================

-- 1) ACTIVITY_EVENTS TABLE
CREATE TABLE public.activity_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NULL REFERENCES public.orgs(id) ON DELETE CASCADE,
  talent_user_id uuid NULL,
  event_type text NOT NULL,
  entity_type text NOT NULL,
  entity_id uuid NOT NULL,
  actor_user_id uuid NULL,
  title text NOT NULL,
  summary text NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  
  CONSTRAINT activity_events_event_type_check CHECK (
    event_type IN (
      'listing_created',
      'listing_status_changed',
      'swipe_made',
      'match_created',
      'message_sent',
      'borrow_request_created',
      'borrow_offer_created',
      'borrow_offer_accepted',
      'booking_created',
      'release_offer_created',
      'release_offer_taken'
    )
  ),
  CONSTRAINT activity_events_entity_type_check CHECK (
    entity_type IN (
      'listing', 'match', 'thread', 'message', 
      'borrow_request', 'borrow_offer', 'booking', 'release_offer'
    )
  )
);

-- Indexes for activity_events
CREATE INDEX idx_activity_events_org_created ON public.activity_events(org_id, created_at DESC);
CREATE INDEX idx_activity_events_talent_created ON public.activity_events(talent_user_id, created_at DESC);
CREATE INDEX idx_activity_events_type_created ON public.activity_events(event_type, created_at DESC);
CREATE INDEX idx_activity_events_dedup ON public.activity_events((metadata->>'dedup_key')) WHERE metadata->>'dedup_key' IS NOT NULL;

-- RLS for activity_events
ALTER TABLE public.activity_events ENABLE ROW LEVEL SECURITY;

-- Talents can view their own events
CREATE POLICY "Talents can view own activity events"
  ON public.activity_events FOR SELECT
  USING (talent_user_id = auth.uid());

-- Org members can view org events
CREATE POLICY "Org members can view org activity events"
  ON public.activity_events FOR SELECT
  USING (org_id IS NOT NULL AND is_org_member(auth.uid(), org_id));

-- Block direct client inserts/updates/deletes
CREATE POLICY "No direct client insert on activity_events"
  ON public.activity_events FOR INSERT
  WITH CHECK (false);

CREATE POLICY "No direct client update on activity_events"
  ON public.activity_events FOR UPDATE
  USING (false);

CREATE POLICY "No direct client delete on activity_events"
  ON public.activity_events FOR DELETE
  USING (false);


-- 2) NOTIFICATIONS TABLE
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NULL REFERENCES public.orgs(id) ON DELETE CASCADE,
  talent_user_id uuid NULL,
  recipient_user_id uuid NOT NULL,
  notification_type text NOT NULL,
  entity_type text NOT NULL,
  entity_id uuid NOT NULL,
  title text NOT NULL,
  body text NULL,
  href text NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  read_at timestamptz NULL,
  
  CONSTRAINT notifications_entity_type_check CHECK (
    entity_type IN (
      'listing', 'match', 'thread', 'message', 
      'borrow_request', 'borrow_offer', 'booking', 'release_offer'
    )
  )
);

-- Indexes for notifications
CREATE INDEX idx_notifications_recipient_unread ON public.notifications(recipient_user_id, is_read, created_at DESC);
CREATE INDEX idx_notifications_dedup ON public.notifications((metadata->>'dedup_key')) WHERE metadata->>'dedup_key' IS NOT NULL;

-- RLS for notifications
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Recipients can view their own notifications
CREATE POLICY "Recipients can view own notifications"
  ON public.notifications FOR SELECT
  USING (recipient_user_id = auth.uid());

-- Recipients can update is_read/read_at on their own notifications
CREATE POLICY "Recipients can mark own notifications read"
  ON public.notifications FOR UPDATE
  USING (recipient_user_id = auth.uid())
  WITH CHECK (recipient_user_id = auth.uid());

-- Block direct client inserts/deletes
CREATE POLICY "No direct client insert on notifications"
  ON public.notifications FOR INSERT
  WITH CHECK (false);

CREATE POLICY "No direct client delete on notifications"
  ON public.notifications FOR DELETE
  USING (false);


-- 3) RPC FUNCTIONS

-- Create activity event with dedup support
CREATE OR REPLACE FUNCTION public.create_activity_event(
  p_org_id uuid DEFAULT NULL,
  p_talent_user_id uuid DEFAULT NULL,
  p_event_type text DEFAULT NULL,
  p_entity_type text DEFAULT NULL,
  p_entity_id uuid DEFAULT NULL,
  p_actor_user_id uuid DEFAULT NULL,
  p_title text DEFAULT NULL,
  p_summary text DEFAULT NULL,
  p_metadata jsonb DEFAULT '{}'::jsonb,
  p_dedup_key text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_event_id uuid;
  v_final_metadata jsonb;
BEGIN
  -- Check for dedup (skip if same dedup_key exists in last 24 hours)
  IF p_dedup_key IS NOT NULL THEN
    IF EXISTS (
      SELECT 1 FROM activity_events
      WHERE metadata->>'dedup_key' = p_dedup_key
        AND created_at > now() - interval '24 hours'
    ) THEN
      -- Return existing event id
      SELECT id INTO v_event_id FROM activity_events
      WHERE metadata->>'dedup_key' = p_dedup_key
        AND created_at > now() - interval '24 hours'
      LIMIT 1;
      RETURN v_event_id;
    END IF;
    v_final_metadata := p_metadata || jsonb_build_object('dedup_key', p_dedup_key);
  ELSE
    v_final_metadata := p_metadata;
  END IF;

  INSERT INTO activity_events (
    org_id, talent_user_id, event_type, entity_type, entity_id,
    actor_user_id, title, summary, metadata
  ) VALUES (
    p_org_id, p_talent_user_id, p_event_type, p_entity_type, p_entity_id,
    p_actor_user_id, p_title, p_summary, v_final_metadata
  )
  RETURNING id INTO v_event_id;

  RETURN v_event_id;
END;
$$;

-- Create notification with dedup support
CREATE OR REPLACE FUNCTION public.create_notification(
  p_recipient_user_id uuid,
  p_notification_type text,
  p_entity_type text,
  p_entity_id uuid,
  p_title text,
  p_body text DEFAULT NULL,
  p_href text DEFAULT NULL,
  p_org_id uuid DEFAULT NULL,
  p_talent_user_id uuid DEFAULT NULL,
  p_metadata jsonb DEFAULT '{}'::jsonb,
  p_dedup_key text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_notification_id uuid;
  v_final_metadata jsonb;
BEGIN
  -- Check for dedup
  IF p_dedup_key IS NOT NULL THEN
    IF EXISTS (
      SELECT 1 FROM notifications
      WHERE metadata->>'dedup_key' = p_dedup_key
        AND recipient_user_id = p_recipient_user_id
        AND created_at > now() - interval '24 hours'
    ) THEN
      SELECT id INTO v_notification_id FROM notifications
      WHERE metadata->>'dedup_key' = p_dedup_key
        AND recipient_user_id = p_recipient_user_id
        AND created_at > now() - interval '24 hours'
      LIMIT 1;
      RETURN v_notification_id;
    END IF;
    v_final_metadata := p_metadata || jsonb_build_object('dedup_key', p_dedup_key);
  ELSE
    v_final_metadata := p_metadata;
  END IF;

  INSERT INTO notifications (
    recipient_user_id, notification_type, entity_type, entity_id,
    title, body, href, org_id, talent_user_id, metadata
  ) VALUES (
    p_recipient_user_id, p_notification_type, p_entity_type, p_entity_id,
    p_title, p_body, p_href, p_org_id, p_talent_user_id, v_final_metadata
  )
  RETURNING id INTO v_notification_id;

  RETURN v_notification_id;
END;
$$;

-- Mark single notification as read
CREATE OR REPLACE FUNCTION public.mark_notification_read(p_notification_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE notifications
  SET is_read = true, read_at = now()
  WHERE id = p_notification_id
    AND recipient_user_id = auth.uid()
    AND is_read = false;
  
  RETURN FOUND;
END;
$$;

-- Mark all notifications as read for current user
CREATE OR REPLACE FUNCTION public.mark_all_notifications_read()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer;
BEGIN
  UPDATE notifications
  SET is_read = true, read_at = now()
  WHERE recipient_user_id = auth.uid()
    AND is_read = false;
  
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

-- Get unread notification count
CREATE OR REPLACE FUNCTION public.get_unread_notification_count()
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)::integer
  FROM notifications
  WHERE recipient_user_id = auth.uid()
    AND is_read = false;
$$;


-- 4) TRIGGERS FOR AUTOMATIC EVENT GENERATION

-- Helper function to get org members for notifications
CREATE OR REPLACE FUNCTION public.get_org_member_ids(p_org_id uuid)
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT user_id FROM org_members WHERE org_id = p_org_id;
$$;

-- Trigger: job_posts INSERT → listing_created
CREATE OR REPLACE FUNCTION public.trigger_listing_created()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_dedup_key text;
  v_member_id uuid;
BEGIN
  v_dedup_key := 'listing_created:' || NEW.id::text;
  
  -- Create activity event
  PERFORM create_activity_event(
    p_org_id := NEW.org_id,
    p_event_type := 'listing_created',
    p_entity_type := 'listing',
    p_entity_id := NEW.id,
    p_title := 'Nytt uppdrag skapat: ' || COALESCE(NEW.title, 'Utan titel'),
    p_summary := CASE 
      WHEN NEW.listing_type = 'shift_cover' THEN 'Pass publicerat'
      ELSE 'Jobb publicerat'
    END,
    p_metadata := jsonb_build_object('listing_type', NEW.listing_type, 'status', NEW.status),
    p_dedup_key := v_dedup_key
  );

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_listing_created
  AFTER INSERT ON public.job_posts
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_listing_created();

-- Trigger: job_posts status UPDATE → listing_status_changed
CREATE OR REPLACE FUNCTION public.trigger_listing_status_changed()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_dedup_key text;
BEGIN
  -- Only trigger if status actually changed
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    v_dedup_key := 'listing_status:' || NEW.id::text || ':' || NEW.status;
    
    PERFORM create_activity_event(
      p_org_id := NEW.org_id,
      p_event_type := 'listing_status_changed',
      p_entity_type := 'listing',
      p_entity_id := NEW.id,
      p_title := 'Status ändrad: ' || COALESCE(NEW.title, 'Uppdrag'),
      p_summary := 'Ny status: ' || NEW.status,
      p_metadata := jsonb_build_object('old_status', OLD.status, 'new_status', NEW.status),
      p_dedup_key := v_dedup_key
    );
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_listing_status_changed
  AFTER UPDATE ON public.job_posts
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_listing_status_changed();

-- Trigger: matches INSERT → match_created
CREATE OR REPLACE FUNCTION public.trigger_match_created()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_dedup_key text;
  v_job_title text;
  v_org_name text;
BEGIN
  v_dedup_key := 'match_created:' || NEW.id::text;
  
  -- Get job title and org name
  SELECT jp.title, o.name INTO v_job_title, v_org_name
  FROM job_posts jp
  JOIN orgs o ON o.id = jp.org_id
  WHERE jp.id = NEW.job_post_id;

  -- Create activity event for org
  PERFORM create_activity_event(
    p_org_id := NEW.org_id,
    p_event_type := 'match_created',
    p_entity_type := 'match',
    p_entity_id := NEW.id,
    p_title := 'Ny matchning!',
    p_summary := COALESCE(v_job_title, 'Uppdrag'),
    p_metadata := jsonb_build_object('job_post_id', NEW.job_post_id, 'talent_user_id', NEW.talent_user_id),
    p_dedup_key := v_dedup_key || ':org'
  );

  -- Create activity event for talent
  PERFORM create_activity_event(
    p_talent_user_id := NEW.talent_user_id,
    p_event_type := 'match_created',
    p_entity_type := 'match',
    p_entity_id := NEW.id,
    p_title := 'Ny matchning!',
    p_summary := COALESCE(v_org_name, 'Arbetsgivare') || ' - ' || COALESCE(v_job_title, 'Uppdrag'),
    p_metadata := jsonb_build_object('job_post_id', NEW.job_post_id, 'org_id', NEW.org_id),
    p_dedup_key := v_dedup_key || ':talent'
  );

  -- Notify talent
  PERFORM create_notification(
    p_recipient_user_id := NEW.talent_user_id,
    p_notification_type := 'match_created',
    p_entity_type := 'match',
    p_entity_id := NEW.id,
    p_title := 'Ny matchning!',
    p_body := 'Du har matchat med ' || COALESCE(v_org_name, 'en arbetsgivare'),
    p_href := '/talent/matches/' || NEW.id::text,
    p_org_id := NEW.org_id,
    p_dedup_key := v_dedup_key || ':notif:talent'
  );

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_match_created
  AFTER INSERT ON public.matches
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_match_created();

-- Trigger: messages INSERT → message_sent
CREATE OR REPLACE FUNCTION public.trigger_message_sent()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_dedup_key text;
  v_match_id uuid;
  v_org_id uuid;
  v_talent_user_id uuid;
  v_other_user_id uuid;
  v_sender_name text;
BEGIN
  v_dedup_key := 'message_sent:' || NEW.thread_id::text || ':' || NEW.id::text;
  
  -- Get match info from thread
  SELECT t.match_id, m.org_id, m.talent_user_id 
  INTO v_match_id, v_org_id, v_talent_user_id
  FROM threads t
  JOIN matches m ON m.id = t.match_id
  WHERE t.id = NEW.thread_id;

  -- Get sender name
  SELECT COALESCE(full_name, 'Användare') INTO v_sender_name
  FROM profiles WHERE user_id = NEW.sender_user_id;

  -- Determine recipient (the other party)
  IF NEW.sender_user_id = v_talent_user_id THEN
    -- Sender is talent, notify org members
    FOR v_other_user_id IN SELECT user_id FROM org_members WHERE org_id = v_org_id LOOP
      PERFORM create_notification(
        p_recipient_user_id := v_other_user_id,
        p_notification_type := 'message_sent',
        p_entity_type := 'message',
        p_entity_id := NEW.id,
        p_title := 'Nytt meddelande',
        p_body := v_sender_name || ': ' || LEFT(NEW.body, 50) || CASE WHEN LENGTH(NEW.body) > 50 THEN '...' ELSE '' END,
        p_href := '/employer/matches/' || v_match_id::text,
        p_org_id := v_org_id,
        p_dedup_key := v_dedup_key || ':notif:' || v_other_user_id::text
      );
    END LOOP;

    -- Activity event for org
    PERFORM create_activity_event(
      p_org_id := v_org_id,
      p_event_type := 'message_sent',
      p_entity_type := 'message',
      p_entity_id := NEW.id,
      p_actor_user_id := NEW.sender_user_id,
      p_title := 'Nytt meddelande från ' || v_sender_name,
      p_summary := LEFT(NEW.body, 100),
      p_metadata := jsonb_build_object('thread_id', NEW.thread_id, 'match_id', v_match_id),
      p_dedup_key := v_dedup_key || ':org'
    );
  ELSE
    -- Sender is org, notify talent
    PERFORM create_notification(
      p_recipient_user_id := v_talent_user_id,
      p_notification_type := 'message_sent',
      p_entity_type := 'message',
      p_entity_id := NEW.id,
      p_title := 'Nytt meddelande',
      p_body := v_sender_name || ': ' || LEFT(NEW.body, 50) || CASE WHEN LENGTH(NEW.body) > 50 THEN '...' ELSE '' END,
      p_href := '/talent/matches/' || v_match_id::text,
      p_talent_user_id := v_talent_user_id,
      p_dedup_key := v_dedup_key || ':notif:talent'
    );

    -- Activity event for talent
    PERFORM create_activity_event(
      p_talent_user_id := v_talent_user_id,
      p_event_type := 'message_sent',
      p_entity_type := 'message',
      p_entity_id := NEW.id,
      p_actor_user_id := NEW.sender_user_id,
      p_title := 'Nytt meddelande från ' || v_sender_name,
      p_summary := LEFT(NEW.body, 100),
      p_metadata := jsonb_build_object('thread_id', NEW.thread_id, 'match_id', v_match_id),
      p_dedup_key := v_dedup_key || ':talent'
    );
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_message_sent
  AFTER INSERT ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_message_sent();

-- Trigger: borrow_requests INSERT → borrow_request_created
CREATE OR REPLACE FUNCTION public.trigger_borrow_request_created()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_dedup_key text;
  v_org_name text;
BEGIN
  v_dedup_key := 'borrow_request_created:' || NEW.id::text;
  
  SELECT name INTO v_org_name FROM orgs WHERE id = NEW.org_id;

  -- Activity event
  PERFORM create_activity_event(
    p_org_id := NEW.org_id,
    p_event_type := 'borrow_request_created',
    p_entity_type := 'borrow_request',
    p_entity_id := NEW.id,
    p_actor_user_id := NEW.created_by,
    p_title := 'Låneförfrågan skapad',
    p_summary := NEW.role_key || ' i ' || NEW.location,
    p_metadata := jsonb_build_object('scope', NEW.scope, 'circle_id', NEW.circle_id),
    p_dedup_key := v_dedup_key
  );

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_borrow_request_created
  AFTER INSERT ON public.borrow_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_borrow_request_created();

-- Trigger: borrow_offers INSERT → borrow_offer_created
CREATE OR REPLACE FUNCTION public.trigger_borrow_offer_created()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_dedup_key text;
  v_request borrow_requests%ROWTYPE;
  v_org_name text;
BEGIN
  v_dedup_key := 'borrow_offer_created:' || NEW.id::text;
  
  SELECT * INTO v_request FROM borrow_requests WHERE id = NEW.borrow_request_id;
  SELECT name INTO v_org_name FROM orgs WHERE id = v_request.org_id;

  -- Activity event for talent
  PERFORM create_activity_event(
    p_talent_user_id := NEW.talent_user_id,
    p_event_type := 'borrow_offer_created',
    p_entity_type := 'borrow_offer',
    p_entity_id := NEW.id,
    p_title := 'Ny låneförfrågan',
    p_summary := COALESCE(v_org_name, 'Arbetsgivare') || ' söker ' || v_request.role_key,
    p_metadata := jsonb_build_object('borrow_request_id', NEW.borrow_request_id),
    p_dedup_key := v_dedup_key || ':talent'
  );

  -- Notify talent
  PERFORM create_notification(
    p_recipient_user_id := NEW.talent_user_id,
    p_notification_type := 'borrow_offer_created',
    p_entity_type := 'borrow_offer',
    p_entity_id := NEW.id,
    p_title := 'Extratid-förfrågan',
    p_body := COALESCE(v_org_name, 'En arbetsgivare') || ' vill låna dig för ett pass',
    p_href := '/talent/dashboard',
    p_talent_user_id := NEW.talent_user_id,
    p_dedup_key := v_dedup_key || ':notif'
  );

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_borrow_offer_created
  AFTER INSERT ON public.borrow_offers
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_borrow_offer_created();

-- Trigger: shift_bookings INSERT → booking_created
CREATE OR REPLACE FUNCTION public.trigger_booking_created()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_dedup_key text;
  v_org_name text;
BEGIN
  v_dedup_key := 'booking_created:' || NEW.id::text;
  
  SELECT name INTO v_org_name FROM orgs WHERE id = NEW.org_id;

  -- Activity event for org
  PERFORM create_activity_event(
    p_org_id := NEW.org_id,
    p_event_type := 'booking_created',
    p_entity_type := 'booking',
    p_entity_id := NEW.id,
    p_title := 'Ny bokning skapad',
    p_summary := to_char(NEW.start_ts, 'DD Mon HH24:MI') || ' - ' || to_char(NEW.end_ts, 'HH24:MI'),
    p_metadata := jsonb_build_object('talent_user_id', NEW.talent_user_id),
    p_dedup_key := v_dedup_key || ':org'
  );

  -- Activity event for talent
  PERFORM create_activity_event(
    p_talent_user_id := NEW.talent_user_id,
    p_event_type := 'booking_created',
    p_entity_type := 'booking',
    p_entity_id := NEW.id,
    p_title := 'Du är bokad!',
    p_summary := COALESCE(v_org_name, 'Arbetsgivare') || ' - ' || to_char(NEW.start_ts, 'DD Mon HH24:MI'),
    p_metadata := jsonb_build_object('org_id', NEW.org_id),
    p_dedup_key := v_dedup_key || ':talent'
  );

  -- Notify talent
  PERFORM create_notification(
    p_recipient_user_id := NEW.talent_user_id,
    p_notification_type := 'booking_created',
    p_entity_type := 'booking',
    p_entity_id := NEW.id,
    p_title := 'Ny bokning',
    p_body := 'Du är bokad hos ' || COALESCE(v_org_name, 'en arbetsgivare'),
    p_href := '/talent/dashboard',
    p_talent_user_id := NEW.talent_user_id,
    p_dedup_key := v_dedup_key || ':notif'
  );

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_booking_created
  AFTER INSERT ON public.shift_bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_booking_created();

-- Trigger: release_offers INSERT → release_offer_created
CREATE OR REPLACE FUNCTION public.trigger_release_offer_created()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_dedup_key text;
  v_org_name text;
  v_booking shift_bookings%ROWTYPE;
  v_partner_org_id uuid;
BEGIN
  v_dedup_key := 'release_offer_created:' || NEW.id::text;
  
  SELECT name INTO v_org_name FROM orgs WHERE id = NEW.from_org_id;
  SELECT * INTO v_booking FROM shift_bookings WHERE id = NEW.booking_id;

  -- Activity event for org
  PERFORM create_activity_event(
    p_org_id := NEW.from_org_id,
    p_event_type := 'release_offer_created',
    p_entity_type := 'release_offer',
    p_entity_id := NEW.id,
    p_title := 'Pass släppt till circle',
    p_summary := to_char(v_booking.start_ts, 'DD Mon HH24:MI'),
    p_metadata := jsonb_build_object('booking_id', NEW.booking_id),
    p_dedup_key := v_dedup_key || ':org'
  );

  -- Notify circle partners
  FOR v_partner_org_id IN 
    SELECT org_id FROM get_trusted_circle_orgs(NEW.from_org_id)
  LOOP
    -- Notify each member of partner orgs
    PERFORM create_notification(
      p_recipient_user_id := om.user_id,
      p_notification_type := 'release_offer_created',
      p_entity_type := 'release_offer',
      p_entity_id := NEW.id,
      p_title := 'Ledigt pass i din circle',
      p_body := COALESCE(v_org_name, 'En partner') || ' har släppt ett pass',
      p_href := '/employer/borrow',
      p_org_id := v_partner_org_id
    )
    FROM org_members om WHERE om.org_id = v_partner_org_id;
  END LOOP;

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_release_offer_created
  AFTER INSERT ON public.release_offers
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_release_offer_created();

-- Enable realtime for notifications (for live updates)
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;