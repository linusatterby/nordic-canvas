-- ============================================
-- AI-Matching v1: Scoring, Interactions & Config
-- ============================================

-- A1) match_config table for weights
CREATE TABLE public.match_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scope text NOT NULL DEFAULT 'global' CHECK (scope IN ('global', 'org', 'location')),
  org_id uuid NULL REFERENCES public.orgs(id) ON DELETE CASCADE,
  location text NULL,
  weights jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (scope, org_id, location)
);

-- Deny all client access - weights are read via RPC only
ALTER TABLE public.match_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "No direct client access to match_config"
  ON public.match_config
  FOR ALL
  USING (false)
  WITH CHECK (false);

-- Seed global weights
INSERT INTO public.match_config (scope, weights)
VALUES ('global', '{
  "availability": 40,
  "skills": 25,
  "housing": 15,
  "legacy": 10,
  "circle": 5,
  "recency": 5,
  "interaction_affinity": 10
}'::jsonb);

-- A2) listing_interactions table (talent actions on listings)
CREATE TABLE public.listing_interactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  talent_user_id uuid NOT NULL,
  listing_id uuid NOT NULL REFERENCES public.job_posts(id) ON DELETE CASCADE,
  action text NOT NULL CHECK (action IN ('view', 'swipe_yes', 'swipe_no', 'open', 'chat_started', 'applied', 'saved')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_listing_interactions_talent ON public.listing_interactions(talent_user_id, created_at DESC);
CREATE INDEX idx_listing_interactions_listing ON public.listing_interactions(listing_id, action);

ALTER TABLE public.listing_interactions ENABLE ROW LEVEL SECURITY;

-- Talent can insert and view own interactions (append-only)
CREATE POLICY "Talents can insert own listing interactions"
  ON public.listing_interactions
  FOR INSERT
  WITH CHECK (auth.uid() = talent_user_id);

CREATE POLICY "Talents can view own listing interactions"
  ON public.listing_interactions
  FOR SELECT
  USING (auth.uid() = talent_user_id);

-- No update/delete allowed (append-only)
CREATE POLICY "No update on listing_interactions"
  ON public.listing_interactions
  FOR UPDATE
  USING (false);

CREATE POLICY "No delete on listing_interactions"
  ON public.listing_interactions
  FOR DELETE
  USING (false);

-- A3) candidate_interactions table (employer actions on candidates)
CREATE TABLE public.candidate_interactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.orgs(id) ON DELETE CASCADE,
  job_post_id uuid NOT NULL REFERENCES public.job_posts(id) ON DELETE CASCADE,
  talent_user_id uuid NULL,
  demo_card_id uuid NULL,
  action text NOT NULL CHECK (action IN ('view', 'swipe_yes', 'swipe_no', 'open_profile', 'chat_started', 'booked')),
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (talent_user_id IS NOT NULL OR demo_card_id IS NOT NULL)
);

CREATE INDEX idx_candidate_interactions_org ON public.candidate_interactions(org_id, job_post_id, created_at DESC);
CREATE INDEX idx_candidate_interactions_talent ON public.candidate_interactions(talent_user_id) WHERE talent_user_id IS NOT NULL;
CREATE INDEX idx_candidate_interactions_demo ON public.candidate_interactions(demo_card_id) WHERE demo_card_id IS NOT NULL;

ALTER TABLE public.candidate_interactions ENABLE ROW LEVEL SECURITY;

-- Org members can insert for their org
CREATE POLICY "Org members can insert candidate interactions"
  ON public.candidate_interactions
  FOR INSERT
  WITH CHECK (is_org_member(auth.uid(), org_id));

CREATE POLICY "Org members can view candidate interactions"
  ON public.candidate_interactions
  FOR SELECT
  USING (is_org_member(auth.uid(), org_id));

-- Append-only
CREATE POLICY "No update on candidate_interactions"
  ON public.candidate_interactions
  FOR UPDATE
  USING (false);

CREATE POLICY "No delete on candidate_interactions"
  ON public.candidate_interactions
  FOR DELETE
  USING (false);

-- ============================================
-- B) RPC Functions for scoring
-- ============================================

