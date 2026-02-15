
-- =============================================
-- 1) Create talent_shift_availability table
-- =============================================
CREATE TABLE public.talent_shift_availability (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  weekday INT NOT NULL CHECK (weekday >= 0 AND weekday <= 6),
  timeblock TEXT NOT NULL CHECK (timeblock IN ('morning', 'day', 'evening')),
  UNIQUE (user_id, weekday, timeblock)
);

CREATE INDEX idx_talent_shift_availability_user ON public.talent_shift_availability (user_id);

ALTER TABLE public.talent_shift_availability ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Talents can manage own shift availability"
  ON public.talent_shift_availability FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- =============================================
-- 2) Tighten RLS: Remove employer-via-matches policies
-- =============================================

-- talent_credentials: drop employer policy
DROP POLICY IF EXISTS "Employers can view matched talent credentials" ON public.talent_credentials;

-- talent_job_preferences: drop employer policy
DROP POLICY IF EXISTS "Employers can view matched talent job preferences" ON public.talent_job_preferences;
