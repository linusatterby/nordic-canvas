-- Add server guard to send_offer to prevent duplicate offers for same match
-- Also add healthcheck_events RPC for admin health page

-- 1. Update send_offer with conflict guard
CREATE OR REPLACE FUNCTION public.send_offer(p_offer_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_offer offers%ROWTYPE;
  v_user_id uuid := auth.uid();
  v_existing_count int;
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
  
  -- ANTI-SPAM GUARD: Check if another offer already exists for same match/talent with sent/accepted status
  SELECT COUNT(*) INTO v_existing_count
  FROM offers
  WHERE id <> p_offer_id
    AND org_id = v_offer.org_id
    AND (
      (match_id IS NOT NULL AND match_id = v_offer.match_id) OR
      (talent_user_id = v_offer.talent_user_id AND listing_id = v_offer.listing_id)
    )
    AND status IN ('sent', 'accepted');
  
  IF v_existing_count > 0 THEN
    RETURN jsonb_build_object('success', false, 'reason', 'conflict', 'message', 'An active offer already exists for this match/talent');
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

-- 2. Create healthcheck_events RPC for admin health page
CREATE OR REPLACE FUNCTION public.healthcheck_events(p_minutes int DEFAULT 10)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cutoff timestamptz := now() - (p_minutes || ' minutes')::interval;
  v_activity_counts jsonb;
  v_notification_counts jsonb;
  v_offer_counts jsonb;
  v_duplicate_dedups jsonb;
BEGIN
  -- Count activity events by type in last N minutes
  SELECT COALESCE(
    jsonb_object_agg(event_type, cnt),
    '{}'::jsonb
  ) INTO v_activity_counts
  FROM (
    SELECT event_type, COUNT(*) as cnt
    FROM activity_events
    WHERE created_at > v_cutoff
    GROUP BY event_type
    ORDER BY cnt DESC
    LIMIT 10
  ) t;
  
  -- Count notifications by type in last N minutes
  SELECT COALESCE(
    jsonb_object_agg(notification_type, cnt),
    '{}'::jsonb
  ) INTO v_notification_counts
  FROM (
    SELECT notification_type, COUNT(*) as cnt
    FROM notifications
    WHERE created_at > v_cutoff
    GROUP BY notification_type
    ORDER BY cnt DESC
    LIMIT 10
  ) t;
  
  -- Count offers by status
  SELECT COALESCE(
    jsonb_object_agg(status, cnt),
    '{}'::jsonb
  ) INTO v_offer_counts
  FROM (
    SELECT status, COUNT(*) as cnt
    FROM offers
    GROUP BY status
  ) t;
  
  -- Check for any duplicate dedup_keys (should be 0 due to unique indexes)
  -- This is a sanity check
  SELECT COALESCE(
    jsonb_agg(jsonb_build_object('dedup_key', dedup_key, 'count', cnt)),
    '[]'::jsonb
  ) INTO v_duplicate_dedups
  FROM (
    SELECT dedup_key, COUNT(*) as cnt
    FROM activity_events
    WHERE dedup_key IS NOT NULL
      AND created_at > now() - interval '1 hour'
    GROUP BY dedup_key
    HAVING COUNT(*) > 1
    LIMIT 5
  ) t;
  
  RETURN jsonb_build_object(
    'minutes', p_minutes,
    'checked_at', now(),
    'activity_counts', v_activity_counts,
    'notification_counts', v_notification_counts,
    'offer_counts', v_offer_counts,
    'duplicate_dedups', v_duplicate_dedups,
    'duplicate_count', jsonb_array_length(v_duplicate_dedups)
  );
END;
$$;

-- 3. Create RPC to check offer conflict (dry-run for health check)
CREATE OR REPLACE FUNCTION public.check_offer_conflict(
  p_org_id uuid,
  p_talent_user_id uuid,
  p_match_id uuid DEFAULT NULL,
  p_listing_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_existing_count int;
BEGIN
  SELECT COUNT(*) INTO v_existing_count
  FROM offers
  WHERE org_id = p_org_id
    AND talent_user_id = p_talent_user_id
    AND (
      (p_match_id IS NOT NULL AND match_id = p_match_id) OR
      (p_listing_id IS NOT NULL AND listing_id = p_listing_id)
    )
    AND status IN ('sent', 'accepted');
  
  RETURN jsonb_build_object(
    'has_conflict', v_existing_count > 0,
    'conflict_count', v_existing_count
  );
END;
$$;