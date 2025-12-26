import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { useEventStore } from '../store/eventStore';
import { calculateEventStats, formatDate, formatDateTime, getStatusIcon, getStatusColor, formatFullName } from '../utils/helpers';
import { webhookService } from '../services/webhookService';

// Helper function to map Supabase DB fields to frontend format
function mapSupabaseToFrontend(data: any): any {
  if (!data) return data;
  
  // Map event fields
  if (data.couple_name) {
    data.coupleName = data.couple_name;
  }
  if (data.event_date) {
    data.eventDate = data.event_date;
  }
  if (data.groom_name) {
    data.groomName = data.groom_name;
  }
  if (data.bride_name) {
    data.brideName = data.bride_name;
  }
  if (data.event_type) {
    data.eventType = data.event_type;
  }
  if (data.event_type_hebrew) {
    data.eventTypeHebrew = data.event_type_hebrew;
  }
  if (data.couple_phone) {
    data.couplePhone = data.couple_phone;
  }
  if (data.couple_email) {
    data.coupleEmail = data.couple_email;
  }
  if (data.created_at) {
    data.createdAt = data.created_at;
  }
  if (data.updated_at) {
    data.updatedAt = data.updated_at;
  }
  
  // Map guest fields if guests array exists
  if (data.guests && Array.isArray(data.guests)) {
    data.guests = data.guests.map((guest: any) => ({
      ...guest,
      // Map DB fields to frontend format
      rsvpStatus: guest.rsvp_status || guest.rsvpStatus || guest.status || 'pending',
      status: guest.rsvp_status || guest.rsvpStatus || guest.status || 'pending', // Also provide as status for compatibility
      guestCount: guest.guest_count !== undefined ? guest.guest_count : (guest.guestCount !== undefined ? guest.guestCount : 1),
      guestsCount: guest.guest_count !== undefined ? guest.guest_count : (guest.guestCount !== undefined ? guest.guestCount : 1), // Also provide as guestsCount for compatibility
      firstName: guest.first_name || guest.firstName || '',
      lastName: guest.last_name || guest.lastName || '',
      phoneNumber: guest.phone_number || guest.phoneNumber || '',
      actualAttendance: guest.actual_attendance || guest.actualAttendance || 'not_marked',
      tableId: guest.table_id || guest.tableId || null,
      messageStatus: guest.message_status || guest.messageStatus || 'not_sent',
      responseDate: guest.response_date || guest.responseDate || null,
      eventId: guest.event_id || guest.eventId || data.id,
      createdAt: guest.created_at || guest.createdAt,
      updatedAt: guest.updated_at || guest.updatedAt
    }));
  }
  
  return data;
}

// Helper function to parse and display guest notes with transportation
const renderGuestNotes = (notes: string | undefined) => {
  if (!notes || notes.trim() === '') return null;
  
  // Remove any transportation-related text (old format or new format)
  // Match patterns like "| הסעה דרום", "| הסעה צפון", "| אין צורך בהסעה", or just "הסעה"
  let regularNotes = notes
    .replace(/\|\s*(הסעה דרום|הסעה צפון|אין צורך בהסעה)/g, '')
    .replace(/הסעה\s*$/g, '')
    .replace(/הסעה\s*\|\s*/g, '')
    .trim();
  
  // Only show notes if there's actual content after removing transportation
  if (!regularNotes || regularNotes.length === 0) return null;
  
  return (
    <div className="text-xs text-gray-600 break-words mt-1 whitespace-normal">
      <span className="font-medium text-gray-700">הערה:</span> {regularNotes}
    </div>
  );
};

