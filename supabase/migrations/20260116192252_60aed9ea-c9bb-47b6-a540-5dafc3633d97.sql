-- Fix the permissive INSERT policy for borrow_offers
-- Offers are created via the find_available_talents flow, so we restrict to self-insert
DROP POLICY IF EXISTS "System can insert offers" ON public.borrow_offers;

CREATE POLICY "Org members can insert offers for their requests"
  ON public.borrow_offers FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.borrow_requests br
      WHERE br.id = borrow_request_id 
        AND public.is_org_member(auth.uid(), br.org_id)
    )
  );