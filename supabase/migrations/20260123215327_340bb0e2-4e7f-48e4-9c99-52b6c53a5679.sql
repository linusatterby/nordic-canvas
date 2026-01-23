-- =============================================================
-- Event/Notification Hardening: dedupe, severity, rate limiting
-- =============================================================

-- 1) ADD COLUMNS TO ACTIVITY_EVENTS
ALTER TABLE public.activity_events
ADD COLUMN IF NOT EXISTS severity text NOT NULL DEFAULT 'info',
ADD COLUMN IF NOT EXISTS dedup_key text NULL,
ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'trigger';

-- Add CHECK constraints
ALTER TABLE public.activity_events
ADD CONSTRAINT activity_events_severity_check CHECK (
  severity IN ('info', 'success', 'warning', 'urgent')
);

ALTER TABLE public.activity_events
ADD CONSTRAINT activity_events_source_check CHECK (
  source IN ('trigger', 'rpc', 'api', 'demo')
);

-- Create unique partial index for dedupe
CREATE UNIQUE INDEX IF NOT EXISTS idx_activity_events_dedup_unique 
ON public.activity_events(dedup_key) 
WHERE dedup_key IS NOT NULL;

-- Drop old non-unique dedup index if exists
DROP INDEX IF EXISTS public.idx_activity_events_dedup;


-- 2) ADD COLUMNS TO NOTIFICATIONS
ALTER TABLE public.notifications
ADD COLUMN IF NOT EXISTS severity text NOT NULL DEFAULT 'info',
ADD COLUMN IF NOT EXISTS dedup_key text NULL,
ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'trigger';

-- Add CHECK constraints
ALTER TABLE public.notifications
ADD CONSTRAINT notifications_severity_check CHECK (
  severity IN ('info', 'success', 'warning', 'urgent')
);

ALTER TABLE public.notifications
ADD CONSTRAINT notifications_source_check CHECK (
  source IN ('trigger', 'rpc', 'api', 'demo')
);

-- Create unique partial index for dedupe
CREATE UNIQUE INDEX IF NOT EXISTS idx_notifications_dedup_unique 
ON public.notifications(dedup_key) 
WHERE dedup_key IS NOT NULL;

-- Drop old non-unique dedup index if exists
DROP INDEX IF EXISTS public.idx_notifications_dedup;


-- 3) UPDATE RPC: create_activity_event with ON CONFLICT + severity + source
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
  p_dedup_key text DEFAULT NULL,
  p_severity text DEFAULT 'info',
  p_source text DEFAULT 'trigger'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_event_id uuid;
BEGIN
  -- Use ON CONFLICT for idempotent insert
  INSERT INTO activity_events (
    org_id, talent_user_id, event_type, entity_type, entity_id,
    actor_user_id, title, summary, metadata, dedup_key, severity, source
  ) VALUES (
    p_org_id, p_talent_user_id, p_event_type, p_entity_type, p_entity_id,
    p_actor_user_id, p_title, p_summary, p_metadata, p_dedup_key, p_severity, p_source
  )
  ON CONFLICT (dedup_key) WHERE dedup_key IS NOT NULL
  DO NOTHING
  RETURNING id INTO v_event_id;

  -- If insert was skipped due to conflict, return existing id
  IF v_event_id IS NULL AND p_dedup_key IS NOT NULL THEN
    SELECT id INTO v_event_id 
    FROM activity_events 
    WHERE dedup_key = p_dedup_key
    LIMIT 1;
  END IF;

  RETURN v_event_id;
END;
$$;


-- 4) UPDATE RPC: create_notification with ON CONFLICT + severity + source + rate limiting
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
  p_dedup_key text DEFAULT NULL,
  p_severity text DEFAULT 'info',
  p_source text DEFAULT 'trigger'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_notification_id uuid;
