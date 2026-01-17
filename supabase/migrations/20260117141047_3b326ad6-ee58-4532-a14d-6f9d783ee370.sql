-- Create demo_accounts table to track demo users
CREATE TABLE IF NOT EXISTS public.demo_accounts (
  user_id uuid PRIMARY KEY,
  role text CHECK (role IN ('talent', 'employer')) NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.demo_accounts ENABLE ROW LEVEL SECURITY;

-- Users can view their own demo status
CREATE POLICY "Users can view own demo status"
ON public.demo_accounts FOR SELECT
USING (auth.uid() = user_id);

-- RPC to mark current user as demo (called on login if email contains +demo)
CREATE OR REPLACE FUNCTION public.mark_me_as_demo(p_role text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Upsert into demo_accounts
  INSERT INTO demo_accounts (user_id, role)
  VALUES (auth.uid(), p_role)
  ON CONFLICT (user_id) DO UPDATE SET role = COALESCE(EXCLUDED.role, demo_accounts.role);
  
  -- Update profiles.is_demo
  UPDATE profiles
  SET is_demo = true
  WHERE user_id = auth.uid() AND (is_demo = false OR is_demo IS NULL);
  
  RETURN jsonb_build_object('success', true, 'user_id', auth.uid());
END;
$$;