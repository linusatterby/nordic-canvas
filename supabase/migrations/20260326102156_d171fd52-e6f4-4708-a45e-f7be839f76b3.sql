-- Add unique constraint on org_members for upsert support
-- Check if it exists first (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'org_members_org_id_user_id_key'
  ) THEN
    ALTER TABLE public.org_members ADD CONSTRAINT org_members_org_id_user_id_key UNIQUE (org_id, user_id);
  END IF;
END $$;