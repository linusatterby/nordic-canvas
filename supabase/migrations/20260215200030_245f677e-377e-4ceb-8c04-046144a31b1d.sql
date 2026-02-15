
-- =========================================================
-- 1) credential_catalog (read-only reference table)
-- =========================================================
CREATE TABLE public.credential_catalog (
  code text PRIMARY KEY,
  label text NOT NULL,
  category text NOT NULL,
  is_common boolean NOT NULL DEFAULT true,
  sort_order int NOT NULL DEFAULT 100,
  active boolean NOT NULL DEFAULT true
);

ALTER TABLE public.credential_catalog ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read credential catalog"
  ON public.credential_catalog FOR SELECT
  USING (true);

-- No INSERT/UPDATE/DELETE policies → app cannot write

-- Seed credential catalog
INSERT INTO public.credential_catalog (code, label, category, sort_order) VALUES
  ('hlr_adult',            'HLR vuxen',                  'safety',     10),
  ('hlr_aed',              'HLR med hjärtstartare (AED)','safety',     11),
  ('fire_safety',          'Brandskyddsutbildning',      'safety',     12),
  ('evacuation_lead',      'Utrymningsledare',           'safety',     13),
  ('food_hygiene',         'Hygienpass (livsmedel)',      'food',       20),
  ('haccp_basic',          'HACCP grundkurs',             'food',       21),
  ('alcohol_responsible',  'Ansvarsfull alkoholservering','food',       22),
  ('drivers_license_b',    'Körkort B',                   'transport',  30),
  ('drivers_license_be',   'Körkort BE',                  'transport',  31),
  ('drivers_license_c',    'Körkort C',                   'transport',  32),
  ('forklift_ab',          'Truckförarutbildning A+B',    'transport',  33),
  ('snowmobile_license',   'Skoterkort',                  'mountain',   40),
  ('lift_operator',        'Liftskötarutbildning',        'mountain',   41),
  ('ski_instructor',       'Skidlärarutbildning',         'mountain',   42),
  ('chainsaw_license',     'Motorsågskörkort',            'operations', 50),
  ('working_at_heights',   'Fallskyddsutbildning',        'operations', 51),
  ('first_aid_outdoor',    'Första hjälpen frilufts',     'safety',     14);

-- =========================================================
-- 2) job_category_catalog (read-only reference table)
-- =========================================================
CREATE TABLE public.job_category_catalog (
  code text PRIMARY KEY,
  label text NOT NULL,
  sort_order int NOT NULL DEFAULT 100
);

ALTER TABLE public.job_category_catalog ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read job category catalog"
  ON public.job_category_catalog FOR SELECT
  USING (true);

INSERT INTO public.job_category_catalog (code, label, sort_order) VALUES
  ('service_bar',              'Servering & Bar',            10),
  ('kitchen_cafe',             'Kök & Café',                 20),
  ('reception_guest',          'Reception & Gästservice',    30),
  ('housekeeping',             'Housekeeping',               40),
  ('operations_maintenance',   'Drift & Underhåll',          50),
  ('event_conference',         'Event & Konferens',          60),
  ('mountain_activity',        'Fjäll & Aktivitet',          70),
  ('logistics_warehouse',     'Logistik & Lager',           80);

-- =========================================================
-- 3) credential_job_category_map (read-only mapping)
-- =========================================================
CREATE TABLE public.credential_job_category_map (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  credential_code text NOT NULL REFERENCES public.credential_catalog(code),
  job_category_code text NOT NULL REFERENCES public.job_category_catalog(code),
  weight int NOT NULL CHECK (weight BETWEEN 1 AND 3),
  kind text NOT NULL CHECK (kind IN ('required', 'recommended')),
  UNIQUE (credential_code, job_category_code, kind)
);

ALTER TABLE public.credential_job_category_map ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read credential job category map"
  ON public.credential_job_category_map FOR SELECT
  USING (true);

-- Seed mappings
INSERT INTO public.credential_job_category_map (credential_code, job_category_code, weight, kind) VALUES
  -- Servering & Bar
  ('alcohol_responsible', 'service_bar',           3, 'required'),
  ('food_hygiene',        'service_bar',           2, 'recommended'),
  ('hlr_aed',             'service_bar',           2, 'recommended'),
  -- Kök & Café
  ('food_hygiene',        'kitchen_cafe',          3, 'required'),
  ('haccp_basic',         'kitchen_cafe',          2, 'recommended'),
  ('hlr_adult',           'kitchen_cafe',          1, 'recommended'),
  -- Reception & Gästservice
  ('fire_safety',         'reception_guest',       2, 'recommended'),
  ('hlr_aed',             'reception_guest',       2, 'recommended'),
  -- Event & Konferens
  ('evacuation_lead',     'event_conference',      3, 'required'),
  ('hlr_aed',             'event_conference',      2, 'recommended'),
  ('alcohol_responsible', 'event_conference',      2, 'recommended'),
  -- Drift & Underhåll
  ('drivers_license_b',   'operations_maintenance',3, 'required'),
  ('fire_safety',         'operations_maintenance',2, 'recommended'),
  ('forklift_ab',         'operations_maintenance',2, 'recommended'),
  ('drivers_license_be',  'operations_maintenance',2, 'recommended'),
  -- Fjäll & Aktivitet
  ('snowmobile_license',  'mountain_activity',     3, 'required'),
  ('lift_operator',       'mountain_activity',     3, 'required'),
  ('ski_instructor',      'mountain_activity',     3, 'recommended'),
  ('hlr_aed',             'mountain_activity',     3, 'required'),
  -- Logistik & Lager
  ('forklift_ab',         'logistics_warehouse',   3, 'required'),
  ('drivers_license_b',   'logistics_warehouse',   2, 'recommended');
