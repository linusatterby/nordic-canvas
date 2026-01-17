-- Create demo_email_allowlist table
CREATE TABLE IF NOT EXISTS public.demo_email_allowlist (
  email text PRIMARY KEY,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS (no public access, only service role)
ALTER TABLE public.demo_email_allowlist ENABLE ROW LEVEL SECURITY;

-- Seed gameovermars@hotmail.com
INSERT INTO public.demo_email_allowlist (email) 
VALUES ('gameovermars@hotmail.com') 
ON CONFLICT DO NOTHING;

-- Create RPC to check if email is in allowlist
CREATE OR REPLACE FUNCTION public.is_demo_allowlisted(p_email text)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS(
    SELECT 1 FROM public.demo_email_allowlist 
    WHERE lower(email) = lower(p_email)
  );
$$;