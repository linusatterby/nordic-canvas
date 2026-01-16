-- ============================================
-- Migration: Trusted Circles & Multi-Layer Pools
-- ============================================

-- 1) Add is_released column to shift_bookings
ALTER TABLE public.shift_bookings 
ADD COLUMN IF NOT EXISTS is_released boolean NOT NULL DEFAULT false;

-- 2) Circle Requests table
CREATE TABLE IF NOT EXISTS public.circle_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  from_org_id uuid NOT NULL REFERENCES public.orgs(id) ON DELETE CASCADE,
  to_org_id uuid NOT NULL REFERENCES public.orgs(id) ON DELETE CASCADE,
  created_by uuid NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(from_org_id, to_org_id),
  CONSTRAINT different_orgs CHECK (from_org_id != to_org_id)
);

CREATE INDEX IF NOT EXISTS idx_circle_requests_from_org ON public.circle_requests(from_org_id, status);
CREATE INDEX IF NOT EXISTS idx_circle_requests_to_org ON public.circle_requests(to_org_id, status);

-- Enable RLS
ALTER TABLE public.circle_requests ENABLE ROW LEVEL SECURITY;

-- RLS: Org admins can create requests from their org
CREATE POLICY "Org admins can create circle requests"
ON public.circle_requests FOR INSERT
WITH CHECK (
  is_org_admin(auth.uid(), from_org_id) 
  AND created_by = auth.uid()
);

-- RLS: Org admins can view requests they sent or received
CREATE POLICY "Org admins can view circle requests"
ON public.circle_requests FOR SELECT
USING (
  is_org_admin(auth.uid(), from_org_id) 
  OR is_org_admin(auth.uid(), to_org_id)
);

-- RLS: To-org admins can update (accept/decline)
CREATE POLICY "To-org admins can update circle requests"
ON public.circle_requests FOR UPDATE
USING (is_org_admin(auth.uid(), to_org_id) AND status = 'pending');

-- 3) Trusted Circle Links table (bidirectional, stored as min/max for uniqueness)
CREATE TABLE IF NOT EXISTS public.trusted_circle_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_a uuid NOT NULL REFERENCES public.orgs(id) ON DELETE CASCADE,
  org_b uuid NOT NULL REFERENCES public.orgs(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(org_a, org_b),
  CONSTRAINT ordered_orgs CHECK (org_a < org_b)
);

CREATE INDEX IF NOT EXISTS idx_trusted_circle_links_org_a ON public.trusted_circle_links(org_a);
CREATE INDEX IF NOT EXISTS idx_trusted_circle_links_org_b ON public.trusted_circle_links(org_b);

-- Enable RLS
ALTER TABLE public.trusted_circle_links ENABLE ROW LEVEL SECURITY;

-- RLS: Org members can view links involving their org
CREATE POLICY "Org members can view circle links"
ON public.trusted_circle_links FOR SELECT
USING (
  is_org_member(auth.uid(), org_a) 
  OR is_org_member(auth.uid(), org_b)
);

-- 4) Talent Visibility table
CREATE TABLE IF NOT EXISTS public.talent_visibility (
  talent_user_id uuid PRIMARY KEY,
  scope text NOT NULL DEFAULT 'public' CHECK (scope IN ('off', 'circle_only', 'public')),
  available_for_extra_hours boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.talent_visibility ENABLE ROW LEVEL SECURITY;

-- RLS: Talents can manage own visibility
CREATE POLICY "Talents can manage own visibility"
ON public.talent_visibility FOR ALL
USING (auth.uid() = talent_user_id)
WITH CHECK (auth.uid() = talent_user_id);

-- RLS: Employers can read visibility (for filtering)
CREATE POLICY "Employers can read talent visibility"
ON public.talent_visibility FOR SELECT
USING (true);

-- 5) Release Offers table
CREATE TABLE IF NOT EXISTS public.release_offers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES public.shift_bookings(id) ON DELETE CASCADE,
  from_org_id uuid NOT NULL REFERENCES public.orgs(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'taken', 'cancelled')),
  taken_by_org_id uuid REFERENCES public.orgs(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(booking_id)
);

CREATE INDEX IF NOT EXISTS idx_release_offers_from_org ON public.release_offers(from_org_id, status);
CREATE INDEX IF NOT EXISTS idx_release_offers_status ON public.release_offers(status);

