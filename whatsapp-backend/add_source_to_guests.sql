-- Add source column to guests table if it doesn't exist
-- This column tracks the origin of guest updates (guest_link, manual_update, whatsapp)

-- Check if column exists, if not add it
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'guests' 
    AND column_name = 'source'
  ) THEN
    ALTER TABLE public.guests 
    ADD COLUMN source TEXT DEFAULT 'manual' 
    CHECK (source IN ('whatsapp', 'guest_link', 'manual', 'manual_add'));
    
    -- Update existing records to have default source
    UPDATE public.guests 
    SET source = 'manual' 
    WHERE source IS NULL;
    
    RAISE NOTICE 'Added source column to guests table';
  ELSE
    RAISE NOTICE 'source column already exists in guests table';
  END IF;
END $$;

