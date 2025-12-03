import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Event, Guest, EventStore, ExcelImportData, ExcelExportData, Table, VenueLayout, Campaign } from '../types';
import { generateId, formatDate } from '../utils/helpers';
import { messageService, MessageData, MessageRecipient, BulkMessageResult } from '../services/messageService';
import { generateQRCodeImage } from '../services/qrService';
import { cacheService, CACHE_KEYS } from '../services/cacheService';

const mockEvents: Event[] = [];

// Helper function to sync event to API for real-time cross-device sync
const syncEventToAPI = async (event: Event, retries = 3): Promise<void> => {
  const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3002';
  
  try {
    console.log('🌐 Syncing event to API:', { eventId: event.id, guestsCount: event.guests?.length || 0 });
    
    const response = await fetch(`${BACKEND_URL}/api/events`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(event)
    });
    
    if (response.ok) {
      console.log('✅ Event synced to API successfully:', { eventId: event.id });
    } else {
      const errorText = await response.text();
      console.warn('⚠️ API sync failed:', response.status, errorText);
      if (retries > 0) {
        console.log(`🔄 Retrying sync (${retries} retries left)...`);
        await new Promise(resolve => setTimeout(resolve, 1000));
        return syncEventToAPI(event, retries - 1);
      }
    }
  } catch (error) {
    console.warn('⚠️ Failed to sync event to API:', error);
    if (retries > 0) {
      console.log(`🔄 Retrying sync (${retries} retries left)...`);
      await new Promise(resolve => setTimeout(resolve, 1000));
      return syncEventToAPI(event, retries - 1);
    }
  }
};

