-- Allow authenticated users to create demo-flagged orgs
CREATE POLICY "Authenticated users can create demo orgs"
ON public.orgs
FOR INSERT
TO authenticated
WITH CHECK (is_demo = true);

-- Allow authenticated users to insert demo-flagged org_members for orgs they just created
CREATE POLICY "Authenticated users can join demo orgs"
ON public.org_members
FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.orgs WHERE id = org_id AND is_demo = true
  )
);

-- Allow authenticated users to read their own org_members rows
-- (the existing policy uses is_org_member which may fail for newly created orgs)
CREATE POLICY "Users can view own memberships"
ON public.org_members
FOR SELECT
TO authenticated
USING (user_id = auth.uid());