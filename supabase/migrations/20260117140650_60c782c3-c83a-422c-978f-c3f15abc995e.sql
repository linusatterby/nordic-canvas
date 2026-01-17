-- Add is_demo flag to profiles table
ALTER TABLE public.profiles ADD COLUMN is_demo boolean NOT NULL DEFAULT false;

-- Update existing demo talents (if any exist with known demo emails)
UPDATE public.profiles 
SET is_demo = true 
WHERE user_id IN (
  SELECT id FROM auth.users 
  WHERE email LIKE '%+demo%' OR email IN ('gameovermars@hotmail.com', 'demo.talent@example.com')
);