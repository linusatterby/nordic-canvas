-- Add UNIQUE constraint to prevent duplicate swipes
ALTER TABLE public.talent_job_swipes
ADD CONSTRAINT talent_job_swipes_unique_swipe UNIQUE (talent_user_id, job_post_id);