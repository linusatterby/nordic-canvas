-- Add availability date columns to profiles for talent availability
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS available_from date,
ADD COLUMN IF NOT EXISTS available_to date;

-- Comment for clarity
COMMENT ON COLUMN public.profiles.available_from IS 'Start date when talent is available for work';
COMMENT ON COLUMN public.profiles.available_to IS 'End date when talent is available for work';