const ClientDashboard: React.FC = () => {
  const { eventId } = useParams<{ eventId: string }>();
  const { events, fetchEvents } = useEventStore();
  const [currentEvent, setCurrentEvent] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false); // Start with false - show page immediately
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'confirmed' | 'declined' | 'maybe' | 'pending'>('all');
  const [messageFilterStatus, setMessageFilterStatus] = useState<'all' | 'not_sent' | 'sent' | 'delivered' | 'failed' | 'sent_not_delivered'>('all');
  const pollingIntervalRef = useRef<number | null>(null);
  const isPollingRef = useRef(false);

  useEffect(() => {
    if (!eventId) {
      return;
    }
    
    console.log(`🔍 ClientDashboard loading event silently: ${eventId}`);
    
    // CRITICAL: Try to load from localStorage FIRST (even on new device) - might have data from previous session
    // This is important because API might return incomplete data for large events
    let eventFromStorage: any = null;
    try {
      const stored = localStorage.getItem('rsvp-events-storage');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.state && parsed.state.events) {
          eventFromStorage = parsed.state.events.find((e: any) => e.id === eventId);
          if (eventFromStorage) {
            const displayName = eventFromStorage.coupleName || 
              (eventFromStorage.groomName && eventFromStorage.brideName ? `${eventFromStorage.groomName} & ${eventFromStorage.brideName}` : 
               eventFromStorage.groomName || eventFromStorage.brideName || 'אירוע');
            console.log(`✅ Found event in localStorage: ${displayName} - ${eventFromStorage.guests?.length || 0} guests`);
            console.log(`🔍 Event details from localStorage:`, {
              coupleName: eventFromStorage.coupleName,
              groomName: eventFromStorage.groomName,
              brideName: eventFromStorage.brideName,
              eventDate: eventFromStorage.eventDate,
              venue: eventFromStorage.venue,
              guestsCount: eventFromStorage.guests?.length || 0,
              updatedAt: eventFromStorage.updatedAt
            });
          }
        }
      }
    } catch (error: any) {
      console.error('Error parsing localStorage:', error);
    }
    
    // Try to find event in current events (for fast initial display)
    const event = events.find((e: any) => e.id === eventId);
    if (event) {
      const displayName = event.coupleName || 
        (event.groomName && event.brideName ? `${event.groomName} & ${event.brideName}` : 
         event.groomName || event.brideName || 'אירוע');
      console.log(`✅ Found event in store: ${displayName} - ${event.guests?.length || 0} guests`);
      console.log(`🔍 Event details:`, {
        coupleName: event.coupleName,
        groomName: event.groomName,
        brideName: event.brideName,
        eventDate: event.eventDate,
        venue: event.venue,
        guestsCount: event.guests?.length || 0,
        updatedAt: event.updatedAt
      });
      
      // CRITICAL: Prefer store over localStorage if both exist (store is more up-to-date)
      setCurrentEvent((prev: any) => {
        if (!prev) {
          return event;
        }
        
        // Compare updatedAt timestamps
        const prevUpdatedAt = prev.updatedAt ? (prev.updatedAt instanceof Date ? prev.updatedAt.getTime() : new Date(prev.updatedAt).getTime()) : 0;
        const newUpdatedAt = event.updatedAt ? (event.updatedAt instanceof Date ? event.updatedAt.getTime() : new Date(event.updatedAt).getTime()) : 0;
        
        if (newUpdatedAt >= prevUpdatedAt) {
          console.log('✅ Updating from store (newer or same timestamp)');
          return event;
        } else {
          console.log('⚠️ Ignoring store data (older than current)');
          return prev; // Keep current (newer) data
        }
      });
      // Continue to load from API to get latest data
    } else if (eventFromStorage) {
      // Use localStorage data if store doesn't have it
      const displayName = eventFromStorage.coupleName || 
        (eventFromStorage.groomName && eventFromStorage.brideName ? `${eventFromStorage.groomName} & ${eventFromStorage.brideName}` : 
         eventFromStorage.groomName || eventFromStorage.brideName || 'אירוע');
      console.log(`✅ Using event from localStorage: ${displayName} - ${eventFromStorage.guests?.length || 0} guests`);
      
      setCurrentEvent((prev: any) => {
        if (!prev) {
          // CRITICAL: Ensure guests array exists
          return {
            ...eventFromStorage,
            guests: eventFromStorage.guests || []
          };
        }
        
        // Compare updatedAt timestamps
        const prevUpdatedAt = prev.updatedAt ? (prev.updatedAt instanceof Date ? prev.updatedAt.getTime() : new Date(prev.updatedAt).getTime()) : 0;
        const newUpdatedAt = eventFromStorage.updatedAt ? (eventFromStorage.updatedAt instanceof Date ? eventFromStorage.updatedAt.getTime() : new Date(eventFromStorage.updatedAt).getTime()) : 0;
        
        if (newUpdatedAt >= prevUpdatedAt) {
          console.log('✅ Updating from localStorage (newer or same timestamp)');
          // CRITICAL: Merge to preserve fields and ensure guests array exists
          return {
            ...prev,
            ...eventFromStorage,
            coupleName: eventFromStorage.coupleName || prev.coupleName,
            campaigns: eventFromStorage.campaigns || prev.campaigns || [],
            tables: eventFromStorage.tables || prev.tables || [],
            venueLayout: eventFromStorage.venueLayout || prev.venueLayout,
            eventImages: eventFromStorage.eventImages || prev.eventImages || [],
            guests: eventFromStorage.guests || prev.guests || []
          };
        } else {
          console.log('⚠️ Ignoring localStorage data (older than current)');
          return prev; // Keep current (newer) data
        }
      });
    }
    
    // CRITICAL: Always load from public API endpoint to get latest data (backend is source of truth)
    // This ensures we always have the most up-to-date data, even if event was found in store/localStorage
    const loadFromAPI = async (retryCount = 0) => {
      const MAX_RETRIES = 3;
      const RETRY_DELAY = 2000; // 2 seconds between retries
      
      try {
        const BACKEND_URL = (process.env as any).NEXT_PUBLIC_BACKEND_URL || (process.env as any).VITE_BACKEND_URL || 'https://whatsapp-backend-enfz.onrender.com';
        console.log(`🔄 Loading from API (attempt ${retryCount + 1}/${MAX_RETRIES + 1}), BACKEND_URL: ${BACKEND_URL}`);
        
        // CRITICAL: Use /api/events/all FIRST - this endpoint works reliably
        // The /api/events/:eventId endpoint has issues on Render (returns wrong format)
        let foundEvent: any = null;
        try {
          console.log(`🔄 Loading all events from: ${BACKEND_URL}/api/events/all`);
          const allEventsResponse = await fetch(`${BACKEND_URL}/api/events/all`, {
            method: 'GET',
            headers: { 
              'Content-Type': 'application/json',
              'Accept': 'application/json'
            },
            mode: 'cors',
            credentials: 'omit'
          });
          
          console.log(`🔍 All events response status: ${allEventsResponse.status} ${allEventsResponse.statusText}`);
          
          if (allEventsResponse.ok) {
            const allEventsData = await allEventsResponse.json();
            const allEvents = allEventsData.events || [];
            console.log(`🔍 All events response: ${allEvents.length} events`);
            console.log(`🔍 Looking for eventId: ${eventId}`);
            console.log(`🔍 Available event IDs:`, allEvents.map((e: any) => e.id));
            
            // Find the event in the array
            foundEvent = allEvents.find((e: any) => e.id === eventId);
            
            if (foundEvent) {
              const guestsCount = foundEvent.guests?.length || 0;
              console.log(`✅ Found event in /api/events/all with ${guestsCount} guests`);
              console.log(`🔍 Event name: ${foundEvent.coupleName || (foundEvent.groomName && foundEvent.brideName ? `${foundEvent.groomName} & ${foundEvent.brideName}` : foundEvent.groomName || foundEvent.brideName || 'אירוע')}`);
              
              // CRITICAL: Log guest details for debugging
              if (guestsCount > 0) {
                console.log(`🔍 First few guests:`, foundEvent.guests.slice(0, 3).map((g: any) => ({ id: g.id, name: g.firstName + ' ' + g.lastName })));
              }
            } else {
              console.warn(`⚠️ Event ${eventId} not found in /api/events/all`);
            }
          } else {
            console.warn(`⚠️ All events endpoint returned ${allEventsResponse.status}`);
          }
        } catch (error: any) {
          console.error(`❌ All events endpoint error:`, error);
        }
        
        // CRITICAL: ALWAYS try to load guests from /api/events/:eventId/guests endpoint
        // This endpoint returns only the guests array, which should not be truncated
        // This is the PRIMARY method for getting all guests for large events
        // We'll try this multiple times if needed
        let fullGuestsList: any[] | null = null;
        const loadGuestsFromEndpoint = async (retryCount = 0): Promise<any[] | null> => {
          const MAX_RETRIES = 3;
          const RETRY_DELAY = 1000;
          
        try {
            console.log(`🔄 Attempting to load ALL guests from /api/events/${eventId}/guests (attempt ${retryCount + 1}/${MAX_RETRIES + 1})`);
          const guestsResponse = await fetch(`${BACKEND_URL}/api/events/${eventId}/guests`, {
            method: 'GET',
            headers: { 
              'Content-Type': 'application/json',
              'Accept': 'application/json'
            },
            mode: 'cors',
            credentials: 'omit'
          });
          
          if (guestsResponse.ok) {
            const guestsData = await guestsResponse.json();
            console.log(`🔍 Guests endpoint response:`, {
              success: guestsData.success,
              guestsCount: guestsData.guests?.length || 0,
              total: guestsData.total
            });
            
            if (guestsData.success && guestsData.guests && Array.isArray(guestsData.guests)) {
                console.log(`✅ Loaded ${guestsData.guests.length} guests from /api/events/${eventId}/guests`);
                // Map DB fields to frontend format
                const mappedGuests = guestsData.guests.map((guest: any) => ({
                  ...guest,
                  rsvpStatus: guest.rsvp_status || guest.rsvpStatus || guest.status || 'pending',
                  status: guest.rsvp_status || guest.rsvpStatus || guest.status || 'pending',
                  guestCount: guest.guest_count !== undefined ? guest.guest_count : (guest.guestCount !== undefined ? guest.guestCount : 1),
                  guestsCount: guest.guest_count !== undefined ? guest.guest_count : (guest.guestCount !== undefined ? guest.guestCount : 1),
                  firstName: guest.first_name || guest.firstName || '',
                  lastName: guest.last_name || guest.lastName || '',
                  phoneNumber: guest.phone_number || guest.phoneNumber || '',
                  actualAttendance: guest.actual_attendance || guest.actualAttendance || 'not_marked',
                  tableId: guest.table_id || guest.tableId || null,
                  messageStatus: guest.message_status || guest.messageStatus || 'not_sent',
                  responseDate: guest.response_date || guest.responseDate || null,
                  eventId: guest.event_id || guest.eventId || eventId,
                  createdAt: guest.created_at || guest.createdAt,
                  updatedAt: guest.updated_at || guest.updatedAt
                }));
                return mappedGuests;
            }
            } else if (guestsResponse.status === 404 && retryCount < MAX_RETRIES) {
              console.log(`⚠️ Guests endpoint returned 404, retrying in ${RETRY_DELAY}ms...`);
              await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
              return loadGuestsFromEndpoint(retryCount + 1);
          } else {
            console.log(`⚠️ Guests endpoint returned ${guestsResponse.status}`);
          }
        } catch (error: any) {
            console.log(`⚠️ Guests endpoint error (attempt ${retryCount + 1}):`, error);
            if (retryCount < MAX_RETRIES) {
              console.log(`🔄 Retrying guests endpoint in ${RETRY_DELAY}ms...`);
              await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
              return loadGuestsFromEndpoint(retryCount + 1);
            }
          }
          return null;
        };
        
        // Try to load guests from endpoint
        fullGuestsList = await loadGuestsFromEndpoint();
        
        // If single event endpoint didn't work, try /api/events/:userId (but it may also truncate)
        if (!foundEvent) {
          const userStorage = localStorage.getItem('rsvp-user-storage');
          let userId = '';
          if (userStorage) {
            try {
              const parsed = JSON.parse(userStorage);
              userId = parsed.state?.user?.id || '';
            } catch (e: any) {
              // Ignore parse errors
            }
          }
          
          if (userId) {
            console.log(`🌐 Loading event from authenticated endpoint: ${BACKEND_URL}/api/events/${userId}`);
            try {
              const authResponse = await fetch(`${BACKEND_URL}/api/events/${userId}`, {
                method: 'GET',
                headers: { 
                  'Content-Type': 'application/json',
                  'Accept': 'application/json'
                },
                mode: 'cors',
                credentials: 'omit'
              });
              
              if (authResponse.ok) {
                const authData = await authResponse.json();
                const authEvents = Array.isArray(authData) ? authData : (authData.events || []);
                
                // Find the event and map DB fields to frontend format
                const rawAuthEvent = authEvents.find((e: any) => e.id === eventId);
                
                if (rawAuthEvent) {
                  foundEvent = mapSupabaseToFrontend(rawAuthEvent);
                  const displayName = foundEvent.coupleName || 
                    (foundEvent.groomName && foundEvent.brideName ? `${foundEvent.groomName} & ${foundEvent.brideName}` : 
                     foundEvent.groomName || foundEvent.brideName || 'אירוע');
                  console.log(`✅ Found event in authenticated endpoint: ${displayName}`);
                  console.log(`🔍 Authenticated endpoint returned ${foundEvent.guests?.length || 0} guests`);
                  
                  // WARNING: This endpoint may also truncate data for large events
                  if (foundEvent.guests && foundEvent.guests.length < 50) {
                    console.warn(`⚠️ Authenticated endpoint returned only ${foundEvent.guests.length} guests - may be incomplete`);
                  }
                }
              } else {
                console.error(`❌ Authenticated endpoint returned ${authResponse.status} - Database connection may have issues`);
                console.error(`❌ Please check your Supabase configuration and network connection`);
              }
            } catch (error: any) {
              console.error(`❌ Failed to load from authenticated endpoint - Database connection failed:`, error);
              console.error(`❌ Please check your Supabase configuration and network connection`);
            }
          }
        }
        
        // Fallback to public endpoint /api/events/all (last resort - may truncate)
        if (!foundEvent) {
          console.log(`🌐 Loading event from public API endpoint: ${BACKEND_URL}/api/events/all`);
          try {
            const response = await fetch(`${BACKEND_URL}/api/events/all`, {
              method: 'GET',
              headers: { 
                'Content-Type': 'application/json',
                'Accept': 'application/json'
              },
              mode: 'cors',
              credentials: 'omit'
            });
            
            if (response.ok) {
              const data = await response.json();
              const allEvents = data.events || [];
              console.log(`🔍 DEBUG: API returned ${allEvents.length} events`);
              console.log(`🔍 DEBUG: Looking for eventId: ${eventId}`);
              console.log(`🔍 DEBUG: Event IDs in API response:`, allEvents.map((e: any) => e.id));
              
              // Find event and map DB fields to frontend format
              const rawEvent = allEvents.find((e: any) => e.id === eventId);
              if (rawEvent) {
                foundEvent = mapSupabaseToFrontend(rawEvent);
              }
              
              if (!foundEvent) {
                console.error(`❌ Event ${eventId} not found in API`);
                console.error(`❌ Available event IDs:`, allEvents.map((e: any) => e.id));
                console.error(`❌ Database connection may have issues - please check Supabase configuration`);
              }
            } else {
              console.error(`❌ API returned error: ${response.status} - Database connection may have issues`);
              console.error(`❌ Please check your Supabase configuration and network connection`);
            }
          } catch (error: any) {
            console.error('❌ Failed to fetch from /api/events/all - Database connection failed:', error);
            console.error(`❌ Please check your Supabase configuration and network connection`);
          }
        }
        
        // CRITICAL: If we haven't loaded guests yet, try again now that we have the event
        // This ensures we always try to load full guest list, even if event was found from /api/events/all
        if (!fullGuestsList && foundEvent) {
          console.log(`🔄 Event found but guests not loaded yet, retrying guests endpoint...`);
          fullGuestsList = await loadGuestsFromEndpoint();
        }
        
        // If we found the event from any endpoint, use it
        if (foundEvent) {
          // CRITICAL: Ensure event is mapped to frontend format before using
          foundEvent = mapSupabaseToFrontend(foundEvent);
          
          const displayName = foundEvent.coupleName || 
            (foundEvent.groomName && foundEvent.brideName ? `${foundEvent.groomName} & ${foundEvent.brideName}` : 
             foundEvent.groomName || foundEvent.brideName || 'אירוע');
          console.log(`✅ Found event silently in API: ${displayName}`);
          
          // CRITICAL: If we loaded full guests list from /api/events/:eventId/guests, ALWAYS use it
          // This ensures we have ALL guests, not just the truncated list from /api/events/all
          if (fullGuestsList && fullGuestsList.length > 0) {
            console.log(`✅ Using ${fullGuestsList.length} guests from /api/events/${eventId}/guests (full list)`);
            foundEvent.guests = fullGuestsList;
          } else {
            // CRITICAL: Check if data from /api/events/all is incomplete
            const eventFromAll = foundEvent;
            const currentGuestsCount = eventFromAll.guests?.length || 0;
            
            // CRITICAL: If we have fewer than expected guests, log detailed info
            if (currentGuestsCount > 0 && currentGuestsCount < 100) {
              console.warn(`⚠️ Event has only ${currentGuestsCount} guests - may be incomplete`);
              console.warn(`⚠️ This might indicate incomplete data from Supabase`);
              console.warn(`⚠️ Guests endpoint returned 404 - cannot load full guest list`);
              console.warn(`⚠️ Will use partial data from /api/events/all`);
              console.error(`❌ Database connection may have issues - please check Supabase configuration`);
              
              // Log guest details for debugging
              if (eventFromAll.guests && eventFromAll.guests.length > 0) {
                console.log(`🔍 Guest IDs in response:`, eventFromAll.guests.slice(0, 5).map((g: any) => g.id));
              }
            } else if (currentGuestsCount === 0) {
              console.warn(`⚠️ Event has no guests - guests endpoint failed or event is empty`);
            }
          }
          
          const apiGuestsCount = foundEvent.guests?.length || 0;
          console.log(`🔍 Event details from API (SUMMARY):`, {
            id: foundEvent.id,
            coupleName: foundEvent.coupleName,
            groomName: foundEvent.groomName,
            brideName: foundEvent.brideName,
            eventDate: foundEvent.eventDate,
            eventTime: foundEvent.eventTime,
            venue: foundEvent.venue,
            guestsCount: apiGuestsCount,
            hasGuests: !!foundEvent.guests,
            guestsArrayLength: foundEvent.guests?.length,
            eventTypeHebrew: (foundEvent as any).eventTypeHebrew,
            invitationImageUrl: foundEvent.invitationImageUrl,
            guestsFromSeparateEndpoint: fullGuestsList ? fullGuestsList.length : 0
          });
          
          // CRITICAL: Check if API returned incomplete data (common for large events)
          // If API returned very few guests (< 50), it's likely incomplete due to response size limits
          if (apiGuestsCount > 0 && apiGuestsCount < 50 && !fullGuestsList) {
            console.warn(`⚠️ WARNING: API returned only ${apiGuestsCount} guests - data may be incomplete!`);
            console.warn(`⚠️ This is a known limitation of /api/events/all for large events`);
            console.warn(`⚠️ Guests endpoint returned 404 - cannot load full guest list`);
            console.warn(`⚠️ For full guest list, please log in to the admin dashboard or wait for polling to update`);
          } else if (fullGuestsList && fullGuestsList.length > apiGuestsCount) {
            console.log(`✅ Using ${fullGuestsList.length} guests from separate endpoint (vs ${apiGuestsCount} from event data)`);
          }
          
          // CRITICAL: Ensure event has all required fields before setting
          if (!foundEvent.guests) {
            console.warn('⚠️ Event from API has no guests array, initializing empty array');
            foundEvent.guests = [];
          }
            
            // CRITICAL: Only update if new data is more recent than current
            setCurrentEvent((prev: any) => {
              if (!prev) {
                console.log('✅ Setting initial event from API');
                const apiGuestsCount = foundEvent.guests?.length || 0;
                console.log(`🔍 Initial load - API returned ${apiGuestsCount} guests`);
                
                // CRITICAL: If API returned very few guests (< 50), it's likely incomplete data
                // But we still set it as initial if we don't have any data yet, and polling will update it
                const isLikelyIncomplete = apiGuestsCount > 0 && apiGuestsCount < 50;
                
                if (isLikelyIncomplete) {
                  console.warn(`⚠️ API returned only ${apiGuestsCount} guests - likely incomplete data. Event might have more guests.`);
                  console.warn(`⚠️ This is a known limitation - large events may be truncated in /api/events/all`);
                  console.warn(`⚠️ Setting incomplete data as initial - polling will attempt to update with complete data`);
                  
                  // CRITICAL: Set incomplete data as initial, but polling will try to update it
                  // This ensures the user sees something immediately, even if incomplete
                }
                
                // CRITICAL: Ensure guests array exists even for initial load
                return {
                  ...foundEvent,
                  guests: foundEvent.guests || []
                };
              }
              
              // CRITICAL: Check if API data is incomplete BEFORE merging
              // If prev has many more guests than API, don't overwrite with incomplete data
              const prevGuests = prev.guests || [];
              const apiGuests = foundEvent.guests || [];
              const prevGuestsCount = prevGuests.length;
              const apiGuestsCount = apiGuests.length;
              
              // CRITICAL: If API has significantly fewer guests (< 50% of prev), it's incomplete data
              // Don't overwrite complete data with incomplete data
              const isIncompleteApiData = prevGuestsCount > 0 && apiGuestsCount > 0 && apiGuestsCount < prevGuestsCount * 0.5;
              
              if (isIncompleteApiData) {
                console.warn(`⚠️ API data appears incomplete (${apiGuestsCount} guests vs ${prevGuestsCount} prev) - IGNORING API data to preserve complete data`);
                console.warn(`⚠️ Keeping previous complete data with ${prevGuestsCount} guests`);
                return prev; // Keep previous complete data, don't overwrite with incomplete API data
              }
              
              // Compare updatedAt timestamps
              const prevUpdatedAt = prev.updatedAt ? (prev.updatedAt instanceof Date ? prev.updatedAt.getTime() : new Date(prev.updatedAt).getTime()) : 0;
              const newUpdatedAt = foundEvent.updatedAt ? (foundEvent.updatedAt instanceof Date ? foundEvent.updatedAt.getTime() : new Date(foundEvent.updatedAt).getTime()) : 0;
              
              if (newUpdatedAt >= prevUpdatedAt) {
                console.log('✅ Updating from API (newer or same timestamp) - merging data');
                
                // CRITICAL: Merge guests intelligently - don't lose guests that aren't in API response
                // API might return partial data (e.g., only 6 guests out of 417)
                const prevGuestsMap = new Map(prevGuests.map((g: any) => [g.id, g]));
                const apiGuestsMap = new Map(apiGuests.map((g: any) => [g.id, g]));
                
                let mergedGuests = prevGuests;
                // API data seems complete - merge intelligently
                // Update existing guests with API data, add new guests from API
                mergedGuests = [...prevGuests];
                
                // Update existing guests with API data
                apiGuests.forEach((apiGuest: any) => {
                  const index = mergedGuests.findIndex((g: any) => g.id === apiGuest.id);
                  if (index >= 0) {
                    // Update existing guest with API data
                    mergedGuests[index] = apiGuest;
                  } else {
                    // Add new guest from API
                    mergedGuests.push(apiGuest);
                  }
                });
                
                console.log(`🔍 Merged guests: ${prevGuestsCount} prev → ${mergedGuests.length} merged (${apiGuestsCount} from API)`);
                
                // CRITICAL: Merge data to preserve fields that might exist in prev but not in foundEvent
                // This prevents losing data like coupleName, campaigns, tables, etc.
                const mergedEvent = {
                  ...prev, // Start with previous data
                  ...foundEvent, // Override with API data (which is newer)
                  // CRITICAL: Preserve important fields from prev if they're missing in API
                  coupleName: foundEvent.coupleName || prev.coupleName,
                  campaigns: foundEvent.campaigns || prev.campaigns || [],
                  tables: foundEvent.tables || prev.tables || [],
                  venueLayout: foundEvent.venueLayout || prev.venueLayout,
                  eventImages: foundEvent.eventImages || prev.eventImages || [],
                  // CRITICAL: Use merged guests (not just API guests)
                  guests: mergedGuests
                };
                console.log('🔍 Merged event data:', {
                  coupleName: mergedEvent.coupleName,
                  groomName: mergedEvent.groomName,
                  brideName: mergedEvent.brideName,
                  guestsCount: mergedEvent.guests?.length || 0,
                  prevGuestsCount: prevGuestsCount,
                  apiGuestsCount: apiGuestsCount,
                  campaignsCount: mergedEvent.campaigns?.length || 0,
                  tablesCount: mergedEvent.tables?.length || 0
                });
                return mergedEvent;
              } else {
                console.log('⚠️ Ignoring API data (older than current)');
                console.log(`   Previous updatedAt: ${new Date(prevUpdatedAt).toISOString()}`);
                console.log(`   New updatedAt: ${new Date(newUpdatedAt).toISOString()}`);
                return prev; // Keep current (newer) data
              }
            });
        }
      } catch (error: any) {
        const isTimeout = error.name === 'TimeoutError' || error.name === 'AbortError' || error.message?.includes('timeout');
        const isNetworkError = error.name === 'TypeError' && error.message?.includes('fetch');
        
        console.error(`❌ Failed to load event from API (attempt ${retryCount + 1}/${MAX_RETRIES + 1}):`, error);
        console.error('❌ Error details:', {
          message: error.message,
          name: error.name,
          stack: error.stack,
          eventId: eventId,
          isTimeout: isTimeout,
          isNetworkError: isNetworkError
        });
        
        // Retry if we haven't exceeded max retries (especially for network/timeout errors)
        if (retryCount < MAX_RETRIES && (isTimeout || isNetworkError || error.name === 'TypeError')) {
          const retryDelay = isTimeout ? RETRY_DELAY * 2 : RETRY_DELAY; // Longer delay for timeouts
          console.log(`🔄 Retrying API load in ${retryDelay}ms... (${isTimeout ? 'timeout' : isNetworkError ? 'network' : 'error'})`);
          setTimeout(() => {
            loadFromAPI(retryCount + 1);
          }, retryDelay);
        } else if (retryCount < MAX_RETRIES) {
          console.log(`🔄 Retrying API load in ${RETRY_DELAY}ms...`);
          setTimeout(() => {
            loadFromAPI(retryCount + 1);
          }, RETRY_DELAY);
        } else {
          console.error('❌ Max retries reached. Failed to load event from API.');
          // CRITICAL: Even if API fails, don't clear currentEvent if we have it
          // This ensures users can still see data even if API is temporarily unavailable
          setCurrentEvent((prev: any) => {
            if (!prev) {
              console.warn('⚠️ No event data available - API failed and no local data found');
              return null;
            } else {
              console.log('✅ Keeping existing event data despite API failure');
              return prev; // Keep existing data
            }
          });
        }
      }
    };
    
    // Only try fetchEvents if user is logged in (has userId)
    const userStorage = localStorage.getItem('rsvp-user-storage');
    let userId = '';
    if (userStorage) {
      try {
        const parsed = JSON.parse(userStorage);
        userId = parsed.state?.user?.id || '';
      } catch (e: any) {
        // Ignore parse errors
      }
    }
    
    // CRITICAL: Always load from API to get latest data, even if event was found in store/localStorage
    // Backend is the source of truth - always fetch latest data
    // CRITICAL: If user is logged in, use fetchEvents which uses /api/events/:userId and returns FULL event data
    // This is important because /api/events/all may return truncated data for large events
    if (userId) {
      // User is logged in - try fetchEvents first (this returns FULL event data with all guests)
      // Then also load from public API as backup
      console.log(`🔍 User is logged in (${userId}) - using fetchEvents for full event data`);
          fetchEvents().then(() => {
            const foundEvent = events.find((e: any) => e.id === eventId);
            if (foundEvent) {
          const displayName = foundEvent.coupleName || 
            (foundEvent.groomName && foundEvent.brideName ? `${foundEvent.groomName} & ${foundEvent.brideName}` : 
             foundEvent.groomName || foundEvent.brideName || 'אירוע');
          console.log(`✅ Found event silently via fetchEvents: ${displayName}`);
          console.log(`🔍 Event details from fetchEvents:`, {
            coupleName: foundEvent.coupleName,
            groomName: foundEvent.groomName,
            brideName: foundEvent.brideName,
            eventDate: foundEvent.eventDate,
            venue: foundEvent.venue,
            guestsCount: foundEvent.guests?.length || 0,
            updatedAt: foundEvent.updatedAt
          });
          
          // CRITICAL: Merge data instead of replacing to preserve local fields
          setCurrentEvent((prev: any) => {
            if (!prev) {
              console.log('✅ Setting initial event from fetchEvents');
              console.log(`🔍 Initial load - fetchEvents returned ${foundEvent.guests?.length || 0} guests`);
              
              // CRITICAL: Ensure guests array exists
              return {
                ...foundEvent,
                guests: foundEvent.guests || []
              };
            }
            
            // Compare updatedAt timestamps
            const prevUpdatedAt = prev.updatedAt ? (prev.updatedAt instanceof Date ? prev.updatedAt.getTime() : new Date(prev.updatedAt).getTime()) : 0;
            const newUpdatedAt = foundEvent.updatedAt ? (foundEvent.updatedAt instanceof Date ? foundEvent.updatedAt.getTime() : new Date(foundEvent.updatedAt).getTime()) : 0;
            
            // CRITICAL: Check if fetchEvents data is incomplete BEFORE merging
            // If prev has many more guests than fetchEvents, don't overwrite with incomplete data
            const prevGuests = prev.guests || [];
            const fetchGuests = foundEvent.guests || [];
            const prevGuestsCount = prevGuests.length;
            const fetchGuestsCount = fetchGuests.length;
            
            // CRITICAL: If fetchEvents has significantly fewer guests (< 50% of prev), it's incomplete data
            // Don't overwrite complete data with incomplete data
            const isIncompleteFetchData = prevGuestsCount > 0 && fetchGuestsCount > 0 && fetchGuestsCount < prevGuestsCount * 0.5;
            
            if (isIncompleteFetchData) {
              console.warn(`⚠️ fetchEvents data appears incomplete (${fetchGuestsCount} guests vs ${prevGuestsCount} prev) - IGNORING fetchEvents data to preserve complete data`);
              console.warn(`⚠️ Keeping previous complete data with ${prevGuestsCount} guests`);
              return prev; // Keep previous complete data, don't overwrite with incomplete fetchEvents data
            }
            
            if (newUpdatedAt >= prevUpdatedAt) {
              console.log('✅ Updating from fetchEvents (newer or same timestamp) - merging data');
              
              // CRITICAL: Merge guests intelligently - don't lose guests that aren't in fetchEvents data
              const fetchGuestsMap = new Map(fetchGuests.map((g: any) => [g.id, g]));
              
              // Merge guests: update existing, add new, keep prev if not in fetch
              const mergedGuests = prevGuests.map((prevGuest: any) => {
                const fetchGuest = fetchGuestsMap.get(prevGuest.id) as any;
                return fetchGuest || prevGuest; // Use fetch data if exists, otherwise keep prev
              });
              
              // Add any new guests from fetch that aren't in prev
              fetchGuests.forEach((fetchGuest: any) => {
                if (!prevGuests.find((g: any) => g.id === fetchGuest.id)) {
                  mergedGuests.push(fetchGuest);
                }
              });
              
              // CRITICAL: Merge data to preserve fields that might exist in prev but not in foundEvent
              const mergedEvent = {
                ...prev, // Start with previous data
                ...foundEvent, // Override with fetchEvents data (which is newer)
                // CRITICAL: Preserve important fields from prev if they're missing
                coupleName: foundEvent.coupleName || prev.coupleName,
                campaigns: foundEvent.campaigns || prev.campaigns || [],
                tables: foundEvent.tables || prev.tables || [],
                venueLayout: foundEvent.venueLayout || prev.venueLayout,
                eventImages: foundEvent.eventImages || prev.eventImages || [],
                // CRITICAL: Use merged guests
                guests: mergedGuests
              };
              console.log(`🔍 Merged from fetchEvents: ${prevGuestsCount} prev → ${mergedGuests.length} merged (${fetchGuestsCount} from fetch)`);
              return mergedEvent;
            } else {
              console.log('⚠️ Ignoring fetchEvents data (older than current)');
              return prev; // Keep current (newer) data
            }
          });
        }
        // Still load from public API to ensure we have the absolute latest data
        loadFromAPI();
      }).catch(() => {
        // If fetchEvents fails, use public API
        loadFromAPI();
      });
    } else {
      // No user logged in - use public API endpoint
      console.log(`🌐 No user logged in - using public API endpoint silently`);
      loadFromAPI();
    }
    
    // No auto-polling - user will use manual refresh button
    const handleRefresh = async () => {
      try {
        const BACKEND_URL = (process.env as any).NEXT_PUBLIC_BACKEND_URL || (process.env as any).VITE_BACKEND_URL || 'https://whatsapp-backend-enfz.onrender.com';
        
        // Load event from API
        const singleEventResponse = await fetch(`${BACKEND_URL}/api/events/${eventId}`, {
          method: 'GET',
          headers: { 
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          mode: 'cors',
          credentials: 'omit'
        });
        
        if (singleEventResponse.ok) {
          const singleEventData = await singleEventResponse.json();
          if (singleEventData.success && singleEventData.event) {
            setCurrentEvent(singleEventData.event);
            console.log(`✅ Refreshed event with ${singleEventData.event.guests?.length || 0} guests`);
          }
        }
      } catch (error: any) {
        console.error('❌ Error refreshing event:', error);
      }
    };
    
    // No auto-polling - user will use manual refresh button
    // Cleanup on unmount
    return () => {
      if (pollingIntervalRef.current !== null) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
        isPollingRef.current = false;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId]); // Removed events and fetchEvents from deps to prevent infinite loop
  
  // CRITICAL: Update currentEvent when events in store change (from webhookService)
  // Silent update - no visual indicators
  useEffect(() => {
    if (eventId && events.length > 0) {
      const foundEvent = events.find((e: any) => e.id === eventId);
      if (foundEvent) {
        setCurrentEvent((prev: any) => {
          if (!prev) {
            console.log('🔄 ClientDashboard: Setting initial event from store (webhookService)');
            console.log(`🔍 Initial load - store returned ${foundEvent.guests?.length || 0} guests`);
            
            // CRITICAL: Ensure guests array exists
            return {
              ...foundEvent,
              guests: foundEvent.guests || []
            };
          }
          
          // Compare guests by ID, not by index (guests might be in different order)
          const prevGuestsMap = new Map((prev.guests || []).map((g: any) => [g.id, g]));
          const newGuestsMap = new Map((foundEvent.guests || []).map((g: any) => [g.id, g]));
          
          // Check if number of guests changed
          if (prevGuestsMap.size !== newGuestsMap.size) {
            console.log('🔄 ClientDashboard: Guest count changed, updating from store');
            // CRITICAL: Merge to preserve fields and ensure guests array exists
            return {
              ...prev,
              ...foundEvent,
              coupleName: foundEvent.coupleName || prev.coupleName,
              campaigns: foundEvent.campaigns || prev.campaigns || [],
              tables: foundEvent.tables || prev.tables || [],
              venueLayout: foundEvent.venueLayout || prev.venueLayout,
              eventImages: foundEvent.eventImages || prev.eventImages || [],
              guests: foundEvent.guests || prev.guests || []
            };
          }
          
          // Check if any guest data changed
          let hasChanged = false;
          for (const [guestId, newGuest] of newGuestsMap) {
            const prevGuest: any = prevGuestsMap.get(guestId) as any;
            const newGuestTyped: any = newGuest as any;
            if (!prevGuest) {
              hasChanged = true;
              break;
            }
            
            // Check critical fields
            if (prevGuest.rsvpStatus !== newGuestTyped.rsvpStatus ||
                prevGuest.guestCount !== newGuestTyped.guestCount ||
                prevGuest.actualAttendance !== newGuestTyped.actualAttendance ||
                prevGuest.firstName !== newGuestTyped.firstName ||
                prevGuest.lastName !== newGuestTyped.lastName ||
                prevGuest.phoneNumber !== newGuestTyped.phoneNumber) {
              hasChanged = true;
              break;
            }
          }
          
          if (hasChanged) {
            console.log('🔄 ClientDashboard: Event updated silently from store (webhookService)');
            // CRITICAL: Merge to preserve fields and ensure guests array exists
            return {
              ...prev,
              ...foundEvent,
              coupleName: foundEvent.coupleName || prev.coupleName,
              campaigns: foundEvent.campaigns || prev.campaigns || [],
              tables: foundEvent.tables || prev.tables || [],
              venueLayout: foundEvent.venueLayout || prev.venueLayout,
              eventImages: foundEvent.eventImages || prev.eventImages || [],
              guests: foundEvent.guests || prev.guests || []
            };
          }
          return prev;
        });
      }
    }
  }, [events, eventId]);

  const handleRefresh = async () => {
    // Silent refresh - no loading indicators
    console.log(`🔄 Silently refreshing event: ${eventId}`);
    
    try {
      // CRITICAL: Use public API endpoint (works from any IP/device)
      const BACKEND_URL = (process.env as any).NEXT_PUBLIC_BACKEND_URL || (process.env as any).VITE_BACKEND_URL || 'https://whatsapp-backend-enfz.onrender.com';
      const response = await fetch(`${BACKEND_URL}/api/events/all`, {
        method: 'GET',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        mode: 'cors',
        credentials: 'omit'
      });
      
      if (response.ok) {
        const data = await response.json();
        const allEvents = data.events || [];
        const foundEvent = allEvents.find((e: any) => e.id === eventId);
        
        if (foundEvent) {
          console.log(`✅ Silently refreshed event from API: ${foundEvent.coupleName}`);
          setCurrentEvent(foundEvent);
        } else {
          console.error(`❌ Event ${eventId} not found in API`);
        }
      } else {
        console.error(`❌ API returned error: ${response.status}`);
      }
    } catch (error: any) {
      console.error('❌ Error refreshing event:', error);
    }
  };

  const handleExportData = () => {
    if (!currentEvent) return;
    
    const stats: any = calculateEventStats(currentEvent);
    const exportData = {
      eventName: currentEvent.coupleName,
      eventDate: formatDate(currentEvent.eventDate),
      eventTime: currentEvent.eventTime,
      venue: currentEvent.venue,
      totalGuests: stats.totalGuests,
      confirmed: stats.confirmed,
      declined: stats.declined,
      maybe: stats.maybe,
      pending: stats.pending,
      responseRate: stats.responseRate,
      lastUpdated: new Date().toISOString()
    };

    const dataStr = JSON.stringify(exportData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${currentEvent.coupleName.replace(/\s+/g, '_')}_rsvp_data.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `אישורי הגעה - ${currentEvent?.coupleName}`,
          text: `צפו בנתוני אישורי הגעה לחתונה של ${currentEvent?.coupleName}`,
          url: window.location.href
        });
      } catch (error: any) {
        console.log('Error sharing:', error);
      }
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(window.location.href);
      alert('הקישור הועתק ללוח');
    }
  };

  // Show page immediately - no loading screen
  // But show helpful message if event is not loaded yet
  if (!currentEvent) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          <div className="mb-6">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto"></div>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-4">טוען אירוע...</h1>
          <p className="text-gray-600 mb-4">מחפש את האירוע במערכת</p>
          <p className="text-sm text-gray-500">
            אם הבעיה נמשכת, נסה לרענן את הדף או לבדוק את החיבור לאינטרנט
          </p>
          <button
            onClick={() => {
              if (eventId) {
                window.location.reload();
              }
            }}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            רענן דף
          </button>
        </div>
      </div>
    );
  }

  const stats: any = calculateEventStats(currentEvent);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <div className="text-2xl">🎉</div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">
                  {currentEvent.coupleName || (currentEvent.groomName && currentEvent.brideName ? `${currentEvent.groomName} & ${currentEvent.brideName}` : 'אירוע')}
                </h1>
                {(currentEvent.groomName || currentEvent.brideName) && (
                  <p className="text-sm text-gray-600">
                    {currentEvent.groomName && currentEvent.brideName 
                      ? `${currentEvent.groomName} & ${currentEvent.brideName}`
                      : currentEvent.groomName || currentEvent.brideName}
                  </p>
                )}
                <p className="text-sm text-yellow-500 font-medium">בס"ד אירועים - ממשק לקוח</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              {/* Manual Refresh Button */}
              <button
                onClick={handleRefresh}
                disabled={isLoading}
                className="flex items-center space-x-2 px-3 py-2 text-sm text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                title="רענן נתונים"
              >
                <RefreshCw className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
                <span>רענן</span>
              </button>
              
              <button
                onClick={handleExportData}
                className="flex items-center space-x-2 px-3 py-2 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <Download className="w-4 h-4" />
                <span>ייצא נתונים</span>
              </button>
              
              <button
                onClick={handleShare}
                className="flex items-center space-x-2 px-3 py-2 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <Share2 className="w-4 h-4" />
                <span>שתף</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      {currentEvent ? (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Event Info */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                {currentEvent.coupleName || (currentEvent.groomName && currentEvent.brideName ? `${currentEvent.groomName} & ${currentEvent.brideName}` : 'אירוע')}
              </h2>
              {(currentEvent.groomName || currentEvent.brideName) && (
                <p className="text-gray-500 mb-2 text-lg">
                  {currentEvent.groomName && currentEvent.brideName 
                    ? `${currentEvent.groomName} & ${currentEvent.brideName}`
                    : currentEvent.groomName || currentEvent.brideName}
                </p>
              )}
              <div className="flex items-center space-x-6 text-gray-600">
                <div className="flex items-center space-x-2">
                  <Calendar className="w-5 h-5" />
                  <span>{currentEvent.eventDate ? formatDate(currentEvent.eventDate) : '-'} - {currentEvent.eventTime || '-'}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <MapPin className="w-5 h-5" />
                  <span>{currentEvent.venue || '-'}</span>
                </div>
              </div>
            </div>
            
            {/* Last updated indicator removed - updates happen silently */}
          </div>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">סה"כ מוזמנים</p>
                <p className="text-3xl font-bold text-blue-600">{stats.totalGuests}</p>
              </div>
              <Users className="w-8 h-8 text-blue-600" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">מגיעים</p>
                <p className="text-3xl font-bold text-green-600">{stats.confirmed}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">לא מגיעים</p>
                <p className="text-3xl font-bold text-red-600">{stats.declined}</p>
              </div>
              <XCircle className="w-8 h-8 text-red-600" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">אחוז תגובה</p>
                <p className="text-3xl font-bold text-yellow-600">{stats.responseRate}%</p>
              </div>
              <MessageSquare className="w-8 h-8 text-yellow-600" />
            </div>
          </div>
        </div>

        {/* Detailed Stats */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Response Breakdown */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">פירוט תגובות</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <span className="text-gray-700">מגיעים</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-2xl font-bold text-green-600">{stats.confirmed}</span>
                  <span className="text-sm text-gray-500">
                    ({Math.round((stats.confirmed / stats.totalGuests) * 100)}%)
                  </span>
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <XCircle className="w-5 h-5 text-red-600" />
                  <span className="text-gray-700">לא מגיעים</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-2xl font-bold text-red-600">{stats.declined}</span>
                  <span className="text-sm text-gray-500">
                    ({Math.round((stats.declined / stats.totalGuests) * 100)}%)
                  </span>
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <HelpCircle className="w-5 h-5 text-yellow-600" />
                  <span className="text-gray-700">אולי מגיעים</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-2xl font-bold text-yellow-600">{stats.maybe}</span>
                  <span className="text-sm text-gray-500">
                    ({Math.round((stats.maybe / stats.totalGuests) * 100)}%)
                  </span>
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Clock className="w-5 h-5 text-gray-600" />
                  <span className="text-gray-700">לא ענו</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-2xl font-bold text-gray-600">{stats.pending}</span>
                  <span className="text-sm text-gray-500">
                    ({Math.round((stats.pending / stats.totalGuests) * 100)}%)
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Communication Channels */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">ערוצי תקשורת</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <MessageSquare className="w-5 h-5 text-green-600" />
                  <span className="text-gray-700">וואטסאפ</span>
                </div>
                <span className="text-2xl font-bold text-green-600">
                  {currentEvent && currentEvent.guests && Array.isArray(currentEvent.guests) ? currentEvent.guests.filter((g: any) => g && g.channel === 'whatsapp').length : 0}
                </span>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Phone className="w-5 h-5 text-blue-600" />
                  <span className="text-gray-700">SMS</span>
                </div>
                <span className="text-2xl font-bold text-blue-600">
                  {currentEvent && currentEvent.guests && Array.isArray(currentEvent.guests) ? currentEvent.guests.filter((g: any) => g && g.channel === 'sms').length : 0}
                </span>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Users className="w-5 h-5 text-gray-600" />
                  <span className="text-gray-700">ידני</span>
                </div>
                <span className="text-2xl font-bold text-gray-600">
                  {currentEvent && currentEvent.guests && Array.isArray(currentEvent.guests) ? currentEvent.guests.filter((g: any) => g && g.channel === 'manual').length : 0}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Guests List */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">רשימת מוזמנים</h3>
            </div>
            
            {/* Search and Filters */}
            <div className="space-y-4">
              {/* Search */}
              <div className="relative">
                <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="חפש לפי שם או טלפון..."
                  value={searchTerm}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
                  className="pr-10 pl-4 py-2 border border-gray-300 rounded-lg text-sm text-right focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent w-full"
                />
              </div>
              
              {/* Filters */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* RSVP Status Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    סינון לפי סטטוס תגובה
                  </label>
                  <select
                    value={filterStatus}
                    onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setFilterStatus(e.target.value as any)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm text-right focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="all">הכל</option>
                    <option value="confirmed">מגיעים</option>
                    <option value="declined">לא מגיעים</option>
                    <option value="maybe">אולי מגיעים</option>
                    <option value="pending">ממתין לתגובה</option>
                  </select>
                </div>
                
                {/* Message Status Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    סינון לפי סטטוס הודעה
                  </label>
                  <select
                    value={messageFilterStatus}
                    onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setMessageFilterStatus(e.target.value as any)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm text-right focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="all">הכל</option>
                    <option value="not_sent">לא נשלח</option>
                    <option value="sent">נשלח</option>
                    <option value="delivered">נמסר</option>
                    <option value="failed">נכשל</option>
                    <option value="sent_not_delivered">נשלח ולא נמסר</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-4 text-center text-sm font-semibold text-gray-700 uppercase tracking-wider w-12">
                    #
                  </th>
                  <th className="px-4 py-4 text-right text-sm font-semibold text-gray-700 uppercase tracking-wider whitespace-nowrap">
                    מוזמן
                  </th>
                  <th className="px-3 py-4 text-right text-sm font-semibold text-gray-700 uppercase tracking-wider whitespace-nowrap">
                    טלפון
                  </th>
                  <th className="px-3 py-4 text-center text-sm font-semibold text-gray-700 uppercase tracking-wider w-24 min-w-[100px]">
                    מספר מוזמנים
                  </th>
                  <th className="px-3 py-4 text-right text-sm font-semibold text-gray-700 uppercase tracking-wider w-32 min-w-[120px]">
                    סטטוס אישור
                  </th>
                  <th className="px-3 py-4 text-right text-sm font-semibold text-gray-700 uppercase tracking-wider w-32 min-w-[120px]">
                    הגעה בפועל
                  </th>
                  <th className="px-3 py-4 text-right text-sm font-semibold text-gray-700 uppercase tracking-wider w-32 min-w-[120px]">
                    ערוץ
                  </th>
                  <th className="px-3 py-4 text-right text-sm font-semibold text-gray-700 uppercase tracking-wider w-36 min-w-[140px]">
                    שולחן
                  </th>
                  <th className="px-3 py-4 text-right text-sm font-semibold text-gray-700 uppercase tracking-wider w-36 min-w-[140px]">
                    סטטוס הודעה
                  </th>
                  <th className="px-3 py-4 text-right text-sm font-semibold text-gray-700 uppercase tracking-wider whitespace-nowrap">
                    תאריך שליחה
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {currentEvent && currentEvent.guests && Array.isArray(currentEvent.guests) ? (
                  currentEvent.guests
                    .filter((guest: any) => {
                      // Filter out invalid guests
                      if (!guest || typeof guest !== 'object') return false;
                      
                      // Filter by search term (search in first name, last name, phone number, or full name)
                      const matchesSearch = (() => {
                        if (!searchTerm) return true;
                        const searchLower = searchTerm.toLowerCase();
                        const fullName = formatFullName(guest.firstName, guest.lastName).toLowerCase();
                        const firstName = (guest.firstName || '').toLowerCase();
                        const lastName = (guest.lastName || '').toLowerCase();
                        const phoneNumber = (guest.phoneNumber || '').replace(/\D/g, '');
                        const searchNumbers = searchTerm.replace(/\D/g, '');
                        return fullName.includes(searchLower) || 
                               firstName.includes(searchLower) || 
                               lastName.includes(searchLower) ||
                               (searchNumbers && phoneNumber.includes(searchNumbers));
                      })();
                      
                      // Filter by RSVP status
                      const matchesFilter = filterStatus === 'all' || guest.rsvpStatus === filterStatus;
                      
                      // Filter by message status
                      let matchesMessageFilter = true;
                      const currentMessageStatus = guest.messageStatus || 'not_sent'; // Treat undefined as 'not_sent'
                      
                      if (messageFilterStatus === 'sent_not_delivered') {
                        // Show only guests who were sent a message but didn't receive it
                        // This includes 'sent' but excludes 'delivered'
                        matchesMessageFilter = currentMessageStatus === 'sent';
                      } else if (messageFilterStatus !== 'all') {
                        if (messageFilterStatus === 'not_sent') {
                          // Include both 'not_sent' and undefined (which we treat as 'not_sent')
                          matchesMessageFilter = !guest.messageStatus || currentMessageStatus === 'not_sent';
                        } else {
                          matchesMessageFilter = currentMessageStatus === messageFilterStatus;
                        }
                      }
                      
                      return matchesSearch && matchesFilter && matchesMessageFilter;
                    })
                    .sort((a: any, b: any) => {
                      // Sort by responseDate (most recent first)
                      // Guests with responseDate come first, then guests without
                      let aDate = 0;
                      let bDate = 0;
                      
                      // Safely get date for guest a
                      if (a && typeof a === 'object' && a.responseDate) {
                        try {
                          const aDateValue = a.responseDate;
                          if (aDateValue) {
                            const aDateObj = new Date(aDateValue);
                            if (aDateObj && aDateObj instanceof Date) {
                              const timeValue = aDateObj.getTime();
                              if (typeof timeValue === 'number' && !isNaN(timeValue) && isFinite(timeValue)) {
                                aDate = timeValue;
                              }
                            }
                          }
                        } catch (e: any) {
                          // Ignore errors, keep aDate as 0
                          aDate = 0;
                        }
                      }
                      
                      // Safely get date for guest b
                      if (b && typeof b === 'object' && b.responseDate) {
                        try {
                          const bDateValue = b.responseDate;
                          if (bDateValue) {
                            const bDateObj = new Date(bDateValue);
                            if (bDateObj && bDateObj instanceof Date) {
                              const timeValue = bDateObj.getTime();
                              if (typeof timeValue === 'number' && !isNaN(timeValue) && isFinite(timeValue)) {
                                bDate = timeValue;
                              }
                            }
                          }
                        } catch (e: any) {
                          // Ignore errors, keep bDate as 0
                          bDate = 0;
                        }
                      }
                      
                      // Sort descending (newest first)
                      return bDate - aDate;
                    })
                    .map((guest: any, index: number) => {
                      // Ensure guest is valid before rendering
                      if (!guest || typeof guest !== 'object') {
                        return null;
                      }
                      
                      const getMessageStatusColor = (status: string) => {
                        switch (status) {
                          case 'sent': return 'text-blue-600';
                          case 'delivered': return 'text-green-600';
                          case 'failed': return 'text-red-600';
                          default: return 'text-gray-600';
                        }
                      };
                      
                      const getMessageStatusText = (status: string) => {
                        switch (status) {
                          case 'not_sent': return 'לא נשלחה';
                          case 'sent': return 'נשלחה';
                          case 'delivered': return 'נשלחה והתקבלה';
                          case 'failed': return 'נשלחה ונכשלה';
                          default: return 'לא נשלחה';
                        }
                      };
                      
                      const getActualAttendanceText = (status: string) => {
                        switch (status) {
                          case 'attended': return 'הגיע';
                          case 'not_attended': return 'לא הגיע';
                          default: return 'לא סומן';
                        }
                      };
                      
                      const table = currentEvent.tables?.find((t: any) => t.id === guest.tableId);
                      
                      return (
                        <tr key={guest.id} className={`hover:bg-blue-50 transition-colors duration-200 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                          <td className="px-3 py-4 text-center text-sm font-semibold text-gray-600 w-12">
                            {index + 1}
                          </td>
                          <td className="px-4 py-4 w-40 whitespace-normal">
                      <div>
                              <div className="text-sm font-semibold text-gray-900 break-words">
                                {formatFullName(guest.firstName, guest.lastName)}
                        </div>
                              {renderGuestNotes(guest.notes)}
                      </div>
                    </td>
                          <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                            {guest.phoneNumber}
                    </td>
                          <td className="px-3 py-4 text-sm text-gray-900 w-24 min-w-[100px] text-center">
                            {guest.guestCount || 1}
                          </td>
                          <td className="px-3 py-4 w-32 min-w-[120px]">
                            <span className={`text-sm font-semibold ${getStatusColor(guest.rsvpStatus)}`}>
                          {getStatusIcon(guest.rsvpStatus)} {guest.rsvpStatus === 'pending' ? 'לא ענה' :
                           guest.rsvpStatus === 'confirmed' ? 'מגיע' :
                           guest.rsvpStatus === 'declined' ? 'לא מגיע' : 'אולי מגיע'}
                        </span>
                    </td>
                          <td className="px-3 py-4 w-32 min-w-[120px]">
                            <span className="text-sm font-semibold">
                              {getStatusIcon(guest.actualAttendance || 'not_marked')} {getActualAttendanceText(guest.actualAttendance || 'not_marked')}
                            </span>
                          </td>
                          <td className="px-3 py-4 text-sm text-gray-500 w-32 min-w-[120px]">
                      <div className="flex items-center">
                        {guest.channel === 'whatsapp' ? (
                          <MessageSquare className="w-4 h-4 text-green-600 ml-1" />
                        ) : guest.channel === 'sms' ? (
                          <Phone className="w-4 h-4 text-blue-600 ml-1" />
                        ) : (
                          <Users className="w-4 h-4 text-gray-600 ml-1" />
                        )}
                              <span>{guest.channel === 'whatsapp' ? 'וואטסאפ' : 
                                     guest.channel === 'sms' ? 'SMS' : 'ידני'}</span>
                      </div>
                    </td>
                          <td className="px-3 py-4 text-sm text-gray-500 w-36 min-w-[140px]">
                            {table ? (
                              <span className="font-semibold">שולחן {table.number}</span>
                            ) : (
                              <span className="text-gray-400 italic">ללא שולחן</span>
                            )}
                          </td>
                          <td className="px-3 py-4 text-sm text-gray-500 w-36 min-w-[140px]">
                            <span className={`font-semibold ${getMessageStatusColor(guest.messageStatus || 'not_sent')}`}>
                              {getMessageStatusText(guest.messageStatus || 'not_sent')}
                            </span>
                          </td>
                          <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-500 w-28">
                            {guest.messageSentDate ? formatDate(guest.messageSentDate) : '-'}
                    </td>
                  </tr>
                      );
                    })
                    .filter((row: any) => row !== null)
                ) : (
                  <tr>
                    <td colSpan={10} className="px-6 py-12 text-center">
                      <div className="text-gray-500">
                        <Users className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                        <h3 className="text-lg font-medium text-gray-900 mb-2">אין אורחים</h3>
                        <p className="text-gray-500">עדיין לא נוספו אורחים לאירוע זה</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      ) : (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center py-12">
            <p className="text-gray-500">טוען נתונים...</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClientDashboard;
