-- Create SECURITY DEFINER function to check org membership without triggering RLS recursion
CREATE OR REPLACE FUNCTION public.is_org_member_norecurse(_user_id uuid, _org_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.org_members
    WHERE user_id = _user_id AND org_id = _org_id
  )
$$;

-- Create SECURITY DEFINER function to check internal group membership
CREATE OR REPLACE FUNCTION public.is_internal_group_member(_user_id uuid, _message_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.internal_message_groups img
    JOIN public.internal_group_members igm ON igm.group_id = img.group_id
    WHERE img.message_id = _message_id
      AND igm.user_id = _user_id
  )
$$;

-- Replace the recursive policy with one using SECURITY DEFINER functions
DROP POLICY IF EXISTS "Read messages" ON public.internal_messages;

CREATE POLICY "Read messages"
ON public.internal_messages
FOR SELECT
TO authenticated
USING (
  public.is_org_member_norecurse(auth.uid(), org_id)
  AND (
    target = 'all'
    OR (
      target = 'groups'
      AND public.is_internal_group_member(auth.uid(), id)
    )
  )
);