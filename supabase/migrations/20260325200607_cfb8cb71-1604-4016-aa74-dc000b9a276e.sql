-- Internal communication groups per org
CREATE TABLE public.internal_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.orgs(id) ON DELETE CASCADE,
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Group membership
CREATE TABLE public.internal_group_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES public.internal_groups(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  added_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (group_id, user_id)
);

-- Messages from employer to staff
CREATE TABLE public.internal_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.orgs(id) ON DELETE CASCADE,
  sender_user_id uuid NOT NULL,
  title text NOT NULL,
  body text NOT NULL,
  target text NOT NULL DEFAULT 'all',
  is_important boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Junction: which groups a message targets
CREATE TABLE public.internal_message_groups (
  message_id uuid NOT NULL REFERENCES public.internal_messages(id) ON DELETE CASCADE,
  group_id uuid NOT NULL REFERENCES public.internal_groups(id) ON DELETE CASCADE,
  PRIMARY KEY (message_id, group_id)
);

-- RLS
ALTER TABLE public.internal_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.internal_group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.internal_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.internal_message_groups ENABLE ROW LEVEL SECURITY;

-- Groups: org members can read and create
CREATE POLICY "Org members can read groups"
  ON public.internal_groups FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.org_members om WHERE om.org_id = internal_groups.org_id AND om.user_id = auth.uid()));

CREATE POLICY "Org members can create groups"
  ON public.internal_groups FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.org_members om WHERE om.org_id = internal_groups.org_id AND om.user_id = auth.uid()));

-- Group members: readable by self or org admin
CREATE POLICY "Read group members"
  ON public.internal_group_members FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR EXISTS (SELECT 1 FROM public.internal_groups g JOIN public.org_members om ON om.org_id = g.org_id AND om.user_id = auth.uid() WHERE g.id = internal_group_members.group_id));

CREATE POLICY "Manage group members"
  ON public.internal_group_members FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.internal_groups g JOIN public.org_members om ON om.org_id = g.org_id AND om.user_id = auth.uid() WHERE g.id = internal_group_members.group_id));

CREATE POLICY "Remove group members"
  ON public.internal_group_members FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.internal_groups g JOIN public.org_members om ON om.org_id = g.org_id AND om.user_id = auth.uid() WHERE g.id = internal_group_members.group_id));

-- Messages: org members can read their org messages, staff see targeted
CREATE POLICY "Read messages"
  ON public.internal_messages FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.org_members om WHERE om.org_id = internal_messages.org_id AND om.user_id = auth.uid())
    OR (target = 'all')
    OR EXISTS (SELECT 1 FROM public.internal_message_groups img JOIN public.internal_group_members igm ON igm.group_id = img.group_id AND igm.user_id = auth.uid() WHERE img.message_id = internal_messages.id)
  );

CREATE POLICY "Create messages"
  ON public.internal_messages FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.org_members om WHERE om.org_id = internal_messages.org_id AND om.user_id = auth.uid()));

-- Message groups junction
CREATE POLICY "Read message groups"
  ON public.internal_message_groups FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.internal_messages m JOIN public.org_members om ON om.org_id = m.org_id AND om.user_id = auth.uid() WHERE m.id = internal_message_groups.message_id));

CREATE POLICY "Assign message groups"
  ON public.internal_message_groups FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.internal_messages m JOIN public.org_members om ON om.org_id = m.org_id AND om.user_id = auth.uid() WHERE m.id = internal_message_groups.message_id));