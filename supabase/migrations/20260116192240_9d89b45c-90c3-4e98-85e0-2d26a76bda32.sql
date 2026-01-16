-- =============================================
-- Borrow Request System
-- =============================================

-- Borrow requests table
CREATE TABLE public.borrow_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.orgs(id) ON DELETE CASCADE,
  created_by uuid NOT NULL,
  location text NOT NULL,
  role_key text NOT NULL,
  start_ts timestamptz NOT NULL,
  end_ts timestamptz NOT NULL,
  message text,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'filled', 'closed')),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Borrow offers table (talent responses)
CREATE TABLE public.borrow_offers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  borrow_request_id uuid NOT NULL REFERENCES public.borrow_requests(id) ON DELETE CASCADE,
  talent_user_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
  responded_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (borrow_request_id, talent_user_id)
);

-- Indexes
CREATE INDEX idx_borrow_requests_location_role ON public.borrow_requests(location, role_key, start_ts);
CREATE INDEX idx_borrow_offers_talent_status ON public.borrow_offers(talent_user_id, status);
CREATE INDEX idx_borrow_offers_request ON public.borrow_offers(borrow_request_id);

-- Enable RLS
ALTER TABLE public.borrow_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.borrow_offers ENABLE ROW LEVEL SECURITY;

-- RLS Policies for borrow_requests
CREATE POLICY "Org members can view org borrow requests"
  ON public.borrow_requests FOR SELECT
  USING (public.is_org_member(auth.uid(), org_id));

CREATE POLICY "Org members can insert borrow requests"
  ON public.borrow_requests FOR INSERT
  WITH CHECK (public.is_org_member(auth.uid(), org_id) AND created_by = auth.uid());

CREATE POLICY "Org members can update org borrow requests"
  ON public.borrow_requests FOR UPDATE
  USING (public.is_org_member(auth.uid(), org_id));

CREATE POLICY "Org members can delete org borrow requests"
  ON public.borrow_requests FOR DELETE
  USING (public.is_org_member(auth.uid(), org_id));

-- Talents can view requests they have offers for
CREATE POLICY "Talents can view requests with their offers"
  ON public.borrow_requests FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.borrow_offers bo
    WHERE bo.borrow_request_id = id AND bo.talent_user_id = auth.uid()
  ));

-- RLS Policies for borrow_offers
CREATE POLICY "Talents can view own offers"
  ON public.borrow_offers FOR SELECT
  USING (talent_user_id = auth.uid());

CREATE POLICY "Talents can update own pending offers"
  ON public.borrow_offers FOR UPDATE
  USING (talent_user_id = auth.uid() AND status = 'pending');

CREATE POLICY "Org members can view offers for their requests"
  ON public.borrow_offers FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.borrow_requests br
    WHERE br.id = borrow_request_id AND public.is_org_member(auth.uid(), br.org_id)
  ));

CREATE POLICY "System can insert offers"
  ON public.borrow_offers FOR INSERT
  WITH CHECK (true);

-- =============================================
-- SQL Function: find_available_talents
-- Finds talents available for a borrow request
-- =============================================
CREATE OR REPLACE FUNCTION public.find_available_talents(
  p_location text,
  p_start_ts timestamptz,
  p_end_ts timestamptz
)
RETURNS TABLE (
  user_id uuid,
  full_name text,
  legacy_score integer
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT DISTINCT
    p.user_id,
    p.full_name,
    COALESCE(tp.legacy_score_cached, 50) as legacy_score
  FROM profiles p
  LEFT JOIN talent_profiles tp ON tp.user_id = p.user_id
  WHERE 
    p.type IN ('talent', 'both')
    -- Location match (case-insensitive contains)
    AND (
      LOWER(p.home_base) LIKE '%' || LOWER(p_location) || '%'
      OR LOWER(tp.bio) LIKE '%' || LOWER(p_location) || '%'
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
$$;

-- =============================================
-- SQL Function: accept_borrow_offer
-- Atomically accepts an offer, preventing race conditions
-- =============================================
CREATE OR REPLACE FUNCTION public.accept_borrow_offer(p_offer_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_offer borrow_offers%ROWTYPE;
  v_request borrow_requests%ROWTYPE;
  v_booking_id uuid;
  v_result jsonb;
BEGIN
  -- Lock and get the offer
  SELECT * INTO v_offer
  FROM borrow_offers
  WHERE id = p_offer_id
  FOR UPDATE;
  
  IF v_offer IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Offer not found');
  END IF;
  
  -- Check caller is the talent
  IF v_offer.talent_user_id != auth.uid() THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authorized');
  END IF;
  
  -- Check offer is still pending
  IF v_offer.status != 'pending' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Offer already responded');
  END IF;
  
  -- Lock and get the request
  SELECT * INTO v_request
  FROM borrow_requests
  WHERE id = v_offer.borrow_request_id
  FOR UPDATE;
  
  IF v_request IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Request not found');
  END IF;
  
  -- Check request is still open
  IF v_request.status != 'open' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Request already filled');
  END IF;
  
  -- Accept this offer
  UPDATE borrow_offers
  SET status = 'accepted', responded_at = now()
  WHERE id = p_offer_id;
  
  -- Decline all other pending offers for this request
  UPDATE borrow_offers
  SET status = 'declined', responded_at = now()
  WHERE borrow_request_id = v_request.id
    AND id != p_offer_id
    AND status = 'pending';
  
  -- Mark request as filled
  UPDATE borrow_requests
  SET status = 'filled'
  WHERE id = v_request.id;
  
  -- Create shift booking
  INSERT INTO shift_bookings (org_id, talent_user_id, start_ts, end_ts)
  VALUES (v_request.org_id, v_offer.talent_user_id, v_request.start_ts, v_request.end_ts)
  RETURNING id INTO v_booking_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'booking_id', v_booking_id,
    'request_id', v_request.id
  );
END;
$$;

-- =============================================
-- Realtime (defensive)
-- =============================================
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.borrow_requests;
EXCEPTION WHEN duplicate_object THEN
  NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.borrow_offers;
EXCEPTION WHEN duplicate_object THEN
  NULL;
END $$;