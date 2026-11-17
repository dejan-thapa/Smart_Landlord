-- Create table to store WhatsApp Baileys session files for cloud persistence
CREATE TABLE IF NOT EXISTS public.whatsapp_sessions (
  id text PRIMARY KEY,
  data text NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS and service role access
ALTER TABLE public.whatsapp_sessions ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'whatsapp_sessions' AND policyname = 'Allow service role full access to whatsapp_sessions'
  ) THEN
    CREATE POLICY "Allow service role full access to whatsapp_sessions"
      ON public.whatsapp_sessions
      FOR ALL
      TO service_role
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;
