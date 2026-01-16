-- ============================================
-- 0001_init.sql - Seasonal Talent Ecosystem MVP
-- ============================================

-- ==========================================
-- 1. BASE TABLES
-- ==========================================

-- Profiles (user type)
CREATE TABLE public.profiles (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('talent', 'employer', 'both')),
  full_name text,
  phone text,
  home_base text,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Organizations
CREATE TABLE public.orgs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  location text,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Organization members
CREATE TABLE public.org_members (
  org_id uuid REFERENCES public.orgs(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role text NOT NULL CHECK (role IN ('admin', 'manager')),
  PRIMARY KEY (org_id, user_id)
);

CREATE INDEX idx_org_members_user_id ON public.org_members(user_id);
CREATE INDEX idx_org_members_org_id ON public.org_members(org_id);

-- ==========================================
-- 2. TALENT TABLES
-- ==========================================

-- Talent profiles (extended)
CREATE TABLE public.talent_profiles (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  bio text,
  desired_roles text[] DEFAULT '{}',
  housing_need boolean DEFAULT false,
  legacy_score_cached integer DEFAULT 50
);

-- Talent badges
CREATE TABLE public.talent_badges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  badge_key text NOT NULL,
  label text,
  verified boolean DEFAULT false,
  verified_at timestamptz
);

CREATE INDEX idx_talent_badges_user_id ON public.talent_badges(user_id);
CREATE INDEX idx_talent_badges_badge_key ON public.talent_badges(badge_key);

-- Availability blocks
CREATE TABLE public.availability_blocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  start_date date NOT NULL,
  end_date date NOT NULL,
  notes text
);

CREATE INDEX idx_availability_blocks_user_dates ON public.availability_blocks(user_id, start_date, end_date);

-- ==========================================
-- 3. VIDEO PITCHES
-- ==========================================

CREATE TABLE public.video_pitches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  provider text,
  playback_id text,
  thumbnail_url text,
  duration_s integer,
  status text CHECK (status IN ('ready', 'processing', 'blocked')) DEFAULT 'ready'
);

-- ==========================================
-- 4. JOB POSTS
-- ==========================================

CREATE TABLE public.job_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.orgs(id) ON DELETE CASCADE,
  title text NOT NULL,
  role_key text NOT NULL,
  location text,
  start_date date NOT NULL,
  end_date date NOT NULL,
  required_badges text[] DEFAULT '{}',
  housing_offered boolean DEFAULT false,
  status text CHECK (status IN ('draft', 'published', 'closed')) DEFAULT 'published',
  created_at timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX idx_job_posts_org_id ON public.job_posts(org_id);
CREATE INDEX idx_job_posts_status ON public.job_posts(status);
CREATE INDEX idx_job_posts_location ON public.job_posts(location);
CREATE INDEX idx_job_posts_dates ON public.job_posts(start_date, end_date);

-- ==========================================
-- 5. HOUSING TABLES
-- ==========================================

