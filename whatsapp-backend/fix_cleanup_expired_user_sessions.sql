-- Fix: Add SET search_path to cleanup_expired_user_sessions function
-- This fixes the security warning: search_path not set for the function

-- First, check if the function exists and drop it if it does
DROP FUNCTION IF EXISTS public.cleanup_expired_user_sessions();

-- Recreate the function with SET search_path for security
CREATE OR REPLACE FUNCTION public.cleanup_expired_user_sessions()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Delete expired user sessions
  DELETE FROM public.user_sessions
  WHERE expires_at < NOW();
  
  -- Log the cleanup (optional)
  RAISE NOTICE 'Cleaned up expired user sessions';
END;
$$;

-- Grant execute permission if needed
GRANT EXECUTE ON FUNCTION public.cleanup_expired_user_sessions() TO authenticated;
GRANT EXECUTE ON FUNCTION public.cleanup_expired_user_sessions() TO service_role;