BEGIN
  -- Use ON CONFLICT for idempotent insert
  INSERT INTO notifications (
    recipient_user_id, notification_type, entity_type, entity_id,
    title, body, href, org_id, talent_user_id, metadata, 
    dedup_key, severity, source
  ) VALUES (
    p_recipient_user_id, p_notification_type, p_entity_type, p_entity_id,
    p_title, p_body, p_href, p_org_id, p_talent_user_id, p_metadata,
    p_dedup_key, p_severity, p_source
  )
  ON CONFLICT (dedup_key) WHERE dedup_key IS NOT NULL
  DO NOTHING
  RETURNING id INTO v_notification_id;

  -- If insert was skipped due to conflict, return existing id
  IF v_notification_id IS NULL AND p_dedup_key IS NOT NULL THEN
    SELECT id INTO v_notification_id 
    FROM notifications 
    WHERE dedup_key = p_dedup_key
    LIMIT 1;
  END IF;

  RETURN v_notification_id;
END;
$$;


-- 5) Helper: check_message_rate_limit (2-min window per thread/recipient)
CREATE OR REPLACE FUNCTION public.check_message_rate_limit(
  p_thread_id uuid,
  p_recipient_user_id uuid
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT NOT EXISTS (
    SELECT 1 FROM notifications
    WHERE entity_type = 'message'
      AND notification_type = 'message_sent'
      AND recipient_user_id = p_recipient_user_id
      AND (metadata->>'thread_id')::uuid = p_thread_id
      AND created_at > now() - interval '2 minutes'
  );
$$;


-- 6) UPDATE TRIGGERS WITH SEVERITY

-- Listing created trigger (severity: info)
CREATE OR REPLACE FUNCTION public.trigger_listing_created()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_dedup_key text;
  v_severity text;
BEGIN
  v_dedup_key := 'listing_created:' || NEW.id::text;
  v_severity := CASE WHEN NEW.status = 'published' THEN 'success' ELSE 'info' END;
  
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
    p_dedup_key := v_dedup_key,
    p_severity := v_severity,
    p_source := 'trigger'
  );

  RETURN NEW;
END;
$$;


-- Listing status changed trigger (severity based on transition)
CREATE OR REPLACE FUNCTION public.trigger_listing_status_changed()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_dedup_key text;
  v_severity text;
  v_member_id uuid;
BEGIN
  -- Only trigger if status actually changed
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    v_dedup_key := 'listing_status:' || NEW.id::text || ':' || NEW.status;
    
    -- Determine severity based on transition
    v_severity := CASE
      WHEN NEW.status = 'published' AND OLD.status = 'draft' THEN 'success'
      WHEN NEW.status = 'matching' THEN 'success'
      WHEN NEW.status = 'closed' THEN 'info'
      ELSE 'info'
    END;
    
    PERFORM create_activity_event(
      p_org_id := NEW.org_id,
      p_event_type := 'listing_status_changed',
      p_entity_type := 'listing',
      p_entity_id := NEW.id,
      p_title := 'Status ändrad: ' || COALESCE(NEW.title, 'Uppdrag'),
      p_summary := 'Ny status: ' || NEW.status,
      p_metadata := jsonb_build_object('old_status', OLD.status, 'new_status', NEW.status),
      p_dedup_key := v_dedup_key,
      p_severity := v_severity,
      p_source := 'trigger'
    );

    -- Notify org members for important transitions
    IF NEW.status IN ('published', 'matching') AND OLD.status IN ('draft', 'published') THEN
      FOR v_member_id IN SELECT user_id FROM org_members WHERE org_id = NEW.org_id LOOP
        PERFORM create_notification(
          p_recipient_user_id := v_member_id,
          p_notification_type := 'listing_status_changed',
          p_entity_type := 'listing',
          p_entity_id := NEW.id,
          p_title := CASE WHEN NEW.status = 'matching' THEN 'Matchning startad!' ELSE 'Uppdrag publicerat' END,
          p_body := COALESCE(NEW.title, 'Uppdrag') || ' är nu ' || NEW.status,
          p_href := '/employer/jobs',
          p_org_id := NEW.org_id,
          p_dedup_key := v_dedup_key || ':notif:' || v_member_id::text,
          p_severity := v_severity,
          p_source := 'trigger'
        );
      END LOOP;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;


-- Match created trigger (severity: success)
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
  v_member_id uuid;