-- Tenant verifications (MVP gating)
CREATE TABLE public.tenant_verifications (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  id_verified boolean DEFAULT false,
  employment_verified boolean DEFAULT false,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Housing listings
CREATE TABLE public.housing_listings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_type text NOT NULL CHECK (owner_type IN ('org', 'private')),
  org_id uuid REFERENCES public.orgs(id) ON DELETE CASCADE,
  owner_user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  location text NOT NULL,
  capacity integer NOT NULL DEFAULT 1,
  room_type text,
  price_month integer,
  status text CHECK (status IN ('active', 'paused')) DEFAULT 'active',
  created_at timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX idx_housing_listings_location ON public.housing_listings(location);
CREATE INDEX idx_housing_listings_status ON public.housing_listings(status);

-- Housing requests
CREATE TABLE public.housing_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid REFERENCES public.housing_listings(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  job_post_id uuid REFERENCES public.job_posts(id) ON DELETE SET NULL,
  status text CHECK (status IN ('requested', 'approved', 'declined')) DEFAULT 'requested',
  created_at timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX idx_housing_requests_listing_id ON public.housing_requests(listing_id);
CREATE INDEX idx_housing_requests_user_id ON public.housing_requests(user_id);

-- ==========================================
-- 6. SWIPE TABLES
-- ==========================================

-- Talent swipes on jobs
CREATE TABLE public.talent_job_swipes (
  talent_user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  job_post_id uuid REFERENCES public.job_posts(id) ON DELETE CASCADE NOT NULL,
  direction text NOT NULL CHECK (direction IN ('yes', 'no')),
  created_at timestamptz DEFAULT now() NOT NULL,
  PRIMARY KEY (talent_user_id, job_post_id)
);

-- Employer swipes on talents
CREATE TABLE public.employer_talent_swipes (
  org_id uuid REFERENCES public.orgs(id) ON DELETE CASCADE NOT NULL,
  job_post_id uuid REFERENCES public.job_posts(id) ON DELETE CASCADE NOT NULL,
  talent_user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  swiper_user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  direction text NOT NULL CHECK (direction IN ('yes', 'no')),
  created_at timestamptz DEFAULT now() NOT NULL,
  PRIMARY KEY (org_id, job_post_id, talent_user_id)
);

-- ==========================================
-- 7. MATCHES TABLE
-- ==========================================

CREATE TABLE public.matches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.orgs(id) ON DELETE CASCADE,
  job_post_id uuid NOT NULL REFERENCES public.job_posts(id) ON DELETE CASCADE,
  talent_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status text CHECK (status IN ('matched', 'chatting', 'offer', 'signed', 'closed')) DEFAULT 'matched',
  created_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE (job_post_id, talent_user_id)
);

CREATE INDEX idx_matches_org_id ON public.matches(org_id);
CREATE INDEX idx_matches_talent_user_id ON public.matches(talent_user_id);
CREATE INDEX idx_matches_created_at ON public.matches(created_at);

-- ==========================================
-- 8. CHAT TABLES
-- ==========================================

CREATE TABLE public.threads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id uuid UNIQUE REFERENCES public.matches(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE public.messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id uuid REFERENCES public.threads(id) ON DELETE CASCADE NOT NULL,
  sender_user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  body text NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX idx_messages_thread_created ON public.messages(thread_id, created_at);

-- ==========================================
-- 9. SCHEDULER
-- ==========================================

CREATE TABLE public.shift_bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid REFERENCES public.orgs(id) ON DELETE CASCADE NOT NULL,
  talent_user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  start_ts timestamptz NOT NULL,
  end_ts timestamptz NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX idx_shift_bookings_org_start ON public.shift_bookings(org_id, start_ts);
CREATE INDEX idx_shift_bookings_talent_start ON public.shift_bookings(talent_user_id, start_ts);

-- Public view for talent busy blocks (hides org data)
CREATE VIEW public.talent_busy_blocks_public 
WITH (security_invoker = on)
AS
SELECT 
  talent_user_id,
  start_ts,
  end_ts
FROM public.shift_bookings;

-- ==========================================
-- 10. HELPER FUNCTIONS (SECURITY DEFINER)
-- ==========================================

-- Check if user is member of an org
CREATE OR REPLACE FUNCTION public.is_org_member(_user_id uuid, _org_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.org_members
    WHERE user_id = _user_id
      AND org_id = _org_id
  )
$$;

-- Check if user is admin of an org
CREATE OR REPLACE FUNCTION public.is_org_admin(_user_id uuid, _org_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.org_members
    WHERE user_id = _user_id
      AND org_id = _org_id
      AND role = 'admin'
  )
$$;

-- Check if user has access to a match (talent or org member)
CREATE OR REPLACE FUNCTION public.has_match_access(_user_id uuid, _match_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.matches m
    WHERE m.id = _match_id
      AND (
        m.talent_user_id = _user_id
        OR public.is_org_member(_user_id, m.org_id)
      )
  )
$$;

-- Check if user has access to a thread via match
CREATE OR REPLACE FUNCTION public.has_thread_access(_user_id uuid, _thread_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.threads t
    WHERE t.id = _thread_id
      AND public.has_match_access(_user_id, t.match_id)
  )
$$;

-- Check if user is verified tenant
CREATE OR REPLACE FUNCTION public.is_verified_tenant(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.tenant_verifications
    WHERE user_id = _user_id
      AND id_verified = true
  )
$$;

-- Check if user is housing listing owner
CREATE OR REPLACE FUNCTION public.is_listing_owner(_user_id uuid, _listing_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.housing_listings hl
    WHERE hl.id = _listing_id
      AND (
        hl.owner_user_id = _user_id
        OR (hl.owner_type = 'org' AND public.is_org_member(_user_id, hl.org_id))
      )
  )
$$;

-- ==========================================
-- 11. AUTO-MATCH TRIGGER FUNCTION
-- ==========================================

CREATE OR REPLACE FUNCTION public.check_and_create_match()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_talent_user_id uuid;
  v_job_post_id uuid;
  v_org_id uuid;
  v_talent_yes boolean;
  v_employer_yes boolean;
  v_new_match_id uuid;
BEGIN
  -- Determine which table triggered this
  IF TG_TABLE_NAME = 'talent_job_swipes' THEN
    v_talent_user_id := NEW.talent_user_id;
    v_job_post_id := NEW.job_post_id;
    
    -- Get org_id from job_posts
    SELECT jp.org_id INTO v_org_id
    FROM public.job_posts jp
    WHERE jp.id = v_job_post_id;
    
    -- Check if talent swiped yes
    v_talent_yes := (NEW.direction = 'yes');
    
    -- Check if employer already swiped yes
    SELECT EXISTS (
      SELECT 1 FROM public.employer_talent_swipes ets
      WHERE ets.org_id = v_org_id
        AND ets.job_post_id = v_job_post_id
        AND ets.talent_user_id = v_talent_user_id
        AND ets.direction = 'yes'
    ) INTO v_employer_yes;
    
  ELSIF TG_TABLE_NAME = 'employer_talent_swipes' THEN
    v_talent_user_id := NEW.talent_user_id;
    v_job_post_id := NEW.job_post_id;
    v_org_id := NEW.org_id;
    
    -- Check if employer swiped yes
    v_employer_yes := (NEW.direction = 'yes');
    
    -- Check if talent already swiped yes
    SELECT EXISTS (
      SELECT 1 FROM public.talent_job_swipes tjs
      WHERE tjs.talent_user_id = v_talent_user_id
        AND tjs.job_post_id = v_job_post_id
        AND tjs.direction = 'yes'
    ) INTO v_talent_yes;
  END IF;
  
  -- If both parties swiped yes, create match and thread
  IF v_talent_yes AND v_employer_yes THEN
    -- Insert match (idempotent with ON CONFLICT DO NOTHING)
    INSERT INTO public.matches (org_id, job_post_id, talent_user_id, status)
    VALUES (v_org_id, v_job_post_id, v_talent_user_id, 'matched')
    ON CONFLICT (job_post_id, talent_user_id) DO NOTHING
    RETURNING id INTO v_new_match_id;
    
    -- If a new match was created, create thread
    IF v_new_match_id IS NOT NULL THEN
      INSERT INTO public.threads (match_id)
      VALUES (v_new_match_id)
      ON CONFLICT (match_id) DO NOTHING;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- ==========================================
-- 12. CREATE TRIGGERS
-- ==========================================

-- Trigger on talent_job_swipes
CREATE TRIGGER trg_talent_swipe_check_match
  AFTER INSERT OR UPDATE ON public.talent_job_swipes
  FOR EACH ROW
  EXECUTE FUNCTION public.check_and_create_match();

-- Trigger on employer_talent_swipes
CREATE TRIGGER trg_employer_swipe_check_match
  AFTER INSERT OR UPDATE ON public.employer_talent_swipes
  FOR EACH ROW
  EXECUTE FUNCTION public.check_and_create_match();

-- ==========================================
-- 13. ENABLE ROW LEVEL SECURITY
-- ==========================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orgs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.org_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.talent_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.talent_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.availability_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.video_pitches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.housing_listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.housing_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.talent_job_swipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employer_talent_swipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shift_bookings ENABLE ROW LEVEL SECURITY;

-- ==========================================
-- 14. RLS POLICIES
-- ==========================================

-- PROFILES
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = user_id);

-- ORGS
CREATE POLICY "Org members can view their orgs"
  ON public.orgs FOR SELECT
  USING (public.is_org_member(auth.uid(), id));

-- ORG_MEMBERS
CREATE POLICY "Users can view members of their orgs"
  ON public.org_members FOR SELECT
  USING (public.is_org_member(auth.uid(), org_id));

CREATE POLICY "Org admins can insert members"
  ON public.org_members FOR INSERT
  WITH CHECK (public.is_org_admin(auth.uid(), org_id));

CREATE POLICY "Org admins can update members"
  ON public.org_members FOR UPDATE
  USING (public.is_org_admin(auth.uid(), org_id));

CREATE POLICY "Org admins can delete members"
  ON public.org_members FOR DELETE
  USING (public.is_org_admin(auth.uid(), org_id));

-- TALENT_PROFILES
CREATE POLICY "Talents can view own profile"
  ON public.talent_profiles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Talents can insert own profile"
  ON public.talent_profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Talents can update own profile"
  ON public.talent_profiles FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Talents can delete own profile"
  ON public.talent_profiles FOR DELETE
  USING (auth.uid() = user_id);

-- Employers can view talent profiles only via matches
CREATE POLICY "Employers can view matched talent profiles"
  ON public.talent_profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.matches m
      WHERE m.talent_user_id = talent_profiles.user_id
        AND public.is_org_member(auth.uid(), m.org_id)
    )
  );

