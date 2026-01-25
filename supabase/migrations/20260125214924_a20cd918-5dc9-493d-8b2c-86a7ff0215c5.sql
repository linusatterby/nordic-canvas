-- =====================================================
-- Host/Boende v0: Schema changes only (Part 1)
-- =====================================================

-- 1. Extend profiles.type to include 'host'
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_type_check;
ALTER TABLE public.profiles
ADD CONSTRAINT profiles_type_check
CHECK (type IN ('talent', 'employer', 'both', 'host'));

-- 2. Add housing-specific fields to job_posts
ALTER TABLE public.job_posts
ADD COLUMN IF NOT EXISTS rent_per_month numeric NULL,
ADD COLUMN IF NOT EXISTS rooms numeric NULL,
ADD COLUMN IF NOT EXISTS furnished boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS available_from date NULL,
ADD COLUMN IF NOT EXISTS available_to date NULL,
ADD COLUMN IF NOT EXISTS deposit numeric NULL,
ADD COLUMN IF NOT EXISTS approx_area text NULL,
ADD COLUMN IF NOT EXISTS contact_preference text NULL,
ADD COLUMN IF NOT EXISTS host_user_id uuid NULL;

-- Create indexes for housing queries
CREATE INDEX IF NOT EXISTS idx_job_posts_housing_type 
ON public.job_posts (listing_type, status, location)
WHERE listing_type = 'housing';

CREATE INDEX IF NOT EXISTS idx_job_posts_host_user
ON public.job_posts (host_user_id, created_at DESC)
WHERE host_user_id IS NOT NULL;

-- 3. Extend threads table for housing conversations
ALTER TABLE public.threads
ADD COLUMN IF NOT EXISTS thread_type text NOT NULL DEFAULT 'match',
ADD COLUMN IF NOT EXISTS housing_listing_id uuid NULL,
ADD COLUMN IF NOT EXISTS host_user_id uuid NULL,
ADD COLUMN IF NOT EXISTS talent_user_id uuid NULL;

-- Add constraint for thread_type
ALTER TABLE public.threads DROP CONSTRAINT IF EXISTS threads_type_check;
ALTER TABLE public.threads
ADD CONSTRAINT threads_type_check
CHECK (thread_type IN ('match', 'housing'));

-- Unique constraint for housing threads
CREATE UNIQUE INDEX IF NOT EXISTS idx_threads_housing_unique
ON public.threads (thread_type, housing_listing_id, host_user_id, talent_user_id)
WHERE thread_type = 'housing';

-- Make match_id nullable for housing threads
ALTER TABLE public.threads ALTER COLUMN match_id DROP NOT NULL;