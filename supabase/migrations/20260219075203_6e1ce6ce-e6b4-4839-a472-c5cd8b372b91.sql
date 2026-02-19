
-- ============================================================
-- State machine tables: saved_jobs, job_dismissals, applications
-- ============================================================

-- 1. Saved jobs (SAVED state)
CREATE TABLE public.saved_jobs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  candidate_id UUID NOT NULL,
  job_id UUID NOT NULL REFERENCES public.job_posts(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  demo_session_id UUID,
  UNIQUE(candidate_id, job_id)
);

ALTER TABLE public.saved_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Candidates can manage own saved jobs"
  ON public.saved_jobs FOR ALL
  USING (auth.uid() = candidate_id)
  WITH CHECK (auth.uid() = candidate_id);

CREATE POLICY "demo_session_all"
  ON public.saved_jobs FOR ALL
  USING (demo_session_id IS NOT NULL AND demo_session_id = get_demo_session_id())
  WITH CHECK (demo_session_id IS NOT NULL AND demo_session_id = get_demo_session_id());

-- 2. Job dismissals (DISMISSED state)
CREATE TABLE public.job_dismissals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  candidate_id UUID NOT NULL,
  job_id UUID NOT NULL REFERENCES public.job_posts(id) ON DELETE CASCADE,
  dismissed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  demo_session_id UUID,
  UNIQUE(candidate_id, job_id)
);

ALTER TABLE public.job_dismissals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Candidates can manage own dismissals"
  ON public.job_dismissals FOR ALL
  USING (auth.uid() = candidate_id)
  WITH CHECK (auth.uid() = candidate_id);

CREATE POLICY "demo_session_all"
  ON public.job_dismissals FOR ALL
  USING (demo_session_id IS NOT NULL AND demo_session_id = get_demo_session_id())
  WITH CHECK (demo_session_id IS NOT NULL AND demo_session_id = get_demo_session_id());

-- 3. Applications (APPLIED state)
CREATE TABLE public.applications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  candidate_id UUID NOT NULL,
  job_id UUID NOT NULL REFERENCES public.job_posts(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'submitted',
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  demo_session_id UUID,
  UNIQUE(candidate_id, job_id)
);

ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;

-- Candidates can manage their own applications
CREATE POLICY "Candidates can view own applications"
  ON public.applications FOR SELECT
  USING (auth.uid() = candidate_id);

CREATE POLICY "Candidates can insert own applications"
  ON public.applications FOR INSERT
  WITH CHECK (auth.uid() = candidate_id);

CREATE POLICY "Candidates can update own applications"
  ON public.applications FOR UPDATE
  USING (auth.uid() = candidate_id);

-- Employers can view applications to their jobs (APPLIED only)
CREATE POLICY "Employers can view applications to their jobs"
  ON public.applications FOR SELECT
  USING (
    status = 'submitted' AND
    EXISTS (
      SELECT 1 FROM job_posts jp
      WHERE jp.id = applications.job_id
      AND is_org_member(auth.uid(), jp.org_id)
    )
  );

-- Demo session access
CREATE POLICY "demo_session_all"
  ON public.applications FOR ALL
  USING (demo_session_id IS NOT NULL AND demo_session_id = get_demo_session_id())
  WITH CHECK (demo_session_id IS NOT NULL AND demo_session_id = get_demo_session_id());

-- No deletes on applications (audit trail)
CREATE POLICY "No delete on applications"
  ON public.applications FOR DELETE
  USING (false);

-- Timestamp trigger for applications
CREATE TRIGGER update_applications_updated_at
  BEFORE UPDATE ON public.applications
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Indexes
CREATE INDEX idx_saved_jobs_candidate ON public.saved_jobs(candidate_id);
CREATE INDEX idx_saved_jobs_job ON public.saved_jobs(job_id);
CREATE INDEX idx_job_dismissals_candidate ON public.job_dismissals(candidate_id);
CREATE INDEX idx_applications_candidate ON public.applications(candidate_id);
CREATE INDEX idx_applications_job_status ON public.applications(job_id, status);
