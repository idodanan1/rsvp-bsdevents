const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Initialize Supabase client
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing Supabase environment variables:');
  console.error('   SUPABASE_URL:', SUPABASE_URL ? '✅' : '❌');
  console.error('   SUPABASE_SERVICE_ROLE_KEY:', SUPABASE_SERVICE_ROLE_KEY ? '✅' : '❌');
  console.error('💡 Please set these in your .env file or Render Environment Variables');
}

const supabase = SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY
  ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
  : null;

// Helper function to check if Supabase is configured
function isSupabaseConfigured() {
  return supabase !== null;
}

// ========================================
// Events Functions
// ========================================

// Get all events
async function getAllEvents() {
  if (!isSupabaseConfigured()) {
    throw new Error('Supabase is not configured');
  }

  try {
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('❌ Error fetching all events from Supabase:', error);
    throw error;
  }
}

// Get events by user ID
async function getEventsByUserId(userId) {
  if (!isSupabaseConfigured()) {
    throw new Error('Supabase is not configured');
  }

  try {
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('❌ Error fetching events by userId from Supabase:', error);
    throw error;
  }
}

// Get event by ID
async function getEventById(eventId) {
  if (!isSupabaseConfigured()) {
    throw new Error('Supabase is not configured');
  }

  try {
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .eq('id', eventId)
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('❌ Error fetching event by ID from Supabase:', error);
    throw error;
  }
}

// Create or update event
async function upsertEvent(eventData) {
  if (!isSupabaseConfigured()) {
    throw new Error('Supabase is not configured');
  }

  try {
    const { data, error } = await supabase
      .from('events')
      .upsert(eventData, { onConflict: 'id' })
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('❌ Error upserting event to Supabase:', error);
    throw error;
  }
}