-- B1) Get match weights with priority cascade
CREATE OR REPLACE FUNCTION public.get_match_weights(
  p_org_id uuid DEFAULT NULL,
  p_location text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_weights jsonb;
BEGIN
  -- Try org+location first
  IF p_org_id IS NOT NULL AND p_location IS NOT NULL THEN
    SELECT weights INTO v_weights
    FROM match_config
    WHERE scope = 'location' AND org_id = p_org_id AND location = p_location
    LIMIT 1;
    IF v_weights IS NOT NULL THEN RETURN v_weights; END IF;
  END IF;

  -- Try org only
  IF p_org_id IS NOT NULL THEN
    SELECT weights INTO v_weights
    FROM match_config
    WHERE scope = 'org' AND org_id = p_org_id
    LIMIT 1;
    IF v_weights IS NOT NULL THEN RETURN v_weights; END IF;
  END IF;

  -- Try location only
  IF p_location IS NOT NULL THEN
    SELECT weights INTO v_weights
    FROM match_config
    WHERE scope = 'location' AND location = p_location AND org_id IS NULL
    LIMIT 1;
    IF v_weights IS NOT NULL THEN RETURN v_weights; END IF;
  END IF;

  -- Fall back to global
  SELECT weights INTO v_weights
  FROM match_config
  WHERE scope = 'global'
  LIMIT 1;

  RETURN COALESCE(v_weights, '{"availability":40,"skills":25,"housing":15,"legacy":10,"circle":5,"recency":5,"interaction_affinity":10}'::jsonb);
END;
$$;

-- B2) Score a listing for a talent
CREATE OR REPLACE FUNCTION public.score_listing_for_talent(
  p_talent_user_id uuid,
  p_listing_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_listing RECORD;
  v_weights jsonb;
  v_score int := 0;
  v_reasons jsonb := '[]'::jsonb;
  v_profile RECORD;
  v_talent_profile RECORD;
  v_availability_score int := 0;
  v_skills_score int := 0;
  v_housing_score int := 0;
  v_legacy_score int := 0;
  v_recency_score int := 0;
  v_affinity_score int := 0;
  v_badge_count int := 0;
  v_match_count int := 0;
  v_interaction_count int := 0;
  v_days_old int;
BEGIN
  -- Get listing
  SELECT * INTO v_listing FROM job_posts WHERE id = p_listing_id;
  IF v_listing IS NULL THEN
    RETURN jsonb_build_object('score', 0, 'reasons', '[]'::jsonb, 'error', 'Listing not found');
  END IF;

  -- Get weights
  v_weights := get_match_weights(v_listing.org_id, v_listing.location);

  -- Get talent profile
  SELECT * INTO v_profile FROM profiles WHERE user_id = p_talent_user_id;
  SELECT * INTO v_talent_profile FROM talent_profiles WHERE user_id = p_talent_user_id;

  -- 1. Availability scoring
  -- Check if talent has availability blocks that overlap with listing period
  IF v_profile IS NOT NULL AND v_profile.available_from IS NOT NULL AND v_profile.available_to IS NOT NULL THEN
    IF v_listing.start_date >= v_profile.available_from AND v_listing.end_date <= v_profile.available_to THEN
      v_availability_score := (v_weights->>'availability')::int;
      v_reasons := v_reasons || jsonb_build_object(
        'key', 'availability',
        'label', 'Passar din tillgänglighet',
        'impact', v_availability_score
      );
    END IF;
  ELSE
    -- No availability set = neutral, give partial score
    v_availability_score := ((v_weights->>'availability')::int * 0.5)::int;
    v_reasons := v_reasons || jsonb_build_object(
      'key', 'availability',
      'label', 'Ingen tillgänglighet angiven',
      'impact', v_availability_score
    );
  END IF;

  -- 2. Skills/badges matching
  IF v_listing.required_badges IS NOT NULL AND array_length(v_listing.required_badges, 1) > 0 THEN
    SELECT COUNT(*) INTO v_match_count
    FROM talent_badges tb
    WHERE tb.user_id = p_talent_user_id
      AND tb.badge_key = ANY(v_listing.required_badges);
    
    IF v_match_count > 0 THEN
      v_skills_score := LEAST(
        (v_weights->>'skills')::int,
        ((v_weights->>'skills')::int * v_match_count / array_length(v_listing.required_badges, 1))::int
      );
      v_reasons := v_reasons || jsonb_build_object(
        'key', 'skills',
        'label', 'Matchar dina styrkor',
        'impact', v_skills_score
      );
    END IF;
  ELSE
    -- No required badges = give partial match
    v_skills_score := ((v_weights->>'skills')::int * 0.3)::int;
  END IF;

  -- 3. Housing scoring
  IF v_listing.housing_offered = true OR v_listing.housing_text IS NOT NULL THEN
    -- Check if talent needs housing
    IF v_talent_profile IS NOT NULL AND v_talent_profile.housing_need = true THEN
      v_housing_score := (v_weights->>'housing')::int;
      v_reasons := v_reasons || jsonb_build_object(
        'key', 'housing',
        'label', 'Boende erbjuds',
        'impact', v_housing_score
      );
    ELSE
      -- Housing offered but not needed = smaller bonus
      v_housing_score := ((v_weights->>'housing')::int * 0.3)::int;
      v_reasons := v_reasons || jsonb_build_object(
        'key', 'housing',
        'label', 'Boende ingår',
        'impact', v_housing_score
      );
    END IF;
  END IF;

  -- 4. Legacy score
  IF v_talent_profile IS NOT NULL AND v_talent_profile.legacy_score_cached IS NOT NULL THEN
    v_legacy_score := ((v_weights->>'legacy')::int * v_talent_profile.legacy_score_cached / 100)::int;
    IF v_legacy_score > 0 THEN
      v_reasons := v_reasons || jsonb_build_object(
        'key', 'legacy',
        'label', 'Din erfarenhetspoäng',
        'impact', v_legacy_score
      );
    END IF;
  END IF;

  -- 5. Recency scoring
  v_days_old := EXTRACT(DAY FROM now() - v_listing.created_at)::int;
  IF v_days_old <= 7 THEN
    v_recency_score := (v_weights->>'recency')::int;
    v_reasons := v_reasons || jsonb_build_object(
      'key', 'recency',
      'label', 'Nyligen publicerat',
      'impact', v_recency_score
    );
  ELSIF v_days_old <= 14 THEN
    v_recency_score := ((v_weights->>'recency')::int * 0.5)::int;
  END IF;

  -- 6. Interaction affinity (similar listings)
  SELECT COUNT(*) INTO v_interaction_count
  FROM listing_interactions li
  JOIN job_posts jp ON jp.id = li.listing_id
  WHERE li.talent_user_id = p_talent_user_id
    AND li.action = 'swipe_yes'
    AND li.created_at > now() - interval '30 days'
    AND (jp.location = v_listing.location OR jp.role_key = v_listing.role_key);

  IF v_interaction_count >= 3 THEN
    v_affinity_score := (v_weights->>'interaction_affinity')::int;
    v_reasons := v_reasons || jsonb_build_object(
      'key', 'affinity',
      'label', 'Liknar jobb du gillat tidigare',
      'impact', v_affinity_score
    );
  ELSIF v_interaction_count >= 1 THEN
    v_affinity_score := ((v_weights->>'interaction_affinity')::int * 0.5)::int;
  END IF;

  -- Calculate total score (cap at 100)
  v_score := LEAST(100, v_availability_score + v_skills_score + v_housing_score + v_legacy_score + v_recency_score + v_affinity_score);

  RETURN jsonb_build_object(
    'score', v_score,
    'reasons', v_reasons
  );
EXCEPTION
  WHEN OTHERS THEN
    -- Return safe fallback on any error
    RETURN jsonb_build_object('score', 50, 'reasons', '[]'::jsonb, 'error', SQLERRM);
END;
$$;

-- B3) Batch score listings for talent (efficient)
CREATE OR REPLACE FUNCTION public.score_listings_for_talent(
  p_talent_user_id uuid,
  p_listing_ids uuid[]
)
RETURNS TABLE(listing_id uuid, score int, reasons jsonb)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_listing_id uuid;
  v_result jsonb;
