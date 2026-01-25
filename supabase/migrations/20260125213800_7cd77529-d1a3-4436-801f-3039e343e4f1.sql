-- Admin Audit Log: Opt-in, read-only default
-- This is an internal log for tracking admin health check usage

-- 1. Create admin_audit_log table
CREATE TABLE public.admin_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id uuid NOT NULL,
  action text NOT NULL CHECK (action IN ('health_opened', 'health_check_run')),
  metadata jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Index for lookups
CREATE INDEX idx_admin_audit_log_user_created ON public.admin_audit_log(admin_user_id, created_at DESC);

-- Enable RLS with deny-all for client access
ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;

-- Deny all client access (read-only via admin tools only)
CREATE POLICY "No client access to admin_audit_log"
  ON public.admin_audit_log FOR ALL
  USING (false)
  WITH CHECK (false);

-- 2. Create RPC for logging admin audit events (SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.log_admin_audit(
  p_action text,
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_is_admin boolean;
  v_log_id uuid;
BEGIN
  -- Must be authenticated
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'reason', 'not_authenticated');
  END IF;
  
  -- Check if user is an admin/employer (using org membership as proxy for now)
  -- In production, you'd check a proper admin role
  SELECT EXISTS (
    SELECT 1 FROM org_members WHERE user_id = v_user_id
  ) INTO v_is_admin;
  
  IF NOT v_is_admin THEN
    RETURN jsonb_build_object('success', false, 'reason', 'not_admin');
  END IF;
  
  -- Validate action
  IF p_action NOT IN ('health_opened', 'health_check_run') THEN
    RETURN jsonb_build_object('success', false, 'reason', 'invalid_action');
  END IF;
  
  -- Insert audit log
  INSERT INTO admin_audit_log (admin_user_id, action, metadata)
  VALUES (v_user_id, p_action, p_metadata)
  RETURNING id INTO v_log_id;
  
  RETURN jsonb_build_object('success', true, 'log_id', v_log_id);
END;
$$;