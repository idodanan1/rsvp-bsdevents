-- Create pending_guest_updates table for tracking guest status updates
-- This table stores pending updates that need to be processed

CREATE TABLE IF NOT EXISTS public.pending_guest_updates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  guest_id UUID REFERENCES public.guests(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  phone_number TEXT NOT NULL,
  rsvp_status TEXT CHECK (rsvp_status IN ('confirmed', 'declined', 'maybe')),
  guest_count INTEGER,
  actual_attendance TEXT CHECK (actual_attendance IN ('not_marked', 'attended', 'not_attended')),
  source TEXT DEFAULT 'manual' CHECK (source IN ('whatsapp', 'guest_link', 'manual', 'manual_add')),
  response_date TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_pending_guest_updates_guest_id ON public.pending_guest_updates(guest_id);
CREATE INDEX IF NOT EXISTS idx_pending_guest_updates_event_id ON public.pending_guest_updates(event_id);
CREATE INDEX IF NOT EXISTS idx_pending_guest_updates_phone_number ON public.pending_guest_updates(phone_number);
CREATE INDEX IF NOT EXISTS idx_pending_guest_updates_created_at ON public.pending_guest_updates(created_at);

-- Enable RLS
ALTER TABLE public.pending_guest_updates ENABLE ROW LEVEL SECURITY;

-- Policy: Service role can manage all pending updates
CREATE POLICY "Service role can manage pending updates" ON public.pending_guest_updates
  FOR ALL USING (true);

-- Trigger for updated_at
CREATE TRIGGER update_pending_guest_updates_updated_at BEFORE UPDATE ON public.pending_guest_updates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

