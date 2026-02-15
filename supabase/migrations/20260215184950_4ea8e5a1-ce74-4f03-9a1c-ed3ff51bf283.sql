
-- Create the update_updated_at_column function first
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- =============================================
-- 1) talent_credentials
-- =============================================
CREATE TABLE public.talent_credentials (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  credential_type TEXT NOT NULL,
  label TEXT,
  issuer TEXT,
  issued_at DATE,
  expires_at DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.talent_credentials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Talents can manage own credentials"
  ON public.talent_credentials FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Employers can view matched talent credentials"
  ON public.talent_credentials FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM matches m
    WHERE m.talent_user_id = talent_credentials.user_id
      AND is_org_member(auth.uid(), m.org_id)
  ));

CREATE TRIGGER update_talent_credentials_updated_at
  BEFORE UPDATE ON public.talent_credentials
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- 2) talent_job_preferences
-- =============================================
CREATE TABLE public.talent_job_preferences (
  user_id UUID NOT NULL PRIMARY KEY,
  wants_permanent BOOLEAN NOT NULL DEFAULT false,
  wants_seasonal BOOLEAN NOT NULL DEFAULT false,
  wants_extra_shifts BOOLEAN NOT NULL DEFAULT false,
  permanent_earliest_start DATE,
  seasonal_from DATE,
  seasonal_to DATE,
  extra_weekdays TEXT[] DEFAULT '{}',
  extra_timeblocks TEXT[] DEFAULT '{}',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.talent_job_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Talents can manage own job preferences"
  ON public.talent_job_preferences FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Employers can view matched talent job preferences"
  ON public.talent_job_preferences FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM matches m
    WHERE m.talent_user_id = talent_job_preferences.user_id
      AND is_org_member(auth.uid(), m.org_id)
  ));

CREATE TRIGGER update_talent_job_preferences_updated_at
  BEFORE UPDATE ON public.talent_job_preferences
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
