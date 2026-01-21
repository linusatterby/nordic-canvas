-- 1. Add UNIQUE constraint on employer_talent_swipes for real talents
ALTER TABLE public.employer_talent_swipes
ADD CONSTRAINT employer_talent_swipes_unique_swipe 
UNIQUE (org_id, job_post_id, talent_user_id);

-- 2. Create employer_demo_talent_swipes table for demo card swipes if not exists
CREATE TABLE IF NOT EXISTS public.employer_demo_talent_swipes (
  org_id uuid NOT NULL,
  job_post_id uuid NOT NULL,
  demo_card_id uuid NOT NULL,
  swiper_user_id uuid NOT NULL,
  direction text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (org_id, job_post_id, demo_card_id)
);

-- 3. Enable RLS on demo swipes table
ALTER TABLE public.employer_demo_talent_swipes ENABLE ROW LEVEL SECURITY;

-- 4. Create policies for demo swipes table
CREATE POLICY "Org members can insert demo swipes"
ON public.employer_demo_talent_swipes
FOR INSERT
WITH CHECK (is_org_member(auth.uid(), org_id) AND swiper_user_id = auth.uid());

CREATE POLICY "Org members can view demo swipes"
ON public.employer_demo_talent_swipes
FOR SELECT
USING (is_org_member(auth.uid(), org_id));

CREATE POLICY "Org members can update demo swipes"
ON public.employer_demo_talent_swipes
FOR UPDATE
USING (is_org_member(auth.uid(), org_id) AND swiper_user_id = auth.uid());

-- 5. Create demo_talent_cards table if not exists
CREATE TABLE IF NOT EXISTS public.demo_talent_cards (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  location text NOT NULL,
  role_key text NOT NULL,
  skills text[] DEFAULT '{}',
  legacy_score integer DEFAULT 50,
  housing_needed boolean DEFAULT false,
  available_for_extra_hours boolean DEFAULT true,
  video_url text,
  is_demo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 6. Enable RLS on demo cards
ALTER TABLE public.demo_talent_cards ENABLE ROW LEVEL SECURITY;

-- 7. Allow anyone to read demo cards (they're demo data)
CREATE POLICY "Anyone can view demo cards"
ON public.demo_talent_cards
FOR SELECT
USING (is_demo = true);