BEGIN
  v_dedup_key := 'match_created:' || NEW.id::text;
  
  -- Get job title and org name
  SELECT jp.title, o.name INTO v_job_title, v_org_name
  FROM job_posts jp
  JOIN orgs o ON o.id = jp.org_id
  WHERE jp.id = NEW.job_post_id;

  -- Create activity event for org (severity: success)
  PERFORM create_activity_event(
    p_org_id := NEW.org_id,
    p_event_type := 'match_created',
    p_entity_type := 'match',
    p_entity_id := NEW.id,
    p_title := 'Ny matchning!',
    p_summary := COALESCE(v_job_title, 'Uppdrag'),
    p_metadata := jsonb_build_object('job_post_id', NEW.job_post_id, 'talent_user_id', NEW.talent_user_id),
    p_dedup_key := v_dedup_key || ':org',
    p_severity := 'success',
    p_source := 'trigger'
  );

  -- Create activity event for talent (severity: success)
  PERFORM create_activity_event(
    p_talent_user_id := NEW.talent_user_id,
    p_event_type := 'match_created',
    p_entity_type := 'match',
    p_entity_id := NEW.id,
    p_title := 'Ny matchning!',
    p_summary := COALESCE(v_org_name, 'Arbetsgivare') || ' - ' || COALESCE(v_job_title, 'Uppdrag'),
    p_metadata := jsonb_build_object('job_post_id', NEW.job_post_id, 'org_id', NEW.org_id),
    p_dedup_key := v_dedup_key || ':talent',
    p_severity := 'success',
    p_source := 'trigger'
  );

  -- Notify talent (severity: success)
  PERFORM create_notification(
    p_recipient_user_id := NEW.talent_user_id,
    p_notification_type := 'match_created',
    p_entity_type := 'match',
    p_entity_id := NEW.id,
    p_title := 'Ny matchning!',
    p_body := 'Du har matchat med ' || COALESCE(v_org_name, 'en arbetsgivare'),
    p_href := '/talent/matches/' || NEW.id::text,
    p_org_id := NEW.org_id,
    p_dedup_key := v_dedup_key || ':notif:talent',
    p_severity := 'success',
    p_source := 'trigger'
  );

  -- Notify org members (severity: success)
  FOR v_member_id IN SELECT user_id FROM org_members WHERE org_id = NEW.org_id LOOP
    PERFORM create_notification(
      p_recipient_user_id := v_member_id,
      p_notification_type := 'match_created',
      p_entity_type := 'match',
      p_entity_id := NEW.id,
      p_title := 'Ny matchning!',
      p_body := 'Ny kandidat för ' || COALESCE(v_job_title, 'uppdrag'),
      p_href := '/employer/matches/' || NEW.id::text,
      p_org_id := NEW.org_id,
      p_dedup_key := v_dedup_key || ':notif:org:' || v_member_id::text,
      p_severity := 'success',
      p_source := 'trigger'
    );
  END LOOP;

  RETURN NEW;
END;
$$;