-- Enable RLS
ALTER TABLE public.release_offers ENABLE ROW LEVEL SECURITY;

-- RLS: From-org can create release offers
CREATE POLICY "Org members can create release offers"
ON public.release_offers FOR INSERT
WITH CHECK (is_org_member(auth.uid(), from_org_id));

-- RLS: From-org can update (cancel) their offers
CREATE POLICY "From-org can update release offers"
ON public.release_offers FOR UPDATE
USING (is_org_member(auth.uid(), from_org_id));

-- RLS: Circle orgs can view open offers
CREATE POLICY "Circle orgs can view release offers"
ON public.release_offers FOR SELECT
USING (
  is_org_member(auth.uid(), from_org_id)
  OR (
    status = 'open' 
    AND EXISTS (
      SELECT 1 FROM public.trusted_circle_links tcl
      WHERE (tcl.org_a = from_org_id AND is_org_member(auth.uid(), tcl.org_b))
         OR (tcl.org_b = from_org_id AND is_org_member(auth.uid(), tcl.org_a))
    )
  )
);

-- 6) Helper function: Get trusted circle org IDs for an org
CREATE OR REPLACE FUNCTION public.get_trusted_circle_orgs(p_org_id uuid)
RETURNS TABLE(org_id uuid)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT org_b AS org_id FROM trusted_circle_links WHERE org_a = p_org_id
  UNION
  SELECT org_a AS org_id FROM trusted_circle_links WHERE org_b = p_org_id;
$$;

-- 7) RPC: Accept circle request (race-safe)
CREATE OR REPLACE FUNCTION public.accept_circle_request(p_request_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_request circle_requests%ROWTYPE;
  v_org_a uuid;
  v_org_b uuid;
BEGIN
  -- Lock and get the request
  SELECT * INTO v_request
  FROM circle_requests
  WHERE id = p_request_id
  FOR UPDATE;
  
  IF v_request IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Request not found');
  END IF;
  
  -- Check caller is admin of to_org
  IF NOT is_org_admin(auth.uid(), v_request.to_org_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authorized');
  END IF;
  
  -- Check request is still pending
  IF v_request.status != 'pending' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Request already processed');
  END IF;
  
  -- Update request status
  UPDATE circle_requests
  SET status = 'accepted'
  WHERE id = p_request_id;
  
  -- Create trusted circle link (ordered for uniqueness)
  v_org_a := LEAST(v_request.from_org_id, v_request.to_org_id);
  v_org_b := GREATEST(v_request.from_org_id, v_request.to_org_id);
  
  INSERT INTO trusted_circle_links (org_a, org_b)
  VALUES (v_org_a, v_org_b)
  ON CONFLICT (org_a, org_b) DO NOTHING;
  
  RETURN jsonb_build_object(
    'success', true,
    'message', 'Circle request accepted',
    'link_orgs', jsonb_build_array(v_org_a, v_org_b)
  );
END;
$$;

-- 8) RPC: Toggle talent circle visibility
CREATE OR REPLACE FUNCTION public.toggle_talent_circle_visibility(
  p_scope text,
  p_extra_hours boolean
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Validate scope
  IF p_scope NOT IN ('off', 'circle_only', 'public') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid scope');
  END IF;
  
  -- Upsert visibility
  INSERT INTO talent_visibility (talent_user_id, scope, available_for_extra_hours, updated_at)
  VALUES (auth.uid(), p_scope, p_extra_hours, now())
  ON CONFLICT (talent_user_id) DO UPDATE
  SET scope = EXCLUDED.scope,
      available_for_extra_hours = EXCLUDED.available_for_extra_hours,
      updated_at = now();
  
  RETURN jsonb_build_object(
    'success', true,
    'scope', p_scope,
    'available_for_extra_hours', p_extra_hours
  );
END;
$$;

-- 9) RPC: Take release offer (race-safe)
CREATE OR REPLACE FUNCTION public.take_release_offer(p_offer_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_offer release_offers%ROWTYPE;
  v_booking shift_bookings%ROWTYPE;
  v_taker_org_id uuid;
  v_new_booking_id uuid;
  v_is_in_circle boolean;
BEGIN
  -- Get taker's org (first org where user is member)
  SELECT org_id INTO v_taker_org_id
  FROM org_members
  WHERE user_id = auth.uid()
  LIMIT 1;
  
  IF v_taker_org_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'User not in any organization');
  END IF;
  
  -- Lock and get the offer
  SELECT * INTO v_offer
  FROM release_offers
  WHERE id = p_offer_id
  FOR UPDATE;
  
  IF v_offer IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Offer not found');
  END IF;
  
  -- Check offer is still open
  IF v_offer.status != 'open' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Offer no longer available');
  END IF;
  
  -- Check taker is in trusted circle with from_org
  SELECT EXISTS (
    SELECT 1 FROM trusted_circle_links tcl
    WHERE (tcl.org_a = v_offer.from_org_id AND tcl.org_b = v_taker_org_id)
       OR (tcl.org_b = v_offer.from_org_id AND tcl.org_a = v_taker_org_id)
  ) INTO v_is_in_circle;
  
  IF NOT v_is_in_circle THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not in trusted circle');
  END IF;
  
  -- Get original booking
  SELECT * INTO v_booking
  FROM shift_bookings
  WHERE id = v_offer.booking_id
  FOR UPDATE;
  
  IF v_booking IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Booking not found');
  END IF;
  
  -- Mark offer as taken
  UPDATE release_offers
  SET status = 'taken', taken_by_org_id = v_taker_org_id
  WHERE id = p_offer_id;
  
  -- Mark original booking as released
  UPDATE shift_bookings
  SET is_released = true
  WHERE id = v_booking.id;
  
  -- Create new booking for taker org
  INSERT INTO shift_bookings (org_id, talent_user_id, start_ts, end_ts, is_demo)
  VALUES (v_taker_org_id, v_booking.talent_user_id, v_booking.start_ts, v_booking.end_ts, v_booking.is_demo)
  RETURNING id INTO v_new_booking_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'new_booking_id', v_new_booking_id,
    'talent_user_id', v_booking.talent_user_id
  );
