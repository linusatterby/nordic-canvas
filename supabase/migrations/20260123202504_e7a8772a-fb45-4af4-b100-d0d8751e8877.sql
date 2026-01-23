-- Add Listing core fields to job_posts for multi-type listings
-- listing_type: job (default), shift_cover, housing
-- status: draft, published, matching, closed (expand from current published)
-- shift fields for shift_cover type
-- match_priority and tags for future AI ranking

-- Add listing_type column with CHECK constraint
ALTER TABLE public.job_posts 
ADD COLUMN IF NOT EXISTS listing_type text NOT NULL DEFAULT 'job';

-- Add CHECK constraint for listing_type
ALTER TABLE public.job_posts 
ADD CONSTRAINT job_posts_listing_type_check 
CHECK (listing_type IN ('job', 'shift_cover', 'housing'));

-- Ensure status column has expanded CHECK constraint
-- First drop existing constraint if any
ALTER TABLE public.job_posts 
DROP CONSTRAINT IF EXISTS job_posts_status_check;

-- Add new status CHECK constraint with pipeline states
ALTER TABLE public.job_posts 
ADD CONSTRAINT job_posts_status_check 
CHECK (status IN ('draft', 'published', 'matching', 'closed'));

-- Add shift-specific fields for shift_cover type
ALTER TABLE public.job_posts 
ADD COLUMN IF NOT EXISTS shift_start timestamptz NULL,
ADD COLUMN IF NOT EXISTS shift_end timestamptz NULL,
ADD COLUMN IF NOT EXISTS shift_required boolean NOT NULL DEFAULT false;

-- Add AI/ranking fields
ALTER TABLE public.job_posts 
ADD COLUMN IF NOT EXISTS match_priority int NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS tags text[] NULL;

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_job_posts_status_type_location 
ON public.job_posts (status, listing_type, location);

CREATE INDEX IF NOT EXISTS idx_job_posts_org_status 
ON public.job_posts (org_id, status);

CREATE INDEX IF NOT EXISTS idx_job_posts_housing 
ON public.job_posts (housing_offered) 
WHERE housing_offered = true;

-- Backfill: ensure all existing rows have listing_type='job' (already default)
-- and status is valid (should already be 'published')
UPDATE public.job_posts 
SET listing_type = 'job' 
WHERE listing_type IS NULL;

UPDATE public.job_posts 
SET status = 'published' 
WHERE status IS NULL OR status NOT IN ('draft', 'published', 'matching', 'closed');