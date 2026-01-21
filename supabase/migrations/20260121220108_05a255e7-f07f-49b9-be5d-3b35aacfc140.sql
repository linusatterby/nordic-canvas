-- Add RLS policy on orgs to allow viewing demo orgs
-- This enables users to see demo job organization names even when not a member

CREATE POLICY "Anyone can view demo orgs" 
ON public.orgs 
FOR SELECT 
USING (is_demo = true);