-- Enable realtime for messages and shift_bookings
-- Using defensive approach to avoid errors if already added

DO $$
BEGIN
  -- Add messages to realtime publication
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND schemaname = 'public' 
    AND tablename = 'messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
  END IF;
EXCEPTION WHEN duplicate_object THEN
  NULL; -- Already exists, ignore
END $$;

DO $$
BEGIN
  -- Add shift_bookings to realtime publication
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND schemaname = 'public' 
    AND tablename = 'shift_bookings'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.shift_bookings;
  END IF;
EXCEPTION WHEN duplicate_object THEN
  NULL; -- Already exists, ignore
END $$;