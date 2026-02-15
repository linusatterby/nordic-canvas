
-- ============================================================
-- SESSION-ISOLATED DEMO SYSTEM
-- Tables, columns, function, indexes, RLS policies
-- ============================================================

-- 1. demo_sessions table
CREATE TABLE IF NOT EXISTS public.demo_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  anon_user_id uuid,
  role text NOT NULL DEFAULT 'employer',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.demo_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public_demo_sessions" ON public.demo_sessions FOR ALL USING (true) WITH CHECK (true);

-- 2. Helper function: read demo session ID from request header
CREATE OR REPLACE FUNCTION public.get_demo_session_id()
RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT NULLIF(current_setting('request.headers', true)::json->>'x-demo-session', '')::uuid
$$;

-- 3. Add demo_session_id column to all demo-writable tables
ALTER TABLE public.orgs ADD COLUMN IF NOT EXISTS demo_session_id uuid;
ALTER TABLE public.org_members ADD COLUMN IF NOT EXISTS demo_session_id uuid;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS demo_session_id uuid;
ALTER TABLE public.talent_profiles ADD COLUMN IF NOT EXISTS demo_session_id uuid;
ALTER TABLE public.talent_visibility ADD COLUMN IF NOT EXISTS demo_session_id uuid;
ALTER TABLE public.job_posts ADD COLUMN IF NOT EXISTS demo_session_id uuid;
ALTER TABLE public.demo_matches ADD COLUMN IF NOT EXISTS demo_session_id uuid;
ALTER TABLE public.demo_chat_threads ADD COLUMN IF NOT EXISTS demo_session_id uuid;
ALTER TABLE public.demo_chat_messages ADD COLUMN IF NOT EXISTS demo_session_id uuid;
ALTER TABLE public.demo_shift_bookings ADD COLUMN IF NOT EXISTS demo_session_id uuid;
ALTER TABLE public.demo_release_offers ADD COLUMN IF NOT EXISTS demo_session_id uuid;
ALTER TABLE public.borrow_requests ADD COLUMN IF NOT EXISTS demo_session_id uuid;
ALTER TABLE public.borrow_offers ADD COLUMN IF NOT EXISTS demo_session_id uuid;
ALTER TABLE public.talent_job_swipes ADD COLUMN IF NOT EXISTS demo_session_id uuid;
ALTER TABLE public.employer_demo_talent_swipes ADD COLUMN IF NOT EXISTS demo_session_id uuid;
ALTER TABLE public.candidate_interactions ADD COLUMN IF NOT EXISTS demo_session_id uuid;

-- 4. Partial indexes for efficient cleanup queries
CREATE INDEX IF NOT EXISTS idx_demo_sessions_created ON public.demo_sessions(created_at);
CREATE INDEX IF NOT EXISTS idx_orgs_demo_sid ON public.orgs(demo_session_id, created_at) WHERE demo_session_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_org_members_demo_sid ON public.org_members(demo_session_id) WHERE demo_session_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_profiles_demo_sid ON public.profiles(demo_session_id) WHERE demo_session_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_talent_profiles_demo_sid ON public.talent_profiles(demo_session_id) WHERE demo_session_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_job_posts_demo_sid ON public.job_posts(demo_session_id) WHERE demo_session_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_demo_matches_demo_sid ON public.demo_matches(demo_session_id) WHERE demo_session_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_demo_chat_threads_demo_sid ON public.demo_chat_threads(demo_session_id) WHERE demo_session_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_demo_chat_msgs_demo_sid ON public.demo_chat_messages(demo_session_id) WHERE demo_session_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_demo_shift_bookings_demo_sid ON public.demo_shift_bookings(demo_session_id) WHERE demo_session_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_demo_release_offers_demo_sid ON public.demo_release_offers(demo_session_id) WHERE demo_session_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_borrow_requests_demo_sid ON public.borrow_requests(demo_session_id) WHERE demo_session_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_borrow_offers_demo_sid ON public.borrow_offers(demo_session_id) WHERE demo_session_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_talent_job_swipes_demo_sid ON public.talent_job_swipes(demo_session_id) WHERE demo_session_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_employer_demo_swipes_demo_sid ON public.employer_demo_talent_swipes(demo_session_id) WHERE demo_session_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_candidate_interactions_demo_sid ON public.candidate_interactions(demo_session_id) WHERE demo_session_id IS NOT NULL;

-- 5. PERMISSIVE RLS policies for demo session access
-- These grant access when demo_session_id matches the x-demo-session header.
-- Existing auth-based policies remain untouched for production data.

