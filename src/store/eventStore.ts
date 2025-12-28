import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { formatDate, cleanName, ensureUniqueEventIds } from '../utils/helpers';
import { messageService, MessageData, MessageRecipient, BulkMessageResult } from '../services/messageService';
import { generateQRCodeImage } from '../services/qrService';
import { cacheService, CACHE_KEYS } from '../services/cacheService';
import { crossTabSync } from '../utils/crossTabSync';

// Type definitions
type Event = any;
type Guest = any;
type EventStore = any;
type ExcelImportData = any;
type ExcelExportData = any;
type Table = any;
type VenueLayout = any;
type Campaign = any;

// Local helper function
const generateId = () => Math.random().toString(36).substr(2, 9);

const mockEvents: Event[] = [];

// Helper function to sync event to API for real-time cross-device sync
// CRITICAL: Send FULL event WITH guests to ensure all data is synced
// This is necessary for the client dashboard to display all guests
// Helper function to sync guests directly using the dedicated endpoint (fallback)
// If payload is too large, splits into chunks
const syncGuestsDirectly = async (eventId: string, guests: Guest[]): Promise<boolean> => {
  const BACKEND_URL = (process.env as any).NEXT_PUBLIC_BACKEND_URL || (process.env as any).VITE_BACKEND_URL || 'http://localhost:3002';
  
  try {
    console.log(`📤 Syncing ${guests.length} guests directly to API for event ${eventId}...`);
    
    // Try sending all guests at once first
    const response = await fetch(`${BACKEND_URL}/api/events/${eventId}/guests`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ guests })
    });
    
    if (response.ok) {
      console.log(`✅ Successfully synced ${guests.length} guests directly to API`);
      return true;
    } else if (response.status === 413) {
      // Payload too large - split into chunks of 100 guests each
      console.log(`⚠️ Payload too large (413), splitting into chunks...`);
      const CHUNK_SIZE = 100;
      let allSynced = true;
      
      for (let i = 0; i < guests.length; i += CHUNK_SIZE) {
        const chunk = guests.slice(i, i + CHUNK_SIZE);
        console.log(`📤 Syncing chunk ${Math.floor(i / CHUNK_SIZE) + 1}/${Math.ceil(guests.length / CHUNK_SIZE)} (${chunk.length} guests)...`);
        
        // For chunks, we need to merge with existing guests on server
        // So we'll use a PATCH endpoint or append to existing
        const chunkResponse = await fetch(`${BACKEND_URL}/api/events/${eventId}/guests`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ guests: chunk, append: i > 0 }) // append=true for chunks after first
        });
        
        if (!chunkResponse.ok) {
          console.warn(`⚠️ Failed to sync chunk ${Math.floor(i / CHUNK_SIZE) + 1}:`, chunkResponse.status);
          allSynced = false;
        } else {
          console.log(`✅ Synced chunk ${Math.floor(i / CHUNK_SIZE) + 1} successfully`);
        }
        
        // Small delay between chunks to avoid overwhelming server
        if (i + CHUNK_SIZE < guests.length) {
          await new Promise(resolve => setTimeout(resolve, 200));
        }
      }
      
      if (allSynced) {
        console.log(`✅ Successfully synced all ${guests.length} guests in chunks`);
        return true;
      } else {
        console.warn(`⚠️ Some chunks failed to sync`);
        return false;
      }
    } else {
      const errorText = await response.text();
      console.warn(`⚠️ Failed to sync guests directly:`, response.status, errorText);
      return false;
    }
  } catch (error: any) {
    console.warn('⚠️ Failed to sync guests directly:', error);
    return false;
  }
};

const syncEventToAPI = async (event: Event, retries = 3): Promise<void> => {
  const BACKEND_URL = (process.env as any).NEXT_PUBLIC_BACKEND_URL || (process.env as any).VITE_BACKEND_URL || 'http://localhost:3002';
  
  try {
    // CRITICAL: Send FULL event WITH guests to ensure all data is synced
    // This is necessary for the client dashboard to display all guests
    const fullEventPayload = {
      id: event.id,
      userId: event.userId,
      coupleName: event.coupleName,
      groomName: event.groomName,
      brideName: event.brideName,
      groomParentsName: event.groomParentsName, // CRITICAL: Include parents names
      brideParentsName: event.brideParentsName, // CRITICAL: Include parents names
      eventDate: event.eventDate,
      eventTime: event.eventTime,
      venue: event.venue,
      couplePhone: event.couplePhone,
      coupleEmail: event.coupleEmail,
      eventType: event.eventType,
      eventTypeHebrew: event.eventTypeHebrew,
      invitationImageUrl: event.invitationImageUrl,
      guests: event.guests || [], // CRITICAL: Include guests!
      createdAt: event.createdAt,
      updatedAt: event.updatedAt
    };
    
    const payloadSize = JSON.stringify(fullEventPayload).length;
    console.log(`📤 Syncing FULL event to API:`, {
      eventId: event.id,
      guestsCount: event.guests?.length || 0,
      payloadSize: `${(payloadSize / 1024).toFixed(2)} KB`
    });
    
    const response = await fetch(`${BACKEND_URL}/api/events`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(fullEventPayload)
    });
    
    if (response.ok) {
      console.log('✅ FULL event synced to API successfully:', { 
        eventId: event.id,
        guestsCount: event.guests?.length || 0
      });
    } else {
      const errorText = await response.text();
      console.warn('⚠️ API sync failed:', response.status, errorText);
      
      // CRITICAL: If sync failed but we have guests, try syncing guests directly as fallback
      if (event.guests && event.guests.length > 0) {
        console.log(`🔄 Trying to sync guests directly as fallback...`);
        const guestsSynced = await syncGuestsDirectly(event.id, event.guests);
        if (guestsSynced) {
          console.log('✅ Guests synced directly, but event details may not be updated');
          // Don't return - continue to try event details sync
        }
      }
      
      // If 413 error, try with event details only (fallback)
      if (response.status === 413 && retries > 0) {
        console.log(`🔄 413 error - trying event details only (${retries} retries left)...`);
        const eventDetailsOnly = {
          id: event.id,
          userId: event.userId,
          coupleName: event.coupleName,
          groomName: event.groomName,
          brideName: event.brideName,
          groomParentsName: event.groomParentsName, // CRITICAL: Include parents names
          brideParentsName: event.brideParentsName, // CRITICAL: Include parents names
          eventDate: event.eventDate,
          eventTime: event.eventTime,
          venue: event.venue,
          invitationImageUrl: event.invitationImageUrl,
          updatedAt: event.updatedAt
        };
        
        const retryResponse = await fetch(`${BACKEND_URL}/api/events`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(eventDetailsOnly)
        });
        
        if (retryResponse.ok) {
          console.log('✅ Event synced with details only');
          // If guests weren't synced yet, try syncing them directly
          if (event.guests && event.guests.length > 0) {
            await syncGuestsDirectly(event.id, event.guests);
          }
          return;
        }
      }
      
      if (retries > 0) {
        console.log(`🔄 Retrying sync (${retries} retries left)...`);
        await new Promise(resolve => setTimeout(resolve, 1000));
        return syncEventToAPI(event, retries - 1);
      }
    }
  } catch (error: any) {
    console.warn('⚠️ Failed to sync event to API:', error);
    // Try syncing guests directly as last resort
    if (event.guests && event.guests.length > 0) {
      await syncGuestsDirectly(event.id, event.guests);
    }
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
const FETCH_DEBOUNCE_MS = 5000; // Minimum 5 seconds between fetches (optimized to reduce API calls while maintaining responsiveness)

// Batch processing for guest updates - queues updates and sends them together
interface PendingGuestUpdate {
  phoneNumber: string;
  guestId: string;
  eventId: string;
  status?: string;
  guestCount?: number;
  actualAttendance?: string;
  notes?: string;
  responseDate: string;
  source: string;
  timestamp: number;
}

class GuestUpdateBatchProcessor {
  private updateQueue: PendingGuestUpdate[] = [];
  private batchTimeout: number | null = null;
  private readonly BATCH_DELAY_MS = 1000; // Wait 1 second before sending batch
  private readonly MAX_BATCH_SIZE = 10; // Maximum updates per batch
  private readonly CACHE_TTL_MS = 5000; // Cache updates for 5 seconds to prevent duplicates
  private updateCache = new Map<string, number>(); // key -> timestamp

  /**
   * Add an update to the queue
   */
  addUpdate(update: PendingGuestUpdate): void {
    // Check cache to prevent duplicate updates
    const cacheKey = `${update.eventId}-${update.guestId}-${update.status || ''}-${update.guestCount || ''}`;
    const cachedTime = this.updateCache.get(cacheKey);
    const now = Date.now();
    
    if (cachedTime && (now - cachedTime) < this.CACHE_TTL_MS) {
      console.log('🚫 Skipping duplicate update (cached):', cacheKey);
      return;
    }
    
    // Remove any existing update for the same guest from queue
    this.updateQueue = this.updateQueue.filter(
      (u: any) => !(u.eventId === update.eventId && u.guestId === update.guestId)
    );
    
    // Add new update to queue
    this.updateQueue.push(update);
    this.updateCache.set(cacheKey, now);
    
    console.log(`📦 Added update to batch queue (${this.updateQueue.length} pending)`);
    
    // If queue is full, send immediately
    if (this.updateQueue.length >= this.MAX_BATCH_SIZE) {
      this.flushBatch();
      return;
    }
    
    // Otherwise, schedule batch send after delay
    if (this.batchTimeout) {
      clearTimeout(this.batchTimeout);
    }
    
    this.batchTimeout = window.setTimeout(() => {
      this.flushBatch();
    }, this.BATCH_DELAY_MS);
  }

  /**
   * Send all pending updates in batch
   */
  private async flushBatch(): Promise<void> {
    if (this.updateQueue.length === 0) {
      return;
    }
    
    const updatesToSend = [...this.updateQueue];
    this.updateQueue = [];
    
    if (this.batchTimeout) {
      clearTimeout(this.batchTimeout);
      this.batchTimeout = null;
    }
    
    console.log(`📤 Sending batch of ${updatesToSend.length} guest updates...`);
    
    const BACKEND_URL = (process.env as any).NEXT_PUBLIC_BACKEND_URL || (process.env as any).VITE_BACKEND_URL || 'http://localhost:3002';
    
    // Send updates in parallel (but limit concurrency)
    const BATCH_CONCURRENCY = 5;
    for (let i = 0; i < updatesToSend.length; i += BATCH_CONCURRENCY) {
      const batch = updatesToSend.slice(i, i + BATCH_CONCURRENCY);
      
      await Promise.all(
        batch.map(async (update: any) => {
          try {
            const response = await fetch(`${BACKEND_URL}/api/guests/add-pending-update`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(update)
            });
            
            if (response.ok) {
              console.log(`✅ Batch update sent successfully for guest ${update.guestId}`);
            } else {
              const errorText = await response.text();
              console.warn(`⚠️ Batch update failed for guest ${update.guestId}:`, response.status, errorText);
            }
          } catch (error: any) {
            console.warn(`⚠️ Batch update error for guest ${update.guestId}:`, error);
          }
        })
      );
      
      // Small delay between batches to avoid overwhelming server
      if (i + BATCH_CONCURRENCY < updatesToSend.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    
    console.log(`✅ Batch of ${updatesToSend.length} updates completed`);
  }

  /**
   * Force flush any pending updates (useful on page unload)
   */
  forceFlush(): void {
    if (this.batchTimeout) {
      clearTimeout(this.batchTimeout);
      this.batchTimeout = null;
    }
    this.flushBatch();
  }
}

// Singleton instance
const guestUpdateBatchProcessor = new GuestUpdateBatchProcessor();

// Flush on page unload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    guestUpdateBatchProcessor.forceFlush();
  });
}

