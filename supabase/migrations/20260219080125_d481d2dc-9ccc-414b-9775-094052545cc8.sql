
-- Employer outreach: requests sent TO candidates from their pool
-- These appear in the candidate's inbox as "Förfrågningar" and are NOT applications
CREATE TABLE public.employer_outreach (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL,
  talent_user_id uuid NOT NULL,
  sent_by uuid NOT NULL,
  message text,
  role_title text,
  location text,
  created_at timestamptz NOT NULL DEFAULT now(),
  status text NOT NULL DEFAULT 'pending',
  demo_session_id uuid
);

ALTER TABLE public.employer_outreach ENABLE ROW LEVEL SECURITY;

-- Employers can insert outreach for their org
CREATE POLICY "Org members can insert outreach"
  ON public.employer_outreach FOR INSERT
  WITH CHECK (is_org_member(auth.uid(), org_id) AND sent_by = auth.uid());

-- Employers can view outreach for their org
CREATE POLICY "Org members can view own org outreach"
  ON public.employer_outreach FOR SELECT
  USING (is_org_member(auth.uid(), org_id));

-- Candidates can view outreach sent to them
CREATE POLICY "Candidates can view own outreach"
  ON public.employer_outreach FOR SELECT
  USING (auth.uid() = talent_user_id);

-- No delete or update from client (status changes via RPC later if needed)
CREATE POLICY "No delete on outreach"
  ON public.employer_outreach FOR DELETE
  USING (false);

CREATE POLICY "No update on outreach"
  ON public.employer_outreach FOR UPDATE
  USING (false);

-- Demo session access
CREATE POLICY "demo_session_all"
  ON public.employer_outreach FOR ALL
  USING (demo_session_id IS NOT NULL AND demo_session_id = get_demo_session_id())
  WITH CHECK (demo_session_id IS NOT NULL AND demo_session_id = get_demo_session_id());

-- Index for candidate inbox queries
CREATE INDEX idx_employer_outreach_talent ON public.employer_outreach (talent_user_id, created_at DESC);
CREATE INDEX idx_employer_outreach_org ON public.employer_outreach (org_id);
