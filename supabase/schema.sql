-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Users table (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Events table
CREATE TABLE IF NOT EXISTS public.events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  event_date TIMESTAMPTZ,
  location TEXT,
  public_view_enabled BOOLEAN DEFAULT false,
  public_view_password TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Guests table
CREATE TABLE IF NOT EXISTS public.guests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  phone TEXT,
  guest_count INTEGER DEFAULT 1,
  group_category TEXT,
  rsvp_status TEXT DEFAULT 'pending' CHECK (rsvp_status IN ('pending', 'confirmed', 'maybe', 'declined')),
  message_status TEXT DEFAULT 'not_sent' CHECK (message_status IN ('not_sent', 'sent', 'delivered', 'read', 'failed')),
  check_in_status TEXT DEFAULT 'not_arrived' CHECK (check_in_status IN ('not_arrived', 'arrived')),
  checked_in_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tables (seating)
CREATE TABLE IF NOT EXISTS public.tables (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  table_number INTEGER NOT NULL,
  capacity INTEGER NOT NULL DEFAULT 1,
  position_x INTEGER,
  position_y INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(event_id, table_number)
);

-- Table assignments (guest to table mapping)
CREATE TABLE IF NOT EXISTS public.table_assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  guest_id UUID NOT NULL REFERENCES public.guests(id) ON DELETE CASCADE,
  table_id UUID NOT NULL REFERENCES public.tables(id) ON DELETE CASCADE,
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(guest_id),
  UNIQUE(event_id, table_id, guest_id)
);

-- WhatsApp message templates
CREATE TABLE IF NOT EXISTS public.message_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  template_id TEXT, -- Meta template ID
  content TEXT NOT NULL,
  type TEXT DEFAULT 'invite' CHECK (type IN ('invite', 'reminder', 'thank_you', 'custom')),
  variables JSONB, -- Template variables like {{name}}, {{table_number}}
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- WhatsApp messages (message history)
CREATE TABLE IF NOT EXISTS public.whatsapp_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  guest_id UUID REFERENCES public.guests(id) ON DELETE SET NULL,
  template_id UUID REFERENCES public.message_templates(id) ON DELETE SET NULL,
  message_id TEXT, -- Meta WhatsApp message ID
  phone_number TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'delivered', 'read', 'failed')),
  content TEXT,
  error_message TEXT,
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- WhatsApp campaigns
CREATE TABLE IF NOT EXISTS public.whatsapp_campaigns (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  template_id UUID REFERENCES public.message_templates(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('invite_round_1', 'invite_round_2', 'invite_round_3', 'reminder', 'thank_you', 'custom')),
  target_status TEXT[], -- Array of RSVP statuses to target
  scheduled_at TIMESTAMPTZ,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'running', 'completed', 'cancelled')),
  total_recipients INTEGER DEFAULT 0,
  sent_count INTEGER DEFAULT 0,
  failed_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- QR codes
CREATE TABLE IF NOT EXISTS public.qr_codes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  guest_id UUID NOT NULL REFERENCES public.guests(id) ON DELETE CASCADE,
  code TEXT UNIQUE NOT NULL, -- Encrypted/signed QR code data
  qr_image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(guest_id)
);

