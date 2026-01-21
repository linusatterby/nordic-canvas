-- demo_email_allowlist has RLS enabled but no policies
-- This table should only be readable by service role (for auth triggers)
-- and not accessible by regular authenticated users

-- Add a restrictive policy that denies all access via client
-- (Only service_role/SECURITY DEFINER functions should access this table)
CREATE POLICY "No client access to allowlist"
ON public.demo_email_allowlist
FOR ALL
TO authenticated
USING (false)
WITH CHECK (false);

COMMENT ON TABLE public.demo_email_allowlist IS 'Demo email allowlist - only accessible via service role or SECURITY DEFINER functions';