// Delete event
async function deleteEvent(eventId) {
  if (!isSupabaseConfigured()) {
    throw new Error('Supabase is not configured');
  }

  try {
    const { error } = await supabase
      .from('events')
      .delete()
      .eq('id', eventId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('❌ Error deleting event from Supabase:', error);
    throw error;
  }
}

// ========================================
// Guests Functions
// ========================================

// Get guests by event ID
async function getGuestsByEventId(eventId) {
  if (!isSupabaseConfigured()) {
    throw new Error('Supabase is not configured');
  }

  try {
    const { data, error } = await supabase
      .from('guests')
      .select('*')
      .eq('event_id', eventId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('❌ Error fetching guests by eventId from Supabase:', error);
    throw error;
  }
}

// Get guest by ID
async function getGuestById(guestId) {
  if (!isSupabaseConfigured()) {
    throw new Error('Supabase is not configured');
  }

  try {
    const { data, error } = await supabase
      .from('guests')
      .select('*')
      .eq('id', guestId)
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('❌ Error fetching guest by ID from Supabase:', error);
    throw error;
  }
}

// Create or update guest
async function upsertGuest(guestData) {
  if (!isSupabaseConfigured()) {
    throw new Error('Supabase is not configured');
  }

  try {
    const { data, error } = await supabase
      .from('guests')
      .upsert(guestData, { onConflict: 'id' })
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('❌ Error upserting guest to Supabase:', error);
    throw error;
  }
}

// Upsert multiple guests (batch)
async function upsertGuests(guestsArray) {
  if (!isSupabaseConfigured()) {
    throw new Error('Supabase is not configured');
  }

  try {
    // Supabase has a limit on batch size, so we'll chunk it
    const CHUNK_SIZE = 100;
    const results = [];

    for (let i = 0; i < guestsArray.length; i += CHUNK_SIZE) {
      const chunk = guestsArray.slice(i, i + CHUNK_SIZE);
      const { data, error } = await supabase
        .from('guests')
        .upsert(chunk, { onConflict: 'id' })
        .select();

      if (error) throw error;
      if (data) results.push(...data);
    }

    return results;
  } catch (error) {
    console.error('❌ Error upserting guests batch to Supabase:', error);
    throw error;
  }
}

// Delete guest
async function deleteGuest(guestId) {
  if (!isSupabaseConfigured()) {
    throw new Error('Supabase is not configured');
  }

  try {
    const { error } = await supabase
      .from('guests')
      .delete()
      .eq('id', guestId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('❌ Error deleting guest from Supabase:', error);
    throw error;
  }
}

// Update guest RSVP status
async function updateGuestRSVP(guestId, rsvpStatus, guestCount, responseDate) {
  if (!isSupabaseConfigured()) {
    throw new Error('Supabase is not configured');
  }

  try {
    const updateData = {
      rsvp_status: rsvpStatus,
      guest_count: guestCount,
      updated_at: new Date().toISOString()
    };

    if (responseDate) {
      updateData.response_date = responseDate;
    }

    const { data, error } = await supabase
      .from('guests')
      .update(updateData)
      .eq('id', guestId)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('❌ Error updating guest RSVP in Supabase:', error);
    throw error;
  }
}

// ========================================
// Helper Functions to Convert Between Formats
// ========================================

// Convert Supabase event to frontend format
function convertSupabaseEventToFrontend(supabaseEvent, guests = []) {
  return {
    id: supabaseEvent.id,
    userId: supabaseEvent.user_id,
    coupleName: supabaseEvent.couple_name,
    groomName: supabaseEvent.groom_name,
    brideName: supabaseEvent.bride_name,
    eventDate: supabaseEvent.event_date,
    eventType: supabaseEvent.event_type,
    eventTypeHebrew: supabaseEvent.event_type_hebrew,
    couplePhone: supabaseEvent.couple_phone,
    coupleEmail: supabaseEvent.couple_email,
    guests: guests,
    campaigns: [], // Will be loaded separately if needed
    tables: [], // Will be loaded separately if needed
    venueLayouts: [], // Will be loaded separately if needed
    createdAt: supabaseEvent.created_at,
    updatedAt: supabaseEvent.updated_at
  };
}

// Convert frontend event to Supabase format
function convertFrontendEventToSupabase(frontendEvent) {
  return {
    id: frontendEvent.id,
    user_id: frontendEvent.userId,
    couple_name: frontendEvent.coupleName || `${frontendEvent.groomName || ''} & ${frontendEvent.brideName || ''}`.trim() || 'ללא שם',
    groom_name: frontendEvent.groomName || null,
    bride_name: frontendEvent.brideName || null,
    event_date: frontendEvent.eventDate || null,
    event_type: frontendEvent.eventType || 'wedding',
    event_type_hebrew: frontendEvent.eventTypeHebrew || 'חתונה',
    couple_phone: frontendEvent.couplePhone || '',
    couple_email: frontendEvent.coupleEmail || null,
    created_at: frontendEvent.createdAt || new Date().toISOString(),
    updated_at: frontendEvent.updatedAt || new Date().toISOString()
  };
}

// Convert Supabase guest to frontend format
function convertSupabaseGuestToFrontend(supabaseGuest) {
  return {
    id: supabaseGuest.id,
    eventId: supabaseGuest.event_id,
    firstName: supabaseGuest.first_name,
    lastName: supabaseGuest.last_name,
    phoneNumber: supabaseGuest.phone_number,
    guestCount: supabaseGuest.guest_count,
    rsvpStatus: supabaseGuest.rsvp_status,
    actualAttendance: supabaseGuest.actual_attendance,
    tableId: supabaseGuest.table_id,
    messageStatus: supabaseGuest.message_status,
    notes: supabaseGuest.notes,
    channel: supabaseGuest.channel,
    tags: supabaseGuest.tags ? (typeof supabaseGuest.tags === 'string' ? JSON.parse(supabaseGuest.tags) : supabaseGuest.tags) : null,
    createdAt: supabaseGuest.created_at,
    updatedAt: supabaseGuest.updated_at,
    responseDate: supabaseGuest.response_date
  };
}

// Convert frontend guest to Supabase format
function convertFrontendGuestToSupabase(frontendGuest) {
  return {
    id: frontendGuest.id,
    event_id: frontendGuest.eventId,
    first_name: frontendGuest.firstName || '',
    last_name: frontendGuest.lastName || '',
    phone_number: frontendGuest.phoneNumber || '',
    guest_count: frontendGuest.guestCount || 1,
    rsvp_status: frontendGuest.rsvpStatus || 'pending',
    actual_attendance: frontendGuest.actualAttendance || 'not_marked',
    table_id: frontendGuest.tableId || null,
    message_status: frontendGuest.messageStatus || 'not_sent',
    notes: frontendGuest.notes || null,
    channel: frontendGuest.channel || 'manual',
    tags: frontendGuest.tags ? JSON.stringify(frontendGuest.tags) : null,
    created_at: frontendGuest.createdAt || new Date().toISOString(),
    updated_at: frontendGuest.updatedAt || new Date().toISOString()
  };
}

module.exports = {
  isSupabaseConfigured,
  getAllEvents,
  getEventsByUserId,
  getEventById,
  upsertEvent,
  deleteEvent,
  getGuestsByEventId,
  getGuestById,
  upsertGuest,
  upsertGuests,
  deleteGuest,
  updateGuestRSVP,
  convertSupabaseEventToFrontend,
  convertFrontendEventToSupabase,
  convertSupabaseGuestToFrontend,
  convertFrontendGuestToSupabase
};



