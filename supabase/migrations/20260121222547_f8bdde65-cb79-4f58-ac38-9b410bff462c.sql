-- 1. Create a public view for demo orgs with limited columns
-- This view exposes only id, name, location for demo orgs
CREATE OR REPLACE VIEW public.demo_orgs_public AS
SELECT id, name, location
FROM public.orgs
WHERE is_demo = true;

-- 2. Grant SELECT on the view to authenticated users
GRANT SELECT ON public.demo_orgs_public TO authenticated;

-- 3. Comment for documentation
COMMENT ON VIEW public.demo_orgs_public IS 'Public view exposing limited demo org info (id, name, location only)';

-- Note: The existing "Anyone can view demo orgs" policy on orgs table is SELECT-only 
-- with `is_demo = true` which is correct. The view provides an additional layer
-- by limiting which columns are exposed.

-- 4. Verify demo_talent_cards policy is restricted (it already is - "Anyone can view demo cards" requires is_demo = true)
-- No changes needed - policy correctly uses: (is_demo = true)

-- 5. Verify job_posts policies
-- The "job_posts_select_published_or_demo" policy allows:
--   - Published jobs (status = 'published') - needed for talent job feed
--   - Demo jobs (is_demo = true) - needed for demo flow
-- This is correct behavior - talents SHOULD see published jobs.
-- Non-demo private jobs are protected by requiring org membership.

-- 6. Verify all demo_* tables have proper org_member restrictions
-- All demo tables already require is_org_member(auth.uid(), org_id) for access:
-- - demo_matches: ✓ org_member check
-- - demo_chat_threads: ✓ org_member check  
-- - demo_chat_messages: ✓ org_member check via thread lookup
-- - demo_shift_bookings: ✓ org_member check
-- - demo_release_offers: ✓ org_member check on from_org_id
-- - demo_talent_cards: ✓ read-only with is_demo check, no INSERT/UPDATE/DELETE

-- 7. Ensure demo_accounts is read-only for users
-- Already configured: users can only SELECT own demo status, no INSERT/UPDATE/DELETE