END;
$$;

-- 10) Updated find_available_talents with scope support
CREATE OR REPLACE FUNCTION public.find_available_talents_scoped(
  p_location text,
  p_start_ts timestamptz,
  p_end_ts timestamptz,
  p_scope text,
  p_requester_org_id uuid
)
RETURNS TABLE(user_id uuid, full_name text, legacy_score integer)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT
    p.user_id,
    p.full_name,
    COALESCE(tp.legacy_score_cached, 50) as legacy_score
  FROM profiles p
  LEFT JOIN talent_profiles tp ON tp.user_id = p.user_id
  LEFT JOIN talent_visibility tv ON tv.talent_user_id = p.user_id
  WHERE 
    p.type IN ('talent', 'both')
    -- Location match
    AND (
      LOWER(COALESCE(p.home_base, '')) LIKE '%' || LOWER(p_location) || '%'
      OR LOWER(COALESCE(tp.bio, '')) LIKE '%' || LOWER(p_location) || '%'
    )
    -- Has overlapping availability
    AND EXISTS (
      SELECT 1 FROM availability_blocks ab
      WHERE ab.user_id = p.user_id
        AND ab.start_date <= p_end_ts::date
        AND ab.end_date >= p_start_ts::date
    )
    -- No busy blocks in that range
    AND NOT EXISTS (
      SELECT 1 FROM talent_busy_blocks_public tbb
      WHERE tbb.talent_user_id = p.user_id
        AND tbb.start_ts < p_end_ts
        AND tbb.end_ts > p_start_ts
    )
    -- Scope-based filtering
    AND (
      CASE p_scope
        WHEN 'internal' THEN
          -- Only talents matched with requester org
          EXISTS (
            SELECT 1 FROM matches m 
            WHERE m.talent_user_id = p.user_id 
            AND m.org_id = p_requester_org_id
          )
        WHEN 'circle' THEN
          -- Talents matched with circle orgs + visible for extra hours
          COALESCE(tv.scope, 'public') IN ('circle_only', 'public')
          AND COALESCE(tv.available_for_extra_hours, false) = true
          AND EXISTS (
            SELECT 1 FROM matches m
            JOIN get_trusted_circle_orgs(p_requester_org_id) tco ON tco.org_id = m.org_id
            WHERE m.talent_user_id = p.user_id
          )
        WHEN 'local' THEN
          -- Public talents only
          COALESCE(tv.scope, 'public') = 'public'
        ELSE
          false
      END
    );
END;
$$;