-- Message sent trigger (with rate limiting, severity: info)
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
  v_can_notify boolean;
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
      -- Check rate limit (2-min window)
      v_can_notify := check_message_rate_limit(NEW.thread_id, v_other_user_id);
      
      IF v_can_notify THEN
        PERFORM create_notification(
          p_recipient_user_id := v_other_user_id,
          p_notification_type := 'message_sent',
          p_entity_type := 'message',
          p_entity_id := NEW.id,
          p_title := 'Nytt meddelande',
          p_body := v_sender_name || ': ' || LEFT(NEW.body, 50) || CASE WHEN LENGTH(NEW.body) > 50 THEN '...' ELSE '' END,
          p_href := '/employer/matches/' || v_match_id::text,
          p_org_id := v_org_id,
          p_metadata := jsonb_build_object('thread_id', NEW.thread_id, 'match_id', v_match_id),
          p_dedup_key := 'msg_notify:' || NEW.thread_id::text || ':' || v_other_user_id::text || ':' || to_char(now(), 'YYYYMMDDHH24') || lpad((extract(minute from now())::int / 2 * 2)::text, 2, '0'),
          p_severity := 'info',
          p_source := 'trigger'
        );
      END IF;
    END LOOP;

    -- Activity event for org (always created)
    PERFORM create_activity_event(
      p_org_id := v_org_id,
      p_event_type := 'message_sent',
      p_entity_type := 'message',
      p_entity_id := NEW.id,
      p_actor_user_id := NEW.sender_user_id,
      p_title := 'Nytt meddelande från ' || v_sender_name,
      p_summary := LEFT(NEW.body, 100),
      p_metadata := jsonb_build_object('thread_id', NEW.thread_id, 'match_id', v_match_id),
      p_dedup_key := v_dedup_key || ':org',
      p_severity := 'info',
      p_source := 'trigger'
    );
  ELSE
    -- Sender is org, notify talent
    v_can_notify := check_message_rate_limit(NEW.thread_id, v_talent_user_id);
    
    IF v_can_notify THEN
      PERFORM create_notification(
        p_recipient_user_id := v_talent_user_id,
        p_notification_type := 'message_sent',
        p_entity_type := 'message',
        p_entity_id := NEW.id,
        p_title := 'Nytt meddelande',
        p_body := v_sender_name || ': ' || LEFT(NEW.body, 50) || CASE WHEN LENGTH(NEW.body) > 50 THEN '...' ELSE '' END,
        p_href := '/talent/matches/' || v_match_id::text,
        p_talent_user_id := v_talent_user_id,
        p_metadata := jsonb_build_object('thread_id', NEW.thread_id, 'match_id', v_match_id),
        p_dedup_key := 'msg_notify:' || NEW.thread_id::text || ':' || v_talent_user_id::text || ':' || to_char(now(), 'YYYYMMDDHH24') || lpad((extract(minute from now())::int / 2 * 2)::text, 2, '0'),
        p_severity := 'info',
        p_source := 'trigger'
      );
    END IF;

    -- Activity event for talent (always created)
    PERFORM create_activity_event(
      p_talent_user_id := v_talent_user_id,
      p_event_type := 'message_sent',
      p_entity_type := 'message',
      p_entity_id := NEW.id,
      p_actor_user_id := NEW.sender_user_id,
      p_title := 'Nytt meddelande från ' || v_sender_name,
      p_summary := LEFT(NEW.body, 100),
      p_metadata := jsonb_build_object('thread_id', NEW.thread_id, 'match_id', v_match_id),
      p_dedup_key := v_dedup_key || ':talent',
      p_severity := 'info',
      p_source := 'trigger'
    );
  END IF;

  RETURN NEW;
END;
$$;


-- Borrow request created trigger (severity: warning)
CREATE OR REPLACE FUNCTION public.trigger_borrow_request_created()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_dedup_key text;
  v_org_name text;
  v_member_id uuid;
BEGIN
  v_dedup_key := 'borrow_request_created:' || NEW.id::text;
  
  SELECT name INTO v_org_name FROM orgs WHERE id = NEW.org_id;

  -- Activity event (severity: warning for urgent need)
  PERFORM create_activity_event(
    p_org_id := NEW.org_id,
    p_event_type := 'borrow_request_created',
    p_entity_type := 'borrow_request',
    p_entity_id := NEW.id,
    p_actor_user_id := NEW.created_by,
    p_title := 'Låneförfrågan skapad',
    p_summary := NEW.role_key || ' i ' || NEW.location,
    p_metadata := jsonb_build_object('scope', NEW.scope, 'circle_id', NEW.circle_id),
    p_dedup_key := v_dedup_key,
    p_severity := 'warning',
    p_source := 'trigger'
  );

  -- Notify org members (severity: warning)
  FOR v_member_id IN SELECT user_id FROM org_members WHERE org_id = NEW.org_id AND user_id != NEW.created_by LOOP
    PERFORM create_notification(
      p_recipient_user_id := v_member_id,
      p_notification_type := 'borrow_request_created',
      p_entity_type := 'borrow_request',
      p_entity_id := NEW.id,
      p_title := 'Ny låneförfrågan',
      p_body := NEW.role_key || ' behövs i ' || NEW.location,
      p_href := '/employer/borrow',
      p_org_id := NEW.org_id,
      p_dedup_key := v_dedup_key || ':notif:' || v_member_id::text,
      p_severity := 'warning',
      p_source := 'trigger'
    );
  END LOOP;

  RETURN NEW;
