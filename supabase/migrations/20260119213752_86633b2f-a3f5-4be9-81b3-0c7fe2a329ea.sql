-- Drop and recreate reset_demo function with demo card swipes cleanup
DROP FUNCTION IF EXISTS public.reset_demo(uuid);

CREATE FUNCTION public.reset_demo(p_org_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result json;
BEGIN
  -- Clear employer talent swipes for this org (targeting real demo talents)
  DELETE FROM employer_talent_swipes
  WHERE org_id = p_org_id
    AND talent_user_id IN (
      SELECT user_id FROM profiles WHERE is_demo = true
    );

  -- Clear employer demo card swipes for this org
  DELETE FROM employer_demo_talent_swipes
  WHERE org_id = p_org_id;

  -- Clear borrow offers for this org's demo requests
  DELETE FROM borrow_offers
  WHERE borrow_request_id IN (
    SELECT id FROM borrow_requests WHERE org_id = p_org_id AND is_demo = true
  );

  -- Clear demo borrow requests for this org
  DELETE FROM borrow_requests
  WHERE org_id = p_org_id AND is_demo = true;

  -- Clear demo matches for this org
  DELETE FROM matches
  WHERE org_id = p_org_id AND is_demo = true;

  v_result := json_build_object(
    'success', true,
    'org_id', p_org_id
  );

  RETURN v_result;
END;
$$;