BEGIN
  FOREACH v_listing_id IN ARRAY p_listing_ids
  LOOP
    v_result := score_listing_for_talent(p_talent_user_id, v_listing_id);
    listing_id := v_listing_id;
    score := (v_result->>'score')::int;
    reasons := v_result->'reasons';
    RETURN NEXT;
  END LOOP;
END;
$$;

-- B4) Score a candidate for a job
CREATE OR REPLACE FUNCTION public.score_candidate_for_job(
  p_org_id uuid,
  p_job_post_id uuid,
  p_talent_user_id uuid DEFAULT NULL,
  p_demo_card_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_job RECORD;
  v_weights jsonb;
  v_score int := 0;
  v_reasons jsonb := '[]'::jsonb;
  v_profile RECORD;
  v_talent_profile RECORD;
  v_demo_card RECORD;
  v_availability_score int := 0;
  v_skills_score int := 0;
  v_legacy_score int := 0;
  v_circle_score int := 0;
  v_affinity_score int := 0;
  v_visibility RECORD;
  v_interaction_count int;
  v_is_in_circle boolean := false;
BEGIN
  -- Get job
  SELECT * INTO v_job FROM job_posts WHERE id = p_job_post_id;
  IF v_job IS NULL THEN
    RETURN jsonb_build_object('score', 0, 'reasons', '[]'::jsonb, 'error', 'Job not found');
  END IF;

  -- Get weights
  v_weights := get_match_weights(p_org_id, v_job.location);

  -- Handle demo cards
  IF p_demo_card_id IS NOT NULL THEN
    SELECT * INTO v_demo_card FROM demo_talent_cards WHERE id = p_demo_card_id;
    IF v_demo_card IS NULL THEN
      RETURN jsonb_build_object('score', 50, 'reasons', '[]'::jsonb);
    END IF;

    -- Demo card scoring (simplified)
    -- Legacy score
    IF v_demo_card.legacy_score IS NOT NULL THEN
      v_legacy_score := ((v_weights->>'legacy')::int * v_demo_card.legacy_score / 100)::int;
      IF v_legacy_score > 0 THEN
        v_reasons := v_reasons || jsonb_build_object(
          'key', 'legacy',
          'label', 'Hög rating',
          'impact', v_legacy_score
        );
      END IF;
    END IF;

    -- Location match
    IF v_demo_card.location IS NOT NULL AND v_job.location IS NOT NULL AND 
       v_demo_card.location ILIKE '%' || v_job.location || '%' THEN
      v_availability_score := (v_weights->>'availability')::int;
      v_reasons := v_reasons || jsonb_build_object(
        'key', 'location',
        'label', 'Bor nära',
        'impact', v_availability_score
      );
    ELSE
      v_availability_score := ((v_weights->>'availability')::int * 0.5)::int;
    END IF;

    -- Skills from demo card
    IF v_demo_card.skills IS NOT NULL AND array_length(v_demo_card.skills, 1) > 0 THEN
      v_skills_score := ((v_weights->>'skills')::int * 0.7)::int;
      v_reasons := v_reasons || jsonb_build_object(
        'key', 'skills',
        'label', 'Relevanta färdigheter',
        'impact', v_skills_score
      );
    END IF;

    -- Extra hours availability
    IF v_demo_card.available_for_extra_hours = true THEN
      v_circle_score := (v_weights->>'circle')::int;
      v_reasons := v_reasons || jsonb_build_object(
        'key', 'extra_hours',
        'label', 'Tillgänglig för extratimmar',
        'impact', v_circle_score
      );
    END IF;

    v_score := LEAST(100, v_legacy_score + v_availability_score + v_skills_score + v_circle_score);
    RETURN jsonb_build_object('score', v_score, 'reasons', v_reasons);
  END IF;

  -- Handle real talent
  IF p_talent_user_id IS NOT NULL THEN
    SELECT * INTO v_profile FROM profiles WHERE user_id = p_talent_user_id;
    SELECT * INTO v_talent_profile FROM talent_profiles WHERE user_id = p_talent_user_id;
    SELECT * INTO v_visibility FROM talent_visibility WHERE talent_user_id = p_talent_user_id;

    -- 1. Availability
    IF v_profile IS NOT NULL AND v_profile.available_from IS NOT NULL AND v_profile.available_to IS NOT NULL THEN
      IF v_job.start_date >= v_profile.available_from AND v_job.end_date <= v_profile.available_to THEN
        v_availability_score := (v_weights->>'availability')::int;
        v_reasons := v_reasons || jsonb_build_object(
          'key', 'availability',
          'label', 'Tillgänglig under hela perioden',
          'impact', v_availability_score
        );
      ELSE
        v_availability_score := ((v_weights->>'availability')::int * 0.3)::int;
      END IF;
    ELSE
      v_availability_score := ((v_weights->>'availability')::int * 0.5)::int;
    END IF;

    -- 2. Skills/badges
    IF v_job.required_badges IS NOT NULL AND array_length(v_job.required_badges, 1) > 0 THEN
      SELECT COUNT(*) INTO v_skills_score
      FROM talent_badges tb
      WHERE tb.user_id = p_talent_user_id
        AND tb.badge_key = ANY(v_job.required_badges);
      
      IF v_skills_score > 0 THEN
        v_skills_score := LEAST(
          (v_weights->>'skills')::int,
          ((v_weights->>'skills')::int * v_skills_score / array_length(v_job.required_badges, 1))::int
        );
        v_reasons := v_reasons || jsonb_build_object(
          'key', 'skills',
          'label', 'Har rätt kvalifikationer',
          'impact', v_skills_score
        );
      END IF;
    ELSE
      v_skills_score := ((v_weights->>'skills')::int * 0.3)::int;
    END IF;

    -- 3. Legacy score
    IF v_talent_profile IS NOT NULL AND v_talent_profile.legacy_score_cached IS NOT NULL THEN
      v_legacy_score := ((v_weights->>'legacy')::int * v_talent_profile.legacy_score_cached / 100)::int;
      IF v_legacy_score > 0 THEN
        v_reasons := v_reasons || jsonb_build_object(
          'key', 'legacy',
          'label', 'Hög rating',
          'impact', v_legacy_score
        );
      END IF;
    END IF;

    -- 4. Circle/visibility
    IF v_visibility IS NOT NULL AND v_visibility.available_for_extra_hours = true THEN
      v_circle_score := (v_weights->>'circle')::int;
      v_reasons := v_reasons || jsonb_build_object(
        'key', 'extra_hours',
        'label', 'Öppen för extratimmar',
        'impact', v_circle_score
      );
    END IF;

    -- 5. Interaction affinity
    SELECT COUNT(*) INTO v_interaction_count
    FROM candidate_interactions ci
    WHERE ci.org_id = p_org_id
      AND ci.action = 'swipe_yes'
      AND ci.created_at > now() - interval '30 days'
      AND (
        (ci.talent_user_id IS NOT NULL AND EXISTS (
          SELECT 1 FROM profiles p2 WHERE p2.user_id = ci.talent_user_id 
          AND p2.home_base = v_profile.home_base
        ))
      );

    IF v_interaction_count >= 2 THEN
      v_affinity_score := (v_weights->>'interaction_affinity')::int;
      v_reasons := v_reasons || jsonb_build_object(
        'key', 'affinity',
        'label', 'Liknar kandidater ni gillat',
        'impact', v_affinity_score
      );
    ELSIF v_interaction_count >= 1 THEN
      v_affinity_score := ((v_weights->>'interaction_affinity')::int * 0.5)::int;
    END IF;

    v_score := LEAST(100, v_availability_score + v_skills_score + v_legacy_score + v_circle_score + v_affinity_score);
    RETURN jsonb_build_object('score', v_score, 'reasons', v_reasons);
  END IF;

  -- Fallback
  RETURN jsonb_build_object('score', 50, 'reasons', '[]'::jsonb);
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object('score', 50, 'reasons', '[]'::jsonb, 'error', SQLERRM);
END;
$$;

-- B5) Batch score candidates for job
CREATE OR REPLACE FUNCTION public.score_candidates_for_job(
  p_org_id uuid,
  p_job_post_id uuid,
  p_talent_user_ids uuid[],
  p_demo_card_ids uuid[]
)
RETURNS TABLE(candidate_id uuid, candidate_type text, score int, reasons jsonb)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
  v_result jsonb;