END;
$$;


-- Borrow offer created trigger (severity: urgent for org, info for talent)
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
  v_member_id uuid;
BEGIN
  v_dedup_key := 'borrow_offer_created:' || NEW.id::text;
  
  SELECT * INTO v_request FROM borrow_requests WHERE id = NEW.borrow_request_id;
  SELECT name INTO v_org_name FROM orgs WHERE id = v_request.org_id;

  -- Activity event for talent (severity: info)
  PERFORM create_activity_event(
    p_talent_user_id := NEW.talent_user_id,
    p_event_type := 'borrow_offer_created',
    p_entity_type := 'borrow_offer',
    p_entity_id := NEW.id,
    p_title := 'Ny låneförfrågan',
    p_summary := COALESCE(v_org_name, 'Arbetsgivare') || ' söker ' || v_request.role_key,
    p_metadata := jsonb_build_object('borrow_request_id', NEW.borrow_request_id),
    p_dedup_key := v_dedup_key || ':talent',
    p_severity := 'info',
    p_source := 'trigger'
  );

  -- Notify talent (severity: info)
  PERFORM create_notification(
    p_recipient_user_id := NEW.talent_user_id,
    p_notification_type := 'borrow_offer_created',
    p_entity_type := 'borrow_offer',
    p_entity_id := NEW.id,
    p_title := 'Extratid-förfrågan',
    p_body := COALESCE(v_org_name, 'En arbetsgivare') || ' vill låna dig för ett pass',
    p_href := '/talent/dashboard',
    p_talent_user_id := NEW.talent_user_id,
    p_dedup_key := v_dedup_key || ':notif:talent',
    p_severity := 'info',
    p_source := 'trigger'
  );

  -- Activity event for requesting org (severity: urgent)
  PERFORM create_activity_event(
    p_org_id := v_request.org_id,
    p_event_type := 'borrow_offer_created',
    p_entity_type := 'borrow_offer',
    p_entity_id := NEW.id,
    p_title := 'Erbjudande skickat',
    p_summary := 'Väntar på svar',
    p_metadata := jsonb_build_object('borrow_request_id', NEW.borrow_request_id, 'talent_user_id', NEW.talent_user_id),
    p_dedup_key := v_dedup_key || ':org',
    p_severity := 'info',
    p_source := 'trigger'
  );

  RETURN NEW;
END;
$$;


-- Booking created trigger (severity: info for talent)
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

  -- Activity event for org (severity: success)
  PERFORM create_activity_event(
    p_org_id := NEW.org_id,
    p_event_type := 'booking_created',
    p_entity_type := 'booking',
    p_entity_id := NEW.id,
    p_title := 'Ny bokning skapad',
    p_summary := to_char(NEW.start_ts, 'DD Mon HH24:MI') || ' - ' || to_char(NEW.end_ts, 'HH24:MI'),
    p_metadata := jsonb_build_object('talent_user_id', NEW.talent_user_id),
    p_dedup_key := v_dedup_key || ':org',
    p_severity := 'success',
    p_source := 'trigger'
  );

  -- Activity event for talent (severity: success)
  PERFORM create_activity_event(
    p_talent_user_id := NEW.talent_user_id,
    p_event_type := 'booking_created',
    p_entity_type := 'booking',
    p_entity_id := NEW.id,
    p_title := 'Du är bokad!',
    p_summary := COALESCE(v_org_name, 'Arbetsgivare') || ' - ' || to_char(NEW.start_ts, 'DD Mon HH24:MI'),
    p_metadata := jsonb_build_object('org_id', NEW.org_id),
    p_dedup_key := v_dedup_key || ':talent',
    p_severity := 'success',
    p_source := 'trigger'
  );

  -- Notify talent (severity: info)
  PERFORM create_notification(
    p_recipient_user_id := NEW.talent_user_id,
    p_notification_type := 'booking_created',
    p_entity_type := 'booking',
    p_entity_id := NEW.id,
    p_title := 'Ny bokning',
    p_body := 'Du är bokad hos ' || COALESCE(v_org_name, 'en arbetsgivare'),
    p_href := '/talent/dashboard',
    p_talent_user_id := NEW.talent_user_id,
    p_dedup_key := v_dedup_key || ':notif',
    p_severity := 'info',
    p_source := 'trigger'
  );

  RETURN NEW;
