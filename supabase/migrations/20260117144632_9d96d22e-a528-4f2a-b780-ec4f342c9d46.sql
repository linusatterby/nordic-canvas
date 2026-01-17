-- RPC to reset demo data for a user (talent) without requiring org_id
CREATE OR REPLACE FUNCTION public.reset_demo_for_user()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id uuid;
  v_swipes_deleted int := 0;
  v_offers_deleted int := 0;
  v_messages_deleted int := 0;
BEGIN
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;
  
  -- Delete talent job swipes for demo jobs
  DELETE FROM public.talent_job_swipes
  WHERE talent_user_id = v_user_id
    AND job_post_id IN (SELECT id FROM public.job_posts WHERE is_demo = true);
  GET DIAGNOSTICS v_swipes_deleted = ROW_COUNT;
  
  -- Delete borrow offers for demo requests
  DELETE FROM public.borrow_offers
  WHERE talent_user_id = v_user_id
    AND borrow_request_id IN (SELECT id FROM public.borrow_requests WHERE is_demo = true);
  GET DIAGNOSTICS v_offers_deleted = ROW_COUNT;
  
  -- Delete messages from user in demo match threads
  DELETE FROM public.messages
  WHERE sender_user_id = v_user_id
    AND thread_id IN (
      SELECT t.id FROM public.threads t
      JOIN public.matches m ON m.id = t.match_id
      WHERE m.is_demo = true AND m.talent_user_id = v_user_id
    );
  GET DIAGNOSTICS v_messages_deleted = ROW_COUNT;
  
  -- Delete demo matches for this talent
  DELETE FROM public.threads
  WHERE match_id IN (
    SELECT id FROM public.matches 
    WHERE talent_user_id = v_user_id AND is_demo = true
  );
  
  DELETE FROM public.matches
  WHERE talent_user_id = v_user_id AND is_demo = true;
  
  RETURN jsonb_build_object(
    'success', true,
    'message', 'User demo data reset successfully',
    'swipes_deleted', v_swipes_deleted,
    'offers_deleted', v_offers_deleted,
    'messages_deleted', v_messages_deleted
  );
END;
$$;