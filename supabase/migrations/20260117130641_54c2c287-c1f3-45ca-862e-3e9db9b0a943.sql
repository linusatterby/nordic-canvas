-- ============================================
-- Migration: Multiple Trusted Circles
-- ============================================

-- 1.1 Create circles table
CREATE TABLE public.circles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_org_id uuid NOT NULL REFERENCES public.orgs(id) ON DELETE CASCADE,
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(owner_org_id, name)
);

-- 1.2 Create circle_members table
CREATE TABLE public.circle_members (
  circle_id uuid NOT NULL REFERENCES public.circles(id) ON DELETE CASCADE,
  member_org_id uuid NOT NULL REFERENCES public.orgs(id) ON DELETE CASCADE,
  added_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (circle_id, member_org_id)
);

-- 1.3 Add circle_id to borrow_requests
ALTER TABLE public.borrow_requests
  ADD COLUMN circle_id uuid REFERENCES public.circles(id);

-- 1.4 Scope-based constraint for borrow_requests
-- If scope='circle' then circle_id must be set, otherwise must be null
-- We use message column to store scope info (prefixed with [scope]) for now
-- Adding a scope column for proper enforcement
ALTER TABLE public.borrow_requests
  ADD COLUMN scope text NOT NULL DEFAULT 'local';

-- Constraint: circle_id required when scope='circle', null otherwise
ALTER TABLE public.borrow_requests
  ADD CONSTRAINT borrow_requests_circle_scope_check
  CHECK (
    (scope = 'circle' AND circle_id IS NOT NULL) OR
    (scope != 'circle' AND circle_id IS NULL)
  );

-- ============================================
-- RLS Policies for circles and circle_members
-- (We use SECURITY DEFINER RPCs for most operations,
-- but add basic RLS for direct queries if needed)
-- ============================================

ALTER TABLE public.circles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.circle_members ENABLE ROW LEVEL SECURITY;

-- Only org members can view their org's circles
CREATE POLICY "Org members can view own circles"
  ON public.circles FOR SELECT
  USING (is_org_member(auth.uid(), owner_org_id));

-- Only org admins can manage circles
CREATE POLICY "Org admins can manage circles"
  ON public.circles FOR ALL
  USING (is_org_admin(auth.uid(), owner_org_id))
  WITH CHECK (is_org_admin(auth.uid(), owner_org_id));

-- View circle members for own org's circles
CREATE POLICY "Org members can view circle members"
  ON public.circle_members FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM circles c 
    WHERE c.id = circle_members.circle_id 
    AND is_org_member(auth.uid(), c.owner_org_id)
  ));

-- Admins can manage circle members
CREATE POLICY "Org admins can manage circle members"
  ON public.circle_members FOR ALL
  USING (EXISTS (
    SELECT 1 FROM circles c 
    WHERE c.id = circle_members.circle_id 
    AND is_org_admin(auth.uid(), c.owner_org_id)
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM circles c 
    WHERE c.id = circle_members.circle_id 
    AND is_org_admin(auth.uid(), c.owner_org_id)
  ));

-- ============================================
-- RPC: Get my circles (with member count)
-- ============================================

CREATE OR REPLACE FUNCTION public.get_my_circles(p_org_id uuid)
RETURNS TABLE(circle_id uuid, name text, member_count bigint)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verify caller is org member
  IF NOT is_org_member(auth.uid(), p_org_id) THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT 
    c.id as circle_id,
    c.name,
    COALESCE(COUNT(cm.member_org_id), 0) as member_count
  FROM circles c
  LEFT JOIN circle_members cm ON cm.circle_id = c.id
  WHERE c.owner_org_id = p_org_id
  GROUP BY c.id, c.name
  ORDER BY c.name;
END;
$$;

-- ============================================
-- RPC: Get circle members (with org details)
-- ============================================

CREATE OR REPLACE FUNCTION public.get_circle_members(p_circle_id uuid)
RETURNS TABLE(org_id uuid, org_name text, org_location text)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_owner_org_id uuid;
BEGIN
  -- Get owner org and verify caller has access
  SELECT owner_org_id INTO v_owner_org_id
  FROM circles WHERE id = p_circle_id;
  
  IF v_owner_org_id IS NULL OR NOT is_org_member(auth.uid(), v_owner_org_id) THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT 
    o.id as org_id,
    o.name as org_name,
    o.location as org_location
  FROM circle_members cm
  JOIN orgs o ON o.id = cm.member_org_id
  WHERE cm.circle_id = p_circle_id
  ORDER BY o.name;
