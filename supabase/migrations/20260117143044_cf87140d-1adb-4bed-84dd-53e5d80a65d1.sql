-- ==========================================
-- Seed 6 demo jobs for talent swipe feature
-- ==========================================

-- First, get the demo org ID to link jobs to
-- We'll use a variable approach with DO block

DO $$
DECLARE
  v_demo_org_id uuid;
BEGIN
  -- Get the demo org ID
  SELECT id INTO v_demo_org_id FROM public.orgs WHERE is_demo = true LIMIT 1;
  
  IF v_demo_org_id IS NULL THEN
    RAISE NOTICE 'No demo org found, creating one';
    INSERT INTO public.orgs (name, location, is_demo)
    VALUES ('Demo Hotell AB', 'Visby', true)
    RETURNING id INTO v_demo_org_id;
  END IF;

  -- Jobb 1: Servis Visby (sommar)
  INSERT INTO public.job_posts (org_id, title, role_key, location, start_date, end_date, housing_offered, status, is_demo)
  VALUES (
    v_demo_org_id,
    'Servis – Innerstaden Visby (sommar)',
    'Servering',
    'Visby',
    '2025-06-01',
    '2025-08-31',
    true,
    'published',
    true
  )
  ON CONFLICT DO NOTHING;

  -- Jobb 2: Frukostvärd Visby
  INSERT INTO public.job_posts (org_id, title, role_key, location, start_date, end_date, housing_offered, status, is_demo)
  VALUES (
    v_demo_org_id,
    'Frukostvärd – Hotell (Visby)',
    'Hotell/Frukost',
    'Visby',
    '2025-05-15',
    '2025-09-15',
    false,
    'published',
    true
  )
  ON CONFLICT DO NOTHING;

  -- Jobb 3: Kock Visby
  INSERT INTO public.job_posts (org_id, title, role_key, location, start_date, end_date, housing_offered, status, is_demo)
  VALUES (
    v_demo_org_id,
    'Kock (à la carte) – Restaurang vid hamnen',
    'Kök',
    'Visby',
    '2025-06-01',
    '2025-08-31',
    true,
    'published',
    true
  )
  ON CONFLICT DO NOTHING;

  -- Jobb 4: Disk/Runner Visby
  INSERT INTO public.job_posts (org_id, title, role_key, location, start_date, end_date, housing_offered, status, is_demo)
  VALUES (
    v_demo_org_id,
    'Disk/Runner – Peak hours (extra timmar)',
    'Disk/Runner',
    'Visby',
    '2025-07-01',
    '2025-08-15',
    false,
    'published',
    true
  )
  ON CONFLICT DO NOTHING;

  -- Jobb 5: Liftvärd Åre
  INSERT INTO public.job_posts (org_id, title, role_key, location, start_date, end_date, housing_offered, status, is_demo)
  VALUES (
    v_demo_org_id,
    'Liftvärd – Fjällstation (vinter)',
    'Lift/Skidort',
    'Åre',
    '2025-12-01',
    '2026-04-15',
    true,
    'published',
    true
  )
  ON CONFLICT DO NOTHING;

  -- Jobb 6: Housekeeping Sälen
  INSERT INTO public.job_posts (org_id, title, role_key, location, start_date, end_date, housing_offered, status, is_demo)
  VALUES (
    v_demo_org_id,
    'Housekeeping – Resort (vinter)',
    'Housekeeping',
    'Sälen',
    '2025-11-15',
    '2026-03-30',
    true,
    'published',
    true
  )
  ON CONFLICT DO NOTHING;

END $$;

-- ==========================================
-- Create RPC to reset talent job swipes for demo jobs
-- ==========================================
CREATE OR REPLACE FUNCTION public.reset_talent_demo_swipes()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_count_deleted int := 0;
BEGIN
  -- Get the current user
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;
  
  -- Delete talent's swipes on demo jobs
  DELETE FROM public.talent_job_swipes
  WHERE talent_user_id = v_user_id
    AND job_post_id IN (
      SELECT id FROM public.job_posts WHERE is_demo = true
    );
  
  GET DIAGNOSTICS v_count_deleted = ROW_COUNT;
  
  RETURN jsonb_build_object(
    'success', true,
    'message', 'Demo swipes reset successfully',
    'deleted_count', v_count_deleted
  );
END;
$$;