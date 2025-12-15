import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { useEventStore } from '../store/eventStore';
import { calculateEventStats, formatDate, formatDateTime, getStatusIcon, getStatusColor, formatFullName } from '../utils/helpers';
import { webhookService } from '../services/webhookService';
import { 
  Users, 
  CheckCircle,
  XCircle,
  HelpCircle,
  Clock,
  MessageSquare,
  Phone,
  Calendar,
  MapPin,
  Download,
  Share2,
  Search
} from 'lucide-react';

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
  const [messageFilterStatus, setMessageFilterStatus] = useState<'all' | 'not_sent' | 'sent' | 'delivered' | 'failed' | 'sms_sent' | 'sent_not_delivered'>('all');
  const pollingIntervalRef = useRef<number | null>(null);
  const isPollingRef = useRef(false);

  useEffect(() => {
    if (!eventId) {
      return;
    }
    
    console.log(`🔍 ClientDashboard loading event silently: ${eventId}`);
    
    // Try to find event in current events first (for fast initial display)
      const event = events.find(e => e.id === eventId);
      if (event) {
      const displayName = event.coupleName || 
        (event.groomName && event.brideName ? `${event.groomName} & ${event.brideName}` : 
         event.groomName || event.brideName || 'אירוע');
      console.log(`✅ Found event in store: ${displayName} - showing immediately, will update from backend`);
      console.log(`🔍 Event details:`, {
        coupleName: event.coupleName,
        groomName: event.groomName,
        brideName: event.brideName,
        eventDate: event.eventDate,
        venue: event.venue,
        guestsCount: event.guests?.length || 0,
        updatedAt: event.updatedAt
      });
      
      // CRITICAL: Only set if we don't have currentEvent or if this is newer
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
    }
    
    // Try to load from localStorage (for fast display if not in store)
    if (!event) {
        try {
          const stored = localStorage.getItem('rsvp-events-storage');
          if (stored) {
            const parsed = JSON.parse(stored);
            if (parsed.state && parsed.state.events) {
              const foundEvent = parsed.state.events.find((e: any) => e.id === eventId);
              if (foundEvent) {
              const displayName = foundEvent.coupleName || 
                (foundEvent.groomName && foundEvent.brideName ? `${foundEvent.groomName} & ${foundEvent.brideName}` : 
                 foundEvent.groomName || foundEvent.brideName || 'אירוע');
              console.log(`✅ Found event in localStorage: ${displayName} - showing immediately, will update from backend`);
              console.log(`🔍 Event details from localStorage:`, {
                coupleName: foundEvent.coupleName,
                groomName: foundEvent.groomName,
                brideName: foundEvent.brideName,
                eventDate: foundEvent.eventDate,
                venue: foundEvent.venue,
                guestsCount: foundEvent.guests?.length || 0,
                updatedAt: foundEvent.updatedAt
              });
              
              // CRITICAL: Only set if we don't have currentEvent or if this is newer
              setCurrentEvent((prev: any) => {
                if (!prev) {
                  // CRITICAL: Ensure guests array exists
                  return {
                    ...foundEvent,
                    guests: foundEvent.guests || []
                  };
                }
                
                // Compare updatedAt timestamps
                const prevUpdatedAt = prev.updatedAt ? (prev.updatedAt instanceof Date ? prev.updatedAt.getTime() : new Date(prev.updatedAt).getTime()) : 0;
                const newUpdatedAt = foundEvent.updatedAt ? (foundEvent.updatedAt instanceof Date ? foundEvent.updatedAt.getTime() : new Date(foundEvent.updatedAt).getTime()) : 0;
                
                if (newUpdatedAt >= prevUpdatedAt) {
                  console.log('✅ Updating from localStorage (newer or same timestamp)');
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
                } else {
                  console.log('⚠️ Ignoring localStorage data (older than current)');
                  return prev; // Keep current (newer) data
                }
              });
            }
          }
        }
      } catch (error) {
        console.error('Error parsing localStorage:', error);
      }
    }
    
    // CRITICAL: Always load from public API endpoint to get latest data (backend is source of truth)
    // This ensures we always have the most up-to-date data, even if event was found in store/localStorage
    const loadFromAPI = async () => {
      try {
        const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'https://whatsapp-backend-enfz.onrender.com';
        console.log(`🌐 Loading event silently from API: ${BACKEND_URL}/api/events/all`);
        
        // CRITICAL: Try to load from /api/events/all first (public endpoint)
        // If this returns incomplete data (few guests), we'll try fetchEvents which uses authenticated endpoint
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
          
          const foundEvent = allEvents.find((e: any) => e.id === eventId);
          
          if (foundEvent) {
            const displayName = foundEvent.coupleName || 
              (foundEvent.groomName && foundEvent.brideName ? `${foundEvent.groomName} & ${foundEvent.brideName}` : 
               foundEvent.groomName || foundEvent.brideName || 'אירוע');
            console.log(`✅ Found event silently in API: ${displayName}`);
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
              eventTypeHebrew: foundEvent.eventTypeHebrew,
              invitationImageUrl: foundEvent.invitationImageUrl
            });
            
            // CRITICAL: Check if API returned incomplete data (common for large events)
            // If API returned very few guests (< 50), it's likely incomplete due to response size limits
            if (apiGuestsCount > 0 && apiGuestsCount < 50) {
              console.warn(`⚠️ WARNING: API returned only ${apiGuestsCount} guests - data may be incomplete!`);
              console.warn(`⚠️ This is a known limitation of /api/events/all for large events`);
              console.warn(`⚠️ For full guest list, please use the admin dashboard or wait for polling to update`);
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
                console.log(`🔍 Initial load - API returned ${foundEvent.guests?.length || 0} guests`);
                
                // CRITICAL: If API returned very few guests (likely incomplete), try to fetch full event data
                // This happens when the event is too large and the API response is truncated
                const apiGuestsCount = foundEvent.guests?.length || 0;
                const isLikelyIncomplete = apiGuestsCount > 0 && apiGuestsCount < 50; // Less than 50 guests suggests incomplete data
                
                if (isLikelyIncomplete) {
                  console.warn(`⚠️ API returned only ${apiGuestsCount} guests - likely incomplete data. Event might have more guests.`);
                  console.warn(`⚠️ This is a known limitation - large events may be truncated in /api/events/all`);
                  console.warn(`⚠️ For full guest list, use the admin dashboard or wait for polling to update`);
                }
                
                // CRITICAL: Ensure guests array exists even for initial load
                return {
                  ...foundEvent,
                  guests: foundEvent.guests || []
                };
              }
              
              // Compare updatedAt timestamps
              const prevUpdatedAt = prev.updatedAt ? (prev.updatedAt instanceof Date ? prev.updatedAt.getTime() : new Date(prev.updatedAt).getTime()) : 0;
              const newUpdatedAt = foundEvent.updatedAt ? (foundEvent.updatedAt instanceof Date ? foundEvent.updatedAt.getTime() : new Date(foundEvent.updatedAt).getTime()) : 0;
              
              if (newUpdatedAt >= prevUpdatedAt) {
                console.log('✅ Updating from API (newer or same timestamp) - merging data');
                
                // CRITICAL: Merge guests intelligently - don't lose guests that aren't in API response
                // API might return partial data (e.g., only 6 guests out of 417)
                const prevGuests = prev.guests || [];
                const apiGuests = foundEvent.guests || [];
                const prevGuestsMap = new Map(prevGuests.map((g: any) => [g.id, g]));
                const apiGuestsMap = new Map(apiGuests.map((g: any) => [g.id, g]));
                
                // If API has significantly fewer guests than prev, it's likely incomplete data
                // Only merge if API has similar or more guests, or if it's the initial load
                const apiGuestsCount = apiGuests.length;
                const prevGuestsCount = prevGuests.length;
                const isIncompleteApiData = apiGuestsCount > 0 && apiGuestsCount < prevGuestsCount * 0.5; // Less than 50% of prev
                
                let mergedGuests = prevGuests;
                if (!isIncompleteApiData) {
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
                } else {
                  console.warn(`⚠️ API data appears incomplete (${apiGuestsCount} guests vs ${prevGuestsCount} prev) - keeping prev guests`);
                  // Keep previous guests but update any that exist in API
                  mergedGuests = prevGuests.map((prevGuest: any) => {
                    const apiGuest = apiGuestsMap.get(prevGuest.id);
                    if (apiGuest) {
                      // Update this guest with API data
                      return apiGuest;
                    }
                    return prevGuest; // Keep prev guest as-is
                  });
                }
                
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
          } else {
            console.error(`❌ Event ${eventId} not found in API`);
            console.error(`❌ Available event IDs:`, allEvents.map((e: any) => e.id));
          }
        } else {
          console.error(`❌ API returned error: ${response.status}`);
        }
      } catch (error) {
        console.error('❌ Failed to load event from API:', error);
      }
    };
    
    // Only try fetchEvents if user is logged in (has userId)
    const userStorage = localStorage.getItem('rsvp-user-storage');
    let userId = '';
    if (userStorage) {
      try {
        const parsed = JSON.parse(userStorage);
        userId = parsed.state?.user?.id || '';
      } catch (e) {
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
        const foundEvent = events.find(e => e.id === eventId);
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
            
            if (newUpdatedAt >= prevUpdatedAt) {
              console.log('✅ Updating from fetchEvents (newer or same timestamp) - merging data');
              
              // CRITICAL: Merge guests intelligently - don't lose guests that aren't in fetchEvents data
              const prevGuests = prev.guests || [];
              const fetchGuests = foundEvent.guests || [];
              const prevGuestsCount = prevGuests.length;
              const fetchGuestsCount = fetchGuests.length;
              const fetchGuestsMap = new Map(fetchGuests.map((g: any) => [g.id, g]));
              
              // Merge guests: update existing, add new, keep prev if not in fetch
              const mergedGuests = prevGuests.map((prevGuest: any) => {
                const fetchGuest = fetchGuestsMap.get(prevGuest.id);
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
    
    // CRITICAL: Start polling for real-time updates from backend
    // This ensures ClientDashboard always shows the latest data from backend
    const startPolling = () => {
      if (isPollingRef.current) return; // Already polling
      
      isPollingRef.current = true;
      console.log('🔄 Starting real-time polling for ClientDashboard...');
      
      // Poll every 15 seconds for updates to reduce server load
      pollingIntervalRef.current = window.setInterval(async () => {
        try {
          const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'https://whatsapp-backend-enfz.onrender.com';
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
              // CRITICAL: Only update if new data is more recent or has actual changes
              // This prevents overwriting correct data with stale data
              setCurrentEvent((prev: any) => {
                if (!prev) {
                  console.log('🔄 ClientDashboard: Setting initial event from backend polling');
                  console.log(`🔍 Initial load - polling returned ${foundEvent.guests?.length || 0} guests`);
                  
                  // CRITICAL: Ensure guests array exists
                  return {
                    ...foundEvent,
                    guests: foundEvent.guests || []
                  };
                }
                
                // CRITICAL: Compare updatedAt timestamps to ensure we only update with newer data
                const prevUpdatedAt = prev.updatedAt ? (prev.updatedAt instanceof Date ? prev.updatedAt.getTime() : new Date(prev.updatedAt).getTime()) : 0;
                const newUpdatedAt = foundEvent.updatedAt ? (foundEvent.updatedAt instanceof Date ? foundEvent.updatedAt.getTime() : new Date(foundEvent.updatedAt).getTime()) : 0;
                
                // If new data is older, don't update (prevents overwriting with stale data)
                if (newUpdatedAt < prevUpdatedAt) {
                  console.log('⚠️ ClientDashboard: Ignoring older data from backend (prevents overwriting correct data)');
                  console.log(`   Previous updatedAt: ${new Date(prevUpdatedAt).toISOString()}`);
                  console.log(`   New updatedAt: ${new Date(newUpdatedAt).toISOString()}`);
                  return prev; // Keep previous (newer) data
                }
                
                // Compare guests by ID, not by index (guests might be in different order)
                const prevGuestsMap = new Map((prev.guests || []).map((g: any) => [g.id, g]));
                const newGuestsMap = new Map((foundEvent.guests || []).map((g: any) => [g.id, g]));
                
                // Check if number of guests changed
                if (prevGuestsMap.size !== newGuestsMap.size) {
                  console.log('🔄 ClientDashboard: Guest count changed, updating from backend');
                  // CRITICAL: Merge data instead of replacing to preserve fields and ensure guests array exists
                  const mergedEvent = {
                    ...prev,
                    ...foundEvent,
                    coupleName: foundEvent.coupleName || prev.coupleName,
                    campaigns: foundEvent.campaigns || prev.campaigns || [],
                    tables: foundEvent.tables || prev.tables || [],
                    venueLayout: foundEvent.venueLayout || prev.venueLayout,
                    eventImages: foundEvent.eventImages || prev.eventImages || [],
                    guests: foundEvent.guests || prev.guests || [] // Ensure guests array always exists
                  };
                  return mergedEvent;
                }
                
                // CRITICAL: If new data is older, don't update even if guests changed
                // This prevents overwriting newer manual changes with older API data
                if (newUpdatedAt < prevUpdatedAt) {
                  console.log('⚠️ ClientDashboard: Ignoring older data from polling (prevents overwriting correct data)');
                  console.log(`   Previous updatedAt: ${new Date(prevUpdatedAt).toISOString()}`);
                  console.log(`   New updatedAt: ${new Date(newUpdatedAt).toISOString()}`);
                  return prev; // Keep previous (newer) data
                }
                
                // Check if any guest data changed (only if timestamps are same or new is newer)
                let hasChanged = false;
                for (const [guestId, newGuest] of newGuestsMap) {
                  const prevGuest = prevGuestsMap.get(guestId);
                  if (!prevGuest) {
                    hasChanged = true;
                    break;
                  }
                  
                  // Check critical fields
                  if (prevGuest.rsvpStatus !== newGuest.rsvpStatus ||
                      prevGuest.guestCount !== newGuest.guestCount ||
                      prevGuest.actualAttendance !== newGuest.actualAttendance ||
                      prevGuest.firstName !== newGuest.firstName ||
                      prevGuest.lastName !== newGuest.lastName ||
                      prevGuest.phoneNumber !== newGuest.phoneNumber) {
                    hasChanged = true;
                    break;
                  }
                }
                
                if (hasChanged || newUpdatedAt > prevUpdatedAt) {
                  console.log('🔄 ClientDashboard: Event data updated silently from backend polling - merging data');
                  
                  // CRITICAL: Merge guests intelligently - don't lose guests that aren't in polling data
                  const prevGuests = prev.guests || [];
                  const pollingGuests = foundEvent.guests || [];
                  const prevGuestsCount = prevGuests.length;
                  const pollingGuestsCount = pollingGuests.length;
                  const pollingGuestsMap = new Map(pollingGuests.map((g: any) => [g.id, g]));
                  
                  // If polling has significantly fewer guests, it's likely incomplete data
                  const isIncompletePollingData = pollingGuestsCount > 0 && pollingGuestsCount < prevGuestsCount * 0.5;
                  
                  let mergedGuests = prevGuests;
                  if (!isIncompletePollingData) {
                    // Polling data seems complete - merge intelligently
                    mergedGuests = prevGuests.map((prevGuest: any) => {
                      const pollingGuest = pollingGuestsMap.get(prevGuest.id);
                      return pollingGuest || prevGuest; // Use polling data if exists, otherwise keep prev
                    });
                    
                    // Add any new guests from polling
                    pollingGuests.forEach((pollingGuest: any) => {
                      if (!prevGuests.find((g: any) => g.id === pollingGuest.id)) {
                        mergedGuests.push(pollingGuest);
                      }
                    });
                    
                    console.log(`🔍 Merged from polling: ${prevGuestsCount} prev → ${mergedGuests.length} merged (${pollingGuestsCount} from polling)`);
                  } else {
                    console.warn(`⚠️ Polling data appears incomplete (${pollingGuestsCount} vs ${prevGuestsCount}) - keeping prev guests, updating only existing`);
                    // Keep previous guests but update any that exist in polling
                    mergedGuests = prevGuests.map((prevGuest: any) => {
                      const pollingGuest = pollingGuestsMap.get(prevGuest.id);
                      if (pollingGuest) {
                        return pollingGuest; // Update this guest with polling data
                      }
                      return prevGuest; // Keep prev guest as-is
                    });
                  }
                  
                  // CRITICAL: Merge data to preserve fields that might exist in prev but not in foundEvent
                  const mergedEvent = {
                    ...prev, // Start with previous data
                    ...foundEvent, // Override with polling data (which is newer)
                    // CRITICAL: Preserve important fields from prev if they're missing
                    coupleName: foundEvent.coupleName || prev.coupleName,
                    campaigns: foundEvent.campaigns || prev.campaigns || [],
                    tables: foundEvent.tables || prev.tables || [],
                    venueLayout: foundEvent.venueLayout || prev.venueLayout,
                    eventImages: foundEvent.eventImages || prev.eventImages || [],
                    // CRITICAL: Use merged guests
                    guests: mergedGuests
                  };
                  return mergedEvent;
                }
                return prev;
              });
            }
          }
        } catch (error) {
          console.warn('⚠️ Polling error (will retry):', error);
        }
      }, 5000); // Poll every 5 seconds
    };
    
    // Start polling
    startPolling();
    
    // CRITICAL: Start webhookService to receive updates from guest links and WhatsApp
    if (!webhookService.pollingActive) {
      webhookService.startPolling(10000); // Poll every 10 seconds to reduce server load
    }
    
    // Cleanup on unmount
    return () => {
      if (pollingIntervalRef.current !== null) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
        isPollingRef.current = false;
        console.log('⏹️ Stopped ClientDashboard polling');
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId]); // Removed events and fetchEvents from deps to prevent infinite loop
  
  // CRITICAL: Update currentEvent when events in store change (from webhookService)
  // Silent update - no visual indicators
  useEffect(() => {
    if (eventId && events.length > 0) {
      const foundEvent = events.find(e => e.id === eventId);
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
            const prevGuest = prevGuestsMap.get(guestId);
            if (!prevGuest) {
              hasChanged = true;
              break;
            }
            
            // Check critical fields
            if (prevGuest.rsvpStatus !== newGuest.rsvpStatus ||
                prevGuest.guestCount !== newGuest.guestCount ||
                prevGuest.actualAttendance !== newGuest.actualAttendance ||
                prevGuest.firstName !== newGuest.firstName ||
                prevGuest.lastName !== newGuest.lastName ||
                prevGuest.phoneNumber !== newGuest.phoneNumber) {
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
      const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'https://whatsapp-backend-enfz.onrender.com';
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
    } catch (error) {
      console.error('❌ Error refreshing event:', error);
    }
  };

  const handleExportData = () => {
    if (!currentEvent) return;
    
    const stats = calculateEventStats(currentEvent);
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
      } catch (error) {
        console.log('Error sharing:', error);
      }
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(window.location.href);
      alert('הקישור הועתק ללוח');
    }
  };

  // Show page immediately - no loading screen
  if (!currentEvent) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">אירוע לא נמצא</h1>
          <p className="text-gray-600">האירוע המבוקש לא נמצא במערכת</p>
        </div>
      </div>
    );
  }

  const stats = calculateEventStats(currentEvent);

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
              {/* Refresh button removed - auto-refresh happens silently in background */}
              
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
                  onChange={(e) => setSearchTerm(e.target.value)}
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
                    onChange={(e) => setFilterStatus(e.target.value as any)}
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
                    onChange={(e) => setMessageFilterStatus(e.target.value as any)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm text-right focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="all">הכל</option>
                    <option value="not_sent">לא נשלח</option>
                    <option value="sent">נשלח</option>
                    <option value="delivered">נמסר</option>
                    <option value="failed">נכשל</option>
                    <option value="sms_sent">נשלח SMS</option>
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
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    מוזמן
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    מספר מוזמנים
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    סטטוס אישור
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    ערוץ
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    תאריך תגובה
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
                        // This includes 'sent' and 'sms_sent' but excludes 'delivered'
                        matchesMessageFilter = currentMessageStatus === 'sent' || currentMessageStatus === 'sms_sent';
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
                        } catch (e) {
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
                        } catch (e) {
                          // Ignore errors, keep bDate as 0
                          bDate = 0;
                        }
                      }
                      
                      // Sort descending (newest first)
                      return bDate - aDate;
                    })
                    .map((guest: any) => {
                      // Ensure guest is valid before rendering
                      if (!guest || typeof guest !== 'object') {
                        return null;
                      }
                      return (
                  <tr key={guest.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-normal">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                                {formatFullName(guest.firstName, guest.lastName)}
                        </div>
                              {renderGuestNotes(guest.notes)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {guest.guestCount}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <span className={`text-sm font-medium ${getStatusColor(guest.rsvpStatus)}`}>
                          {getStatusIcon(guest.rsvpStatus)} {guest.rsvpStatus === 'pending' ? 'לא ענה' :
                           guest.rsvpStatus === 'confirmed' ? 'מגיע' :
                           guest.rsvpStatus === 'declined' ? 'לא מגיע' : 'אולי מגיע'}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div className="flex items-center">
                        {guest.channel === 'whatsapp' ? (
                          <MessageSquare className="w-4 h-4 text-green-600 ml-1" />
                        ) : guest.channel === 'sms' ? (
                          <Phone className="w-4 h-4 text-blue-600 ml-1" />
                        ) : (
                          <Users className="w-4 h-4 text-gray-600 ml-1" />
                        )}
                        {guest.channel === 'whatsapp' ? 'וואטסאפ' : 
                         guest.channel === 'sms' ? 'SMS' : 'ידני'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {guest && guest.responseDate ? formatDateTime(guest.responseDate) : '-'}
                          </td>
                        </tr>
                      );
                    })
                    .filter((row: any) => row !== null)
                ) : (
                  <tr>
                    <td colSpan={5} className="px-6 py-4 text-center text-gray-500">
                      אין אורחים להצגה
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
