
-- Fix: scope target='all' to org membership and tighten group check
DROP POLICY IF EXISTS "Read messages" ON public.internal_messages;

CREATE POLICY "Read messages"
ON public.internal_messages
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM org_members om
    WHERE om.org_id = internal_messages.org_id
      AND om.user_id = auth.uid()
  )
  AND (
    target = 'all'
    OR EXISTS (
      SELECT 1
      FROM internal_message_groups img
      JOIN internal_group_members igm ON igm.group_id = img.group_id
      WHERE img.message_id = internal_messages.id
        AND igm.user_id = auth.uid()
    )
  )
);