END;
$$;

-- ============================================
-- RPC: Create circle
-- ============================================

CREATE OR REPLACE FUNCTION public.create_circle(p_org_id uuid, p_name text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_circle_id uuid;
BEGIN
  -- Verify caller is org admin
  IF NOT is_org_admin(auth.uid(), p_org_id) THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;

  INSERT INTO circles (owner_org_id, name)
  VALUES (p_org_id, p_name)
  ON CONFLICT (owner_org_id, name) DO NOTHING
  RETURNING id INTO v_circle_id;

  -- If conflict, get existing
  IF v_circle_id IS NULL THEN
    SELECT id INTO v_circle_id
    FROM circles
    WHERE owner_org_id = p_org_id AND name = p_name;
  END IF;

  RETURN v_circle_id;
END;
$$;

-- ============================================
-- RPC: Add circle member
-- ============================================

CREATE OR REPLACE FUNCTION public.add_circle_member(p_circle_id uuid, p_member_org_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_owner_org_id uuid;
BEGIN
  -- Get owner org
  SELECT owner_org_id INTO v_owner_org_id
  FROM circles WHERE id = p_circle_id;
  
  -- Verify caller is org admin
  IF v_owner_org_id IS NULL OR NOT is_org_admin(auth.uid(), v_owner_org_id) THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;

  -- Verify member_org is a trusted partner (in trusted_circle_links)
  IF NOT EXISTS (
    SELECT 1 FROM trusted_circle_links tcl
    WHERE (tcl.org_a = v_owner_org_id AND tcl.org_b = p_member_org_id)
       OR (tcl.org_b = v_owner_org_id AND tcl.org_a = p_member_org_id)
  ) THEN
    RAISE EXCEPTION 'Org is not a trusted partner. Invite them first.';
  END IF;

  -- Add member (idempotent)
  INSERT INTO circle_members (circle_id, member_org_id)
  VALUES (p_circle_id, p_member_org_id)
  ON CONFLICT (circle_id, member_org_id) DO NOTHING;
END;
$$;

-- ============================================
-- RPC: Remove circle member
-- ============================================

CREATE OR REPLACE FUNCTION public.remove_circle_member(p_circle_id uuid, p_member_org_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_owner_org_id uuid;
BEGIN
  -- Get owner org
  SELECT owner_org_id INTO v_owner_org_id
  FROM circles WHERE id = p_circle_id;
  
  -- Verify caller is org admin
  IF v_owner_org_id IS NULL OR NOT is_org_admin(auth.uid(), v_owner_org_id) THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;

  DELETE FROM circle_members
  WHERE circle_id = p_circle_id AND member_org_id = p_member_org_id;
END;
$$;

-- ============================================
-- Update find_available_talents_scoped to support circle_id
-- ============================================

DROP FUNCTION IF EXISTS public.find_available_talents_scoped(text, timestamptz, timestamptz, text, uuid);

CREATE OR REPLACE FUNCTION public.find_available_talents_scoped(
  p_location text,
  p_start_ts timestamptz,
  p_end_ts timestamptz,
  p_scope text,
  p_requester_org_id uuid,
  p_circle_id uuid DEFAULT NULL
)
RETURNS TABLE(user_id uuid, full_name text, legacy_score integer)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_owner_org_id uuid;
BEGIN
  -- For circle scope, validate circle_id
  IF p_scope = 'circle' THEN
    IF p_circle_id IS NULL THEN
      -- Return empty if no circle specified
      RETURN;
    END IF;
    
    -- Verify requester owns the circle
    SELECT owner_org_id INTO v_owner_org_id
    FROM circles WHERE id = p_circle_id;
    
    IF v_owner_org_id IS NULL OR v_owner_org_id != p_requester_org_id THEN
      RETURN;
    END IF;
  END IF;

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
          -- Talents matched with orgs in the specific circle + visible for extra hours
          COALESCE(tv.scope, 'public') IN ('circle_only', 'public')
          AND COALESCE(tv.available_for_extra_hours, false) = true
          AND EXISTS (
            SELECT 1 FROM matches m
            WHERE m.talent_user_id = p.user_id
            AND (
              -- Match with circle members
              m.org_id IN (SELECT cm.member_org_id FROM circle_members cm WHERE cm.circle_id = p_circle_id)
              -- Or match with owner org (implicit member)
              OR m.org_id = p_requester_org_id
            )
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