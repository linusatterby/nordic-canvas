-- ============================================
-- Migration: Demo Mode Infrastructure
-- Adds is_demo columns, indexes, and demo seed data
-- ============================================

-- 1) Add is_demo columns to relevant tables
ALTER TABLE public.orgs 
ADD COLUMN IF NOT EXISTS is_demo boolean NOT NULL DEFAULT false;

ALTER TABLE public.job_posts 
ADD COLUMN IF NOT EXISTS is_demo boolean NOT NULL DEFAULT false;

ALTER TABLE public.matches 
ADD COLUMN IF NOT EXISTS is_demo boolean NOT NULL DEFAULT false;

ALTER TABLE public.shift_bookings 
ADD COLUMN IF NOT EXISTS is_demo boolean NOT NULL DEFAULT false;

ALTER TABLE public.borrow_requests 
ADD COLUMN IF NOT EXISTS is_demo boolean NOT NULL DEFAULT false;

ALTER TABLE public.housing_listings 
ADD COLUMN IF NOT EXISTS is_demo boolean NOT NULL DEFAULT false;

-- 2) Create indexes for demo data filtering
CREATE INDEX IF NOT EXISTS idx_orgs_is_demo ON public.orgs(is_demo);
CREATE INDEX IF NOT EXISTS idx_job_posts_is_demo_status ON public.job_posts(is_demo, status);
CREATE INDEX IF NOT EXISTS idx_matches_is_demo_org ON public.matches(is_demo, org_id);
CREATE INDEX IF NOT EXISTS idx_shift_bookings_is_demo_org_start ON public.shift_bookings(is_demo, org_id, start_ts);
CREATE INDEX IF NOT EXISTS idx_borrow_requests_is_demo_org_created ON public.borrow_requests(is_demo, org_id, created_at);
CREATE INDEX IF NOT EXISTS idx_housing_listings_is_demo ON public.housing_listings(is_demo);

-- 3) Create reset_demo function
-- This function clears and re-seeds demo data for a specific org
-- Only org admins of demo orgs can call this
CREATE OR REPLACE FUNCTION public.reset_demo(p_org_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_demo boolean;
  v_is_admin boolean;
  v_count_deleted int := 0;
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
  SELECT is_org_admin(auth.uid(), p_org_id) INTO v_is_admin;
  
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
  GET DIAGNOSTICS v_count_deleted = ROW_COUNT;
  
  -- Shift bookings
  DELETE FROM shift_bookings WHERE org_id = p_org_id AND is_demo = true;
  
  -- Matches
  DELETE FROM matches WHERE org_id = p_org_id AND is_demo = true;
  
  RETURN jsonb_build_object(
    'success', true,
    'message', 'Demo data reset successfully',
    'org_id', p_org_id
  );
END;
$$;

-- 4) Update existing demo orgs to have is_demo = true
UPDATE public.orgs
SET is_demo = true
WHERE name ILIKE '%Demo%' OR name ILIKE '%Visby%' OR name ILIKE '%Kneippbyn%';

-- 5) Update job_posts for demo orgs
UPDATE public.job_posts jp
SET is_demo = true
WHERE EXISTS (
  SELECT 1 FROM orgs o WHERE o.id = jp.org_id AND o.is_demo = true
);

-- 6) Update matches for demo orgs
UPDATE public.matches m
SET is_demo = true
WHERE EXISTS (
  SELECT 1 FROM orgs o WHERE o.id = m.org_id AND o.is_demo = true
);

-- 7) Update shift_bookings for demo orgs
UPDATE public.shift_bookings sb
SET is_demo = true
WHERE EXISTS (
  SELECT 1 FROM orgs o WHERE o.id = sb.org_id AND o.is_demo = true
);

-- 8) Update borrow_requests for demo orgs
UPDATE public.borrow_requests br
SET is_demo = true
WHERE EXISTS (
  SELECT 1 FROM orgs o WHERE o.id = br.org_id AND o.is_demo = true
);