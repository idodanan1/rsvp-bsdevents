-- Fix: Add SET search_path to cleanup functions
-- This fixes the security warnings: search_path not set for the functions

-- ========================================
-- Fix 1: cleanup_expired_user_sessions
-- ========================================
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

-- ========================================
-- Fix 2: cleanup_expired_verification_codes
-- ========================================
-- First, check if the function exists and drop it if it does
DROP FUNCTION IF EXISTS public.cleanup_expired_verification_codes();

-- Recreate the function with SET search_path for security
CREATE OR REPLACE FUNCTION public.cleanup_expired_verification_codes()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Delete expired verification codes
  DELETE FROM public.verification_codes
  WHERE expires_at < NOW() OR created_at < NOW() - INTERVAL '24 hours';
  
  -- Log the cleanup (optional)
  RAISE NOTICE 'Cleaned up expired verification codes';
END;
$$;

-- Grant execute permission if needed
GRANT EXECUTE ON FUNCTION public.cleanup_expired_verification_codes() TO authenticated;
GRANT EXECUTE ON FUNCTION public.cleanup_expired_verification_codes() TO service_role;

-- ========================================
-- Fix 3: update_updated_at_column
-- ========================================
-- First, drop all triggers that use this function
DROP TRIGGER IF EXISTS update_users_updated_at ON public.users;
DROP TRIGGER IF EXISTS update_events_updated_at ON public.events;
DROP TRIGGER IF EXISTS update_guests_updated_at ON public.guests;
DROP TRIGGER IF EXISTS update_tables_updated_at ON public.tables;
DROP TRIGGER IF EXISTS update_message_templates_updated_at ON public.message_templates;
DROP TRIGGER IF EXISTS update_whatsapp_messages_updated_at ON public.whatsapp_messages;
DROP TRIGGER IF EXISTS update_whatsapp_campaigns_updated_at ON public.whatsapp_campaigns;

-- Drop the function if it exists
DROP FUNCTION IF EXISTS public.update_updated_at_column();

-- Recreate the function with SET search_path for security
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Recreate all triggers
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_events_updated_at BEFORE UPDATE ON public.events
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_guests_updated_at BEFORE UPDATE ON public.guests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_tables_updated_at BEFORE UPDATE ON public.tables
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_message_templates_updated_at BEFORE UPDATE ON public.message_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_whatsapp_messages_updated_at BEFORE UPDATE ON public.whatsapp_messages
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_whatsapp_campaigns_updated_at BEFORE UPDATE ON public.whatsapp_campaigns
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

