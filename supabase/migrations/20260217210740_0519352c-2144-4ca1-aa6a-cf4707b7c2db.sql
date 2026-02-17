
-- Demo inbox items: a single table for all talent inbox demo content
-- Avoids modifying production RLS on notifications/matches/offers/threads/borrow tables
CREATE TABLE public.demo_inbox_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tab text NOT NULL CHECK (tab IN ('notification', 'match', 'offer', 'message', 'request')),
  title text NOT NULL,
  body text,
  org_name text,
  status text,
  severity text DEFAULT 'info',
  metadata jsonb DEFAULT '{}',
  sort_order int DEFAULT 0,
  is_demo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.demo_inbox_items ENABLE ROW LEVEL SECURITY;

-- Anyone can read demo items (read-only, no auth required)
CREATE POLICY "Anyone can read demo inbox items"
  ON public.demo_inbox_items
  FOR SELECT
  USING (is_demo = true);

-- No client INSERT/UPDATE/DELETE - only service_role can seed