CREATE POLICY "demo_session_all" ON public.orgs FOR ALL
  USING (demo_session_id IS NOT NULL AND demo_session_id = get_demo_session_id())
  WITH CHECK (demo_session_id IS NOT NULL AND demo_session_id = get_demo_session_id());

CREATE POLICY "demo_session_all" ON public.org_members FOR ALL
  USING (demo_session_id IS NOT NULL AND demo_session_id = get_demo_session_id())
  WITH CHECK (demo_session_id IS NOT NULL AND demo_session_id = get_demo_session_id());

CREATE POLICY "demo_session_all" ON public.profiles FOR ALL
  USING (demo_session_id IS NOT NULL AND demo_session_id = get_demo_session_id())
  WITH CHECK (demo_session_id IS NOT NULL AND demo_session_id = get_demo_session_id());

CREATE POLICY "demo_session_all" ON public.talent_profiles FOR ALL
  USING (demo_session_id IS NOT NULL AND demo_session_id = get_demo_session_id())
  WITH CHECK (demo_session_id IS NOT NULL AND demo_session_id = get_demo_session_id());

CREATE POLICY "demo_session_all" ON public.talent_visibility FOR ALL
  USING (demo_session_id IS NOT NULL AND demo_session_id = get_demo_session_id())
  WITH CHECK (demo_session_id IS NOT NULL AND demo_session_id = get_demo_session_id());

CREATE POLICY "demo_session_all" ON public.job_posts FOR ALL
  USING (demo_session_id IS NOT NULL AND demo_session_id = get_demo_session_id())
  WITH CHECK (demo_session_id IS NOT NULL AND demo_session_id = get_demo_session_id());

CREATE POLICY "demo_session_all" ON public.demo_matches FOR ALL
  USING (demo_session_id IS NOT NULL AND demo_session_id = get_demo_session_id())
  WITH CHECK (demo_session_id IS NOT NULL AND demo_session_id = get_demo_session_id());

CREATE POLICY "demo_session_all" ON public.demo_chat_threads FOR ALL
  USING (demo_session_id IS NOT NULL AND demo_session_id = get_demo_session_id())
  WITH CHECK (demo_session_id IS NOT NULL AND demo_session_id = get_demo_session_id());

CREATE POLICY "demo_session_all" ON public.demo_chat_messages FOR ALL
  USING (demo_session_id IS NOT NULL AND demo_session_id = get_demo_session_id())
  WITH CHECK (demo_session_id IS NOT NULL AND demo_session_id = get_demo_session_id());

CREATE POLICY "demo_session_all" ON public.demo_shift_bookings FOR ALL
  USING (demo_session_id IS NOT NULL AND demo_session_id = get_demo_session_id())
  WITH CHECK (demo_session_id IS NOT NULL AND demo_session_id = get_demo_session_id());

CREATE POLICY "demo_session_all" ON public.demo_release_offers FOR ALL
  USING (demo_session_id IS NOT NULL AND demo_session_id = get_demo_session_id())
  WITH CHECK (demo_session_id IS NOT NULL AND demo_session_id = get_demo_session_id());

CREATE POLICY "demo_session_all" ON public.borrow_requests FOR ALL
  USING (demo_session_id IS NOT NULL AND demo_session_id = get_demo_session_id())
  WITH CHECK (demo_session_id IS NOT NULL AND demo_session_id = get_demo_session_id());

CREATE POLICY "demo_session_all" ON public.borrow_offers FOR ALL
  USING (demo_session_id IS NOT NULL AND demo_session_id = get_demo_session_id())
  WITH CHECK (demo_session_id IS NOT NULL AND demo_session_id = get_demo_session_id());

CREATE POLICY "demo_session_all" ON public.talent_job_swipes FOR ALL
  USING (demo_session_id IS NOT NULL AND demo_session_id = get_demo_session_id())
  WITH CHECK (demo_session_id IS NOT NULL AND demo_session_id = get_demo_session_id());

CREATE POLICY "demo_session_all" ON public.employer_demo_talent_swipes FOR ALL
  USING (demo_session_id IS NOT NULL AND demo_session_id = get_demo_session_id())
  WITH CHECK (demo_session_id IS NOT NULL AND demo_session_id = get_demo_session_id());

CREATE POLICY "demo_session_all" ON public.candidate_interactions FOR ALL
  USING (demo_session_id IS NOT NULL AND demo_session_id = get_demo_session_id())
  WITH CHECK (demo_session_id IS NOT NULL AND demo_session_id = get_demo_session_id());
