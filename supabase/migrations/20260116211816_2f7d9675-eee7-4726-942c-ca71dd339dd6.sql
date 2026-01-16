-- Migration: Fix trusted_circle_links normalization + add constraints + partner lookup RPC

-- 1.1 Normalize existing links to ordered pairs (org_a < org_b)
UPDATE trusted_circle_links
SET
  org_a = LEAST(org_a, org_b),
  org_b = GREATEST(org_a, org_b);

-- 1.2 Remove duplicates that may have appeared after normalization (keep lowest id)
DELETE FROM trusted_circle_links t
USING trusted_circle_links t2
WHERE t.id > t2.id
  AND t.org_a = t2.org_a
  AND t.org_b = t2.org_b;

-- 1.3 Add check constraint to ensure org_a < org_b always
ALTER TABLE trusted_circle_links
ADD CONSTRAINT trusted_circle_links_ordered_pair CHECK (org_a < org_b);

-- 1.4 Add unique constraint on (org_a, org_b) to prevent future duplicates
ALTER TABLE trusted_circle_links
ADD CONSTRAINT trusted_circle_links_unique_pair UNIQUE (org_a, org_b);

-- 1.5 Update accept_circle_request RPC to always use ordered pairs
CREATE OR REPLACE FUNCTION public.accept_circle_request(p_request_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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
  
  -- Create trusted circle link with ORDERED PAIR (org_a < org_b)
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
$function$;

-- 1.6 Create RPC to get circle partners with names (SECURITY DEFINER to bypass RLS)
CREATE OR REPLACE FUNCTION public.get_circle_partners(p_org_id uuid)
RETURNS TABLE(partner_org_id uuid, partner_org_name text, partner_location text)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Verify caller is member of the requesting org
  IF NOT is_org_member(auth.uid(), p_org_id) THEN
    RETURN; -- Return empty set if not authorized
  END IF;
  
  RETURN QUERY
  SELECT DISTINCT
    CASE 
      WHEN tcl.org_a = p_org_id THEN tcl.org_b
      ELSE tcl.org_a
    END AS partner_org_id,
    o.name AS partner_org_name,
    o.location AS partner_location
  FROM trusted_circle_links tcl
  JOIN orgs o ON o.id = CASE 
    WHEN tcl.org_a = p_org_id THEN tcl.org_b
    ELSE tcl.org_a
  END
  WHERE tcl.org_a = p_org_id OR tcl.org_b = p_org_id;
END;
$function$;