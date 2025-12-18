import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useEventStore } from '../store/eventStore';
import type { useEventStore as UseEventStoreType } from '../store/eventStore';
import { formatDate, formatDateTime, formatFullName, cleanName } from '../utils/helpers';
import { CheckCircle, XCircle, Users, Calendar, MapPin, Phone, User, MessageSquare, Clock, Heart, Navigation, Plus } from 'lucide-react';

const GuestResponse = () => {
  console.log(`🚀 GuestResponse component RENDERED`);
  console.log(`🚀 Current URL: ${window.location.href}`);
  console.log(`🚀 Current hash: ${window.location.hash}`);
  console.log(`🚀 Current pathname: ${window.location.pathname}`);
  console.log(`🚀 Current search: ${window.location.search}`);
  
  const { eventId: paramEventId } = useParams<{ eventId: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { events, updateGuestResponse, fetchEvents } = useEventStore();
  
  console.log(`🚀 paramEventId from useParams: ${paramEventId}`);
  console.log(`🚀 searchParams:`, Object.fromEntries(searchParams.entries()));
  
  // Parse eventId from hash if not in params (HashRouter fallback)
  const parseEventIdFromHash = () => {
    // CRITICAL: Always check hash first for concatenated URLs, even if paramEventId exists
    // The hash contains the full URL including concatenated links
    const hash = window.location.hash;
    console.log(`🔍 Parsing eventId from hash: ${hash}`);
    
    if (hash) {
      // CRITICAL: Find ALL eventIds in the hash (in case of concatenated URLs)
      // Use a more comprehensive regex that captures eventIds even with query params
      const allMatches = hash.match(/\/guest-response\/([a-z0-9]{10,})/gi);
      if (allMatches && allMatches.length > 0) {
        console.log(`🔍 Found ${allMatches.length} eventId matches in hash:`, allMatches);
        // Extract all eventIds from matches
        const eventIds = allMatches.map(m => {
          const idMatch = m.match(/\/([a-z0-9]{10,})/i);
          return idMatch ? idMatch[1] : null;
        }).filter(id => id !== null);
        
        if (eventIds.length > 0) {
          // Get the last eventId found (most likely the correct one)
          const lastEventId = eventIds[eventIds.length - 1];
          console.log(`✅ Found last eventId in hash (from ${eventIds.length} matches): ${lastEventId}`);
          console.log(`🔍 All eventIds found:`, eventIds);
          return lastEventId;
        }
      }
      
      // Hash format: #/guest-response/eventId?guest=guestId
      // Try multiple patterns to handle different URL formats
      let match = hash.match(/\/guest-response\/([^/?]+)/);
      if (match && match[1]) {
        const parsedId = match[1];
        // Clean the ID if it contains URL
        if (parsedId.includes('http://') || parsedId.includes('https://')) {
          const idMatch = parsedId.match(/^([a-z0-9]{10,})(?=https?:\/\/)/i);
          if (idMatch && idMatch[1]) {
            console.log(`✅ Found eventId in hash (cleaned): ${idMatch[1]}`);
            return idMatch[1];
          }
        } else {
        console.log(`✅ Found eventId in hash: ${parsedId}`);
        return parsedId;
        }
      }
      
      // Try alternative pattern: #guest-response/eventId
      match = hash.match(/guest-response\/([^/?]+)/);
      if (match && match[1]) {
        const parsedId = match[1];
        if (parsedId.includes('http://') || parsedId.includes('https://')) {
          const idMatch = parsedId.match(/^([a-z0-9]{10,})(?=https?:\/\/)/i);
          if (idMatch && idMatch[1]) {
            console.log(`✅ Found eventId in hash (alt pattern, cleaned): ${idMatch[1]}`);
            return idMatch[1];
          }
        } else {
        console.log(`✅ Found eventId in hash (alt pattern): ${parsedId}`);
        return parsedId;
        }
      }
      
      // Try pathname if hash doesn't work
      const pathname = window.location.pathname;
      console.log(`🔍 Trying pathname: ${pathname}`);
      match = pathname.match(/\/guest-response\/([^/?]+)/);
      if (match && match[1]) {
        const parsedId = match[1];
        console.log(`✅ Found eventId in pathname: ${parsedId}`);
        return parsedId;
      }
      
      // Try even simpler pattern: just look for alphanumeric string after guest-response
      match = hash.match(/guest-response[\/#]?([a-z0-9]+)/i);
      if (match && match[1]) {
        const parsedId = match[1];
        console.log(`✅ Found eventId in hash (simple pattern): ${parsedId}`);
        return parsedId;
      }
    }
    
    // Fallback: Check if paramEventId exists and is valid
    if (paramEventId && paramEventId.length >= 10 && /^[a-z0-9]+$/i.test(paramEventId)) {
      console.log(`✅ Found eventId in params (fallback): ${paramEventId}`);
      return paramEventId;
    }
    
    console.warn(`⚠️ Could not parse eventId from URL`);
    console.warn(`⚠️ Hash: ${window.location.hash}`);
    console.warn(`⚠️ Pathname: ${window.location.pathname}`);
    console.warn(`⚠️ Search: ${window.location.search}`);
    return null;
  };
  
  const eventId = parseEventIdFromHash();
  console.log(`🔍 Final eventId: ${eventId}`);
  
  // Parse guestId from hash or search params
  const parseGuestId = () => {
    // CRITICAL: Always check hash first for concatenated URLs, even if searchParams has guest
    // The hash contains the full URL including concatenated links
    const hash = window.location.hash;
    if (hash) {
      // CRITICAL: Find ALL guest= parameters in the hash (in case of concatenated URLs)
      // Use a more comprehensive regex that captures guestIds even with URLs after them
      const allGuestMatches = hash.match(/[?&]guest=([a-z0-9]{10,})/gi);
      if (allGuestMatches && allGuestMatches.length > 0) {
        console.log(`🔍 Found ${allGuestMatches.length} guestId matches in hash:`, allGuestMatches);
        // Extract all guestIds from matches - get the ID part before any URL or other characters
        const guestIds = allGuestMatches.map(m => {
          // Extract the full match including guest= and ID
          const fullMatch = m;
          // Try to extract just the ID part (10+ alphanumeric chars)
          const idMatch = fullMatch.match(/guest=([a-z0-9]{10,})/i);
          if (idMatch && idMatch[1]) {
            // Check if the ID is followed by non-alphanumeric characters (like https://)
            // If so, extract just the ID part
            const cleanId = idMatch[1].match(/^([a-z0-9]{10,})/i);
            return cleanId ? cleanId[1] : idMatch[1];
          }
          return null;
        }).filter(id => id !== null);
        
        if (guestIds.length > 0) {
          // Get the last guestId found (most likely the correct one)
          const lastGuestId = guestIds[guestIds.length - 1];
          console.log(`✅ Found last guestId in hash (from ${guestIds.length} matches): ${lastGuestId}`);
          console.log(`🔍 All guestIds found:`, guestIds);
          return lastGuestId;
        }
      }
      
      // Alternative: Try to find guestIds by looking for the pattern more carefully
      // This handles cases where guest= is followed by URL immediately
      const alternativeMatches = hash.match(/[?&]guest=([a-z0-9]{10,})(?=[^a-z0-9]|$)/gi);
      if (alternativeMatches && alternativeMatches.length > 0) {
        console.log(`🔍 Found ${alternativeMatches.length} guestId matches (alternative method):`, alternativeMatches);
        const guestIds = alternativeMatches.map(m => {
          const idMatch = m.match(/guest=([a-z0-9]{10,})/i);
          return idMatch ? idMatch[1] : null;
        }).filter(id => id !== null);
        
        if (guestIds.length > 0) {
          const lastGuestId = guestIds[guestIds.length - 1];
          console.log(`✅ Found last guestId in hash (alternative, from ${guestIds.length} matches): ${lastGuestId}`);
          return lastGuestId;
        }
      }
    }
    
    // Fallback: Check search params
    const fromSearch = searchParams.get('guest');
    if (fromSearch) {
      // CRITICAL: Clean the guestId - remove any URL that might be appended
      // Sometimes the guestId gets concatenated with the full URL
      // Example: "86sgy2y6smipwv8lfhttps://rsvp-frontend-wy47.onrender.com/#/guest-response/..."
      let cleaned = fromSearch.trim();
      
      // CRITICAL: First, try to extract just the ID part before any URL appears
      // Look for a pattern where the ID is followed by http:// or https://
      const idBeforeUrlMatch = cleaned.match(/^([a-z0-9]{10,})(?=https?:\/\/)/i);
      if (idBeforeUrlMatch && idBeforeUrlMatch[1]) {
        console.log(`✅ Extracted guestId before URL: ${idBeforeUrlMatch[1]}`);
        return idBeforeUrlMatch[1];
      }
      
      // Remove any full URL that might be appended (starts with http:// or https://)
      cleaned = cleaned.replace(/https?:\/\/[^\s]+/g, '').trim();
      // Remove any hash fragments that might be appended (#/guest-response/...)
      cleaned = cleaned.replace(/#\/?[^\s]*/g, '').trim();
      // Remove any trailing slashes
      cleaned = cleaned.replace(/[\/]+$/g, '').trim();
      
      // Only return if it looks like a valid ID (alphanumeric, at least 10 chars)
      if (cleaned && cleaned.length >= 10 && /^[a-z0-9]+$/i.test(cleaned)) {
        console.log(`✅ Cleaned guestId from search: ${cleaned}`);
        return cleaned;
      }
      
      // If cleaning didn't work, try to extract just the ID part (first alphanumeric sequence of 10+ chars)
      const idMatch = cleaned.match(/^([a-z0-9]{10,})/i);
      if (idMatch && idMatch[1]) {
        console.log(`✅ Extracted guestId from search: ${idMatch[1]}`);
        return idMatch[1];
      }
      
      console.warn(`⚠️ Could not parse valid guestId from search param: ${fromSearch}`);
    }
    
    console.warn(`⚠️ No guestId found in URL`);
    return null;
  };
  
  const guestId = parseGuestId();
  
  // DEBUG: Log URL parsing
  React.useEffect(() => {
    console.log('🔍 GuestResponse URL Debug:', {
      fullUrl: window.location.href,
      hash: window.location.hash,
      pathname: window.location.pathname,
      search: window.location.search,
      paramEventId: paramEventId,
      parsedEventId: eventId,
      guestId: guestId,
      searchParams: Object.fromEntries(searchParams.entries())
    });
  }, [paramEventId, eventId, guestId, searchParams]);
  
  // Load event IMMEDIATELY from localStorage first (fast, no waiting)
  React.useEffect(() => {
    console.log(`🔍 GuestResponse useEffect triggered - eventId: ${eventId}, guestId: ${guestId}`);
    
    if (!eventId) {
      console.warn(`⚠️ No eventId found! Cannot load event.`);
      console.warn(`⚠️ URL: ${window.location.href}`);
      console.warn(`⚠️ Hash: ${window.location.hash}`);
      console.warn(`⚠️ Pathname: ${window.location.pathname}`);
      setIsLoadingEvent(false);
      return;
    }
    
    console.log(`✅ EventId found: ${eventId} - Starting to load event...`);
    
    // CRITICAL: Load from localStorage FIRST (instant, no API delay)
    const stored = localStorage.getItem('rsvp-events-storage');
    console.log(`🔍 Checking localStorage: ${stored ? 'found' : 'not found'}`);
    
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (parsed.state && parsed.state.events) {
          console.log(`🔍 Found ${parsed.state.events.length} events in localStorage`);
          const foundEvent = parsed.state.events.find((e: any) => e.id === eventId);
          if (foundEvent) {
            console.log(`✅ Found event in localStorage: ${foundEvent.coupleName} (${foundEvent.id})`);
            setDirectEvent(foundEvent);
            setIsLoadingEvent(false);
            
            // Find guest immediately
            let guestFound = false;
            if (guestId) {
              const foundGuest = foundEvent.guests?.find((g: any) => g.id === guestId);
              if (foundGuest) {
                console.log(`✅ Found guest in localStorage: ${foundGuest.firstName} ${foundGuest.lastName}`);
                setDirectGuest(foundGuest);
                guestFound = true;
              } else {
                // Try fallback - partial match
                const fallbackGuest = foundEvent.guests?.find((g: any) => 
                  guestId && (g.id.includes(guestId) || guestId.includes(g.id))
                );
                if (fallbackGuest) {
                  console.log(`✅ Found fallback guest in localStorage: ${fallbackGuest.firstName} ${fallbackGuest.lastName}`);
                  setDirectGuest(fallbackGuest);
                  guestFound = true;
                } else {
                  console.warn(`⚠️ Guest ${guestId} not found in localStorage - will try API`);
                  // Don't return - continue to API to find guest
                }
              }
            } else {
              // No guestId required - event is enough
              guestFound = true;
            }
            
            // Only return if both event AND guest (if required) are found
            if (guestFound || !guestId) {
              console.log(`✅ Event and guest found in localStorage - showing page immediately`);
              return; // Found in localStorage, show page immediately
            } else {
              console.log(`⚠️ Event found but guest not found - will try API`);
              // Continue to API loading below
            }
          } else {
            console.log(`⚠️ Event ${eventId} not found in localStorage, will try API`);
          }
        } else {
          console.log(`⚠️ No events in localStorage state, will try API`);
        }
      } catch (error) {
        console.error('❌ Error parsing localStorage:', error);
        console.log(`⚠️ Will try API after localStorage parse error`);
      }
    } else {
      console.log(`⚠️ No localStorage found, will try API`);
    }
    
    // CRITICAL: Always try API if not found in localStorage (or localStorage doesn't exist)
    // This is especially important for devices that don't have the event in localStorage
    console.log(`🌐 Loading event from API (eventId: ${eventId})...`);
    
    // CRITICAL: Set a maximum timeout to stop loading even if API call is still running
    // This prevents infinite loading on devices with slow/blocked network
    const maxTimeout = setTimeout(() => {
      console.warn(`⏱️ Maximum timeout reached (10 seconds) - stopping loading`);
      setIsLoadingEvent(false);
      setHasGivenUpLoading(true); // Mark that we've given up loading
    }, 10000); // 10 seconds maximum wait time
    
    // If not found in localStorage, try API (but don't block page rendering)
    // This runs in background with retry mechanism
    const loadFromAPI = async (retryCount = 0) => {
      const MAX_RETRIES = 3;
      const RETRY_DELAY = 1000; // 1 second
      
      try {
        const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'https://whatsapp-backend-enfz.onrender.com';
        console.log(`🔍 Loading event from API (attempt ${retryCount + 1}/${MAX_RETRIES + 1}): ${BACKEND_URL}/api/events/all`);
        console.log(`🔍 Looking for eventId: ${eventId}`);
        
        // Use AbortController for timeout (compatible with older browsers)
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000); // 8 seconds timeout (less than maxTimeout)
        
        const response = await fetch(`${BACKEND_URL}/api/events/all`, {
          method: 'GET',
          headers: { 
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          mode: 'cors', // Explicitly enable CORS
          credentials: 'omit', // Don't send credentials for public endpoint
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        console.log(`🔍 API Response status: ${response.status} ${response.statusText}`);
        console.log(`🔍 API Response headers:`, Object.fromEntries(response.headers.entries()));
        console.log(`🔍 API Response URL: ${response.url}`);
        
        // Check if response is actually JSON
        const contentType = response.headers.get('content-type');
        console.log(`🔍 API Response content-type: ${contentType}`);
        
        if (response.ok) {
          const data = await response.json();
          console.log(`🔍 API returned ${data.events?.length || 0} events`);
          console.log(`🔍 Full API response:`, JSON.stringify(data, null, 2));
          console.log(`🔍 Event IDs in API:`, data.events?.map((e: any) => e.id) || []);
          console.log(`🔍 Looking for eventId: "${eventId}"`);
          console.log(`🔍 EventId type: ${typeof eventId}, length: ${eventId?.length}`);
          
          const allEvents = data.events || [];
          
          // Log all event IDs for debugging
          console.log(`🔍 All event IDs from API:`, allEvents.map((e: any) => ({
            id: e.id,
            idLength: e.id?.length,
            idType: typeof e.id,
            name: e.coupleName
          })));
          console.log(`🔍 Searching for eventId: "${eventId}" (length: ${eventId?.length}, type: ${typeof eventId})`);
          
          // Try exact match first
          let foundEvent = allEvents.find((e: any) => {
            const match = e.id === eventId;
            if (!match) {
              console.log(`❌ No match: "${e.id}" !== "${eventId}"`);
            }
            return match;
          });
          
          if (foundEvent) {
            console.log(`✅ Exact match found!`);
          } else {
            // If not found, try case-insensitive match
            console.log(`⚠️ Exact match failed, trying case-insensitive match...`);
            foundEvent = allEvents.find((e: any) => {
              const match = e.id?.toLowerCase() === eventId?.toLowerCase();
              if (match) {
                console.log(`✅ Case-insensitive match found: "${e.id}" === "${eventId}"`);
              }
              return match;
            });
          }
          
          // If still not found, try partial match (in case of URL encoding issues)
          if (!foundEvent) {
            console.log(`⚠️ Case-insensitive match failed, trying partial match...`);
            foundEvent = allEvents.find((e: any) => {
              const match = e.id?.includes(eventId) || eventId?.includes(e.id);
              if (match) {
                console.log(`✅ Partial match found: "${e.id}" includes "${eventId}" or vice versa`);
              }
              return match;
            });
          }
          
          // If still not found, try trimming whitespace
          if (!foundEvent && eventId) {
            console.log(`⚠️ Partial match failed, trying trimmed match...`);
            const trimmedEventId = eventId.trim();
            foundEvent = allEvents.find((e: any) => e.id?.trim() === trimmedEventId);
            if (foundEvent) {
              console.log(`✅ Trimmed match found!`);
            }
          }
          
          if (foundEvent) {
            console.log(`✅ Found event in API: ${foundEvent.coupleName} (${foundEvent.id})`);
            console.log(`✅ Event details:`, {
              id: foundEvent.id,
              coupleName: foundEvent.coupleName,
              guestsCount: foundEvent.guests?.length || 0
            });
            clearTimeout(maxTimeout); // Clear max timeout since we found the event
            setDirectEvent(foundEvent);
            setIsLoadingEvent(false);
            
            if (guestId) {
              const foundGuest = foundEvent.guests?.find((g: any) => g.id === guestId);
              if (foundGuest) {
                console.log(`✅ Found guest in API: ${foundGuest.firstName} ${foundGuest.lastName} (${foundGuest.id})`);
                setDirectGuest(foundGuest);
              } else {
                console.warn(`⚠️ Guest ${guestId} not found in event ${eventId}`);
                console.log(`🔍 Available guest IDs:`, foundEvent.guests?.map((g: any) => g.id) || []);
                
                // Try partial match for guest too
                const fallbackGuest = foundEvent.guests?.find((g: any) => 
                  g.id?.includes(guestId) || guestId?.includes(g.id)
                );
                if (fallbackGuest) {
                  console.log(`✅ Found fallback guest: ${fallbackGuest.firstName} ${fallbackGuest.lastName} (${fallbackGuest.id})`);
                  setDirectGuest(fallbackGuest);
                }
              }
            }
          } else {
            // Event not found in API - stop loading
            console.error(`❌ Event ${eventId} not found in API response`);
            console.error(`❌ Searched ${allEvents.length} events`);
            console.error(`❌ Available event IDs:`, allEvents.map((e: any) => ({ id: e.id, name: e.coupleName })));
            console.error(`❌ EventId we're looking for: "${eventId}"`);
            clearTimeout(maxTimeout); // Clear max timeout since we handled the case
            setIsLoadingEvent(false);
          }
        } else {
          // API returned error - stop loading and show error
          const errorText = await response.text().catch(() => 'Could not read error');
          console.error(`❌ API returned error: ${response.status} ${response.statusText}`);
          console.error(`❌ Error details:`, errorText);
          clearTimeout(maxTimeout); // Clear max timeout since we're handling the error
          setIsLoadingEvent(false);
        }
      } catch (error: any) {
        // Network error or timeout - retry if we haven't exceeded max retries
        console.error(`❌ Failed to load event from API (attempt ${retryCount + 1}):`, error.message);
        console.error('❌ Error type:', error.name);
        
        if (retryCount < MAX_RETRIES) {
          console.log(`🔄 Retrying in ${RETRY_DELAY}ms... (${retryCount + 1}/${MAX_RETRIES})`);
          setTimeout(() => {
            loadFromAPI(retryCount + 1);
          }, RETRY_DELAY);
        } else {
          console.error('❌ Max retries reached. Stopping loading.');
          console.error('❌ Error stack:', error.stack);
          clearTimeout(maxTimeout); // Clear max timeout since we're handling the error
          setIsLoadingEvent(false);
        }
      }
    };
    
    // Try API in background (non-blocking)
    loadFromAPI().finally(() => {
      // Clear max timeout if API call completes (success or failure)
      clearTimeout(maxTimeout);
    });
    
    // Cleanup function to clear timeout if component unmounts or dependencies change
    return () => {
      clearTimeout(maxTimeout);
    };
    
    // NOTE: We don't call fetchEvents here because:
    // 1. GuestResponse is a public page (no user login required)
    // 2. We load events from /api/events/all (public endpoint) via loadFromAPI()
    // 3. fetchEvents() requires userId and would cause infinite loops if called without user
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId, guestId]); // Removed fetchEvents call to prevent infinite loop
  
  // Removed debug logging for performance
  
  const [formData, setFormData] = useState<{
    fullName: string;
    phoneNumber: string;
    response: 'attending' | 'maybe' | 'not_attending';
    guestCount: number;
    notes: string;
    actualAttendance?: 'attended' | 'not_attended' | 'not_marked';
  }>({
    phoneNumber: '',
    fullName: '',
    guestCount: 1,
    notes: '',
    response: 'attending' as 'attending' | 'not_attending' | 'maybe',
    actualAttendance: 'not_marked' as 'attended' | 'not_attended' | 'not_marked'
  });
  
  const [showGuestCount, setShowGuestCount] = useState(false);
  const [showStatusButtons, setShowStatusButtons] = useState(true); // Start with buttons visible
  const [showConfirmButton, setShowConfirmButton] = useState(false); // Show confirm button after selecting maybe/not_attending
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error' | 'not_found'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  // CRITICAL: Store the response status that was submitted, to ensure correct message display
  const [submittedResponse, setSubmittedResponse] = useState<'attending' | 'maybe' | 'not_attending' | null>(null);
  const [submittedGuestCount, setSubmittedGuestCount] = useState<number>(1);
  
  // State to store event found directly from localStorage (for public access)
  const [directEvent, setDirectEvent] = React.useState<any>(null);
  const [directGuest, setDirectGuest] = React.useState<any>(null);
  
  // State to track loading - start with false to show page immediately
  const [isLoadingEvent, setIsLoadingEvent] = useState(false);
  // Track if we've given up loading (for showing error after timeout)
  const [hasGivenUpLoading, setHasGivenUpLoading] = useState(false);

  // CRITICAL: Always use eventId from URL to find the correct event
  // This ensures we update the correct event even if there are guests with the same ID in different events
  // The eventId in the URL is the primary identifier that distinguishes between events
  let event = null;
  if (eventId && guestId) {
    // CRITICAL: First find event by eventId (this is the primary identifier)
    // Then verify the guest exists in that specific event
    // This ensures we always use the correct event, even if guests have the same ID across events
    event = events.find(e => e.id === eventId);
    if (event) {
      // Verify guest exists in this specific event
      const guestInEvent = event.guests?.find(g => g.id === guestId);
      if (!guestInEvent) {
        console.warn(`⚠️ Guest ${guestId} not found in event ${eventId}, but event exists`);
        // Still use the event - guest might be added later or ID might be wrong
      }
    } else {
      console.warn(`⚠️ Event ${eventId} not found in store`);
    }
  } else if (eventId) {
    // If no guestId, just find by eventId (but prefer the most recent one if duplicates exist)
    const matchingEvents = events.filter(e => e.id === eventId);
    if (matchingEvents.length > 1) {
      console.warn(`⚠️ Found ${matchingEvents.length} duplicate events with ID ${eventId}, using most recent`);
      // Sort by updatedAt or createdAt, most recent first
      event = matchingEvents.sort((a, b) => {
        const aTime = a.updatedAt ? new Date(a.updatedAt).getTime() : (a.createdAt ? new Date(a.createdAt).getTime() : 0);
        const bTime = b.updatedAt ? new Date(b.updatedAt).getTime() : (b.createdAt ? new Date(b.createdAt).getTime() : 0);
        return bTime - aTime;
      })[0];
    } else {
      event = matchingEvents[0];
    }
  } else {
    console.error('❌ No eventId provided in URL - cannot identify event');
  }
  
  // Fallback to directEvent if not found in store
  if (!event) {
    event = directEvent;
  }
  
  const guest = event?.guests.find((g: any) => g.id === guestId) || directGuest;
  
  // Fallback: Try to find guest by partial ID match
  const fallbackGuest = event?.guests.find((g: any) => guestId && (g.id.includes(guestId) || guestId.includes(g.id)));
  
  // Use fallback guest if main guest not found
  const finalGuest = guest || fallbackGuest || directGuest;
  
  // Removed debug logging for performance
  
  // Pre-fill form when guest is found (only once, don't overwrite user input)
  useEffect(() => {
    const currentEvent = event || directEvent;
    const currentGuest = guest || directGuest || finalGuest;
    
    if (currentGuest && !formData.fullName && currentGuest.firstName) {
      setFormData(prev => ({
        ...prev,
        phoneNumber: currentGuest.phoneNumber || prev.phoneNumber,
        fullName: formatFullName(currentGuest.firstName, currentGuest.lastName) || prev.fullName,
        guestCount: currentGuest.guestCount || prev.guestCount || 1,
        notes: currentGuest.notes || prev.notes || '',
        response: currentGuest.rsvpStatus === 'confirmed' ? 'attending' : 
                 currentGuest.rsvpStatus === 'declined' ? 'not_attending' : 
                 currentGuest.rsvpStatus === 'maybe' ? 'maybe' : prev.response,
        actualAttendance: currentGuest.actualAttendance || prev.actualAttendance || 'not_marked'
      }));
    }
    
    // Set error if guest not found
    if (currentEvent && guestId && !currentGuest) {
      setSubmitStatus('not_found');
    }
  }, [event, directEvent, guest, directGuest, finalGuest, guestId, formData.fullName]);
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'guestCount' ? parseInt(value) || 1 : value
    }));
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('🚀 handleSubmit called!', { formData, guestId, eventId });
    
    // CRITICAL: Always use eventId from URL to find the correct event
    // Don't rely on event or directEvent as they might be from a different event
    let currentEvent = event || directEvent;
    
    // CRITICAL: If eventId is provided, verify that currentEvent matches it
    // If not, find the event by eventId from the store
    if (eventId && (!currentEvent || currentEvent.id !== eventId)) {
      console.log(`⚠️ Current event (${currentEvent?.id}) doesn't match eventId from URL (${eventId}), searching in store...`);
      const storeState = useEventStore.getState();
      const eventFromStore = storeState.events.find(e => e.id === eventId);
      if (eventFromStore) {
        console.log(`✅ Found event ${eventId} in store: ${eventFromStore.coupleName}`);
        currentEvent = eventFromStore;
      } else {
        console.warn(`⚠️ Event ${eventId} not found in store`);
      }
    }
    
    // CRITICAL: Also verify guestId matches the event
    let currentGuest = guest || directGuest || finalGuest;
    if (guestId && currentEvent) {
      // If currentGuest doesn't match guestId or doesn't belong to currentEvent, find it
                      if (!currentGuest || currentGuest.id !== guestId || !currentEvent.guests?.find((g: any) => g.id === guestId)) {
        console.log(`⚠️ Current guest doesn't match guestId from URL (${guestId}), searching in event...`);
                        const guestFromEvent = currentEvent.guests?.find((g: any) => g.id === guestId);
        if (guestFromEvent) {
          console.log(`✅ Found guest ${guestId} in event: ${guestFromEvent.firstName} ${guestFromEvent.lastName}`);
          currentGuest = guestFromEvent;
        } else {
          console.warn(`⚠️ Guest ${guestId} not found in event ${currentEvent.id}`);
        }
      }
    }
    
    console.log('📋 Current event:', currentEvent?.id, 'Current guest:', currentGuest?.id);
    console.log('📋 EventId from URL:', eventId, 'GuestId from URL:', guestId);
    
    if (!currentEvent) {
      console.error('❌ No event found');
      setSubmitStatus('error');
      setErrorMessage('אירוע לא נמצא');
      return;
    }
    
    // CRITICAL: Final verification - ensure eventId matches
    // This is the most important check - the eventId in the URL is the primary identifier
    // that distinguishes between events, even if guests have the same ID across events
    if (eventId && currentEvent.id !== eventId) {
      console.error(`❌ Event ID mismatch! URL eventId: ${eventId}, Current event ID: ${currentEvent.id}`);
      console.error(`❌ This should never happen - eventId from URL must match the event`);
      setSubmitStatus('error');
      setErrorMessage(`אירוע לא תואם. מזהה אירוע בקישור: ${eventId}, מזהה אירוע שנמצא: ${currentEvent.id}`);
      return;
    }
    
    // CRITICAL: Additional verification - ensure guest belongs to the correct event
    if (guestId && currentEvent && !currentEvent.guests?.find((g: any) => g.id === guestId)) {
      console.error(`❌ Guest ${guestId} not found in event ${eventId}`);
      console.error(`❌ This ensures we're updating the correct guest in the correct event`);
      setSubmitStatus('error');
      setErrorMessage(`אורח לא נמצא באירוע זה. מזהה אירוע: ${eventId}, מזהה אורח: ${guestId}`);
      return;
    }
    
    setIsSubmitting(true);
    setSubmitStatus('idle');
    setErrorMessage('');
    
    try {
      // Determine the guest to update
      const guestToUpdate = currentGuest || (guestId ? currentEvent.guests?.find((g: any) => g.id === guestId) : null);
      
      console.log('👤 Guest to update:', guestToUpdate?.id, guestToUpdate?.firstName);
      
      // Determine the response status
      const responseStatus = formData.response === 'attending' ? 'confirmed' : 
                            formData.response === 'maybe' ? 'maybe' : 'declined';
      
      console.log('📝 Response status:', responseStatus);
      
      if (guestToUpdate) {
        // Update existing guest - CRITICAL: explicitly set rsvpStatus to override any existing value
        let finalNotes = formData.notes || '';
        
        // CRITICAL: Always use current time for responseDate to ensure update is always considered "newer"
        // This ensures repeated updates from guest_link are always processed
        const currentResponseDate = new Date();
        
        const updatedGuest = {
          ...guestToUpdate,
          firstName: cleanName(guestToUpdate.firstName),
          lastName: cleanName(guestToUpdate.lastName),
          guestCount: formData.guestCount,
          notes: finalNotes,
          rsvpStatus: responseStatus as 'confirmed' | 'declined' | 'maybe', // EXPLICITLY set status
          responseDate: currentResponseDate, // CRITICAL: Always use current time
          actualAttendance: (formData.response === 'attending' ? 'not_marked' : 'not_marked') as 'attended' | 'not_attended' | 'not_marked',
          source: 'guest_link' // CRITICAL: Mark this update as coming from guest_link
        };
        
        console.log('🔄 Calling updateGuestResponse with:', {
          eventId: currentEvent.id,
          guestId: guestToUpdate.id,
          updatedGuest: { rsvpStatus: updatedGuest.rsvpStatus, guestCount: updatedGuest.guestCount }
        });
        
        // CRITICAL: Verify we have the correct event and guest before updating
        console.log('🔍 Verifying event and guest before update:', {
          eventId: currentEvent.id,
          eventName: currentEvent.coupleName,
          guestId: guestToUpdate.id,
          guestName: `${guestToUpdate.firstName} ${guestToUpdate.lastName}`,
          currentStatus: guestToUpdate.rsvpStatus,
          newStatus: updatedGuest.rsvpStatus
        });
        
        await updateGuestResponse(currentEvent.id, guestToUpdate.id, updatedGuest);
        
        console.log('✅ updateGuestResponse completed!');
        
        // CRITICAL: Get the updated state immediately after updateGuestResponse
        // This ensures we have the latest data from the store
        const storeModule = await import('../store/eventStore');
        const storeState = storeModule.useEventStore.getState();
        
        // Verify the update was applied
        const refreshedEvent = storeState.events.find(e => e.id === currentEvent.id);
        if (!refreshedEvent) {
          console.error('❌ Event not found in store after update!', currentEvent.id);
        } else {
          const refreshedGuest = refreshedEvent.guests?.find(g => g.id === guestToUpdate.id);
          if (!refreshedGuest) {
            console.error('❌ Guest not found in event after update!', guestToUpdate.id);
          } else {
            console.log(`✅ Verified update - Guest status: ${refreshedGuest.rsvpStatus} (expected: ${updatedGuest.rsvpStatus})`);
            console.log(`✅ Verified update - Guest count: ${refreshedGuest.guestCount} (expected: ${updatedGuest.guestCount})`);
            if (refreshedGuest.rsvpStatus !== updatedGuest.rsvpStatus) {
              console.error(`❌ STATUS MISMATCH! Expected: ${updatedGuest.rsvpStatus}, Got: ${refreshedGuest.rsvpStatus}`);
            }
            if (refreshedGuest.guestCount !== updatedGuest.guestCount) {
              console.error(`❌ GUEST COUNT MISMATCH! Expected: ${updatedGuest.guestCount}, Got: ${refreshedGuest.guestCount}`);
            }
          }
        }
        
        // CRITICAL: The store update already triggers React re-renders via eventsHash
        // But we need to ensure EventManagement detects the change
        // The eventsHash selector in EventManagement should detect the change automatically
        // But let's also trigger a fetchEvents to ensure API sync and force a re-render
        console.log('✅ Store updated - EventManagement should detect change via eventsHash');
        
        // CRITICAL: Trigger a single fetchEvents call to sync with API and trigger EventManagement update
        // The store update already triggers React re-renders, but fetchEvents ensures API sync
        // This ensures the table in EventManagement updates immediately
        setTimeout(() => {
          storeState.fetchEvents(false, true).catch(err => {
            console.warn(`⚠️ Failed to refresh events after guest response update:`, err);
          });
        }, 100); // Single delayed refresh to ensure API is in sync
      } else if (guestId) {
        // Try to find guest by ID in event
        const foundGuest = currentEvent.guests?.find((g: any) => g.id === guestId);
        if (foundGuest) {
          let finalNotes = formData.notes || '';
          
          // CRITICAL: Always use current time for responseDate to ensure update is always considered "newer"
          const currentResponseDate = new Date();
          
          const updatedGuest = {
            ...foundGuest,
            guestCount: formData.guestCount,
            notes: finalNotes,
            rsvpStatus: responseStatus as 'confirmed' | 'declined' | 'maybe',
            responseDate: currentResponseDate, // CRITICAL: Always use current time
            actualAttendance: (formData.response === 'attending' ? 'not_marked' : 'not_marked') as 'attended' | 'not_attended' | 'not_marked',
            source: 'guest_link' // CRITICAL: Mark this update as coming from guest_link
          };
          
          await updateGuestResponse(currentEvent.id, guestId, updatedGuest);
          
          // CRITICAL: Get the updated state immediately after updateGuestResponse
          // This ensures we have the latest data from the store
          const storeModule = await import('../store/eventStore');
          const storeState = storeModule.useEventStore.getState();
          const refreshedEvent = storeState.events.find(e => e.id === currentEvent.id);
          const refreshedGuest = refreshedEvent?.guests?.find(g => g.id === guestId);
          console.log(`🔄 Refreshed guest status after update: ${refreshedGuest?.rsvpStatus}`);
          console.log(`🔄 Refreshed guest count after update: ${refreshedGuest?.guestCount}`);
          
          // CRITICAL: Trigger a single fetchEvents call to sync with API and trigger EventManagement update
          // The store update already triggers React re-renders, but fetchEvents ensures API sync
          // This ensures the table in EventManagement updates immediately
          setTimeout(() => {
            storeState.fetchEvents(false, true).catch(err => {
              console.warn('⚠️ Failed to refresh events after guest response update:', err);
            });
          }, 100);
        } else {
          // Create new guest (fallback for direct access)
          let finalNotes = formData.notes || '';
          
          const newGuest = {
            id: guestId || 'guest-' + Date.now(),
            firstName: formData.fullName.split(' ')[0] || 'אורח',
            lastName: formData.fullName.split(' ').slice(1).join(' ') || 'דמו',
            phoneNumber: formData.phoneNumber || '000-0000000',
            guestCount: formData.guestCount,
            notes: finalNotes,
            rsvpStatus: responseStatus as 'confirmed' | 'declined' | 'maybe',
            responseDate: new Date(),
            channel: 'manual' as const,
            actualAttendance: (formData.response === 'attending' ? 'not_marked' : 'not_marked') as 'attended' | 'not_attended' | 'not_marked'
          };
          
          await updateGuestResponse(currentEvent.id, newGuest.id, newGuest);
        }
      } else {
        console.error('❌ No guest ID provided');
        setSubmitStatus('error');
        setErrorMessage('אורח לא נמצא');
        return;
      }
      
      // Reset confirm button state
      setShowConfirmButton(false);
      
      // CRITICAL: Store the response status BEFORE showing success message
      setSubmittedResponse(formData.response);
      setSubmittedGuestCount(formData.guestCount);
      
      // Refresh events in background (non-blocking)
      fetchEvents().catch(() => {}); // Don't wait for it
      
      setSubmitStatus('success');
      
    } catch (error) {
      console.error('❌ Error submitting response:', error);
      setSubmitStatus('error');
      setErrorMessage('אירעה שגיאה בעדכון התגובה. אנא נסה שוב.');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Update loading state when event is found
  useEffect(() => {
    if (event || directEvent) {
      setIsLoadingEvent(false);
    }
  }, [event, directEvent]);
  
  // Use directEvent if event is not found in store
  const currentEvent = event || directEvent;
  const currentGuest = guest || directGuest || finalGuest;
  
  // DEBUG: Log current state
  React.useEffect(() => {
    console.log('🔍 GuestResponse State Debug:', {
      eventId: eventId,
      guestId: guestId,
      hasEvent: !!event,
      hasDirectEvent: !!directEvent,
      hasCurrentEvent: !!currentEvent,
      hasGuest: !!guest,
      hasDirectGuest: !!directGuest,
      hasCurrentGuest: !!currentGuest,
      eventsInStore: events.length,
      isLoadingEvent: isLoadingEvent,
      directEventId: directEvent?.id,
      directEventName: directEvent?.coupleName
    });
    
    // If we have directEvent but currentEvent is null, log warning
    if (directEvent && !currentEvent) {
      console.warn('⚠️ directEvent exists but currentEvent is null!', {
        directEventId: directEvent.id,
        directEventName: directEvent.coupleName
      });
    }
  }, [eventId, guestId, event, directEvent, currentEvent, guest, directGuest, currentGuest, events.length, isLoadingEvent]);
  
  // CRITICAL: Show page immediately even if event is not loaded yet
  // Only show error if we've given up loading (after timeout)
  if (!currentEvent && hasGivenUpLoading && eventId) {
    // Show error only if we've given up loading and event is not found
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full text-center">
          <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-800 mb-2">
            אירוע לא נמצא
          </h1>
          <p className="text-gray-600 mb-4">
            הקוד שסופק לא תואם לאף אירוע במערכת
          </p>
          <p className="text-sm text-gray-500 mb-6">
            אם הקישור נכון, נסה לרענן את הדף או לבדוק את הקישור שוב.
          </p>
          {process.env.NODE_ENV === 'development' && (
            <div className="bg-gray-100 p-4 rounded-lg mb-4 text-left text-xs">
              <p><strong>Debug Info:</strong></p>
              <p>Event ID: {eventId || 'לא נמצא'}</p>
              <p>Guest ID: {guestId || 'לא נמצא'}</p>
              <p>URL: {window.location.href}</p>
              <p>Hash: {window.location.hash}</p>
              <p>Has directEvent: {directEvent ? 'כן' : 'לא'}</p>
              <p>Is Loading: {isLoadingEvent ? 'כן' : 'לא'}</p>
            </div>
          )}
          <div className="flex gap-3">
            <button
              onClick={() => {
                setIsLoadingEvent(true);
                setHasGivenUpLoading(false); // Reset the "given up" flag when retrying
                // Retry loading
                const loadFromAPI = async () => {
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
                      const foundEvent = (data.events || []).find((e: any) => e.id === eventId);
                      if (foundEvent) {
                        setDirectEvent(foundEvent);
                        setIsLoadingEvent(false);
                        if (guestId) {
                          const foundGuest = foundEvent.guests?.find((g: any) => g.id === guestId);
                          if (foundGuest) setDirectGuest(foundGuest);
                        }
                      } else {
                        setIsLoadingEvent(false);
                      }
                    } else {
                      setIsLoadingEvent(false);
                    }
                  } catch (error) {
                    console.error('Retry failed:', error);
                    setIsLoadingEvent(false);
                  }
                };
                loadFromAPI();
              }}
              className="btn-primary flex-1"
            >
              נסה שוב
            </button>
            <button
              onClick={() => navigate('/')}
              className="btn-secondary flex-1"
            >
              חזרה לעמוד הראשי
            </button>
          </div>
        </div>
      </div>
    );
  }
  
  // If event is not loaded yet, show page with loading indicator (don't show error immediately)
  // This ensures the page is always shown while loading, not error
  if (!currentEvent && eventId && !hasGivenUpLoading) {
    // Show page structure with loading message at top
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50">
        {/* Loading indicator at top */}
        <div className="bg-blue-50 border-b border-blue-200 px-4 py-3">
          <div className="max-w-2xl mx-auto flex items-center justify-center space-x-3">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
            <p className="text-blue-700 text-sm font-medium">טוען את האירוע...</p>
          </div>
        </div>
        
        {/* Page content placeholder */}
        <div className="max-w-2xl mx-auto px-4 py-8">
          <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
            <div className="animate-pulse space-y-4">
              <div className="h-8 bg-gray-200 rounded w-3/4 mx-auto"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2 mx-auto"></div>
              <div className="h-32 bg-gray-200 rounded mt-8"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  if (submitStatus === 'success') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full text-center">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h2 className="text-3xl font-bold text-gray-800 mb-4">
            הבחירה התקבלה!
          </h2>
          <div className="bg-green-50 border-2 border-green-300 rounded-lg p-6 mb-6">
            <p className="text-green-800 font-bold text-lg mb-3">
              {(() => {
                const response = submittedResponse || formData.response;
                const guestCount = submittedGuestCount || formData.guestCount;
                if (response === 'attending') {
                  return `אתם ${guestCount} ${guestCount === 1 ? 'אורח' : 'אורחים'} תגיעו לאירוע!`;
                } else if (response === 'maybe') {
                  return `אתם ${guestCount} ${guestCount === 1 ? 'אורח' : 'אורחים'} מתלבטים - נשמח לעדכון!`;
                } else {
                  return 'אנו מצטערים שלא תוכלו להגיע';
              }
              })()}
            </p>
            {(() => {
              const response = submittedResponse || formData.response;
              return (response === 'maybe' || response === 'not_attending') && (
              <p className="text-green-700 text-base font-semibold mb-2 bg-green-100 rounded-lg p-3">
                נשמח לעדכון אם יש שינוי בתכניות
              </p>
              );
            })()}
            <p className="text-green-700 text-xs mt-2">
              {(() => {
                const response = submittedResponse || formData.response;
                const guestCount = submittedGuestCount || formData.guestCount;
                const statusText = response === 'attending' ? 'מגיע' : response === 'maybe' ? 'מתלבט' : 'לא מגיע';
                return `סטטוס: ${statusText} | מספר אורחים: ${guestCount}`;
              })()}
            </p>
            {formData.notes && (
              <p className="text-green-700 text-sm mt-2">
                הערות: {formData.notes}
              </p>
            )}
          </div>
          <button
            onClick={() => {
              setSubmitStatus('idle');
              setSubmittedResponse(null);
              setSubmittedGuestCount(1);
              setShowStatusButtons(true);
              setShowGuestCount(false);
              setShowConfirmButton(false);
            }}
            className="mt-6 bg-gradient-to-r from-amber-500 to-amber-600 text-white px-8 py-3 rounded-xl font-medium shadow-lg hover:from-amber-600 hover:to-amber-700 transition-all transform hover:scale-105 w-full"
          >
            שליחת תגובה נוספת
          </button>
        </div>
      </div>
    );
  }
  
  // If we don't have currentEvent yet, show loading state (should not reach here, but safety check)
  if (!currentEvent) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50">
        <div className="bg-blue-50 border-b border-blue-200 px-4 py-3">
          <div className="max-w-2xl mx-auto flex items-center justify-center space-x-3">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
            <p className="text-blue-700 text-sm font-medium">טוען את האירוע...</p>
          </div>
        </div>
      </div>
    );
  }
  
  // Helper function to generate calendar link
  const generateCalendarLink = () => {
    if (!currentEvent.eventDate) {
      return '#';
    }
    
    try {
      const eventDate = new Date(currentEvent.eventDate);
      // Check if date is valid
      if (isNaN(eventDate.getTime())) {
        console.warn('⚠️ Invalid eventDate:', currentEvent.eventDate);
        return '#';
      }
      
      const startDate = eventDate.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
      const endDate = new Date(eventDate.getTime() + 3 * 60 * 60 * 1000).toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
      const title = encodeURIComponent(currentEvent.coupleName || 'חתונה');
      const details = encodeURIComponent(`${currentEvent.venue || ''}`);
      const location = encodeURIComponent(currentEvent.venue || '');
      
      return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${startDate}/${endDate}&details=${details}&location=${location}`;
    } catch (error) {
      console.error('❌ Error generating calendar link:', error);
      return '#';
    }
  };

  // Helper function to generate navigation link
  const generateNavigationLink = () => {
    if (!currentEvent.venue) return '#';
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(currentEvent.venue)}`;
  };

  const coupleName = currentEvent.coupleName || 
    (currentEvent.groomName && currentEvent.brideName ? `${currentEvent.groomName} & ${currentEvent.brideName}` : 
     currentEvent.groomName || currentEvent.brideName || 'הזוג');
  const groomName = currentEvent.groomName || '';
  const brideName = currentEvent.brideName || '';
  // Safely format event date
  let eventDateFormatted = '-';
  let eventDateShort = '-';
  try {
    if (currentEvent.eventDate) {
      eventDateFormatted = formatDate(currentEvent.eventDate);
      if (eventDateFormatted !== '-') {
        eventDateShort = eventDateFormatted.split(' ')[0]; // Get just the date part
      }
    }
  } catch (error) {
    console.warn('⚠️ Error formatting event date:', error);
  }
  
  return (
    <div className="min-h-screen" style={{ 
      background: 'linear-gradient(to bottom, #faf8f5 0%, #faf8f5 50%, #f5f3f0 50%, #f5f3f0 100%)',
      backgroundImage: 'radial-gradient(circle at 50% 0%, rgba(255,255,255,0.3) 0%, transparent 50%)'
    }}>
      {/* Top section with invitation cards */}
      <div className="relative pt-8 pb-4">
        {/* Silky white texture background */}
        <div className="absolute inset-0 bg-gradient-to-b from-white via-white to-transparent opacity-60" 
             style={{
               backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(255,255,255,0.1) 10px, rgba(255,255,255,0.1) 20px)'
             }}></div>
        
        <div className="max-w-4xl mx-auto px-4 relative z-10">
          {/* Invitation Cards */}
          <div className="grid grid-cols-1 gap-4 mb-4">
            {/* Hebrew Card */}
            <div className="bg-white rounded-lg shadow-lg p-6 text-center border border-gray-200 max-w-md mx-auto">
              <div className="text-xs text-gray-500 mb-2">בס"ד אירועים</div>
              <div className="text-4xl font-serif mb-2 text-gray-800">
                {groomName && brideName ? `${groomName.toUpperCase()} & ${brideName.toUpperCase()}` : coupleName.toUpperCase()}
              </div>
              <div className="text-sm text-gray-700 mb-3">אנו נרגשים ושמחים להזמינכם ליום חתונתנו</div>
              <div className="text-lg font-bold text-gray-800 mb-3">{eventDateFormatted !== '-' ? eventDateFormatted : eventDateShort}</div>
              {currentEvent.venue && (
                <div className="text-sm text-gray-600 mb-4">{currentEvent.venue}</div>
              )}
              {currentEvent.eventTime && (
                <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
                  <div>
                    <div className="font-semibold">חופה וקידושין</div>
                    <div>20:30</div>
                  </div>
                  <div>
                    <div className="font-semibold">קבלת פנים</div>
                    <div>{currentEvent.eventTime}</div>
                  </div>
                </div>
              )}
            </div>
          </div>
          
          {/* Event Image */}
          {currentEvent.invitationImageUrl && (
            <div className="mb-2 flex justify-center">
              <img 
                src={currentEvent.invitationImageUrl} 
                alt="תמונת האירוע"
                className="max-w-full max-h-96 object-contain rounded-lg shadow-xl"
              />
            </div>
          )}
            </div>
              </div>

      <div className="max-w-2xl mx-auto px-4 py-2">
        {/* RSVP Buttons */}
        {!showStatusButtons && !showGuestCount && !showConfirmButton ? (
          <div className="text-center mb-4">
            <div className="flex flex-wrap justify-center gap-4 mb-4">
              <button
                onClick={() => {
                  setFormData(prev => ({ ...prev, response: 'attending' }));
                  setShowStatusButtons(true);
                }}
                className="bg-green-600 text-white rounded-full px-8 py-4 font-bold text-lg shadow-lg hover:bg-green-700 transition-all transform hover:scale-105"
                style={{ borderRadius: '9999px' }}
              >
                נגיע
              </button>
              <button
                onClick={async () => {
                  const currentEvent = event || directEvent;
                  const currentGuest = guest || directGuest || finalGuest;
                  const guestIdToUse = currentGuest?.id || guestId;
                  
                  if (currentEvent && guestIdToUse) {
                    setIsSubmitting(true);
                    try {
                      let guestToUpdate = currentGuest;
                      if (!guestToUpdate && currentEvent.guests) {
                        guestToUpdate = currentEvent.guests.find((g: any) => g.id === guestIdToUse);
                      }
                      
                      if (guestToUpdate) {
                        // CRITICAL: Store the response status BEFORE showing success message
                        setSubmittedResponse('maybe');
                        setSubmittedGuestCount(1);
                        setFormData(prev => ({ ...prev, response: 'maybe', guestCount: 1 }));
                        
                        const updatedGuest = {
                          ...guestToUpdate,
                          guestCount: 1,
                          notes: formData.notes || '',
                          rsvpStatus: 'maybe' as const,
                          responseDate: new Date(),
                          actualAttendance: 'not_marked' as const,
                          source: 'guest_link'
                        };
                        await updateGuestResponse(currentEvent.id, guestIdToUse, updatedGuest);
                        setTimeout(() => {
                          const storeState = useEventStore.getState();
                          storeState.fetchEvents(false, true).catch(() => {});
                        }, 100);
                        setSubmitStatus('success');
                      }
                    } catch (error) {
                      console.error('Error:', error);
                      setSubmitStatus('error');
                    } finally {
                      setIsSubmitting(false);
                    }
                  } else {
                    setFormData(prev => ({ ...prev, response: 'maybe', guestCount: 1 }));
                    setShowStatusButtons(false);
                    setShowConfirmButton(true);
                  }
                }}
                disabled={isSubmitting}
                className="bg-white text-gray-800 border-2 border-gray-300 rounded-full px-8 py-4 font-bold text-lg shadow-lg hover:bg-gray-50 transition-all transform hover:scale-105 disabled:opacity-50"
                style={{ borderRadius: '9999px' }}
              >
                {isSubmitting ? 'שולח...' : 'אולי'}
              </button>
              <button
                onClick={async () => {
                  const currentEvent = event || directEvent;
                  const currentGuest = guest || directGuest || finalGuest;
                  const guestIdToUse = currentGuest?.id || guestId;
                  
                  if (currentEvent && guestIdToUse) {
                    setIsSubmitting(true);
                    try {
                      let guestToUpdate = currentGuest;
                      if (!guestToUpdate && currentEvent.guests) {
                        guestToUpdate = currentEvent.guests.find((g: any) => g.id === guestIdToUse);
                      }
                      
                      if (guestToUpdate) {
                        // CRITICAL: Store the response status BEFORE showing success message
                        setSubmittedResponse('not_attending');
                        setSubmittedGuestCount(1);
                        setFormData(prev => ({ ...prev, response: 'not_attending', guestCount: 1 }));
                        
                        const updatedGuest = {
                          ...guestToUpdate,
                          guestCount: 1,
                          notes: formData.notes || '',
                          rsvpStatus: 'declined' as const,
                          responseDate: new Date(),
                          actualAttendance: 'not_marked' as const,
                          source: 'guest_link'
                        };
                        await updateGuestResponse(currentEvent.id, guestIdToUse, updatedGuest);
                        setTimeout(() => {
                          const storeState = useEventStore.getState();
                          storeState.fetchEvents(false, true).catch(() => {});
                        }, 100);
                        setSubmitStatus('success');
                      }
                    } catch (error) {
                      console.error('Error:', error);
                      setSubmitStatus('error');
                    } finally {
                      setIsSubmitting(false);
                    }
                  } else {
                    setFormData(prev => ({ ...prev, response: 'not_attending', guestCount: 1 }));
                    setShowStatusButtons(false);
                    setShowConfirmButton(true);
                  }
                }}
                disabled={isSubmitting}
                className="bg-white text-gray-800 border-2 border-gray-300 rounded-full px-8 py-4 font-bold text-lg shadow-lg hover:bg-gray-50 transition-all transform hover:scale-105 disabled:opacity-50"
                style={{ borderRadius: '9999px' }}
              >
                {isSubmitting ? 'שולח...' : 'לא נוכל להגיע'}
              </button>
              </div>
          </div>
        ) : null}

        {/* Main Content */}
        <div className="bg-white rounded-2xl shadow-xl p-8 mb-6">
          {!showStatusButtons && !showGuestCount && !showConfirmButton ? (
            <div className="text-center">
              <button
                onClick={() => setShowStatusButtons(true)}
                className="bg-green-600 text-white rounded-lg px-8 py-4 font-bold text-lg shadow-lg hover:bg-green-700 transition-all transform hover:scale-105 mb-4"
              >
                לחצו כאן לבחירת כמות
                </button>
            </div>
          ) : !showGuestCount && !showConfirmButton ? (
            <div className="space-y-4">
              <div className="text-center mb-4">
                <button
                  onClick={() => setShowStatusButtons(false)}
                  className="text-gray-600 hover:text-gray-700 font-medium text-sm underline"
                >
                  ← חזרה
                </button>
              </div>
              <div className="flex flex-wrap justify-center gap-4 mb-6">
                <button
                  onClick={() => {
                    console.log('🟢 "מגיע" button clicked - showing guest count selection');
                    setFormData(prev => ({ ...prev, response: 'attending' }));
                    setShowGuestCount(true);
                  }}
                  className="bg-green-600 text-white rounded-full px-8 py-4 font-bold text-lg shadow-lg hover:bg-green-700 transition-all transform hover:scale-105"
                  style={{ borderRadius: '9999px' }}
                >
                  נגיע
                </button>
                
                <button
                  onClick={async () => {
                    const currentEvent = event || directEvent;
                    const currentGuest = guest || directGuest || finalGuest;
                    const guestIdToUse = currentGuest?.id || guestId;
                    
                    if (currentEvent && guestIdToUse) {
                      setIsSubmitting(true);
                      try {
                        let guestToUpdate = currentGuest;
                        if (!guestToUpdate && currentEvent.guests) {
                          guestToUpdate = currentEvent.guests.find((g: any) => g.id === guestIdToUse);
                        }
                        
                        if (guestToUpdate) {
                          // CRITICAL: Store the response status BEFORE showing success message
                          setSubmittedResponse('maybe');
                          setSubmittedGuestCount(1);
                        
                        const updatedGuest = {
                            ...guestToUpdate,
                          guestCount: 1,
                            notes: formData.notes || '',
                          rsvpStatus: 'maybe' as const,
                          responseDate: new Date(),
                          actualAttendance: 'not_marked' as const,
                            source: 'guest_link'
                        };
                          await updateGuestResponse(currentEvent.id, guestIdToUse, updatedGuest);
                        setTimeout(() => {
                            const storeState = useEventStore.getState();
                            storeState.fetchEvents(false, true).catch(() => {});
                        }, 100);
                        setSubmitStatus('success');
                        }
                      } catch (error) {
                        console.error('Error:', error);
                        setSubmitStatus('error');
                      } finally {
                        setIsSubmitting(false);
                      }
                    } else {
                      setFormData(prev => ({ ...prev, response: 'maybe', guestCount: 1 }));
                      setShowStatusButtons(false);
                      setShowConfirmButton(true);
                    }
                  }}
                  disabled={isSubmitting}
                  className="bg-white text-gray-800 border-2 border-gray-300 rounded-full px-8 py-4 font-bold text-lg shadow-lg hover:bg-gray-50 transition-all transform hover:scale-105 disabled:opacity-50"
                  style={{ borderRadius: '9999px' }}
                >
                  {isSubmitting ? 'שולח...' : 'אולי'}
                </button>
                
                <button
                  onClick={async () => {
                    const currentEvent = event || directEvent;
                    const currentGuest = guest || directGuest || finalGuest;
                    const guestIdToUse = currentGuest?.id || guestId;
                    
                    if (currentEvent && guestIdToUse) {
                      setIsSubmitting(true);
                      try {
                        let guestToUpdate = currentGuest;
                        if (!guestToUpdate && currentEvent.guests) {
                          guestToUpdate = currentEvent.guests.find((g: any) => g.id === guestIdToUse);
                        }
                        
                        if (guestToUpdate) {
                          // CRITICAL: Store the response status BEFORE showing success message
                          setSubmittedResponse('not_attending');
                          setSubmittedGuestCount(1);
                        
                        const updatedGuest = {
                          ...guestToUpdate,
                          guestCount: 1,
                            notes: formData.notes || '',
                          rsvpStatus: 'declined' as const,
                          responseDate: new Date(),
                          actualAttendance: 'not_marked' as const,
                            source: 'guest_link'
                        };
                        await updateGuestResponse(currentEvent.id, guestIdToUse, updatedGuest);
                        setTimeout(() => {
                            const storeState = useEventStore.getState();
                            storeState.fetchEvents(false, true).catch(() => {});
                        }, 100);
                        setSubmitStatus('success');
                        }
                      } catch (error) {
                        console.error('Error:', error);
                        setSubmitStatus('error');
                      } finally {
                        setIsSubmitting(false);
                      }
                    } else {
                      setFormData(prev => ({ ...prev, response: 'not_attending', guestCount: 1 }));
                      setShowStatusButtons(false);
                      setShowConfirmButton(true);
                    }
                  }}
                  disabled={isSubmitting}
                  className="bg-white text-gray-800 border-2 border-gray-300 rounded-full px-8 py-4 font-bold text-lg shadow-lg hover:bg-gray-50 transition-all transform hover:scale-105 disabled:opacity-50"
                  style={{ borderRadius: '9999px' }}
                >
                  {isSubmitting ? 'שולח...' : 'לא נוכל להגיע'}
                </button>
              </div>
            </div>
          ) : formData.response === 'attending' ? (
            <div className="space-y-6">
              <div className="text-center mb-4">
                <button
                  onClick={() => {
                    setShowGuestCount(false);
                    setShowStatusButtons(true);
                  }}
                  className="text-amber-600 hover:text-amber-700 font-medium text-sm underline"
                >
                  ← חזרה לבחירת סטטוס
                </button>
              </div>
              <div className="text-center">
                <h2 className="text-2xl font-bold text-gray-800 mb-2">
                  כמה אורחים מתכוונים להגיע?
                </h2>
                <p className="text-gray-600">
                  בחרו את מספר האורחים
                </p>
              </div>
              
              <div className="grid grid-cols-3 gap-3 max-w-lg mx-auto mb-4">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((count) => (
                  <button
                    key={count}
                    onClick={() => {
                      setFormData(prev => ({ ...prev, guestCount: count }));
                    }}
                    className={`border-2 rounded-xl px-4 py-3 text-gray-800 font-medium transition-all ${
                      formData.guestCount === count
                        ? 'bg-amber-500 border-amber-600 text-white shadow-lg scale-105'
                        : 'bg-white border-amber-200 hover:border-amber-300 hover:bg-amber-50'
                    }`}
                  >
                    <div className="text-xl font-bold">{count}</div>
                    <div className="text-xs">{count === 1 ? 'רק אני' : 'אנשים'}</div>
                  </button>
                ))}
              </div>
              
              {/* Custom number input */}
              <div className="max-w-lg mx-auto mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  או הזן מספר אחר:
                </label>
                <input
                  type="number"
                  min="1"
                  max="50"
                  value={formData.guestCount > 10 ? formData.guestCount : (formData.guestCount || '')}
                  onChange={(e) => {
                    const value = parseInt(e.target.value) || 1;
                    setFormData(prev => ({ ...prev, guestCount: Math.max(1, Math.min(50, value)) }));
                  }}
                  placeholder="מספר אורחים"
                  className="w-full px-4 py-2 border-2 border-amber-200 rounded-xl focus:border-amber-400 focus:outline-none text-center text-lg"
                />
              </div>
              
              {/* Notes field */}
              <div className="max-w-lg mx-auto mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  הערות (אופציונלי):
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="הוסף הערה או בקשה מיוחדת..."
                  rows={3}
                  className="w-full px-4 py-2 border-2 border-amber-200 rounded-xl focus:border-amber-400 focus:outline-none resize-none"
                />
              </div>
              
              {/* Submit button */}
              <div className="text-center">
                <button
                  onClick={() => {
                    setTimeout(() => {
                      handleSubmit({ preventDefault: () => {} } as any);
                    }, 300);
                  }}
                  className="bg-gradient-to-r from-amber-500 to-amber-600 text-white px-8 py-3 rounded-xl font-medium text-lg shadow-lg hover:from-amber-600 hover:to-amber-700 transition-all transform hover:scale-105"
                >
                  אישור - {formData.guestCount} {formData.guestCount === 1 ? 'אורח' : 'אורחים'}
                </button>
              </div>
              
              <div className="text-center mt-6">
                <button
                  onClick={() => {
                    setShowGuestCount(false);
                    setShowStatusButtons(true);
                  }}
                  className="text-amber-600 hover:text-amber-700 font-medium text-sm underline"
                >
                  ← חזרה לבחירת סטטוס
                </button>
              </div>
            </div>
          ) : showConfirmButton && (formData.response === 'maybe' || formData.response === 'not_attending') ? (
            // Show confirm button after selecting maybe/not_attending
            <div className="space-y-6">
              <div className="text-center mb-4">
                <button
                  onClick={() => {
                    setShowStatusButtons(true);
                    setShowGuestCount(false);
                    setShowConfirmButton(false);
                  }}
                  className="text-amber-600 hover:text-amber-700 font-medium text-sm underline mb-4 block"
                >
                  ← חזרה לבחירת סטטוס
                </button>
                <p className="text-xl font-bold text-gray-800 mb-2">
                  {formData.response === 'maybe' 
                    ? 'האם אתם מתלבטים?'
                    : 'האם אתם בטוחים שלא תוכלו להגיע?'}
                </p>
                <p className="text-base text-gray-600 mb-6">
                  {formData.response === 'maybe' 
                    ? 'נוכל לעדכן אותכם בהמשך אם יש שינוי'
                    : 'נשמח לעדכון אם יש שינוי בתכניות'}
                </p>
              </div>
              
              {/* Notes field */}
              <div className="max-w-lg mx-auto mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  הערות (אופציונלי):
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="הוסף הערה או בקשה מיוחדת..."
                  rows={3}
                  className="w-full px-4 py-2 border-2 border-amber-200 rounded-xl focus:border-amber-400 focus:outline-none resize-none"
                />
              </div>
              
              {/* Confirm button */}
              <div className="text-center">
                <button
                  onClick={async () => {
                    setIsSubmitting(true);
                    try {
                      await handleSubmit({ preventDefault: () => {} } as any);
                      // After successful submission, showConfirmButton will be reset by setSubmitStatus('success')
                    } catch (error) {
                      console.error('Error submitting:', error);
                    } finally {
                      setIsSubmitting(false);
                    }
                  }}
                  disabled={isSubmitting}
                  className="bg-gradient-to-r from-amber-500 to-amber-600 text-white px-12 py-4 rounded-xl font-bold text-lg shadow-lg hover:from-amber-600 hover:to-amber-700 transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? 'שולח...' : 'אישור'}
                </button>
              </div>
            </div>
          ) : null}
        </div>

        {/* Event Details and Actions */}
        <div className="bg-white rounded-2xl shadow-xl p-6 mb-4">
          {/* Navigation and Calendar Actions */}
          <div className="grid grid-cols-3 gap-4 mb-3">
            <a
              href={generateNavigationLink()}
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-col items-center justify-center p-4 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <div className="text-2xl mb-2">😊</div>
              <span className="text-sm font-medium text-gray-700">ניווט לאירוע</span>
            </a>
            <a
              href={generateCalendarLink()}
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-col items-center justify-center p-4 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <Calendar className="w-6 h-6 text-gray-700 mb-2" />
              <span className="text-sm font-medium text-gray-700">הוספה ליומן</span>
            </a>
            <div className="flex flex-col items-center justify-center p-4 rounded-lg">
              <Heart className="w-6 h-6 text-gray-700 mb-2" />
              <span className="text-sm font-medium text-gray-700">חתונה</span>
            </div>
          </div>

          {/* Event Timings and Parents Names */}
          <div className="mb-3 pb-3 border-b border-gray-200">
            {/* Event Timings */}
            {currentEvent.eventTime && (
              <div className="grid grid-cols-2 gap-4 mb-2">
                <div className="text-center">
                  <div className="font-semibold text-gray-800 mb-1">חופה וקידושין</div>
                  <div className="text-lg text-gray-600">20:30</div>
                </div>
                <div className="text-center">
                  <div className="font-semibold text-gray-800 mb-1">קבלת פנים</div>
                  <div className="text-lg text-gray-600">{currentEvent.eventTime}</div>
                </div>
              </div>
            )}
            
            {/* Parents Names - Always show, even if empty */}
            <div className="grid grid-cols-2 gap-4 text-sm mt-2">
              <div className="text-center">
                <div className="font-semibold text-gray-700 mb-1">הורי החתן</div>
                <div className="text-gray-600">{currentEvent.groomParentsName || '-'}</div>
              </div>
              <div className="text-center">
                <div className="font-semibold text-gray-700 mb-1">הורי הכלה</div>
                <div className="text-gray-600">{currentEvent.brideParentsName || '-'}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center text-sm text-gray-500 pb-8">
          <div className="mb-2">בס"ד אירועים</div>
          <div>אישורי הגעה וסידורי הושבה</div>
        </div>
      </div>
    </div>
  );
};

export default GuestResponse;
