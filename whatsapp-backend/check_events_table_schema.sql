-- Check events table schema to verify user_id column type
-- Run this in Supabase SQL Editor to see the actual column type

-- Check column type
SELECT 
    column_name, 
    data_type, 
    character_maximum_length,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'events'
  AND column_name = 'user_id';

-- Check if there are any events and what user_id values look like
SELECT 
    id,
    user_id,
    pg_typeof(user_id) as user_id_type,
    couple_name,
    created_at
FROM public.events
LIMIT 10;

