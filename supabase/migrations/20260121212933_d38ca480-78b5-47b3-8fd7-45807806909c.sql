-- First drop and recreate reset_demo function
DROP FUNCTION IF EXISTS public.reset_demo(uuid);

CREATE FUNCTION public.reset_demo(p_org_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_offers_deleted integer := 0;
  v_messages_deleted integer := 0;
  v_employer_swipes_deleted integer := 0;
  v_demo_card_swipes_deleted integer := 0;
  v_is_demo boolean;
BEGIN
  -- Check if org is demo
  SELECT is_demo INTO v_is_demo FROM orgs WHERE id = p_org_id;
  
  IF v_is_demo IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Org not found');
  END IF;
  
  IF NOT v_is_demo THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not a demo org');
  END IF;
  
  -- Check user is admin of this org
  IF NOT is_org_admin(auth.uid(), p_org_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authorized');
  END IF;

  -- Delete employer talent swipes for this org on demo jobs
  WITH deleted AS (
    DELETE FROM employer_talent_swipes ets
    WHERE ets.org_id = p_org_id
    AND EXISTS (
      SELECT 1 FROM job_posts jp 
      WHERE jp.id = ets.job_post_id AND jp.is_demo = true
    )
    RETURNING 1
  )
  SELECT count(*) INTO v_employer_swipes_deleted FROM deleted;

  -- Delete employer demo card swipes for this org
  WITH deleted AS (
    DELETE FROM employer_demo_talent_swipes
    WHERE org_id = p_org_id
    RETURNING 1
  )
  SELECT count(*) INTO v_demo_card_swipes_deleted FROM deleted;

  -- Delete borrow offers for this org's demo requests
  WITH deleted AS (
    DELETE FROM borrow_offers bo
    WHERE EXISTS (
      SELECT 1 FROM borrow_requests br 
      WHERE br.id = bo.borrow_request_id 
      AND br.org_id = p_org_id 
      AND br.is_demo = true
    )
    RETURNING 1
  )
  SELECT count(*) INTO v_offers_deleted FROM deleted;

  -- Delete messages in threads for demo matches
  WITH deleted AS (
    DELETE FROM messages m
    WHERE EXISTS (
      SELECT 1 FROM threads t
      JOIN matches ma ON ma.id = t.match_id
      WHERE t.id = m.thread_id
      AND ma.org_id = p_org_id
      AND ma.is_demo = true
    )
    RETURNING 1
  )
  SELECT count(*) INTO v_messages_deleted FROM deleted;

  RETURN jsonb_build_object(
    'success', true,
    'org_id', p_org_id,
    'employer_swipes_deleted', v_employer_swipes_deleted,
    'demo_card_swipes_deleted', v_demo_card_swipes_deleted,
    'offers_deleted', v_offers_deleted,
    'messages_deleted', v_messages_deleted
  );
END;
$$;