export const useEventStore = create<EventStore>()(
  persist(
    (set, get) => ({
      events: mockEvents,
      deletedEvents: [], // אירועים שנמחקו
      deletedGuests: {}, // Track deleted guests: eventId -> array of guestIds
      currentEvent: null,
      isLoading: false,
      isSyncing: false, // Track sync state for UI feedback
      syncSuccessMessage: null, // Success message after sync
      error: null,

      fetchEvents: async (forceRefresh: boolean = false, silent: boolean = false) => {
        // CRITICAL: Prevent infinite recursion by tracking if we're already fetching
        const isFetching = (get() as any)._isFetchingEvents;
        if (isFetching) {
          console.warn('⚠️ fetchEvents is already running, skipping recursive call');
          return;
        }
        
        // Mark as fetching to prevent recursion
        (get() as any)._isFetchingEvents = true;
        
        if (!silent) {
          set({ isLoading: true, error: null });
        }
        
        try {
          // Get userId from localStorage
          const userStorage = localStorage.getItem('rsvp-user-storage');
          let userId = '';
          if (userStorage) {
            try {
              const parsed = JSON.parse(userStorage);
              userId = parsed.state?.user?.id || '';
            } catch (e: any) {
              console.error('❌ Error parsing user storage:', e);
            }
          }

          if (!userId) {
            console.warn('⚠️ No userId found - cannot fetch events from API');
            if (!silent) {
              set({ isLoading: false, error: 'לא נמצא userId - אנא התחבר מחדש' });
            }
            // CRITICAL: Clear fetching flag even on early return
            (get() as any)._isFetchingEvents = false;
            return;
          }

          // CRITICAL: Debug log - verify userId before calling API
          console.log('🔍 Calling fetchEvents for user:', userId);
          console.log(`🔍 [UserID Check] Fetching data from DB for userId: "${userId}"`);
          console.log(`🔍 [UserID Check] userId type: ${typeof userId}, length: ${userId.length}`);

          const BACKEND_URL = (process.env as any).NEXT_PUBLIC_BACKEND_URL || (process.env as any).VITE_BACKEND_URL || 'https://whatsapp-backend-enfz.onrender.com';
          
          // CRITICAL: Cloud First Strategy - Always fetch from server first
          // Server is the source of truth, localStorage is just a cache
          console.log(`🔍 Fetching data from DB for user: ${userId}`);
          
          try {
            const response = await fetch(`${BACKEND_URL}/api/events/${userId}`, {
              method: 'GET',
              headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
              },
              mode: 'cors',
              credentials: 'omit'
            });

            if (!response.ok) {
              throw new Error(`API returned ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            
            // Handle different response formats: array, {events: []}, or {fullResponse: []}
            let apiEvents: any[] = [];
            if (Array.isArray(data)) {
              apiEvents = data;
            } else if (data.fullResponse && Array.isArray(data.fullResponse)) {
              apiEvents = data.fullResponse;
            } else if (data.events && Array.isArray(data.events)) {
              apiEvents = data.events;
            }

            // בדיקה אם חזרו נתונים מהשרת
            if (apiEvents && apiEvents.length > 0) {
              console.log(`✅ Data received from DB: ${apiEvents.length} events found.`);
              
              // CRITICAL: UserID Consistency - Log userId from events to verify match
              const eventUserIds = [...new Set(apiEvents.map((e: any) => e.userId || e.user_id).filter(Boolean))];
              console.log(`🔍 [UserID Check] Event userIds from server:`, eventUserIds);
              console.log(`🔍 [UserID Check] Current userId: "${userId}"`);
              if (eventUserIds.length > 0 && !eventUserIds.includes(userId)) {
                console.warn(`⚠️ [UserID Mismatch] Server events have userIds: ${eventUserIds.join(', ')}, but current userId is: ${userId}`);
              }
              
              // Map Supabase fields to frontend format
              const mappedEvents = apiEvents.map((event: any) => {
                const mappedEvent = {
                  ...event,
                  coupleName: event.couple_name || event.coupleName,
                  eventDate: event.event_date || event.eventDate,
                  groomName: event.groom_name || event.groomName,
                  brideName: event.bride_name || event.brideName,
                  eventType: event.event_type || event.eventType,
                  eventTypeHebrew: event.event_type_hebrew || event.eventTypeHebrew,
                  couplePhone: event.couple_phone || event.couplePhone,
                  coupleEmail: event.couple_email || event.coupleEmail,
                  createdAt: event.created_at || event.createdAt,
                  updatedAt: event.updated_at || event.updatedAt,
                  userId: userId // Ensure userId is set correctly
                };
                
                // Map guest fields if guests exist
                if (mappedEvent.guests && Array.isArray(mappedEvent.guests)) {
                  mappedEvent.guests = mappedEvent.guests.map((guest: any) => ({
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
                    eventId: guest.event_id || guest.eventId || mappedEvent.id,
                    createdAt: guest.created_at || guest.createdAt,
                    updatedAt: guest.updated_at || guest.updatedAt
                  }));
                }
                
                return mappedEvent;
              });

              // עדכון ה-State וה-LocalStorage - דריסה מוחלטת של הנתונים הישנים
              // זה מה שיפתור את הבעיה בטאבלט
              set((state: any) => ({
                events: mappedEvents,
                isLoading: false,
                syncSuccessMessage: !silent ? 'הנתונים עודכנו בהצלחה' : null, // Show success message
                error: null
              }));
              
              // CRITICAL: Clear success message after 3 seconds
              if (!silent) {
                setTimeout(() => {
                  set((state: any) => ({ syncSuccessMessage: null }));
                }, 3000);
              }
              
              // CRITICAL: Force Cloud Priority - Clear localStorage BEFORE saving new data
              // This forces the tablet to 'forget' its old local data
              try {
                // CRITICAL: Clear the events storage key completely before saving new data
                console.log('🧹 [Force Cloud Priority] Clearing localStorage events before saving server data...');
                const eventsStorageKey = 'rsvp-events-storage';
                localStorage.removeItem(eventsStorageKey);
                
                // Now create fresh storage with server data
                const parsed: any = { state: { events: mappedEvents } };
                localStorage.setItem(eventsStorageKey, JSON.stringify(parsed));
                
                console.log(`✅ [Force Cloud Priority] Cleared and overwrote localStorage with ${mappedEvents.length} events from server`);
              } catch (storageError: any) {
                console.error('❌ Error updating localStorage:', storageError);
              }
              
              // CRITICAL: Clear fetching flag
              (get() as any)._isFetchingEvents = false;
              return;
            } else {
              console.warn("⚠️ Server returned no events. Checking if we need to sync local data...");
              
              // כאן נכנסת הלוגיקה של סנכרון ראשוני רק אם ה-DB באמת ריק
              const eventsStorage = localStorage.getItem('rsvp-events-storage');
              let localData: Event[] = [];
              
              if (eventsStorage) {
                try {
                  const parsed = JSON.parse(eventsStorage);
                  localData = (parsed.state?.events || []).filter((e: Event) => {
                    const matchesUser = e.userId === userId || (userId === 'admin-fixed-id' && e.userId);
                    const hasGuests = e.guests && Array.isArray(e.guests) && e.guests.length > 0;
                    return matchesUser && hasGuests;
                  });
                } catch (e) {
                  console.warn('⚠️ Error parsing local events storage');
                }
              }
              
              if (localData.length > 0) {
                console.log("🔄 Local data found but DB is empty. Syncing local to server...");
                
                // Sync local events to server
                let syncedCount = 0;
                for (const event of localData) {
                  try {
                    await syncEventToAPI(event);
                    syncedCount++;
                    console.log(`✅ Synced local event "${event.coupleName || `${event.groomName} & ${event.brideName}`}" (${event.id}) to server`);
                  } catch (syncError: any) {
                    console.error(`❌ Failed to sync local event ${event.id}:`, syncError);
                  }
                }
                
                console.log(`✅ Synced ${syncedCount}/${localData.length} local events to server.`);
                
                // CRITICAL: After sync, refresh events from API
                // Use robust version that checks if fetchEvents exists before calling
                // CRITICAL: Save userId before setTimeout to ensure it's available in closure
                const savedUserId = userId;
                console.log('🔄 Refreshing events from API after sync...');
                // Clear the fetching flag
                (get() as any)._isFetchingEvents = false;
                // Small delay to ensure sync completes, then refresh data
                setTimeout(async () => {
                  console.log('🔄 Triggering safe refresh via useEventStore...');
                  // METHOD B (Safer for external usage): Use the global hook
                  const storeState = useEventStore.getState();
                  if (storeState && storeState.fetchEvents && savedUserId) {
                    await storeState.fetchEvents(savedUserId, false).catch((err: any) => {
                      console.error('❌ Error refreshing events after sync:', err);
                      window.location.reload(); // Fallback on error
                    });
                  } else {
                    console.warn('⚠️ Store reference missing, forcing reload');
                    window.location.reload();
                  }
                }, 1000);
                return;
              } else {
                // No local data and no server data - empty state
                console.log(`ℹ️ No events found for user ${userId} - empty state`);
                set((state: any) => ({
                  events: [],
                  isLoading: false,
                  error: null
                }));
              }
              
              // CRITICAL: Clear fetching flag
              (get() as any)._isFetchingEvents = false;
              return;
            }
          } catch (error: any) {
            console.error("❌ Error fetching from DB:", error);
            
            // במקרה של שגיאת רשת בלבד - נשתמש ב-LocalStorage כגיבוי
            try {
              const eventsStorage = localStorage.getItem('rsvp-events-storage');
              if (eventsStorage) {
                const parsed = JSON.parse(eventsStorage);
                const cachedEvents = (parsed.state?.events || []).filter((e: Event) => {
                  return e.userId === userId || (userId === 'admin-fixed-id' && e.userId);
                });
                
                if (cachedEvents.length > 0) {
                  console.log(`⚠️ Using cached data from localStorage (${cachedEvents.length} events) as fallback`);
                  set((state: any) => ({
                    events: cachedEvents,
                    isLoading: false,
                    error: null
                  }));
                  (get() as any)._isFetchingEvents = false;
                  return;
                }
              }
            } catch (cacheError: any) {
              console.error('❌ Error reading from cache:', cacheError);
            }
            
            // If we reach here, we have no data at all
            set((state: any) => ({
              events: [],
              isLoading: false,
              error: error instanceof Error ? error.message : 'שגיאה בטעינת אירועים'
            }));
          }
        } catch (error: any) {
          console.error('❌ Error in fetchEvents:', error);
          if (!silent) {
            set({ 
              error: error instanceof Error ? error.message : 'שגיאה בטעינת אירועים', 
              isLoading: false 
            });
          } else {
            set({ isLoading: false });
          }
        } finally {
          // CRITICAL: Clear the fetching flag to allow future calls
          (get() as any)._isFetchingEvents = false;
        }
      },
              // Map event fields
              const mappedEvent = {
                ...event,
                coupleName: event.couple_name || event.coupleName,
                eventDate: event.event_date || event.eventDate,
                groomName: event.groom_name || event.groomName,
                brideName: event.bride_name || event.brideName,
                eventType: event.event_type || event.eventType,
                eventTypeHebrew: event.event_type_hebrew || event.eventTypeHebrew,
                couplePhone: event.couple_phone || event.couplePhone,
                coupleEmail: event.couple_email || event.coupleEmail,
                createdAt: event.created_at || event.createdAt,
                updatedAt: event.updated_at || event.updatedAt,
                userId: userId // Ensure userId is set correctly
              };
              
              // Map guest fields if guests exist
              if (mappedEvent.guests && Array.isArray(mappedEvent.guests)) {
                mappedEvent.guests = mappedEvent.guests.map((guest: any) => ({
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
                  eventId: guest.event_id || guest.eventId || mappedEvent.id,
                  createdAt: guest.created_at || guest.createdAt,
                  updatedAt: guest.updated_at || guest.updatedAt
                }));
              }
              
              return mappedEvent;
            });

            // CRITICAL: Overwrite localStorage completely with server data (no merging)
            try {
              const eventsStorage = localStorage.getItem('rsvp-events-storage');
              let parsed: any = { state: { events: [] } };
              
              if (eventsStorage) {
                try {
                  parsed = JSON.parse(eventsStorage);
                } catch (e) {
                  console.warn('⚠️ Error parsing events storage, creating new structure');
                }
              }
              
              // CRITICAL: Replace ALL events with server data (overwrite, don't merge)
              parsed.state.events = mappedEvents;
              localStorage.setItem('rsvp-events-storage', JSON.stringify(parsed));
              
              console.log(`✅ [Cloud First] Overwrote localStorage with ${mappedEvents.length} events from server`);
              
              // Update store with server data
              set((state: any) => {
                const totalGuests = mappedEvents.reduce((sum: number, event: any) => {
                  return sum + (event.guests?.length || 0);
                }, 0);
                
                console.log(`🔄 [Cloud First] Updated store with server data:`, {
                  eventsCount: mappedEvents.length,
                  totalGuests: totalGuests,
                  previousEventsCount: state.events?.length || 0
                });
                
                return {
                  events: mappedEvents,
                  isLoading: false,
                  error: null
                };
              });

              console.log(`✅ [Cloud First] Successfully updated store with ${mappedEvents.length} events from server`);
              // CRITICAL: Clear fetching flag
              (get() as any)._isFetchingEvents = false;
              return;
            } catch (storageError: any) {
              console.error('❌ Error updating localStorage:', storageError);
              // Continue to update store even if localStorage update fails
            }
          }
          
          // CRITICAL: Fallback - If server fetch failed, check for local events to sync
          // This only happens if server is unavailable
          if (!fetchSucceeded && apiEvents.length === 0) {
            try {
              const eventsStorage = localStorage.getItem('rsvp-events-storage');
              if (eventsStorage) {
                const parsed = JSON.parse(eventsStorage);
                const storedEvents = parsed.state?.events || [];
                
                // Filter events for current user that have guests
                const localEventsWithGuests = storedEvents.filter((e: Event) => {
                  const matchesUser = e.userId === userId || (userId === 'admin-fixed-id' && e.userId);
                  const hasGuests = e.guests && Array.isArray(e.guests) && e.guests.length > 0;
                  return matchesUser && hasGuests;
                });
                
                if (localEventsWithGuests.length > 0) {
                  const totalGuests = localEventsWithGuests.reduce((sum: number, event: Event) => {
                    return sum + (event.guests?.length || 0);
                  }, 0);
                  
                  console.log(`⚠️ Server unavailable, but found ${localEventsWithGuests.length} local events with ${totalGuests} guests. Syncing to server...`);
                  
                  // Sync each local event to server via POST
                  let syncedCount = 0;
                  for (const event of localEventsWithGuests) {
                    try {
                      await syncEventToAPI(event);
                      syncedCount++;
                      console.log(`✅ Synced local event "${event.coupleName || `${event.groomName} & ${event.brideName}`}" (${event.id}) with ${event.guests?.length || 0} guests to server`);
                    } catch (syncError: any) {
                      console.error(`❌ Failed to sync local event ${event.id}:`, syncError);
                    }
                  }
                  
                  console.log(`✅ Synced ${syncedCount}/${localEventsWithGuests.length} local events to server.`);
                  
                  // CRITICAL: After sync, refresh events from API
                  // Use robust version that checks if fetchEvents exists before calling
                  // CRITICAL: Save userId before setTimeout to ensure it's available in closure
                  const savedUserId = userId;
                  console.log('🔄 Refreshing events from API after sync...');
                  // Clear the fetching flag
                  (get() as any)._isFetchingEvents = false;
                  // Small delay to ensure sync completes, then refresh data
                  setTimeout(async () => {
                    console.log('🔄 Triggering safe refresh via useEventStore...');
                    // METHOD B (Safer for external usage): Use the global hook
                    const storeState = useEventStore.getState();
                    if (storeState && storeState.fetchEvents && savedUserId) {
                      await storeState.fetchEvents(savedUserId, false).catch((err: any) => {
                        console.error('❌ Error refreshing events after sync:', err);
                        window.location.reload(); // Fallback on error
                      });
                    } else {
                      console.warn('⚠️ Store reference missing, forcing reload');
                      window.location.reload();
                    }
                  }, 1000);
                  return;
                } else {
                  console.log(`ℹ️ API returned 0 events and no local events with guests found for user ${userId}`);
                }
              }
            } catch (syncError: any) {
              console.warn('⚠️ Error syncing local events to server:', syncError);
              // Continue with empty array - don't block the flow
            }
          }
          
          // CRITICAL: If we reach here and have no events, handle empty state gracefully
          // This handles the case where device is new (like tablet) and localStorage is empty
          if (apiEvents.length === 0) {
            console.log(`ℹ️ No events found for user ${userId} - empty state (new device or no events)`);
            
            // Ensure empty array is set in store and localStorage
            set((state: any) => ({
              events: [],
              isLoading: false,
              error: null
            }));
            
            // Clear localStorage events for this user (but preserve structure)
            try {
              const eventsStorage = localStorage.getItem('rsvp-events-storage');
              let parsed: any = { state: { events: [] } };
              if (eventsStorage) {
                try {
                  parsed = JSON.parse(eventsStorage);
                } catch (e) {
                  console.warn('⚠️ Error parsing events storage');
                }
              }
              
              // Filter out events for this user, keep others (for admin)
              if (userId !== 'admin-fixed-id') {
                parsed.state.events = (parsed.state.events || []).filter((e: Event) => e.userId !== userId);
              } else {
                parsed.state.events = [];
              }
              
              localStorage.setItem('rsvp-events-storage', JSON.stringify(parsed));
            } catch (e) {
              console.warn('⚠️ Error clearing localStorage:', e);
            }
            
            (get() as any)._isFetchingEvents = false;
            return;
          }
          
          // CRITICAL: If we reach here, something went wrong - log and handle gracefully
          console.error('❌ Unexpected state: fetchEvents reached end without handling all cases');
          set({ isLoading: false, error: 'שגיאה בטעינת אירועים מהשרת' });
        } catch (error: any) {
          console.error('❌ Error fetching events from Supabase:', error);
          if (!silent) {
            set({ 
              error: error instanceof Error ? error.message : 'שגיאה בטעינת אירועים', 
              isLoading: false 
            });
          } else {
            set({ isLoading: false });
          }
        } finally {
          // CRITICAL: Clear the fetching flag to allow future calls
          (get() as any)._isFetchingEvents = false;
        }
      },

      // CRITICAL: Force refresh - clears localStorage and fetches fresh data from server
      forceRefresh: async () => {
        console.log('🔄 [Force Refresh] Clearing localStorage and fetching fresh data from server...');
        
        try {
          // Get userId
          const userStorage = localStorage.getItem('rsvp-user-storage');
          let userId = '';
          if (userStorage) {
            try {
              const parsed = JSON.parse(userStorage);
              userId = parsed.state?.user?.id || '';
            } catch (e: any) {
              console.error('❌ Error parsing user storage:', e);
            }
          }

          if (!userId) {
            throw new Error('לא נמצא userId - אנא התחבר מחדש');
          }

          // CRITICAL: Clear events from localStorage for this user
          try {
            const eventsStorage = localStorage.getItem('rsvp-events-storage');
            if (eventsStorage) {
              const parsed = JSON.parse(eventsStorage);
              
              // Filter out events for this user (keep admin events if not admin)
              if (userId !== 'admin-fixed-id') {
                parsed.state.events = (parsed.state.events || []).filter((e: Event) => e.userId !== userId);
              } else {
                // Admin: clear all events
                parsed.state.events = [];
              }
              
              localStorage.setItem('rsvp-events-storage', JSON.stringify(parsed));
              console.log('✅ [Force Refresh] Cleared events from localStorage');
            }
          } catch (clearError: any) {
            console.warn('⚠️ Error clearing localStorage:', clearError);
            // Continue anyway - we'll overwrite it
          }

          // Clear store events temporarily
          set({ events: [], isLoading: true, error: null });

          // Now fetch fresh data from server
          const storeState = useEventStore.getState();
          await storeState.fetchEvents(true, false); // Force refresh, not silent
          
          console.log('✅ [Force Refresh] Successfully refreshed data from server');
        } catch (error: any) {
          console.error('❌ [Force Refresh] Error:', error);
          set({ 
            error: error instanceof Error ? error.message : 'שגיאה ברענון נתונים', 
            isLoading: false 
          });
          throw error;
        }
      },

      // CRITICAL: Fetch a single event by ID from API (database-first architecture)
      fetchEventById: async (eventId: string, userId?: string) => {
        set({ isLoading: true, error: null });
        try {
          // Get userId from localStorage if not provided
          let currentUserId = userId;
          if (!currentUserId) {
            const userStorage = localStorage.getItem('rsvp-user-storage');
            if (userStorage) {
              try {
                const parsed = JSON.parse(userStorage);
                currentUserId = parsed.state?.user?.id || '';
              } catch (e: any) {
                console.error('❌ Error parsing user storage:', e);
              }
            }
          }

          if (!currentUserId) {
            throw new Error('לא נמצא userId - אנא התחבר מחדש');
          }

          const BACKEND_URL = (process.env as any).NEXT_PUBLIC_BACKEND_URL || (process.env as any).VITE_BACKEND_URL || 'https://whatsapp-backend-enfz.onrender.com';
          
          console.log(`🔄 Fetching event ${eventId} from API for userId: ${currentUserId}`);
          
          // First, try to get from /api/events/:userId and find the specific event
          const response = await fetch(`${BACKEND_URL}/api/events/${currentUserId}`, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json'
            },
            mode: 'cors',
            credentials: 'omit'
          });

          if (!response.ok) {
            throw new Error(`API returned ${response.status}: ${response.statusText}`);
          }

          const data = await response.json();
          const apiEvents = Array.isArray(data) ? data : (data.events || []);
          
          // Find the specific event
          const event = apiEvents.find((e: any) => e.id === eventId);
          
          if (!event) {
            console.warn(`⚠️ Event ${eventId} not found in API response`);
            set({ isLoading: false, error: 'אירוע לא נמצא' });
            return null;
          }

          // Map Supabase fields to frontend format (same as fetchEvents)
          const mappedEvent = {
            ...event,
            coupleName: event.couple_name || event.coupleName,
            eventDate: event.event_date || event.eventDate,
            groomName: event.groom_name || event.groomName,
            brideName: event.bride_name || event.brideName,
            eventType: event.event_type || event.eventType,
            eventTypeHebrew: event.event_type_hebrew || event.eventTypeHebrew,
            couplePhone: event.couple_phone || event.couplePhone,
            coupleEmail: event.couple_email || event.coupleEmail,
            createdAt: event.created_at || event.createdAt,
            updatedAt: event.updated_at || event.updatedAt
          };
          
          // Map guest fields if guests exist
          if (mappedEvent.guests && Array.isArray(mappedEvent.guests)) {
            mappedEvent.guests = mappedEvent.guests.map((guest: any) => ({
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
              eventId: guest.event_id || guest.eventId || mappedEvent.id,
              createdAt: guest.created_at || guest.createdAt,
              updatedAt: guest.updated_at || guest.updatedAt
            }));
          }

          // Update store with the fetched event
          set((state: any) => {
            const existingEventIndex = state.events.findIndex((e: any) => e.id === eventId);
            const updatedEvents = existingEventIndex >= 0
              ? state.events.map((e: any, index: number) => index === existingEventIndex ? mappedEvent : e)
              : [...state.events, mappedEvent];
            
            return {
              events: updatedEvents,
              currentEvent: mappedEvent,
              isLoading: false,
              error: null
            };
          });

          console.log(`✅ Successfully fetched event ${eventId} from API`);
          return mappedEvent;
        } catch (error: any) {
          console.error('❌ Error fetching event by ID from API:', error);
          set({ 
            error: error instanceof Error ? error.message : 'שגיאה בטעינת אירוע', 
            isLoading: false 
          });
          return null;
        }
      },

      createEvent: async (eventData: any) => {
        console.log('🔍 createEvent called with:', eventData);
        set({ isLoading: true, error: null });
        try {
          // CRITICAL: Clean invitationImageUrl - remove local file paths
          let cleanedInvitationImageUrl = eventData.invitationImageUrl;
          if (cleanedInvitationImageUrl && cleanedInvitationImageUrl.startsWith('file://')) {
            console.warn('⚠️ Removing local file path from invitationImageUrl:', cleanedInvitationImageUrl);
            cleanedInvitationImageUrl = undefined; // Remove local file paths
          }
          
          const eventId = generateId();
          
          // Create 5 default campaigns according to the correct schedule
          const defaultCampaigns: Campaign[] = [
            {
              id: generateId(),
              eventId: eventId,
              name: 'הזמנה ראשונית',
              message: `🎉 שלום {{guest_name}}!

אנחנו שמחים להזמין אותך לחתונה של {{couple_name}}!

📅 תאריך: {{event_date}}
🕐 שעה: {{event_time}}
📍 מיקום: {{venue}}

אנא אשר/י הגעה 
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
              // CRITICAL: No buttons - send text-only message with links instead
              whatsappButtons: [],
              // SMS fallback with link
              smsMessage: `🎉 שלום {{guest_name}}!

אנחנו שמחים להזמין אותך לחתונה של {{couple_name}}!

📅 תאריך: {{event_date}}
🕐 שעה: {{event_time}}
📍 מיקום: {{venue}}

אנא אשר/י הגעה 
בברכה,
{{couple_name}} 💕`
            },
            {
              id: generateId(),
              name: 'תזכורת שנייה',
              message: `🎉 שלום {{guest_name}}!

אנחנו שמחים להזמין אותך לחתונה של {{couple_name}}!

📅 תאריך: {{event_date}}
🕐 שעה: {{event_time}}
📍 מיקום: {{venue}}

אנא אשר/י הגעה 
בברכה,
{{couple_name}} 💕`,
              channel: 'whatsapp' as const,
              scheduledDate: new Date(eventData.eventDate.getTime() - 14 * 24 * 60 * 60 * 1000), // 14 days before
              status: 'draft' as const,
              sentCount: 0,
              responseCount: 0,
              createdAt: new Date(),
              updatedAt: new Date(),
              // Use WhatsApp template 'aa' for this campaign
              templateName: 'aa', // Template name in Meta Business Manager
              // CRITICAL: No buttons - send text-only message with links instead
              whatsappButtons: [],
              // SMS fallback with link
              smsMessage: `🎉 שלום {{guest_name}}!

אנחנו שמחים להזמין אותך לחתונה של {{couple_name}}!

📅 תאריך: {{event_date}}
🕐 שעה: {{event_time}}
📍 מיקום: {{venue}}

אנא אשר/י הגעה 
בברכה,
{{couple_name}} 💕`
            },
            {
              id: generateId(),
              name: 'תזכורת שבועית',
              message: `🎉 שלום {{guest_name}}!

אנחנו שמחים להזמין אותך לחתונה של {{couple_name}}!

📅 תאריך: {{event_date}}
🕐 שעה: {{event_time}}
📍 מיקום: {{venue}}

אנא אשר/י הגעה 
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
              // CRITICAL: No buttons - send text-only message with links instead
              whatsappButtons: [],
              // SMS fallback with link
              smsMessage: `🎉 שלום {{guest_name}}!

אנחנו שמחים להזמין אותך לחתונה של {{couple_name}}!

📅 תאריך: {{event_date}}
🕐 שעה: {{event_time}}
📍 מיקום: {{venue}}

אנא אשר/י הגעה 
בברכה,
{{couple_name}} 💕`
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
              // CRITICAL: No buttons - send text-only message with links instead
              whatsappButtons: [],
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
מחר זה קורה! החתונה של {{couple_name}}!

📅 תאריך: {{event_date}}
🕐 שעה: {{event_time}}
📍 מיקום: {{venue}}
🪑 שולחן: {{table_number}}

🔗 לעדכון סטטוס ההגעה לחץ

לא לשכוח להביא מצב רוח טוב! 😊`,
              channel: 'whatsapp' as const,
              scheduledDate: new Date(new Date(eventData.eventDate).setHours(8, 0, 0, 0)), // Same day at 8 AM
              status: 'draft' as const,
              sentCount: 0,
              responseCount: 0,
              createdAt: new Date(),
              updatedAt: new Date(),
              // CRITICAL: No buttons - send text-only message with links instead
              whatsappButtons: [],
              // SMS fallback with link
              smsMessage: `🎉 שלום {{guest_name}}!
מחר זה קורה! החתונה של {{couple_name}}!

📅 תאריך: {{event_date}}
🕐 שעה: {{event_time}}
📍 מיקום: {{venue}}
🪑 שולחן: {{table_number}}

🔗 לעדכון סטטוס ההגעה לחץ

לא לשכוח להביא מצב רוח טוב! 😊`
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
            } catch (e: any) {
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
            invitationImageUrl: cleanedInvitationImageUrl, // Use cleaned image URL
            id: eventId,
            userId: userId || 'anonymous', // Add userId
            userEmail: userEmail || '', // Add userEmail for re-registration matching
            creditsUsed: creditsNeeded, // Add creditsUsed
            campaigns: defaultCampaigns,
            createdAt: new Date(),
            updatedAt: new Date()
          };
          
          console.log('📝 New event created with userId:', newEvent.userId, 'userEmail:', newEvent.userEmail);
          
          // CRITICAL: Check for duplicate events before creating
          const currentState = get();
          
          // Check for duplicate ID (should never happen with improved generateId, but safety check)
          let finalEvent = newEvent;
          const duplicateIdEvent = currentState.events.find((e: any) => e.id === newEvent.id);
          if (duplicateIdEvent) {
            console.error(`❌ CRITICAL: Duplicate event ID detected! This should never happen.`);
            console.error(`❌ Existing event ID: ${duplicateIdEvent.id}, New event ID: ${newEvent.id}`);
            // Generate a new ID and retry (safety mechanism)
            finalEvent = { ...newEvent, id: generateId() };
            console.log(`🔄 Generated new ID for event: ${finalEvent.id}`);
          }
          
          // Check for duplicate event by content (same couple and same date)
          const duplicateContentEvent = currentState.events.find((e: any) => 
            e.coupleName === finalEvent.coupleName && 
            e.eventDate && finalEvent.eventDate && 
            Math.abs(new Date(e.eventDate).getTime() - finalEvent.eventDate.getTime()) < 1000 // Same couple and same date (within 1 second)
          );
          
          if (duplicateContentEvent) {
            console.warn(`⚠️ Duplicate event content detected! Event ID: ${duplicateContentEvent.id}, New ID: ${finalEvent.id}`);
            console.warn(`⚠️ Duplicate event details:`, {
              existing: { id: duplicateContentEvent.id, coupleName: duplicateContentEvent.coupleName, eventDate: duplicateContentEvent.eventDate },
              new: { id: finalEvent.id, coupleName: finalEvent.coupleName, eventDate: finalEvent.eventDate }
            });
            // Don't create duplicate - return existing event
            set({ isLoading: false, error: 'אירוע זהה כבר קיים' });
            return;
          }
          
          // CRITICAL: Save to state first
          set((state: any) => {
            console.log('🔍 Before createEvent - events count:', state.events.length);
            console.log('🔍 Creating event with unique ID:', finalEvent.id);
            // CRITICAL: Final double-check for duplicates before adding (safety net)
            const existingEvent = state.events.find((e: any) => e.id === finalEvent.id);
            if (existingEvent) {
              console.error(`❌ CRITICAL: Event with ID ${finalEvent.id} already exists in state! This should never happen.`);
              // Generate a new ID as last resort
              const retryEvent = { ...finalEvent, id: generateId() };
              console.log(`🔄 Generated final new ID for event: ${retryEvent.id}`);
              const updatedEvents = [...state.events, retryEvent];
              return {
                events: updatedEvents,
                isLoading: false
              };
            }
            const updatedEvents = [...state.events, finalEvent];
            console.log('🔍 After createEvent - events count:', updatedEvents.length);
            console.log('🔍 New event created with 5 default campaigns:', finalEvent);
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
                
                // CRITICAL: Ensure all events have unique IDs before saving
                allEvents = ensureUniqueEventIds(allEvents);
              } catch (e: any) {
                console.warn('⚠️ Error parsing stored events:', e);
              }
            }
            
            // Add new event if not already present
            if (!allEvents.find((e: any) => e.id === finalEvent.id)) {
              allEvents.push(finalEvent);
              console.log('💾 Saved new event directly to localStorage:', finalEvent.id);
              
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
                  } catch (e: any) {
                    console.error('❌ Error verifying event save:', e);
                  }
                }
              }, 100); // Check after 100ms
            } else {
              console.log('⚠️ Event already exists in localStorage:', newEvent.id);
            }
          } catch (error: any) {
            console.error('❌ Error saving event to localStorage:', error);
            // Try to save again as fallback
            try {
              const fallbackStored = localStorage.getItem('rsvp-events-storage');
              let fallbackEvents: Event[] = [];
              if (fallbackStored) {
                const fallbackParsed = JSON.parse(fallbackStored);
                fallbackEvents = fallbackParsed.state?.events || [];
              }
              if (!fallbackEvents.find((e: any) => e.id === newEvent.id)) {
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
            } catch (fallbackError: any) {
              console.error('❌ Fallback save also failed:', fallbackError);
            }
          }
          
          // Sync to API (for multi-computer access) - CRITICAL for data sync
          // CRITICAL: Use syncEventToAPI to ensure guests are included
          try {
            await syncEventToAPI(finalEvent);
            console.log('✅ Event synced to API successfully with all guests');
          } catch (error: any) {
            console.error('❌ Failed to sync event to API:', error);
            // Continue - localStorage is already updated
            // But log error so user knows sync failed
          }
        } catch (error: any) {
          set({ error: 'שגיאה ביצירת האירוע', isLoading: false });
        }
      },

      updateEvent: async (id: any, updates: any) => {
        set({ isLoading: true, error: null });
        try {
          // CRITICAL: Clean invitationImageUrl - remove local file paths
          const cleanedUpdates = { ...updates };
          if (updates.invitationImageUrl) {
            if (updates.invitationImageUrl.startsWith('file://')) {
              console.warn('⚠️ Removing local file path from invitationImageUrl:', updates.invitationImageUrl);
              cleanedUpdates.invitationImageUrl = undefined; // Remove local file paths
            }
          }
          
          let updatedEvent: Event | null = null;
          
          set((state: any) => {
            const updatedEvents = state.events.map((event: any) => {
              if (event.id === id) {
                updatedEvent = { ...event, ...cleanedUpdates, updatedAt: new Date() };
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
          // CRITICAL: Use syncEventToAPI to ensure guests are included
          // This ensures all guests are synced to the backend
          if (updatedEvent) {
            try {
              await syncEventToAPI(updatedEvent);
              console.log('✅ Event update synced to API successfully with all guests');
            } catch (error: any) {
              console.warn('⚠️ Failed to sync event update to API (will use localStorage):', error);
              // Continue - localStorage is already updated by Zustand persist
            }
          }
        } catch (error: any) {
          set({ error: 'שגיאה בעדכון האירוע', isLoading: false });
        }
      },

      deleteEvent: async (id: any) => {
        set({ isLoading: true, error: null });
        try {
          const state: any = get();
          // CRITICAL: Find ALL events with this ID (in case of duplicates)
          const eventsToDelete = state.events.filter((event: any) => event.id === id);
          
          if (eventsToDelete.length > 0) {
            console.log(`🗑️ Deleting ${eventsToDelete.length} event(s) with ID ${id}`);
            
            // CRITICAL: Also delete from backend
            const BACKEND_URL = (process.env as any).NEXT_PUBLIC_BACKEND_URL || (process.env as any).VITE_BACKEND_URL || 'http://localhost:3002';
            try {
              // Delete from backend for each event (in case of duplicates)
              for (const eventToDelete of eventsToDelete) {
                const deleteResponse = await fetch(`${BACKEND_URL}/api/events/${id}`, {
                  method: 'DELETE',
                  headers: {
                    'Content-Type': 'application/json',
                  }
                });
                if (deleteResponse.ok) {
                  console.log(`✅ Event ${id} deleted from backend`);
                } else {
                  console.warn(`⚠️ Failed to delete event ${id} from backend:`, deleteResponse.status);
                }
              }
            } catch (error: any) {
              console.warn('⚠️ Error deleting event from backend:', error);
            }
            
            set((state: any) => {
              // Clean up deletedGuests for this event
              const updatedDeletedGuests = { ...state.deletedGuests };
              delete updatedDeletedGuests[id];
              
              return {
                events: state.events.filter((event: any) => event.id !== id), // Remove ALL events with this ID
                deletedEvents: [...state.deletedEvents, ...eventsToDelete.map((e: any) => ({ ...e, deletedAt: new Date() }))],
                deletedGuests: updatedDeletedGuests, // Remove deleted guests tracking for this event
                currentEvent: state.currentEvent?.id === id ? null : state.currentEvent,
                isLoading: false
              };
            });
            
            // CRITICAL: Also remove from localStorage to prevent it from being synced back
            try {
              const stored = localStorage.getItem('rsvp-events-storage');
              if (stored) {
                const parsed = JSON.parse(stored);
                if (parsed.state && parsed.state.events) {
                  // Remove event from localStorage
                  const filteredEvents = parsed.state.events.filter((e: Event) => e.id !== id);
                  parsed.state.events = filteredEvents;
                  
                  // Add to deletedEvents in localStorage
                  if (!parsed.state.deletedEvents) {
                    parsed.state.deletedEvents = [];
                  }
                  parsed.state.deletedEvents = [
                    ...parsed.state.deletedEvents,
                    ...eventsToDelete.map((e: any) => ({ ...e, deletedAt: new Date().toISOString() }))
                  ];
                  
                  localStorage.setItem('rsvp-events-storage', JSON.stringify(parsed));
                  console.log(`✅ Removed event ${id} from localStorage`);
                }
              }
            } catch (error: any) {
              console.warn('⚠️ Error removing event from localStorage:', error);
            }
            
            console.log(`✅ Deleted ${eventsToDelete.length} event(s) with ID ${id}`);
          } else {
            console.warn(`⚠️ No event found with ID ${id} to delete`);
            set({ isLoading: false });
          }
        } catch (error: any) {
          console.error('❌ Error deleting event:', error);
          set({ error: 'שגיאה במחיקת האירוע', isLoading: false });
        }
      },

      setCurrentEvent: (event: any) => {
        console.log('🔍 setCurrentEvent called with:', event?.id);
        set({ currentEvent: event });
      },

      addGuest: async (eventId: any, guestData: any) => {
        console.log('🔍 addGuest called with:', { eventId, guestData });
        set({ isLoading: true, error: null });
        try {
          const newGuest: Guest = {
            ...guestData,
            id: generateId(),
            firstName: cleanName(guestData.firstName),
            lastName: cleanName(guestData.lastName)
          };
          
          console.log('🔍 Generated new guest:', newGuest);
          
          set((state: any) => {
            console.log('🔍 Current state events count:', state.events.length);
            console.log('🔍 Current event ID:', state.currentEvent?.id);
            
            const updatedEvents = state.events.map((event: any) =>
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
          const updatedEvent = get().events.find((e: any) => e.id === eventId);
          if (updatedEvent) {
            syncEventToAPI(updatedEvent).catch(err => {
              console.error('❌ Final sync attempt failed:', err);
            });
          }
          
          console.log('✅ addGuest completed successfully');
        } catch (error: any) {
          console.error('❌ Error in addGuest:', error);
          set({ error: 'שגיאה בהוספת מוזמן', isLoading: false });
        }
      },

      updateGuest: async (eventId: any, guestId: any, updates: any) => {
        // CRITICAL: Guard Clause - validate inputs and state before proceeding
        if (!eventId || !guestId || !updates) {
          console.error('❌ CRITICAL: Invalid parameters in updateGuest:', { eventId, guestId, updates });
          set({ isLoading: false, error: 'שגיאה בעדכון מוזמן - פרמטרים לא תקינים' });
          return;
        }
        
        // CRITICAL: Guard Clause - check state before proceeding
        const currentState = get();
        if (!currentState || !currentState.events || !Array.isArray(currentState.events)) {
          console.error('❌ CRITICAL: State or events is undefined in updateGuest!', { 
            state: !!currentState, 
            events: !!currentState?.events,
            eventsIsArray: Array.isArray(currentState?.events)
          });
          set({ isLoading: false, error: 'שגיאה בעדכון מוזמן - state לא תקין' });
          return;
        }
        
        // CRITICAL: Guard Clause - check if event exists
        const event = currentState.events.find((e: any) => e.id === eventId);
        if (!event) {
          console.error('❌ CRITICAL: Event not found in updateGuest:', eventId);
          set({ isLoading: false, error: 'שגיאה בעדכון מוזמן - אירוע לא נמצא' });
          return;
        }
        
        // CRITICAL: Guard Clause - check if event has guests array
        if (!event.guests || !Array.isArray(event.guests)) {
          console.error('❌ CRITICAL: Event guests is not an array in updateGuest:', { 
            eventId, 
            hasGuests: !!event.guests,
            guestsType: typeof event.guests
          });
          set({ isLoading: false, error: 'שגיאה בעדכון מוזמן - רשימת אורחים לא תקינה' });
          return;
        }
        
        set({ isLoading: true, error: null });
        try {
          // CRITICAL: Database-first architecture - send update to server FIRST, then update UI
          const BACKEND_URL = (process.env as any).NEXT_PUBLIC_BACKEND_URL || (process.env as any).VITE_BACKEND_URL || 'https://whatsapp-backend-enfz.onrender.com';
          
          // Get current guest data for the update payload
          const currentGuest = event.guests.find((g: any) => g.id === guestId);
          if (!currentGuest) {
            throw new Error('אורח לא נמצא');
          }
          
          // Prepare the updated guest data
          const now = new Date();
          const currentResponseDate = currentGuest.responseDate ? new Date(currentGuest.responseDate) : new Date(0);
          const updateResponseDate = updates.responseDate ? new Date(updates.responseDate) : now;
          const finalResponseDate = updateResponseDate.getTime() >= currentResponseDate.getTime() 
            ? updateResponseDate 
            : currentResponseDate;
          
          // Clean names if they're being updated
          const cleanedUpdates = { ...updates };
          if (updates.firstName !== undefined) {
            cleanedUpdates.firstName = cleanName(updates.firstName);
          }
          if (updates.lastName !== undefined) {
            cleanedUpdates.lastName = cleanName(updates.lastName);
          }
          
          const finalGuestCount = updates.guestCount !== undefined 
            ? updates.guestCount 
            : currentGuest.guestCount;
          
          const updatedGuestData = {
            ...currentGuest,
            ...cleanedUpdates,
            guestCount: finalGuestCount,
            responseDate: finalResponseDate,
            source: updates.source || (updates.guestCount !== undefined ? 'manual_update' : currentGuest.source) || 'manual_update'
          };
          
          // CRITICAL: Send PATCH/PUT to server FIRST before updating UI
          console.log('🌐 Sending guest update to server (database-first)...');
          const guestUpdatePayload = {
            phoneNumber: updatedGuestData.phoneNumber,
            guestId: guestId,
            eventId: eventId,
            status: updatedGuestData.rsvpStatus,
            guestCount: updatedGuestData.guestCount,
            notes: updatedGuestData.notes,
            responseDate: updatedGuestData.responseDate instanceof Date ? updatedGuestData.responseDate.toISOString() : updatedGuestData.responseDate,
            source: updatedGuestData.source,
            firstName: updatedGuestData.firstName,
            lastName: updatedGuestData.lastName,
            actualAttendance: updatedGuestData.actualAttendance,
            tableId: updatedGuestData.tableId
          };
          
          // Send update to server via PATCH endpoint
          const response = await fetch(`${BACKEND_URL}/api/guests/add-pending-update`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(guestUpdatePayload)
          });
          
          if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Server update failed: ${response.status} - ${errorText}`);
          }
          
          const result = await response.json();
          console.log('✅ Server update successful, now updating UI...');
          
          // CRITICAL: Only update UI after server confirms success
          let updatedEvent: Event | null = null;
          
          set((state: any) => {
            // CRITICAL: Ensure state and events exist (double check inside set)
            if (!state || !state.events || !Array.isArray(state.events) || !state.events.length) {
              console.error('❌ CRITICAL: State or events is undefined in updateGuest set!', { state: !!state, events: !!state?.events });
              set({ isLoading: false, error: 'שגיאה בעדכון מוזמן - state לא תקין' });
              return state || {};
            }
            
            const eventInState = state.events.find((e: any) => e.id === eventId);
            if (!eventInState) {
              console.error('❌ CRITICAL: Event not found in updateGuest set:', eventId);
              set({ isLoading: false });
              return state;
            }
            
            // CRITICAL: Ensure event has guests array
            if (!eventInState.guests || !Array.isArray(eventInState.guests)) {
              console.error('❌ CRITICAL: Event guests is not an array in updateGuest set:', { 
                eventId, 
                hasGuests: !!eventInState.guests,
                guestsType: typeof eventInState.guests
              });
              set({ isLoading: false, error: 'שגיאה בעדכון מוזמן - רשימת אורחים לא תקינה' });
              return state;
            }
            
            // Find current guest to get old tableId if tableId is being updated
            const currentGuestInState = eventInState.guests.find((g: any) => g.id === guestId);
            const oldTableId = currentGuestInState?.tableId;
            const newTableId = updates.tableId;
            
            // Update guest using the data we already prepared (from server response)
            const updatedGuests = eventInState.guests.map((guest: any) => {
              if (guest.id === guestId) {
                return updatedGuestData; // Use the data we prepared before server call
              }
              return guest;
            });
            
            // If tableId changed, update tables array
            let updatedTables = eventInState.tables || [];
            if (updates.tableId !== undefined && newTableId !== oldTableId) {
              updatedTables = eventInState.tables?.map((table: any) => {
                // Remove guest from old table
                const tableGuestsWithoutGuest = table.guests.filter((id: any) => id !== guestId);
                
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
              ...eventInState,
              guests: updatedGuests,
              tables: updatedTables,
              updatedAt: new Date()
            };
            
            // Find the updated event for return
            updatedEvent = updatedEventObj;
            
            const updatedCurrentEvent = state.currentEvent?.id === eventId 
              ? {
                  ...state.currentEvent,
                  guests: updatedGuests,
                  tables: updatedTables,
                  updatedAt: new Date() // CRITICAL: Update timestamp to trigger React re-render
                }
              : state.currentEvent;
            
            return {
              events: state.events.map((e: any) => e.id === eventId ? updatedEventObj : e),
              currentEvent: updatedCurrentEvent,
              isLoading: false
            };
          });
          
          // CRITICAL: Also update directly via /api/events/:eventId/guests for persistence
          // This ensures the update is saved in the database
          if (updatedEvent && (updates.guestCount !== undefined || updates.source === 'manual_update')) {
            try {
              console.log('🔄 Also updating event directly in server via /api/events/:eventId/guests for persistence...');
              const guestForServer = {
                id: updatedGuestData.id,
                firstName: updatedGuestData.firstName,
                lastName: updatedGuestData.lastName,
                phoneNumber: updatedGuestData.phoneNumber,
                rsvpStatus: updatedGuestData.rsvpStatus,
                guestCount: updatedGuestData.guestCount,
                notes: updatedGuestData.notes || '',
                actualAttendance: updatedGuestData.actualAttendance,
                responseDate: updatedGuestData.responseDate instanceof Date ? updatedGuestData.responseDate.toISOString() : updatedGuestData.responseDate,
                source: updatedGuestData.source || 'manual_update',
                channel: updatedGuestData.channel || 'whatsapp',
                messageStatus: updatedGuestData.messageStatus,
                ...(updatedGuestData.messageSentDate && { messageSentDate: updatedGuestData.messageSentDate instanceof Date ? updatedGuestData.messageSentDate.toISOString() : updatedGuestData.messageSentDate }),
                ...(updatedGuestData.messageDeliveredDate && { messageDeliveredDate: updatedGuestData.messageDeliveredDate instanceof Date ? updatedGuestData.messageDeliveredDate.toISOString() : updatedGuestData.messageDeliveredDate }),
                ...(updatedGuestData.messageFailedDate && { messageFailedDate: updatedGuestData.messageFailedDate instanceof Date ? updatedGuestData.messageFailedDate.toISOString() : updatedGuestData.messageFailedDate }),
                ...(updatedGuestData.tableId && { tableId: updatedGuestData.tableId })
              };
              
              const directResponse = await fetch(`${BACKEND_URL}/api/events/${eventId}/guests`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  guests: [guestForServer],
                  append: true // Merge with existing guests (update by ID)
                })
              });
              
              if (directResponse.ok) {
                const directResult = await directResponse.json();
                console.log('✅ Event updated directly in server:', {
                  success: true,
                  message: directResult.message || 'Updated event with guests',
                  guestsCount: directResult.guestsCount
                });
              } else {
                const errorText = await directResponse.text();
                console.warn('⚠️ Direct update to /api/events/:eventId/guests failed:', directResponse.status, errorText);
              }
            } catch (directError: any) {
              console.warn('⚠️ Failed to update event directly in server:', directError);
            }
          }
          
          // CRITICAL: Invalidate cache when guest is manually updated
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
            } catch (e: any) {
              // Ignore parsing errors
            }
          }
          
          console.log('✅ Guest update completed successfully (database-first)');
        } catch (error: any) {
          console.error('❌ Error in updateGuest:', error);
          set({ error: 'שגיאה בעדכון מוזמן', isLoading: false });
          throw error; // Re-throw to allow caller to handle
        }
      },
                
                // CRITICAL: Validate payload before sending
                if (!guestUpdatePayload.phoneNumber || !guestUpdatePayload.guestId || !guestUpdatePayload.eventId) {
                  console.error('❌ Invalid guestUpdatePayload - missing required fields:', {
                    hasPhoneNumber: !!guestUpdatePayload.phoneNumber,
                    hasGuestId: !!guestUpdatePayload.guestId,
                    hasEventId: !!guestUpdatePayload.eventId,
                    phoneNumber: guestUpdatePayload.phoneNumber,
                    guestId: guestUpdatePayload.guestId,
                    eventId: guestUpdatePayload.eventId
                  });
                }
                
                console.log('📤 Sending guest update only (not full event):', {
                  eventId: updatedEvent.id,
                  guestId: guestId,
                  updates: Object.keys(updates),
                  rsvpStatus: guestUpdatePayload.status,
                  guestCount: guestUpdatePayload.guestCount,
                  phoneNumber: guestUpdatePayload.phoneNumber,
                  hasStatus: guestUpdatePayload.status !== undefined,
                  hasGuestCount: guestUpdatePayload.guestCount !== undefined,
                  hasNotes: guestUpdatePayload.notes !== undefined
                });
                
                const response = await fetch(`${BACKEND_URL}/api/guests/add-pending-update`, {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify(guestUpdatePayload)
                });
                
                if (response.ok) {
                  const result = await response.json();
                  console.log('✅ Guest update synced to API successfully:', {
                    eventId: updatedEvent.id,
                    guestId: guestId,
                    syncedFields: Object.keys(updates)
                  });
                  
                  // CRITICAL: Also update directly via /api/events/:eventId/guests to ensure persistence
                  // This is especially important for manual_update to ensure it's saved in files
                  if (updates.guestCount !== undefined || updates.source === 'manual_update') {
                    try {
                      console.log('🔄 Also updating event directly in server via /api/events/:eventId/guests for persistence...');
                      const guestForServer = {
                        id: updatedGuest.id,
                        firstName: updatedGuest.firstName,
                        lastName: updatedGuest.lastName,
                        phoneNumber: updatedGuest.phoneNumber,
                        rsvpStatus: updatedGuest.rsvpStatus,
                        guestCount: updatedGuest.guestCount,
                        notes: updatedGuest.notes || '',
                        actualAttendance: updatedGuest.actualAttendance,
                        responseDate: updatedGuest.responseDate ? (updatedGuest.responseDate instanceof Date ? updatedGuest.responseDate.toISOString() : updatedGuest.responseDate) : new Date().toISOString(),
                        source: updatedGuest.source || 'manual_update',
                        channel: updatedGuest.channel || 'whatsapp',
                        messageStatus: updatedGuest.messageStatus,
                        ...(updatedGuest.messageSentDate && { messageSentDate: updatedGuest.messageSentDate instanceof Date ? updatedGuest.messageSentDate.toISOString() : updatedGuest.messageSentDate }),
                        ...(updatedGuest.messageDeliveredDate && { messageDeliveredDate: updatedGuest.messageDeliveredDate instanceof Date ? updatedGuest.messageDeliveredDate.toISOString() : updatedGuest.messageDeliveredDate }),
                        ...(updatedGuest.messageFailedDate && { messageFailedDate: updatedGuest.messageFailedDate instanceof Date ? updatedGuest.messageFailedDate.toISOString() : updatedGuest.messageFailedDate }),
                        ...(updatedGuest.tableId && { tableId: updatedGuest.tableId })
                      };
                      
                      const directResponse = await fetch(`${BACKEND_URL}/api/events/${updatedEvent.id}/guests`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          guests: [guestForServer],
                          append: true // Merge with existing guests (update by ID)
                        })
                      });
                      
                      if (directResponse.ok) {
                        const directResult = await directResponse.json();
                        console.log('✅ Event updated directly in server:', {
                          success: true,
                          message: directResult.message || 'Updated event with guests',
                          guestsCount: directResult.guestsCount
                        });
                      } else {
                        const errorText = await directResponse.text();
                        console.warn('⚠️ Direct update to /api/events/:eventId/guests failed:', directResponse.status, errorText);
                      }
                    } catch (directError: any) {
                      console.warn('⚠️ Failed to update event directly in server:', directError);
                    }
                  }
                } else {
                  const errorText = await response.text();
                  console.error('❌ Failed to sync guest update to API:', {
                    status: response.status,
                    statusText: response.statusText,
                    error: errorText,
                    payload: guestUpdatePayload
                  });
                }
              } catch (error: any) {
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
              } catch (e: any) {
                // Ignore parsing errors
              }
            }
          }
        } catch (error: any) {
          console.error('❌ Error in updateGuest:', error);
          set({ error: 'שגיאה בעדכון מוזמן', isLoading: false });
        }
      },

      updateGuestResponse: async (eventId: any, guestId: any, updatedGuest: any) => {
        console.log('🚀 updateGuestResponse CALLED:', {
          eventId,
          guestId,
          updatedGuest: {
            rsvpStatus: updatedGuest.rsvpStatus,
            guestCount: updatedGuest.guestCount,
            responseDate: updatedGuest.responseDate,
            source: updatedGuest.source || 'unknown'
          }
        });
        set({ isLoading: true, error: null });
        try {
          const currentState = get();
          console.log(`🔄 updateGuestResponse called:`, {
            eventId,
            guestId,
            oldStatus: currentState.events.find((e: any) => e.id === eventId)?.guests?.find((g: any) => g.id === guestId)?.rsvpStatus,
            newStatus: updatedGuest.rsvpStatus
          });
          
          // CRITICAL: No manual change protection - rely on timestamp-based conflict resolution
          // All updates are processed based on timestamps and source
          
          // CRITICAL: Ensure responseDate is always current for guest_link updates
          // This ensures the update is always considered "newer" than previous updates
          if (updatedGuest.source === 'guest_link' && updatedGuest.responseDate) {
            const currentDate = new Date();
            const updateDate = new Date(updatedGuest.responseDate);
            // If update date is older than current time, use current time
            if (updateDate.getTime() < currentDate.getTime()) {
              updatedGuest.responseDate = currentDate;
              console.log(`🔄 Updated responseDate to current time for guest_link update`);
            }
          }
          
          // CRITICAL: Check if event exists in store BEFORE calling set()
          const existingEvent = currentState.events.find((e: any) => e.id === eventId);
          
          // If event not found in store, load it from API, update guest, and send to backend
          // The backend is the source of truth - all updates must go through it
          if (!existingEvent) {
            console.warn(`⚠️ Event ${eventId} not found in store - loading from API and updating via backend`);
            
            const BACKEND_URL = (process.env as any).NEXT_PUBLIC_BACKEND_URL || (process.env as any).VITE_BACKEND_URL || 'http://localhost:3002';
            
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
            // CRITICAL: Preserve manual guestCount changes - if current value is from manual_update, preserve it
            const updatedFullEvent = {
              ...fullEvent,
              guests: fullEvent.guests.map((g: any) => 
                g.id === guestId ? {
                  ...g,
                  ...updatedGuest,
                  // Ensure all fields are updated
                  rsvpStatus: updatedGuest.rsvpStatus !== undefined ? updatedGuest.rsvpStatus : g.rsvpStatus,
                  // CRITICAL: Preserve manual guestCount - if current is from manual_update and update would change it, preserve current
                  // CRITICAL: EXCEPTION - guest_link updates ALWAYS take priority (direct user input from guest response page)
                  guestCount: (() => {
                    const currentSource = g.source || '';
                    const isCurrentFromManual = currentSource === 'manual_update';
                    const updateSource = updatedGuest.source || '';
                    const isUpdateFromManual = updateSource === 'manual_update';
                    const isUpdateFromGuestLink = updateSource === 'guest_link';
                    
                    // CRITICAL: guest_link updates ALWAYS take priority - they are direct user input from the guest response page
                    if (isUpdateFromGuestLink && updatedGuest.guestCount !== undefined) {
                      // Guest link update - always use the new value (direct user input)
                      console.log(`✅ Applying guest_link guestCount update (API path): ${updatedGuest.guestCount} (overriding current: ${g.guestCount})`);
                      return updatedGuest.guestCount;
                    }
                    
                    // If current is manual and update would change it, preserve current unless update is also manual and newer
                    if (isCurrentFromManual && updatedGuest.guestCount !== undefined && updatedGuest.guestCount !== g.guestCount) {
                      const currentDate = g.responseDate ? new Date(g.responseDate).getTime() : 0;
                      const updateDate = updatedGuest.responseDate ? new Date(updatedGuest.responseDate).getTime() : Date.now();
                      
                      if (!isUpdateFromManual || currentDate >= updateDate) {
                        console.log(`🛡️ Preserving manual guestCount ${g.guestCount} (update ${updatedGuest.guestCount} would revert it)`);
                        return g.guestCount; // Preserve manual value
                      }
                    }
                    
                    // Otherwise use update's value if provided, or keep existing
                    return updatedGuest.guestCount !== undefined ? updatedGuest.guestCount : g.guestCount;
                  })(),
                  notes: updatedGuest.notes !== undefined ? updatedGuest.notes : g.notes,
                  responseDate: updatedGuest.responseDate || g.responseDate || new Date(),
                  actualAttendance: updatedGuest.actualAttendance !== undefined ? updatedGuest.actualAttendance : g.actualAttendance,
                  // CRITICAL: Preserve source to track manual updates
                  source: updatedGuest.source || g.source
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
            set((state: any) => ({
              ...state,
              events: [...state.events, updatedFullEvent],
              isLoading: false
            }));
            
            return; // Exit early - update is complete
          }
          
          // Event exists in store - proceed with normal update flow
          let updatedEvent: Event | null = null;
          
          set((state: any) => {
            const event = state.events.find((e: any) => e.id === eventId);
            const guest = event?.guests?.find((g: any) => g.id === guestId);
            
            const isProblematicGuest = (guest?.firstName?.includes('דורון') && guest?.lastName?.includes('שושני')) ||
                                      (guest?.firstName?.includes('מאור') && guest?.lastName?.includes('רומנו'));
            
            console.log(`📋 Before update - Event found: ${!!event}, Guest found: ${!!guest}`);
            console.log(`📋 Events in store: ${state.events.length}`);
            console.log(`📋 Guest status:`, guest?.rsvpStatus);
            console.log(`📋 Guest count before update:`, guest?.guestCount);
            console.log(`📋 Updated guest count:`, updatedGuest.guestCount);
            console.log(`📋 Updated guest source:`, updatedGuest.source);
            console.log(`📋 Is problematic guest:`, isProblematicGuest);
            
            if (isProblematicGuest) {
              console.log(`🔍 PROBLEMATIC GUEST UPDATE IN STORE: ${guest?.firstName} ${guest?.lastName}`, {
                id: guestId,
                eventId,
                currentStatus: guest?.rsvpStatus,
                newStatus: updatedGuest.rsvpStatus,
                currentCount: guest?.guestCount,
                newCount: updatedGuest.guestCount,
                source: updatedGuest.source
              });
            }
            
            // CRITICAL: Create new array reference to force React re-render
            // Always create a completely new events array to ensure React detects the change
            const updatedEvents = state.events.map((event: any) => {
              if (event.id === eventId) {
                updatedEvent = {
                  ...event,
                  guests: event.guests.map((guest: any) => {
                    if (guest.id === guestId) {
                      // CRITICAL: Use timestamp-based conflict resolution - latest update wins
                      const newResponseDate = updatedGuest.responseDate ? new Date(updatedGuest.responseDate) : new Date();
                      const oldResponseDate = guest.responseDate ? new Date(guest.responseDate) : new Date(0);
                      
                      // If new update is newer (or same), use it. Otherwise keep old values for that field
                      const isNewerUpdate = newResponseDate.getTime() >= oldResponseDate.getTime();
                      
                      // CRITICAL: For manual_update and guest_link updates, ALWAYS apply them regardless of timestamp
                      // This ensures manual updates from status update page and guest responses are properly synced
                      // even if they come back from backend with same or older timestamp
                      const isManualUpdateEcho = updatedGuest.source === 'manual_update';
                      const isGuestLinkUpdate = updatedGuest.source === 'guest_link';
                      const isWhatsAppUpdate = updatedGuest.source === 'whatsapp';
                      
                      // CRITICAL: Check if current guest has manual_update source - if so, be more careful about overwriting
                      const currentGuestSource = guest.source || '';
                      const isCurrentFromManual = currentGuestSource === 'manual_update';
                      
                      // CRITICAL: If current value is from manual_update and new update would change guestCount to a different value,
                      // only apply if new update is also from manual_update and is newer, OR if it's significantly newer (5+ seconds)
                      let shouldApplyUpdate = isNewerUpdate || isManualUpdateEcho || isGuestLinkUpdate || isWhatsAppUpdate;
                      
                      // Special handling for guestCount: if current is manual and new would change it, be more strict
                      // CRITICAL: EXCEPTION - guest_link updates ALWAYS take priority (direct user input from guest response page)
                      if (isCurrentFromManual && updatedGuest.guestCount !== undefined && updatedGuest.guestCount !== guest.guestCount && !isGuestLinkUpdate) {
                        const isNewUpdateFromManual = isManualUpdateEcho;
                        const timeDiff = newResponseDate.getTime() - oldResponseDate.getTime();
                        const isSignificantlyNewer = timeDiff > 5000; // 5 seconds
                        
                        // Only allow overwrite if: new is also manual and newer, OR new is significantly newer (5+ seconds)
                        // CRITICAL: guest_link updates are handled separately and always applied
                        if (!isNewUpdateFromManual && !isSignificantlyNewer) {
                          console.log(`🛡️ Blocking update: current manual guestCount ${guest.guestCount} would be reverted to ${updatedGuest.guestCount} by non-manual or too-recent update`);
                          shouldApplyUpdate = false; // Don't apply this update - it would revert manual change
                        }
                      }
                      
                      if (shouldApplyUpdate && !isNewerUpdate) {
                        console.log(`🔄 Applying ${updatedGuest.source} update even though timestamp is older - user-initiated update must be applied`);
                      }
                      
                      if (shouldApplyUpdate) {
                        // Completely replace with new update - don't merge old values
                        // Clean names if they're being updated
                        const cleanedFirstName = updatedGuest.firstName !== undefined ? cleanName(updatedGuest.firstName) : guest.firstName;
                        const cleanedLastName = updatedGuest.lastName !== undefined ? cleanName(updatedGuest.lastName) : guest.lastName;
                        
                        // CRITICAL: For manual_update, always preserve the current guestCount if it's different from the update
                        // This prevents old updates from backend from reverting manual changes
                        // For other sources, use the update's guestCount if provided, otherwise keep existing
                        let finalGuestCount: number | undefined;
                        
                        if (isManualUpdateEcho) {
                          // For manual_update: if update has guestCount, use it (it's the new manual value)
                          // If update doesn't have guestCount, preserve existing value
                          if (updatedGuest.guestCount !== undefined) {
                            finalGuestCount = updatedGuest.guestCount; // Use the new manual value
                          } else {
                            finalGuestCount = guest.guestCount; // Preserve existing if not in update
                          }
                        } else {
                          // For non-manual updates: check if current value is from manual_update and is newer
                          // If so, preserve it to prevent old backend updates from reverting manual changes
                          // CRITICAL: EXCEPTION - guest_link updates ALWAYS take priority (direct user input from guest response page)
                          const currentGuestSource = guest.source || '';
                          const isCurrentFromManual = currentGuestSource === 'manual_update';
                          const isUpdateFromGuestLink = updatedGuest.source === 'guest_link';
                          const currentResponseDate = guest.responseDate ? new Date(guest.responseDate).getTime() : 0;
                          const updateResponseDate = newResponseDate.getTime();
                          
                          // CRITICAL: guest_link updates ALWAYS take priority - they are direct user input from the guest response page
                          if (isUpdateFromGuestLink && updatedGuest.guestCount !== undefined) {
                            // Guest link update - always use the new value (direct user input)
                            console.log(`✅ Applying guest_link guestCount update: ${updatedGuest.guestCount} (overriding current: ${guest.guestCount})`);
                            finalGuestCount = updatedGuest.guestCount;
                          } else if (isCurrentFromManual && updatedGuest.guestCount !== undefined && updatedGuest.guestCount !== guest.guestCount) {
                            // Current manual value exists and is different from backend update - preserve it
                            // Check if manual value is newer (or if backend update doesn't have manual_update source)
                            const isBackendFromManual = (updatedGuest.source || '') === 'manual_update';
                            
                            if (!isBackendFromManual || currentResponseDate >= updateResponseDate) {
                              // Manual value should be preserved - backend update is either not from manual or older
                              console.log(`🛡️ Preserving manual guestCount ${guest.guestCount} (backend update ${updatedGuest.guestCount} would revert it)`);
                              finalGuestCount = guest.guestCount;
                            } else {
                              // Backend update is also from manual and is newer - use it
                              finalGuestCount = updatedGuest.guestCount;
                            }
                          } else {
                            // Use update's value if provided, otherwise keep existing
                            finalGuestCount = updatedGuest.guestCount !== undefined 
                              ? updatedGuest.guestCount 
                              : guest.guestCount;
                          }
                        }
                        
                        // CRITICAL: Create updatedGuest without guestCount if we need to preserve it, then add it back
                        // This prevents ...updatedGuest from overriding our finalGuestCount
                        const updatedGuestWithoutCount = { ...updatedGuest };
                        // Remove guestCount from spread if we're preserving a different value
                        if (updatedGuest.guestCount !== undefined && updatedGuest.guestCount !== finalGuestCount) {
                          delete updatedGuestWithoutCount.guestCount;
                        }
                        
                        const mergedGuest = { 
                          ...guest, // Keep base guest properties (id, firstName, lastName, etc.)
                          ...updatedGuestWithoutCount, // Override with new values BUT preserve guestCount if needed
                          firstName: cleanedFirstName,
                          lastName: cleanedLastName,
                          // Always use new values if provided (latest update completely replaces old one)
                          rsvpStatus: updatedGuest.rsvpStatus !== undefined ? updatedGuest.rsvpStatus : guest.rsvpStatus,
                          // CRITICAL: If guestCount is explicitly provided (even if 0 or null), use it. Otherwise keep existing value
                          // Don't default to 1 - this prevents reverting from 2 back to 1 when old update arrives
                          // For manual_update without guestCount, preserve existing value to prevent old updates from reverting changes
                          guestCount: finalGuestCount,
                          notes: updatedGuest.notes !== undefined ? updatedGuest.notes : (guest.notes || ''),
                          actualAttendance: updatedGuest.actualAttendance !== undefined ? updatedGuest.actualAttendance : guest.actualAttendance,
                          // CRITICAL: Always use new responseDate to ensure backend detects it as a new update
                          // This ensures the backend adds it to pending-updates even if status didn't change
                          responseDate: newResponseDate,
                          // CRITICAL: Preserve source from update to ensure proper tracking
                          source: updatedGuest.source || guest.source
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
                            responseDate: newResponseDate.toISOString(),
                            source: updatedGuest.source
                          },
                          isNewer: isNewerUpdate,
                          isManualUpdateEcho: isManualUpdateEcho,
                          shouldApplyUpdate: shouldApplyUpdate,
                          merged: { 
                            rsvpStatus: mergedGuest.rsvpStatus, 
                            guestCount: mergedGuest.guestCount,
                            responseDate: mergedGuest.responseDate.toISOString(),
                            source: mergedGuest.source
                          }
                        });
                        
                        // CRITICAL: Always return a new object reference for the guest
                        return { ...mergedGuest };
                      } else {
                        // Old update is newer - but CRITICAL: For manual_update, guest_link, and whatsapp, always apply the update
                        const isManualUpdateEcho = updatedGuest.source === 'manual_update';
                        const isGuestLinkUpdate = updatedGuest.source === 'guest_link';
                        const isWhatsAppUpdate = updatedGuest.source === 'whatsapp';
                        
                        if (isManualUpdateEcho || isGuestLinkUpdate || isWhatsAppUpdate) {
                          // CRITICAL: Even if old update is newer, apply user-initiated updates
                          console.log(`🔄 Applying ${updatedGuest.source} update even though old update is newer - user-initiated update must be applied`);
                          
                          // CRITICAL: If guestCount is explicitly provided in the update, ALWAYS use it
                          // This ensures new manual changes are preserved when they come back from backend
                          // Only if guestCount is undefined should we preserve the existing value
                          const finalGuestCount = updatedGuest.guestCount !== undefined 
                            ? updatedGuest.guestCount // Use new value if explicitly provided
                            : guest.guestCount; // Only preserve existing if update doesn't include guestCount
                          
                          // CRITICAL: Create updatedGuest without guestCount if we need to preserve it, then add it back
                          // This prevents ...updatedGuest from overriding our finalGuestCount
                          const updatedGuestWithoutCount = { ...updatedGuest };
                          if (updatedGuest.guestCount !== undefined && updatedGuest.guestCount !== finalGuestCount) {
                            delete updatedGuestWithoutCount.guestCount;
                          }
                          
                          const mergedGuest = { 
                            ...guest,
                            ...updatedGuestWithoutCount, // Override with new values BUT preserve guestCount if needed
                            // Use new values from user-initiated update
                            rsvpStatus: updatedGuest.rsvpStatus !== undefined ? updatedGuest.rsvpStatus : guest.rsvpStatus,
                            guestCount: finalGuestCount,
                            notes: updatedGuest.notes !== undefined ? updatedGuest.notes : guest.notes,
                            actualAttendance: updatedGuest.actualAttendance !== undefined ? updatedGuest.actualAttendance : guest.actualAttendance,
                            responseDate: newResponseDate, // Use new responseDate
                            source: updatedGuest.source || guest.source
                          };
                          return { ...mergedGuest };
                        }
                        
                        // Old update is newer and not from user-initiated source - keep old values
                        console.log(`⏭️ Keeping old guest values (old update is newer and not user-initiated):`, {
                          old: { 
                            rsvpStatus: guest.rsvpStatus, 
                            guestCount: guest.guestCount,
                            responseDate: oldResponseDate.toISOString()
                          },
                          new: { 
                            rsvpStatus: updatedGuest.rsvpStatus, 
                            guestCount: updatedGuest.guestCount,
                            responseDate: newResponseDate.toISOString(),
                            source: updatedGuest.source
                          }
                        });
                        
                        // CRITICAL: If update is from guest_link, ALWAYS apply it (direct user input from guest response page)
                        // This ensures guest responses are never blocked, even if old update is newer
                        if (isGuestLinkUpdate) {
                          console.log(`✅ Applying guest_link update even though old update is newer - direct user input must be applied`);
                          const mergedGuest = { 
                            ...guest,
                            ...updatedGuest,
                            // Use new values from guest_link update (direct user input)
                            rsvpStatus: updatedGuest.rsvpStatus !== undefined ? updatedGuest.rsvpStatus : guest.rsvpStatus,
                            guestCount: updatedGuest.guestCount !== undefined ? updatedGuest.guestCount : guest.guestCount,
                            notes: updatedGuest.notes !== undefined ? updatedGuest.notes : guest.notes,
                            actualAttendance: updatedGuest.actualAttendance !== undefined ? updatedGuest.actualAttendance : guest.actualAttendance,
                            responseDate: newResponseDate, // Use new responseDate
                            source: updatedGuest.source || guest.source
                          };
                          return { ...mergedGuest };
                        }
                        
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
                      
                        // CRITICAL: Always return a new object reference for the guest
                        return { ...mergedGuest };
                      }
                      
                      // CRITICAL: If update is from guest_link, ALWAYS apply it (direct user input from guest response page)
                      // This ensures guest responses are never blocked
                      if (isGuestLinkUpdate) {
                        console.log(`✅ Applying guest_link update even though old update is newer - direct user input must be applied`);
                        const mergedGuest = { 
                          ...guest,
                          ...updatedGuest,
                          // Use new values from guest_link update (direct user input)
                          rsvpStatus: updatedGuest.rsvpStatus !== undefined ? updatedGuest.rsvpStatus : guest.rsvpStatus,
                          guestCount: updatedGuest.guestCount !== undefined ? updatedGuest.guestCount : guest.guestCount,
                          notes: updatedGuest.notes !== undefined ? updatedGuest.notes : guest.notes,
                          actualAttendance: updatedGuest.actualAttendance !== undefined ? updatedGuest.actualAttendance : guest.actualAttendance,
                          responseDate: newResponseDate, // Use new responseDate
                          source: updatedGuest.source || guest.source
                        };
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
                  // CRITICAL: Always update updatedAt with current timestamp to ensure eventsHash changes
                  // This ensures EventManagement detects the change and updates the table
                  updatedAt: new Date()
                };
                // CRITICAL: Create new object reference with new guests array to force React re-render
                // CRITICAL: Remove _updateTimestamp before returning to avoid storing internal properties
                const cleanedEvent = {
                  ...updatedEvent,
                  guests: updatedEvent.guests.map((g: any) => {
                    const cleanedGuest = { ...g };
                    delete (cleanedGuest as any)._updateTimestamp;
                    return cleanedGuest;
                  })
                };
                delete (cleanedEvent as any)._updateTimestamp;
                return cleanedEvent;
              }
              // CRITICAL: Return new object reference even for unchanged events
              // This ensures React detects changes when ANY event is updated
              // CRITICAL: Remove _updateTimestamp before returning to avoid storing internal properties
              const cleanedEvent = {
                ...event,
                guests: event.guests ? event.guests.map((g: any) => {
                  const cleanedGuest = { ...g };
                  delete (cleanedGuest as any)._updateTimestamp;
                  return cleanedGuest;
                }) : []
              };
              delete (cleanedEvent as any)._updateTimestamp;
              return cleanedEvent;
            });
            
            // CRITICAL: Update currentEvent ONLY if it matches eventId
            // This ensures that updates from guest response links are reflected only for the event being viewed
            // If the user is viewing a different event, we don't update currentEvent (EventManagement useEffect will handle it)
            let updatedCurrentEvent = state.currentEvent;
            
            if (state.currentEvent?.id === eventId) {
              // Update existing currentEvent - user is viewing this event, so update it
              // CRITICAL: For manual_update, guest_link, and whatsapp updates, ALWAYS update currentEvent to ensure table refresh
              const isManualUpdateEcho = updatedGuest.source === 'manual_update' || updatedGuest.source === 'guest_link' || updatedGuest.source === 'whatsapp';
              updatedCurrentEvent = {
                ...state.currentEvent,
                guests: state.currentEvent.guests.map((guest: any) => {
                  if (guest.id === guestId) {
                    // Use timestamp-based conflict resolution - latest update wins
                    // CRITICAL: For manual_update, guest_link, and whatsapp, always use new values to ensure update is applied
                    const newResponseDate = updatedGuest.responseDate ? new Date(updatedGuest.responseDate) : new Date();
                    const oldResponseDate = guest.responseDate ? new Date(guest.responseDate) : new Date(0);
                    const isNewerUpdate = newResponseDate.getTime() >= oldResponseDate.getTime() || isManualUpdateEcho;
                    
                    // CRITICAL: Preserve manual guestCount changes - if current value is from manual_update, preserve it
                    // This prevents old backend updates from reverting manual changes
                    // CRITICAL: EXCEPTION - guest_link updates ALWAYS take priority (direct user input from guest response page)
                    let finalGuestCount: number | undefined;
                    
                    const currentGuestSource = guest.source || '';
                    const isCurrentFromManual = currentGuestSource === 'manual_update';
                    const updateSource = updatedGuest.source || '';
                    const isUpdateFromManual = updateSource === 'manual_update';
                    const isUpdateFromGuestLink = updateSource === 'guest_link';
                    
                    // CRITICAL: guest_link updates ALWAYS take priority - they are direct user input from the guest response page
                    if (isUpdateFromGuestLink && updatedGuest.guestCount !== undefined) {
                      // Guest link update - always use the new value (direct user input)
                      console.log(`✅ Applying guest_link guestCount update in currentEvent: ${updatedGuest.guestCount} (overriding current: ${guest.guestCount})`);
                      finalGuestCount = updatedGuest.guestCount;
                    } else if (isCurrentFromManual && updatedGuest.guestCount !== undefined && updatedGuest.guestCount !== guest.guestCount) {
                      // Current is manual and update would change it - preserve current unless update is also manual and newer
                      if (!isUpdateFromManual || oldResponseDate.getTime() >= newResponseDate.getTime()) {
                        console.log(`🛡️ Preserving manual guestCount ${guest.guestCount} in currentEvent (update ${updatedGuest.guestCount} would revert it)`);
                        finalGuestCount = guest.guestCount; // Preserve manual value
                      } else {
                        // Update is also manual and newer - use it
                        finalGuestCount = updatedGuest.guestCount;
                      }
                    } else {
                      // Use update's value if provided, otherwise keep existing
                      finalGuestCount = updatedGuest.guestCount !== undefined 
                        ? updatedGuest.guestCount 
                        : guest.guestCount;
                    }
                    
                    // CRITICAL: Create updatedGuest without guestCount if we need to preserve it
                    const updatedGuestWithoutCount = { ...updatedGuest };
                    if (updatedGuest.guestCount !== undefined && updatedGuest.guestCount !== finalGuestCount) {
                      delete updatedGuestWithoutCount.guestCount;
                    }
                    
                    // CRITICAL: For guest_link updates, ALWAYS use the new rsvpStatus (direct user input)
                    const finalRsvpStatus = isUpdateFromGuestLink && updatedGuest.rsvpStatus !== undefined
                      ? updatedGuest.rsvpStatus
                      : (updatedGuest.rsvpStatus !== undefined ? updatedGuest.rsvpStatus : guest.rsvpStatus);
                    
                    const updatedGuestData = {
                      ...guest,
                      ...updatedGuestWithoutCount, // Override with new values BUT preserve guestCount if needed
                      // CRITICAL: For guest_link updates, ALWAYS use the new rsvpStatus (direct user input)
                      rsvpStatus: finalRsvpStatus,
                      // CRITICAL: Use finalGuestCount which preserves manual values
                      guestCount: finalGuestCount,
                      notes: updatedGuest.notes !== undefined ? updatedGuest.notes : (guest.notes || ''),
                      responseDate: isNewerUpdate ? newResponseDate : oldResponseDate,
                      // CRITICAL: Preserve source to ensure proper tracking
                      source: updatedGuest.source || guest.source
                    };
                    
                    console.log(`🔄 Updating guest in currentEvent:`, {
                      guestId,
                      oldStatus: guest.rsvpStatus,
                      newStatus: updatedGuestData.rsvpStatus,
                      isNewerUpdate,
                      isManualUpdateEcho,
                      isUpdateFromGuestLink,
                      source: updatedGuest.source,
                      willApplyStatus: finalRsvpStatus !== guest.rsvpStatus
                    });
                    
                    return updatedGuestData;
                  }
                  return guest;
                })
              };
              // CRITICAL: Always create a new object reference with new guests array to force React re-render
              // CRITICAL: Always update updatedAt to ensure eventsHash changes
              const newUpdatedAt = new Date();
              updatedCurrentEvent = {
                ...updatedCurrentEvent,
                guests: updatedCurrentEvent.guests.map((g: any) => ({ ...g })), // New array AND new object references
                updatedAt: newUpdatedAt // Force timestamp update
              };
              console.log('🔄 Updated existing currentEvent for event:', eventId, 'guests:', updatedCurrentEvent.guests.length, 'updatedAt:', newUpdatedAt.toISOString());
            } else {
              // User is viewing a different event - don't update currentEvent
              // EventManagement useEffect will update currentEvent when events array changes
              console.log('ℹ️ Update for event', eventId, 'but user is viewing event', state.currentEvent?.id || 'none', '- EventManagement will handle update');
            }
            
            // Verify the update
            const verifyEvent = updatedEvents.find((e: any) => e.id === eventId);
            const verifyGuest = verifyEvent?.guests?.find((g: any) => g.id === guestId);
            const verifyCurrentEventGuest = updatedCurrentEvent?.guests?.find((g: any) => g.id === guestId);
            console.log(`✅ STORE: After updateGuestResponse - Guest ID: ${guestId}`);
            console.log(`✅ STORE: After updateGuestResponse - Guest name: ${verifyGuest?.firstName} ${verifyGuest?.lastName}`);
            console.log(`✅ STORE: After updateGuestResponse - Guest status:`, verifyGuest?.rsvpStatus);
            console.log(`✅ STORE: After updateGuestResponse - Guest count in events array:`, verifyGuest?.guestCount);
            console.log(`✅ STORE: After updateGuestResponse - Guest source in events array:`, (verifyGuest as any)?.source);
            console.log(`✅ STORE: After updateGuestResponse - Guest count in currentEvent:`, verifyCurrentEventGuest?.guestCount);
            console.log(`✅ STORE: After updateGuestResponse - Guest status in currentEvent:`, verifyCurrentEventGuest?.rsvpStatus);
            console.log(`✅ STORE: After updateGuestResponse - Guest source in currentEvent:`, (verifyCurrentEventGuest as any)?.source);
            console.log(`✅ STORE: Updated currentEvent:`, updatedCurrentEvent?.id, 'guests:', updatedCurrentEvent?.guests?.length);
            console.log(`✅ STORE: Event updatedAt:`, updatedEvent?.updatedAt);
            console.log(`✅ STORE: CurrentEvent updatedAt:`, updatedCurrentEvent?.updatedAt);
            
            // CRITICAL: Check if update was applied correctly
            if (verifyGuest && verifyGuest.rsvpStatus !== updatedGuest.rsvpStatus) {
              console.error(`❌ MISMATCH: Guest status in events array (${verifyGuest.rsvpStatus}) doesn't match update (${updatedGuest.rsvpStatus})`);
            }
            if (verifyCurrentEventGuest && verifyCurrentEventGuest.rsvpStatus !== updatedGuest.rsvpStatus) {
              console.error(`❌ MISMATCH: Guest status in currentEvent (${verifyCurrentEventGuest.rsvpStatus}) doesn't match update (${updatedGuest.rsvpStatus})`);
            }
            
            // CRITICAL: Always create new array reference for events to force React re-render
            // This ensures React detects changes even if array contents are similar
            // CRITICAL: Also ensure updatedAt is ALWAYS updated to force eventsHash change
            // CRITICAL: For manual_update and guest_link updates, ALWAYS update updatedAt to ensure table refresh
            const finalUpdatedEvents = updatedEvents.map((e: any) => {
              if (e.id === eventId) {
                // CRITICAL: Always update updatedAt timestamp to ensure eventsHash changes
                // This forces EventManagement to detect the change and re-render the table
                // CRITICAL: Use a new Date() object to ensure timestamp is always different
                const newUpdatedAt = new Date();
                console.log(`🔄 Updating event ${eventId} updatedAt to force eventsHash change:`, newUpdatedAt.toISOString());
                return {
                  ...e,
                  updatedAt: newUpdatedAt, // Always use current timestamp to force hash change
                  // CRITICAL: Also ensure guests array is a new reference
                  guests: e.guests.map((g: any) => ({ ...g }))
                };
              }
              return e;
            });
            
            console.log(`🔄 Creating new events array reference to force React re-render`);
            console.log(`🔄 Updated event ${eventId} updatedAt to:`, new Date().toISOString());
            return {
              events: [...finalUpdatedEvents], // New array reference - CRITICAL for React re-render
              currentEvent: updatedCurrentEvent ? {
                ...updatedCurrentEvent,
                updatedAt: updatedCurrentEvent.id === eventId ? new Date() : updatedCurrentEvent.updatedAt
              } : updatedCurrentEvent,
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
            } catch (e: any) {
              // Ignore parsing errors
            }
          }
          
          // Sync to API (for multi-computer access)
          // CRITICAL: Always sync to backend to ensure updates are available for webhook service
          // This ensures updates from phone are synced to all devices via pendingUpdates
          if (updatedEvent) {
            const BACKEND_URL = (process.env as any).NEXT_PUBLIC_BACKEND_URL || (process.env as any).VITE_BACKEND_URL || 'http://localhost:3002';
            const updatedGuest = updatedEvent.guests.find((g: any) => g.id === guestId);
            
            if (!updatedGuest) {
              console.warn('⚠️ Updated guest not found, cannot sync to API');
              return updatedEvent;
            }
            
            try {
              console.log('🌐 Syncing guest response update to API...');
              console.log('📤 Sending guest update only (not full event to avoid 413):', {
                eventId: updatedEvent.id,
                guestId: guestId,
                updatedGuest: {
                  id: updatedGuest.id,
                  firstName: updatedGuest.firstName,
                  lastName: updatedGuest.lastName,
                  phoneNumber: updatedGuest.phoneNumber,
                  rsvpStatus: updatedGuest.rsvpStatus,
                  guestCount: updatedGuest.guestCount,
                  responseDate: updatedGuest.responseDate
                }
              });
              
              // CRITICAL: Send only the guest update to pendingUpdates, not the entire event
              // This avoids 413 errors for large events (e.g., 417 guests) and ensures the update is synced
              // CRITICAL: Only include status if it was actually updated (not undefined)
              // If only guestCount was updated, don't send status to avoid overwriting it
              const pendingUpdatePayload: PendingGuestUpdate = {
                phoneNumber: updatedGuest.phoneNumber,
                guestId: updatedGuest.id,
                eventId: eventId,
                guestCount: updatedGuest.guestCount, // CRITICAL: Always include guestCount if present
                actualAttendance: updatedGuest.actualAttendance,
                notes: updatedGuest.notes,
                responseDate: updatedGuest.responseDate ? (updatedGuest.responseDate instanceof Date ? updatedGuest.responseDate.toISOString() : updatedGuest.responseDate) : new Date().toISOString(),
                source: updatedGuest.source || 'manual_update', // Default to manual_update for button clicks and other manual updates
                timestamp: Date.now()
              };
              
              console.log(`📤 Syncing guest update to backend:`, {
                guestId: pendingUpdatePayload.guestId,
                eventId: pendingUpdatePayload.eventId,
                guestCount: pendingUpdatePayload.guestCount,
                rsvpStatus: updatedGuest.rsvpStatus,
                source: pendingUpdatePayload.source
              });
              
              // Only include status if it was explicitly updated (not undefined)
              // This ensures guestCount-only updates don't overwrite status
              if (updatedGuest.rsvpStatus !== undefined && updatedGuest.rsvpStatus !== null) {
                pendingUpdatePayload.status = updatedGuest.rsvpStatus;
              }
              
              // CRITICAL: Verify guestCount is included in payload
              if (updatedGuest.guestCount !== undefined && updatedGuest.guestCount !== null) {
                console.log(`✅ Guest count included in sync payload: ${updatedGuest.guestCount}`);
              }
              
              // Use batch processor for better performance (queues and batches updates)
              guestUpdateBatchProcessor.addUpdate(pendingUpdatePayload);
              console.log('✅ Guest update added to batch queue (will be sent shortly)');
                console.log('✅ Update will be processed by webhook service and synced to all devices');
                
              // CRITICAL: Update the event directly in the server via /api/events/:eventId/guests endpoint
              // This ensures the update is persisted immediately in the server
              // The table will then refresh from the server to get the latest data
              try {
                const isProblematicGuest = (updatedGuest.firstName?.includes('דורון') && updatedGuest.lastName?.includes('שושני')) ||
                                          (updatedGuest.firstName?.includes('מאור') && updatedGuest.lastName?.includes('רומנו')) ||
                                          (updatedGuest.firstName?.includes('עידו') && updatedGuest.lastName?.includes('דנן'));
                
                console.log('🔄 Updating event directly in server via /api/events/:eventId/guests...');
                console.log('📤 Sending updated guest to server:', {
                  eventId: updatedEvent.id,
                  guestId: updatedGuest.id,
                  rsvpStatus: updatedGuest.rsvpStatus,
                  guestCount: updatedGuest.guestCount,
                  source: updatedGuest.source,
                  isProblematicGuest
                });
                
                if (isProblematicGuest) {
                  console.log(`🔍 PROBLEMATIC GUEST SENDING TO SERVER: ${updatedGuest.firstName} ${updatedGuest.lastName}`, {
                    id: updatedGuest.id,
                    eventId: updatedEvent.id,
                    rsvpStatus: updatedGuest.rsvpStatus,
                    guestCount: updatedGuest.guestCount,
                    source: updatedGuest.source,
                    responseDate: updatedGuest.responseDate
                  });
                }
                
                // Send only the updated guest with append=true to merge with existing guests
                // CRITICAL: Ensure all required fields are included in the guest object
                // The backend merges by ID, so we need to include all fields to ensure proper update
                const guestForServer = {
                  id: updatedGuest.id,
                  firstName: updatedGuest.firstName,
                  lastName: updatedGuest.lastName,
                  phoneNumber: updatedGuest.phoneNumber,
                  rsvpStatus: updatedGuest.rsvpStatus,
                  guestCount: updatedGuest.guestCount,
                  notes: updatedGuest.notes || '',
                  actualAttendance: updatedGuest.actualAttendance,
                  responseDate: updatedGuest.responseDate ? (updatedGuest.responseDate instanceof Date ? updatedGuest.responseDate.toISOString() : updatedGuest.responseDate) : new Date().toISOString(),
                  source: updatedGuest.source || 'guest_link',
                  channel: updatedGuest.channel || 'whatsapp',
                  messageStatus: updatedGuest.messageStatus,
                  // Include other fields that might be needed
                  ...(updatedGuest.messageSentDate && { messageSentDate: updatedGuest.messageSentDate instanceof Date ? updatedGuest.messageSentDate.toISOString() : updatedGuest.messageSentDate }),
                  ...(updatedGuest.messageDeliveredDate && { messageDeliveredDate: updatedGuest.messageDeliveredDate instanceof Date ? updatedGuest.messageDeliveredDate.toISOString() : updatedGuest.messageDeliveredDate }),
                  ...(updatedGuest.messageFailedDate && { messageFailedDate: updatedGuest.messageFailedDate instanceof Date ? updatedGuest.messageFailedDate.toISOString() : updatedGuest.messageFailedDate }),
                  ...(updatedGuest.tableId && { tableId: updatedGuest.tableId })
                };
                
                console.log('📤 Sending complete guest object to server:', {
                  id: guestForServer.id,
                  firstName: guestForServer.firstName,
                  lastName: guestForServer.lastName,
                  phoneNumber: guestForServer.phoneNumber,
                  rsvpStatus: guestForServer.rsvpStatus,
                  guestCount: guestForServer.guestCount,
                  source: guestForServer.source
                });
                
                const apiUpdateResponse = await fetch(`${BACKEND_URL}/api/events/${eventId}/guests`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    guests: [guestForServer], // Send complete guest object with all fields
                    append: true // Merge with existing guests (update by ID)
                  })
                });
                
                if (apiUpdateResponse.ok) {
                  const apiResponseData = await apiUpdateResponse.json();
                  const isProblematicGuest = (guestForServer.firstName?.includes('דורון') && guestForServer.lastName?.includes('שושני')) ||
                                            (guestForServer.firstName?.includes('מאור') && guestForServer.lastName?.includes('רומנו')) ||
                                            (guestForServer.firstName?.includes('עידו') && guestForServer.lastName?.includes('דנן'));
                  
                  console.log('✅ Event updated directly in server:', {
                    success: true,
                    message: apiResponseData.message || 'Updated event with guests',
                    guestsCount: apiResponseData.guestsCount,
                    guestId: guestForServer.id,
                    guestName: `${guestForServer.firstName} ${guestForServer.lastName}`,
                    rsvpStatus: guestForServer.rsvpStatus,
                    guestCount: guestForServer.guestCount,
                    source: guestForServer.source,
                    isProblematicGuest
                  });
                  
                  if (isProblematicGuest) {
                    console.log(`🔍 PROBLEMATIC GUEST SENT TO SERVER SUCCESSFULLY: ${guestForServer.firstName} ${guestForServer.lastName}`, {
                      id: guestForServer.id,
                      rsvpStatus: guestForServer.rsvpStatus,
                      guestCount: guestForServer.guestCount,
                      source: guestForServer.source,
                      responseDate: guestForServer.responseDate
                    });
                  }
                  
                  // CRITICAL: Verify the update was saved correctly
                  console.log(`✅ VERIFIED: Guest ${guestForServer.id} (${guestForServer.firstName} ${guestForServer.lastName}) update sent to server:`, {
                    rsvpStatus: guestForServer.rsvpStatus,
                    guestCount: guestForServer.guestCount,
                    source: guestForServer.source,
                    responseDate: guestForServer.responseDate
                  });
                  
                  // CRITICAL: Don't refresh from server immediately - this would overwrite the local update
                  // The local update is already in the store and the table will update automatically
                  // The server update is confirmed, so the data is synced
                  // The webhook service will handle syncing to other devices
                  console.log('✅ Server update confirmed - local update preserved in store');
                } else {
                  const apiErrorText = await apiUpdateResponse.text();
                  const isProblematicGuest = (guestForServer.firstName?.includes('דורון') && guestForServer.lastName?.includes('שושני')) ||
                                            (guestForServer.firstName?.includes('מאור') && guestForServer.lastName?.includes('רומנו')) ||
                                            (guestForServer.firstName?.includes('עידו') && guestForServer.lastName?.includes('דנן'));
                  
                  console.error('❌ FAILED to update event directly in server:', {
                    status: apiUpdateResponse.status,
                    statusText: apiUpdateResponse.statusText,
                    error: apiErrorText,
                    guestId: guestForServer.id,
                    guestName: `${guestForServer.firstName} ${guestForServer.lastName}`,
                    eventId: eventId,
                    isProblematicGuest
                  });
                  
                  if (isProblematicGuest) {
                    console.error(`🔍 PROBLEMATIC GUEST FAILED TO SEND TO SERVER: ${guestForServer.firstName} ${guestForServer.lastName}`, {
                      id: guestForServer.id,
                      status: apiUpdateResponse.status,
                      error: apiErrorText
                    });
                  }
                  
                  // Fallback: Still add to pendingUpdates for webhook service to process
                  console.log('⚠️ Falling back to pendingUpdates mechanism');
                }
              } catch (apiError: any) {
                console.warn('⚠️ Error updating event directly in server:', apiError);
                // Fallback: Still add to pendingUpdates for webhook service to process
                console.log('⚠️ Falling back to pendingUpdates mechanism');
              }
            } catch (error: any) {
              console.warn('⚠️ Failed to sync guest response update to API (will use localStorage):', error);
              // Don't retry with full event - it will fail with 413 for large events
            }
          }
        } catch (error: any) {
          console.error('❌ Error in updateGuestResponse:', error);
          set({ error: 'שגיאה בעדכון תגובת מוזמן', isLoading: false });
        }
      },

      deleteGuest: async (eventId: any, guestId: any) => {
        set({ isLoading: true, error: null });
        try {
          set((state: any) => {
            const updatedEvents = state.events.map((event: any) =>
              event.id === eventId
                ? {
                    ...event,
                    guests: event.guests.filter((guest: any) => guest.id !== guestId)
                  }
                : event
            );
            
            const updatedCurrentEvent = state.currentEvent?.id === eventId 
              ? {
                  ...state.currentEvent,
                  guests: state.currentEvent.guests.filter((guest: any) => guest.id !== guestId)
                }
              : state.currentEvent;
            
            // Track deleted guest to prevent it from being restored from API
            const updatedDeletedGuests = { ...state.deletedGuests };
            if (!updatedDeletedGuests[eventId]) {
              updatedDeletedGuests[eventId] = [];
            }
            if (!updatedDeletedGuests[eventId].includes(guestId)) {
              updatedDeletedGuests[eventId].push(guestId);
            }
            
            return {
              events: updatedEvents,
              currentEvent: updatedCurrentEvent,
              deletedGuests: updatedDeletedGuests,
              isLoading: false
            };
          });
          
          // CRITICAL: Sync to API immediately for real-time sync between devices
          const updatedEvent = get().events.find((e: any) => e.id === eventId);
          if (updatedEvent) {
            syncEventToAPI(updatedEvent).catch(err => {
              console.error('❌ Final sync attempt failed:', err);
            });
          }
        } catch (error: any) {
          set({ error: 'שגיאה במחיקת מוזמן', isLoading: false });
        }
      },

      importGuestsFromExcel: async (eventId: any, data: any) => {
        set({ isLoading: true, error: null });
        try {
          const newGuests: Guest[] = data.map((guestData: any) => ({
            id: generateId(),
            firstName: cleanName(guestData.firstName),
            lastName: cleanName(guestData.lastName),
            phoneNumber: guestData.phoneNumber,
            guestCount: guestData.guestCount,
            notes: guestData.notes,
            rsvpStatus: 'pending',
            channel: 'manual',
            actualAttendance: 'not_marked',
            tags: []
          }));

          set((state: any) => ({
            events: state.events.map((event: any) =>
              event.id === eventId
                ? { ...event, guests: [...event.guests, ...newGuests] }
                : event
            ),
            isLoading: false
          }));
          
          // CRITICAL: Sync to API immediately for real-time sync between devices
          const updatedEvent = get().events.find((e: any) => e.id === eventId);
          if (updatedEvent) {
            syncEventToAPI(updatedEvent).catch(err => {
              console.error('❌ Final sync attempt failed:', err);
            });
          }
        } catch (error: any) {
          set({ error: 'שגיאה בייבוא נתונים', isLoading: false });
        }
      },

      exportGuestsToExcel: async (eventId: any) => {
        set({ isLoading: true, error: null });
        try {
          const event = get().events.find((e: any) => e.id === eventId);
          if (!event) {
            throw new Error('אירוע לא נמצא');
          }

          const exportData: ExcelExportData[] = event.guests.map((guest: any) => ({
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
        } catch (error: any) {
          set({ error: 'שגיאה בייצוא נתונים', isLoading: false });
        }
      },

      createCampaign: async (campaignData: any) => {
        set({ isLoading: true, error: null });
        try {
          const newCampaign = {
            ...campaignData,
            id: generateId(),
            createdAt: new Date(),
            updatedAt: new Date()
          };

          set((state: any) => ({
            events: state.events.map((event: any) =>
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
        } catch (error: any) {
          set({ error: 'שגיאה ביצירת הקמפיין', isLoading: false });
        }
      },

      scheduleCampaign: async (eventId: string, campaignId: string, scheduledDate: Date): Promise<void> => {
        set({ isLoading: true, error: null });
        try {
          const event = get().events.find((e: any) => e.id === eventId);
          if (!event) {
            throw new Error('Event not found');
          }

          const campaign = event.campaigns?.find((c: any) => c.id === campaignId);
          if (!campaign) {
            throw new Error('Campaign not found');
          }

          // Cancel any existing scheduled task for this campaign
          const { schedulerService } = await import('../services/schedulerService');
          schedulerService.cancelCampaign(campaignId);

          // Update campaign with scheduled date and status
          const updatedCampaigns = event.campaigns?.map((c: any) =>
            c.id === campaignId
              ? { ...c, scheduledDate, status: 'scheduled' as const }
              : c
          );

          await get().updateEvent(eventId, {
            campaigns: updatedCampaigns
          });

          // Get updated campaign for scheduling
          const updatedEvent = get().events.find((e: any) => e.id === eventId);
          const updatedCampaign = updatedEvent?.campaigns?.find((c: any) => c.id === campaignId);
          
          if (!updatedCampaign) {
            throw new Error('Campaign not found after update');
          }

          // Schedule the campaign using schedulerService
          schedulerService.scheduleCampaign(updatedCampaign, async () => {
            try {
              console.log(`⏰ Scheduled time reached for campaign: ${updatedCampaign.name}`);
              await get().sendCampaign(eventId, campaignId);
            } catch (error: any) {
              console.error('Error sending scheduled campaign:', error);
              // Update campaign status to failed
              const currentEvent = get().events.find((e: any) => e.id === eventId);
              if (currentEvent) {
                const failedCampaigns = currentEvent.campaigns?.map((c: any) =>
                  c.id === campaignId ? { ...c, status: 'failed' as const } : c
                );
                await get().updateEvent(eventId, {
                  campaigns: failedCampaigns
                });
              }
            }
          });

          console.log(`✅ Scheduled campaign: ${updatedCampaign.name} for ${scheduledDate.toLocaleString('he-IL')}`);
          set({ isLoading: false });
        } catch (error: any) {
          console.error('Error scheduling campaign:', error);
          set({ error: 'שגיאה בתזמון הקמפיין', isLoading: false });
          throw error;
        }
      },

      sendCampaign: async (eventId: string, campaignId: string): Promise<any> => {
        // CRITICAL: Ensure webhookService is running to receive updates after sending messages
        // טעינת השירות בצורה דינמית
        const { webhookService } = await import('../services/webhookService');
        
        // שימוש ב-as any כדי למנוע מ-TypeScript לעצור את ה-Build
        const service = webhookService as any;
        
        if (!service.pollingActive) {
          service.startPolling(8000); // הפעלת העדכון האוטומטי כל 8 שניות
        } else {
          service.stopPolling();
          service.startPolling(8000); // רענון המנגנון
        }
        console.log('📡 System is now actively waiting for guest responses via WhatsApp buttons and guest links...');
        set({ isLoading: true, error: null });
        try {
          const event = get().events.find((e: any) => e.id === eventId);
          if (!event) {
            throw new Error('Event not found');
          }

          const campaign = event.campaigns?.find((c: any) => c.id === campaignId);
          if (!campaign) {
            throw new Error('Campaign not found');
          }

          const guests = event.guests || [];
          
          // Check if this is the "event day reminder" campaign (contains QR code)
          const isEventDayReminder = campaign.name === 'תזכורת יום האירוע';
          
          // CRITICAL: Filter guests based on campaign type
          // 1. Some campaigns (הזמנה ראשונית, תזכורת שנייה, תזכורת שבועית) should only be sent to guests with status 'pending' (לא ענה) or 'maybe' (אולי מגיע)
          // 2. Other campaigns (תזכורת אחרונה, הודעת תודה למגיעים, תזכורת יום האירוע) should only be sent to guests who confirmed (מגיע)
          // 3. Custom campaigns (default) should only be sent to guests with status 'pending' or 'maybe' (לא ענה ומתלבט)
          const campaignsForNonResponded = ['הזמנה ראשונית', 'תזכורת שנייה', 'תזכורת שבועית'];
          const campaignsForConfirmed = ['תזכורת אחרונה', 'הודעת תודה למגיעים', 'תזכורת יום האירוע'];
          
          let filteredGuests;
          if (campaignsForNonResponded.includes(campaign.name)) {
            // Only send to guests with status 'pending' (לא ענה) or 'maybe' (אולי מגיע)
            filteredGuests = guests.filter((guest: any) => 
              guest.rsvpStatus === 'pending' || guest.rsvpStatus === 'maybe'
            );
            console.log(`📊 Campaign "${campaign.name}": ${filteredGuests.length} of ${guests.length} guests will receive the message (filtered: only guests with status 'pending' or 'maybe')`);
            console.log(`✅ Filtering: Only sending to guests with status === 'pending' (לא ענה) or 'maybe' (אולי מגיע)`);
          } else if (campaignsForConfirmed.includes(campaign.name)) {
            // Only send to guests who confirmed (מגיע)
            filteredGuests = guests.filter((guest: any) => guest.rsvpStatus === 'confirmed');
            console.log(`📊 Campaign "${campaign.name}": ${filteredGuests.length} of ${guests.length} guests will receive the message (filtered: only guests with status 'confirmed')`);
            console.log(`✅ Filtering: Only sending to guests with status === 'confirmed' (מגיע)`);
          } else {
            // Default: send only to guests with status 'pending' or 'maybe' (לא ענה ומתלבט)
            // This ensures custom campaigns only target guests who haven't confirmed or declined
            filteredGuests = guests.filter((guest: any) => 
              guest.rsvpStatus === 'pending' || guest.rsvpStatus === 'maybe'
            );
            console.log(`📊 Campaign "${campaign.name}": ${filteredGuests.length} of ${guests.length} guests will receive the message (filtered: only guests with status 'pending' or 'maybe')`);
            console.log(`✅ Filtering: Only sending to guests with status === 'pending' (לא ענה) or 'maybe' (מתלבט)`);
          }
          
          // Determine template name based on campaign FIRST (before building templateParams)
          // CRITICAL: Override templateName based on campaign name to ensure correct template is used
          // This ensures "תזכורת אחרונה" always uses "today" template, even if campaign has different templateName
          let templateNameForCampaign = campaign.templateName;
          
          // CRITICAL: Override template based on campaign name (takes priority over campaign.templateName)
          // Use template "aa" for the first three campaigns
          if (campaign.name === 'הזמנה ראשונית') {
            templateNameForCampaign = 'aa'; // Template name in Meta Business Manager
          } else if (campaign.name === 'תזכורת שנייה') {
            // Use template 'aa' for "תזכורת שנייה"
            templateNameForCampaign = 'aa';
          } else if (campaign.name === 'תזכורת שבועית') {
            templateNameForCampaign = 'aa';
          } else if (campaign.name === 'תזכורת אחרונה') {
            // CRITICAL: Always use template 'today' for "תזכורת אחרונה" campaign
            templateNameForCampaign = 'today';
            console.log('📋 Campaign "תזכורת אחרונה" - using template "today"');
          } else if (campaign.name === 'תזכורת יום האירוע') {
            // CRITICAL: Don't use template for "תזכורת יום האירוע" - send custom message content instead
            // User wants to send the campaign message content, not a template placeholder
            templateNameForCampaign = undefined;
            console.log('📋 Campaign "תזכורת יום האירוע" - will send custom message content, not template');
          } else if (!templateNameForCampaign) {
            // If no templateName in campaign and no matching campaign name, use default
            // (This is a fallback for custom campaigns)
            templateNameForCampaign = undefined;
          }
          
          // Import helper function once before map
          const { generateGuestResponseLink } = await import('../utils/helpers');
          
          // Create personalized messages for each guest (using filtered guests)
          const personalizedMessages = await Promise.all(filteredGuests.map(async (guest: any) => {
            let personalizedMessage = campaign.message;
            let personalizedSmsMessage = campaign.smsMessage || campaign.message;
            
            // CRITICAL: Find the original row number of the guest in the event (not filtered)
            const originalRowNumber = event.guests.findIndex((g: any) => g.id === guest.id) + 1;
            // Replace the generic link with guest-specific link
            // Use helper function to ensure production URL (works on all devices)
            const guestLink = generateGuestResponseLink(eventId, guest.id, guest.firstName, guest.lastName, guest.phoneNumber, originalRowNumber);
            
            // Debug: Log the guest ID being used
            console.log('🔗 Campaign - Guest ID:', guest.id, 'for guest:', `${guest.firstName} ${guest.lastName}`);
            console.log('🔗 Campaign - Original message:', personalizedMessage);
            
            // Find the table number for this guest
            const guestTable = event.tables?.find((table: any) => table.guests.includes(guest.id));
            const tableNumber = guestTable ? guestTable.number : 'לא הוקצה';
            
            // Replace template variables with actual values
            // Use consistent variable names: {{guest_name}} instead of {{first_name}}
            // CRITICAL: Handle undefined values - use groomName & brideName if coupleName is not available
            const coupleName = event.coupleName || 
              (event.groomName && event.brideName ? `${event.groomName} & ${event.brideName}` : 
               event.groomName || event.brideName || 'הזוג');
            const groomName = event.groomName || '';
            const brideName = event.brideName || '';
            
            personalizedMessage = personalizedMessage
              .replace(/\{\{guest_name\}\}/g, guest.firstName)
              .replace(/\{\{first_name\}\}/g, guest.firstName) // Support both for backward compatibility
              .replace(/\{\{last_name\}\}/g, guest.lastName)
              .replace(/\{\{event_date\}\}/g, formatDate(event.eventDate))
              .replace(/\{\{event_time\}\}/g, event.eventTime || '')
              .replace(/\{\{event_type\}\}/g, event.eventTypeHebrew || 'חתונה')
              .replace(/\{\{venue\}\}/g, event.venue || '')
              .replace(/\{\{couple_name\}\}/g, coupleName)
              .replace(/\{\{groom_name\}\}/g, groomName)
              .replace(/\{\{bride_name\}\}/g, brideName)
              .replace(/\{\{table_number\}\}/g, tableNumber.toString())
              .replace(/\{\{guest_response_link\}\}/g, guestLink);
            
            personalizedSmsMessage = personalizedSmsMessage
              .replace(/\{\{guest_name\}\}/g, guest.firstName)
              .replace(/\{\{first_name\}\}/g, guest.firstName) // Support both for backward compatibility
              .replace(/\{\{last_name\}\}/g, guest.lastName)
              .replace(/\{\{event_date\}\}/g, formatDate(event.eventDate))
              .replace(/\{\{event_time\}\}/g, event.eventTime || '')
              .replace(/\{\{event_type\}\}/g, event.eventTypeHebrew || 'חתונה')
              .replace(/\{\{venue\}\}/g, event.venue || '')
              .replace(/\{\{couple_name\}\}/g, coupleName)
              .replace(/\{\{groom_name\}\}/g, groomName)
              .replace(/\{\{bride_name\}\}/g, brideName)
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
              } catch (error: any) {
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
          const recipients: MessageRecipient[] = personalizedMessages.map(({ guest, message, smsMessage, qrCodeImageUrl }: any) => {
            const guestTable = event.tables?.find((table: any) => table.guests.includes(guest.id));
            const tableNumber = guestTable ? guestTable.number?.toString() : 'לא הוקצה';
            // CRITICAL: Find the original row number of the guest in the event (not filtered)
            const originalRowNumber = event.guests.findIndex((g: any) => g.id === guest.id) + 1;
            // Use helper function to ensure production URL (works on all devices)
            const guestLink = generateGuestResponseLink(eventId, guest.id, guest.firstName, guest.lastName, guest.phoneNumber, originalRowNumber);
            
            // Prepare template parameters based on the template name (use corrected templateNameForCampaign)
            // Different templates require different parameters
            // CRITICAL: Handle undefined values - use groomName & brideName if coupleName is not available
            const templateCoupleName = event.coupleName || 
              (event.groomName && event.brideName ? `${event.groomName} & ${event.brideName}` : 
               event.groomName || event.brideName || 'הזוג');
            const templateGroomName = event.groomName || '';
            const templateBrideName = event.brideName || '';
            
            let templateParams: any = {};
            
            if (templateNameForCampaign === 'aa' || templateNameForCampaign === 'AA') {
              // Template "aa" requires 8 parameters in order (matching the template body):
              // IMPORTANT: Order must match Meta template exactly: guest_name, event_type, groom_name, bride_name, event_date, event_time, venue, couple_name
              // NOTE: guest_response_link is kept for reference but NOT sent (template has no buttons)
              templateParams = {
                paramsOrder: ['guest_name', 'event_type', 'groom_name', 'bride_name', 
                             'event_date', 'event_time', 'venue', 'couple_name'],
                guest_name: guest.firstName,
                event_type: event.eventTypeHebrew || 'חתונה',
                groom_name: templateGroomName, // Parameter 3 - groom_name comes BEFORE bride_name in Meta template
                bride_name: templateBrideName, // Parameter 4 - bride_name comes AFTER groom_name in Meta template
                event_date: formatDate(event.eventDate),
                event_time: event.eventTime || '',
                venue: event.venue || '',
                couple_name: templateCoupleName, // Parameter 8 - at the end of the template
                guest_response_link: guestLink, // CRITICAL: Required for template "aa" URL button at index 0 ("לעדכון סטטוס הגעה")
                language: 'he'
              };
              
              // DEBUG: Log template parameters
              console.log(`🔍 DEBUG Template Parameters for "${templateNameForCampaign}" (sendCampaign):`, {
                groom_name: templateParams.groom_name,
                bride_name: templateParams.bride_name,
                couple_name: templateParams.couple_name,
                eventGroomName: event.groomName,
                eventBrideName: event.brideName,
                eventCoupleName: event.coupleName,
                templateCoupleName: templateCoupleName,
                templateGroomName: templateGroomName,
                templateBrideName: templateBrideName
              });
            } else if (templateNameForCampaign === 'a') {
              // CRITICAL: Template "a" requires ONLY 7 parameters (not 9!)
              // Based on error: "body: number of localizable_params (9) does not match the expected number of params (7)"
              // Template "a" parameters: guest_name, event_type, event_date, event_time, venue, guest_response_link, couple_name
              templateParams = {
                paramsOrder: ['guest_name', 'event_type', 'event_date', 'event_time', 'venue', 'guest_response_link', 'couple_name'],
                guest_name: guest.firstName,
                event_type: event.eventTypeHebrew || 'חתונה',
                event_date: formatDate(event.eventDate),
                event_time: event.eventTime || '',
                venue: event.venue || '',
                guest_response_link: guestLink,
                couple_name: templateCoupleName,
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
              const guestTable = event.tables?.find((table: any) => table.guests.includes(guest.id));
              const tableNumber = guestTable ? guestTable.number?.toString() : 'לא הוקצה';
              
              templateParams = {
                paramsOrder: ['first_name', 'event_type', 'couple_name', 'event_date', 
                             'event_time', 'venue', 'table_number'],
                first_name: guest.firstName, // Parameter 1 - note: uses first_name, not guest_name
                event_type: event.eventTypeHebrew || 'חתונה', // Parameter 2
                couple_name: templateCoupleName, // Parameter 3
                event_date: formatDate(event.eventDate), // Parameter 4
                event_time: event.eventTime || '', // Parameter 5
                venue: event.venue || '', // Parameter 6
                table_number: tableNumber, // Parameter 7
                language: 'he' // Hebrew - as shown in Meta template
              };
            } else {
              // Default: use template "a" parameters (7 parameters, not 9)
              // IMPORTANT: Template "a" requires ONLY 7 parameters: guest_name, event_type, event_date, event_time, venue, guest_response_link, couple_name
              templateParams = {
                paramsOrder: ['guest_name', 'event_type', 'event_date', 'event_time', 'venue', 'guest_response_link', 'couple_name'],
                guest_name: guest.firstName,
                event_type: event.eventTypeHebrew || 'חתונה',
                event_date: formatDate(event.eventDate),
                event_time: event.eventTime || '',
                venue: event.venue || '',
                guest_response_link: guestLink,
                couple_name: templateCoupleName,
                language: 'he'
              };
            }
            
            // CRITICAL: No buttons - send text-only message instead
            // Add response options as text in the message instead of buttons
            // This avoids WhatsApp button issues and works with the guest response page
            console.log('📝 DEBUG: Creating text-only message (no buttons)');
            console.log('📝 DEBUG: Guest link:', guestLink);
            
            // Add response text to message if not already present
            // Add at the end of the message
            const responseText = `\n\nלהשיב:\n• מגיע - ${guestLink}\n• לא אוכל להגיע - ${guestLink}?status=declined`;
            
            // Check if message already contains response instructions
            const hasResponseText = message.includes('להשיב') || message.includes('מגיע') || message.includes('לא אוכל להגיע');
            const finalMessage = hasResponseText ? message : message + responseText;
            
            console.log('📝 DEBUG: Final message (with response text):', finalMessage.substring(0, 200) + '...');
            
            const eventInvitationImageUrl = event.invitationImageUrl || qrCodeImageUrl || campaign.imageUrl;
            console.log('🖼️ sendCampaign - Image URL priority:', {
              eventInvitationImageUrl: event.invitationImageUrl,
              qrCodeImageUrl: qrCodeImageUrl,
              campaignImageUrl: campaign.imageUrl,
              finalImageUrl: eventInvitationImageUrl
            });
            
            return {
              id: guest.id,
              firstName: guest.firstName,
              lastName: guest.lastName,
              phoneNumber: guest.phoneNumber,
              channel: 'whatsapp',
              message: finalMessage, // Use finalMessage with response text instead of buttons
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
                // CRITICAL: Always use event invitation image first, then QR code, then campaign image
                // Priority: event.invitationImageUrl > qrCodeImageUrl > campaign.imageUrl
                invitationImageUrl: eventInvitationImageUrl
              },
              templateParams: templateParams,
              buttons: undefined // CRITICAL: No buttons - send text-only message
            };
            
            console.log('📝 DEBUG: Recipient created WITHOUT buttons (text-only)');
            console.log('📝 DEBUG: Recipient channel:', guest.channel);
          });
          
          console.log('📝 DEBUG: Total recipients created:', recipients.length);
          console.log('📝 DEBUG: All recipients are text-only (no buttons)');

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
          console.log('🔘 DEBUG: Recipients with buttons:', recipients.filter((r: any) => r.buttons && r.buttons.length > 0).length);
          recipients.forEach((r: any, idx: any) => {
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
          const updatedEvents = get().events.map((event: any) => {
            if (event.id !== eventId) return event;
            
            const updatedGuests = event.guests?.map((guest: any) => {
              const messageResult = (result as any).results.find((r: any) => r.recipientId === guest.id);
              if (messageResult && messageResult.success) {
                // Update messageStatus
                let messageStatus: 'sent' | 'delivered' | 'failed' = 'sent';
                
                return {
                  ...guest,
                  messageStatus,
                  messageSentDate: new Date(),
                  channel: 'whatsapp'
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
              campaigns: event.campaigns?.map((c: any) =>
                c.id === campaignId
                  ? { ...c, status: 'sent', sentCount: (result as any).successful, updatedAt: new Date() }
                  : c
              ),
              updatedAt: new Date()
            };
          });
          
          // After sending campaign, ensure webhookService is actively listening
          console.log(`📤 Campaign sent successfully! ${(result as any).successful} messages sent, ${(result as any).failed} failed`);
          console.log(`👂 System is now actively waiting for guest responses...`);
          // Webhook polling status logged only when needed
          console.log(`✅ Updated messageStatus for ${(result as any).successful} guests to "sent"`);

          set({
            events: updatedEvents,
            isLoading: false
          });
          
          // Sync updated events to backend
          const updatedEvent = updatedEvents.find((e: any) => e.id === eventId);
          if (updatedEvent) {
            syncEventToAPI(updatedEvent).catch(err => {
              console.warn('⚠️ Failed to sync updated event to API:', err);
            });
          }

          return result as any;
        } catch (error: any) {
          set({ error: 'שגיאה בשליחת הקמפיין', isLoading: false });
          throw error;
        }
      },

      resendFailedMessages: async (eventId: string, campaignId: string): Promise<any> => {
        // CRITICAL: Ensure webhookService is running to receive updates after sending messages
        // טעינת השירות בצורה דינמית
        const { webhookService } = await import('../services/webhookService');
        
        // שימוש ב-as any כדי למנוע מ-TypeScript לעצור את ה-Build
        const service = webhookService as any;
        
        if (!service.pollingActive) {
          service.startPolling(8000); // הפעלת העדכון האוטומטי כל 8 שניות
        } else {
          service.stopPolling();
          service.startPolling(8000); // רענון המנגנון
        }
        console.log('📡 Resending failed messages - System is now actively waiting for guest responses...');
        set({ isLoading: true, error: null });
        try {
          const event = get().events.find((e: any) => e.id === eventId);
          if (!event) {
            throw new Error('Event not found');
          }

          const campaign = event.campaigns?.find((c: any) => c.id === campaignId);
          if (!campaign) {
            throw new Error('Campaign not found');
          }

          const guests = event.guests || [];
          
          // CRITICAL: Filter only guests with failed message status
          const failedGuests = guests.filter((guest: any) => guest.messageStatus === 'failed');
          
          if (failedGuests.length === 0) {
            console.log('ℹ️ No guests with failed messages found for this campaign');
            set({ isLoading: false });
            return {
              totalSent: 0,
              successful: 0,
              failed: 0,
              results: []
            };
          }

          console.log(`📊 Resending campaign "${campaign.name}" to ${failedGuests.length} guests with failed messages`);

          // Determine template name based on campaign (same logic as sendCampaign)
          let templateNameForCampaign = campaign.templateName;
          
          if (campaign.name === 'הזמנה ראשונית') {
            templateNameForCampaign = 'aa';
          } else if (campaign.name === 'תזכורת שנייה') {
            templateNameForCampaign = 'aa';
          } else if (campaign.name === 'תזכורת שבועית') {
            templateNameForCampaign = 'aa';
          } else if (campaign.name === 'תזכורת אחרונה') {
            templateNameForCampaign = 'today';
          } else if (campaign.name === 'תזכורת יום האירוע') {
            templateNameForCampaign = undefined;
          } else if (!templateNameForCampaign) {
            templateNameForCampaign = undefined;
          }

          // Import helper function
          const { generateGuestResponseLink, formatDate } = await import('../utils/helpers');
          
          // Create personalized messages for each failed guest
          const personalizedMessages = await Promise.all(failedGuests.map(async (guest: any) => {
            let personalizedMessage = campaign.message;
            // CRITICAL: Find the original row number of the guest in the event (not filtered)
            const originalRowNumber = event.guests.findIndex((g: any) => g.id === guest.id) + 1;
            const guestLink = generateGuestResponseLink(eventId, guest.id, guest.firstName, guest.lastName, guest.phoneNumber, originalRowNumber);
            
            // Replace template variables
            personalizedMessage = personalizedMessage
              .replace(/\{\{guest_name\}\}/g, guest.firstName || '')
              .replace(/\{\{firstName\}\}/g, guest.firstName || '')
              .replace(/\{\{first_name\}\}/g, guest.firstName || '')
              .replace(/\{\{coupleName\}\}/g, event.coupleName || '')
              .replace(/\{\{groomName\}\}/g, event.groomName || '')
              .replace(/\{\{brideName\}\}/g, event.brideName || '')
              .replace(/\{\{eventType\}\}/g, event.eventTypeHebrew || '')
              .replace(/\{\{event_date\}\}/g, formatDate(event.eventDate) || '')
              .replace(/\{\{event_time\}\}/g, event.eventTime || '')
              .replace(/\{\{venue\}\}/g, event.venue || '')
              .replace(/\{\{guest_response_link\}\}/g, guestLink);

            // CRITICAL: No buttons - send text-only message instead
            // Add response options as text in the message instead of buttons
            const responseText = `\n\nלהשיב:\n• מגיע - ${guestLink}\n• לא אוכל להגיע - ${guestLink}?status=declined`;
            const hasResponseText = personalizedMessage.includes('להשיב') || personalizedMessage.includes('מגיע') || personalizedMessage.includes('לא אוכל להגיע');
            const finalPersonalizedMessage = hasResponseText ? personalizedMessage : personalizedMessage + responseText;

            // Build template params (same logic as sendCampaign)
            const templateCoupleName = event.coupleName || (event.groomName && event.brideName ? `${event.groomName} & ${event.brideName}` : 'הזוג');
            const templateGroomName = event.groomName || '';
            const templateBrideName = event.brideName || '';
            
            let templateParams: any = undefined;
            
            if (templateNameForCampaign === 'aa' || templateNameForCampaign === 'AA') {
              // Template "aa" requires 8 parameters in order (matching the template body):
              // IMPORTANT: Order must match Meta template exactly: guest_name, event_type, groom_name, bride_name, event_date, event_time, venue, couple_name
              // CRITICAL: guest_response_link is required for the URL button at index 0
              templateParams = {
                paramsOrder: ['guest_name', 'event_type', 'groom_name', 'bride_name', 
                             'event_date', 'event_time', 'venue', 'couple_name'],
                guest_name: guest.firstName,
                event_type: event.eventTypeHebrew || 'חתונה',
                groom_name: templateGroomName,
                bride_name: templateBrideName,
                event_date: formatDate(event.eventDate) || '',
                event_time: event.eventTime || '',
                venue: event.venue || '',
                couple_name: templateCoupleName,
                guest_response_link: guestLink, // CRITICAL: Required for template "aa" URL button at index 0 ("לעדכון סטטוס הגעה")
                language: 'he'
              };
            } else if (templateNameForCampaign === 'a') {
              templateParams = {
                paramsOrder: ['guest_name', 'event_type', 'event_date', 'event_time', 'venue', 'guest_response_link', 'couple_name'],
                guest_name: guest.firstName,
                event_type: event.eventTypeHebrew || 'חתונה',
                event_date: formatDate(event.eventDate),
                event_time: event.eventTime || '',
                venue: event.venue || '',
                guest_response_link: guestLink,
                couple_name: templateCoupleName,
                language: 'he'
              };
            } else if (templateNameForCampaign === 'today' || templateNameForCampaign === 'reminer' || templateNameForCampaign === 'reminder') {
              const guestTable = event.tables?.find((table: any) => table.guests.includes(guest.id));
              const tableNumber = guestTable ? guestTable.number?.toString() : 'לא הוקצה';
              
              templateParams = {
                paramsOrder: ['first_name', 'event_type', 'couple_name', 'event_date', 
                             'event_time', 'venue', 'table_number'],
                first_name: guest.firstName,
                event_type: event.eventTypeHebrew || 'חתונה',
                couple_name: templateCoupleName,
                event_date: formatDate(event.eventDate),
                event_time: event.eventTime || '',
                venue: event.venue || '',
                table_number: tableNumber,
                language: 'he'
              };
            }

            // Use event invitation image if available
            const eventInvitationImageUrl = event.invitationImageUrl || campaign.imageUrl;

            return {
              id: guest.id,
              firstName: guest.firstName,
              lastName: guest.lastName,
              phoneNumber: guest.phoneNumber,
              channel: 'whatsapp',
              message: finalPersonalizedMessage, // Use finalPersonalizedMessage with response text instead of buttons
              firstMessageSent: guest.firstMessageSent || false,
              eventData: {
                coupleName: event.coupleName,
                groomName: event.groomName,
                brideName: event.brideName,
                eventType: event.eventType,
                eventTypeHebrew: event.eventTypeHebrew,
                eventDate: formatDate(event.eventDate),
                eventTime: event.eventTime,
                venue: event.venue,
                invitationImageUrl: eventInvitationImageUrl
              },
              templateParams: templateParams,
              buttons: undefined // CRITICAL: No buttons - send text-only message
            };
          }));

          // Send messages using messageService
          const messageData: MessageData = {
            message: campaign.message,
            imageUrl: event.invitationImageUrl || campaign.imageUrl,
            recipients: personalizedMessages,
            templateName: templateNameForCampaign
          };

          const result = await messageService.sendBulkMessages(messageData);
          
          // Update messageStatus for each guest based on send results
          const updatedEvents = get().events.map((event: any) => {
            if (event.id !== eventId) return event;
            
            const updatedGuests = event.guests?.map((guest: any) => {
              // Only update guests that were in the failed list
              if (!failedGuests.find((fg: any) => fg.id === guest.id)) {
                return guest;
              }
              
              const messageResult = (result as any).results.find((r: any) => r.recipientId === guest.id);
              if (messageResult && messageResult.success) {
                return {
                  ...guest,
                  messageStatus: 'sent' as const,
                  messageSentDate: new Date(),
                  channel: 'whatsapp'
                };
              } else if (messageResult && !messageResult.success) {
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
              updatedAt: new Date()
            };
          });
          
          console.log(`📤 Resend completed! ${(result as any).successful} messages sent successfully, ${(result as any).failed} failed`);
          console.log(`✅ Updated messageStatus for ${(result as any).successful} guests from "failed" to "sent"`);

          set({
            events: updatedEvents,
            isLoading: false
          });
          
          // Sync updated events to backend
          const updatedEvent = updatedEvents.find((e: any) => e.id === eventId);
          if (updatedEvent) {
            syncEventToAPI(updatedEvent).catch(err => {
              console.warn('⚠️ Failed to sync updated event to API:', err);
            });
          }

          return result as any;
        } catch (error: any) {
          set({ error: 'שגיאה בשליחה חוזרת לכשלונות', isLoading: false });
          throw error;
        }
      },

      sendTestMessage: async (phoneNumber: string, message: string, channel: 'whatsapp'): Promise<boolean> => {
        set({ isLoading: true, error: null });
        try {
          const recipients: MessageRecipient[] = [{
            id: 'test',
            firstName: 'Test',
            lastName: 'User',
            phoneNumber,
            channel: 'whatsapp'
          }];

          const messageData: MessageData = {
            message,
            recipients
          };

          const result = await messageService.sendBulkMessages(messageData);
          
          set({ isLoading: false });
          return (result as any).successful > 0;
        } catch (error: any) {
          set({ error: 'שגיאה בשליחת הודעת בדיקה', isLoading: false });
          return false;
        }
      },



      // Venue Layout Management Functions
      createVenueLayout: async (eventId: any, layoutData: any) => {
        set({ isLoading: true, error: null });
        try {
          const layoutId = generateId();
          const newLayout = {
            ...layoutData,
            id: layoutId,
            createdAt: new Date(),
            updatedAt: new Date()
          };

          set((state: any) => ({
            events: state.events.map((event: any) => 
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
          const updatedEvent = get().events.find((e: any) => e.id === eventId);
          if (updatedEvent) {
            syncEventToAPI(updatedEvent).catch(err => {
              console.error('❌ Final sync attempt failed:', err);
            });
          }
        } catch (error: any) {
          set({ error: 'שגיאה ביצירת סקיצת אולם', isLoading: false });
        }
      },

      updateVenueLayout: async (eventId: any, updates: any) => {
        set({ isLoading: true, error: null });
        try {
          set((state: any) => ({
            events: state.events.map((event: any) => 
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
          const updatedEvent = get().events.find((e: any) => e.id === eventId);
          if (updatedEvent) {
            syncEventToAPI(updatedEvent).catch(err => {
              console.error('❌ Final sync attempt failed:', err);
            });
          }
        } catch (error: any) {
          set({ error: 'שגיאה בעדכון סקיצת אולם', isLoading: false });
        }
      },

      updateTablePosition: async (eventId: any, tableId: any, x: any, y: any) => {
        set({ isLoading: true, error: null });
        try {
          set((state: any) => ({
            events: state.events.map((event: any) => 
              event.id === eventId 
                ? { 
                    ...event, 
                    tables: event.tables.map((table: any) => 
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
                  tables: state.currentEvent.tables.map((table: any) => 
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
          const updatedEvent = get().events.find((e: any) => e.id === eventId);
          if (updatedEvent) {
            syncEventToAPI(updatedEvent).catch(err => {
              console.error('❌ Final sync attempt failed:', err);
            });
          }
        } catch (error: any) {
          set({ error: 'שגיאה בעדכון מיקום שולחן', isLoading: false });
        }
      },

      updateTableSize: async (eventId: any, tableId: any, width: any, height: any) => {
        set({ isLoading: true, error: null });
        try {
          set((state: any) => ({
            events: state.events.map((event: any) => 
              event.id === eventId 
                ? { 
                    ...event, 
                    tables: event.tables.map((table: any) => 
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
                  tables: state.currentEvent.tables.map((table: any) => 
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
          const updatedEvent = get().events.find((e: any) => e.id === eventId);
          if (updatedEvent) {
            syncEventToAPI(updatedEvent).catch(err => {
              console.error('❌ Final sync attempt failed:', err);
            });
          }
        } catch (error: any) {
          set({ error: 'שגיאה בעדכון גודל שולחן', isLoading: false });
        }
      },

      updateTableRotation: async (eventId: any, tableId: any, rotation: any) => {
        set({ isLoading: true, error: null });
        try {
          set((state: any) => ({
            events: state.events.map((event: any) => 
              event.id === eventId 
                ? { 
                    ...event, 
                    tables: event.tables.map((table: any) => 
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
                  tables: state.currentEvent.tables.map((table: any) => 
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
          const updatedEvent = get().events.find((e: any) => e.id === eventId);
          if (updatedEvent) {
            syncEventToAPI(updatedEvent).catch(err => {
              console.error('❌ Final sync attempt failed:', err);
            });
          }
        } catch (error: any) {
          set({ error: 'שגיאה בעדכון סיבוב שולחן', isLoading: false });
        }
      },

      updateTableShape: async (eventId: any, tableId: any, shape: any) => {
        set({ isLoading: true, error: null });
        try {
          set((state: any) => ({
            events: state.events.map((event: any) => 
              event.id === eventId 
                ? { 
                    ...event, 
                    tables: event.tables.map((table: any) => 
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
                  tables: state.currentEvent.tables.map((table: any) => 
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
          const updatedEvent = get().events.find((e: any) => e.id === eventId);
          if (updatedEvent) {
            syncEventToAPI(updatedEvent).catch(err => {
              console.error('❌ Final sync attempt failed:', err);
            });
          }
        } catch (error: any) {
          set({ error: 'שגיאה בעדכון צורת שולחן', isLoading: false });
        }
      },

      // Function to restore a specific deleted event
      restoreDeletedEvent: async (deletedEventId: any) => {
        set({ isLoading: true, error: null });
        try {
          const BACKEND_URL = (process.env as any).NEXT_PUBLIC_BACKEND_URL || (process.env as any).VITE_BACKEND_URL || 'http://localhost:3002';
          
          // CRITICAL: First try to restore from backend (server is source of truth)
          console.log(`🔄 Attempting to restore event ${deletedEventId} from backend...`);
          const restoreResponse = await fetch(`${BACKEND_URL}/api/events/${deletedEventId}/restore`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            }
          });
          
          if (restoreResponse.ok) {
            const restoreData = await restoreResponse.json();
            console.log(`✅ Event restored from backend:`, restoreData.event);
            console.log(`📊 Guests restored: ${restoreData.guestsRestored || restoreData.event.guests?.length || 0}`);
            
            // CRITICAL: Log guest details to verify they were restored
            if (restoreData.event.guests && restoreData.event.guests.length > 0) {
              console.log(`📋 Restored guests with RSVP data:`, restoreData.event.guests.map((g: any) => ({
                id: g.id,
                name: `${g.firstName} ${g.lastName}`,
                phone: g.phoneNumber,
                rsvpStatus: g.rsvpStatus,
                guestCount: g.guestCount,
                responseDate: g.responseDate,
                actualAttendance: g.actualAttendance,
                notes: g.notes
              })));
            }
            
            // Refresh events from API to get the restored event with all guests
            // Use useEventStore.getState() to ensure fetchEvents is accessible in the correct scope
            const storeState = useEventStore.getState();
            await storeState.fetchEvents(true);
            
            set({ isLoading: false });
            return true;
          } else {
            // If backend restore fails, try local restore
            console.warn(`⚠️ Backend restore failed, trying local restore...`);
            const deletedEvent = get().deletedEvents.find((event: any) => event.id === deletedEventId);
            if (deletedEvent) {
              // Remove deletedAt property and restore the event
              // CRITICAL: Preserve ALL guest data including RSVP status, guest count, notes, and actual attendance
              const { deletedAt, ...eventToRestore } = deletedEvent;
              
              // CRITICAL: Ensure guests array is preserved with all data
              const restoredEvent = {
                ...eventToRestore,
                guests: deletedEvent.guests || [] // CRITICAL: Explicitly preserve guests array
              };
              
              console.log(`📊 Restoring event locally with ${restoredEvent.guests.length} guests`);
              if (restoredEvent.guests.length > 0) {
                console.log(`📋 Guest details:`, restoredEvent.guests.map((g: any) => ({
                  id: g.id,
                  name: `${g.firstName} ${g.lastName}`,
                  phone: g.phoneNumber,
                  rsvpStatus: g.rsvpStatus,
                  guestCount: g.guestCount,
                  responseDate: g.responseDate,
                  actualAttendance: g.actualAttendance,
                  notes: g.notes
                })));
              }
              
              set((state: any) => ({
                events: [...state.events, restoredEvent],
                deletedEvents: state.deletedEvents.filter((event: any) => event.id !== deletedEventId),
                isLoading: false
              }));
              
              // CRITICAL: Sync restored event to backend with all guests
              await syncEventToAPI(restoredEvent);
              
              console.log(`✅ Event restored locally with ${restoredEvent.guests.length} guests`);
              return true;
            }
            
            const errorData = await restoreResponse.json().catch((err: any) => ({ error: restoreResponse.statusText }));
            console.error(`❌ Failed to restore event:`, errorData);
            set({ error: `שגיאה בשחזור האירוע: ${errorData.error || 'האירוע לא נמצא'}`, isLoading: false });
            return false;
          }
        } catch (error: any) {
          console.error('❌ Error restoring event:', error);
          set({ error: 'שגיאה בשחזור האירוע', isLoading: false });
          return false;
        }
      },

      // Function to permanently delete an event from deleted events
      permanentlyDeleteEvent: async (deletedEventId: any) => {
        set({ isLoading: true, error: null });
        try {
          set((state: any) => ({
            deletedEvents: state.deletedEvents.filter((event: any) => event.id !== deletedEventId),
            isLoading: false
          }));
          return true;
        } catch (error: any) {
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
              
              // CRITICAL: Log guest information for each event
              parsed.state.events.forEach((event: any, index: number) => {
                const guestCount = event.guests?.length || 0;
                console.log(`📅 Event ${index + 1}:`, {
                  id: event.id,
                  coupleName: event.coupleName,
                  guestsCount: guestCount,
                  campaignsCount: event.campaigns?.length || 0,
                  tablesCount: event.tables?.length || 0
                });
                
                // Log guest details if available
                if (guestCount > 0) {
                  console.log(`📋 Guests for event ${event.id}:`, event.guests.map((g: any) => ({
                    id: g.id,
                    name: `${g.firstName} ${g.lastName}`,
                    phone: g.phoneNumber,
                    rsvpStatus: g.rsvpStatus,
                    guestCount: g.guestCount,
                    responseDate: g.responseDate,
                    actualAttendance: g.actualAttendance,
                    notes: g.notes
                  })));
                }
              });
              
              // Force complete restoration by updating the store directly
              // CRITICAL: Preserve ALL guest data including RSVP status, guest count, notes, and actual attendance
              set((state: any) => {
                console.log('🔄 Current state before restore:', state);
                
                // CRITICAL: Ensure all guests are preserved with their data
                const restoredEvents = parsed.state.events.map((event: any) => ({
                  ...event,
                  guests: event.guests || [] // CRITICAL: Explicitly preserve guests array
                }));
                
                return {
                  ...state,
                  events: restoredEvents,
                  currentEvent: parsed.state.currentEvent || null
                };
              });
              
              console.log(`✅ Restored ${parsed.state.events.length} events from localStorage`);
              const totalGuests = parsed.state.events.reduce((sum: number, e: any) => sum + (e.guests?.length || 0), 0);
              console.log(`✅ Total guests restored: ${totalGuests}`);
              
              return true;
            }
          }
          return false;
        } catch (error: any) {
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
        } catch (error: any) {
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
                index === self.findIndex((e: any) => e.coupleName === event.coupleName)
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
        } catch (error: any) {
          console.error('❌ Error cleaning up localStorage:', error);
          return false;
        }
      },

      // Function to update existing events campaigns with consistent variable names
      updateExistingEventsCampaigns: () => {
        console.log('🔄 Updating existing events campaigns with consistent variable names...');
        set((state: any) => {
          const updatedEvents = state.events.map((event: any) => {
            if (!event.campaigns || event.campaigns.length === 0) {
              return event;
            }
            
            // Update all campaigns to use consistent variable names
            const updatedCampaigns = event.campaigns.map((campaign: any) => {
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
      recreateCampaigns: async (eventId: any) => {
        console.log('🔄 recreateCampaigns called with eventId:', eventId);
        let event = get().events.find((e: any) => e.id === eventId);
        
        // If event not found in store, try to fetch from API
        if (!event) {
          console.log('⚠️ Event not found in store, fetching from API...');
          try {
            const BACKEND_URL = (process.env as any).NEXT_PUBLIC_BACKEND_URL || (process.env as any).VITE_BACKEND_URL || 'http://localhost:3002';
            const response = await fetch(`${BACKEND_URL}/api/events/all`);
            if (response.ok) {
              const data = await response.json();
              if (data.success && data.events) {
                event = data.events.find((e: Event) => e.id === eventId);
                if (event) {
                  console.log('✅ Found event in API, adding to store...');
                  // Add event to store temporarily for campaign recreation
                  set((state: any) => ({
                    events: [...state.events, event as Event]
                  }));
                }
              }
            }
          } catch (apiError: any) {
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
            // CRITICAL: No buttons - send text-only message with links instead
            whatsappButtons: [],
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
            // CRITICAL: No buttons - send text-only message with links instead
            whatsappButtons: [],
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
            // CRITICAL: No buttons - send text-only message with links instead
            whatsappButtons: [],
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
            // CRITICAL: No buttons - send text-only message with links instead
            whatsappButtons: [],
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
        set((state: any) => {
          const eventIndex = state.events.findIndex((e: any) => e.id === eventId);
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
          const updatedEvents = state.events.map((e: any) => 
            e.id === eventId 
              ? { 
                  ...e, // Preserve all existing fields
                  campaigns: newCampaigns, // Only update campaigns
                  updatedAt: new Date() // Update timestamp
                }
              : e
          );
          
          updatedEvent = updatedEvents.find((e: any) => e.id === eventId);
          
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
          } catch (error: any) {
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
      addTable: async (eventId: any, tableData: any) => {
        set({ isLoading: true, error: null });
        try {
          const event = get().events.find((e: any) => e.id === eventId);
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

          set((state: any) => ({
            events: state.events.map((e: any) => 
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
          const updatedEvent = get().events.find((e: any) => e.id === eventId);
          if (updatedEvent) {
            syncEventToAPI(updatedEvent).catch(err => {
              console.error('❌ Final sync attempt failed:', err);
            });
          }
        } catch (error: any) {
          set({ error: 'שגיאה בהוספת השולחן', isLoading: false });
        }
      },

      updateTable: async (eventId: any, tableId: any, updates: any) => {
        set({ isLoading: true, error: null });
        try {
          set((state: any) => ({
            events: state.events.map((e: any) => 
              e.id === eventId 
                ? { 
                    ...e, 
                    tables: e.tables?.map((t: any) => 
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
                  tables: state.currentEvent.tables?.map((t: any) => 
                    t.id === tableId 
                      ? { ...t, ...updates, updatedAt: new Date() }
                      : t
                  ) || []
                }
              : state.currentEvent,
            isLoading: false
          }));
          
          // CRITICAL: Sync to API immediately for real-time sync between devices
          const updatedEvent = get().events.find((e: any) => e.id === eventId);
          if (updatedEvent) {
            syncEventToAPI(updatedEvent).catch(err => {
              console.error('❌ Final sync attempt failed:', err);
            });
          }
        } catch (error: any) {
          set({ error: 'שגיאה בעדכון השולחן', isLoading: false });
        }
      },

      deleteTable: async (eventId: any, tableId: any) => {
        set({ isLoading: true, error: null });
        try {
          set((state: any) => ({
            events: state.events.map((e: any) => 
              e.id === eventId 
                ? { 
                    ...e, 
                    tables: e.tables?.filter((t: any) => t.id !== tableId) || [],
                    guests: e.guests?.map((guest: any) => 
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
                  tables: state.currentEvent.tables?.filter((t: any) => t.id !== tableId) || [],
                  guests: state.currentEvent.guests?.map((guest: any) => 
                    guest.tableId === tableId 
                      ? { ...guest, tableId: undefined }
                      : guest
                  ) || []
                }
              : state.currentEvent,
            isLoading: false
          }));
          
          // CRITICAL: Sync to API immediately for real-time sync between devices
          const updatedEvent = get().events.find((e: any) => e.id === eventId);
          if (updatedEvent) {
            syncEventToAPI(updatedEvent).catch(err => {
              console.error('❌ Final sync attempt failed:', err);
            });
          }
        } catch (error: any) {
          set({ error: 'שגיאה במחיקת השולחן', isLoading: false });
        }
      },

      assignGuestToTable: async (eventId: any, guestId: any, tableId: any, seatNumber?: any) => {
        set({ isLoading: true, error: null });
        try {
          set((state: any) => {
            const event = state.events.find((e: any) => e.id === eventId);
            if (!event) {
              set({ isLoading: false });
              return;
            }
            
            // Update guest's tableId
            const updatedGuests = event.guests?.map((guest: any) => 
              guest.id === guestId 
                ? { ...guest, tableId: tableId, seatNumber: seatNumber }
                : guest
            ) || [];
            
            // Update tables: remove guest from old table, add to new table
            const updatedTables = event.tables?.map((table: any) => {
              // Remove guest from old table if it was assigned
              const oldTableGuests = table.guests.filter((id: any) => id !== guestId);
              
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
              events: state.events.map((e: any) => e.id === eventId ? updatedEvent : e),
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
          const updatedEvent = get().events.find((e: any) => e.id === eventId);
          if (updatedEvent) {
            syncEventToAPI(updatedEvent).catch(err => {
              console.error('❌ Final sync attempt failed:', err);
            });
          }
        } catch (error: any) {
          set({ error: 'שגיאה בהקצאת האורח לשולחן', isLoading: false });
        }
      },

      removeGuestFromTable: async (eventId: any, guestId: any) => {
        set({ isLoading: true, error: null });
        try {
          set((state: any) => {
            const event = state.events.find((e: any) => e.id === eventId);
            if (!event) {
              set({ isLoading: false });
              return;
            }
            
            // Update guest's tableId to undefined
            const updatedGuests = event.guests?.map((guest: any) => 
              guest.id === guestId 
                ? { ...guest, tableId: undefined, seatNumber: undefined }
                : guest
            ) || [];
            
            // Remove guest from all tables
            const updatedTables = event.tables?.map((table: any) => ({
              ...table,
              guests: table.guests.filter((id: any) => id !== guestId)
            })) || [];
            
            const updatedEvent = {
              ...event,
              guests: updatedGuests,
              tables: updatedTables
            };
            
            return {
              events: state.events.map((e: any) => e.id === eventId ? updatedEvent : e),
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
          const updatedEvent = get().events.find((e: any) => e.id === eventId);
          if (updatedEvent) {
            syncEventToAPI(updatedEvent).catch(err => {
              console.error('❌ Final sync attempt failed:', err);
            });
          }
        } catch (error: any) {
          set({ error: 'שגיאה בהסרת האורח מהשולחן', isLoading: false });
        }
      },

      moveGuestToTable: async (eventId: any, guestId: any, newTableId: any, newSeatNumber?: any) => {
        set({ isLoading: true, error: null });
        try {
          set((state: any) => {
            const event = state.events.find((e: any) => e.id === eventId);
            if (!event) {
              set({ isLoading: false });
              return;
            }
            
            // Find current guest to get old tableId
            const currentGuest = event.guests?.find((g: any) => g.id === guestId);
            const oldTableId = currentGuest?.tableId;
            
            // Update guest's tableId
            const updatedGuests = event.guests?.map((guest: any) => 
              guest.id === guestId 
                ? { ...guest, tableId: newTableId, seatNumber: newSeatNumber }
                : guest
            ) || [];
            
            // Update tables: remove guest from old table, add to new table
            const updatedTables = event.tables?.map((table: any) => {
              // Remove guest from old table if it was assigned
              const tableGuestsWithoutGuest = table.guests.filter((id: any) => id !== guestId);
              
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
              events: state.events.map((e: any) => e.id === eventId ? updatedEvent : e),
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
          const updatedEvent = get().events.find((e: any) => e.id === eventId);
          if (updatedEvent) {
            syncEventToAPI(updatedEvent).catch(err => {
              console.error('❌ Final sync attempt failed:', err);
            });
          }
        } catch (error: any) {
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

      getEventsByUserId: (userId: any) => {
        const { getAllEvents } = get();
        const allEvents = getAllEvents();
        return allEvents.filter((event: Event) => event.userId === userId);
      },

      getEventStatsByUserId: (userId: any) => {
        const { getEventsByUserId } = get();
        const userEvents = getEventsByUserId(userId);
        
        const totalEvents = userEvents.length;
        const totalGuests = userEvents.reduce((sum: any, event: any) => sum + (event.guests?.length || 0), 0);
        const totalCreditsUsed = userEvents.reduce((sum: any, event: any) => sum + (event.creditsUsed || 0), 0);

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
              removedEvents.map((e: any) => ({ id: e.id, userId: e.userId, name: e.coupleName })));
            
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
        } catch (error: any) {
          console.error('❌ Error cleaning up events:', error);
        }
      },

      // CRITICAL: Sync a specific event to API (for automatic sync when event is loaded)
      syncCurrentEventToAPI: async (eventId?: any) => {
        try {
          let eventToSync = eventId 
            ? get().events.find((e: any) => e.id === eventId)
            : get().currentEvent;
          
          // CRITICAL: If event not found in store, search in localStorage
          if (!eventToSync && eventId) {
            console.log(`🔍 Event ${eventId} not found in store, searching in localStorage...`);
            try {
              const eventsStorage = localStorage.getItem('rsvp-events-storage');
              if (eventsStorage) {
                const parsed = JSON.parse(eventsStorage);
                const storedEvents = parsed.state?.events || [];
                eventToSync = storedEvents.find((e: any) => e.id === eventId);
                if (eventToSync) {
                  console.log(`✅ Found event ${eventId} in localStorage`);
                }
              }
            } catch (storageError: any) {
              console.warn('⚠️ Error searching localStorage for event:', storageError);
            }
          }
          
          if (!eventToSync) {
            console.warn('⚠️ No event to sync:', eventId || 'currentEvent');
            return;
          }
          
          // Only sync if event has guests (to avoid unnecessary syncs)
          if (!eventToSync.guests || eventToSync.guests.length === 0) {
            console.log(`⏭️ Skipping sync for event ${eventToSync.id} - no guests`);
            return;
          }
          
          console.log(`🔄 Auto-syncing event ${eventToSync.id} with ${eventToSync.guests.length} guests...`);
          await syncEventToAPI(eventToSync);
          console.log(`✅ Auto-synced event ${eventToSync.id} successfully`);
        } catch (error: any) {
          console.warn('⚠️ Failed to auto-sync event:', error);
          // Don't throw - this is a background sync, shouldn't block UI
        }
      },

      // CRITICAL: Sync all events from localStorage to API (for multi-computer access)
      syncAllEventsToAPI: async () => {
        set({ isLoading: true, isSyncing: true, error: null });
        try {
          // Get current user ID
          const userStorage = localStorage.getItem('rsvp-user-storage');
          let userId = '';
          if (userStorage) {
            const parsed = JSON.parse(userStorage);
            userId = parsed.state?.user?.id || '';
          }

          // CRITICAL: Debug log - verify userId before sync
          console.log('🔍 [Sync] Starting sync for user:', userId);

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

          const BACKEND_URL = (process.env as any).NEXT_PUBLIC_BACKEND_URL || (process.env as any).VITE_BACKEND_URL || 'http://localhost:3002';
          let syncedCount = 0;
          let failedCount = 0;

          // Sync each event individually
          // CRITICAL: Use syncEventToAPI to send FULL event WITH guests
          // This ensures all guests are synced to the backend
          for (const event of userEvents) {
            try {
              // Use syncEventToAPI which sends the full event with all guests
              await syncEventToAPI(event);
                syncedCount++;
              console.log(`✅ Synced event "${event.coupleName || `${event.groomName} & ${event.brideName}`}" (${event.id}) to API with ${event.guests?.length || 0} guests`);
            } catch (error: any) {
                failedCount++;
              console.error(`❌ Failed to sync event "${event.coupleName || `${event.groomName} & ${event.brideName}`}":`, error);
              // syncEventToAPI already handles 413 errors internally, so we just log the failure
            }
          }

          console.log(`✅ Successfully synced ${syncedCount}/${syncedCount + failedCount} event(s) to server. Refreshing to get updated data...`);

          // CRITICAL: After sync, refresh events from API
          // Use robust version that checks if fetchEvents exists before calling
          console.log(`🔄 Refreshing events from API after sync...`);
          // Clear the fetching flag
          (get() as any)._isFetchingEvents = false;
          // Get userId for refresh
          const userStorage = localStorage.getItem('rsvp-user-storage');
          let refreshUserId = '';
          if (userStorage) {
            try {
              const parsed = JSON.parse(userStorage);
              refreshUserId = parsed.state?.user?.id || '';
            } catch (e: any) {
              console.error('❌ Error parsing user storage for refresh:', e);
            }
          }
          // Small delay to ensure sync completes, then refresh data
          setTimeout(async () => {
            console.log('🔄 Triggering safe refresh via useEventStore...');
            // METHOD B (Safer for external usage): Use the global hook
            const storeState = useEventStore.getState();
            if (storeState && storeState.fetchEvents && refreshUserId) {
              await storeState.fetchEvents(refreshUserId, false).catch((err: any) => {
                console.error('❌ Error refreshing events after sync:', err);
                window.location.reload(); // Fallback on error
              });
            } else {
              console.warn('⚠️ Store reference missing, forcing reload');
              window.location.reload();
            }
          }, 1000);

          set({ isLoading: false, isSyncing: false });
          
          if (failedCount > 0) {
            throw new Error(`סנכרנו ${syncedCount} אירועים, ${failedCount} נכשלו`);
          }
          
          return { synced: syncedCount, failed: failedCount };
        } catch (error: any) {
          console.error('❌ Error syncing all events:', error);
          set({ error: error instanceof Error ? error.message : 'שגיאה בסנכרון אירועים', isLoading: false, isSyncing: false });
          throw error;
        }
      },

    }),
    {
      name: 'rsvp-events-storage',
      partialize: (state: any) => {
        // CRITICAL FIX: Preserve ALL events in localStorage, even if user is not logged in
        // This prevents data loss after deployment when user is not authenticated
        // Get current user ID to filter events (but don't delete if no userId)
        let currentUserId = '';
        try {
          const userStorage = localStorage.getItem('rsvp-user-storage');
          if (userStorage) {
            const parsed = JSON.parse(userStorage);
            currentUserId = parsed.state?.user?.id || '';
          }
        } catch (e: any) {
          console.warn('⚠️ Could not get userId in partialize:', e);
        }

        try {
          const stored = localStorage.getItem('rsvp-events-storage');
          if (stored) {
            const parsed = JSON.parse(stored);
            if (parsed.state?.events && parsed.state.events.length > 0) {
              // CRITICAL FIX: Preserve ALL events from storage, even if user is not logged in
              // This prevents data loss after deployment
              const allEventsFromStorage = parsed.state.events;
              
              // Only filter by userId if we have a currentUserId (user is logged in)
              // If no userId, preserve ALL events to prevent data loss
              const eventsToPreserve = currentUserId 
                ? allEventsFromStorage.filter((e: Event) => {
                    // If event belongs to admin, exclude it for regular users
                    if (e.userId === 'admin-fixed-id' && currentUserId !== 'admin-fixed-id') {
                      return false;
                    }
                    // Keep events that belong to current user or have no userId/anonymous
                    return e.userId === currentUserId || !e.userId || e.userId === 'anonymous';
                  })
                : allEventsFromStorage; // CRITICAL: Preserve ALL events if no userId (after deployment)
              
              const currentEventsFromState = state.events || [];
              
              // Create a map of events from state (these might have updates)
              const stateEventsMap = new Map(currentEventsFromState.map((e: Event) => [e.id, e]));
              
              // Merge: use updated events from state, keep others from storage
              // CRITICAL: Clean guest names before saving
              const mergedEvents = eventsToPreserve.map((storedEvent: Event) => {
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
              
              // CRITICAL: Get deletedGuests from state (most up-to-date)
              const currentDeletedGuests = state.deletedGuests || parsed.state.deletedGuests || {};
              
              // CRITICAL: Clean all guest names AND filter out deleted guests before saving to localStorage
              // This prevents deleted guests from being restored when fetching from localStorage
              const cleanedMergedEvents = mergedEvents.map((event: Event) => {
                const deletedGuestIds = currentDeletedGuests[event.id] || [];
                return {
                  ...event,
                  guests: event.guests
                    ?.filter((guest: Guest) => {
                      // CRITICAL: Filter out deleted guests - they should not be saved to localStorage
                      if (deletedGuestIds.includes(guest.id)) {
                        console.log(`🚫 Filtering out deleted guest from localStorage: ${guest.firstName} ${guest.lastName} (${guest.id})`);
                        return false;
                      }
                      return true;
                    })
                    .map((guest: Guest) => ({
                      ...guest,
                      firstName: cleanName(guest.firstName),
                      lastName: cleanName(guest.lastName)
                    })) || []
                };
              });
              
              console.log(`💾 Saving ${cleanedMergedEvents.length} events to localStorage (userId: ${currentUserId || 'none'})`);
              
              return {
                events: cleanedMergedEvents, // Preserve all events (filtered by userId only if logged in), with deleted guests removed
                deletedEvents: state.deletedEvents || parsed.state.deletedEvents || [],
                deletedGuests: currentDeletedGuests, // Use currentDeletedGuests from state
                currentEvent: state.currentEvent || parsed.state.currentEvent || null
              };
            }
          }
          
          // If no storage exists, save current state (for first-time users)
          if (state.events && state.events.length > 0) {
            console.log('💾 No storage found, saving current state events:', state.events.length);
            
            // CRITICAL: Get deletedGuests from state
            const currentDeletedGuests = state.deletedGuests || {};
            
            // CRITICAL: Clean all guest names AND filter out deleted guests before saving to localStorage
            const cleanedEvents = state.events.map((event: Event) => {
              const deletedGuestIds = currentDeletedGuests[event.id] || [];
              return {
                ...event,
                guests: event.guests
                  ?.filter((guest: Guest) => {
                    // CRITICAL: Filter out deleted guests - they should not be saved to localStorage
                    if (deletedGuestIds.includes(guest.id)) {
                      console.log(`🚫 Filtering out deleted guest from localStorage: ${guest.firstName} ${guest.lastName} (${guest.id})`);
                      return false;
                    }
                    return true;
                  })
                  .map((guest: Guest) => ({
                    ...guest,
                    firstName: cleanName(guest.firstName),
                    lastName: cleanName(guest.lastName)
                  })) || []
              };
            });
            
            return {
              events: cleanedEvents,
              deletedEvents: state.deletedEvents || [],
              deletedGuests: currentDeletedGuests,
              currentEvent: state.currentEvent || null
            };
          }
        } catch (error: any) {
          console.error('❌ Error in partialize:', error);
        }
        
        // Fallback: if we can't merge, at least save what we have
        // CRITICAL: Get deletedGuests from state
        const currentDeletedGuests = state.deletedGuests || {};
        
        // CRITICAL: Clean all guest names AND filter out deleted guests before saving to localStorage
        const cleanedFallbackEvents = (state.events || []).map((event: Event) => {
          const deletedGuestIds = currentDeletedGuests[event.id] || [];
          return {
            ...event,
            guests: event.guests
              ?.filter((guest: Guest) => {
                // CRITICAL: Filter out deleted guests - they should not be saved to localStorage
                if (deletedGuestIds.includes(guest.id)) {
                  console.log(`🚫 Filtering out deleted guest from localStorage (fallback): ${guest.firstName} ${guest.lastName} (${guest.id})`);
                  return false;
                }
                return true;
              })
              .map((guest: Guest) => ({
                ...guest,
                firstName: cleanName(guest.firstName),
                lastName: cleanName(guest.lastName)
              })) || []
          };
        });
        
        return { 
          events: cleanedFallbackEvents,
          deletedEvents: state.deletedEvents || [],
          deletedGuests: currentDeletedGuests,
          currentEvent: state.currentEvent || null
        };
      },
      onRehydrateStorage: () => (state: any) => {
        if (state) {
          // Events restored from localStorage
        }
      },
    }
  )
);

// Set up cross-tab synchronization listener for eventStore
if (typeof window !== 'undefined') {
  crossTabSync.subscribe('rsvp-events-storage', (message: any) => {
    if (message.type === 'store-update' || message.type === 'force-refresh') {
      const store = useEventStore.getState();
      
      // Handle force refresh
      if (message.type === 'force-refresh' || message.action === 'force-refresh') {
        console.log('🔄 Cross-tab: Force refreshing events...');
        store.fetchEvents(true, true).catch((err: any) => {
          console.error('❌ Error refreshing events from cross-tab:', err);
        });
        return;
      }
      
      // Handle store updates
      if (message.data?.state) {
        console.log('🔄 Cross-tab: Updating events from other tab...');
        const newState = message.data.state;
        
        // Merge events intelligently (keep newer versions)
        const currentEvents = store.events;
        const incomingEvents = newState.events || [];
        
        // Create a map of current events by ID
        const currentEventsMap = new Map(currentEvents.map((e: any) => [e.id, e]));
        
        // Merge incoming events, keeping the newer version
        const mergedEvents = incomingEvents.map((incomingEvent: Event) => {
          const currentEvent = currentEventsMap.get(incomingEvent.id) as any;
          if (currentEvent) {
            // Compare timestamps
            const currentUpdatedAt = currentEvent.updatedAt 
              ? (currentEvent.updatedAt instanceof Date ? currentEvent.updatedAt.getTime() : new Date(currentEvent.updatedAt).getTime())
              : 0;
            const incomingUpdatedAt = incomingEvent.updatedAt
              ? (incomingEvent.updatedAt instanceof Date ? incomingEvent.updatedAt.getTime() : new Date(incomingEvent.updatedAt).getTime())
              : 0;
            
            // Use the newer version
            return incomingUpdatedAt >= currentUpdatedAt ? incomingEvent : currentEvent;
          }
          return incomingEvent;
        });
        
        // Add any current events that aren't in incoming
        currentEvents.forEach((currentEvent: any) => {
          if (!mergedEvents.find((e: Event) => e.id === currentEvent.id)) {
            mergedEvents.push(currentEvent);
          }
        });
        
        // Mark that this update is from cross-tab to avoid broadcasting back
        (window as any).__rsvp_cross_tab_update = true;
        
        // Update store with merged events
        useEventStore.setState({
          events: mergedEvents,
          deletedEvents: newState.deletedEvents || store.deletedEvents,
          deletedGuests: newState.deletedGuests || store.deletedGuests,
          currentEvent: newState.currentEvent || store.currentEvent,
        });
      }
    }
  });
  
  // Broadcast store updates when state changes
  let lastStateHash = '';
  useEventStore.subscribe((state: any) => {
    // Create a hash of the state to detect changes
    const stateHash = JSON.stringify({
      eventsCount: state.events.length,
      currentEventId: state.currentEvent?.id,
      deletedEventsCount: state.deletedEvents.length,
    });
    
    // Only broadcast if state actually changed
    if (stateHash !== lastStateHash) {
      lastStateHash = stateHash;
      
      // Broadcast the update (but avoid infinite loops by checking if this is from a cross-tab update)
      const isFromCrossTab = (window as any).__rsvp_cross_tab_update;
      if (!isFromCrossTab && crossTabSync.isReady()) {
        // CRITICAL: Only send minimal data to prevent DataCloneError
        // Don't send full event objects with all their complex properties
        // Just send event IDs and basic info that other tabs need
        try {
          crossTabSync.broadcast({
            type: 'store-update',
            storeName: 'rsvp-events-storage',
            action: 'state-change',
            data: {
              // Send only IDs and basic info, not full objects
              eventIds: state.events?.map((e: any) => e.id) || [],
              currentEventId: state.currentEvent?.id || null,
              eventsCount: state.events?.length || 0,
              // Don't send full events/currentEvent to avoid DataCloneError
            },
          });
        } catch (broadcastError: any) {
          console.warn('⚠️ Error broadcasting cross-tab update (non-critical):', broadcastError);
        }
      }
      (window as any).__rsvp_cross_tab_update = false;
    }
  });
}