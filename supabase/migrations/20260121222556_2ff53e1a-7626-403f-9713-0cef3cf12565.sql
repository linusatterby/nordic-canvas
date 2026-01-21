-- Fix: Recreate view with explicit SECURITY INVOKER to respect querying user's permissions
-- This ensures RLS policies of the underlying table are enforced for the querying user

DROP VIEW IF EXISTS public.demo_orgs_public;

CREATE VIEW public.demo_orgs_public 
WITH (security_invoker = true) AS
SELECT id, name, location
FROM public.orgs
WHERE is_demo = true;

-- Re-grant SELECT on the view to authenticated users
GRANT SELECT ON public.demo_orgs_public TO authenticated;

COMMENT ON VIEW public.demo_orgs_public IS 'Public view exposing limited demo org info. Uses SECURITY INVOKER to respect RLS.';