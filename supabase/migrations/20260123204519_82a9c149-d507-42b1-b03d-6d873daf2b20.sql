-- =============================================================
-- A1) Create app_schema_config table for centralized field mapping
-- =============================================================

CREATE TABLE IF NOT EXISTS public.app_schema_config (
  key text PRIMARY KEY,
  value jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Seed the job_posts field map configuration
INSERT INTO public.app_schema_config (key, value)
VALUES (
  'job_posts_field_map',
  '{
    "location": ["location", "city", "town", "location_text", "workplace_location", "area"],
    "role": ["role_title", "role", "category", "position", "job_title", "title"],
    "title": ["title", "headline", "job_title", "role_title"],
    "housing_flag": ["housing_offered"],
    "housing_text": ["housing_text"]
  }'::jsonb
)
ON CONFLICT (key) DO NOTHING;

-- Enable RLS with deny-all policy (only accessible via RPC)
ALTER TABLE public.app_schema_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "No direct client access to config"
ON public.app_schema_config
FOR ALL
USING (false)
WITH CHECK (false);

-- =============================================================
-- A2) Create RPC: get_job_posts_field_map()
-- =============================================================

CREATE OR REPLACE FUNCTION public.get_job_posts_field_map()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_config jsonb;
  v_candidates jsonb;
  v_columns text[];
  v_location_col text := null;
  v_role_col text := null;
  v_title_col text := null;
  v_has_housing_offered boolean := false;
  v_has_housing_text boolean := false;
  v_candidate text;
BEGIN
  -- Get the config from app_schema_config
  SELECT value INTO v_config
  FROM app_schema_config
  WHERE key = 'job_posts_field_map';
  
  -- Fallback if config missing
  IF v_config IS NULL THEN
    v_config := '{
      "location": ["location", "city", "town", "location_text"],
      "role": ["role_title", "role", "category", "title"],
      "title": ["title", "headline", "job_title"],
      "housing_flag": ["housing_offered"],
      "housing_text": ["housing_text"]
    }'::jsonb;
  END IF;
  
  v_candidates := v_config;
  
  -- Get actual columns from job_posts table
  SELECT array_agg(column_name::text)
  INTO v_columns
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'job_posts';
  
  -- Resolve location column (first match wins)
  FOR v_candidate IN SELECT jsonb_array_elements_text(v_config->'location')
  LOOP
    IF v_candidate = ANY(v_columns) THEN
      v_location_col := v_candidate;
      EXIT;
    END IF;
  END LOOP;
  
  -- Resolve role column
  FOR v_candidate IN SELECT jsonb_array_elements_text(v_config->'role')
  LOOP
    IF v_candidate = ANY(v_columns) THEN
      v_role_col := v_candidate;
      EXIT;
    END IF;
  END LOOP;
  
  -- Resolve title column
  FOR v_candidate IN SELECT jsonb_array_elements_text(v_config->'title')
  LOOP
    IF v_candidate = ANY(v_columns) THEN
      v_title_col := v_candidate;
      EXIT;
    END IF;
  END LOOP;
  
  -- Check housing columns
  v_has_housing_offered := 'housing_offered' = ANY(v_columns);
  v_has_housing_text := 'housing_text' = ANY(v_columns);
  
  RETURN jsonb_build_object(
    'candidates', v_candidates,
    'resolved', jsonb_build_object(
      'location_col', v_location_col,
      'role_col', v_role_col,
      'title_col', v_title_col,
      'has_housing_offered', v_has_housing_offered,
      'has_housing_text', v_has_housing_text
    )
  );
END;
$function$;

-- =============================================================
-- B) DB constraints for shift_cover (robust data integrity)
-- =============================================================

-- First, backfill existing data to ensure constraints will pass
UPDATE public.job_posts
SET shift_required = false
WHERE listing_type = 'job' AND (shift_required IS NULL OR shift_required = true);

UPDATE public.job_posts
SET shift_start = NULL, shift_end = NULL
WHERE listing_type != 'shift_cover' AND (shift_start IS NOT NULL OR shift_end IS NOT NULL);

-- Now add the constraints

-- Constraint: shift_end must be after shift_start if both are set
ALTER TABLE public.job_posts
DROP CONSTRAINT IF EXISTS job_posts_shift_order_check;

ALTER TABLE public.job_posts
ADD CONSTRAINT job_posts_shift_order_check
CHECK (
  shift_end IS NULL 
  OR shift_start IS NULL 
  OR shift_end > shift_start
);

-- Constraint: shift_cover listings must have shift_required=true and shift times
ALTER TABLE public.job_posts
DROP CONSTRAINT IF EXISTS job_posts_shift_cover_complete_check;

ALTER TABLE public.job_posts
ADD CONSTRAINT job_posts_shift_cover_complete_check
CHECK (
  listing_type != 'shift_cover' 
  OR (
    shift_required = true 
    AND shift_start IS NOT NULL 
    AND shift_end IS NOT NULL
  )
);

-- Constraint: non-shift_cover listings must have shift_required=false
ALTER TABLE public.job_posts
DROP CONSTRAINT IF EXISTS job_posts_non_shift_cover_check;

ALTER TABLE public.job_posts
ADD CONSTRAINT job_posts_non_shift_cover_check
CHECK (
  listing_type = 'shift_cover' 
  OR shift_required = false
);