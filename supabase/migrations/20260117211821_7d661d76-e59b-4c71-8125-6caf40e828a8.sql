-- Fix job_posts SELECT policies: change from RESTRICTIVE to PERMISSIVE
-- so talents can see published/demo jobs without being org members

-- Drop existing restrictive SELECT policies
DROP POLICY IF EXISTS "Org members can view own org jobs" ON public.job_posts;
DROP POLICY IF EXISTS "Talents can view published jobs" ON public.job_posts;

-- Create PERMISSIVE SELECT policies (any matching policy grants access)

-- Policy 1: Org members can view all their org's jobs (any status)
CREATE POLICY "Org members can view own org jobs"
ON public.job_posts
FOR SELECT
TO authenticated
USING (is_org_member(auth.uid(), org_id));

-- Policy 2: Anyone authenticated can view published jobs OR demo jobs
CREATE POLICY "Anyone can view published or demo jobs"
ON public.job_posts
FOR SELECT
TO authenticated
USING (status = 'published' OR is_demo = true);