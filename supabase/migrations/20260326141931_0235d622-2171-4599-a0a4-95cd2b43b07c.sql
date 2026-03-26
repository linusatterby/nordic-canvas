
-- Onboarding items table
CREATE TABLE public.onboarding_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.orgs(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  content_type text NOT NULL DEFAULT 'document',
  content_url text,
  target text NOT NULL DEFAULT 'all',
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  is_demo boolean NOT NULL DEFAULT false
);

ALTER TABLE public.onboarding_items ENABLE ROW LEVEL SECURITY;

-- Org members can create onboarding items
CREATE POLICY "Org members can create onboarding items"
  ON public.onboarding_items FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM org_members om
    WHERE om.org_id = onboarding_items.org_id AND om.user_id = auth.uid()
  ));

-- Org members can read onboarding items (employer view)
CREATE POLICY "Org members can read all org onboarding items"
  ON public.onboarding_items FOR SELECT
  TO authenticated
  USING (is_org_member_norecurse(auth.uid(), org_id));

-- Staff can read items targeted to them (all or their groups)
-- We reuse the same select policy above since RLS is permissive OR; 
-- the org_member check covers both employer and staff in same org

-- Junction table for group targeting
CREATE TABLE public.onboarding_item_groups (
  item_id uuid NOT NULL REFERENCES public.onboarding_items(id) ON DELETE CASCADE,
  group_id uuid NOT NULL REFERENCES public.internal_groups(id) ON DELETE CASCADE,
  PRIMARY KEY (item_id, group_id)
);

ALTER TABLE public.onboarding_item_groups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Read onboarding item groups"
  ON public.onboarding_item_groups FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM onboarding_items oi
    JOIN org_members om ON om.org_id = oi.org_id AND om.user_id = auth.uid()
    WHERE oi.id = onboarding_item_groups.item_id
  ));

CREATE POLICY "Insert onboarding item groups"
  ON public.onboarding_item_groups FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM onboarding_items oi
    JOIN org_members om ON om.org_id = oi.org_id AND om.user_id = auth.uid()
    WHERE oi.id = onboarding_item_groups.item_id
  ));

-- Progress tracking per user
CREATE TABLE public.onboarding_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id uuid NOT NULL REFERENCES public.onboarding_items(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'not_started',
  completed_at timestamptz,
  UNIQUE (item_id, user_id)
);

ALTER TABLE public.onboarding_progress ENABLE ROW LEVEL SECURITY;

-- Users can manage their own progress
CREATE POLICY "Users can manage own onboarding progress"
  ON public.onboarding_progress FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Org members can view progress for their org's items
CREATE POLICY "Org members can view progress"
  ON public.onboarding_progress FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM onboarding_items oi
    JOIN org_members om ON om.org_id = oi.org_id AND om.user_id = auth.uid()
    WHERE oi.id = onboarding_progress.item_id
  ));

-- Security definer function to check if user should see an onboarding item
-- (target='all' OR user is member of a targeted group)
CREATE OR REPLACE FUNCTION public.is_onboarding_item_visible(p_user_id uuid, p_item_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM onboarding_items oi
    WHERE oi.id = p_item_id
      AND is_org_member_norecurse(p_user_id, oi.org_id)
      AND (
        oi.target = 'all'
        OR (oi.target = 'groups' AND EXISTS (
          SELECT 1 FROM onboarding_item_groups oig
          JOIN internal_group_members igm ON igm.group_id = oig.group_id
          WHERE oig.item_id = oi.id AND igm.user_id = p_user_id
        ))
      )
  )
$$;
