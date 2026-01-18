-- Ensure RLS is enabled (already is, but be explicit)
ALTER TABLE public.job_posts ENABLE ROW LEVEL SECURITY;

-- Drop any conflicting policies if they exist (safe cleanup)
DROP POLICY IF EXISTS "job_posts_select_published" ON public.job_posts;
DROP POLICY IF EXISTS "job_posts_select_published_or_demo" ON public.job_posts;
DROP POLICY IF EXISTS "Anyone can view published or demo jobs" ON public.job_posts;
DROP POLICY IF EXISTS "Org members can view own org jobs" ON public.job_posts;

-- Create SELECT policy for authenticated users to view published or demo jobs
CREATE POLICY "job_posts_select_published_or_demo"
ON public.job_posts
FOR SELECT
TO authenticated
USING (
  (status = 'published')
  OR (is_demo = true)
);

-- Keep org members able to see all their org's jobs (including drafts)
CREATE POLICY "job_posts_org_members_full_access"
ON public.job_posts
FOR SELECT
TO authenticated
USING (
  is_org_member(auth.uid(), org_id)
);

-- Org members can INSERT jobs
CREATE POLICY "job_posts_org_insert"
ON public.job_posts
FOR INSERT
TO authenticated
WITH CHECK (
  is_org_member(auth.uid(), org_id)
);

-- Org members can UPDATE their org's jobs
CREATE POLICY "job_posts_org_update"
ON public.job_posts
FOR UPDATE
TO authenticated
USING (is_org_member(auth.uid(), org_id))
WITH CHECK (is_org_member(auth.uid(), org_id));

-- Org members can DELETE their org's jobs
CREATE POLICY "job_posts_org_delete"
ON public.job_posts
FOR DELETE
TO authenticated
USING (is_org_member(auth.uid(), org_id));