-- TALENT_BADGES
CREATE POLICY "Talents can manage own badges"
  ON public.talent_badges FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Employers can view matched talent badges
CREATE POLICY "Employers can view matched talent badges"
  ON public.talent_badges FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.matches m
      WHERE m.talent_user_id = talent_badges.user_id
        AND public.is_org_member(auth.uid(), m.org_id)
    )
  );

-- AVAILABILITY_BLOCKS
CREATE POLICY "Talents can manage own availability"
  ON public.availability_blocks FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Employers can view matched talent availability
CREATE POLICY "Employers can view matched talent availability"
  ON public.availability_blocks FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.matches m
      WHERE m.talent_user_id = availability_blocks.user_id
        AND public.is_org_member(auth.uid(), m.org_id)
    )
  );

-- VIDEO_PITCHES
CREATE POLICY "Talents can manage own video"
  ON public.video_pitches FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Employers can view matched talent videos
CREATE POLICY "Employers can view matched talent videos"
  ON public.video_pitches FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.matches m
      WHERE m.talent_user_id = video_pitches.user_id
        AND public.is_org_member(auth.uid(), m.org_id)
    )
  );

-- JOB_POSTS
CREATE POLICY "Talents can view published jobs"
  ON public.job_posts FOR SELECT
  USING (status = 'published');

