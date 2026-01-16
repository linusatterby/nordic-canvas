-- ============================================
-- Demo Seed: Trusted Circles Infrastructure
-- Creates circle links and org-level demo data
-- Note: Talent profiles require auth.users, so those must be created manually
-- ============================================

-- 1) Ensure demo orgs exist
INSERT INTO orgs (name, location, is_demo)
VALUES 
  ('Demo – Visby Strandhotell', 'Visby', true),
  ('Demo – Kneippbyn', 'Visby', true)
ON CONFLICT DO NOTHING;

-- 2) Create trusted circle link between demo orgs
INSERT INTO trusted_circle_links (org_a, org_b)
SELECT LEAST(a.id, b.id), GREATEST(a.id, b.id)
FROM orgs a, orgs b
WHERE a.name ILIKE '%Visby Strandhotell%' AND a.is_demo = true
  AND b.name ILIKE '%Kneippbyn%' AND b.is_demo = true
  AND a.id != b.id
ON CONFLICT (org_a, org_b) DO NOTHING;

-- 3) Ensure job posts exist for demo orgs
INSERT INTO job_posts (org_id, title, role_key, start_date, end_date, location, status, is_demo)
SELECT 
  o.id,
  'Demo Bartender Visby',
  'bartender',
  CURRENT_DATE,
  CURRENT_DATE + INTERVAL '90 days',
  'Visby',
  'published',
  true
FROM orgs o
WHERE o.is_demo = true AND o.name ILIKE '%Visby Strandhotell%'
  AND NOT EXISTS (
    SELECT 1 FROM job_posts jp WHERE jp.org_id = o.id AND jp.is_demo = true
  );

INSERT INTO job_posts (org_id, title, role_key, start_date, end_date, location, status, is_demo)
SELECT 
  o.id,
  'Demo Servitör Kneippbyn',
  'servitor',
  CURRENT_DATE,
  CURRENT_DATE + INTERVAL '90 days',
  'Visby',
  'published',
  true
FROM orgs o
WHERE o.is_demo = true AND o.name ILIKE '%Kneippbyn%'
  AND NOT EXISTS (
    SELECT 1 FROM job_posts jp WHERE jp.org_id = o.id AND jp.is_demo = true
  );

INSERT INTO job_posts (org_id, title, role_key, start_date, end_date, location, status, is_demo)
SELECT 
  o.id,
  'Demo Kock Visby',
  'kock',
  CURRENT_DATE,
  CURRENT_DATE + INTERVAL '60 days',
  'Visby',
  'published',
  true
FROM orgs o
WHERE o.is_demo = true AND o.name ILIKE '%Visby Strandhotell%'
  AND NOT EXISTS (
    SELECT 1 FROM job_posts jp WHERE jp.org_id = o.id AND jp.role_key = 'kock' AND jp.is_demo = true
  );