BEGIN
  -- Score real talents
  IF p_talent_user_ids IS NOT NULL THEN
    FOREACH v_id IN ARRAY p_talent_user_ids
    LOOP
      v_result := score_candidate_for_job(p_org_id, p_job_post_id, v_id, NULL);
      candidate_id := v_id;
      candidate_type := 'real';
      score := (v_result->>'score')::int;
      reasons := v_result->'reasons';
      RETURN NEXT;
    END LOOP;
  END IF;

  -- Score demo cards
  IF p_demo_card_ids IS NOT NULL THEN
    FOREACH v_id IN ARRAY p_demo_card_ids
    LOOP
      v_result := score_candidate_for_job(p_org_id, p_job_post_id, NULL, v_id);
      candidate_id := v_id;
      candidate_type := 'demo_card';
      score := (v_result->>'score')::int;
      reasons := v_result->'reasons';
      RETURN NEXT;
    END LOOP;
  END IF;
END;
$$;

-- B6) Log listing interaction (talent)
CREATE OR REPLACE FUNCTION public.log_listing_interaction(
  p_listing_id uuid,
  p_action text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
BEGIN
  INSERT INTO listing_interactions (talent_user_id, listing_id, action)
  VALUES (auth.uid(), p_listing_id, p_action)
  RETURNING id INTO v_id;
  
  RETURN v_id;
EXCEPTION
  WHEN OTHERS THEN
    RETURN NULL;
END;
$$;

-- B7) Log candidate interaction (employer)
CREATE OR REPLACE FUNCTION public.log_candidate_interaction(
  p_org_id uuid,
  p_job_post_id uuid,
  p_talent_user_id uuid,
  p_demo_card_id uuid,
  p_action text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
BEGIN
  INSERT INTO candidate_interactions (org_id, job_post_id, talent_user_id, demo_card_id, action)
  VALUES (p_org_id, p_job_post_id, p_talent_user_id, p_demo_card_id, p_action)
  RETURNING id INTO v_id;
  
  RETURN v_id;
EXCEPTION
  WHEN OTHERS THEN
    RETURN NULL;
END;
$$;