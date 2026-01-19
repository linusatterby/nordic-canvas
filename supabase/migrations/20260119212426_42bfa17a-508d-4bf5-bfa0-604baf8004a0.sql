-- Create/replace reset_demo function to also clear employer_talent_swipes
CREATE OR REPLACE FUNCTION public.reset_demo(p_org_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_demo boolean;
  v_is_admin boolean;
  v_swipes_deleted int := 0;
  v_matches_deleted int := 0;
BEGIN
  -- Check if org exists and is a demo org
  SELECT is_demo INTO v_is_demo
  FROM orgs
  WHERE id = p_org_id;
  
  IF v_is_demo IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Organization not found');
  END IF;
  
  IF NOT v_is_demo THEN
    RETURN jsonb_build_object('success', false, 'error', 'Organization is not a demo org');
  END IF;
  
  -- Check if caller is admin of this org
  SELECT is_org_admin(p_org_id, auth.uid()) INTO v_is_admin;
  
  IF NOT v_is_admin THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authorized - must be org admin');
  END IF;
  
  -- Delete volatile demo data (in order due to FK constraints)
  
  -- Messages first (via threads)
  DELETE FROM messages
  WHERE thread_id IN (
    SELECT t.id FROM threads t
    JOIN matches m ON m.id = t.match_id
    WHERE m.org_id = p_org_id AND m.is_demo = true
  );
  
  -- Threads
  DELETE FROM threads
  WHERE match_id IN (
    SELECT id FROM matches WHERE org_id = p_org_id AND is_demo = true
  );
  
  -- Borrow offers (via requests)
  DELETE FROM borrow_offers
  WHERE borrow_request_id IN (
    SELECT id FROM borrow_requests WHERE org_id = p_org_id AND is_demo = true
  );
  
  -- Borrow requests
  DELETE FROM borrow_requests WHERE org_id = p_org_id AND is_demo = true;
  
  -- Shift bookings
  DELETE FROM shift_bookings WHERE org_id = p_org_id AND is_demo = true;
  
  -- Employer talent swipes for this org (targeting demo talents)
  DELETE FROM employer_talent_swipes 
  WHERE org_id = p_org_id
    AND talent_user_id IN (
      SELECT user_id FROM profiles WHERE is_demo = true
    );
  GET DIAGNOSTICS v_swipes_deleted = ROW_COUNT;
  
  -- Matches
  DELETE FROM matches WHERE org_id = p_org_id AND is_demo = true;
  GET DIAGNOSTICS v_matches_deleted = ROW_COUNT;
  
  RETURN jsonb_build_object(
    'success', true,
    'message', 'Demo data reset successfully',
    'org_id', p_org_id,
    'swipes_deleted', v_swipes_deleted,
    'matches_deleted', v_matches_deleted
  );
END;
$$;