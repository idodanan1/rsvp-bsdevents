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

// Track if fetchEvents is in progress to prevent duplicate calls
let fetchInProgress = false;
let lastFetchTime = 0;
const FETCH_DEBOUNCE_MS = 1000; // Minimum 1 second between fetches

export const useEventStore = create<EventStore>()(
  persist(
    (set, get) => ({
      events: mockEvents,
      deletedEvents: [], // אירועים שנמחקו
      currentEvent: null,
      isLoading: false,
      error: null,
      manualChanges: new Map<string, number>(), // Track manual changes: "eventId-guestId" -> timestamp

      fetchEvents: async (forceRefresh: boolean = false, silent: boolean = false) => {
        // CRITICAL: Debounce to prevent excessive API calls
        const now = Date.now();
        if (fetchInProgress && !forceRefresh) {
          console.log('⏭️ Skipping fetchEvents - already in progress');
          return;
        }
        
        // If last fetch was very recent and not forced, skip
        if (!forceRefresh && (now - lastFetchTime) < FETCH_DEBOUNCE_MS) {
          console.log(`⏭️ Skipping fetchEvents - debounced (last fetch ${now - lastFetchTime}ms ago)`);
          return;
        }
        
        fetchInProgress = true;
        lastFetchTime = now;
        // CRITICAL: Early return if no user ID to prevent infinite loops
        const userStorage = localStorage.getItem('rsvp-user-storage');
        let userId = '';
        let userEmail = '';
        if (userStorage) {
          try {
            const parsed = JSON.parse(userStorage);
            userId = parsed.state?.user?.id || '';
            userEmail = parsed.state?.user?.email || '';
          } catch (e) {
            console.warn('⚠️ Error parsing user storage:', e);
          }
        }

        // If no userId, don't fetch and don't update state (prevents infinite loops)
        if (!userId) {
          console.log('⏭️ Skipping fetchEvents - no userId (user not logged in)');
          return; // Early return - don't update state
        }

        if (!silent) {
          set({ isLoading: true, error: null });
        }
        try {
          console.log('🔍 Fetching events for user:', { userId, userEmail, forceRefresh });

          // Try to fetch from API first (for syncing between computers)
          const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3002';
          let apiEvents: Event[] = [];
          let apiError = false;

          if (userId) {
            // CRITICAL: Always fetch from API to ensure sync between devices
            // Cache is only used for immediate display, but we always fetch fresh data
            const cacheKey = CACHE_KEYS.EVENTS(userId);
            let useCache = false;
            
            if (!forceRefresh) {
              const cachedEvents = cacheService.get<Event[]>(cacheKey);
              if (cachedEvents && cachedEvents.length > 0) {
                console.log(`💾 Using cached events (${cachedEvents.length} events) for immediate display`);
                // Use cache for immediate display, but still fetch from API in background
                apiEvents = cachedEvents;
                useCache = true;
              }
            }

            // CRITICAL: Always fetch from API to ensure sync between devices
            // Even if we have cache, we need fresh data from API
            if (forceRefresh || !useCache || true) { // Always fetch from API
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
                    // CRITICAL FIX: Sync each event individually to ensure all are saved
                    // This is more reliable than syncing all at once
                    let syncedCount = 0;
                    for (const event of localOnlyEvents) {
                      try {
                        const syncResponse = await fetch(`${BACKEND_URL}/api/events`, {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                      },
                          body: JSON.stringify(event)
                    });
                    if (syncResponse.ok) {
                          syncedCount++;
                          console.log(`✅ Synced event ${event.id} (${event.coupleName}) to API`);
                        } else {
                          const errorText = await syncResponse.text();
                          console.warn(`⚠️ Failed to sync event ${event.id}:`, errorText);
                        }
                      } catch (eventSyncError) {
                        console.warn(`⚠️ Error syncing event ${event.id}:`, eventSyncError);
                      }
                    }
                    console.log(`✅ Synced ${syncedCount}/${localOnlyEvents.length} events to API`);
                    
                      // Re-fetch from API to get all events
                      const reFetchResponse = await fetch(`${BACKEND_URL}/api/events/${userId}`);
                      if (reFetchResponse.ok) {
                        const reFetchData = await reFetchResponse.json();
                        apiEvents = reFetchData.events || [];
                        console.log(`✅ Re-fetched ${apiEvents.length} events from API after sync`);
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
                // CRITICAL: Create new array reference after adding remaining events
                // This ensures React detects changes when events are added
                const allEventsWithRemaining = remainingLocalEvents.length > 0 
                  ? [...allEvents, ...remainingLocalEvents]
                  : allEvents;
                if (remainingLocalEvents.length > 0) {
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
                    // CRITICAL: Create new array reference to force React re-render
                    set({ events: [...localEventsForUser], isLoading: false });
                    return; // Exit early - preserve local events
                  }
                }
                
                // CRITICAL: Before saving, check if we're about to lose any events
                // Compare allEventsWithRemaining with localEvents to ensure we're not losing data
                // BUT: Only preserve events that belong to the current user!
                const eventsToSave = allEventsWithRemaining.length > 0 ? allEventsWithRemaining : localEvents;
                const localEventIds = new Set(localEvents.map(e => e.id));
                const savedEventIds = new Set(eventsToSave.map(e => e.id));
                
                // CRITICAL FIX: Only check for lost events that belong to current user
                // Don't preserve events from other users!
                const lostEvents = localEvents.filter(e => 
                  !savedEventIds.has(e.id) && 
                  (!userId || e.userId === userId || !e.userId || e.userId === 'anonymous')
                );
                
                if (lostEvents.length > 0) {
                  console.warn(`⚠️ CRITICAL: About to lose ${lostEvents.length} events for current user! Preserving them...`);
                  console.warn('⚠️ Lost events:', lostEvents.map(e => ({ id: e.id, userId: e.userId, name: e.coupleName })));
                  // Add lost events back (only if they belong to current user)
                  lostEvents.forEach(lostEvent => {
                    if (!eventsToSave.find(e => e.id === lostEvent.id)) {
                      // CRITICAL: Only preserve if event belongs to current user
                      if (!userId || lostEvent.userId === userId || !lostEvent.userId || lostEvent.userId === 'anonymous') {
                        eventsToSave.push(lostEvent);
                        console.log(`✅ Preserved lost event: ${lostEvent.id} (belongs to current user)`);
                      } else {
                        console.log(`⏭️ Skipping event ${lostEvent.id} - belongs to different user (${lostEvent.userId} vs ${userId})`);
                      }
                    }
                  });
                } else {
                  // Log events that don't belong to current user (for debugging)
                  const otherUserEvents = localEvents.filter(e => 
                    userId && e.userId && e.userId !== userId && e.userId !== 'anonymous' && !savedEventIds.has(e.id)
                  );
                  if (otherUserEvents.length > 0) {
                    console.log(`ℹ️ Found ${otherUserEvents.length} events from other users (not preserving):`, 
                      otherUserEvents.map(e => ({ id: e.id, userId: e.userId, name: e.coupleName })));
                  }
                }
                
                // CRITICAL FIX: Only save events that belong to current user!
                // Don't save events from other users at all!
                // IMPORTANT: Exclude admin events (admin-fixed-id) for regular users
                const eventsToSaveFiltered = userId 
                  ? eventsToSave.filter((e: Event) => {
                      // If event belongs to admin, exclude it for regular users
                      if (e.userId === 'admin-fixed-id' && userId !== 'admin-fixed-id') {
                        return false;
                      }
                      // Keep events that belong to current user or have no userId/anonymous
                      return e.userId === userId || !e.userId || e.userId === 'anonymous';
                    })
                  : eventsToSave;
                
                // Save ONLY current user's events to localStorage
                localStorage.setItem('rsvp-events-storage', JSON.stringify({
                  state: {
                    events: eventsToSaveFiltered, // ONLY current user's events
                    deletedEvents: data.deletedEvents || [],
                    currentEvent: null
                  }
                }));
                
                console.log('💾 Saved events to localStorage:', eventsToSaveFiltered.length, 'events (current user only)');
                
                // Use API events as primary source (they're synced)
                // CRITICAL: If allEvents is empty but localEvents exist, use localEvents
                // CRITICAL: Always create new array reference to ensure React detects changes
                const finalEvents = allEventsWithRemaining.length > 0 ? [...allEventsWithRemaining] : [...localEvents];
                const filteredEvents = userId ? finalEvents.filter((e: Event) => e.userId === userId) : finalEvents;
                
                // CRITICAL: If filteredEvents is empty but we have local events, preserve them
                if (filteredEvents.length === 0 && localEvents.length > 0) {
                  console.warn('⚠️ Filtered events is empty but local events exist - preserving local events');
                  console.log('🔍 Debug info:', {
                    userId: userId,
                    localEventsCount: localEvents.length,
                    localEventUserIds: localEvents.map(e => ({ id: e.id, userId: e.userId, name: e.coupleName })),
                    finalEventsCount: finalEvents.length,
                    finalEventUserIds: finalEvents.map(e => ({ id: e.id, userId: e.userId, name: e.coupleName }))
                  });
                  
                  // CRITICAL FIX: If events don't have matching userId, update them to current userId
                  // This handles the case where events were created before userId was properly set
                  // IMPORTANT: Only update events with missing or anonymous userId, NOT events from other users
                  // IMPORTANT: Exclude admin events for regular users
                  const eventsToShow = localEvents
                    .filter((e: Event) => {
                      // Exclude admin events for regular users
                      if (e.userId === 'admin-fixed-id' && userId !== 'admin-fixed-id') {
                        return false;
                      }
                      return true;
                    })
                    .map((e: Event) => {
                      // CRITICAL: Only update events with missing or anonymous userId
                      // Do NOT reassign events that belong to other users (have a valid userId that's not current user)
                      if ((!e.userId || e.userId === 'anonymous') && userId) {
                        console.log(`🔄 Updating event ${e.id} userId from "${e.userId || 'missing'}" to "${userId}" (was anonymous/missing)`);
                        return { ...e, userId: userId };
                      }
                      return e;
                    });
                  
                  const localEventsForUser = eventsToShow.filter((e: Event) => {
                    // Exclude admin events for regular users
                    if (e.userId === 'admin-fixed-id' && userId !== 'admin-fixed-id') {
                      return false;
                    }
                    return !userId || e.userId === userId;
                  });
                  
                  if (localEventsForUser.length > 0) {
                    console.log(`🛡️ Preserving ${localEventsForUser.length} local events (filtered was empty)`);
                    
                    // CRITICAL: Update events in localStorage with correct userId
                    const updatedLocalEvents = localEvents.map((e: Event) => {
                      if (!e.userId || e.userId === 'anonymous' || (userId && e.userId !== userId)) {
                        return { ...e, userId: userId || e.userId };
                      }
                      return e;
                    });
                    
                    localStorage.setItem('rsvp-events-storage', JSON.stringify({
                      state: {
                        events: updatedLocalEvents,
                        deletedEvents: data.deletedEvents || [],
                        currentEvent: null
                      }
                    }));
                    
                    // CRITICAL: Create new array reference to force React re-render
                    set({ events: [...localEventsForUser], isLoading: false });
                    return; // Exit early - preserve local events
                  } else {
                    console.error('❌ CRITICAL: No events match userId even after update!', {
                      userId,
                      events: localEvents.map(e => ({ id: e.id, userId: e.userId, name: e.coupleName }))
                    });
                  }
                }
                
                // CRITICAL: Create new array reference to force React re-render
                // This ensures the table updates when events are synced from API (other devices)
                console.log('🔄 Creating new events array reference from API sync to force React re-render');
                console.log('📊 Setting events:', filteredEvents.length, 'events with', filteredEvents.reduce((sum, e) => sum + (e.guests?.length || 0), 0), 'total guests');
                
                // CRITICAL: Create deep copy of events with new references for all nested objects
                // This ensures React detects ALL changes, including nested guest changes
                const eventsWithNewReferences = filteredEvents.map(event => ({
                  ...event,
                  guests: event.guests ? event.guests.map(guest => ({ ...guest })) : [],
                  campaigns: event.campaigns ? event.campaigns.map(campaign => ({ ...campaign })) : [],
                  tables: event.tables ? event.tables.map(table => ({ ...table })) : []
                }));
                
                // Only update state if data actually changed (for silent updates)
                if (silent) {
                  const currentEvents = get().events;
                  const currentEventsJson = JSON.stringify(currentEvents.map(e => ({ id: e.id, updatedAt: e.updatedAt, guestsCount: e.guests?.length || 0 })));
                  const newEventsJson = JSON.stringify(eventsWithNewReferences.map(e => ({ id: e.id, updatedAt: e.updatedAt, guestsCount: e.guests?.length || 0 })));
                  
                  if (currentEventsJson === newEventsJson && currentEvents.length === eventsWithNewReferences.length) {
                    // Data hasn't changed, skip update to prevent unnecessary re-renders
                    return;
                  }
                }
                
                // CRITICAL: Update currentEvent if it exists and matches one of the updated events
                // This ensures the table updates immediately when guest status changes via link
                const storeState = get();
                let updatedCurrentEvent = storeState.currentEvent;
                
                if (storeState.currentEvent) {
                  const updatedEvent = eventsWithNewReferences.find(e => e.id === storeState.currentEvent.id);
                  if (updatedEvent) {
                    // Create new object reference to force React re-render
                    updatedCurrentEvent = {
                      ...updatedEvent,
                      guests: updatedEvent.guests ? updatedEvent.guests.map(g => ({ ...g })) : []
                    };
                    console.log('🔄 Updated currentEvent from API fetch:', updatedCurrentEvent.id, 'guests:', updatedCurrentEvent.guests?.length);
                  }
                }
                
                set({ events: eventsWithNewReferences, currentEvent: updatedCurrentEvent, isLoading: false });
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
              
              // CRITICAL FIX: Update events to match current userId
              // This ensures that events created before login or with wrong userId are fixed
              if (userId) {
                let eventsUpdated = false;
                const updatedEvents = allEvents.map((event: Event) => {
                  // If event has userEmail matching current user, update userId
                  if (event.userEmail && userEmail && event.userEmail.toLowerCase().trim() === userEmail.toLowerCase().trim() && event.userId !== userId) {
                    console.log(`🔄 Updating event ${event.id} userId from "${event.userId}" to "${userId}" (email match)`);
                    eventsUpdated = true;
                    return { ...event, userId };
                  }
                  // CRITICAL: If event has no userId or anonymous userId, and we have current userId, update it
                  if ((!event.userId || event.userId === 'anonymous') && userId) {
                    console.log(`🔄 Updating event ${event.id} userId from "${event.userId || 'missing'}" to "${userId}" (was anonymous/missing)`);
                    eventsUpdated = true;
                    return { ...event, userId, userEmail: userEmail || event.userEmail };
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
                        if (oldUser && oldUser.email && userEmail && oldUser.email.toLowerCase().trim() === userEmail.toLowerCase().trim()) {
                          console.log(`🔄 Updating event ${event.id} userId from "${event.userId}" to "${userId}" (found matching email in old users)`);
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
                  console.log('✅ Updated events with correct userId');
                  // Save updated events
                  localStorage.setItem('rsvp-events-storage', JSON.stringify({
                    state: {
                      events: updatedEvents,
                      deletedEvents: parsed.state.deletedEvents || [],
                      currentEvent: parsed.state.currentEvent || null
                    }
                  }));
                  allEvents = updatedEvents;
                } else {
                  // Log if events don't match userId
                  const mismatchedEvents = allEvents.filter(e => e.userId && e.userId !== userId && e.userId !== 'anonymous');
                  if (mismatchedEvents.length > 0) {
                    console.warn('⚠️ Found events with different userId:', mismatchedEvents.map(e => ({ id: e.id, userId: e.userId, name: e.coupleName })));
                  }
                }
              }
              
              // CRITICAL FIX: Update events that don't have matching userId BEFORE filtering
              // This handles the case where events were created before userId was properly set
              if (userId) {
                let eventsUpdated = false;
                const updatedEvents = allEvents.map((event: Event) => {
                  if (!event.userId || event.userId === 'anonymous' || event.userId !== userId) {
                    // Check if event belongs to current user by email
                    if (event.userEmail && userEmail && event.userEmail.toLowerCase().trim() === userEmail.toLowerCase().trim()) {
                      console.log(`🔄 Updating event ${event.id} userId from "${event.userId}" to "${userId}" (email match)`);
                      eventsUpdated = true;
                      return { ...event, userId };
                    }
                    // If no userId or anonymous, and we have current userId, update it
                    if ((!event.userId || event.userId === 'anonymous') && userId) {
                      console.log(`🔄 Updating event ${event.id} userId from "${event.userId}" to "${userId}" (was anonymous/missing)`);
                      eventsUpdated = true;
                      return { ...event, userId, userEmail: userEmail || event.userEmail };
                    }
                  }
                  return event;
                });
                
                if (eventsUpdated) {
                  allEvents = updatedEvents;
                  // Save updated events
                  localStorage.setItem('rsvp-events-storage', JSON.stringify({
                    state: {
                      events: allEvents,
                      deletedEvents: parsed.state.deletedEvents || [],
                      currentEvent: parsed.state.currentEvent || null
                    }
                  }));
                  console.log('✅ Updated events with correct userId');
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
                  // Regular user sees only their events (exclude admin events)
                  filteredEvents = allEvents.filter((event: Event) => {
                    // CRITICAL: Exclude admin events for regular users
                    if (event.userId === 'admin-fixed-id') {
                      return false;
                    }
                    return event.userId === userId;
                  });
                  console.log('🔍 Filtering events by userId:', {
                    userId,
                    totalEvents: allEvents.length,
                    filteredCount: filteredEvents.length,
                    eventUserIds: allEvents.map(e => ({ id: e.id, userId: e.userId, name: e.coupleName })),
                    adminEventsExcluded: allEvents.filter(e => e.userId === 'admin-fixed-id').length
                  });
                }
              }
              
              console.log('📋 Total events in storage:', allEvents.length);
              console.log('📋 Filtered events for user:', filteredEvents.length, 'userId:', userId);
              
              // IMPORTANT: Set only filtered events in state for display
              // The persist middleware will handle saving correctly (only current user's events)
              // CRITICAL: Create new array reference to force React re-render
              console.log('🔄 Creating new events array reference from localStorage to force React re-render');
              
              // CRITICAL: Update currentEvent if it exists and matches one of the filtered events
              // This ensures the table updates immediately when guest status changes via link
              const storeStateForLocalStorage = get();
              let updatedCurrentEvent = storeStateForLocalStorage.currentEvent;
              
              if (storeStateForLocalStorage.currentEvent) {
                const updatedEvent = filteredEvents.find(e => e.id === storeStateForLocalStorage.currentEvent.id);
                if (updatedEvent) {
                  // Create new object reference to force React re-render
                  updatedCurrentEvent = {
                    ...updatedEvent,
                    guests: updatedEvent.guests ? updatedEvent.guests.map(g => ({ ...g })) : []
                  };
                  console.log('🔄 Updated currentEvent from localStorage fetch:', updatedCurrentEvent.id, 'guests:', updatedCurrentEvent.guests?.length);
                }
              }
              
              set({ events: [...filteredEvents], currentEvent: updatedCurrentEvent, isLoading: false });
              
              return;
            }
          }
          
          // If no events found, don't create sample events
          console.log('📝 No events found in localStorage');
          // CRITICAL: Create new array reference (even if empty) to force React re-render
          set({ events: [], isLoading: false });
        } catch (error) {
          console.error('❌ Error fetching events:', error);
          set({ error: 'שגיאה בטעינת האירועים', isLoading: false });
        } finally {
          // CRITICAL: Always reset fetchInProgress flag, even on error
          fetchInProgress = false;
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
              // Use WhatsApp template 'today' for this campaign
              templateName: 'today', // Template name in Meta is "today"
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
            try {
            const parsed = JSON.parse(userStorage);
            userId = parsed.state?.user?.id || '';
            userEmail = parsed.state?.user?.email || '';
              console.log('👤 Current user info:', { userId, userEmail });
            } catch (e) {
              console.error('❌ Error parsing user storage:', e);
            }
          }
          
          // CRITICAL: If no userId found, log warning
          if (!userId) {
            console.warn('⚠️ WARNING: No userId found! Event will be created with "anonymous" userId');
            console.warn('⚠️ This may cause events to disappear after refresh. Please ensure user is logged in.');
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
          
          console.log('📝 New event created with userId:', newEvent.userId, 'userEmail:', newEvent.userEmail);
          
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
          
          // CRITICAL: Check if event exists in store BEFORE calling set()
          const existingEvent = currentState.events.find(e => e.id === eventId);
          
          // If event not found in store, load it from API, update guest, and send to backend
          // The backend is the source of truth - all updates must go through it
          if (!existingEvent) {
            console.warn(`⚠️ Event ${eventId} not found in store - loading from API and updating via backend`);
            
            const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3002';
            
            // Load full event from API
            const eventResponse = await fetch(`${BACKEND_URL}/api/events/all`);
            if (!eventResponse.ok) {
              throw new Error(`Failed to load event: ${eventResponse.status}`);
            }
            
            const eventData = await eventResponse.json();
            const fullEvent = eventData.events?.find((e: any) => e.id === eventId);
            
            if (!fullEvent) {
              console.error(`❌ Event ${eventId} not found in API`);
              set({ isLoading: false, error: 'אירוע לא נמצא' });
              return;
            }
            
            // Update the guest in the full event
            const updatedFullEvent = {
              ...fullEvent,
              guests: fullEvent.guests.map((g: any) => 
                g.id === guestId ? {
                  ...g,
                  ...updatedGuest,
                  // Ensure all fields are updated
                  rsvpStatus: updatedGuest.rsvpStatus !== undefined ? updatedGuest.rsvpStatus : g.rsvpStatus,
                  guestCount: updatedGuest.guestCount !== undefined ? updatedGuest.guestCount : g.guestCount,
                  notes: updatedGuest.notes !== undefined ? updatedGuest.notes : g.notes,
                  responseDate: updatedGuest.responseDate || g.responseDate || new Date(),
                  actualAttendance: updatedGuest.actualAttendance !== undefined ? updatedGuest.actualAttendance : g.actualAttendance
                } : g
              ),
              updatedAt: new Date().toISOString()
            };
            
            console.log(`📤 Sending full updated event to backend:`, {
              eventId: updatedFullEvent.id,
              guestId: guestId,
              updatedGuest: updatedFullEvent.guests.find((g: any) => g.id === guestId)
            });
            
            // Send full updated event to backend (backend is source of truth)
            const updateResponse = await fetch(`${BACKEND_URL}/api/events`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(updatedFullEvent)
            });
            
            if (!updateResponse.ok) {
              const errorText = await updateResponse.text();
              throw new Error(`Failed to update event: ${updateResponse.status} - ${errorText}`);
            }
            
            const result = await updateResponse.json();
            console.log(`✅ Event updated successfully via backend:`, result);
            
            // Update state with the updated event (even though user is not logged in, we can cache it)
            set(state => ({
              ...state,
              events: [...state.events, updatedFullEvent],
              isLoading: false
            }));
            
            return; // Exit early - update is complete
          }
          
          // Event exists in store - proceed with normal update flow
          let updatedEvent: Event | null = null;
          
          set(state => {
            const event = state.events.find(e => e.id === eventId);
            const guest = event?.guests?.find(g => g.id === guestId);
            
            console.log(`📋 Before update - Event found: ${!!event}, Guest found: ${!!guest}`);
            console.log(`📋 Events in store: ${state.events.length}`);
            console.log(`📋 Guest status:`, guest?.rsvpStatus);
            
            // CRITICAL: Create new array reference to force React re-render
            // Always create a completely new events array to ensure React detects the change
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
                      
                      // CRITICAL: If this is a newer update, completely replace old values with new ones
                      // This ensures old updates don't persist in the table
                      if (isNewerUpdate) {
                        // Completely replace with new update - don't merge old values
                        const mergedGuest = { 
                          ...guest, // Keep base guest properties (id, firstName, lastName, etc.)
                          ...updatedGuest, // Override with ALL new values from updatedGuest
                          // Always use new values if provided (latest update completely replaces old one)
                          rsvpStatus: updatedGuest.rsvpStatus !== undefined ? updatedGuest.rsvpStatus : guest.rsvpStatus,
                          guestCount: updatedGuest.guestCount !== undefined ? updatedGuest.guestCount : (guest.guestCount || 1),
                          notes: updatedGuest.notes !== undefined ? updatedGuest.notes : (guest.notes || ''),
                          actualAttendance: updatedGuest.actualAttendance !== undefined ? updatedGuest.actualAttendance : guest.actualAttendance,
                          // Use the newer responseDate
                          responseDate: newResponseDate
                        };
                      
                        console.log(`🔧 Merging guest (latest update wins - COMPLETELY REPLACING old values):`, {
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
                        
                        // CRITICAL: Always return a new object reference for the guest
                        return { ...mergedGuest };
                      } else {
                        // Old update is newer - keep old values
                        console.log(`⏭️ Keeping old guest values (old update is newer):`, {
                          old: { 
                            rsvpStatus: guest.rsvpStatus, 
                            guestCount: guest.guestCount,
                            responseDate: oldResponseDate.toISOString()
                          },
                          new: { 
                            rsvpStatus: updatedGuest.rsvpStatus, 
                            guestCount: updatedGuest.guestCount,
                            responseDate: newResponseDate.toISOString()
                          }
                        });
                        
                        // Keep old guest values
                        const mergedGuest = { 
                          ...guest,
                          ...updatedGuest,
                          // Keep old values since they're newer
                          rsvpStatus: guest.rsvpStatus,
                          guestCount: guest.guestCount,
                          notes: guest.notes,
                          actualAttendance: guest.actualAttendance,
                          responseDate: oldResponseDate
                        };
                      
                        // Remove manual change protection if this update is newer
                        const manualChangeKey = `${eventId}-${guestId}`;
                        state.manualChanges.delete(manualChangeKey);
                        console.log(`🔄 Removed manual change protection for ${manualChangeKey} - new update is newer`);
                        
                        // CRITICAL: Always return a new object reference for the guest
                        return { ...mergedGuest };
                      }
                      
                      // Old update is newer - return old guest values
                      return { ...guest };
                    }
                    // CRITICAL: ALWAYS return new object reference for ALL guests to force React re-render
                    // This ensures React detects changes even if guest data appears unchanged
                    return { 
                      ...guest,
                      // Force new object reference by adding a timestamp property that's always new
                      _updateTimestamp: Date.now()
                    };
                  }),
                  updatedAt: new Date()
                };
                // CRITICAL: Create new object reference with new guests array to force React re-render
                return {
                  ...updatedEvent,
                  guests: updatedEvent.guests.map(g => ({ ...g })), // New array AND new object references for ALL guests
                  _updateTimestamp: Date.now() // Force new event reference
                };
              }
              // CRITICAL: Return new object reference even for unchanged events
              // This ensures React detects changes when ANY event is updated
              return { 
                ...event,
                guests: event.guests ? event.guests.map(g => ({ ...g })) : [], // New array and object references
                _updateTimestamp: Date.now() // Force new reference
              };
            });
            
            // CRITICAL: Update currentEvent ONLY if it matches eventId
            // This ensures that updates from guest response links are reflected only for the event being viewed
            // If the user is viewing a different event, we don't update currentEvent (EventManagement useEffect will handle it)
            let updatedCurrentEvent = state.currentEvent;
            
            if (state.currentEvent?.id === eventId) {
              // Update existing currentEvent - user is viewing this event, so update it
              updatedCurrentEvent = {
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
              };
              // CRITICAL: Always create a new object reference with new guests array to force React re-render
              updatedCurrentEvent = {
                ...updatedCurrentEvent,
                guests: updatedCurrentEvent.guests.map(g => ({ ...g })), // New array AND new object references
                updatedAt: new Date() // Force timestamp update
              };
              console.log('🔄 Updated existing currentEvent for event:', eventId, 'guests:', updatedCurrentEvent.guests.length);
            } else {
              // User is viewing a different event - don't update currentEvent
              // EventManagement useEffect will update currentEvent when events array changes
              console.log('ℹ️ Update for event', eventId, 'but user is viewing event', state.currentEvent?.id || 'none', '- EventManagement will handle update');
            }
            
            // Verify the update
            const verifyEvent = updatedEvents.find(e => e.id === eventId);
            const verifyGuest = verifyEvent?.guests?.find(g => g.id === guestId);
            console.log(`✅ STORE: After updateGuestResponse - Guest status:`, verifyGuest?.rsvpStatus);
            console.log(`✅ STORE: Updated currentEvent:`, updatedCurrentEvent?.id, 'guests:', updatedCurrentEvent?.guests?.length);
            console.log(`✅ STORE: Event updatedAt:`, updatedEvent?.updatedAt);
            console.log(`✅ STORE: CurrentEvent updatedAt:`, updatedCurrentEvent?.updatedAt);
            
            // CRITICAL: Always create new array reference for events to force React re-render
            // This ensures React detects changes even if array contents are similar
            console.log(`🔄 Creating new events array reference to force React re-render`);
            return {
              events: [...updatedEvents], // New array reference - CRITICAL for React re-render
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
          // CRITICAL: Always sync to backend to ensure updates are available for webhook service
          // This ensures updates from phone are synced to all devices via pendingUpdates
          if (updatedEvent) {
            const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3002';
            try {
              console.log('🌐 Syncing guest response update to API...');
              console.log('📤 Sending updated event:', {
                eventId: updatedEvent.id,
                guestId: guestId,
                updatedGuest: updatedEvent.guests.find(g => g.id === guestId)
              });
              
              // CRITICAL: Use await to ensure the update is sent before continuing
              // This ensures the backend receives the update and adds it to pendingUpdates
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
                console.log('✅ Update should now be in pendingUpdates for webhook service to process');
                
                // CRITICAL: Don't force refresh immediately - let webhook service handle it
                // This prevents race conditions and ensures consistent updates across devices
                // The webhook service will poll and process the update from pendingUpdates
              } else {
                const errorText = await response.text();
                console.warn('⚠️ API sync failed:', response.status, errorText);
                // Retry once after a short delay
                setTimeout(async () => {
                  try {
                    const retryResponse = await fetch(`${BACKEND_URL}/api/events`, {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                      },
                      body: JSON.stringify(updatedEvent)
                    });
                    if (retryResponse.ok) {
                      console.log('✅ Guest response update synced to API (retry successful)');
                    } else {
                      console.warn('⚠️ API sync retry failed:', retryResponse.status);
                    }
                  } catch (retryError) {
                    console.warn('⚠️ API sync retry error:', retryError);
                  }
                }, 1000);
              }
            } catch (error) {
              console.warn('⚠️ Failed to sync guest response update to API (will use localStorage):', error);
              // Retry once after a short delay
              setTimeout(async () => {
                try {
                  const retryResponse = await fetch(`${BACKEND_URL}/api/events`, {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(updatedEvent)
                  });
                  if (retryResponse.ok) {
                    console.log('✅ Guest response update synced to API (retry successful)');
                  }
                } catch (retryError) {
                  console.warn('⚠️ API sync retry error:', retryError);
                }
              }, 1000);
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
          
          // CRITICAL: Filter guests based on campaign type
          // - "הזמנה ראשונית", "תזכורת שנייה", "תזכורת שבועית" - send to guests who haven't confirmed or declined yet (including "maybe" status)
          // - "תזכורת אחרונה", "תזכורת יום האירוע", "הודעת תודה למגיעים" - only send to guests who confirmed (confirmed)
          // - Other campaigns - send to all guests
          const isInitialInvitationOrReminder = campaign.name === 'הזמנה ראשונית' || 
                                               campaign.name === 'תזכורת שנייה' || 
                                               campaign.name === 'תזכורת שבועית';
          const isReminderCampaign = campaign.name === 'תזכורת אחרונה' || 
                                     campaign.name === 'תזכורת יום האירוע' || 
                                     campaign.name === 'הודעת תודה למגיעים';
          
          let filteredGuests: typeof guests;
          if (isInitialInvitationOrReminder) {
            // Send to guests who haven't confirmed or declined yet (including "maybe" status)
            // This includes: pending, maybe, not_responded, or any status that is not "confirmed" or "declined"
            filteredGuests = guests.filter(guest => {
              const shouldSend = guest.rsvpStatus !== 'confirmed' && guest.rsvpStatus !== 'declined';
              if (!shouldSend) {
                console.log(`⏭️ Skipping guest ${guest.firstName} ${guest.lastName} - already confirmed or declined (status: ${guest.rsvpStatus})`);
              } else {
                console.log(`✅ Including guest ${guest.firstName} ${guest.lastName} - status: ${guest.rsvpStatus || 'not_responded'}`);
              }
              return shouldSend;
            });
          } else if (isReminderCampaign) {
            // Only send to guests who confirmed attendance
            filteredGuests = guests.filter(guest => {
              const shouldSend = guest.rsvpStatus === 'confirmed';
              if (!shouldSend) {
                console.log(`⏭️ Skipping guest ${guest.firstName} ${guest.lastName} - not confirmed (status: ${guest.rsvpStatus})`);
              }
              return shouldSend;
            });
          } else {
            // For other campaigns, send to all guests
            filteredGuests = guests;
          }
          
          console.log(`📊 Campaign "${campaign.name}": ${filteredGuests.length} of ${guests.length} guests will receive the message`);
          if (isInitialInvitationOrReminder && filteredGuests.length < guests.length) {
            const skippedCount = guests.length - filteredGuests.length;
            console.log(`⏭️ Skipped ${skippedCount} guest(s) who already confirmed or declined`);
          } else if (isReminderCampaign && filteredGuests.length < guests.length) {
            const skippedCount = guests.length - filteredGuests.length;
            console.log(`⏭️ Skipped ${skippedCount} guest(s) who didn't confirm attendance`);
          }
          
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
              // Use template 'today' for "תזכורת אחרונה" campaign
              templateNameForCampaign = 'today';
            }
          }
          
          // Import helper function once before map
          const { generateGuestResponseLink } = await import('../utils/helpers');
          
          // Create personalized messages for each guest (using filtered guests)
          const personalizedMessages = await Promise.all(filteredGuests.map(async (guest) => {
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
            } else if (templateNameForCampaign === 'today' || templateNameForCampaign === 'reminer' || templateNameForCampaign === 'reminder') {
              // Template "today" requires these 7 parameters in order:
              // 1. first_name (not guest_name!)
              // 2. event_type
              // 3. couple_name
              // 4. event_date
              // 5. event_time
              // 6. venue
              // 7. table_number
              // NOTE: guest_response_link is NOT included in this template
              // (Supporting both 'today' and 'reminer' for backward compatibility)
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
            console.log('🔘 DEBUG: ========== CREATING BUTTONS ==========');
            console.log('🔘 DEBUG: Campaign ID:', campaign.id);
            console.log('🔘 DEBUG: Campaign name:', campaign.name);
            console.log('🔘 DEBUG: Campaign whatsappButtons:', campaign.whatsappButtons);
            console.log('🔘 DEBUG: Campaign whatsappButtons length:', campaign.whatsappButtons?.length || 0);
            console.log('🔘 DEBUG: Guest link:', guestLink);
            console.log('🔘 DEBUG: Guest channel:', guest.channel);
            
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
            
            console.log('🔘 DEBUG: Personalized buttons created:', personalizedButtons);
            console.log('🔘 DEBUG: Personalized buttons length:', personalizedButtons.length);
            
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
            
            console.log('🔘 DEBUG: Recipient created with buttons:', guest.channel === 'whatsapp' ? personalizedButtons : undefined);
            console.log('🔘 DEBUG: Recipient channel:', guest.channel);
            console.log('🔘 DEBUG: Recipient buttons length:', guest.channel === 'whatsapp' ? personalizedButtons.length : 0);
          });
          
          console.log('🔘 DEBUG: Total recipients created:', recipients.length);
          console.log('🔘 DEBUG: Recipients with buttons:', recipients.filter(r => r.buttons && r.buttons.length > 0).length);
          console.log('🔘 DEBUG: Sample recipient buttons:', recipients.find(r => r.buttons && r.buttons.length > 0)?.buttons);

          // CRITICAL FIX: Use event invitation image if available, otherwise use campaign image
          // Priority: event.invitationImageUrl > campaign.imageUrl
          // For event day reminder, use QR code image (already set in recipients), otherwise use event image
          const imageUrlForCampaign = isEventDayReminder 
            ? undefined // QR codes will be in individual recipients
            : (event.invitationImageUrl || campaign.imageUrl || undefined);
          
          console.log('🖼️ Image URL priority check:', {
            eventInvitationImageUrl: event.invitationImageUrl,
            campaignImageUrl: campaign.imageUrl,
            finalImageUrl: imageUrlForCampaign,
            isEventDayReminder
          });
          
          console.log('🔘 DEBUG: ========== BEFORE SEND BULK MESSAGES ==========');
          console.log('🔘 DEBUG: Recipients count:', recipients.length);
          console.log('🔘 DEBUG: Recipients with buttons:', recipients.filter(r => r.buttons && r.buttons.length > 0).length);
          recipients.forEach((r, idx) => {
            console.log(`🔘 DEBUG: Recipient ${idx}:`, {
              name: `${r.firstName} ${r.lastName}`,
              channel: r.channel,
              buttons: r.buttons,
              buttonsLength: r.buttons?.length || 0
            });
          });
          
          const messageData: MessageData = {
            message: '', // Will be overridden by individual messages
            imageUrl: imageUrlForCampaign,
            recipients,
            // Use template if campaign specifies one (for first message campaigns)
            templateName: templateNameForCampaign
          };

          const result = await messageService.sendBulkMessages(messageData);
          
          // CRITICAL: Update messageStatus for each guest based on send results
          // Update guests with "sent" status if message was sent successfully
          const updatedEvents = get().events.map(event => {
            if (event.id !== eventId) return event;
            
            const updatedGuests = event.guests?.map(guest => {
              const messageResult = result.results.find(r => r.recipientId === guest.id);
              if (messageResult && messageResult.success) {
                // Update messageStatus based on channel
                let messageStatus: 'sent' | 'delivered' | 'failed' | 'sms_sent' = 'sent';
                if (messageResult.channel === 'sms') {
                  messageStatus = 'sms_sent';
                } else if (messageResult.fallbackUsed) {
                  messageStatus = 'sms_sent'; // WhatsApp failed, SMS was sent
                }
                
                return {
                  ...guest,
                  messageStatus,
                  messageSentDate: new Date(),
                  channel: messageResult.channel || guest.channel
                };
              } else if (messageResult && !messageResult.success) {
                // Mark as failed if send failed
                return {
                  ...guest,
                  messageStatus: 'failed' as const,
                  messageFailedDate: new Date()
                };
              }
              return guest;
            });
            
            return {
              ...event,
              guests: updatedGuests,
              campaigns: event.campaigns?.map(c =>
                c.id === campaignId
                  ? { ...c, status: 'sent', sentCount: result.successful, updatedAt: new Date() }
                  : c
              ),
              updatedAt: new Date()
            };
          });
          
          // After sending campaign, ensure webhookService is actively listening
          console.log(`📤 Campaign sent successfully! ${result.successful} messages sent, ${result.failed} failed`);
          console.log(`👂 System is now actively waiting for guest responses...`);
          console.log(`📡 Webhook polling is ${webhookService.pollingActive ? 'ACTIVE' : 'INACTIVE'} - checking every 3 seconds for updates`);
          console.log(`✅ Updated messageStatus for ${result.successful} guests to "sent"`);

          set({
            events: updatedEvents,
            isLoading: false
          });
          
          // Sync updated events to backend
          const updatedEvent = updatedEvents.find(e => e.id === eventId);
          if (updatedEvent) {
            syncEventToAPI(updatedEvent).catch(err => {
              console.warn('⚠️ Failed to sync updated event to API:', err);
            });
          }

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
                // "תזכורת אחרונה" campaign uses template "today"
                updatedTemplateName = 'today';
                console.log(`   📋 Set templateName to 'today' for campaign "${campaign.name}"`);
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
        let event = get().events.find(e => e.id === eventId);
        
        // If event not found in store, try to fetch from API
        if (!event) {
          console.log('⚠️ Event not found in store, fetching from API...');
          try {
            const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3002';
            const response = await fetch(`${BACKEND_URL}/api/events/all`);
            if (response.ok) {
              const data = await response.json();
              if (data.success && data.events) {
                event = data.events.find((e: Event) => e.id === eventId);
                if (event) {
                  console.log('✅ Found event in API, adding to store...');
                  // Add event to store temporarily for campaign recreation
                  set(state => ({
                    events: [...state.events, event as Event]
                  }));
                }
              }
            }
          } catch (apiError) {
            console.error('❌ Error fetching event from API:', apiError);
          }
        }
        
        if (!event) {
          console.log('❌ Event not found for campaign recreation');
          throw new Error('האירוע לא נמצא. אנא רענן את הדף ונסה שוב.');
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
            // Use WhatsApp template 'today' for this campaign
            templateName: 'today', // Template name in Meta is "today"
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
        // CRITICAL: Only update campaigns, preserve all other event data
        let updatedEvent: Event | undefined;
        set(state => {
          const eventIndex = state.events.findIndex(e => e.id === eventId);
          if (eventIndex < 0) {
            console.error('❌ CRITICAL: Event not found in store after adding!');
            throw new Error('האירוע לא נמצא במאגר הנתונים');
          }
          
          const existingEvent = state.events[eventIndex];
          console.log('📊 Event before update:', {
            id: existingEvent.id,
            name: existingEvent.coupleName,
            guestsCount: existingEvent.guests?.length || 0,
            campaignsCount: existingEvent.campaigns?.length || 0
          });
          
          // CRITICAL: Preserve ALL event data, only update campaigns
          const updatedEvents = state.events.map(e => 
            e.id === eventId 
              ? { 
                  ...e, // Preserve all existing fields
                  campaigns: newCampaigns, // Only update campaigns
                  updatedAt: new Date() // Update timestamp
                }
              : e
          );
          
          updatedEvent = updatedEvents.find(e => e.id === eventId);
          
          // CRITICAL: Verify event still exists after update
          if (!updatedEvent) {
            console.error('❌ CRITICAL: Event disappeared after update!');
            throw new Error('האירוע נעלם לאחר העדכון - זה לא אמור לקרות!');
          }
          
          console.log('🔄 Updated events in state');
          console.log('📊 Event after update:', {
            id: updatedEvent.id,
            name: updatedEvent.coupleName,
            guestsCount: updatedEvent.guests?.length || 0,
            campaignsCount: updatedEvent.campaigns?.length || 0
          });
          
          // CRITICAL: Verify we didn't lose any data
          if (updatedEvent.guests?.length !== existingEvent.guests?.length) {
            console.error('❌ CRITICAL: Guest count changed during campaign update!', {
              before: existingEvent.guests?.length || 0,
              after: updatedEvent.guests?.length || 0
            });
            throw new Error('אובדן נתוני אורחים במהלך עדכון קמפיינים!');
          }
          
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

      // CRITICAL: Clean up events that don't belong to current user
      cleanupOtherUsersEvents: () => {
        try {
          // Get current user ID
          const userStorage = localStorage.getItem('rsvp-user-storage');
          let userId = '';
          if (userStorage) {
            const parsed = JSON.parse(userStorage);
            userId = parsed.state?.user?.id || '';
          }

          if (!userId) {
            console.warn('⚠️ No userId found - cannot clean up events');
            return;
          }

          console.log(`🧹 Starting cleanup for user ${userId}...`);

          // Get all events from localStorage
          const stored = localStorage.getItem('rsvp-events-storage');
          if (!stored) {
            console.log('ℹ️ No events in storage to clean up');
            return;
          }

          const parsed = JSON.parse(stored);
          const allEvents = parsed.state?.events || [];
          
          console.log(`📋 Found ${allEvents.length} total events in storage`);
          console.log('📋 Events details:', allEvents.map((e: Event) => ({ 
            id: e.id, 
            userId: e.userId, 
            name: e.coupleName,
            belongsToCurrentUser: e.userId === userId || !e.userId || e.userId === 'anonymous'
          })));
          
          // Filter: keep only events that belong to current user
          // CRITICAL: Exclude admin events (admin-fixed-id) for regular users
          // CRITICAL: Also update events with missing/anonymous userId to current userId before filtering
          const userEvents = allEvents
            .map((e: Event) => {
              // Update events with missing or anonymous userId to current userId
              if ((!e.userId || e.userId === 'anonymous') && userId) {
                console.log(`🔄 Updating event ${e.id} userId from "${e.userId || 'missing'}" to "${userId}" (was anonymous/missing)`);
                return { ...e, userId: userId };
              }
              return e;
            })
            .filter((e: Event) => {
              // If event belongs to admin, exclude it for regular users
              if (e.userId === 'admin-fixed-id' && userId !== 'admin-fixed-id') {
                return false;
              }
              // Keep only events that belong to current user (after updating anonymous/missing)
              return e.userId === userId;
            });
          
          const removedEvents = allEvents.filter((e: Event) => {
            // Include admin events in removed list for regular users
            if (e.userId === 'admin-fixed-id' && userId !== 'admin-fixed-id') {
              return true;
            }
            // Include other users' events (but not current user's or anonymous/missing - those are updated above)
            return e.userId && e.userId !== userId && e.userId !== 'anonymous';
          });
          
          console.log(`📊 Analysis:`);
          console.log(`   - Current user events: ${userEvents.length}`);
          console.log(`   - Other users events: ${removedEvents.length}`);
          
          if (removedEvents.length > 0) {
            console.log(`🧹 Removing ${removedEvents.length} events from other users:`, 
              removedEvents.map(e => ({ id: e.id, userId: e.userId, name: e.coupleName })));
            
            // Save cleaned events (ONLY current user's events)
            localStorage.setItem('rsvp-events-storage', JSON.stringify({
              state: {
                events: userEvents, // ONLY current user's events (with updated userId for anonymous/missing)
                deletedEvents: parsed.state.deletedEvents || [],
                currentEvent: parsed.state.currentEvent || null
              }
            }));
            
            // Update state with filtered events (should match userEvents since we already filtered)
            set({ events: userEvents });
            
            console.log(`✅ Cleaned up ${removedEvents.length} events. Kept ${userEvents.length} events for current user.`);
            console.log(`✅ State updated with ${userEvents.length} events`);
          } else {
            console.log('ℹ️ No events from other users found - nothing to clean up');
          }
        } catch (error) {
          console.error('❌ Error cleaning up events:', error);
        }
      },

      // CRITICAL: Sync all events from localStorage to API (for multi-computer access)
      syncAllEventsToAPI: async () => {
        set({ isLoading: true, error: null });
        try {
          // Get current user ID
          const userStorage = localStorage.getItem('rsvp-user-storage');
          let userId = '';
          if (userStorage) {
            const parsed = JSON.parse(userStorage);
            userId = parsed.state?.user?.id || '';
          }

          if (!userId) {
            throw new Error('לא נמצא userId - אנא התחבר מחדש');
          }

          // Get all events from localStorage
          const stored = localStorage.getItem('rsvp-events-storage');
          if (!stored) {
            throw new Error('לא נמצאו אירועים ב-localStorage');
          }

          const parsed = JSON.parse(stored);
          const allEvents = parsed.state?.events || [];
          
          // Filter events for current user
          const userEvents = allEvents.filter((e: Event) => e.userId === userId);
          
          if (userEvents.length === 0) {
            throw new Error('לא נמצאו אירועים למשתמש הנוכחי');
          }

          console.log(`🔄 Syncing ${userEvents.length} events to API for user ${userId}...`);

          const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3002';
          let syncedCount = 0;
          let failedCount = 0;

          // Sync each event individually
          for (const event of userEvents) {
            try {
              const syncResponse = await fetch(`${BACKEND_URL}/api/events`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify(event)
              });
              
              if (syncResponse.ok) {
                syncedCount++;
                console.log(`✅ Synced event "${event.coupleName}" (${event.id}) to API`);
              } else {
                failedCount++;
                const errorText = await syncResponse.text();
                console.error(`❌ Failed to sync event "${event.coupleName}":`, errorText);
              }
            } catch (error) {
              failedCount++;
              console.error(`❌ Error syncing event "${event.coupleName}":`, error);
            }
          }

          console.log(`✅ Sync complete: ${syncedCount} synced, ${failedCount} failed`);

          // Refresh events from API after sync
          await get().fetchEvents(true);

          set({ isLoading: false });
          
          if (failedCount > 0) {
            throw new Error(`סנכרנו ${syncedCount} אירועים, ${failedCount} נכשלו`);
          }
          
          return { synced: syncedCount, failed: failedCount };
        } catch (error) {
          console.error('❌ Error syncing all events:', error);
          set({ error: error instanceof Error ? error.message : 'שגיאה בסנכרון אירועים', isLoading: false });
          throw error;
        }
      },

    }),
    {
      name: 'rsvp-events-storage',
      partialize: (state) => {
        // CRITICAL FIX: Only save events that belong to current user!
        // Get current user ID to filter events
        let currentUserId = '';
        try {
          const userStorage = localStorage.getItem('rsvp-user-storage');
          if (userStorage) {
            const parsed = JSON.parse(userStorage);
            currentUserId = parsed.state?.user?.id || '';
          }
        } catch (e) {
          console.warn('⚠️ Could not get userId in partialize:', e);
        }

        // Note: manualChanges is NOT saved to localStorage (Map cannot be serialized)
        try {
          const stored = localStorage.getItem('rsvp-events-storage');
          if (stored) {
            const parsed = JSON.parse(stored);
            if (parsed.state?.events && parsed.state.events.length > 0) {
              // CRITICAL FIX: Only save current user's events!
              // Filter events from storage - keep only current user's events
              // IMPORTANT: Exclude admin events (admin-fixed-id) for regular users
              const allEventsFromStorage = parsed.state.events;
              const currentUserEventsFromStorage = currentUserId 
                ? allEventsFromStorage.filter((e: Event) => {
                    // If event belongs to admin, exclude it for regular users
                    if (e.userId === 'admin-fixed-id' && currentUserId !== 'admin-fixed-id') {
                      return false;
                    }
                    // Keep events that belong to current user or have no userId/anonymous
                    return e.userId === currentUserId || !e.userId || e.userId === 'anonymous';
                  })
                : allEventsFromStorage;
              
              const currentEventsFromState = state.events || [];
              
              // Create a map of events from state (these might have updates)
              const stateEventsMap = new Map(currentEventsFromState.map((e: Event) => [e.id, e]));
              
              // Merge: use updated events from state, keep others from storage (only current user's events)
              const mergedEvents = currentUserEventsFromStorage.map((storedEvent: Event) => {
                const updatedEvent = stateEventsMap.get(storedEvent.id);
                return updatedEvent || storedEvent;
              });
              
              // CRITICAL: Add any new events from state that aren't in storage
              // This ensures newly created events are preserved
              currentEventsFromState.forEach((stateEvent: Event) => {
                if (!mergedEvents.find((e: Event) => e.id === stateEvent.id)) {
                  console.log('💾 Adding new event from state to storage:', stateEvent.id);
                  mergedEvents.push(stateEvent);
                }
              });
              
              console.log('💾 Saving to storage - Current user events:', mergedEvents.length);
              console.log('💾 Events from state:', currentEventsFromState.length);
              
              return {
                events: mergedEvents, // ONLY current user's events
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