END;
$$;


-- Release offer created trigger (severity: warning)
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
  v_member_id uuid;
BEGIN
  v_dedup_key := 'release_offer_created:' || NEW.id::text;
  
  SELECT name INTO v_org_name FROM orgs WHERE id = NEW.from_org_id;
  SELECT * INTO v_booking FROM shift_bookings WHERE id = NEW.booking_id;

  -- Activity event for org (severity: warning)
  PERFORM create_activity_event(
    p_org_id := NEW.from_org_id,
    p_event_type := 'release_offer_created',
    p_entity_type := 'release_offer',
    p_entity_id := NEW.id,
    p_title := 'Pass släppt till circle',
    p_summary := to_char(v_booking.start_ts, 'DD Mon HH24:MI'),
    p_metadata := jsonb_build_object('booking_id', NEW.booking_id),
    p_dedup_key := v_dedup_key || ':org',
    p_severity := 'warning',
    p_source := 'trigger'
  );

  -- Notify circle partners (severity: warning)
  FOR v_partner_org_id IN 
    SELECT org_id FROM get_trusted_circle_orgs(NEW.from_org_id)
  LOOP
    FOR v_member_id IN SELECT user_id FROM org_members WHERE org_id = v_partner_org_id LOOP
      PERFORM create_notification(
        p_recipient_user_id := v_member_id,
        p_notification_type := 'release_offer_created',
        p_entity_type := 'release_offer',
        p_entity_id := NEW.id,
        p_title := 'Ledigt pass i din circle',
        p_body := COALESCE(v_org_name, 'En partner') || ' har släppt ett pass',
        p_href := '/employer/borrow',
        p_org_id := v_partner_org_id,
        p_dedup_key := v_dedup_key || ':notif:' || v_member_id::text,
        p_severity := 'warning',
        p_source := 'trigger'
      );
    END LOOP;
  END LOOP;

  RETURN NEW;
END;
$$;


-- 7) Add trigger for borrow_offer accepted (when status changes to 'accepted')
CREATE OR REPLACE FUNCTION public.trigger_borrow_offer_accepted()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_dedup_key text;
  v_request borrow_requests%ROWTYPE;
  v_org_name text;
  v_talent_name text;
  v_member_id uuid;
BEGIN
  -- Only trigger when status changes to accepted
  IF OLD.status != 'accepted' AND NEW.status = 'accepted' THEN
    v_dedup_key := 'borrow_offer_accepted:' || NEW.id::text;
    
    SELECT * INTO v_request FROM borrow_requests WHERE id = NEW.borrow_request_id;
    SELECT name INTO v_org_name FROM orgs WHERE id = v_request.org_id;
    SELECT COALESCE(full_name, 'Talang') INTO v_talent_name FROM profiles WHERE user_id = NEW.talent_user_id;

    -- Activity event for org (severity: success)
    PERFORM create_activity_event(
      p_org_id := v_request.org_id,
      p_event_type := 'borrow_offer_accepted',
      p_entity_type := 'borrow_offer',
      p_entity_id := NEW.id,
      p_title := 'Låneförfrågan accepterad!',
      p_summary := v_talent_name || ' har tackat ja',
      p_metadata := jsonb_build_object('talent_user_id', NEW.talent_user_id),
      p_dedup_key := v_dedup_key || ':org',
      p_severity := 'success',
      p_source := 'trigger'
    );

    -- Notify org members (severity: success)
    FOR v_member_id IN SELECT user_id FROM org_members WHERE org_id = v_request.org_id LOOP
      PERFORM create_notification(
        p_recipient_user_id := v_member_id,
        p_notification_type := 'borrow_offer_accepted',
        p_entity_type := 'borrow_offer',
        p_entity_id := NEW.id,
        p_title := 'Förfrågan accepterad!',
        p_body := v_talent_name || ' har accepterat din låneförfrågan',
        p_href := '/employer/borrow',
        p_org_id := v_request.org_id,
        p_dedup_key := v_dedup_key || ':notif:' || v_member_id::text,
        p_severity := 'success',
        p_source := 'trigger'
      );
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$;