export const useEventStore = create<EventStore>()(
  persist(
    (set, get) => ({
      events: mockEvents,
      deletedEvents: [], // אירועים שנמחקו
      currentEvent: null,
      isLoading: false,
      error: null,
      manualChanges: new Map<string, number>(), // Track manual changes: "eventId-guestId" -> timestamp

      fetchEvents: async (forceRefresh: boolean = false) => {
        set({ isLoading: true, error: null });
        try {
          // Get current user ID and email
          const userStorage = localStorage.getItem('rsvp-user-storage');
          let userId = '';
          let userEmail = '';
          if (userStorage) {
            const parsed = JSON.parse(userStorage);
            userId = parsed.state?.user?.id || '';
            userEmail = parsed.state?.user?.email || '';
          }

          console.log('🔍 Fetching events for user:', { userId, userEmail, forceRefresh });

          // Try to fetch from API first (for syncing between computers)
          const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3002';
          let apiEvents: Event[] = [];
          let apiError = false;

          if (userId) {
            // Check cache first (unless force refresh)
            const cacheKey = CACHE_KEYS.EVENTS(userId);
            if (!forceRefresh) {
              const cachedEvents = cacheService.get<Event[]>(cacheKey);
              if (cachedEvents) {
                console.log(`💾 Using cached events (${cachedEvents.length} events)`);
                // Still merge with local events to preserve manual changes
                apiEvents = cachedEvents;
              }
            }

            // If no cache or force refresh, fetch from API
            if (forceRefresh || !apiEvents.length) {
              try {
                console.log('🌐 Fetching events from API...');
                const response = await fetch(`${BACKEND_URL}/api/events/${userId}`);
                if (response.ok) {
                  const data = await response.json();
                  apiEvents = data.events || [];
                  console.log(`✅ Fetched ${apiEvents.length} events from API`);
                  
                  // Cache the API response (5 seconds TTL for fast updates)
                  cacheService.set(cacheKey, apiEvents, 5000);
                  console.log(`💾 Cached events for user ${userId}`);
                
                // Get local events to merge
                // CRITICAL: Always read from localStorage to get the latest events (including newly created ones)
                const stored = localStorage.getItem('rsvp-events-storage');
                let localEvents: Event[] = [];
                if (stored) {
                  try {
                    const parsed = JSON.parse(stored);
                    localEvents = parsed.state?.events || [];
                    console.log('📦 Loaded local events from storage:', localEvents.length);
                    // Log recently created events (within last 5 minutes)
                    const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
                    const recentEvents = localEvents.filter((e: Event) => {
                      const createdAt = e.createdAt ? new Date(e.createdAt).getTime() : 0;
                      return createdAt > fiveMinutesAgo;
                    });
                    if (recentEvents.length > 0) {
                      console.log('🆕 Found recently created events:', recentEvents.map(e => ({ id: e.id, name: e.coupleName })));
                    }
                  } catch (e) {
                    console.warn('⚠️ Error parsing local events:', e);
                  }
                }
                
                // CRITICAL: Also check current state for newly created events that might not be in storage yet
                const currentState = get();
                if (currentState.events && currentState.events.length > 0) {
                  currentState.events.forEach((stateEvent: Event) => {
                    if (!localEvents.find(e => e.id === stateEvent.id)) {
                      console.log('🆕 Found new event in state not in storage:', stateEvent.id);
                      localEvents.push(stateEvent);
                    }
                  });
                }
                
                // Find local events that aren't in API (need to sync)
                const localOnlyEvents = localEvents.filter((e: Event) => 
                  e.userId === userId && !apiEvents.find(ae => ae.id === e.id)
                );
                
                // If there are local events not in API, sync them
                if (localOnlyEvents.length > 0) {
                  console.log(`🔄 Found ${localOnlyEvents.length} local events not in API - syncing...`);
                  try {
                    const syncResponse = await fetch(`${BACKEND_URL}/api/events/sync`, {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                      },
                      body: JSON.stringify({
                        events: localOnlyEvents,
                        userId: userId
                      })
                    });
                    if (syncResponse.ok) {
                      console.log(`✅ Synced ${localOnlyEvents.length} events to API`);
                      // Re-fetch from API to get all events
                      const reFetchResponse = await fetch(`${BACKEND_URL}/api/events/${userId}`);
                      if (reFetchResponse.ok) {
                        const reFetchData = await reFetchResponse.json();
                        apiEvents = reFetchData.events || [];
                        console.log(`✅ Re-fetched ${apiEvents.length} events from API after sync`);
                      }
                    }
                  } catch (syncError) {
                    console.warn('⚠️ Failed to sync local events to API:', syncError);
                  }
                }
                
                // CRITICAL: Merge API events with local events, but preserve manual changes
                console.log('🔍 Starting merge process:', {
                  apiEventsCount: apiEvents.length,
                  localEventsCount: localEvents.length,
                  apiEventIds: apiEvents.map(e => e.id),
                  localEventIds: localEvents.map(e => e.id)
                });
                
                const state = get();
                const now = Date.now();
                const MANUAL_CHANGE_PROTECTION_TIME = 10000; // 10 seconds - reduced for faster sync
                
                console.log('🔍 Manual changes before cleanup:', {
                  total: state.manualChanges.size,
                  entries: Array.from(state.manualChanges.entries()).map(([key, timestamp]) => ({
                    key,
                    age: `${Math.round((now - timestamp) / 1000)}s`
                  }))
                });
                
                // Clean up old manual changes
                const cleanedManualChanges = new Map<string, number>();
                for (const [key, timestamp] of state.manualChanges.entries()) {
                  if (now - timestamp < MANUAL_CHANGE_PROTECTION_TIME) {
                    cleanedManualChanges.set(key, timestamp);
                  }
                }
                if (cleanedManualChanges.size !== state.manualChanges.size) {
                  set({ manualChanges: cleanedManualChanges });
                }
                
                console.log('🔍 Manual changes after cleanup:', {
                  total: cleanedManualChanges.size,
                  entries: Array.from(cleanedManualChanges.entries()).map(([key, timestamp]) => ({
                    key,
                    age: `${Math.round((now - timestamp) / 1000)}s`
                  }))
                });
                
                // Merge API events with local events, preserving manual changes
                const allEvents = apiEvents.map(apiEvent => {
                  // Find corresponding local event
                  const localEvent = localEvents.find((e: Event) => e.id === apiEvent.id && e.userId === userId);
                  
                  console.log(`🔍 Processing event ${apiEvent.id}:`, {
                    hasLocalEvent: !!localEvent,
                    localEventId: localEvent?.id,
                    apiGuestsCount: apiEvent.guests?.length || 0,
                    localGuestsCount: localEvent?.guests?.length || 0
                  });
                  
                  if (!localEvent) {
                    console.log(`➡️ No local event found for ${apiEvent.id}, using API event directly`);
                    return apiEvent; // Use API event if no local version
                  }
                  
                  // Log API event guests for debugging
                console.log(`🔍 Merging event ${apiEvent.id}:`, {
                  apiGuestsCount: apiEvent.guests.length,
                  localGuestsCount: localEvent.guests.length,
                  apiGuestsWithAttendance: apiEvent.guests.filter(g => g.actualAttendance && g.actualAttendance !== 'not_marked').map(g => ({
                    id: g.id,
                    name: `${g.firstName} ${g.lastName}`,
                    actualAttendance: g.actualAttendance
                  })),
                  localGuestsWithAttendance: localEvent.guests.filter(g => g.actualAttendance && g.actualAttendance !== 'not_marked').map(g => ({
                    id: g.id,
                    name: `${g.firstName} ${g.lastName}`,
                    actualAttendance: g.actualAttendance
                  }))
                });
                
                // Merge guests, preserving manual changes
                  const mergedGuests = apiEvent.guests.map(apiGuest => {
                    const localGuest = localEvent.guests.find((g: Guest) => g.id === apiGuest.id);
                    
                    if (!localGuest) {
                      console.log(`➕ New guest from API: ${apiGuest.firstName} ${apiGuest.lastName} (${apiGuest.id})`);
                      return apiGuest; // Use API guest if no local version
                    }
                    
                    // Check if there was a manual change for this guest
                    const guestKey = `${apiEvent.id}-${apiGuest.id}`;
                    const lastManualChange = cleanedManualChanges.get(guestKey);
                    const hasRecentManualChange = lastManualChange && (now - lastManualChange) < MANUAL_CHANGE_PROTECTION_TIME;
                    
                    // Log comparison for debugging - ALWAYS log, not just on mismatch
                    console.log(`🔍 Comparing guest ${apiGuest.firstName} ${apiGuest.lastName} (${apiGuest.id}):`, {
                      api_actualAttendance: apiGuest.actualAttendance,
                      local_actualAttendance: localGuest.actualAttendance,
                      match: apiGuest.actualAttendance === localGuest.actualAttendance,
                      hasRecentManualChange: hasRecentManualChange,
                      timeSinceChange: hasRecentManualChange ? `${Math.round((now - lastManualChange) / 1000)}s` : 'N/A',
                      api_guestCount: apiGuest.guestCount,
                      local_guestCount: localGuest.guestCount,
                      api_rsvpStatus: apiGuest.rsvpStatus,
                      local_rsvpStatus: localGuest.rsvpStatus
                    });
                    
                    if (hasRecentManualChange) {
                      // Preserve local guest data (manual change is recent)
                      console.log(`🛡️ Preserving manual change for guest ${apiGuest.id} in event ${apiEvent.id} (${Math.round((now - lastManualChange) / 1000)}s ago)`);
                      console.log(`🛡️ Preserving fields:`, {
                        guestCount: localGuest.guestCount,
                        rsvpStatus: localGuest.rsvpStatus,
                        actualAttendance: localGuest.actualAttendance,
                        notes: localGuest.notes,
                        tableId: localGuest.tableId
                      });
                      return localGuest;
                    }
                    
                    // CRITICAL: For tableId and actualAttendance, preserve local values if they differ from API
                    // This handles the case where we just updated locally but API hasn't synced yet
                    // Check if local value exists and differs from API, and change was made recently (within 2x protection window)
                    const shouldPreserveLocalField = (field: 'tableId' | 'actualAttendance') => {
                      const localValue = localGuest[field];
                      const apiValue = apiGuest[field];
                      
                      if (localValue !== undefined && localValue !== apiValue) {
                        // If there was a manual change (even if outside strict window), preserve local if values differ
                        if (lastManualChange && (now - lastManualChange) < MANUAL_CHANGE_PROTECTION_TIME * 2) {
                          return true;
                        }
                      }
                      return false;
                    };
                    
                    const preserveTableId = shouldPreserveLocalField('tableId');
                    const preserveActualAttendance = shouldPreserveLocalField('actualAttendance');
                    
                    if (preserveTableId || preserveActualAttendance) {
                      console.log(`🔄 Preserving local tableId/actualAttendance for guest ${apiGuest.id} (API might not have synced yet)`);
                      return {
                        ...apiGuest,
                        tableId: preserveTableId ? localGuest.tableId : apiGuest.tableId,
                        actualAttendance: preserveActualAttendance ? localGuest.actualAttendance : apiGuest.actualAttendance
                      };
                    }
                    
                    // No recent manual change - merge: ALWAYS use API data (it's the source of truth)
                    // API has the latest data from all devices
                    console.log(`✅ Using API data for guest ${apiGuest.firstName} ${apiGuest.lastName} (${apiGuest.id}):`, {
                      actualAttendance: apiGuest.actualAttendance,
                      guestCount: apiGuest.guestCount,
                      rsvpStatus: apiGuest.rsvpStatus,
                      tableId: apiGuest.tableId,
                      note: 'No manual change - API is source of truth'
                    });
                    
                    // CRITICAL: Verify API has actualAttendance value
                    if (apiGuest.actualAttendance === undefined || apiGuest.actualAttendance === null) {
                      console.warn(`⚠️ API does not have actualAttendance field for guest ${apiGuest.firstName} ${apiGuest.lastName} (${apiGuest.id}) - this might cause sync issues`);
                    } else if (apiGuest.actualAttendance !== 'not_marked') {
                      console.log(`✅ API has actualAttendance value: ${apiGuest.actualAttendance} - this will sync to other devices`);
                    }
                    // Note: 'not_marked' is a valid state, no warning needed
                    
                    return apiGuest;
                  });
                  
                  // Add any local guests that aren't in API
                  const localOnlyGuests = localEvent.guests.filter((lg: Guest) => 
                    !apiEvent.guests.find((ag: Guest) => ag.id === lg.id)
                  );
                  
                  return {
                    ...apiEvent,
                    guests: [...mergedGuests, ...localOnlyGuests],
                    updatedAt: new Date(Math.max(
                      new Date(apiEvent.updatedAt || 0).getTime(),
                      new Date(localEvent.updatedAt || 0).getTime()
                    ))
                  };
                });
                
                // Add any remaining local events that aren't in API
                const remainingLocalEvents = localEvents.filter((e: Event) => 
                  e.userId === userId && !apiEvents.find(ae => ae.id === e.id)
                );
                if (remainingLocalEvents.length > 0) {
                  allEvents.push(...remainingLocalEvents);
                  console.log(`🔄 Added ${remainingLocalEvents.length} remaining local events`);
                  
                  // Try to sync remaining events again
                  try {
                    const retrySyncResponse = await fetch(`${BACKEND_URL}/api/events/sync`, {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                      },
                      body: JSON.stringify({
                        events: remainingLocalEvents,
                        userId: userId
                      })
                    });
                    if (retrySyncResponse.ok) {
                      console.log(`✅ Retry synced ${remainingLocalEvents.length} remaining events to API`);
                    }
                  } catch (retryError) {
                    console.warn('⚠️ Retry sync failed:', retryError);
                  }
                }
                
                // CRITICAL FIX: If API returns empty but we have local events, preserve local events
                // This prevents data loss when API is empty or has sync issues
                if (apiEvents.length === 0 && localEvents.length > 0) {
                  console.warn('⚠️ API returned empty events but local events exist - preserving local events');
                  // Use local events instead of empty API response
                  const localEventsForUser = localEvents.filter((e: Event) => !userId || e.userId === userId);
                  if (localEventsForUser.length > 0) {
                    console.log(`🛡️ Preserving ${localEventsForUser.length} local events (API returned empty)`);
                    // Get deletedEvents from stored data
                    let deletedEvents: any[] = [];
                    try {
                      const stored = localStorage.getItem('rsvp-events-storage');
                      if (stored) {
                        const parsed = JSON.parse(stored);
                        deletedEvents = parsed.state?.deletedEvents || [];
                      }
                    } catch (e) {
                      // Ignore parsing errors
                    }
                    // Save local events to localStorage
                    localStorage.setItem('rsvp-events-storage', JSON.stringify({
                      state: {
                        events: localEvents, // Save ALL local events, not just filtered
                        deletedEvents: deletedEvents,
                        currentEvent: null
                      }
                    }));
                    set({ events: localEventsForUser, isLoading: false });
                    return; // Exit early - preserve local events
                  }
                }
                
                // CRITICAL: Before saving, check if we're about to lose any events
                // Compare allEvents with localEvents to ensure we're not losing data
                const eventsToSave = allEvents.length > 0 ? allEvents : localEvents;
                const localEventIds = new Set(localEvents.map(e => e.id));
                const savedEventIds = new Set(eventsToSave.map(e => e.id));
                const lostEvents = localEvents.filter(e => !savedEventIds.has(e.id));
                
                if (lostEvents.length > 0) {
                  console.warn(`⚠️ CRITICAL: About to lose ${lostEvents.length} events! Preserving them...`);
                  console.warn('⚠️ Lost events:', lostEvents.map(e => ({ id: e.id, name: e.coupleName })));
                  // Add lost events back
                  lostEvents.forEach(lostEvent => {
                    if (!eventsToSave.find(e => e.id === lostEvent.id)) {
                      eventsToSave.push(lostEvent);
                      console.log(`✅ Preserved lost event: ${lostEvent.id}`);
                    }
                  });
                }
                
                // Save merged events to localStorage
                // CRITICAL: Always save, even if allEvents is empty (to preserve state)
                localStorage.setItem('rsvp-events-storage', JSON.stringify({
                  state: {
                    events: eventsToSave, // Use eventsToSave which includes preserved events
                    deletedEvents: data.deletedEvents || [],
                    currentEvent: null
                  }
                }));
                
                console.log('💾 Saved events to localStorage:', eventsToSave.length, 'events');
                
                // Use API events as primary source (they're synced)
                // CRITICAL: If allEvents is empty but localEvents exist, use localEvents
                const finalEvents = allEvents.length > 0 ? allEvents : localEvents;
                const filteredEvents = userId ? finalEvents.filter((e: Event) => e.userId === userId) : finalEvents;
                
                // CRITICAL: If filteredEvents is empty but we have local events, preserve them
                if (filteredEvents.length === 0 && localEvents.length > 0) {
                  console.warn('⚠️ Filtered events is empty but local events exist - preserving local events');
                  const localEventsForUser = localEvents.filter((e: Event) => !userId || e.userId === userId);
                  if (localEventsForUser.length > 0) {
                    console.log(`🛡️ Preserving ${localEventsForUser.length} local events (filtered was empty)`);
                    set({ events: localEventsForUser, isLoading: false });
                    return; // Exit early - preserve local events
                  }
                }
                
                set({ events: filteredEvents, isLoading: false });
                return; // Exit early - we got events from API
              } else {
                console.warn('⚠️ API fetch failed, using localStorage');
                apiError = true;
              }
            } catch (error) {
              console.warn('⚠️ API not available, using localStorage:', error);
              apiError = true;
            }
          }
          }

          // Check if there are events in localStorage
          const stored = localStorage.getItem('rsvp-events-storage');
          if (stored) {
            const parsed = JSON.parse(stored);
            if (parsed.state && parsed.state.events && parsed.state.events.length > 0) {
              // CRITICAL: Always preserve ALL events in localStorage
              // Only filter for display in state, but keep all events in storage
              let allEvents = parsed.state.events;
              
              // IMPORTANT: If user logged in, update events to match current userId
              // This ensures that if user re-registered with same email, events are connected
              if (userId && userEmail) {
                let eventsUpdated = false;
                const updatedEvents = allEvents.map((event: Event) => {
                  // If event has userEmail matching current user, update userId
                  if (event.userEmail && event.userEmail.toLowerCase().trim() === userEmail.toLowerCase().trim() && event.userId !== userId) {
                    console.log(`🔄 Updating event ${event.id} userId from ${event.userId} to ${userId} (email match)`);
                    eventsUpdated = true;
                    return { ...event, userId };
                  }
                  // Also check if event has old userId but we can match by email from user storage
                  // This handles case where event was created before userEmail field existed
                  if (!event.userEmail && event.userId && event.userId !== userId) {
                    // Try to find if this userId belongs to same email in old user storage
                    const oldUserStorage = localStorage.getItem('rsvp-users-storage');
                    if (oldUserStorage) {
                      try {
                        const oldParsed = JSON.parse(oldUserStorage);
                        const oldUsers = oldParsed.state?.users || [];
                        const oldUser = oldUsers.find((u: any) => u.id === event.userId);
                        if (oldUser && oldUser.email && oldUser.email.toLowerCase().trim() === userEmail.toLowerCase().trim()) {
                          console.log(`🔄 Updating event ${event.id} userId from ${event.userId} to ${userId} (found matching email in old users)`);
                          eventsUpdated = true;
                          return { ...event, userId, userEmail };
                        }
                      } catch (e) {
                        // Ignore parsing errors
                      }
                    }
                  }
                  return event;
                });
                
                if (eventsUpdated) {
                  // Save updated events
                  localStorage.setItem('rsvp-events-storage', JSON.stringify({
                    state: {
                      events: updatedEvents,
                      deletedEvents: parsed.state.deletedEvents || [],
                      currentEvent: parsed.state.currentEvent || null
                    }
                  }));
                  allEvents = updatedEvents;
                }
              }
              
              // Filter events by userId (if logged in) ONLY for display
              // IMPORTANT: Admin can see ALL events
              let filteredEvents = allEvents;
              if (userId) {
                // Check if user is admin
                const userStorage = localStorage.getItem('rsvp-user-storage');
                let isAdmin = false;
                if (userStorage) {
                  const parsed = JSON.parse(userStorage);
                  isAdmin = parsed.state?.user?.isAdmin === true || parsed.state?.user?.id === 'admin-fixed-id';
                }
                
                if (isAdmin) {
                  // Admin sees all events
                  filteredEvents = allEvents;
                  console.log('👑 Admin user - showing all events');
                } else {
                  // Regular user sees only their events
                  filteredEvents = allEvents.filter((event: Event) => event.userId === userId);
                }
              }
              
              console.log('📋 Total events in storage:', allEvents.length);
              console.log('📋 Filtered events for user:', filteredEvents.length, 'userId:', userId);
              
              // IMPORTANT: Set only filtered events in state for display
              // But persist middleware will save ALL events from storage, not just filtered
              set({ events: filteredEvents, isLoading: false });
              
              // CRITICAL FIX: Ensure all events are preserved in localStorage
              // Don't let persist middleware overwrite with filtered events
              // We need to manually ensure all events stay in storage
              const currentStorage = localStorage.getItem('rsvp-events-storage');
              if (currentStorage) {
                const currentParsed = JSON.parse(currentStorage);
                // If storage has more events than what we're setting, preserve them
                if (currentParsed.state?.events?.length > allEvents.length) {
                  console.log('⚠️ Storage has more events, preserving them');
                  // Don't overwrite - keep existing storage
                } else {
                  // Ensure all events are saved
                  localStorage.setItem('rsvp-events-storage', JSON.stringify({
                    state: {
                      events: allEvents, // Save ALL events, not filtered
                      deletedEvents: parsed.state.deletedEvents || [],
                      currentEvent: parsed.state.currentEvent || null
                    }
                  }));
                }
              }
              
              return;
            }
          }
          
          // If no events found, don't create sample events
          console.log('📝 No events found in localStorage');
          set({ events: [], isLoading: false });
        } catch (error) {
          console.error('❌ Error fetching events:', error);
          set({ error: 'שגיאה בטעינת האירועים', isLoading: false });
        }
      },

      createEvent: async (eventData) => {
        console.log('🔍 createEvent called with:', eventData);
        set({ isLoading: true, error: null });
        try {
          const eventId = generateId();
          
          // Create 5 default campaigns according to the correct schedule
          const defaultCampaigns: Campaign[] = [
            {
              id: generateId(),
              eventId: eventId,
              name: 'הזמנה ראשונית',
              message: `🎉 שלום {{guest_name}}!

אנחנו שמחים להזמין אותך ל{{event_type}} של {{couple_name}}!

📅 {{event_date}} | 🕐 {{event_time}}
📍 {{venue}}

{{guest_response_link}}

בברכה,
{{couple_name}} 💕`,
              channel: 'whatsapp' as const,
              scheduledDate: new Date(eventData.eventDate.getTime() - 30 * 24 * 60 * 60 * 1000), // 30 days before
              status: 'draft' as const,
              sentCount: 0,
              responseCount: 0,
              createdAt: new Date(),
              updatedAt: new Date(),
              // Use WhatsApp template for first message
              templateName: 'aa', // Template name in Meta Business Manager
              // WhatsApp buttons
              whatsappButtons: [
                {
                  type: 'reply' as const,
                  reply: {
                    id: 'attendance_update',
                    title: 'לעדכון סטטוס הגעה'
                  }
                },
                {
                  type: 'reply' as const,
                  reply: {
                    id: 'gift_info',
                    title: 'להענקת מתנה'
                  }
                }
              ],
              // SMS fallback with link
              smsMessage: `שלום {{guest_name}}! 

אנחנו שמחים להזמין אותך ל{{event_type}} של {{groom_name}} ו{{bride_name}}! 

📅 תאריך: {{event_date}}
🕐 שעה: {{event_time}}
📍 מיקום: {{venue}}

אנא אשר/י הגעה בקישור הבא:
{{guest_response_link}}

בברכה,
{{couple_name}}`
            },
            {
              id: generateId(),
              name: 'תזכורת שנייה',
              message: `⏰ שלום {{guest_name}}! 

תזכורת חמה: ה{{event_type}} של {{couple_name}} מתקרב! 

📅 תאריך: {{event_date}}
🕐 שעה: {{event_time}}
📍 מיקום: {{venue}}

אם עדיין לא אשרת הגעה, אנא עשה זאת בקישור:
🔗 {{guest_response_link}}

מחכים לראות אותך! 🎉`,
              channel: 'whatsapp' as const,
              scheduledDate: new Date(eventData.eventDate.getTime() - 14 * 24 * 60 * 60 * 1000), // 14 days before
              status: 'draft' as const,
              sentCount: 0,
              responseCount: 0,
              createdAt: new Date(),
              updatedAt: new Date(),
              // Use WhatsApp template 'aa' for this campaign
              templateName: 'aa', // Template name in Meta Business Manager
              // WhatsApp buttons
              whatsappButtons: [
                {
                  type: 'reply',
                  reply: {
                    id: 'attendance_update',
                    title: 'לעדכון סטטוס הגעה'
                  }
                }
              ],
              // SMS fallback with link
              smsMessage: `שלום {{guest_name}}! 

תזכורת: ה{{event_type}} של {{couple_name}} מתקרב! 

📅 תאריך: {{event_date}}
🕐 שעה: {{event_time}}
📍 מיקום: {{venue}}

אם עדיין לא אשרת הגעה, אנא עשה זאת בקישור:
{{guest_response_link}}

מחכים לראות אותך!`
            },
            {
              id: generateId(),
              name: 'תזכורת שבועית',
              message: `⏰ שלום {{guest_name}}!

תזכורת אחרונה: אתם מוזמנים אל ה{{event_type}} של {{couple_name}}  האירוע ממש בקרוב אני אשרו הגעתכם

📅 תאריך: {{event_date}}

🕐 שעה: {{event_time}}

📍 מיקום: {{venue}}

אנא אשר/י הגעה עד סוף השבוע:

🔗 {{guest_response_link}}

בברכה,

{{couple_name}} 💕`,
              channel: 'whatsapp' as const,
              scheduledDate: new Date(eventData.eventDate.getTime() - 7 * 24 * 60 * 60 * 1000), // 7 days before
              status: 'draft' as const,
              sentCount: 0,
              responseCount: 0,
              createdAt: new Date(),
              updatedAt: new Date(),
              // Use WhatsApp template 'aa' for this campaign
              templateName: 'aa', // Template name in Meta Business Manager
              // WhatsApp buttons
              whatsappButtons: [
                {
                  type: 'reply',
                  reply: {
                    id: 'attendance_update',
                    title: 'לעדכון סטטוס הגעה'
                  }
                }
              ],
              // SMS fallback with link
              smsMessage: `⏰ שלום {{guest_name}}!

תזכורת אחרונה: אתם מוזמנים אל ה{{event_type}} של {{couple_name}}  האירוע ממש בקרוב אני אשרו הגעתכם

📅 תאריך: {{event_date}}

🕐 שעה: {{event_time}}

📍 מיקום: {{venue}}

אנא אשר/י הגעה עד סוף השבוע:
{{guest_response_link}}

בברכה,
{{couple_name}}`
            },
            {
              id: generateId(),
              name: 'תזכורת אחרונה',
              message: `🎉 שלום {{first_name}}! 

מחר זה קורה! ה{{event_type}} של {{couple_name}}! 

📅 תאריך: {{event_date}}
🕐 שעה: {{event_time}}
📍 מיקום: {{venue}}
🪑 שולחן: {{table_number}}

אנא הגיעו 15 דקות לפני הזמן.

🔗 לעדכן סטטוס ההגעה לחץ

לא לשכוח להביא מצב רוח טוב! 😊`,
              channel: 'whatsapp' as const,
              scheduledDate: new Date(eventData.eventDate.getTime() - 24 * 60 * 60 * 1000), // 1 day before
              status: 'draft' as const,
              sentCount: 0,
              responseCount: 0,
              createdAt: new Date(),
              updatedAt: new Date(),
              // Use WhatsApp template 'reminer' for this campaign
              templateName: 'reminer', // Template name in Meta is "reminer" (not "reminder")
              // WhatsApp buttons
              whatsappButtons: [
                {
                  type: 'reply',
                  reply: {
                    id: 'attendance_update',
                    title: 'לעדכון סטטוס הגעה'
                  }
                }
              ],
              // SMS fallback with link
              smsMessage: `שלום {{first_name}}! 

מחר זה קורה! ה{{event_type}} של {{couple_name}}! 

📅 תאריך: {{event_date}}
🕐 שעה: {{event_time}}
📍 מיקום: {{venue}}
🪑 שולחן: {{table_number}}

אנא הגיעו 15 דקות לפני הזמן.

🔗 לעדכן סטטוס ההגעה לחץ

לא לשכוח להביא מצב רוח טוב!

בברכה,
{{couple_name}}`
            },
            {
              id: generateId(),
              name: 'תזכורת יום האירוע',
              message: `🎉 שלום {{guest_name}}! 

היום זה היום! ה{{event_type}} של {{couple_name}} מתקיים היום! 

📅 תאריך: {{event_date}}
🕐 שעה: {{event_time}}
📍 מיקום: {{venue}}
🪑 שולחן: {{table_number}}

סרוק את קוד ה-QR המצורף כשתגיע לאולם כדי:
✅ לקבל הודעה על מספר השולחן שלך
✅ לקבל ברכה אישית
✅ להירשם במערכת שהגעת

מחכים לראות אותך! 💕

בברכה,
{{couple_name}}`,
              channel: 'whatsapp' as const,
              scheduledDate: new Date(new Date(eventData.eventDate).setHours(8, 0, 0, 0)), // Same day at 8 AM
              status: 'draft' as const,
              sentCount: 0,
              responseCount: 0,
              createdAt: new Date(),
              updatedAt: new Date(),
              // WhatsApp buttons
              whatsappButtons: [
                {
                  type: 'reply',
                  reply: {
                    id: 'attendance_update',
                    title: 'לעדכון סטטוס הגעה'
                  }
                }
              ],
              // SMS fallback with link
              smsMessage: `שלום {{guest_name}}! 

היום זה היום! ה{{event_type}} של {{couple_name}} מתקיים היום! 

📅 תאריך: {{event_date}}
🕐 שעה: {{event_time}}
📍 מיקום: {{venue}}
🪑 שולחן: {{table_number}}

סרוק את קוד ה-QR המצורף כשתגיע לאולם.

מחכים לראות אותך!

בברכה,
{{couple_name}}`
            },
            {
              id: generateId(),
              name: 'הודעת תודה למגיעים',
              message: `🙏 שלום {{guest_name}}! 

תודה רבה שהגעת ל{{event_type}} של {{couple_name}}! 

היה לנו כיף לראות אותך ולהיות איתנו ביום המיוחד הזה.

תודה על הברכות והמתנות! 💝

תמונות מהאירוע יועלו בקרוב.

באהבה,
{{couple_name}} 💕`,
              channel: 'whatsapp' as const,
              scheduledDate: new Date(eventData.eventDate.getTime() + 24 * 60 * 60 * 1000), // 1 day after
              status: 'draft' as const,
              sentCount: 0,
              responseCount: 0,
              createdAt: new Date(),
              updatedAt: new Date(),
              // SMS fallback with link
              smsMessage: `שלום {{guest_name}}! 

תודה רבה שהגעת ל{{event_type}} של {{couple_name}}! 

היה לנו כיף לראות אותך ולהיות איתנו ביום המיוחד הזה.

תודה על הברכות והמתנות!

תמונות מהאירוע יועלו בקרוב.

באהבה,
{{couple_name}}`
            }
          ];
          
          // Get userId and email from localStorage (temporary - will be from backend)
          const userStorage = localStorage.getItem('rsvp-user-storage');
          let userId = '';
          let userEmail = '';
          if (userStorage) {
            const parsed = JSON.parse(userStorage);
            userId = parsed.state?.user?.id || '';
            userEmail = parsed.state?.user?.email || '';
          }

          // Calculate credits needed (minimum 50, based on guest count)
          const guestCount = eventData.guests?.length || 0;
          const creditsNeeded = Math.max(50, Math.ceil(guestCount / 50) * 50); // Round up to nearest 50

          const newEvent: Event = {
            ...eventData,
            id: eventId,
            userId: userId || 'anonymous', // Add userId
            userEmail: userEmail || '', // Add userEmail for re-registration matching
            creditsUsed: creditsNeeded, // Add creditsUsed
            campaigns: defaultCampaigns,
            createdAt: new Date(),
            updatedAt: new Date()
          };
          
          // CRITICAL: Save to state first
          set(state => {
            console.log('🔍 Before createEvent - events count:', state.events.length);
            const updatedEvents = [...state.events, newEvent];
            console.log('🔍 After createEvent - events count:', updatedEvents.length);
            console.log('🔍 New event created with 5 default campaigns:', newEvent);
            return {
              events: updatedEvents,
              isLoading: false
            };
          });
          
          // CRITICAL: Immediately save to localStorage to prevent data loss
          // This ensures the event is saved even if fetchEvents is called right after
          try {
            const stored = localStorage.getItem('rsvp-events-storage');
            let allEvents: Event[] = [];
            let deletedEvents: any[] = [];
            
            if (stored) {
              try {
                const parsed = JSON.parse(stored);
                allEvents = parsed.state?.events || [];
                deletedEvents = parsed.state?.deletedEvents || [];
              } catch (e) {
                console.warn('⚠️ Error parsing stored events:', e);
              }
            }
            
            // Add new event if not already present
            if (!allEvents.find(e => e.id === newEvent.id)) {
              allEvents.push(newEvent);
              console.log('💾 Saved new event directly to localStorage:', newEvent.id);
              
              // Get current state to preserve currentEvent
              const currentState = get();
              
              localStorage.setItem('rsvp-events-storage', JSON.stringify({
                state: {
                  events: allEvents,
                  deletedEvents: deletedEvents,
                  currentEvent: currentState.currentEvent || null
                }
              }));
              
              console.log('✅ Event saved to localStorage successfully. Total events:', allEvents.length);
              
              // CRITICAL: Verify the event was saved correctly
              setTimeout(() => {
                const verifyStored = localStorage.getItem('rsvp-events-storage');
                if (verifyStored) {
                  try {
                    const verifyParsed = JSON.parse(verifyStored);
                    const verifyEvents = verifyParsed.state?.events || [];
                    const eventFound = verifyEvents.find((e: Event) => e.id === newEvent.id);
                    if (!eventFound) {
                      console.error('❌ CRITICAL: Event was not found in localStorage after save! Re-saving...');
                      // Re-save the event
                      verifyEvents.push(newEvent);
                      localStorage.setItem('rsvp-events-storage', JSON.stringify({
                        state: {
                          events: verifyEvents,
                          deletedEvents: verifyParsed.state?.deletedEvents || [],
                          currentEvent: verifyParsed.state?.currentEvent || null
                        }
                      }));
                      console.log('✅ Event re-saved to localStorage');
                    } else {
                      console.log('✅ Verified: Event found in localStorage');
                    }
                  } catch (e) {
                    console.error('❌ Error verifying event save:', e);
                  }
                }
              }, 100); // Check after 100ms
            } else {
              console.log('⚠️ Event already exists in localStorage:', newEvent.id);
            }
          } catch (error) {
            console.error('❌ Error saving event to localStorage:', error);
            // Try to save again as fallback
            try {
              const fallbackStored = localStorage.getItem('rsvp-events-storage');
              let fallbackEvents: Event[] = [];
              if (fallbackStored) {
                const fallbackParsed = JSON.parse(fallbackStored);
                fallbackEvents = fallbackParsed.state?.events || [];
              }
              if (!fallbackEvents.find(e => e.id === newEvent.id)) {
                fallbackEvents.push(newEvent);
                localStorage.setItem('rsvp-events-storage', JSON.stringify({
                  state: {
                    events: fallbackEvents,
                    deletedEvents: [],
                    currentEvent: null
                  }
                }));
                console.log('✅ Event saved via fallback method');
              }
            } catch (fallbackError) {
              console.error('❌ Fallback save also failed:', fallbackError);
            }
          }
          
          // Sync to API (for multi-computer access) - CRITICAL for data sync
          const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3002';
          try {
            console.log('🌐 Syncing new event to API...');
            const syncResponse = await fetch(`${BACKEND_URL}/api/events`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(newEvent)
            });
            if (syncResponse.ok) {
              console.log('✅ Event synced to API successfully');
            } else {
              const errorData = await syncResponse.json().catch(() => ({}));
              console.error('❌ API sync failed:', errorData);
            }
          } catch (error) {
            console.error('❌ Failed to sync event to API:', error);
            // Continue - localStorage is already updated
            // But log error so user knows sync failed
          }
        } catch (error) {
          set({ error: 'שגיאה ביצירת האירוע', isLoading: false });
        }
      },

      updateEvent: async (id, updates) => {
        set({ isLoading: true, error: null });
        try {
          let updatedEvent: Event | null = null;
          
          set(state => {
            const updatedEvents = state.events.map(event => {
              if (event.id === id) {
                updatedEvent = { ...event, ...updates, updatedAt: new Date() };
                return updatedEvent;
              }
              return event;
            });
            return {
              events: updatedEvents,
              isLoading: false
            };
          });
          
          // Sync to API (for multi-computer access)
          if (updatedEvent) {
            const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3002';
            try {
              console.log('🌐 Syncing updated event to API...');
              await fetch(`${BACKEND_URL}/api/events`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify(updatedEvent)
              });
              console.log('✅ Event update synced to API');
            } catch (error) {
              console.warn('⚠️ Failed to sync event update to API (will use localStorage):', error);
              // Continue - localStorage is already updated by Zustand persist
            }
          }
        } catch (error) {
          set({ error: 'שגיאה בעדכון האירוע', isLoading: false });
        }
      },

      deleteEvent: async (id) => {
        set({ isLoading: true, error: null });
        try {
          const eventToDelete = get().events.find(event => event.id === id);
          if (eventToDelete) {
          set(state => ({
            events: state.events.filter(event => event.id !== id),
              deletedEvents: [...state.deletedEvents, { ...eventToDelete, deletedAt: new Date() }],
            currentEvent: state.currentEvent?.id === id ? null : state.currentEvent,
            isLoading: false
          }));
          }
        } catch (error) {
          set({ error: 'שגיאה במחיקת האירוע', isLoading: false });
        }
      },

      setCurrentEvent: (event) => {
        console.log('🔍 setCurrentEvent called with:', event?.id);
        set({ currentEvent: event });
      },

      addGuest: async (eventId, guestData) => {
        console.log('🔍 addGuest called with:', { eventId, guestData });
        set({ isLoading: true, error: null });
        try {
          const newGuest: Guest = {
            ...guestData,
            id: generateId()
          };
          
          console.log('🔍 Generated new guest:', newGuest);
          
          set(state => {
            console.log('🔍 Current state events count:', state.events.length);
            console.log('🔍 Current event ID:', state.currentEvent?.id);
            
            const updatedEvents = state.events.map(event =>
              event.id === eventId
                ? { ...event, guests: [...event.guests, newGuest] }
                : event
            );
            
            const updatedCurrentEvent = state.currentEvent?.id === eventId 
              ? { ...state.currentEvent, guests: [...state.currentEvent.guests, newGuest] }
              : state.currentEvent;
            
            console.log('🔍 Before update - currentEvent guests count:', state.currentEvent?.guests?.length);
            console.log('🔍 After update - currentEvent guests count:', updatedCurrentEvent?.guests?.length);
            
            console.log('🔍 Updated events count:', updatedEvents.length);
            console.log('🔍 Updated current event guests count:', updatedCurrentEvent?.guests?.length);
            
            return {
              events: updatedEvents,
              currentEvent: updatedCurrentEvent,
              isLoading: false
            };
          });
          
          // CRITICAL: Sync to API immediately for real-time sync between devices
          const updatedEvent = get().events.find(e => e.id === eventId);
          if (updatedEvent) {
            syncEventToAPI(updatedEvent).catch(err => {
              console.error('❌ Final sync attempt failed:', err);
            });
          }
          
          console.log('✅ addGuest completed successfully');
        } catch (error) {
          console.error('❌ Error in addGuest:', error);
          set({ error: 'שגיאה בהוספת מוזמן', isLoading: false });
        }
      },

      updateGuest: async (eventId, guestId, updates) => {
        set({ isLoading: true, error: null });
        try {
          // CRITICAL: If updating guestCount, rsvpStatus, actualAttendance, tableId, firstName, lastName, or phoneNumber, mark as manual change
          const criticalFields = ['guestCount', 'rsvpStatus', 'actualAttendance', 'tableId', 'firstName', 'lastName', 'phoneNumber'];
          const hasCriticalField = criticalFields.some(field => updates[field] !== undefined);
          
          if (hasCriticalField) {
            const guestKey = `${eventId}-${guestId}`;
            set(state => {
              const newManualChanges = new Map(state.manualChanges);
              newManualChanges.set(guestKey, Date.now());
              return { manualChanges: newManualChanges };
            });
            console.log(`🛡️ Marked manual change for ${guestKey} (fields: ${Object.keys(updates).join(', ')})`);
          }
          
          let updatedEvent: Event | null = null;
          
          set(state => {
            const event = state.events.find(e => e.id === eventId);
            if (!event) {
              set({ isLoading: false });
              return;
            }
            
            // Find current guest to get old tableId if tableId is being updated
            const currentGuest = event.guests.find(g => g.id === guestId);
            const oldTableId = currentGuest?.tableId;
            const newTableId = updates.tableId;
            
            // Update guest - always add/update responseDate for timestamp-based conflict resolution
            const updatedGuests = event.guests.map(guest => {
              if (guest.id === guestId) {
                // If updating critical fields, ensure we have a timestamp
                const now = new Date();
                const currentResponseDate = guest.responseDate ? new Date(guest.responseDate) : new Date(0);
                const updateResponseDate = updates.responseDate ? new Date(updates.responseDate) : now;
                
                // Use the newer timestamp
                const finalResponseDate = updateResponseDate.getTime() >= currentResponseDate.getTime() 
                  ? updateResponseDate 
                  : currentResponseDate;
                
                return { 
                  ...guest, 
                  ...updates,
                  // Always update responseDate when critical fields change
                  responseDate: hasCriticalField ? finalResponseDate : (updates.responseDate || guest.responseDate || now)
                };
              }
              return guest;
            });
            
            // If tableId changed, update tables array
            let updatedTables = event.tables || [];
            if (updates.tableId !== undefined && newTableId !== oldTableId) {
              updatedTables = event.tables?.map(table => {
                // Remove guest from old table
                const tableGuestsWithoutGuest = table.guests.filter(id => id !== guestId);
                
                // Add guest to new table if not already there
                if (table.id === newTableId && !tableGuestsWithoutGuest.includes(guestId)) {
                  return { ...table, guests: [...tableGuestsWithoutGuest, guestId] };
                }
                
                // If removing from table (newTableId is undefined/null), just remove from old table
                if (!newTableId && table.id === oldTableId) {
                  return { ...table, guests: tableGuestsWithoutGuest };
                }
                
                // Keep table as is
                return { ...table, guests: tableGuestsWithoutGuest };
              }) || [];
            }
            
            const updatedEventObj = {
              ...event,
              guests: updatedGuests,
              tables: updatedTables,
              updatedAt: new Date()
            };
            
            // Find the updated event for API sync
            updatedEvent = updatedEventObj;
            
            const updatedCurrentEvent = state.currentEvent?.id === eventId 
              ? {
                  ...state.currentEvent,
                  guests: updatedGuests,
                  tables: updatedTables
                }
              : state.currentEvent;
            
            return {
              events: state.events.map(e => e.id === eventId ? updatedEventObj : e),
              currentEvent: updatedCurrentEvent,
              isLoading: false
            };
          });
          
          // CRITICAL: Sync to API immediately for real-time sync between devices
          if (updatedEvent) {
            const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3002';
            
            // Retry logic for reliable sync
            const syncToAPI = async (retries = 3): Promise<void> => {
              try {
                console.log('🌐 Syncing guest update to API...');
                console.log('📤 Sending updated event:', {
                  eventId: updatedEvent.id,
                  guestId: guestId,
                  updates: updates,
                  allFields: Object.keys(updates),
                  firstName: updates.firstName,
                  lastName: updates.lastName,
                  phoneNumber: updates.phoneNumber,
                  actualAttendance: updates.actualAttendance,
                  guestCount: updates.guestCount,
                  rsvpStatus: updates.rsvpStatus,
                  tableId: updates.tableId
                });
                
                // Log the full guest object being sent
                const updatedGuest = updatedEvent.guests.find(g => g.id === guestId);
                if (updatedGuest) {
                  console.log('📤 Full guest object being synced:', {
                    id: updatedGuest.id,
                    firstName: updatedGuest.firstName,
                    lastName: updatedGuest.lastName,
                    phoneNumber: updatedGuest.phoneNumber,
                    actualAttendance: updatedGuest.actualAttendance,
                    guestCount: updatedGuest.guestCount,
                    rsvpStatus: updatedGuest.rsvpStatus,
                    tableId: updatedGuest.tableId,
                    notes: updatedGuest.notes
                  });
                }
                
                const response = await fetch(`${BACKEND_URL}/api/events`, {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify(updatedEvent)
                });
                
                if (response.ok) {
                  const result = await response.json();
                  console.log('✅ Guest update synced to API successfully:', {
                    eventId: updatedEvent.id,
                    guestId: guestId,
                    syncedFields: Object.keys(updates)
                  });
                } else {
                  const errorText = await response.text();
                  console.warn('⚠️ API sync failed:', response.status, errorText);
                  if (retries > 0) {
                    console.log(`🔄 Retrying sync (${retries} retries left)...`);
                    await new Promise(resolve => setTimeout(resolve, 1000));
                    return syncToAPI(retries - 1);
                  }
                }
              } catch (error) {
                console.warn('⚠️ Failed to sync guest update to API:', error);
                if (retries > 0) {
                  console.log(`🔄 Retrying sync (${retries} retries left)...`);
                  await new Promise(resolve => setTimeout(resolve, 1000));
                  return syncToAPI(retries - 1);
                }
              }
            };
            
            // Sync immediately (don't await to avoid blocking UI)
            syncToAPI().catch(err => {
              console.error('❌ Final sync attempt failed:', err);
            });
            
            // CRITICAL: Invalidate cache when guest is manually updated
            // This ensures immediate updates are reflected
            const userStorage = localStorage.getItem('rsvp-user-storage');
            if (userStorage) {
              try {
                const parsed = JSON.parse(userStorage);
                const userId = parsed.state?.user?.id || '';
                if (userId) {
                  const cacheKey = CACHE_KEYS.EVENTS(userId);
                  cacheService.invalidate(cacheKey);
                  console.log(`🗑️ Invalidated cache for user ${userId} (manual guest update)`);
                }
              } catch (e) {
                // Ignore parsing errors
              }
            }
          }
        } catch (error) {
          console.error('❌ Error in updateGuest:', error);
          set({ error: 'שגיאה בעדכון מוזמן', isLoading: false });
        }
      },

      updateGuestResponse: async (eventId, guestId, updatedGuest) => {
        set({ isLoading: true, error: null });
        try {
          const currentState = get();
          console.log(`🔄 updateGuestResponse called:`, {
            eventId,
            guestId,
            oldStatus: currentState.events.find(e => e.id === eventId)?.guests?.find(g => g.id === guestId)?.rsvpStatus,
            newStatus: updatedGuest.rsvpStatus
          });
          
          let updatedEvent: Event | null = null;
          
          set(state => {
            const event = state.events.find(e => e.id === eventId);
            const guest = event?.guests?.find(g => g.id === guestId);
            
            console.log(`📋 Before update - Guest status:`, guest?.rsvpStatus);
            
            const updatedEvents = state.events.map(event => {
              if (event.id === eventId) {
                updatedEvent = {
                  ...event,
                  guests: event.guests.map(guest => {
                    if (guest.id === guestId) {
                      // CRITICAL: Use timestamp-based conflict resolution - latest update wins
                      const newResponseDate = updatedGuest.responseDate ? new Date(updatedGuest.responseDate) : new Date();
                      const oldResponseDate = guest.responseDate ? new Date(guest.responseDate) : new Date(0);
                      
                      // If new update is newer (or same), use it. Otherwise keep old values for that field
                      const isNewerUpdate = newResponseDate.getTime() >= oldResponseDate.getTime();
                      
                      // For guestCount and rsvpStatus: always use new value if provided and update is newer
                      // This ensures the latest update (whether manual or via link) always wins
                      const mergedGuest = { 
                        ...guest, 
                        ...updatedGuest,
                        // Always use new values if provided (latest update wins)
                        rsvpStatus: updatedGuest.rsvpStatus !== undefined ? updatedGuest.rsvpStatus : guest.rsvpStatus,
                        guestCount: updatedGuest.guestCount !== undefined ? updatedGuest.guestCount : (guest.guestCount || 1),
                        notes: updatedGuest.notes !== undefined ? updatedGuest.notes : (guest.notes || ''),
                        // Use the newer responseDate
                        responseDate: isNewerUpdate ? newResponseDate : oldResponseDate
                      };
                      
                      console.log(`🔧 Merging guest (latest update wins):`, {
                        old: { 
                          rsvpStatus: guest.rsvpStatus, 
                          guestCount: guest.guestCount,
                          responseDate: oldResponseDate.toISOString()
                        },
                        new: { 
                          rsvpStatus: updatedGuest.rsvpStatus, 
                          guestCount: updatedGuest.guestCount,
                          responseDate: newResponseDate.toISOString()
                        },
                        isNewer: isNewerUpdate,
                        merged: { 
                          rsvpStatus: mergedGuest.rsvpStatus, 
                          guestCount: mergedGuest.guestCount,
                          responseDate: mergedGuest.responseDate.toISOString()
                        }
                      });
                      
                      // Remove manual change protection if this update is newer
                      if (isNewerUpdate) {
                        const manualChangeKey = `${eventId}-${guestId}`;
                        state.manualChanges.delete(manualChangeKey);
                        console.log(`🔄 Removed manual change protection for ${manualChangeKey} - new update is newer`);
                      }
                      
                      return mergedGuest;
                    }
                    return guest;
                  }),
                  updatedAt: new Date()
                };
                return updatedEvent;
              }
              return event;
            });
            
            const updatedCurrentEvent = state.currentEvent?.id === eventId 
              ? {
                  ...state.currentEvent,
                  guests: state.currentEvent.guests.map(guest => {
                    if (guest.id === guestId) {
                      // Use timestamp-based conflict resolution - latest update wins
                      const newResponseDate = updatedGuest.responseDate ? new Date(updatedGuest.responseDate) : new Date();
                      const oldResponseDate = guest.responseDate ? new Date(guest.responseDate) : new Date(0);
                      const isNewerUpdate = newResponseDate.getTime() >= oldResponseDate.getTime();
                      
                      return {
                        ...guest,
                        ...updatedGuest,
                        // Always use new values if provided (latest update wins)
                        rsvpStatus: updatedGuest.rsvpStatus !== undefined ? updatedGuest.rsvpStatus : guest.rsvpStatus,
                        guestCount: updatedGuest.guestCount !== undefined ? updatedGuest.guestCount : (guest.guestCount || 1),
                        notes: updatedGuest.notes !== undefined ? updatedGuest.notes : (guest.notes || ''),
                        responseDate: isNewerUpdate ? newResponseDate : oldResponseDate
                      };
                    }
                    return guest;
                  })
                }
              : state.currentEvent;
            
            // Verify the update
            const verifyEvent = updatedEvents.find(e => e.id === eventId);
            const verifyGuest = verifyEvent?.guests?.find(g => g.id === guestId);
            console.log(`✅ After update - Guest status:`, verifyGuest?.rsvpStatus);
            
            return {
              events: updatedEvents,
              currentEvent: updatedCurrentEvent,
              isLoading: false
            };
          });
          
          // CRITICAL: Invalidate cache when guest response is updated (from link or WhatsApp)
          // This ensures immediate updates are reflected
          const userStorage = localStorage.getItem('rsvp-user-storage');
          if (userStorage) {
            try {
              const parsed = JSON.parse(userStorage);
              const userId = parsed.state?.user?.id || '';
              if (userId) {
                const cacheKey = CACHE_KEYS.EVENTS(userId);
                cacheService.invalidate(cacheKey);
                console.log(`🗑️ Invalidated cache for user ${userId} (guest response update)`);
              }
            } catch (e) {
              // Ignore parsing errors
            }
          }
          
          // Sync to API (for multi-computer access)
          if (updatedEvent) {
            const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3002';
            try {
              console.log('🌐 Syncing guest response update to API...');
              console.log('📤 Sending updated event:', {
                eventId: updatedEvent.id,
                guestId: guestId,
                updatedGuest: updatedEvent.guests.find(g => g.id === guestId)
              });
              
              const response = await fetch(`${BACKEND_URL}/api/events`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify(updatedEvent)
              });
              
              if (response.ok) {
                const result = await response.json();
                console.log('✅ Guest response update synced to API:', result);
                
                // Force refresh events from API to ensure all clients see the update
                setTimeout(() => {
                  get().fetchEvents().catch(err => {
                    console.warn('⚠️ Failed to refresh events after update:', err);
                  });
                }, 500);
              } else {
                const errorText = await response.text();
                console.warn('⚠️ API sync failed:', response.status, errorText);
              }
            } catch (error) {
              console.warn('⚠️ Failed to sync guest response update to API (will use localStorage):', error);
              // Continue - localStorage is already updated by Zustand persist
            }
          }
        } catch (error) {
          console.error('❌ Error in updateGuestResponse:', error);
          set({ error: 'שגיאה בעדכון תגובת מוזמן', isLoading: false });
        }
      },

      deleteGuest: async (eventId, guestId) => {
        set({ isLoading: true, error: null });
        try {
          set(state => {
            const updatedEvents = state.events.map(event =>
              event.id === eventId
                ? {
                    ...event,
                    guests: event.guests.filter(guest => guest.id !== guestId)
                  }
                : event
            );
            
            const updatedCurrentEvent = state.currentEvent?.id === eventId 
              ? {
                  ...state.currentEvent,
                  guests: state.currentEvent.guests.filter(guest => guest.id !== guestId)
                }
              : state.currentEvent;
            
            return {
              events: updatedEvents,
              currentEvent: updatedCurrentEvent,
              isLoading: false
            };
          });
          
          // CRITICAL: Sync to API immediately for real-time sync between devices
          const updatedEvent = get().events.find(e => e.id === eventId);
          if (updatedEvent) {
            syncEventToAPI(updatedEvent).catch(err => {
              console.error('❌ Final sync attempt failed:', err);
            });
          }
        } catch (error) {
          set({ error: 'שגיאה במחיקת מוזמן', isLoading: false });
        }
      },

      importGuestsFromExcel: async (eventId, data) => {
        set({ isLoading: true, error: null });
        try {
          const newGuests: Guest[] = data.map(guestData => ({
            id: generateId(),
            firstName: guestData.firstName,
            lastName: guestData.lastName,
            phoneNumber: guestData.phoneNumber,
            guestCount: guestData.guestCount,
            notes: guestData.notes,
            rsvpStatus: 'pending',
            channel: 'manual',
            actualAttendance: 'not_marked',
            tags: []
          }));

          set(state => ({
            events: state.events.map(event =>
              event.id === eventId
                ? { ...event, guests: [...event.guests, ...newGuests] }
                : event
            ),
            isLoading: false
          }));
          
          // CRITICAL: Sync to API immediately for real-time sync between devices
          const updatedEvent = get().events.find(e => e.id === eventId);
          if (updatedEvent) {
            syncEventToAPI(updatedEvent).catch(err => {
              console.error('❌ Final sync attempt failed:', err);
            });
          }
        } catch (error) {
          set({ error: 'שגיאה בייבוא נתונים', isLoading: false });
        }
      },

      exportGuestsToExcel: async (eventId) => {
        set({ isLoading: true, error: null });
        try {
          const event = get().events.find(e => e.id === eventId);
          if (!event) {
            throw new Error('אירוע לא נמצא');
          }

          const exportData: ExcelExportData[] = event.guests.map(guest => ({
            firstName: guest.firstName,
            lastName: guest.lastName,
            phoneNumber: guest.phoneNumber,
            guestCount: guest.guestCount,
            notes: guest.notes,
            rsvpStatus: guest.rsvpStatus,
            responseDate: guest.responseDate?.toISOString(),
            actualAttendance: guest.actualAttendance,
            attendanceDate: guest.attendanceDate?.toISOString()
          }));

          console.log('Exporting data:', exportData);
          set({ isLoading: false });
        } catch (error) {
          set({ error: 'שגיאה בייצוא נתונים', isLoading: false });
        }
      },

      createCampaign: async (campaignData) => {
        set({ isLoading: true, error: null });
        try {
          const newCampaign = {
            ...campaignData,
            id: generateId(),
            createdAt: new Date(),
            updatedAt: new Date()
          };

          set(state => ({
            events: state.events.map(event =>
              event.id === campaignData.eventId
                ? { 
                    ...event, 
                    campaigns: [...(event.campaigns || []), newCampaign],
                    updatedAt: new Date()
                  }
                : event
            ),
            isLoading: false
          }));
        } catch (error) {
          set({ error: 'שגיאה ביצירת הקמפיין', isLoading: false });
        }
      },

      sendCampaign: async (eventId: string, campaignId: string): Promise<BulkMessageResult> => {
        // CRITICAL: Ensure webhookService is running to receive updates after sending messages
        const { webhookService } = await import('../services/webhookService');
        if (!webhookService.pollingActive) {
          console.log('🔄 Starting webhook polling to receive guest updates after campaign send...');
          webhookService.startPolling(3000); // Poll every 3 seconds for faster updates after campaign
        } else {
          console.log('✅ Webhook polling already active - restarting with faster interval to receive updates immediately');
          webhookService.startPolling(3000); // Restart with faster interval
        }
        console.log('📡 System is now actively waiting for guest responses via WhatsApp buttons and guest links...');
        set({ isLoading: true, error: null });
        try {
          const event = get().events.find(e => e.id === eventId);
          if (!event) {
            throw new Error('Event not found');
          }

          const campaign = event.campaigns?.find(c => c.id === campaignId);
          if (!campaign) {
            throw new Error('Campaign not found');
          }

          const guests = event.guests || [];
          
          // Check if this is the "event day reminder" campaign (contains QR code)
          const isEventDayReminder = campaign.name === 'תזכורת יום האירוע';
          
          // Determine template name based on campaign FIRST (before building templateParams)
          // If campaign has explicit templateName, use it
          // Otherwise, use default templates based on campaign name
          let templateNameForCampaign = campaign.templateName;
          if (!templateNameForCampaign) {
            // Use template 'aa' for "הזמנה ראשונית"
            if (campaign.name === 'הזמנה ראשונית') {
              templateNameForCampaign = 'aa'; // Template name in Meta Business Manager
            } else if (campaign.name === 'תזכורת שנייה') {
              // Use template 'a' for "תזכורת שנייה"
              templateNameForCampaign = 'a';
            } else if (campaign.name === 'תזכורת שבועית') {
              templateNameForCampaign = 'aa';
            } else if (campaign.name === 'תזכורת אחרונה') {
              // Use template 'reminer' for "תזכורת אחרונה" campaign
              templateNameForCampaign = 'reminer';
            }
          }
          
          // Import helper function once before map
          const { generateGuestResponseLink } = await import('../utils/helpers');
          
          // Create personalized messages for each guest
          const personalizedMessages = await Promise.all(guests.map(async (guest) => {
            let personalizedMessage = campaign.message;
            let personalizedSmsMessage = campaign.smsMessage || campaign.message;
            
            // Replace the generic link with guest-specific link
            // Use helper function to ensure production URL (works on all devices)
            const guestLink = generateGuestResponseLink(eventId, guest.id);
            
            // Debug: Log the guest ID being used
            console.log('🔗 Campaign - Guest ID:', guest.id, 'for guest:', `${guest.firstName} ${guest.lastName}`);
            console.log('🔗 Campaign - Original message:', personalizedMessage);
            
            // Find the table number for this guest
            const guestTable = event.tables?.find(table => table.guests.includes(guest.id));
            const tableNumber = guestTable ? guestTable.number : 'לא הוקצה';
            
            // Replace template variables with actual values
            // Use consistent variable names: {{guest_name}} instead of {{first_name}}
            personalizedMessage = personalizedMessage
              .replace(/\{\{guest_name\}\}/g, guest.firstName)
              .replace(/\{\{first_name\}\}/g, guest.firstName) // Support both for backward compatibility
              .replace(/\{\{last_name\}\}/g, guest.lastName)
              .replace(/\{\{event_date\}\}/g, formatDate(event.eventDate))
              .replace(/\{\{event_time\}\}/g, event.eventTime)
              .replace(/\{\{event_type\}\}/g, event.eventTypeHebrew)
              .replace(/\{\{venue\}\}/g, event.venue)
              .replace(/\{\{couple_name\}\}/g, event.coupleName)
              .replace(/\{\{groom_name\}\}/g, event.groomName)
              .replace(/\{\{bride_name\}\}/g, event.brideName)
              .replace(/\{\{table_number\}\}/g, tableNumber.toString())
              .replace(/\{\{guest_response_link\}\}/g, guestLink);
            
            personalizedSmsMessage = personalizedSmsMessage
              .replace(/\{\{guest_name\}\}/g, guest.firstName)
              .replace(/\{\{first_name\}\}/g, guest.firstName) // Support both for backward compatibility
              .replace(/\{\{last_name\}\}/g, guest.lastName)
              .replace(/\{\{event_date\}\}/g, formatDate(event.eventDate))
              .replace(/\{\{event_time\}\}/g, event.eventTime)
              .replace(/\{\{event_type\}\}/g, event.eventTypeHebrew)
              .replace(/\{\{venue\}\}/g, event.venue)
              .replace(/\{\{couple_name\}\}/g, event.coupleName)
              .replace(/\{\{groom_name\}\}/g, event.groomName)
              .replace(/\{\{bride_name\}\}/g, event.brideName)
              .replace(/\{\{table_number\}\}/g, tableNumber.toString())
              .replace(/\{\{guest_response_link\}\}/g, guestLink);
            
            console.log('🔗 Campaign - Final message:', personalizedMessage);
            console.log('📏 Message length:', personalizedMessage.length, 'characters');
            console.log('📏 SMS Message length:', personalizedSmsMessage.length, 'characters');
            
            // Generate QR code image URL for event day reminder
            let qrCodeImageUrl: string | undefined;
            if (isEventDayReminder) {
              try {
                qrCodeImageUrl = await generateQRCodeImage(eventId, guest.id, 256);
                console.log('📱 Generated QR code for guest:', guest.id, qrCodeImageUrl);
              } catch (error) {
                console.error('❌ Error generating QR code:', error);
              }
            }
            
            return {
              guest,
              message: personalizedMessage,
              smsMessage: personalizedSmsMessage,
              qrCodeImageUrl
            };
          }));

          // Prepare template parameters for WhatsApp
          // IMPORTANT: Parameters must be in the exact order as defined in the Meta template
          // Order: {{1}} = first_name, {{2}} = event_type, {{3}} = groom_name, {{4}} = bride_name,
          //        {{5}} = event_date, {{6}} = event_time, {{7}} = venue, {{8}} = guest_response_link
          // generateGuestResponseLink is already imported above, use it here
          const recipients: MessageRecipient[] = personalizedMessages.map(({ guest, message, smsMessage, qrCodeImageUrl }) => {
            const guestTable = event.tables?.find(table => table.guests.includes(guest.id));
            const tableNumber = guestTable ? guestTable.number?.toString() : 'לא הוקצה';
            // Use helper function to ensure production URL (works on all devices)
            const guestLink = generateGuestResponseLink(eventId, guest.id);
            
            // Prepare template parameters based on the template name (use corrected templateNameForCampaign)
            // Different templates require different parameters
            let templateParams: any = {};
            
            if (templateNameForCampaign === 'aa' || templateNameForCampaign === 'AA' || templateNameForCampaign === 'a') {
              // Template "aa" requires these 9 parameters in order:
              // IMPORTANT: Order must match Meta template exactly: guest_name, event_type, bride_name, groom_name, event_date, event_time, venue, guest_response_link, couple_name
              // NOTE: Based on error message, the parameter name in Meta is "guest_response_link"
              templateParams = {
                paramsOrder: ['guest_name', 'event_type', 'bride_name', 'groom_name', 
                             'event_date', 'event_time', 'venue', 'guest_response_link', 'couple_name'],
                guest_name: guest.firstName,
                event_type: event.eventTypeHebrew,
                bride_name: event.brideName, // Parameter 3 - bride_name comes BEFORE groom_name in Meta template
                groom_name: event.groomName, // Parameter 4 - groom_name comes AFTER bride_name in Meta template
                event_date: formatDate(event.eventDate),
                event_time: event.eventTime,
                venue: event.venue,
                guest_response_link: guestLink, // Using guest_response_link as per Meta template definition
                couple_name: event.coupleName,
                language: 'he'
              };
            } else if (templateNameForCampaign === 'reminer' || templateNameForCampaign === 'reminder') {
              // Template "reminer" (note: name in Meta is "reminer", not "reminder") requires these 7 parameters in order:
              // 1. first_name (not guest_name!)
              // 2. event_type
              // 3. couple_name
              // 4. event_date
              // 5. event_time
              // 6. venue
              // 7. table_number
              // NOTE: guest_response_link is NOT included in this template
              const guestTable = event.tables?.find(table => table.guests.includes(guest.id));
              const tableNumber = guestTable ? guestTable.number?.toString() : 'לא הוקצה';
              
              templateParams = {
                paramsOrder: ['first_name', 'event_type', 'couple_name', 'event_date', 
                             'event_time', 'venue', 'table_number'],
                first_name: guest.firstName, // Parameter 1 - note: uses first_name, not guest_name
                event_type: event.eventTypeHebrew, // Parameter 2
                couple_name: event.coupleName, // Parameter 3
                event_date: formatDate(event.eventDate), // Parameter 4
                event_time: event.eventTime, // Parameter 5
                venue: event.venue, // Parameter 6
                table_number: tableNumber, // Parameter 7
                language: 'he' // Hebrew - as shown in Meta template
              };
            } else {
              // Default: use template "a" parameters
              // IMPORTANT: Order must match Meta template exactly: guest_name, event_type, bride_name, groom_name, event_date, event_time, venue, guest_response_link, couple_name
              // NOTE: Based on error message, the parameter name in Meta is "guest_response_link"
              templateParams = {
                paramsOrder: ['guest_name', 'event_type', 'bride_name', 'groom_name', 
                             'event_date', 'event_time', 'venue', 'guest_response_link', 'couple_name'],
                guest_name: guest.firstName,
                event_type: event.eventTypeHebrew,
                bride_name: event.brideName, // Parameter 3 - bride_name comes BEFORE groom_name in Meta template
                groom_name: event.groomName, // Parameter 4 - groom_name comes AFTER bride_name in Meta template
                event_date: formatDate(event.eventDate),
                event_time: event.eventTime,
                venue: event.venue,
                guest_response_link: guestLink, // Using guest_response_link as per Meta template definition
                couple_name: event.coupleName,
                language: 'he'
              };
            }
            
            // Create personalized buttons with guest-specific link
            const personalizedButtons = campaign.whatsappButtons?.map(button => {
              if (button.type === 'url' && button.url) {
                // Replace {{guest_response_link}} placeholder with actual guest link
                const buttonUrl = button.url.url.replace(/\{\{guest_response_link\}\}/g, guestLink);
                return {
                  type: 'url' as const,
                  url: buttonUrl,
                  title: button.url.title || 'אישור הגעה'
                };
              } else if (button.type === 'reply' && button.reply) {
                // Reply button - keep as is (no personalization needed)
                return {
                  type: 'reply' as const,
                  id: button.reply.id,
                  title: button.reply.title
                };
              }
              return button;
            }) || [
              // Default buttons
              {
                type: 'reply' as const,
                id: 'מגיע',
                title: 'מגיע'
              },
              {
                type: 'url' as const,
                url: guestLink,
                title: 'אישור הגעה'
              },
              {
                type: 'reply' as const,
                id: 'decline_attendance',
                title: 'לא אוכל להגיע'
              }
            ];
            
            return {
              id: guest.id,
              firstName: guest.firstName,
              lastName: guest.lastName,
              phoneNumber: guest.phoneNumber,
              channel: guest.channel as 'whatsapp' | 'sms',
              message: guest.channel === 'whatsapp' ? message : smsMessage,
              firstMessageSent: guest.firstMessageSent || false, // Pass first message status
              eventData: {
                coupleName: event.coupleName,
                groomName: event.groomName,
                brideName: event.brideName,
                eventType: event.eventType,
                eventTypeHebrew: event.eventTypeHebrew,
                eventDate: formatDate(event.eventDate),
                eventTime: event.eventTime,
                venue: event.venue,
                invitationImageUrl: qrCodeImageUrl || event.invitationImageUrl // Use QR code image for event day reminder
              },
              templateParams: guest.channel === 'whatsapp' ? templateParams : undefined,
              buttons: guest.channel === 'whatsapp' ? personalizedButtons : undefined
            };
          });

          // For event day reminder, use QR code image, otherwise use campaign image
          const imageUrlForCampaign = isEventDayReminder 
            ? undefined // QR codes will be in individual recipients
            : (campaign.imageUrl || undefined);
          
          const messageData: MessageData = {
            message: '', // Will be overridden by individual messages
            imageUrl: imageUrlForCampaign,
            recipients,
            // Use template if campaign specifies one (for first message campaigns)
            templateName: templateNameForCampaign
          };

          const result = await messageService.sendBulkMessages(messageData);
          
          // After sending campaign, ensure webhookService is actively listening
          console.log(`📤 Campaign sent successfully! ${result.successful} messages sent, ${result.failed} failed`);
          console.log(`👂 System is now actively waiting for guest responses...`);
          console.log(`📡 Webhook polling is ${webhookService.pollingActive ? 'ACTIVE' : 'INACTIVE'} - checking every 3 seconds for updates`);

          set(state => ({
            events: state.events.map(event =>
              event.id === eventId
                ? {
                    ...event,
                    campaigns: event.campaigns?.map(c =>
                      c.id === campaignId
                        ? { ...c, status: 'sent', sentCount: result.successful, updatedAt: new Date() }
                        : c
                    ),
                    updatedAt: new Date()
                  }
                : event
            ),
            isLoading: false
          }));

          return result;
        } catch (error) {
          set({ error: 'שגיאה בשליחת הקמפיין', isLoading: false });
          throw error;
        }
      },

      sendTestMessage: async (phoneNumber: string, message: string, channel: 'whatsapp' | 'sms'): Promise<boolean> => {
        set({ isLoading: true, error: null });
        try {
          const recipients: MessageRecipient[] = [{
            id: 'test',
            firstName: 'Test',
            lastName: 'User',
            phoneNumber,
            channel
          }];

          const messageData: MessageData = {
            message,
            recipients
          };

          const result = await messageService.sendBulkMessages(messageData);
          
          set({ isLoading: false });
          return result.successful > 0;
        } catch (error) {
          set({ error: 'שגיאה בשליחת הודעת בדיקה', isLoading: false });
          return false;
        }
      },



      // Venue Layout Management Functions
      createVenueLayout: async (eventId: string, layoutData) => {
        set({ isLoading: true, error: null });
        try {
          const layoutId = generateId();
          const newLayout = {
            ...layoutData,
            id: layoutId,
            createdAt: new Date(),
            updatedAt: new Date()
          };

          set((state) => ({
            events: state.events.map(event => 
              event.id === eventId 
                ? { 
                    ...event, 
                    venueLayout: newLayout,
                    updatedAt: new Date()
                  }
                : event
            ),
            currentEvent: state.currentEvent?.id === eventId 
              ? { 
                  ...state.currentEvent, 
                  venueLayout: newLayout,
                  updatedAt: new Date()
                }
              : state.currentEvent,
            isLoading: false
          }));
          
          // CRITICAL: Sync to API immediately for real-time sync between devices
          const updatedEvent = get().events.find(e => e.id === eventId);
          if (updatedEvent) {
            syncEventToAPI(updatedEvent).catch(err => {
              console.error('❌ Final sync attempt failed:', err);
            });
          }
        } catch (error) {
          set({ error: 'שגיאה ביצירת סקיצת אולם', isLoading: false });
        }
      },

      updateVenueLayout: async (eventId: string, updates) => {
        set({ isLoading: true, error: null });
        try {
          set((state) => ({
            events: state.events.map(event => 
              event.id === eventId 
                ? { 
                    ...event, 
                    venueLayout: event.venueLayout ? { ...event.venueLayout, ...updates, updatedAt: new Date() } : undefined,
                    updatedAt: new Date()
                  }
                : event
            ),
            currentEvent: state.currentEvent?.id === eventId 
              ? { 
                  ...state.currentEvent, 
                  venueLayout: state.currentEvent.venueLayout ? { ...state.currentEvent.venueLayout, ...updates, updatedAt: new Date() } : undefined,
                  updatedAt: new Date()
                }
              : state.currentEvent,
            isLoading: false
          }));
          
          // CRITICAL: Sync to API immediately for real-time sync between devices
          const updatedEvent = get().events.find(e => e.id === eventId);
          if (updatedEvent) {
            syncEventToAPI(updatedEvent).catch(err => {
              console.error('❌ Final sync attempt failed:', err);
            });
          }
        } catch (error) {
          set({ error: 'שגיאה בעדכון סקיצת אולם', isLoading: false });
        }
      },

      updateTablePosition: async (eventId: string, tableId: string, x: number, y: number) => {
        set({ isLoading: true, error: null });
        try {
          set((state) => ({
            events: state.events.map(event => 
              event.id === eventId 
                ? { 
                    ...event, 
                    tables: event.tables.map(table => 
                      table.id === tableId 
                        ? { ...table, x, y, updatedAt: new Date() }
                        : table
                    ),
                    updatedAt: new Date()
                  }
                : event
            ),
            currentEvent: state.currentEvent?.id === eventId 
              ? { 
                  ...state.currentEvent, 
                  tables: state.currentEvent.tables.map(table => 
                    table.id === tableId 
                      ? { ...table, x, y, updatedAt: new Date() }
                      : table
                  ),
                  updatedAt: new Date()
                }
              : state.currentEvent,
            isLoading: false
          }));
          
          // CRITICAL: Sync to API immediately for real-time sync between devices
          const updatedEvent = get().events.find(e => e.id === eventId);
          if (updatedEvent) {
            syncEventToAPI(updatedEvent).catch(err => {
              console.error('❌ Final sync attempt failed:', err);
            });
          }
        } catch (error) {
          set({ error: 'שגיאה בעדכון מיקום שולחן', isLoading: false });
        }
      },

      updateTableSize: async (eventId: string, tableId: string, width: number, height: number) => {
        set({ isLoading: true, error: null });
        try {
          set((state) => ({
            events: state.events.map(event => 
              event.id === eventId 
                ? { 
                    ...event, 
                    tables: event.tables.map(table => 
                      table.id === tableId 
                        ? { ...table, width, height, updatedAt: new Date() }
                        : table
                    ),
                    updatedAt: new Date()
                  }
                : event
            ),
            currentEvent: state.currentEvent?.id === eventId 
              ? { 
                  ...state.currentEvent, 
                  tables: state.currentEvent.tables.map(table => 
                    table.id === tableId 
                      ? { ...table, width, height, updatedAt: new Date() }
                      : table
                  ),
                  updatedAt: new Date()
                }
              : state.currentEvent,
            isLoading: false
          }));
          
          // CRITICAL: Sync to API immediately for real-time sync between devices
          const updatedEvent = get().events.find(e => e.id === eventId);
          if (updatedEvent) {
            syncEventToAPI(updatedEvent).catch(err => {
              console.error('❌ Final sync attempt failed:', err);
            });
          }
        } catch (error) {
          set({ error: 'שגיאה בעדכון גודל שולחן', isLoading: false });
        }
      },

      updateTableRotation: async (eventId: string, tableId: string, rotation: number) => {
        set({ isLoading: true, error: null });
        try {
          set((state) => ({
            events: state.events.map(event => 
              event.id === eventId 
                ? { 
                    ...event, 
                    tables: event.tables.map(table => 
                      table.id === tableId 
                        ? { ...table, rotation, updatedAt: new Date() }
                        : table
                    ),
                    updatedAt: new Date()
                  }
                : event
            ),
            currentEvent: state.currentEvent?.id === eventId 
              ? { 
                  ...state.currentEvent, 
                  tables: state.currentEvent.tables.map(table => 
                    table.id === tableId 
                      ? { ...table, rotation, updatedAt: new Date() }
                      : table
                  ),
                  updatedAt: new Date()
                }
              : state.currentEvent,
            isLoading: false
          }));
          
          // CRITICAL: Sync to API immediately for real-time sync between devices
          const updatedEvent = get().events.find(e => e.id === eventId);
          if (updatedEvent) {
            syncEventToAPI(updatedEvent).catch(err => {
              console.error('❌ Final sync attempt failed:', err);
            });
          }
        } catch (error) {
          set({ error: 'שגיאה בעדכון סיבוב שולחן', isLoading: false });
        }
      },

      updateTableShape: async (eventId: string, tableId: string, shape: 'rectangle' | 'circle' | 'oval') => {
        set({ isLoading: true, error: null });
        try {
          set((state) => ({
            events: state.events.map(event => 
              event.id === eventId 
                ? { 
                    ...event, 
                    tables: event.tables.map(table => 
                      table.id === tableId 
                        ? { ...table, shape, updatedAt: new Date() }
                        : table
                    ),
                    updatedAt: new Date()
                  }
                : event
            ),
            currentEvent: state.currentEvent?.id === eventId 
              ? { 
                  ...state.currentEvent, 
                  tables: state.currentEvent.tables.map(table => 
                    table.id === tableId 
                      ? { ...table, shape, updatedAt: new Date() }
                      : table
                  ),
                  updatedAt: new Date()
                }
              : state.currentEvent,
            isLoading: false
          }));
          
          // CRITICAL: Sync to API immediately for real-time sync between devices
          const updatedEvent = get().events.find(e => e.id === eventId);
          if (updatedEvent) {
            syncEventToAPI(updatedEvent).catch(err => {
              console.error('❌ Final sync attempt failed:', err);
            });
          }
        } catch (error) {
          set({ error: 'שגיאה בעדכון צורת שולחן', isLoading: false });
        }
      },

      // Function to restore a specific deleted event
      restoreDeletedEvent: async (deletedEventId: string) => {
        set({ isLoading: true, error: null });
        try {
          const deletedEvent = get().deletedEvents.find(event => event.id === deletedEventId);
          if (deletedEvent) {
            // Remove deletedAt property and restore the event
            const { deletedAt, ...eventToRestore } = deletedEvent;
            
            set(state => ({
              events: [...state.events, eventToRestore],
              deletedEvents: state.deletedEvents.filter(event => event.id !== deletedEventId),
              isLoading: false
            }));
            
            return true;
          }
          return false;
        } catch (error) {
          set({ error: 'שגיאה בשחזור האירוע', isLoading: false });
          return false;
        }
      },

      // Function to permanently delete an event from deleted events
      permanentlyDeleteEvent: async (deletedEventId: string) => {
        set({ isLoading: true, error: null });
        try {
          set(state => ({
            deletedEvents: state.deletedEvents.filter(event => event.id !== deletedEventId),
            isLoading: false
          }));
          return true;
        } catch (error) {
          set({ error: 'שגיאה במחיקה סופית של האירוע', isLoading: false });
          return false;
        }
      },

      // Function to restore events from localStorage
      restoreEvents: () => {
        try {
          const stored = localStorage.getItem('rsvp-events-storage');
          if (stored) {
            const parsed = JSON.parse(stored);
            if (parsed.state && parsed.state.events) {
              console.log('🔄 Restoring events from localStorage:', parsed.state.events.length);
              console.log('📋 Events data:', parsed.state.events);
              
              // Force complete restoration by updating the store directly
              set((state) => {
                console.log('🔄 Current state before restore:', state);
                return {
                  ...state,
                  events: parsed.state.events,
                  currentEvent: parsed.state.currentEvent || null
                };
              });
              
              // Log details about each event
              parsed.state.events.forEach((event: any, index: number) => {
                console.log(`📅 Event ${index + 1}:`, {
                  id: event.id,
                  coupleName: event.coupleName,
                  guestsCount: event.guests?.length || 0,
                  campaignsCount: event.campaigns?.length || 0,
                  tablesCount: event.tables?.length || 0
                });
              });
              
              return true;
            }
          }
          return false;
        } catch (error) {
          console.error('❌ Error restoring events:', error);
          return false;
        }
      },

      // Force refresh from localStorage
      forceRefresh: () => {
        try {
          const stored = localStorage.getItem('rsvp-events-storage');
          if (stored) {
            const parsed = JSON.parse(stored);
            console.log('🔄 Force refreshing from localStorage...', parsed);
            
            if (parsed.state) {
              set(parsed.state);
              return true;
            }
          }
          return false;
        } catch (error) {
          console.error('❌ Error force refreshing:', error);
          return false;
        }
      },

      // Clean up duplicate data in localStorage
      cleanupLocalStorage: () => {
        try {
          // Remove old 'event-store' key if it exists
          localStorage.removeItem('event-store');
          
          // Get current data
          const stored = localStorage.getItem('rsvp-events-storage');
          if (stored) {
            const parsed = JSON.parse(stored);
            console.log('🧹 Cleaning up localStorage...', parsed);
            
            if (parsed.state && parsed.state.events) {
              // Remove duplicate events (keep only the most recent)
              const uniqueEvents = parsed.state.events.filter((event: any, index: number, self: any[]) => 
                index === self.findIndex(e => e.coupleName === event.coupleName)
              );
              
              if (uniqueEvents.length !== parsed.state.events.length) {
                console.log(`🧹 Removed ${parsed.state.events.length - uniqueEvents.length} duplicate events`);
                parsed.state.events = uniqueEvents;
                localStorage.setItem('rsvp-events-storage', JSON.stringify(parsed));
              }
              
              return true;
            }
          }
          return false;
        } catch (error) {
          console.error('❌ Error cleaning up localStorage:', error);
          return false;
        }
      },

      // Function to update existing events campaigns with consistent variable names
      updateExistingEventsCampaigns: () => {
        console.log('🔄 Updating existing events campaigns with consistent variable names...');
        set(state => {
          const updatedEvents = state.events.map(event => {
            if (!event.campaigns || event.campaigns.length === 0) {
              return event;
            }
            
            // Update all campaigns to use consistent variable names
            const updatedCampaigns = event.campaigns.map(campaign => {
              console.log(`✅ Updating campaign "${campaign.name}" for event "${event.coupleName}"`);
              
              // Update message to use consistent variable names
              let updatedMessage = campaign.message
                .replace(/\{\{first_name\}\}/g, '{{guest_name}}')
                .replace(/\{\{last_name\}\}/g, '')
                // Update ending to use couple_name instead of groom_name + bride_name
                .replace(/בברכה,\s*\{\{groom_name\}\} ו\{\{bride_name\}\}/g, 'בברכה,\n{{couple_name}} 💕')
                .replace(/בברכה,\s*\{\{groom_name\}\} ו\{\{bride_name\}\}\s*💕/g, 'בברכה,\n{{couple_name}} 💕');
              
              // Special handling for "תזכורת אחרונה" campaign - remove guest_response_link and use first_name
              if (campaign.name === 'תזכורת אחרונה') {
                updatedMessage = updatedMessage
                  .replace(/\{\{guest_name\}\}/g, '{{first_name}}')
                  .replace(/🔗\s*לעדכן סטטוס[^:]*:\s*\{\{guest_response_link\}\}/g, '🔗 לעדכן סטטוס ההגעה לחץ')
                  .replace(/\{\{guest_response_link\}\}/g, '')
                  .replace(/לעדכן סטטוס[^:]*:\s*\{\{guest_response_link\}\}/g, 'לעדכן סטטוס ההגעה לחץ')
                  .replace(/בברכה,\s*\{\{couple_name\}\}\s*💕/g, '')
                  .trim();
              }
              
              // Update SMS message as well
              let updatedSmsMessage = campaign.smsMessage;
              if (updatedSmsMessage) {
                updatedSmsMessage = updatedSmsMessage
                  .replace(/\{\{first_name\}\}/g, '{{guest_name}}')
                  .replace(/\{\{last_name\}\}/g, '')
                  .replace(/בברכה,\s*\{\{groom_name\}\} ו\{\{bride_name\}\}/g, 'בברכה,\n{{couple_name}}');
                
                // Special handling for "תזכורת אחרונה" campaign SMS
                if (campaign.name === 'תזכורת אחרונה') {
                  updatedSmsMessage = updatedSmsMessage
                    .replace(/\{\{guest_name\}\}/g, '{{first_name}}')
                    .replace(/🔗\s*לעדכן סטטוס[^:]*:\s*\{\{guest_response_link\}\}/g, '🔗 לעדכן סטטוס ההגעה לחץ')
                    .replace(/\{\{guest_response_link\}\}/g, '')
                    .replace(/לעדכן סטטוס[^:]*:\s*\{\{guest_response_link\}\}/g, 'לעדכן סטטוס ההגעה לחץ');
                }
              }
              
              // Set templateName for campaigns that should use template 'aa'
              let updatedTemplateName = campaign.templateName;
              if (campaign.name === 'הזמנה ראשונית' || 
                  campaign.name === 'תזכורת שנייה' || 
                  campaign.name === 'תזכורת שבועית') {
                // Force lowercase 'aa' - Meta is case-sensitive!
                updatedTemplateName = 'aa'; // Template name in Meta Business Manager (lowercase!)
                console.log(`   📋 Set templateName to 'aa' (lowercase) for campaign "${campaign.name}"`);
              } else if (campaign.templateName === 'AA') {
                // Fix old campaigns that might have 'AA' instead of 'aa'
                updatedTemplateName = 'aa';
                console.log(`   📋 Fixed templateName from 'AA' to 'aa' for campaign "${campaign.name}"`);
              } else if (campaign.name === 'תזכורת אחרונה') {
                // Reminder campaign uses template "reminer" (note: name in Meta is "reminer", not "reminder")
                updatedTemplateName = 'reminer';
                console.log(`   📋 Set templateName to 'reminer' for campaign "${campaign.name}"`);
              }
              
              return {
                ...campaign,
                message: updatedMessage,
                smsMessage: updatedSmsMessage,
                templateName: updatedTemplateName,
                updatedAt: new Date()
              };
            });
            
            return {
              ...event,
              campaigns: updatedCampaigns,
              updatedAt: new Date()
            };
          });
          
          console.log(`✅ Updated ${updatedEvents.length} events`);
          return { events: updatedEvents };
        });
      },

      // Function to recreate campaigns with correct links
      recreateCampaigns: async (eventId: string) => {
        console.log('🔄 recreateCampaigns called with eventId:', eventId);
        const event = get().events.find(e => e.id === eventId);
        if (!event) {
          console.log('❌ Event not found for campaign recreation');
          return;
        }

        console.log('📅 Found event:', event.coupleName, 'with', event.campaigns?.length || 0, 'existing campaigns');

        // Convert eventDate to Date object if it's a string
        const eventDate = typeof event.eventDate === 'string' 
          ? new Date(event.eventDate) 
          : event.eventDate;

        console.log('🗑️ Deleting old campaigns and creating new ones...');

        // Create new campaigns with correct guest links
        const newCampaigns: Campaign[] = [
          {
            id: generateId(),
            eventId: eventId,
            name: 'הזמנה ראשונית',
            message: `🎉 שלום {{guest_name}}! 

אנחנו שמחים להזמין אותך ל{{event_type}} של {{groom_name}} ו{{bride_name}}! 

📅 {{event_date}} | 🕐 {{event_time}}
📍 {{venue}}

{{guest_response_link}}

בברכה,
{{couple_name}} 💕`,
            channel: 'whatsapp' as const,
            scheduledDate: new Date(eventDate.getTime() - 30 * 24 * 60 * 60 * 1000),
            status: 'draft' as const,
            sentCount: 0,
            responseCount: 0,
            // Use WhatsApp template for first message
            templateName: 'aa', // Template name in Meta Business Manager
            whatsappButtons: [
              {
                type: 'url',
                url: {
                  url: '{{guest_response_link}}',
                  title: 'עדכון סטטוס הגעה'
                }
              },
              {
                type: 'reply',
                reply: {
                  id: 'decline_attendance',
                  title: 'לא אוכל להגיע'
                }
              },
              {
                type: 'reply',
                reply: {
                  id: 'confirm_attendance',
                  title: 'מגיע'
                }
              }
            ],
            smsMessage: `שלום {{guest_name}}! 

אנחנו שמחים להזמין אותך ל{{event_type}} של {{groom_name}} ו{{bride_name}}! 

📅 תאריך: {{event_date}}
🕐 שעה: {{event_time}}
📍 מיקום: {{venue}}

אנא אשר/י הגעה בקישור הבא:
{{guest_response_link}}

בברכה,
{{couple_name}}`,
            createdAt: new Date(),
            updatedAt: new Date()
          },
          {
            id: generateId(),
            eventId: eventId,
            name: 'תזכורת שנייה',
            message: `שלום! רק שבועיים לאירוע! 🎊

📅 {{event_date}}
📍 {{venue}}

אם עדיין לא אישרתם הגעה, אנא עשו זאת עכשיו!

🔗 לאשר הגעה ולעדכן סטטוס: {{guest_response_link}}

נרגש לראות אתכם!`,
            channel: 'whatsapp' as const,
            scheduledDate: new Date(eventDate.getTime() - 14 * 24 * 60 * 60 * 1000),
            status: 'draft' as const,
            sentCount: 0,
            responseCount: 0,
            // Use WhatsApp template 'a' for this campaign
            templateName: 'a',
            whatsappButtons: [
              {
                type: 'url',
                url: {
                  url: '{{guest_response_link}}',
                  title: 'עדכון סטטוס הגעה'
                }
              },
              {
                type: 'reply',
                reply: {
                  id: 'decline_attendance',
                  title: 'לא אוכל להגיע'
                }
              },
              {
                type: 'reply',
                reply: {
                  id: 'confirm_attendance',
                  title: 'מגיע'
                }
              }
            ],
            smsMessage: `שלום {{guest_name}}! 

תזכורת: ה{{event_type}} של {{couple_name}} מתקרב! 

📅 תאריך: {{event_date}}
🕐 שעה: {{event_time}}
📍 מיקום: {{venue}}

אם עדיין לא אשרת הגעה, אנא עשה זאת בקישור:
{{guest_response_link}}

מחכים לראות אותך!`,
            createdAt: new Date(),
            updatedAt: new Date()
          },
          {
            id: generateId(),
            eventId: eventId,
            name: 'תזכורת שבועית',
            message: `⏰ שלום {{guest_name}}!

תזכורת אחרונה: אתם מוזמנים אל ה{{event_type}} של {{couple_name}}  האירוע ממש בקרוב אני אשרו הגעתכם

📅 תאריך: {{event_date}}

🕐 שעה: {{event_time}}

📍 מיקום: {{venue}}

אנא אשר/י הגעה עד סוף השבוע:

🔗 {{guest_response_link}}

בברכה,

{{couple_name}} 💕`,
            channel: 'whatsapp' as const,
            scheduledDate: new Date(eventDate.getTime() - 7 * 24 * 60 * 60 * 1000),
            status: 'draft' as const,
            sentCount: 0,
            responseCount: 0,
            // Use WhatsApp template 'a' for this campaign
            templateName: 'a',
            whatsappButtons: [
              {
                type: 'url',
                url: {
                  url: '{{guest_response_link}}',
                  title: 'עדכון סטטוס הגעה'
                }
              },
              {
                type: 'reply',
                reply: {
                  id: 'decline_attendance',
                  title: 'לא אוכל להגיע'
                }
              },
              {
                type: 'reply',
                reply: {
                  id: 'confirm_attendance',
                  title: 'מגיע'
                }
              }
            ],
            smsMessage: `⏰ שלום {{guest_name}}!

תזכורת אחרונה: אתם מוזמנים אל ה{{event_type}} של {{couple_name}}  האירוע ממש בקרוב אני אשרו הגעתכם

📅 תאריך: {{event_date}}

🕐 שעה: {{event_time}}

📍 מיקום: {{venue}}

אנא אשר/י הגעה עד סוף השבוע:

{{guest_response_link}}

בברכה,

{{couple_name}}`,
            createdAt: new Date(),
            updatedAt: new Date()
          },
          {
            id: generateId(),
            eventId: eventId,
            name: 'תזכורת אחרונה',
            message: `🎉 שלום {{first_name}}! 

מחר זה קורה! ה{{event_type}} של {{couple_name}}! 

📅 תאריך: {{event_date}}
🕐 שעה: {{event_time}}
📍 מיקום: {{venue}}
🪑 שולחן: {{table_number}}

אנא הגיעו 15 דקות לפני הזמן.

🔗 לעדכן סטטוס ההגעה לחץ

לא לשכוח להביא מצב רוח טוב! 😊`,
            channel: 'whatsapp' as const,
            scheduledDate: new Date(eventDate.getTime() - 24 * 60 * 60 * 1000),
            status: 'draft' as const,
            sentCount: 0,
            responseCount: 0,
            // Use WhatsApp template 'reminer' for this campaign
            templateName: 'reminer', // Template name in Meta is "reminer" (not "reminder")
            whatsappButtons: [
              {
                type: 'url',
                url: {
                  url: '{{guest_response_link}}',
                  title: 'עדכון סטטוס הגעה'
                }
              },
              {
                type: 'reply',
                reply: {
                  id: 'decline_attendance',
                  title: 'לא אוכל להגיע'
                }
              },
              {
                type: 'reply',
                reply: {
                  id: 'confirm_attendance',
                  title: 'מגיע'
                }
              }
            ],
            smsMessage: `שלום {{first_name}}! 

מחר זה קורה! ה{{event_type}} של {{couple_name}}! 

📅 תאריך: {{event_date}}
🕐 שעה: {{event_time}}
📍 מיקום: {{venue}}
🪑 שולחן: {{table_number}}

אנא הגיעו 15 דקות לפני הזמן.

🔗 לעדכן סטטוס ההגעה לחץ

לא לשכוח להביא מצב רוח טוב!

בברכה,
{{couple_name}}`,
            createdAt: new Date(),
            updatedAt: new Date()
          },
          {
            id: generateId(),
            eventId: eventId,
            name: 'הודעת תודה למגיעים',
            message: `🙏 שלום {{guest_name}}! 

תודה רבה שהגעת ל{{event_type}} של {{couple_name}}! 

היה לנו כיף לראות אותך ולהיות איתנו ביום המיוחד הזה.

תודה על הברכות והמתנות! 💝

תמונות מהאירוע יועלו בקרוב.

באהבה,
{{couple_name}} 💕`,
            channel: 'whatsapp' as const,
            scheduledDate: new Date(eventDate.getTime() + 24 * 60 * 60 * 1000),
            status: 'draft' as const,
            sentCount: 0,
            responseCount: 0,
            smsMessage: `שלום {{guest_name}}! 

תודה רבה שהגעת ל{{event_type}} של {{couple_name}}! 

היה לנו כיף לראות אותך ולהיות איתנו ביום המיוחד הזה.

תודה על הברכות והמתנות!

תמונות מהאירוע יועלו בקרוב.

באהבה,
{{couple_name}}`,
            createdAt: new Date(),
            updatedAt: new Date()
          }
        ];

        // Update the event with new campaigns
        let updatedEvent: Event | undefined;
        set(state => {
          const updatedEvents = state.events.map(e => 
            e.id === eventId 
              ? { ...e, campaigns: newCampaigns, updatedAt: new Date() }
              : e
          );
          
          updatedEvent = updatedEvents.find(e => e.id === eventId);
          
          console.log('🔄 Updated events in state');
          console.log('📊 Event campaigns after update:', updatedEvent?.campaigns?.length || 0);
          
          return { events: updatedEvents };
        });

        // Sync to API immediately after state update
        if (updatedEvent) {
          try {
            await syncEventToAPI(updatedEvent);
            console.log('✅ Recreated campaigns synced to API successfully');
          } catch (error) {
            console.error('❌ Failed to sync recreated campaigns to API:', error);
            // Don't throw - the campaigns were created locally, API sync is secondary
          }
        }

        console.log('🔄 Recreated campaigns with correct guest links');
        console.log('📊 New campaigns created:', newCampaigns.length);
        console.log('🔗 Sample link from first campaign:', newCampaigns[0]?.message?.includes('?guest={{guest_id}}') ? 'CORRECT' : 'INCORRECT');
        console.log('🔗 Full message preview:', newCampaigns[0]?.message?.substring(0, 200) + '...');
      },

      // Table management functions
      addTable: async (eventId: string, tableData: Omit<Table, 'id' | 'createdAt' | 'updatedAt'>) => {
        set({ isLoading: true, error: null });
        try {
          const event = get().events.find(e => e.id === eventId);
          if (!event) {
            throw new Error('Event not found');
          }

          const newTable: Table = {
            id: generateId(),
            ...tableData,
            guests: [],
            createdAt: new Date(),
            updatedAt: new Date()
          };

          set(state => ({
            events: state.events.map(e => 
              e.id === eventId 
                ? { ...e, tables: [...(e.tables || []), newTable] }
                : e
            ),
            currentEvent: state.currentEvent?.id === eventId 
              ? { ...state.currentEvent, tables: [...(state.currentEvent.tables || []), newTable] }
              : state.currentEvent,
            isLoading: false
          }));
          
          // CRITICAL: Sync to API immediately for real-time sync between devices
          const updatedEvent = get().events.find(e => e.id === eventId);
          if (updatedEvent) {
            syncEventToAPI(updatedEvent).catch(err => {
              console.error('❌ Final sync attempt failed:', err);
            });
          }
        } catch (error) {
          set({ error: 'שגיאה בהוספת השולחן', isLoading: false });
        }
      },

      updateTable: async (eventId: string, tableId: string, updates: Partial<Table>) => {
        set({ isLoading: true, error: null });
        try {
          set(state => ({
            events: state.events.map(e => 
              e.id === eventId 
                ? { 
                    ...e, 
                    tables: e.tables?.map(t => 
                      t.id === tableId 
                        ? { ...t, ...updates, updatedAt: new Date() }
                        : t
                    ) || []
                  }
                : e
            ),
            currentEvent: state.currentEvent?.id === eventId 
              ? { 
                  ...state.currentEvent, 
                  tables: state.currentEvent.tables?.map(t => 
                    t.id === tableId 
                      ? { ...t, ...updates, updatedAt: new Date() }
                      : t
                  ) || []
                }
              : state.currentEvent,
            isLoading: false
          }));
          
          // CRITICAL: Sync to API immediately for real-time sync between devices
          const updatedEvent = get().events.find(e => e.id === eventId);
          if (updatedEvent) {
            syncEventToAPI(updatedEvent).catch(err => {
              console.error('❌ Final sync attempt failed:', err);
            });
          }
        } catch (error) {
          set({ error: 'שגיאה בעדכון השולחן', isLoading: false });
        }
      },

      deleteTable: async (eventId: string, tableId: string) => {
        set({ isLoading: true, error: null });
        try {
          set(state => ({
            events: state.events.map(e => 
              e.id === eventId 
                ? { 
                    ...e, 
                    tables: e.tables?.filter(t => t.id !== tableId) || [],
                    guests: e.guests?.map(guest => 
                      guest.tableId === tableId 
                        ? { ...guest, tableId: undefined }
                        : guest
                    ) || []
                  }
                : e
            ),
            currentEvent: state.currentEvent?.id === eventId 
              ? { 
                  ...state.currentEvent, 
                  tables: state.currentEvent.tables?.filter(t => t.id !== tableId) || [],
                  guests: state.currentEvent.guests?.map(guest => 
                    guest.tableId === tableId 
                      ? { ...guest, tableId: undefined }
                      : guest
                  ) || []
                }
              : state.currentEvent,
            isLoading: false
          }));
          
          // CRITICAL: Sync to API immediately for real-time sync between devices
          const updatedEvent = get().events.find(e => e.id === eventId);
          if (updatedEvent) {
            syncEventToAPI(updatedEvent).catch(err => {
              console.error('❌ Final sync attempt failed:', err);
            });
          }
        } catch (error) {
          set({ error: 'שגיאה במחיקת השולחן', isLoading: false });
        }
      },

      assignGuestToTable: async (eventId: string, guestId: string, tableId: string, seatNumber?: number) => {
        set({ isLoading: true, error: null });
        try {
          set(state => {
            const event = state.events.find(e => e.id === eventId);
            if (!event) {
              set({ isLoading: false });
              return;
            }
            
            // Update guest's tableId
            const updatedGuests = event.guests?.map(guest => 
              guest.id === guestId 
                ? { ...guest, tableId: tableId, seatNumber: seatNumber }
                : guest
            ) || [];
            
            // Update tables: remove guest from old table, add to new table
            const updatedTables = event.tables?.map(table => {
              // Remove guest from old table if it was assigned
              const oldTableGuests = table.guests.filter(id => id !== guestId);
              
              // Add guest to new table if not already there
              if (table.id === tableId && !oldTableGuests.includes(guestId)) {
                return { ...table, guests: [...oldTableGuests, guestId] };
              }
              
              return { ...table, guests: oldTableGuests };
            }) || [];
            
            const updatedEvent = {
              ...event,
              guests: updatedGuests,
              tables: updatedTables
            };
            
            return {
              events: state.events.map(e => e.id === eventId ? updatedEvent : e),
              currentEvent: state.currentEvent?.id === eventId 
                ? { 
                    ...state.currentEvent, 
                    guests: updatedGuests,
                    tables: updatedTables
                  }
                : state.currentEvent,
              isLoading: false
            };
          });
          
          // CRITICAL: Sync to API immediately for real-time sync between devices
          const updatedEvent = get().events.find(e => e.id === eventId);
          if (updatedEvent) {
            syncEventToAPI(updatedEvent).catch(err => {
              console.error('❌ Final sync attempt failed:', err);
            });
          }
        } catch (error) {
          set({ error: 'שגיאה בהקצאת האורח לשולחן', isLoading: false });
        }
      },

      removeGuestFromTable: async (eventId: string, guestId: string) => {
        set({ isLoading: true, error: null });
        try {
          set(state => {
            const event = state.events.find(e => e.id === eventId);
            if (!event) {
              set({ isLoading: false });
              return;
            }
            
            // Update guest's tableId to undefined
            const updatedGuests = event.guests?.map(guest => 
              guest.id === guestId 
                ? { ...guest, tableId: undefined, seatNumber: undefined }
                : guest
            ) || [];
            
            // Remove guest from all tables
            const updatedTables = event.tables?.map(table => ({
              ...table,
              guests: table.guests.filter(id => id !== guestId)
            })) || [];
            
            const updatedEvent = {
              ...event,
              guests: updatedGuests,
              tables: updatedTables
            };
            
            return {
              events: state.events.map(e => e.id === eventId ? updatedEvent : e),
              currentEvent: state.currentEvent?.id === eventId 
                ? { 
                    ...state.currentEvent, 
                    guests: updatedGuests,
                    tables: updatedTables
                  }
                : state.currentEvent,
              isLoading: false
            };
          });
          
          // CRITICAL: Sync to API immediately for real-time sync between devices
          const updatedEvent = get().events.find(e => e.id === eventId);
          if (updatedEvent) {
            syncEventToAPI(updatedEvent).catch(err => {
              console.error('❌ Final sync attempt failed:', err);
            });
          }
        } catch (error) {
          set({ error: 'שגיאה בהסרת האורח מהשולחן', isLoading: false });
        }
      },

      moveGuestToTable: async (eventId: string, guestId: string, newTableId: string, newSeatNumber?: number) => {
        set({ isLoading: true, error: null });
        try {
          set(state => {
            const event = state.events.find(e => e.id === eventId);
            if (!event) {
              set({ isLoading: false });
              return;
            }
            
            // Find current guest to get old tableId
            const currentGuest = event.guests?.find(g => g.id === guestId);
            const oldTableId = currentGuest?.tableId;
            
            // Update guest's tableId
            const updatedGuests = event.guests?.map(guest => 
              guest.id === guestId 
                ? { ...guest, tableId: newTableId, seatNumber: newSeatNumber }
                : guest
            ) || [];
            
            // Update tables: remove guest from old table, add to new table
            const updatedTables = event.tables?.map(table => {
              // Remove guest from old table if it was assigned
              const tableGuestsWithoutGuest = table.guests.filter(id => id !== guestId);
              
              // Add guest to new table if not already there
              if (table.id === newTableId && !tableGuestsWithoutGuest.includes(guestId)) {
                return { ...table, guests: [...tableGuestsWithoutGuest, guestId] };
              }
              
              // Keep old table without the guest
              return { ...table, guests: tableGuestsWithoutGuest };
            }) || [];
            
            const updatedEvent = {
              ...event,
              guests: updatedGuests,
              tables: updatedTables
            };
            
            return {
              events: state.events.map(e => e.id === eventId ? updatedEvent : e),
              currentEvent: state.currentEvent?.id === eventId 
                ? { 
                    ...state.currentEvent, 
                    guests: updatedGuests,
                    tables: updatedTables
                  }
                : state.currentEvent,
              isLoading: false
            };
          });
          
          // CRITICAL: Sync to API immediately for real-time sync between devices
          const updatedEvent = get().events.find(e => e.id === eventId);
          if (updatedEvent) {
            syncEventToAPI(updatedEvent).catch(err => {
              console.error('❌ Final sync attempt failed:', err);
            });
          }
        } catch (error) {
          set({ error: 'שגיאה בהעברת האורח לשולחן', isLoading: false });
        }
      },

      // Admin functions - רק למנהל
      getAllEvents: () => {
        // בדיקה אם המשתמש הוא מנהל
        const userStorage = localStorage.getItem('rsvp-user-storage');
        let isAdmin = false;
        if (userStorage) {
          const parsed = JSON.parse(userStorage);
          isAdmin = parsed.state?.user?.isAdmin || false;
        }

        if (!isAdmin) {
          throw new Error('רק מנהל יכול לראות את כל האירועים');
        }

        // קריאת כל האירועים מ-localStorage
        const stored = localStorage.getItem('rsvp-events-storage');
        if (!stored) {
          return [];
        }

        const parsed = JSON.parse(stored);
        return parsed.state?.events || [];
      },

      getEventsByUserId: (userId: string) => {
        const { getAllEvents } = get();
        const allEvents = getAllEvents();
        return allEvents.filter((event: Event) => event.userId === userId);
      },

      getEventStatsByUserId: (userId: string) => {
        const { getEventsByUserId } = get();
        const userEvents = getEventsByUserId(userId);
        
        const totalEvents = userEvents.length;
        const totalGuests = userEvents.reduce((sum, event) => sum + (event.guests?.length || 0), 0);
        const totalCreditsUsed = userEvents.reduce((sum, event) => sum + (event.creditsUsed || 0), 0);

        return {
          totalEvents,
          totalGuests,
          totalCreditsUsed
        };
      },

    }),
    {
      name: 'rsvp-events-storage',
      partialize: (state) => {
        // CRITICAL: Always save ALL events from localStorage, not just filtered ones
        // Get all events from storage to preserve data for all users
        // Note: manualChanges is NOT saved to localStorage (Map cannot be serialized)
        try {
          const stored = localStorage.getItem('rsvp-events-storage');
          if (stored) {
            const parsed = JSON.parse(stored);
            if (parsed.state?.events && parsed.state.events.length > 0) {
              // Merge: keep all events from storage, update with current state changes
              const allEventsFromStorage = parsed.state.events;
              const currentEventsFromState = state.events || [];
              
              // Create a map of events from state (these might have updates)
              const stateEventsMap = new Map(currentEventsFromState.map((e: Event) => [e.id, e]));
              
              // Merge: use updated events from state, keep others from storage
              const mergedEvents = allEventsFromStorage.map((storedEvent: Event) => {
                const updatedEvent = stateEventsMap.get(storedEvent.id);
                return updatedEvent || storedEvent;
              });
              
              // CRITICAL: Add any new events from state that aren't in storage
              // This ensures newly created events are preserved
              currentEventsFromState.forEach((stateEvent: Event) => {
                if (!allEventsFromStorage.find((e: Event) => e.id === stateEvent.id)) {
                  console.log('💾 Adding new event from state to storage:', stateEvent.id);
                  mergedEvents.push(stateEvent);
                }
              });
              
              console.log('💾 Saving to storage - Total events:', mergedEvents.length);
              console.log('💾 Events from storage:', allEventsFromStorage.length);
              console.log('💾 Events from state:', currentEventsFromState.length);
              console.log('💾 New events added:', currentEventsFromState.filter(e => !allEventsFromStorage.find(se => se.id === e.id)).length);
              
              return {
                events: mergedEvents, // Save ALL events, preserving all users' data
                deletedEvents: state.deletedEvents || parsed.state.deletedEvents || [],
                currentEvent: state.currentEvent || parsed.state.currentEvent || null
              };
            }
          }
          
          // If no storage exists, save current state (for first-time users)
          if (state.events && state.events.length > 0) {
            console.log('💾 No storage found, saving current state events:', state.events.length);
            return {
              events: state.events,
              deletedEvents: state.deletedEvents || [],
              currentEvent: state.currentEvent || null
            };
          }
        } catch (error) {
          console.error('❌ Error in partialize:', error);
        }
        
        // Fallback: if we can't merge, at least save what we have
        return { 
          events: state.events || [],
          deletedEvents: state.deletedEvents || [],
          currentEvent: state.currentEvent || null
        };
      },
      onRehydrateStorage: () => (state) => {
        console.log('🔄 Rehydrating from localStorage...', state);
        if (state) {
          console.log('📋 Restored events:', state.events?.length || 0);
          state.events?.forEach((event: any, index: number) => {
            console.log(`📅 Event ${index + 1}:`, {
              id: event.id,
              coupleName: event.coupleName,
              guestsCount: event.guests?.length || 0,
              campaignsCount: event.campaigns?.length || 0,
              tablesCount: event.tables?.length || 0
            });
          });
        }
      },
    }
  )
);