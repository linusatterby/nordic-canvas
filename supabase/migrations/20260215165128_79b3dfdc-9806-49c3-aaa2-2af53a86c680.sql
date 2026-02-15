-- Tighten demo_sessions: replace overly permissive ALL policy with scoped policies
-- The current "public_demo_sessions" allows ANY operation (including DELETE) for anon users.

-- Drop the overly broad ALL policy
DROP POLICY IF EXISTS "public_demo_sessions" ON public.demo_sessions;

-- Allow anonymous users to INSERT new demo sessions (required for demo flow)
CREATE POLICY "demo_sessions_insert"
  ON public.demo_sessions
  FOR INSERT
  WITH CHECK (true);

-- Allow anonymous users to SELECT demo sessions (required for session lookup)
CREATE POLICY "demo_sessions_select"
  ON public.demo_sessions
  FOR SELECT
  USING (true);

-- No UPDATE or DELETE from client side
-- Cleanup is handled by the demo-cleanup edge function using service_role