-- Check-ins
CREATE TABLE IF NOT EXISTS public.check_ins (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  guest_id UUID NOT NULL REFERENCES public.guests(id) ON DELETE CASCADE,
  qr_code_id UUID REFERENCES public.qr_codes(id) ON DELETE SET NULL,
  checked_in_at TIMESTAMPTZ DEFAULT NOW(),
  scanner_device_id TEXT,
  UNIQUE(event_id, guest_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_events_user_id ON public.events(user_id);
CREATE INDEX IF NOT EXISTS idx_events_slug ON public.events(slug);
CREATE INDEX IF NOT EXISTS idx_guests_event_id ON public.guests(event_id);
CREATE INDEX IF NOT EXISTS idx_guests_rsvp_status ON public.guests(rsvp_status);
CREATE INDEX IF NOT EXISTS idx_guests_message_status ON public.guests(message_status);
CREATE INDEX IF NOT EXISTS idx_guests_check_in_status ON public.guests(check_in_status);
CREATE INDEX IF NOT EXISTS idx_guests_updated_at ON public.guests(updated_at);
CREATE INDEX IF NOT EXISTS idx_tables_event_id ON public.tables(event_id);
CREATE INDEX IF NOT EXISTS idx_table_assignments_event_id ON public.table_assignments(event_id);
CREATE INDEX IF NOT EXISTS idx_table_assignments_guest_id ON public.table_assignments(guest_id);
CREATE INDEX IF NOT EXISTS idx_table_assignments_table_id ON public.table_assignments(table_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_event_id ON public.whatsapp_messages(event_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_guest_id ON public.whatsapp_messages(guest_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_status ON public.whatsapp_messages(status);
CREATE INDEX IF NOT EXISTS idx_whatsapp_campaigns_event_id ON public.whatsapp_campaigns(event_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_campaigns_status ON public.whatsapp_campaigns(status);
CREATE INDEX IF NOT EXISTS idx_qr_codes_event_id ON public.qr_codes(event_id);
CREATE INDEX IF NOT EXISTS idx_qr_codes_guest_id ON public.qr_codes(guest_id);
CREATE INDEX IF NOT EXISTS idx_qr_codes_code ON public.qr_codes(code);
CREATE INDEX IF NOT EXISTS idx_check_ins_event_id ON public.check_ins(event_id);
CREATE INDEX IF NOT EXISTS idx_check_ins_guest_id ON public.check_ins(guest_id);

-- Row Level Security (RLS) Policies

-- Enable RLS on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.table_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.qr_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.check_ins ENABLE ROW LEVEL SECURITY;

-- Users policies
CREATE POLICY "Users can view own profile" ON public.users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON public.users
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.users
  FOR UPDATE USING (auth.uid() = id);

-- Events policies
CREATE POLICY "Users can view own events" ON public.events
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own events" ON public.events
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own events" ON public.events
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own events" ON public.events
  FOR DELETE USING (auth.uid() = user_id);

-- Guests policies
CREATE POLICY "Users can view guests of own events" ON public.guests
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.events
      WHERE events.id = guests.event_id
      AND events.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage guests of own events" ON public.guests
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.events
      WHERE events.id = guests.event_id
      AND events.user_id = auth.uid()
    )
  );

-- Tables policies
CREATE POLICY "Users can manage tables of own events" ON public.tables
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.events
      WHERE events.id = tables.event_id
      AND events.user_id = auth.uid()
    )
  );

-- Table assignments policies
CREATE POLICY "Users can manage assignments of own events" ON public.table_assignments
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.events
      WHERE events.id = table_assignments.event_id
      AND events.user_id = auth.uid()
    )
  );

-- Message templates policies
CREATE POLICY "Users can manage own templates" ON public.message_templates
  FOR ALL USING (auth.uid() = user_id);

-- WhatsApp messages policies
CREATE POLICY "Users can view messages of own events" ON public.whatsapp_messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.events
      WHERE events.id = whatsapp_messages.event_id
      AND events.user_id = auth.uid()
    )
  );

-- WhatsApp campaigns policies
CREATE POLICY "Users can manage campaigns of own events" ON public.whatsapp_campaigns
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.events
      WHERE events.id = whatsapp_campaigns.event_id
      AND events.user_id = auth.uid()
    )
  );

-- QR codes policies
CREATE POLICY "Users can view QR codes of own events" ON public.qr_codes
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.events
      WHERE events.id = qr_codes.event_id
      AND events.user_id = auth.uid()
    )
  );

-- Check-ins policies (read-only for event owners, insert for scanners)
CREATE POLICY "Users can view check-ins of own events" ON public.check_ins
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.events
      WHERE events.id = check_ins.event_id
      AND events.user_id = auth.uid()
    )
  );

CREATE POLICY "Service role can insert check-ins" ON public.check_ins
  FOR INSERT WITH CHECK (true); -- Will be validated in API route

-- Functions for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_events_updated_at BEFORE UPDATE ON public.events
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_guests_updated_at BEFORE UPDATE ON public.guests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tables_updated_at BEFORE UPDATE ON public.tables
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_message_templates_updated_at BEFORE UPDATE ON public.message_templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_whatsapp_messages_updated_at BEFORE UPDATE ON public.whatsapp_messages
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_whatsapp_campaigns_updated_at BEFORE UPDATE ON public.whatsapp_campaigns
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