-- Create trigger for borrow_offer accepted
DROP TRIGGER IF EXISTS on_borrow_offer_accepted ON public.borrow_offers;
CREATE TRIGGER on_borrow_offer_accepted
  AFTER UPDATE ON public.borrow_offers
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_borrow_offer_accepted();


-- 8) Add trigger for release_offer taken
CREATE OR REPLACE FUNCTION public.trigger_release_offer_taken()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_dedup_key text;
  v_from_org_name text;
  v_taker_org_name text;
  v_member_id uuid;
BEGIN
  -- Only trigger when status changes to taken and taken_by_org_id is set
  IF OLD.status != 'taken' AND NEW.status = 'taken' AND NEW.taken_by_org_id IS NOT NULL THEN
    v_dedup_key := 'release_offer_taken:' || NEW.id::text;
    
    SELECT name INTO v_from_org_name FROM orgs WHERE id = NEW.from_org_id;
    SELECT name INTO v_taker_org_name FROM orgs WHERE id = NEW.taken_by_org_id;

    -- Activity event for from_org (severity: success)
    PERFORM create_activity_event(
      p_org_id := NEW.from_org_id,
      p_event_type := 'release_offer_taken',
      p_entity_type := 'release_offer',
      p_entity_id := NEW.id,
      p_title := 'Pass taget!',
      p_summary := COALESCE(v_taker_org_name, 'Partner') || ' tar över',
      p_metadata := jsonb_build_object('taken_by_org_id', NEW.taken_by_org_id),
      p_dedup_key := v_dedup_key || ':from',
      p_severity := 'success',
      p_source := 'trigger'
    );

    -- Activity event for taker_org (severity: success)
    PERFORM create_activity_event(
      p_org_id := NEW.taken_by_org_id,
      p_event_type := 'release_offer_taken',
      p_entity_type := 'release_offer',
      p_entity_id := NEW.id,
      p_title := 'Du tog ett pass!',
      p_summary := 'Från ' || COALESCE(v_from_org_name, 'partner'),
      p_metadata := jsonb_build_object('from_org_id', NEW.from_org_id),
      p_dedup_key := v_dedup_key || ':taker',
      p_severity := 'success',
      p_source := 'trigger'
    );

    -- Notify from_org members (severity: success)
    FOR v_member_id IN SELECT user_id FROM org_members WHERE org_id = NEW.from_org_id LOOP
      PERFORM create_notification(
        p_recipient_user_id := v_member_id,
        p_notification_type := 'release_offer_taken',
        p_entity_type := 'release_offer',
        p_entity_id := NEW.id,
        p_title := 'Pass taget!',
        p_body := COALESCE(v_taker_org_name, 'En partner') || ' tar över passet',
        p_href := '/employer/borrow',
        p_org_id := NEW.from_org_id,
        p_dedup_key := v_dedup_key || ':notif:from:' || v_member_id::text,
        p_severity := 'success',
        p_source := 'trigger'
      );
    END LOOP;

    -- Notify taker_org members (severity: success)
    FOR v_member_id IN SELECT user_id FROM org_members WHERE org_id = NEW.taken_by_org_id LOOP
      PERFORM create_notification(
        p_recipient_user_id := v_member_id,
        p_notification_type := 'release_offer_taken',
        p_entity_type := 'release_offer',
        p_entity_id := NEW.id,
        p_title := 'Pass överfört!',
        p_body := 'Ni tar över ett pass från ' || COALESCE(v_from_org_name, 'partner'),
        p_href := '/employer/scheduler',
        p_org_id := NEW.taken_by_org_id,
        p_dedup_key := v_dedup_key || ':notif:taker:' || v_member_id::text,
        p_severity := 'success',
        p_source := 'trigger'
      );
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$;

-- Create trigger for release_offer taken
DROP TRIGGER IF EXISTS on_release_offer_taken ON public.release_offers;
CREATE TRIGGER on_release_offer_taken
  AFTER UPDATE ON public.release_offers
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_release_offer_taken();