CREATE POLICY "Org members can view own org jobs"
  ON public.job_posts FOR SELECT
  USING (public.is_org_member(auth.uid(), org_id));

CREATE POLICY "Org members can insert jobs"
  ON public.job_posts FOR INSERT
  WITH CHECK (public.is_org_member(auth.uid(), org_id));

CREATE POLICY "Org members can update own org jobs"
  ON public.job_posts FOR UPDATE
  USING (public.is_org_member(auth.uid(), org_id));

CREATE POLICY "Org members can delete own org jobs"
  ON public.job_posts FOR DELETE
  USING (public.is_org_member(auth.uid(), org_id));

-- TENANT_VERIFICATIONS
CREATE POLICY "Users can view own verification"
  ON public.tenant_verifications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own verification"
  ON public.tenant_verifications FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own verification"
  ON public.tenant_verifications FOR UPDATE
  USING (auth.uid() = user_id);

-- HOUSING_LISTINGS
CREATE POLICY "Anyone can view active listings"
  ON public.housing_listings FOR SELECT
  USING (status = 'active');

CREATE POLICY "Private owners can manage own listings"
  ON public.housing_listings FOR ALL
  USING (owner_type = 'private' AND owner_user_id = auth.uid())
  WITH CHECK (owner_type = 'private' AND owner_user_id = auth.uid());

