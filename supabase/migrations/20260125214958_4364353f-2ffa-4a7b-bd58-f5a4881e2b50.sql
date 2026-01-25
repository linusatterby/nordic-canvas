-- Host/Boende v0: RPCs and policies (Part 2)

CREATE OR REPLACE FUNCTION public.create_housing_inquiry(p_housing_listing_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_user_id uuid := auth.uid(); v_listing record; v_profile record;
  v_is_verified boolean; v_thread_id uuid; v_existing_thread_id uuid;
BEGIN
  IF v_user_id IS NULL THEN RETURN jsonb_build_object('success', false, 'reason', 'not_authenticated'); END IF;
  SELECT * INTO v_listing FROM job_posts WHERE id = p_housing_listing_id AND listing_type = 'housing' AND (status = 'published' OR is_demo = true);
  IF v_listing IS NULL THEN RETURN jsonb_build_object('success', false, 'reason', 'listing_not_found'); END IF;
  IF v_listing.host_user_id = v_user_id THEN RETURN jsonb_build_object('success', false, 'reason', 'cannot_contact_own_listing'); END IF;
  SELECT * INTO v_profile FROM profiles WHERE user_id = v_user_id;
  v_is_verified := is_verified_tenant(v_user_id);
  IF NOT v_is_verified THEN RETURN jsonb_build_object('success', false, 'reason', 'not_verified_tenant'); END IF;
  SELECT id INTO v_existing_thread_id FROM threads WHERE thread_type = 'housing' AND housing_listing_id = p_housing_listing_id AND host_user_id = v_listing.host_user_id AND talent_user_id = v_user_id;
  IF v_existing_thread_id IS NOT NULL THEN RETURN jsonb_build_object('success', true, 'thread_id', v_existing_thread_id, 'is_new', false); END IF;
  INSERT INTO threads (thread_type, housing_listing_id, host_user_id, talent_user_id) VALUES ('housing', p_housing_listing_id, v_listing.host_user_id, v_user_id) RETURNING id INTO v_thread_id;
  PERFORM create_notification(p_recipient_user_id := v_listing.host_user_id, p_notification_type := 'housing_inquiry', p_entity_type := 'housing_thread', p_entity_id := v_thread_id, p_title := 'Ny boendeförfrågan', p_body := coalesce(v_profile.full_name, 'En talang') || ' vill veta mer om ditt boende.', p_href := '/host/inbox?threadId=' || v_thread_id::text, p_severity := 'info');
  RETURN jsonb_build_object('success', true, 'thread_id', v_thread_id, 'is_new', true);
END; $$;

CREATE OR REPLACE FUNCTION public.list_host_housing_threads()
RETURNS TABLE (thread_id uuid, housing_listing_id uuid, talent_user_id uuid, talent_name text, listing_title text, listing_location text, last_message_at timestamptz, unread_count bigint)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_user_id uuid := auth.uid();
BEGIN IF v_user_id IS NULL THEN RETURN; END IF;
RETURN QUERY SELECT t.id, t.housing_listing_id, t.talent_user_id, p.full_name, j.title, j.location, (SELECT MAX(m.created_at) FROM messages m WHERE m.thread_id = t.id), 0::bigint FROM threads t LEFT JOIN profiles p ON p.user_id = t.talent_user_id LEFT JOIN job_posts j ON j.id = t.housing_listing_id WHERE t.thread_type = 'housing' AND t.host_user_id = v_user_id ORDER BY 7 DESC NULLS LAST;
END; $$;

CREATE OR REPLACE FUNCTION public.list_talent_housing_threads()
RETURNS TABLE (thread_id uuid, housing_listing_id uuid, host_user_id uuid, host_name text, listing_title text, listing_location text, rent_per_month numeric, last_message_at timestamptz)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_user_id uuid := auth.uid();
BEGIN IF v_user_id IS NULL THEN RETURN; END IF;
RETURN QUERY SELECT t.id, t.housing_listing_id, t.host_user_id, p.full_name, j.title, j.location, j.rent_per_month, (SELECT MAX(m.created_at) FROM messages m WHERE m.thread_id = t.id) FROM threads t LEFT JOIN profiles p ON p.user_id = t.host_user_id LEFT JOIN job_posts j ON j.id = t.housing_listing_id WHERE t.thread_type = 'housing' AND t.talent_user_id = v_user_id ORDER BY 8 DESC NULLS LAST;
END; $$;

CREATE OR REPLACE FUNCTION public.has_thread_access(_user_id uuid, _thread_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
SELECT EXISTS (SELECT 1 FROM threads t LEFT JOIN matches m ON t.match_id = m.id WHERE t.id = _thread_id AND ((t.thread_type = 'match' AND (m.talent_user_id = _user_id OR is_org_member(_user_id, m.org_id))) OR (t.thread_type = 'housing' AND (t.host_user_id = _user_id OR t.talent_user_id = _user_id))));
$$;

DROP POLICY IF EXISTS "Thread participants can view housing threads" ON public.threads;
CREATE POLICY "Thread participants can view housing threads" ON public.threads FOR SELECT USING (thread_type = 'housing' AND (host_user_id = auth.uid() OR talent_user_id = auth.uid()));

DROP POLICY IF EXISTS "Hosts can manage own housing listings" ON public.job_posts;
CREATE POLICY "Hosts can manage own housing listings" ON public.job_posts FOR ALL USING (listing_type = 'housing' AND host_user_id = auth.uid()) WITH CHECK (listing_type = 'housing' AND host_user_id = auth.uid());

DROP POLICY IF EXISTS "All can view published housing" ON public.job_posts;
CREATE POLICY "All can view published housing" ON public.job_posts FOR SELECT USING (listing_type = 'housing' AND (status = 'published' OR is_demo = true));