CREATE POLICY "Org members can manage org listings"
  ON public.housing_listings FOR ALL
  USING (owner_type = 'org' AND public.is_org_member(auth.uid(), org_id))
  WITH CHECK (owner_type = 'org' AND public.is_org_member(auth.uid(), org_id));

-- HOUSING_REQUESTS
CREATE POLICY "Users can view own requests"
  ON public.housing_requests FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Listing owners can view requests"
  ON public.housing_requests FOR SELECT
  USING (public.is_listing_owner(auth.uid(), listing_id));

CREATE POLICY "Verified tenants can insert requests"
  ON public.housing_requests FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND public.is_verified_tenant(auth.uid())
  );

CREATE POLICY "Listing owners can update requests"
  ON public.housing_requests FOR UPDATE
  USING (public.is_listing_owner(auth.uid(), listing_id));

-- TALENT_JOB_SWIPES
CREATE POLICY "Talents can manage own swipes"
  ON public.talent_job_swipes FOR ALL
  USING (auth.uid() = talent_user_id)
  WITH CHECK (auth.uid() = talent_user_id);

-- EMPLOYER_TALENT_SWIPES
CREATE POLICY "Org members can view org swipes"
  ON public.employer_talent_swipes FOR SELECT
  USING (public.is_org_member(auth.uid(), org_id));

CREATE POLICY "Org members can insert swipes as self"
  ON public.employer_talent_swipes FOR INSERT
  WITH CHECK (
    public.is_org_member(auth.uid(), org_id)
    AND swiper_user_id = auth.uid()
  );

CREATE POLICY "Org members can update org swipes"
  ON public.employer_talent_swipes FOR UPDATE
  USING (
    public.is_org_member(auth.uid(), org_id)
    AND swiper_user_id = auth.uid()
  );

-- MATCHES
CREATE POLICY "Talent can view own matches"
  ON public.matches FOR SELECT
  USING (auth.uid() = talent_user_id);

CREATE POLICY "Org members can view org matches"
  ON public.matches FOR SELECT
  USING (public.is_org_member(auth.uid(), org_id));

CREATE POLICY "Match parties can update status"
  ON public.matches FOR UPDATE
  USING (
    auth.uid() = talent_user_id
    OR public.is_org_member(auth.uid(), org_id)
  );

-- THREADS
CREATE POLICY "Match parties can view threads"
  ON public.threads FOR SELECT
  USING (public.has_match_access(auth.uid(), match_id));

-- MESSAGES
CREATE POLICY "Thread members can view messages"
  ON public.messages FOR SELECT
  USING (public.has_thread_access(auth.uid(), thread_id));

CREATE POLICY "Thread members can send messages"
  ON public.messages FOR INSERT
  WITH CHECK (
    public.has_thread_access(auth.uid(), thread_id)
    AND sender_user_id = auth.uid()
  );

-- SHIFT_BOOKINGS
CREATE POLICY "Org members can manage shifts"
  ON public.shift_bookings FOR ALL
  USING (public.is_org_member(auth.uid(), org_id))
  WITH CHECK (public.is_org_member(auth.uid(), org_id));

CREATE POLICY "Talents can view own shifts"
  ON public.shift_bookings FOR SELECT
  USING (auth.uid() = talent_user_id);