import React, { useState, useEffect, useRef, useMemo, startTransition } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useEventStore } from '../store/eventStore';
import { calculateEventStats, formatDate, getStatusColor } from '../utils/helpers';
import { webhookService } from '../services/webhookService';
import * as XLSX from 'xlsx';
import ExcelJS from 'exceljs';
// import ExcelJS from 'exceljs';
import { 
  ArrowRight, 
  Users, 
  Plus, 
  Upload, 
  Download, 
  Search, 
  CheckCircle,
  XCircle,
  MessageSquare,
  Phone,
  Edit,
  Trash2,
  Save,
  Send,
  X,
  RefreshCw,
  ChevronDown,
  FileSpreadsheet
} from 'lucide-react';
import SyncMonitoringPanel from './SyncMonitoringPanel';

const EventManagement: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  // CRITICAL: Use specific selectors to ensure React detects changes
  // This ensures the component re-renders when the specific event changes
  // CRITICAL: Subscribe to events array length AND a version counter to force re-renders
  const events = useEventStore(state => state.events);
  const currentEvent = useEventStore(state => state.currentEvent);
  // CRITICAL: Also subscribe to a computed value that changes when events change
  // This ensures the component re-renders even if events array reference doesn't change
  // CRITICAL: Include responseDate timestamp to catch all updates
  const eventsHash = useEventStore(state => {
    // Create a hash from events that changes when any event or guest changes
    return state.events.map(e => {
      const guestsHash = e.guests?.map(g => {
        try {
          let responseDateValue = '';
          if (g.responseDate) {
            const date = g.responseDate instanceof Date ? g.responseDate : new Date(g.responseDate);
            responseDateValue = isNaN(date.getTime()) ? '' : String(date.getTime());
          }
          // CRITICAL: Include ALL fields that might change
          return `${g.id}:${g.rsvpStatus}:${g.guestCount}:${g.actualAttendance}:${g.tableId || ''}:${g.notes || ''}:${responseDateValue}`;
        } catch (error) {
          return `${g.id}:${g.rsvpStatus}:${g.guestCount}:${g.actualAttendance}:${g.tableId || ''}:${g.notes || ''}:`;
        }
      }).join('|') || '';
      const eventUpdatedAt = e.updatedAt ? (e.updatedAt instanceof Date ? e.updatedAt.getTime() : new Date(e.updatedAt).getTime()) : 0;
      return `${e.id}:${eventUpdatedAt}:${guestsHash}`;
    }).join('||');
  });
  const setCurrentEvent = useEventStore(state => state.setCurrentEvent);
  const addGuest = useEventStore(state => state.addGuest);
  const updateGuest = useEventStore(state => state.updateGuest);
  const deleteGuest = useEventStore(state => state.deleteGuest);
  const fetchEvents = useEventStore(state => state.fetchEvents);
  const assignGuestToTable = useEventStore(state => state.assignGuestToTable);
  const removeGuestFromTable = useEventStore(state => state.removeGuestFromTable);
  const moveGuestToTable = useEventStore(state => state.moveGuestToTable);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [showAddGuest, setShowAddGuest] = useState(false);
  const [editingGuest, setEditingGuest] = useState<any>(null);
  const [modalSearchTerm, setModalSearchTerm] = useState('');
  const [showImportModal, setShowImportModal] = useState(false);
  const [showSendMessageModal, setShowSendMessageModal] = useState(false);
  const [selectedGuests, setSelectedGuests] = useState<string[]>([]);
  const [messageChannel, setMessageChannel] = useState<'whatsapp' | 'sms'>('whatsapp');
  const [customMessage, setCustomMessage] = useState('');
  const [newGuest, setNewGuest] = useState({
    firstName: '',
    lastName: '',
    phoneNumber: '',
    guestCount: 1,
    notes: ''
  });
  const [showExportMenu, setShowExportMenu] = useState(false);
  const exportMenuRef = useRef<HTMLDivElement>(null);

  // Close export menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(event.target as Node)) {
        setShowExportMenu(false);
      }
    };

    if (showExportMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showExportMenu]);

  // Load events when component mounts or id changes, and auto-refresh for real-time sync
  // Using startTransition to make updates smooth and non-blocking
  useEffect(() => {
    if (!id) return;
    
    // Initial fetch
    fetchEvents().catch(error => {
      console.error('❌ Error initial fetch:', error);
    });
    
    // CRITICAL: Start webhookService to receive updates from guest links and WhatsApp
    // This ensures EventManagement receives real-time updates from backend
    if (!webhookService.pollingActive) {
      console.log('🔄 Starting webhookService for EventManagement...');
      webhookService.startPolling(3000); // Poll every 3 seconds for faster updates
    }
    
    // Auto-refresh events every 5 seconds for real-time sync between devices
    // Using startTransition and silent mode to make updates smooth and non-blocking
    // Reduced frequency to prevent excessive updates that cause infinite loops
    const intervalId = setInterval(() => {
      console.log('🔄 Auto-refreshing events for real-time sync (silent mode)...');
      startTransition(() => {
        // Use silent: true to prevent isLoading updates that cause visual jumps
        fetchEvents(false, true).catch(error => {
        console.error('❌ Error auto-refreshing events:', error);
      });
      });
    }, 5000); // Refresh every 5 seconds to reduce unnecessary updates

    return () => {
      clearInterval(intervalId);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]); // Removed fetchEvents from deps to prevent infinite loop

  // CRITICAL: Track last guests key to detect changes
  const lastGuestsKeyRef = useRef<string>('');
  const lastEventIdRef = useRef<string>('');
  const lastEventUpdatedAtRef = useRef<string>('');
  
  // CRITICAL: Single useEffect to update currentEvent when events array changes
  // This ensures UI updates immediately when guest status changes via link or WhatsApp buttons
  useEffect(() => {
    if (!id) return;
    
    // Wait a bit for events to load if they're empty
    if (events.length === 0) {
      return;
    }
    
    const event = events.find(e => e.id === id);
    if (!event) {
      // Event not found - redirect after a short delay to allow events to load
      const timeout = setTimeout(() => {
        // Use events from closure instead of getState() to avoid React hooks issues
        if (events.length > 0 && !events.find(e => e.id === id)) {
          console.warn('⚠️ Event not found after loading, redirecting to dashboard');
          navigate('/');
        }
      }, 2000);
      return () => clearTimeout(timeout);
    }
    
    // CRITICAL: Only process if this is the event being viewed (from URL)
    // This ensures we don't override currentEvent when an update occurs for a different event
    if (event.id !== id) {
      return; // Skip processing for other events
    }
    
    // CRITICAL: If event ID changed, reset the tracking refs
    if (lastEventIdRef.current !== id) {
      lastEventIdRef.current = id;
      lastGuestsKeyRef.current = ''; // Reset to force update
      lastEventUpdatedAtRef.current = '';
    }
    
    // CRITICAL: Check if event was actually updated (by updatedAt timestamp)
    // This prevents unnecessary updates when events array is recreated but content is the same
    const eventUpdatedAt = event.updatedAt ? (event.updatedAt instanceof Date ? event.updatedAt.getTime() : new Date(event.updatedAt).getTime()) : 0;
    const lastEventUpdatedAt = lastEventUpdatedAtRef.current ? (typeof lastEventUpdatedAtRef.current === 'string' ? new Date(lastEventUpdatedAtRef.current).getTime() : lastEventUpdatedAtRef.current instanceof Date ? lastEventUpdatedAtRef.current.getTime() : Number(lastEventUpdatedAtRef.current) || 0) : 0;
    const eventActuallyUpdated = eventUpdatedAt !== lastEventUpdatedAt;
    
    // Create a key from guests to detect changes
    // CRITICAL: Include responseDate to detect updates even if status doesn't change
    const newGuestsKey = event.guests?.map(g => {
      try {
        let responseDateValue = '';
        if (g.responseDate) {
          const date = g.responseDate instanceof Date ? g.responseDate : new Date(g.responseDate);
          responseDateValue = isNaN(date.getTime()) ? '' : String(date.getTime());
        }
        // CRITICAL: Include ALL fields that might change
        return `${g.id}:${g.rsvpStatus}:${g.guestCount}:${g.actualAttendance}:${g.tableId || ''}:${g.notes || ''}:${responseDateValue}`;
      } catch (error) {
        return `${g.id}:${g.rsvpStatus}:${g.guestCount}:${g.actualAttendance}:${g.tableId || ''}:${g.notes || ''}:`;
      }
    }).join('|') || '';
    
    // CRITICAL: Only update if guests actually changed OR event was updated OR event changed
    // This prevents infinite loops when events array is recreated but content is the same
    // CRITICAL: Get currentEvent from store state instead of closure to avoid stale closure issues
    const storeCurrentEvent = useEventStore.getState().currentEvent;
    const guestsChanged = newGuestsKey !== lastGuestsKeyRef.current;
    const eventChanged = !storeCurrentEvent || storeCurrentEvent.id !== event.id;
    
    // CRITICAL: Log all conditions for debugging (but only when something changed to avoid spam)
    if (guestsChanged || eventChanged || eventActuallyUpdated) {
      console.log('🔍 EventManagement useEffect conditions:', {
        eventId: event.id,
        urlId: id,
        guestsChanged,
        eventChanged,
        eventActuallyUpdated,
        newGuestsKeyLength: newGuestsKey.length,
        lastGuestsKeyLength: lastGuestsKeyRef.current.length,
        eventUpdatedAt: eventUpdatedAt,
        lastEventUpdatedAt: lastEventUpdatedAt
      });
    }
    
    // CRITICAL: Only update currentEvent if this is the event from the URL (id)
    // This ensures we don't override currentEvent when an update occurs for a different event
    // CRITICAL: Only update if something actually changed to prevent infinite loops
    // Remove the "|| !currentEvent || currentEvent.id !== id" part to prevent infinite loops
    const shouldUpdate = event.id === id && (guestsChanged || eventChanged || eventActuallyUpdated);
    if (shouldUpdate) {
      if (guestsChanged) {
        console.log('🔄 Guests changed detected in events array, updating currentEvent immediately');
      console.log('📊 Event guests:', event.guests?.map(g => ({ id: g.id, status: g.rsvpStatus, count: g.guestCount })));
        if (storeCurrentEvent?.guests) {
          const oldStatus = storeCurrentEvent.guests.find(g => g.id === event.guests?.[0]?.id)?.rsvpStatus;
          const newStatus = event.guests?.find(g => g.id === event.guests?.[0]?.id)?.rsvpStatus;
          console.log('📊 Old status:', oldStatus);
          console.log('📊 New status:', newStatus);
        }
      }
      
      // CRITICAL: Always create new object reference with new guest array references to force React re-render
      // This ensures the table updates immediately when guest status changes
      const newCurrentEvent = { 
        ...event,
        guests: event.guests ? event.guests.map(g => ({ ...g })) : [] // New array and new object references
      };
      setCurrentEvent(newCurrentEvent);
      console.log('✅ Updated currentEvent in EventManagement useEffect:', newCurrentEvent.id, 'guests:', newCurrentEvent.guests.length);
      
      // Update refs AFTER setting state to prevent infinite loops
      lastGuestsKeyRef.current = newGuestsKey;
      lastEventUpdatedAtRef.current = String(eventUpdatedAt); // Convert to string for comparison
    }
    // CRITICAL: Do NOT include currentEvent in dependencies to prevent infinite loop
    // The useEffect should only run when events array changes, not when currentEvent changes
  }, [id, events, setCurrentEvent, navigate]); // Removed currentEvent to prevent infinite loop

  // CRITICAL: Track the event's guests key to detect changes without depending on entire events array
  const eventGuestsKeyRef = useRef<string>('');
  const lastEventIdRef2 = useRef<string>('');
  
  // CRITICAL: Get the current event from the store
  // Use a ref to track the event and only update when id changes or event is actually different
  const currentEventFromStoreRef = useRef<any>(null);
  
  // CRITICAL: Track events array version to force re-calculation when events change
  // Use a simple counter that increments when events array changes
  const [eventsVersion, setEventsVersion] = useState(0);
  const lastEventsLengthRef = useRef<number>(0);
  const lastEventsKeyRef = useRef<string>('');
  const lastEventsHashRef = useRef<string>('');
  
  // CRITICAL: Update eventsVersion when events array changes (any event, not just current)
  // This triggers guestsToDisplay to recalculate without circular dependencies
  // CRITICAL: Also use eventsHash from Zustand store to detect changes
  useEffect(() => {
    console.log('🔄 EventManagement useEffect for eventsVersion - events.length:', events.length, 'eventsHash length:', eventsHash.length);
    
    // Create a comprehensive key from events that includes guest data to detect ALL changes
    // This ensures we catch updates even if they're for a different event
    // CRITICAL: Include responseDate in the key to catch timestamp changes
    const eventsKey = events.map(e => {
      const guestsKey = e.guests?.map(g => {
        try {
          let responseDateValue = '';
          if (g.responseDate) {
            const date = g.responseDate instanceof Date ? g.responseDate : new Date(g.responseDate);
            responseDateValue = isNaN(date.getTime()) ? '' : String(date.getTime());
          }
          // CRITICAL: Include ALL guest fields that might change to ensure we catch updates
          return `${g.id}:${g.rsvpStatus}:${g.guestCount}:${g.actualAttendance}:${g.tableId || ''}:${g.notes || ''}:${responseDateValue}`;
        } catch (error) {
          return `${g.id}:${g.rsvpStatus}:${g.guestCount}:${g.actualAttendance}:${g.tableId || ''}:${g.notes || ''}:`;
        }
      }).join('|') || '';
      // CRITICAL: Include updatedAt timestamp to catch any event updates
      const eventUpdatedAt = e.updatedAt ? (e.updatedAt instanceof Date ? e.updatedAt.getTime() : new Date(e.updatedAt).getTime()) : 0;
      return `${e.id}:${eventUpdatedAt}:${e.guests?.length || 0}:${guestsKey}`;
    }).join('||');
    
    // CRITICAL: Also check eventsHash from Zustand store
    // This ensures we catch changes even if the events array reference doesn't change
    const combinedKey = `${eventsKey}-${eventsHash}`;
    
    console.log('📊 Events key calculated, length:', events.length, 'lastLength:', lastEventsLengthRef.current);
    console.log('📊 Events key matches:', eventsKey === lastEventsKeyRef.current ? 'YES' : 'NO');
    console.log('📊 EventsHash matches:', eventsHash === lastEventsHashRef.current ? 'YES' : 'NO');
    console.log('📊 Combined key matches:', combinedKey === `${lastEventsKeyRef.current}-${lastEventsHashRef.current}` ? 'YES' : 'NO');
    
    // Update if events length changed, events key changed, or eventsHash changed
    if (events.length !== lastEventsLengthRef.current || 
        eventsKey !== lastEventsKeyRef.current || 
        eventsHash !== lastEventsHashRef.current) {
      lastEventsLengthRef.current = events.length;
      lastEventsKeyRef.current = eventsKey;
      lastEventsHashRef.current = eventsHash;
      setEventsVersion(prev => {
        const newVersion = prev + 1;
        console.log('🔄 Events array changed, incrementing eventsVersion to:', newVersion);
        console.log('📊 Events key or hash changed - this will trigger guestsToDisplay recalculation');
        console.log('📊 Event IDs in store:', events.map(e => `${e.id}(${e.guests?.length || 0} guests)`).join(', '));
        // CRITICAL: Log guest statuses to help debug
        events.forEach(e => {
          if (e.guests && e.guests.length > 0) {
            console.log(`📊 Event ${e.id} guests:`, e.guests.map(g => `${g.firstName} ${g.lastName}: ${g.rsvpStatus}`).join(', '));
          }
        });
        return newVersion;
      });
    } else {
      // Log when events array is checked but no change detected
      console.log('ℹ️ Events array checked - no changes detected (length:', events.length, ', key matches, hash matches)');
    }
  }, [events, eventsHash]); // Include eventsHash to detect changes from Zustand store
  
  // Update the ref when id or events change, but only if the event actually changed
  useEffect(() => {
    if (!id) {
      currentEventFromStoreRef.current = null;
      return;
    }
    
    const event = events.find(e => e.id === id);
    if (event) {
      // Create a key from guests to detect changes (including status, count, responseDate)
      const currentGuestsKey = currentEventFromStoreRef.current?.guests?.map(g => 
        `${g.id}:${g.rsvpStatus}:${g.guestCount}:${g.responseDate ? new Date(g.responseDate).getTime() : ''}`
      ).join('|') || '';
      const newGuestsKey = event.guests?.map(g => 
        `${g.id}:${g.rsvpStatus}:${g.guestCount}:${g.responseDate ? new Date(g.responseDate).getTime() : ''}`
      ).join('|') || '';
      
      // Update if event ID changed, event was updated, guests changed, or guests key changed
      if (lastEventIdRef2.current !== id || 
          currentEventFromStoreRef.current?.updatedAt !== event.updatedAt ||
          currentEventFromStoreRef.current?.guests?.length !== event.guests?.length ||
          currentGuestsKey !== newGuestsKey) {
        currentEventFromStoreRef.current = event;
        lastEventIdRef2.current = id;
        console.log('🔄 Updated currentEventFromStoreRef for event:', id, 'guests:', event.guests?.length || 0);
      }
    } else {
      currentEventFromStoreRef.current = null;
    }
  }, [id, events]);
  
  // Use the ref value in a stable way
  const currentEventFromStore = currentEventFromStoreRef.current;
  
  // CRITICAL: All hooks must be before any conditional returns
  // Get guests from store - ALWAYS use events array to ensure we get the latest data
  // Use useMemo with minimal dependencies to avoid React #310 errors
  const guestsToDisplay = useMemo(() => {
    console.log('🔄 guestsToDisplay useMemo recalculating - id:', id, 'eventsVersion:', eventsVersion, 'events.length:', events.length, 'eventsHash length:', eventsHash.length);
    
    // CRITICAL: Use events from props (from Zustand subscription) instead of getState()
    // This ensures React detects changes when events array updates
    // The events array is subscribed via useEventStore(state => state.events) at the top
    const currentEvents = events;
    console.log('📊 Current events in store (from props):', currentEvents.length, 'events');
    
    // CRITICAL: Always get directly from events array (most up-to-date)
    // Don't rely on currentEventFromStore ref as it might be stale
    // This ensures we always get the latest data, even if update was for a different event
    let event = currentEvents.find(e => e.id === id) || null;
    console.log('📊 Found event in store:', event ? `${event.id} with ${event.guests?.length || 0} guests` : 'NOT FOUND');
    
    // Log all guest statuses for debugging
    if (event?.guests) {
      console.log('📊 Event guests statuses:', event.guests.map(g => `${g.firstName} ${g.lastName}: ${g.rsvpStatus}`).join(', '));
    }
    
    // Fallback to currentEventFromStore if event not found in array
    if (!event) {
      event = currentEventFromStore;
      console.log('📊 Using currentEventFromStore fallback:', event ? `${event.id} with ${event.guests?.length || 0} guests` : 'NOT FOUND');
    }
    
    // Final fallback to currentEvent if it matches the ID
    if (!event && currentEvent && currentEvent.id === id) {
      event = currentEvent;
      console.log('📊 Using currentEvent fallback:', event ? `${event.id} with ${event.guests?.length || 0} guests` : 'NOT FOUND');
    }
    
    if (event?.guests && Array.isArray(event.guests) && event.guests.length > 0) {
      console.log('📊 Using guests from events array (most up-to-date):', event.guests.length);
      // CRITICAL: Create deep copy with new object references to ensure React detects changes
      // ALWAYS create new object references, even if data appears unchanged
      // This forces React to re-render when eventsVersion changes
      // CRITICAL: Force new object references by adding a unique key based on eventsHash
      const guests = event.guests.map((g, index) => {
        try {
          // CRITICAL: Always create a completely new object with all properties spread
          // This ensures React sees this as a new object reference, triggering re-render
          // CRITICAL: Add a unique key based on eventsHash to force new reference
          const guestCopy = {
            ...g,
            responseDate: g.responseDate ? (typeof g.responseDate === 'string' ? new Date(g.responseDate) : g.responseDate instanceof Date ? g.responseDate : undefined) : undefined,
            // CRITICAL: Add a unique key to force new object reference
            _forceUpdate: eventsHash.substring(0, 10) + eventsVersion
          };
          // Remove any internal properties that shouldn't be in the final object
          delete (guestCopy as any)._updateTimestamp;
          delete (guestCopy as any)._renderKey;
          // Keep _forceUpdate for now to ensure React detects the change
          return guestCopy;
        } catch (error) {
          console.warn('⚠️ Error processing guest responseDate:', error, g);
          const guestCopy = { 
            ...g, 
            responseDate: undefined,
            _forceUpdate: eventsHash.substring(0, 10) + eventsVersion
          };
          delete (guestCopy as any)._updateTimestamp;
          delete (guestCopy as any)._renderKey;
          return guestCopy;
        }
      });
      
      // Update the ref to track changes
      const newKey = guests.map(g => 
        `${g.id}:${g.rsvpStatus}:${g.guestCount}:${g.actualAttendance}:${g.tableId}:${g.notes || ''}:${g.responseDate ? (g.responseDate instanceof Date ? g.responseDate.getTime() : new Date(g.responseDate).getTime()) : ''}`
      ).join('|');
      
      if (newKey !== eventGuestsKeyRef.current) {
        console.log('📊 Guests data changed:', guests.map(g => ({
          id: g.id,
          name: `${g.firstName} ${g.lastName}`,
          status: g.rsvpStatus,
          count: g.guestCount,
          responseDate: g.responseDate ? (g.responseDate instanceof Date ? g.responseDate.toISOString() : String(g.responseDate)) : 'none'
        })));
        eventGuestsKeyRef.current = newKey;
      }
      
      // CRITICAL: Always return a new array reference, even if contents are the same
      // This ensures React detects changes when eventsVersion increments
      // CRITICAL: Also include eventsHash in the array to force new reference
      return [...guests];
    }
    
    // Only log warning if we have events but not for this ID
    if (currentEvents.length > 0) {
      console.log('⚠️ No guests found for event:', id, '- Event exists:', !!currentEvents.find(e => e.id === id));
    }
    return [];
    // CRITICAL: Dependencies include id, eventsVersion, events.length, eventsHash, AND events array itself
    // This ensures guestsToDisplay recalculates when events array changes
    // eventsVersion is updated when events array changes, triggering re-calculation
    // events.length ensures we catch when events are added/removed
    // eventsHash ensures we catch when guest data changes within events (from Zustand subscription)
    // events array itself ensures we catch when the array reference changes (from Zustand store update)
    // CRITICAL: Include events array to ensure we detect changes even if eventsVersion doesn't update
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, eventsVersion, events.length, eventsHash, events]);
  
  // CRITICAL: Use the ref value as guestsKey to avoid React #310 errors
  // The ref is updated inside guestsToDisplay useMemo, so it's always in sync
  const guestsKey = eventGuestsKeyRef.current || 'empty';
  
  // CRITICAL: Force re-render when guestsKey changes by using it as a dependency
  // This ensures the table updates immediately when any guest data changes
  const [forceUpdate, setForceUpdate] = useState(0);
  const lastGuestsKeyForUpdate = useRef<string>('');
  
  useEffect(() => {
    try {
      if (guestsKey !== lastGuestsKeyForUpdate.current) {
        const keyPreview = guestsKey && typeof guestsKey === 'string' ? guestsKey.substring(0, 50) : String(guestsKey);
        console.log('🔄 guestsKey changed, forcing re-render:', keyPreview);
        lastGuestsKeyForUpdate.current = guestsKey;
        setForceUpdate(prev => {
          const newValue = prev + 1;
          console.log('🔄 forceUpdate incremented to:', newValue);
          return newValue;
        });
      }
    } catch (error) {
      console.warn('⚠️ Error in guestsKey useEffect:', error);
    }
  }, [guestsKey]);
  
  // CRITICAL: Also listen to eventsHash changes to force re-render
  // This ensures the table updates when events array changes, even if guestsKey doesn't change
  const lastEventsHashForUpdate = useRef<string>('');
  useEffect(() => {
    if (eventsHash !== lastEventsHashForUpdate.current) {
      console.log('🔄 eventsHash changed, forcing re-render - hash length:', eventsHash.length);
      lastEventsHashForUpdate.current = eventsHash;
      setForceUpdate(prev => {
        const newValue = prev + 1;
        console.log('🔄 forceUpdate incremented to (from eventsHash):', newValue);
        return newValue;
      });
    }
  }, [eventsHash]);
  
  // CRITICAL: Listen to guestsKey changes to force re-render
  // This ensures we catch updates immediately when guest data changes
  // CRITICAL: Use guestsKey instead of guestsToDisplay to avoid React #310 errors
  useEffect(() => {
    try {
      const eventId = currentEvent?.id || id || 'unknown';
      console.log('🔄 EVENT_MANAGEMENT: Guests changed, forcing update');
      console.log('📊 EVENT_MANAGEMENT: CurrentEvent ID:', eventId);
      console.log('📊 EVENT_MANAGEMENT: Events count:', events.length);
      console.log('📊 EVENT_MANAGEMENT: Guests to display:', guestsToDisplay?.length || 0);
      if (guestsToDisplay && guestsToDisplay.length > 0) {
        console.log('📊 EVENT_MANAGEMENT: Sample guest statuses:', guestsToDisplay.slice(0, 3).map(g => {
          try {
            let responseDateStr = 'none';
            if (g.responseDate) {
              const date = g.responseDate instanceof Date ? g.responseDate : new Date(g.responseDate);
              responseDateStr = isNaN(date.getTime()) ? 'invalid' : date.toISOString();
            }
            return {
              name: `${g.firstName} ${g.lastName}`,
              status: g.rsvpStatus,
              count: g.guestCount,
              responseDate: responseDateStr
            };
          } catch (error) {
            return {
              name: `${g.firstName} ${g.lastName}`,
              status: g.rsvpStatus,
              count: g.guestCount,
              responseDate: 'error'
            };
          }
        }));
      }
      setForceUpdate(prev => prev + 1);
    } catch (error) {
      console.warn('⚠️ Error in EVENT_MANAGEMENT useEffect:', error);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [guestsKey, id, events.length]); // Removed currentEvent?.id to prevent unnecessary re-renders
  
  // CRITICAL: Track last events array key to detect ANY changes (not just current event)
  const lastEventsArrayKeyRef = useRef<string>('');
  
  // CRITICAL: Also listen to events array changes directly (from local state)
  // This ensures we catch updates even if store subscription doesn't fire
  // MUST be before any return statement
  // CRITICAL: Use a more comprehensive check to detect ALL changes in events array
  useEffect(() => {
    console.log('🔄 Events array changed, checking for guest updates');
    
    // CRITICAL: Create a key from ALL events to detect ANY changes in the events array
    // This ensures we catch updates even if they're for a different event
    const allEventsKey = events.map(e => {
      const guestsKey = e.guests?.map(g => {
        try {
          let responseDateValue = '';
          if (g.responseDate) {
            const date = g.responseDate instanceof Date ? g.responseDate : new Date(g.responseDate);
            responseDateValue = isNaN(date.getTime()) ? '' : String(date.getTime());
          }
          return `${g.id}:${g.rsvpStatus}:${g.guestCount}:${g.actualAttendance}:${g.tableId}:${g.notes || ''}:${responseDateValue}`;
        } catch (error) {
          return `${g.id}:${g.rsvpStatus}:${g.guestCount}:${g.actualAttendance}:${g.tableId}:${g.notes || ''}:`;
        }
      }).join('|') || '';
      return `${e.id}:${e.updatedAt || ''}:${guestsKey}`;
    }).join('||');
    
    // Check if events array changed at all
    if (allEventsKey !== lastEventsArrayKeyRef.current) {
      console.log('🔄 Events array changed (any event), updating guestsToDisplay');
      lastEventsArrayKeyRef.current = allEventsKey;
      
      // CRITICAL: eventsVersion is already updated by the other useEffect
      // This useEffect just updates currentEvent if needed
      
      // Also update currentEvent if it's the one being viewed
      const event = events.find(e => e.id === id);
      if (event && event.guests) {
        const eventGuestsKey = event.guests.map(g => {
          try {
            let responseDateValue = '';
            if (g.responseDate) {
              const date = g.responseDate instanceof Date ? g.responseDate : new Date(g.responseDate);
              responseDateValue = isNaN(date.getTime()) ? '' : String(date.getTime());
            }
            return `${g.id}:${g.rsvpStatus}:${g.guestCount}:${g.actualAttendance}:${g.tableId}:${g.notes || ''}:${responseDateValue}`;
          } catch (error) {
            return `${g.id}:${g.rsvpStatus}:${g.guestCount}:${g.actualAttendance}:${g.tableId}:${g.notes || ''}:`;
          }
        }).join('|');
        
        if (eventGuestsKey !== lastGuestsKeyRef.current) {
          console.log('🔄 Current event guests changed, updating currentEvent');
          lastGuestsKeyRef.current = eventGuestsKey;
          setForceUpdate(prev => prev + 1);
          
          // CRITICAL: Also update currentEvent to ensure it matches the latest data
          const newCurrentEvent = { 
            ...event,
            guests: event.guests ? event.guests.map(g => ({ ...g })) : []
          };
          setCurrentEvent(newCurrentEvent);
          console.log('✅ Updated currentEvent from events array change:', newCurrentEvent.id, 'guests:', newCurrentEvent.guests.length);
        }
      }
    } else {
      console.log('ℹ️ Events array key unchanged, no update needed');
    }
  }, [id, events, setCurrentEvent]);

  // Early return after ALL hooks (no hooks after this point!)
  if (!currentEvent) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12  border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const stats = calculateEventStats(currentEvent);
  
  // CRITICAL: Use useMemo to ensure filteredGuests updates when guestsToDisplay changes
  // This ensures the table updates immediately when guest data changes
  // CRITICAL: Include forceUpdate to force recalculation when guests change
  const filteredGuests = useMemo(() => {
    console.log('🔄 Recalculating filteredGuests - guestsToDisplay length:', guestsToDisplay?.length || 0, 'forceUpdate:', forceUpdate, 'eventsVersion:', eventsVersion, 'eventsHash length:', eventsHash.length);
    const filtered = guestsToDisplay.filter(guest => {
      const matchesSearch = 
        guest.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (guest.lastName && guest.lastName.toLowerCase().includes(searchTerm.toLowerCase())) ||
        guest.phoneNumber.includes(searchTerm);
      
      const matchesFilter = filterStatus === 'all' || guest.rsvpStatus === filterStatus;
      
      return matchesSearch && matchesFilter;
    });
    console.log('📊 Filtered guests result:', filtered.length, 'guests');
    if (filtered.length > 0) {
      console.log('📊 Filtered guest statuses:', filtered.map(g => `${g.firstName} ${g.lastName}: ${g.rsvpStatus}`).join(', '));
    }
    return filtered;
  }, [guestsToDisplay, searchTerm, filterStatus, forceUpdate, eventsVersion, eventsHash]);

  // Filter guests for modal search
  const modalFilteredGuests = (currentEvent.guests || []).filter(guest => 
      guest.firstName.toLowerCase().includes(modalSearchTerm.toLowerCase()) ||
      (guest.lastName && guest.lastName.toLowerCase().includes(modalSearchTerm.toLowerCase())) ||
    guest.phoneNumber.includes(modalSearchTerm)
  );
  

  const handleAddGuest = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('🔍 handleAddGuest called with:', newGuest);
    console.log('🔍 currentEvent.id:', currentEvent?.id);
    
    if (!newGuest.firstName || !newGuest.phoneNumber) {
      console.log('❌ Missing required fields');
      return;
    }

    try {
      console.log('📤 Calling addGuest...');
      await addGuest(currentEvent.id, {
        ...newGuest,
        lastName: '', // שם משפחה לא נדרש יותר
        rsvpStatus: 'pending',
        channel: 'whatsapp', // ברירת מחדל - WhatsApp
        actualAttendance: 'not_marked'
      });
      
      console.log('✅ addGuest completed successfully');
      
      setNewGuest({
        firstName: '',
        lastName: '',
        phoneNumber: '',
        guestCount: 1,
        notes: ''
      });
      setShowAddGuest(false);
    } catch (error) {
      console.error('❌ Error adding guest:', error);
    }
  };

  const handleEditGuest = (guest: any) => {
    setEditingGuest(guest);
    setNewGuest({
      firstName: guest.firstName,
      lastName: guest.lastName,
      phoneNumber: guest.phoneNumber,
      guestCount: guest.guestCount,
      notes: guest.notes || ''
    });
  };

  const handleUpdateGuest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingGuest || !newGuest.firstName || !newGuest.phoneNumber) {
      return;
    }

    try {
      console.log('🎯 handleUpdateGuest called:', { 
        guestId: editingGuest.id, 
        updates: {
          firstName: newGuest.firstName,
          lastName: newGuest.lastName,
          phoneNumber: newGuest.phoneNumber,
          guestCount: newGuest.guestCount,
          notes: newGuest.notes
        },
        eventId: currentEvent.id 
      });
      
      // Update in store first
      await updateGuest(currentEvent.id, editingGuest.id, {
        firstName: newGuest.firstName,
        lastName: newGuest.lastName,
        phoneNumber: newGuest.phoneNumber,
        guestCount: newGuest.guestCount,
        notes: newGuest.notes
      });
      
      // CRITICAL: Get updated currentEvent from store immediately after update
      // This ensures the UI updates instantly with the latest data from store
      const storeState = useEventStore.getState();
      const updatedEvent = storeState.currentEvent;
      if (updatedEvent && updatedEvent.id === currentEvent.id) {
        setCurrentEvent(updatedEvent);
        console.log('✅ handleUpdateGuest - currentEvent updated immediately from store (name/phone/notes)');
      }
      
      setEditingGuest(null);
      setNewGuest({
        firstName: '',
        lastName: '',
        phoneNumber: '',
        guestCount: 1,
        notes: ''
      });
    } catch (error) {
      console.error('Error updating guest:', error);
    }
  };

  const handleUpdateGuestStatus = async (guestId: string, status: string) => {
    try {
      console.log('🎯 handleUpdateGuestStatus called:', { guestId, status, eventId: currentEvent.id });
      
      // Update in store first
      await updateGuest(currentEvent.id, guestId, {
        rsvpStatus: status as any,
        responseDate: new Date()
      });
      
      // CRITICAL: Get updated event from store immediately after update
      // First try to get from currentEvent, then from events array
      const storeState = useEventStore.getState();
      let updatedEvent = storeState.currentEvent;
      
      // If currentEvent doesn't match or is null, get from events array
      if (!updatedEvent || updatedEvent.id !== currentEvent.id) {
        updatedEvent = storeState.events.find(e => e.id === currentEvent.id) || null;
      }
      
      if (updatedEvent && updatedEvent.id === currentEvent.id) {
        // Create new object reference to force React re-render
        const updatedEventWithNewRef = {
          ...updatedEvent,
          guests: updatedEvent.guests ? updatedEvent.guests.map(g => ({ ...g })) : []
        };
        setCurrentEvent(updatedEventWithNewRef);
        console.log('✅ handleUpdateGuestStatus - currentEvent updated immediately from store');
      } else {
        // Fallback: update from events array via useEffect
        console.log('⚠️ handleUpdateGuestStatus - currentEvent not found, will update via useEffect');
      }
    } catch (error) {
      console.error('Error updating guest:', error);
    }
  };

  const handleUpdateAttendance = async (guestId: string, attendance: string) => {
    try {
      console.log('🎯 handleUpdateAttendance called:', { guestId, attendance, eventId: currentEvent.id });
      
      // Update in store first
      await updateGuest(currentEvent.id, guestId, {
        actualAttendance: attendance as any,
        attendanceDate: new Date()
      });
      
      // CRITICAL: Get updated event from store immediately after update
      // First try to get from currentEvent, then from events array
      const storeState = useEventStore.getState();
      let updatedEvent = storeState.currentEvent;
      
      // If currentEvent doesn't match or is null, get from events array
      if (!updatedEvent || updatedEvent.id !== currentEvent.id) {
        updatedEvent = storeState.events.find(e => e.id === currentEvent.id) || null;
      }
      
      if (updatedEvent && updatedEvent.id === currentEvent.id) {
        // Create new object reference to force React re-render
        const updatedEventWithNewRef = {
          ...updatedEvent,
          guests: updatedEvent.guests ? updatedEvent.guests.map(g => ({ ...g })) : []
        };
        setCurrentEvent(updatedEventWithNewRef);
        console.log('✅ handleUpdateAttendance - currentEvent updated immediately from store');
      } else {
        // Fallback: update from events array via useEffect
        console.log('⚠️ handleUpdateAttendance - currentEvent not found, will update via useEffect');
      }
      
      console.log('✅ handleUpdateAttendance completed successfully');
    } catch (error) {
      console.error('❌ Error updating attendance:', error);
    }
  };

  const handleUpdateGuestField = async (guestId: string, updates: any) => {
    try {
      console.log('🎯 handleUpdateGuestField called:', { guestId, updates, eventId: currentEvent.id });
      
      // CRITICAL: If tableId is being changed, use assignGuestToTable/moveGuestToTable/removeGuestFromTable
      // This ensures seating management is updated correctly
      if (updates.tableId !== undefined) {
        const currentGuest = currentEvent.guests.find(g => g.id === guestId);
        const oldTableId = currentGuest?.tableId;
        const newTableId = updates.tableId;
        
        if (newTableId && newTableId !== oldTableId) {
          // Moving to a new table
          console.log(`🔄 Moving guest ${guestId} from table ${oldTableId || 'none'} to table ${newTableId}`);
          await moveGuestToTable(currentEvent.id, guestId, newTableId);
        } else if (!newTableId && oldTableId) {
          // Removing from table
          console.log(`🔄 Removing guest ${guestId} from table ${oldTableId}`);
          await removeGuestFromTable(currentEvent.id, guestId);
        } else if (newTableId && newTableId === oldTableId) {
          // Same table, just update other fields if any
          const otherUpdates = { ...updates };
          delete otherUpdates.tableId;
          if (Object.keys(otherUpdates).length > 0) {
            await updateGuest(currentEvent.id, guestId, otherUpdates);
          }
        }
      } else {
        // Update other fields normally - always include responseDate for timestamp-based conflict resolution
        // If updating guestCount, always use current timestamp
        const updatesWithTimestamp = updates.guestCount !== undefined 
          ? { ...updates, responseDate: new Date() }
          : updates;
        await updateGuest(currentEvent.id, guestId, updatesWithTimestamp);
      }
      
      // CRITICAL: Get updated currentEvent from store immediately after update
      // This ensures the UI updates instantly with the latest data from store
      // Important for: tableId, actualAttendance, guestCount, rsvpStatus, firstName, lastName, phoneNumber
      const criticalFields = ['tableId', 'actualAttendance', 'guestCount', 'rsvpStatus', 'firstName', 'lastName', 'phoneNumber', 'notes'];
      const hasCriticalField = criticalFields.some(field => updates[field] !== undefined);
      
      if (hasCriticalField) {
        const storeState = useEventStore.getState();
        const updatedEvent = storeState.currentEvent;
        if (updatedEvent && updatedEvent.id === currentEvent.id) {
          setCurrentEvent(updatedEvent);
          console.log('✅ handleUpdateGuestField - currentEvent updated immediately from store for:', Object.keys(updates).join(', '));
        }
      }
    } catch (error) {
      console.error('Error updating guest:', error);
    }
  };

  const getMessageStatusColor = (status: string) => {
    switch (status) {
      case 'sent': return 'text-blue-600';
      case 'delivered': return 'text-green-600';
      case 'failed': return 'text-red-600';
      case 'sms_sent': return 'text-purple-600';
      default: return 'text-gray-600';
    }
  };

  const getMessageStatusText = (status: string) => {
    switch (status) {
      case 'not_sent': return 'לא נשלחה';
      case 'sent': return 'נשלח';
      case 'delivered': return 'קיבל';
      case 'failed': return 'נכשל';
      case 'sms_sent': return 'נשלח SMS';
      default: return 'לא נשלח';
    }
  };

  const getRsvpStatusText = (status: string): string => {
    switch (status) {
      case 'confirmed':
        return 'אישר הגעה';
      case 'declined':
        return 'דחה הזמנה';
      case 'pending':
        return 'ממתין לתגובה';
      case 'not_responded':
        return 'לא ענה';
      default:
        return 'לא ענה';
    }
  };

  const getActualAttendanceText = (attendance: string): string => {
    switch (attendance) {
      case 'attended':
        return 'הגיע';
      case 'not_attended':
        return 'לא הגיע';
      case 'not_marked':
        return 'לא סומן';
      default:
        return 'לא סומן';
    }
  };

  const createTableSummaryData = () => {
    if (!currentEvent || !currentEvent.tables || !currentEvent.guests) {
      return [['אין נתונים']];
    }

    // Header row
    const headerRow = [
      'מספר שולחן',
      'כמות מוזמנים',
      'הגיעו בפועל',
      'לא הגיעו',
      'לא סומן',
      'אחוז הגעה'
    ];

    const dataRows = [];

    // Process each table
    currentEvent.tables.forEach(table => {
      const tableGuests = currentEvent.guests.filter(guest => guest.tableId === table.id);
      
      // Count actual attendance - use guestCount, not number of records
      const totalGuests = tableGuests.reduce((sum, guest) => sum + (guest.guestCount || 1), 0);
      const attended = tableGuests
        .filter(g => g.actualAttendance === 'attended')
        .reduce((sum, guest) => sum + (guest.guestCount || 1), 0);
      const notAttended = tableGuests
        .filter(g => g.actualAttendance === 'not_attended')
        .reduce((sum, guest) => sum + (guest.guestCount || 1), 0);
      const notMarked = tableGuests
        .filter(g => !g.actualAttendance || g.actualAttendance === 'not_marked')
        .reduce((sum, guest) => sum + (guest.guestCount || 1), 0);
      
      // Calculate attendance percentage
      const attendancePercentage = totalGuests > 0 ? Math.round((attended / totalGuests) * 100) : 0;
      
      dataRows.push([
        table.number || 'ללא מספר',
        totalGuests,
        attended,
        notAttended,
        notMarked,
        `${attendancePercentage}%`
      ]);
    });

    // Add totals row
    const totalAttended = currentEvent.guests.filter(g => g.actualAttendance === 'attended').length;
    const totalNotAttended = currentEvent.guests.filter(g => g.actualAttendance === 'not_attended').length;
    const totalNotMarked = currentEvent.guests.filter(g => !g.actualAttendance || g.actualAttendance === 'not_marked').length;
    const totalGuests = currentEvent.guests.length;
    const totalAttendancePercentage = totalGuests > 0 ? Math.round((totalAttended / totalGuests) * 100) : 0;

    dataRows.push([
      'סה"כ',
      totalGuests,
      totalAttended,
      totalNotAttended,
      totalNotMarked,
      `${totalAttendancePercentage}%`
    ]);

    return [headerRow, ...dataRows];
  };

  const createAttendanceData = () => {
    console.log('createAttendanceData called with:', {
      currentEvent,
      tables: currentEvent?.tables,
      guests: currentEvent?.guests
    });

    if (!currentEvent) {
      console.log('No current event');
      return [['אין אירוע נבחר']];
    }

    if (!currentEvent.guests || currentEvent.guests.length === 0) {
      console.log('No guests');
      return [['אין אורחים']];
    }

    console.log('Creating attendance data:', {
      tables: currentEvent.tables,
      guests: currentEvent.guests
    });

    const dataRows: any[] = [];

    // Process each table
    currentEvent.tables.forEach(table => {
      const tableGuests = currentEvent.guests.filter(guest => guest.tableId === table.id);
      
      if (tableGuests.length === 0) {
        // Empty table
        dataRows.push([
          `שולחן מספר ${table.number}`,
          '',
          `כמות כסאות: ${table.capacity || 8}`,
          '',
          'הגיעו: 0/0',
          ''
        ]);
        dataRows.push(['', '', '', '', '', '']); // Empty row
        return;
      }

      // Count attendance - use guestCount, not number of records
      const totalGuests = tableGuests.reduce((sum, guest) => sum + (guest.guestCount || 1), 0);
      const attendedCount = tableGuests
        .filter(g => g.actualAttendance === 'attended')
        .reduce((sum, guest) => sum + (guest.guestCount || 1), 0);

      // Table header with attendance summary
      dataRows.push([
        `שולחן מספר ${table.number}`,
        '',
        `כמות כסאות: ${table.capacity || 8}`,
        '',
        `הגיעו: ${attendedCount}/${totalGuests}`,
        ''
      ]);

      // Add each guest with their attendance status
      tableGuests.forEach(guest => {
        const attendanceStatus = getActualAttendanceText(guest.actualAttendance || 'unknown');
        const statusIcon = guest.actualAttendance === 'attended' ? '✓' : 
                          guest.actualAttendance === 'not_attended' ? '✗' : '?';
        
        dataRows.push([
          `${statusIcon} ${guest.firstName || ''} ${guest.lastName || ''}`.trim(),
          guest.phoneNumber || '',
          `(${guest.guestCount || 1} אנשים)`,
          attendanceStatus,
          '',
          guest.notes || ''
        ]);
      });

      dataRows.push(['', '', '', '', '', '']); // Empty row between tables
      dataRows.push(['', '', '', '', '', '']); // Additional separator
    });


    console.log('Final attendance data:', dataRows as any[]);
    
    // If no data was created, add a fallback
    if (dataRows.length === 0) {
      console.log('No data created, adding fallback');
      dataRows.push(['אין נתונים להצגה', '', '', '', '', '']);
    }
    
    return dataRows;
  };

  const styleTableSummarySheet = (ws: any, data: any[][]) => {
    // Set row heights
    const rowHeights = [];
    for (let i = 0; i < data.length; i++) {
      rowHeights.push({ hpt: 25 });
    }
    ws['!rows'] = rowHeights;

    // Get range
    const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');
    
    // Style header row
    for (let col = range.s.c; col <= range.e.c; col++) {
      const cellAddress = XLSX.utils.encode_cell({ r: 0, c: col });
      if (!ws[cellAddress]) continue;
      
      ws[cellAddress].s = {
        font: { bold: true, color: { rgb: "FFFFFF" }, sz: 14 },
        fill: { fgColor: { rgb: "2F5597" } },
        alignment: { horizontal: "center", vertical: "center", wrapText: true, readingOrder: 2 },
        border: {
          top: { style: "medium", color: { rgb: "1F4E79" } },
          bottom: { style: "medium", color: { rgb: "1F4E79" } },
          left: { style: "medium", color: { rgb: "1F4E79" } },
          right: { style: "medium", color: { rgb: "1F4E79" } }
        }
      };
    }
    
    // Style data rows
    for (let row = 1; row < data.length; row++) {
      for (let col = range.s.c; col <= range.e.c; col++) {
        const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
        if (!ws[cellAddress]) continue;
        
        // Check if this is the totals row
        const isTotalsRow = row === data.length - 1;
        
        ws[cellAddress].s = {
          font: { 
            sz: 11, 
            bold: isTotalsRow 
          },
          fill: { 
            fgColor: { 
              rgb: isTotalsRow ? "E8F4FD" : (row % 2 === 0 ? "F8F9FA" : "FFFFFF") 
            } 
          },
          alignment: { horizontal: "center", vertical: "center", wrapText: true, readingOrder: 2 },
          border: {
            top: { style: "thin", color: { rgb: "E0E0E0" } },
            bottom: { style: "thin", color: { rgb: "E0E0E0" } },
            left: { style: "thin", color: { rgb: "E0E0E0" } },
            right: { style: "thin", color: { rgb: "E0E0E0" } }
          }
        };
      }
    }
  };

  const styleAttendanceSheet = (ws: any, data: any[][]) => {
    console.log('Styling attendance sheet with data:', data);
    
    // Set row heights
    const rowHeights = [];
    for (let i = 0; i < data.length; i++) {
      rowHeights.push({ hpt: 30 });
    }
    ws['!rows'] = rowHeights;

    // Get range
    const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');
    console.log('Range:', range);
    
    // Style data rows
    for (let row = 0; row < data.length; row++) {
      for (let col = range.s.c; col <= range.e.c; col++) {
        const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
        if (!ws[cellAddress]) continue;
        
        const cellValue = data[row][0];
        // const attendanceStatus = data[row][3];
        
        // Style table header rows - make them stand out more
        if (cellValue && cellValue.includes('שולחן מספר')) {
          console.log('Styling table header:', cellValue, 'at', cellAddress);
          // Style the entire row for table headers
          for (let c = range.s.c; c <= range.e.c; c++) {
            const cellAddr = XLSX.utils.encode_cell({ r: row, c: c });
            if (!ws[cellAddr]) continue;
            ws[cellAddr].s = {
              font: { bold: true, color: { rgb: "000000" }, sz: 18 },
              fill: { fgColor: { rgb: "FEF08A" } },
              alignment: { horizontal: "center", vertical: "center", wrapText: true, readingOrder: 2 },
              border: {
                top: { style: "thick", color: { rgb: "F59E0B" } },
                bottom: { style: "thick", color: { rgb: "F59E0B" } },
                left: { style: "thick", color: { rgb: "F59E0B" } },
                right: { style: "thick", color: { rgb: "F59E0B" } }
              }
            };
          }
        }
        // Style capacity and attendance summary cells - make them more prominent
        else if (data[row][2] && (data[row][2].includes('כמות כסאות') || data[row][4] && data[row][4].includes('הגיעו'))) {
          // Style the entire row for capacity/summary rows
          for (let c = range.s.c; c <= range.e.c; c++) {
            const cellAddr = XLSX.utils.encode_cell({ r: row, c: c });
            if (!ws[cellAddr]) continue;
            ws[cellAddr].s = {
              font: { bold: true, color: { rgb: "000000" }, sz: 14 },
              fill: { fgColor: { rgb: "FEF3C7" } },
              alignment: { horizontal: "center", vertical: "center", wrapText: true, readingOrder: 2 },
              border: {
                top: { style: "medium", color: { rgb: "F59E0B" } },
                bottom: { style: "medium", color: { rgb: "F59E0B" } },
                left: { style: "medium", color: { rgb: "F59E0B" } },
                right: { style: "medium", color: { rgb: "F59E0B" } }
              }
            };
          }
        }
        // Style guest rows with better colors and borders
        else if (cellValue && (cellValue.includes('✓') || cellValue.includes('✗') || cellValue.includes('?'))) {
          let statusColor = "FFFFFF"; // default white
          let textColor = "000000";
          let borderColor = "E5E7EB";
          
          if (cellValue.includes('✓')) {
            statusColor = "D1FAE5"; // lighter green for attended
            textColor = "065F46";
            borderColor = "10B981";
          } else if (cellValue.includes('✗')) {
            statusColor = "FEE2E2"; // lighter red for not attended
            textColor = "991B1B";
            borderColor = "EF4444";
          } else if (cellValue.includes('?')) {
            statusColor = "FEF3C7"; // lighter yellow for not marked
            textColor = "92400E";
            borderColor = "F59E0B";
          }
          
          // Style the entire row for guest rows
          for (let c = range.s.c; c <= range.e.c; c++) {
            const cellAddr = XLSX.utils.encode_cell({ r: row, c: c });
            if (!ws[cellAddr]) continue;
            ws[cellAddr].s = {
              font: { sz: 12, bold: true, color: { rgb: textColor } },
              fill: { fgColor: { rgb: statusColor } },
              alignment: { horizontal: "right", vertical: "center", wrapText: true, readingOrder: 2 },
              border: {
                top: { style: "thin", color: { rgb: borderColor } },
                bottom: { style: "thin", color: { rgb: borderColor } },
                left: { style: "thin", color: { rgb: borderColor } },
                right: { style: "thin", color: { rgb: borderColor } }
              }
            };
          }
        }
        // Style empty rows between tables - make them more visible
        else if (cellValue === '') {
          ws[cellAddress].s = {
            font: { sz: 11 },
            fill: { fgColor: { rgb: "F9FAFB" } },
            alignment: { horizontal: "center", vertical: "center", wrapText: true, readingOrder: 2 },
            border: {
              top: { style: "thin", color: { rgb: "D1D5DB" } },
              bottom: { style: "thin", color: { rgb: "D1D5DB" } },
              left: { style: "thin", color: { rgb: "D1D5DB" } },
              right: { style: "thin", color: { rgb: "D1D5DB" } }
            }
          };
        }
        // Default cells
        else {
          ws[cellAddress].s = {
            font: { sz: 11 },
            fill: { fgColor: { rgb: "FFFFFF" } },
            alignment: { horizontal: "center", vertical: "center", wrapText: true, readingOrder: 2 },
            border: {
              top: { style: "thin", color: { rgb: "E5E7EB" } },
              bottom: { style: "thin", color: { rgb: "E5E7EB" } },
              left: { style: "thin", color: { rgb: "E5E7EB" } },
              right: { style: "thin", color: { rgb: "E5E7EB" } }
            }
          };
        }
      }
    }
  };

  const handleDeleteGuest = async (guestId: string) => {
    if (window.confirm('האם אתה בטוח שברצונך למחוק את המוזמן?')) {
      try {
        await deleteGuest(currentEvent.id, guestId);
      } catch (error) {
        console.error('Error deleting guest:', error);
      }
    }
  };

  const handleDeleteSelectedGuests = async () => {
    if (selectedGuests.length === 0) {
      alert('אנא בחר אורחים למחיקה');
      return;
    }

    const confirmMessage = `האם אתה בטוח שברצונך למחוק ${selectedGuests.length} מוזמנים? פעולה זו לא ניתנת לביטול.`;
    if (!window.confirm(confirmMessage)) {
      return;
    }

    try {
      // Delete all selected guests
      for (const guestId of selectedGuests) {
        await deleteGuest(currentEvent.id, guestId);
      }
      
      // Clear selection after deletion
      setSelectedGuests([]);
      alert(`נמחקו ${selectedGuests.length} מוזמנים בהצלחה!`);
    } catch (error) {
      console.error('Error deleting selected guests:', error);
      alert('אירעה שגיאה במחיקת המוזמנים');
    }
  };

  const handleDownloadTemplate = async () => {
    const eventName = currentEvent ? currentEvent.coupleName : 'אירוע';
    
    // Create new Excel workbook
    const workbook = new ExcelJS.Workbook();
    
    // Set workbook properties for RTL
    workbook.creator = 'מערכת ניהול אירועים';
    workbook.lastModifiedBy = 'מערכת ניהול אירועים';
    workbook.created = new Date();
    workbook.modified = new Date();
    
    // Create worksheet
    const worksheet = workbook.addWorksheet('תבנית רשימת אורחים', {
      properties: {
        tabColor: { argb: 'FF2F5597' }
      }
    });
    
    // Define columns in RTL order - מימין לשמאל: שם האורח (ימין), פלאפון, כמות, שיוך, הערות (שמאל)
    worksheet.columns = [
      { header: 'שם האורח', key: 'fullName', width: 20 },
      { header: 'פלאפון האורח', key: 'phoneNumber', width: 15 },
      { header: 'כמות מגיעים', key: 'guestCount', width: 20 },
      { header: 'שיוך למשפחה', key: 'family', width: 15 },
      { header: 'הערות', key: 'notes', width: 20 }
    ];
    
    // Style header row
    worksheet.getRow(1).eachCell((cell) => {
      cell.font = { 
        bold: true, 
        color: { argb: 'FF000000' }, 
        size: 14, 
        name: 'Arial' 
      };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFFEF08A' }
      };
      cell.alignment = { 
        horizontal: 'right', 
        vertical: 'middle', 
        wrapText: true, 
        readingOrder: 'rtl' 
      };
      cell.border = {
        top: { style: 'medium', color: { argb: 'FFF59E0B' } },
        left: { style: 'medium', color: { argb: 'FFF59E0B' } },
        bottom: { style: 'medium', color: { argb: 'FFF59E0B' } },
        right: { style: 'medium', color: { argb: 'FFF59E0B' } }
      };
    });
    
    // Add example data rows - הסדר מימין לשמאל: שם, פלאפון, כמות, שיוך, הערות
    const exampleData = [
      {
        fullName: 'אבי',
        phoneNumber: '0505522333',
        guestCount: '1 (לא חובה להזין כמות) חברים של הכלה',
        family: '',
        notes: ''
      },
      {
        fullName: '',
        phoneNumber: '',
        guestCount: '',
        family: '',
        notes: ''
      },
      {
        fullName: '',
        phoneNumber: '',
        guestCount: '',
        family: '',
        notes: ''
      },
      {
        fullName: '',
        phoneNumber: '',
        guestCount: '',
        family: '',
        notes: ''
      },
      {
        fullName: '',
        phoneNumber: '',
        guestCount: '',
        family: '',
        notes: ''
      },
      {
        fullName: '',
        phoneNumber: '',
        guestCount: '',
        family: '',
        notes: ''
      },
      {
        fullName: '',
        phoneNumber: '',
        guestCount: '',
        family: '',
        notes: ''
      },
      {
        fullName: '',
        phoneNumber: '',
        guestCount: '',
        family: '',
        notes: ''
      },
      {
        fullName: '',
        phoneNumber: '',
        guestCount: '',
        family: '',
        notes: ''
      },
      {
        fullName: '',
        phoneNumber: '',
        guestCount: '',
        family: '',
        notes: ''
      }
    ];
    
    exampleData.forEach((data) => {
      const row = worksheet.addRow(data);
      
      // Style data row
      row.eachCell((cell) => {
        cell.font = { 
          size: 11, 
          name: 'Arial' 
        };
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFFFFFFF' }
        };
        cell.alignment = { 
          horizontal: 'right', 
          vertical: 'middle', 
          wrapText: true, 
          readingOrder: 'rtl' 
        };
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFE5E7EB' } },
          left: { style: 'thin', color: { argb: 'FFE5E7EB' } },
          bottom: { style: 'thin', color: { argb: 'FFE5E7EB' } },
          right: { style: 'thin', color: { argb: 'FFE5E7EB' } }
        };
      });
    });
    
    // Set row heights
    worksheet.eachRow((row) => {
      row.height = 20;
    });
    
    // Save file
    const fileName = `תבנית_רשימת_אורחים_${eventName}_${new Date().toISOString().split('T')[0]}.xlsx`;
    const buffer = await workbook.xlsx.writeBuffer();
    
    // Create blob and download
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.click();
    window.URL.revokeObjectURL(url);
  };

  const handleExportGuests = async () => {
    if (!currentEvent) return;
    
    // Create new Excel workbook
    const workbook = new ExcelJS.Workbook();
    
    // Set workbook properties for RTL
    workbook.creator = 'מערכת ניהול אירועים';
    workbook.lastModifiedBy = 'מערכת ניהול אירועים';
    workbook.created = new Date();
    workbook.modified = new Date();
    
    // Create worksheet
    const worksheet = workbook.addWorksheet('רשימת אורחים', {
      properties: {
        tabColor: { argb: 'FF2F5597' }
      }
    });
    
    // Define columns in RTL order - עמודה A תהיה "הערות" (ימין), עמודה K תהיה "שם מלא" (שמאל)
    worksheet.columns = [
      { header: 'הערות', key: 'notes', width: 30 },
      { header: 'תאריך שליחה', key: 'messageSentDate', width: 12 },
      { header: 'סטטוס הודעה', key: 'messageStatus', width: 15 },
      { header: 'שולחן', key: 'table', width: 8 },
      { header: 'הגעה בפועל', key: 'actualAttendance', width: 15 },
      { header: 'ערוץ', key: 'channel', width: 12 },
      { header: 'תאריך תגובה', key: 'responseDate', width: 12 },
      { header: 'סטטוס אישור', key: 'rsvpStatus', width: 15 },
      { header: 'מספר מוזמנים', key: 'guestCount', width: 12 },
      { header: 'מספר טלפון', key: 'phoneNumber', width: 15 },
      { header: 'שם מלא', key: 'fullName', width: 25 }
    ];
    
    // Style header row
    worksheet.getRow(1).eachCell((cell) => {
      cell.font = { 
        bold: true, 
        color: { argb: 'FFFFFFFF' }, 
        size: 14, 
        name: 'Arial' 
      };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF2F5597' }
      };
      cell.alignment = { 
        horizontal: 'right', 
        vertical: 'middle', 
        wrapText: true, 
        readingOrder: 'rtl' 
      };
      cell.border = {
        top: { style: 'medium', color: { argb: 'FF1F4E79' } },
        left: { style: 'medium', color: { argb: 'FF1F4E79' } },
        bottom: { style: 'medium', color: { argb: 'FF1F4E79' } },
        right: { style: 'medium', color: { argb: 'FF1F4E79' } }
      };
    });
    
    // Add data rows
    currentEvent.guests.forEach((guest, index) => {
      const row = worksheet.addRow({
        notes: guest.notes || '',
        messageSentDate: guest.messageSentDate ? formatDate(guest.messageSentDate) : '',
        messageStatus: getMessageStatusText(guest.messageStatus || 'not_sent'),
        table: guest.tableId ? currentEvent.tables?.find(t => t.id === guest.tableId)?.number?.toString() || '?' : 'ללא',
        actualAttendance: getActualAttendanceText(guest.actualAttendance || 'unknown'),
        channel: guest.channel || 'וואטסאפ',
        responseDate: guest.responseDate ? formatDate(guest.responseDate) : '',
        rsvpStatus: getRsvpStatusText(guest.rsvpStatus),
        guestCount: guest.guestCount || 1,
        phoneNumber: guest.phoneNumber || '',
        fullName: `${guest.firstName || ''} ${guest.lastName || ''}`.trim()
      });
      
      // Style data row
      const isEvenRow = (index + 1) % 2 === 0;
      row.eachCell((cell) => {
        cell.font = { 
          size: 11, 
          name: 'Arial' 
        };
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: isEvenRow ? 'FFF8F9FA' : 'FFFFFFFF' }
        };
        cell.alignment = { 
          horizontal: 'right', 
          vertical: 'middle', 
          wrapText: true, 
          readingOrder: 'rtl' 
        };
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFE0E0E0' } },
          left: { style: 'thin', color: { argb: 'FFE0E0E0' } },
          bottom: { style: 'thin', color: { argb: 'FFE0E0E0' } },
          right: { style: 'thin', color: { argb: 'FFE0E0E0' } }
        };
      });
    });
    
    // Set row heights
    worksheet.eachRow((row) => {
      row.height = 25;
    });
    
    // Save file
    const fileName = `רשימת_אורחים_${currentEvent.coupleName}_${new Date().toISOString().split('T')[0]}.xlsx`;
    const buffer = await workbook.xlsx.writeBuffer();
    
    // Create blob and download
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.click();
    window.URL.revokeObjectURL(url);
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

        // Helper function to parse RSVP status from text
        const parseRsvpStatus = (text: string): 'pending' | 'confirmed' | 'declined' | 'maybe' => {
          const lowerText = text.toLowerCase().trim();
          if (lowerText.includes('מגיע') || lowerText.includes('confirmed') || lowerText.includes('אישר')) {
            return 'confirmed';
          }
          if (lowerText.includes('לא מגיע') || lowerText.includes('declined') || lowerText.includes('דחה')) {
            return 'declined';
          }
          if (lowerText.includes('אולי') || lowerText.includes('maybe')) {
            return 'maybe';
          }
          return 'pending';
        };

        // Helper function to parse actual attendance from text
        const parseActualAttendance = (text: string): 'attended' | 'not_attended' | 'not_marked' => {
          const lowerText = text.toLowerCase().trim();
          if (lowerText.includes('הגיע') || lowerText.includes('attended') || lowerText.includes('כן')) {
            return 'attended';
          }
          if (lowerText.includes('לא הגיע') || lowerText.includes('not_attended') || lowerText.includes('לא')) {
            return 'not_attended';
          }
          return 'not_marked';
        };

        // Convert to guests array
        // Excel columns order (RTL - Right to Left, מימין לשמאל): שם האורח, פלאפון האורח, כמות מגיעים, שיוך למשפחה, הערות
        // Array indices (0-based, RTL): [0] שם האורח, [1] פלאפון האורח, [2] כמות מגיעים, [3] שיוך למשפחה, [4] הערות
        
        console.log('📊 Total rows in Excel:', jsonData.length);
        console.log('📊 Header row:', jsonData[0]);
        console.log('📊 First data row:', jsonData[1]);
        const firstRowLength = Array.isArray(jsonData[1]) ? jsonData[1].length : 0;
        console.log('📊 Row length:', firstRowLength);
        
        const allRows = jsonData.slice(1); // Skip header row
        console.log('📊 Data rows after skipping header:', allRows.length);
        
        const guests = allRows
          .filter((row: any, index: number) => {
            // Filter empty rows
            if (!row || row.length === 0) {
              console.log(`⚠️ Row ${index + 1} is empty`);
              return false;
            }
            // Check if row has any meaningful data
            const hasData = row.some((cell: any) => cell && String(cell).trim());
            if (!hasData) {
              console.log(`⚠️ Row ${index + 1} has no data:`, row);
              return false;
            }
            return true;
          })
          .map((row: any, index: number) => {
            console.log(`📋 Processing row ${index + 1}:`, row);
            console.log(`📋 Row length: ${row.length}, Values:`, row);
            
            // Excel structure (RTL - מימין לשמאל): Column A=שם האורח, B=פלאפון האורח, C=כמות מגיעים, D=שיוך למשפחה, E=הערות
            
            // Column A (index 0): שם האורח → תחת "מוזמן"
            const fullName = String(row[0] || '').trim();
            console.log(`📋 Full name from column A (index 0): "${fullName}"`);
            
            let firstName = '';
            let lastName = '';
            if (fullName) {
              // Split name by common separators (space, comma, "ו")
              const nameParts = fullName.split(/[\s,ו]+/).filter((part: string) => part.trim());
              firstName = nameParts[0] || '';
              lastName = nameParts.slice(1).join(' ') || '';
            }
            
            // Column B (index 1): פלאפון האורח → תחת "טלפון"
            const phoneNumber = String(row[1] || '').trim();
            console.log(`📋 Phone from column B (index 1): "${phoneNumber}"`);
            const finalPhone = phoneNumber.replace(/[^\d]/g, ''); // Remove non-digits
            
            // Column C (index 2): כמות מגיעים → תחת "מספר מוזמנים"
            const guestCount = parseInt(String(row[2] || '1')) || 1;
            console.log(`📋 Guest count from column C (index 2): "${guestCount}"`);
            
            // Column D (index 3): שיוך למשפחה (optional)
            const family = String(row[3] || '').trim();
            console.log(`📋 Family from column D (index 3): "${family}"`);
            
            // Column E (index 4): הערות (optional)
            const notes = String(row[4] || '').trim();
            console.log(`📋 Notes from column E (index 4): "${notes}"`);
            
            // Default RSVP status and attendance (not in template)
            const rsvpStatus = 'pending' as 'pending' | 'confirmed' | 'declined' | 'maybe';
            const actualAttendance = 'not_marked' as 'attended' | 'not_attended' | 'not_marked';
            
            // Table number not in template - will be empty
            const tableNumber = '';
            console.log(`📋 Table number from column G (index 6): "${tableNumber}"`);
            
            // Try to find existing table
            let table = tableNumber && !isNaN(parseInt(tableNumber)) ? currentEvent.tables?.find(t => t.number === parseInt(tableNumber)) : null;
            
            if (table) {
              console.log(`✅ Found table: ${table.number} (ID: ${table.id})`);
            } else if (tableNumber && !isNaN(parseInt(tableNumber))) {
              console.log(`⚠️ Table number ${tableNumber} not found in event tables - will save in notes`);
            } else if (!tableNumber) {
              console.log(`ℹ️ No table number provided for this guest`);
            }
            
            // Save table number in notes if table doesn't exist (so we can display it later)
            // ALWAYS save table number in notes if it exists, even if table not found in system
            let finalNotes = notes;
            if (tableNumber && !isNaN(parseInt(tableNumber)) && !table) {
              // Save table number in a special format: "שולחן: X" at the beginning
              finalNotes = notes ? `שולחן: ${tableNumber} | ${notes}` : `שולחן: ${tableNumber}`;
            }
            
            const guestData = {
              firstName: firstName,
              lastName: lastName,
              phoneNumber: finalPhone,
              guestCount: guestCount,
              tableId: table?.id, // Only set if table exists in system
              rsvpStatus: rsvpStatus,
              actualAttendance: actualAttendance,
              messageStatus: 'not_sent' as any, // Default - not in Excel
              notes: finalNotes,
              channel: 'whatsapp' as 'whatsapp' | 'sms' // Default - not in Excel
            };
            
            console.log(`✅ Parsed guest ${index + 1}:`, guestData);
            return guestData;
          })
          .filter((guest: any, index: number) => {
            // Accept guests with either name OR phone number (not both required)
            const hasName = guest && guest.firstName && guest.firstName.trim().length > 0;
            const hasPhone = guest && guest.phoneNumber && guest.phoneNumber.trim().length > 0;
            const isValid = guest && (hasName || hasPhone);
            
            if (!isValid) {
              console.log(`❌ Filtered out guest ${index + 1} - no name or phone:`, guest);
              console.log(`   - Has name: ${hasName}, Name: "${guest?.firstName}"`);
              console.log(`   - Has phone: ${hasPhone}, Phone: "${guest?.phoneNumber}"`);
            } else {
              console.log(`✅ Accepted guest ${index + 1}:`, {
                firstName: guest.firstName,
                phoneNumber: guest.phoneNumber,
                hasName,
                hasPhone
              });
            }
            return isValid;
          });
        
        console.log(`📊 Total guests after parsing: ${guests.length}`);
        if (guests.length === 0) {
          console.error('❌ No guests found! Check the Excel file structure.');
          console.log('📋 Sample row data:', jsonData[1]);
          console.log('📋 Expected columns (RTL - מימין לשמאל):', [
            '[0] Column A: שם האורח',
            '[1] Column B: פלאפון האורח',
            '[2] Column C: כמות מגיעים',
            '[3] Column D: שיוך למשפחה',
            '[4] Column E: הערות'
          ]);
          alert('לא נמצאו אורחים לייבוא.\n\nאנא ודא שהקובץ Excel מכיל את העמודות הבאות (מימין לשמאל):\n- Column A: שם האורח\n- Column B: פלאפון האורח\n- Column C: כמות מגיעים\n- Column D: שיוך למשפחה\n- Column E: הערות');
        }

        // Add guests to event
        if (guests.length === 0) {
          setShowImportModal(false);
          return;
        }
        
        console.log(`🚀 Starting to add ${guests.length} guests...`);
        console.log(`📋 First guest sample:`, guests[0]);
        
        let addedCount = 0;
        let errorCount = 0;
        
        for (const guest of guests) {
          try {
            console.log(`➕ Adding guest ${addedCount + 1}/${guests.length}:`, {
              name: `${guest.firstName} ${guest.lastName}`,
              phone: guest.phoneNumber,
              count: guest.guestCount,
              status: guest.rsvpStatus,
              table: guest.tableId
            });
            
            await addGuest(currentEvent.id, {
              firstName: guest.firstName,
              lastName: guest.lastName || '',
              phoneNumber: guest.phoneNumber,
              guestCount: guest.guestCount,
              tableId: guest.tableId,
              rsvpStatus: guest.rsvpStatus,
              actualAttendance: guest.actualAttendance || 'not_marked',
              messageStatus: 'not_sent',
              notes: guest.notes || '',
              channel: 'whatsapp'
            });
            
            addedCount++;
            console.log(`✅ Successfully added guest ${addedCount}/${guests.length}`);
          } catch (error) {
            errorCount++;
            console.error(`❌ Error adding guest ${addedCount + errorCount}/${guests.length}:`, error);
            console.error(`   Guest data:`, guest);
          }
        }
        
        console.log(`📊 Import complete: ${addedCount} added, ${errorCount} errors`);

        // Force refresh - wait a bit for state to update
        await new Promise(resolve => setTimeout(resolve, 500));
        await fetchEvents();
        
        // Update currentEvent with latest data
        const updatedEvents = useEventStore.getState().events;
        const updatedEvent = updatedEvents.find(e => e.id === currentEvent.id);
        if (updatedEvent) {
          console.log(`🔄 Updating currentEvent with ${updatedEvent.guests?.length || 0} guests`);
          setCurrentEvent(updatedEvent);
        } else {
          console.warn(`⚠️ Event ${currentEvent.id} not found after import`);
        }

        setShowImportModal(false);
        
        if (addedCount > 0) {
          alert(`✅ יובאו ${addedCount} מתוך ${guests.length} מוזמנים בהצלחה!`);
        } else {
          alert(`❌ לא הצלחנו לייבא אורחים. אנא בדוק את הקונסול (F12) לפרטים.`);
        }
      } catch (error) {
        console.error('Error reading Excel file:', error);
        alert('שגיאה בקריאת קובץ האקסל. אנא ודא שהקובץ תקין.');
      }
    };
    reader.readAsBinaryString(file);
  };

  const cancelEdit = () => {
    setEditingGuest(null);
    setNewGuest({
      firstName: '',
      lastName: '',
      phoneNumber: '',
      guestCount: 1,
      notes: ''
    });
  };

  // Send message functions
  const handleSelectGuest = (guestId: string) => {
    setSelectedGuests(prev => 
      prev.includes(guestId) 
        ? prev.filter(id => id !== guestId)
        : [...prev, guestId]
    );
  };

  const handleSelectAllGuests = () => {
    const allGuestIds = filteredGuests.map(guest => guest.id);
    setSelectedGuests(allGuestIds);
  };

  const handleDeselectAllGuests = () => {
    setSelectedGuests([]);
  };

  const handleSendMessage = async () => {
    if (selectedGuests.length === 0) {
      alert('אנא בחר לפחות מוזמן אחד');
      return;
    }

    try {
      const guestsToSend = currentEvent.guests.filter(guest => selectedGuests.includes(guest.id));
      
      // Use default message if no custom message
      const baseMessage = customMessage || `שלום! אתם מוזמנים לאירוע שלנו!\n\n📅 ${formatDate(currentEvent.eventDate)}\n📍 ${currentEvent.venue}\n\nאנא אשרו הגעה.\n\nבברכה,\n${currentEvent.coupleName}`;

      // Send messages using the message service
      const { messageService } = await import('../services/messageService');
      // Import helper function once before map
      const { generateGuestResponseLink } = await import('../utils/helpers');
      
      const recipients = guestsToSend.map(guest => {
        // Use helper function to ensure production URL (works on all devices)
        const guestLink = generateGuestResponseLink(currentEvent.id, guest.id);
      console.log('🔗 Generated guest link:', guestLink);
      console.log('🔗 Event ID:', currentEvent.id);
      console.log('🔗 Guest ID:', guest.id);
        console.log('🖼️ Event invitation image:', currentEvent.invitationImageUrl);
      
      const personalizedMessage = customMessage 
        ? customMessage.replace('{{guest_link}}', guestLink)
        : `${baseMessage}\n\n🔗 לאשר הגעה ולעדכן סטטוס: ${guestLink}`;
        
        return {
          id: guest.id,
          firstName: guest.firstName,
          lastName: guest.lastName,
          phoneNumber: guest.phoneNumber,
          channel: messageChannel,
          message: personalizedMessage,
          firstMessageSent: guest.firstMessageSent || false, // Pass first message status
          eventData: {
            coupleName: currentEvent.coupleName,
            groomName: currentEvent.groomName,
            brideName: currentEvent.brideName,
            eventType: currentEvent.eventType,
            eventTypeHebrew: currentEvent.eventTypeHebrew,
            eventDate: formatDate(currentEvent.eventDate),
            eventTime: currentEvent.eventTime,
            venue: currentEvent.venue,
            invitationImageUrl: currentEvent.invitationImageUrl
          }
        };
      });

      const result = await messageService.sendBulkMessages({
        message: '', // Will be overridden by individual messages
        recipients
      });

      // Update guest channels and message status based on actual results
      result.results.forEach(messageResult => {
        const guest = guestsToSend.find(g => g.id === messageResult.recipientId);
        if (guest && messageResult.success) {
          let messageStatus = 'sent';
          if (messageResult.channel === 'sms') {
            messageStatus = 'sms_sent';
          } else if (messageResult.fallbackUsed) {
            messageStatus = 'sms_sent'; // WhatsApp failed, SMS was sent
          }
          
          const updateData: any = { 
            channel: messageResult.channel,
            messageStatus: messageStatus as any,
            messageSentDate: new Date()
          };
          
          // If this was a first message (template), mark it
          if (messageResult.isFirstMessage) {
            updateData.firstMessageSent = true;
            updateData.firstMessageSentDate = new Date();
          }
          
          updateGuest(currentEvent.id, guest.id, updateData);
        }
      });

      // Show detailed success message
      const successMessage = `✅ הודעות נשלחו בהצלחה!\n\n📊 סיכום:\n• ${result.successful} הודעות נשלחו בהצלחה\n• ${result.failed} הודעות נכשלו\n\n📱 ערוצים:\n• WhatsApp: ${result.results.filter(r => r.channel === 'whatsapp' && r.success).length}\n• SMS: ${result.results.filter(r => r.channel === 'sms' && r.success).length}`;
      
      alert(successMessage);
      
      setShowSendMessageModal(false);
      setSelectedGuests([]);
      setCustomMessage('');
    } catch (error) {
      console.error('Error sending messages:', error);
      alert('שגיאה בשליחת ההודעות');
    }
  };

  const handleSendToSingleGuest = async (guest: any) => {
    try {
      // Use local IP for testing - replace with your actual IP
      const baseUrl = window.location.origin || 'http://192.168.1.47:3001';
      
      // Debug: Check if guest ID is correct
      console.log('🔍 DEBUG - Guest ID from parameter:', guest.id);
      console.log('🔍 DEBUG - Guest object:', guest);
      console.log('🔍 DEBUG - All guests in event:', currentEvent.guests?.map(g => ({ id: g.id, name: `${g.firstName} ${g.lastName}` })));
      
      // Find the correct guest by name to get the real ID
      const realGuest = currentEvent.guests?.find(g => 
        g.firstName === guest.firstName && g.lastName === guest.lastName
      );
      
      console.log('🔍 DEBUG - Real guest found:', realGuest);
      
      // Use the real guest ID if found, otherwise use the parameter ID
      const guestIdToUse = realGuest?.id || guest.id;
      // Use helper function to ensure production URL (works on all devices)
      const { generateGuestResponseLink } = await import('../utils/helpers');
      const guestLink = generateGuestResponseLink(currentEvent.id, guestIdToUse);
      
      console.log('🔗 Single guest link:', guestLink);
      console.log('🔗 Single Event ID:', currentEvent.id);
      console.log('🔗 Single Guest ID used:', guestIdToUse);
      
      // Get the first campaign (הזמנה ראשונית)
      const firstCampaign = currentEvent.campaigns?.find(c => c.name === 'הזמנה ראשונית') || 
                            currentEvent.campaigns?.[0];
      
      let message: string;
      let campaignImageUrl: string | undefined;
      
      if (firstCampaign) {
        console.log('📧 Using first campaign message:', firstCampaign.name);
        
        // Replace template variables in campaign message
        const guestTable = currentEvent.tables?.find(table => table.guests.includes(guestIdToUse));
        const tableNumber = guestTable ? guestTable.number : 'לא הוקצה';
        
        message = firstCampaign.message
          .replace(/\{\{guest_name\}\}/g, guest.firstName)
          .replace(/\{\{first_name\}\}/g, guest.firstName) // Support both for backward compatibility
          .replace(/\{\{last_name\}\}/g, guest.lastName)
          .replace(/\{\{event_date\}\}/g, formatDate(currentEvent.eventDate))
          .replace(/\{\{event_time\}\}/g, currentEvent.eventTime)
          .replace(/\{\{event_type\}\}/g, currentEvent.eventTypeHebrew)
          .replace(/\{\{venue\}\}/g, currentEvent.venue)
          .replace(/\{\{couple_name\}\}/g, currentEvent.coupleName)
          .replace(/\{\{groom_name\}\}/g, currentEvent.groomName)
          .replace(/\{\{bride_name\}\}/g, currentEvent.brideName)
          .replace(/\{\{table_number\}\}/g, tableNumber.toString())
          .replace(/\{\{guest_response_link\}\}/g, guestLink);
        
        campaignImageUrl = firstCampaign.imageUrl;
      } else {
        // Fallback to default message if no campaign found
        console.log('⚠️ No campaign found, using default message');
        message = customMessage || `שלום ${guest.firstName}! אתם מוזמנים לאירוע שלנו!\n\n📅 ${formatDate(currentEvent.eventDate)}\n📍 ${currentEvent.venue}\n\n🔗 לאשר הגעה ולעדכן סטטוס: ${guestLink}\n\nבברכה,\n${currentEvent.coupleName}`;
      }

      const { messageService } = await import('../services/messageService');
      
      // CRITICAL FIX: Use event invitation image if available, otherwise use campaign image
      // Priority: event.invitationImageUrl > campaign.imageUrl
      const finalImageUrl = currentEvent.invitationImageUrl || campaignImageUrl;
      
      console.log('🖼️ Image URL priority check:', {
        eventInvitationImageUrl: currentEvent.invitationImageUrl,
        campaignImageUrl: campaignImageUrl,
        finalImageUrl: finalImageUrl
      });
      
      const result = await messageService.sendBulkMessages({
        message,
        imageUrl: finalImageUrl,
        // Use template from campaign if it's the first campaign
        templateName: firstCampaign?.templateName,
        recipients: [{
          id: guest.id,
          firstName: guest.firstName,
          lastName: guest.lastName,
          phoneNumber: guest.phoneNumber,
          channel: messageChannel,
          message: message,
          firstMessageSent: guest.firstMessageSent || false, // Pass first message status
          eventData: {
            coupleName: currentEvent.coupleName,
            groomName: currentEvent.groomName,
            brideName: currentEvent.brideName,
            eventType: currentEvent.eventType,
            eventTypeHebrew: currentEvent.eventTypeHebrew,
            eventDate: formatDate(currentEvent.eventDate),
            eventTime: currentEvent.eventTime,
            venue: currentEvent.venue,
            invitationImageUrl: finalImageUrl // Use event image first, then campaign image
          },
              // Add template params if using template "aa"
              // Template "aa" requires 9 parameters in order: guest_name, event_type, bride_name, groom_name, event_date, event_time, venue, guest_response_link, couple_name
              // NOTE: Based on error message, the parameter name in Meta is "guest_response_link"
              templateParams: firstCampaign?.templateName ? {
                guest_name: guest.firstName,
                event_type: currentEvent.eventTypeHebrew,
                bride_name: currentEvent.brideName, // Parameter 3 - bride_name comes BEFORE groom_name in Meta template
                groom_name: currentEvent.groomName, // Parameter 4 - groom_name comes AFTER bride_name in Meta template
                event_date: formatDate(currentEvent.eventDate),
                event_time: currentEvent.eventTime,
                venue: currentEvent.venue,
                guest_response_link: guestLink, // Using guest_response_link as per Meta template definition
                couple_name: currentEvent.coupleName
              } : undefined
        }]
      });

      // Update guest channel and message status based on actual result
      if (result.results.length > 0) {
        const messageResult = result.results[0];
        if (messageResult.success) {
          let messageStatus = 'sent';
          if (messageResult.channel === 'sms') {
            messageStatus = 'sms_sent';
          } else if (messageResult.fallbackUsed) {
            messageStatus = 'sms_sent'; // WhatsApp failed, SMS was sent
          }
          
          updateGuest(currentEvent.id, guest.id, { 
            channel: messageResult.channel,
            messageStatus: messageStatus as any,
            messageSentDate: new Date()
          });
        }
      }

      if (result.successful > 0) {
        const channel = result.results[0]?.channel === 'whatsapp' ? 'WhatsApp' : 'SMS';
        const warning = result.results[0]?.warning;
        let message = `✅ הודעה נשלחה בהצלחה ל-${guest.firstName} ${guest.lastName}!\n\n📱 ערוץ: ${channel}\n📞 טלפון: ${guest.phoneNumber}`;
        
        if (warning) {
          message += `\n\n⚠️ הערה חשובה:\n${warning}`;
        }
        
        // Add WhatsApp-specific warnings
        if (channel === 'WhatsApp') {
          message += `\n\n💡 אם ההודעה לא הגיעה, בדוק:\n`;
          message += `1. זו הודעה ראשונה - WhatsApp דורש Template מאושר\n`;
          message += `2. המספר לא חסם אותך\n`;
          message += `3. המספר פעיל ב-WhatsApp\n`;
          message += `4. ה-Template מאושר ב-Meta Business Manager\n`;
          message += `\n📊 עדכוני סטטוס (נשלח/נמסר/נקרא) יגיעו דרך webhook`;
        }
        
        alert(message);
      } else {
        const error = result.results[0]?.error || 'שגיאה לא ידועה';
        console.error('❌ WhatsApp sending failed:', error);
        console.error('📋 Full result:', result);
        alert(`❌ שגיאה בשליחת הודעה ל-${guest.firstName} ${guest.lastName}\n\n🔍 שגיאה: ${error}\n\n💡 אנא פתח את הקונסול (F12) לפרטים נוספים`);
      }
    } catch (error: any) {
      console.error('❌ Error sending message:', error);
      console.error('📋 Error details:', {
        message: error?.message,
        stack: error?.stack,
        fullError: error
      });
      alert(`❌ שגיאה בשליחת ההודעה\n\n🔍 שגיאה: ${error?.message || 'שגיאה לא ידועה'}\n\n💡 אנא פתח את הקונסול (F12) לפרטים נוספים`);
    }
  };

  try {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto space-y-6">
        {/* Sync Monitoring Panel */}
        {id && <SyncMonitoringPanel eventId={id} />}
        
        {/* Header */}
        <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <button
              onClick={() => navigate('/')}
              className="flex items-center text-gray-600 hover:text-gray-800"
            >
              <ArrowRight className="w-5 h-5 ml-2" />
              חזרה לדשבורד
            </button>
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{currentEvent.coupleName}</h1>
            <p className="text-gray-600">
              {formatDate(currentEvent.eventDate)} - {currentEvent.eventTime} | {currentEvent.venue}
            </p>
            <p className="text-sm text-yellow-500 font-medium">בס"ד אירועים - אישורי הגעה וסידורי הושבה</p>
          </div>
        </div>
        
        <div className="flex space-x-3">
          <button
            onClick={() => setShowSendMessageModal(true)}
            className="btn-warning flex items-center space-x-2"
            disabled={selectedGuests.length === 0}
          >
            <Send className="w-4 h-4" />
            <span>שלח הודעה ({selectedGuests.length})</span>
          </button>
          
          <button
            onClick={handleDeleteSelectedGuests}
            className="btn-danger flex items-center space-x-2"
            disabled={selectedGuests.length === 0}
            title="מחק את כל האורחים המסומנים"
          >
            <Trash2 className="w-4 h-4" />
            <span>מחק מסומנים ({selectedGuests.length})</span>
          </button>
          <Link
            to={`/event/${currentEvent.id}/campaigns`}
            className="btn-primary flex items-center space-x-2"
          >
            <MessageSquare className="w-4 h-4" />
            <span>ניהול קמפיינים</span>
          </Link>
          <Link
            to={`/event/${currentEvent.id}/seating`}
            className="btn-secondary flex items-center space-x-2"
          >
            <Users className="w-4 h-4" />
            <span>סידורי הושבה</span>
          </Link>
          <Link
            to={`/client/${currentEvent.id}`}
            target="_blank"
            className="btn-success flex items-center space-x-2"
          >
            <Users className="w-4 h-4" />
            <span>ממשק לקוח</span>
          </Link>
          <div className="relative" ref={exportMenuRef}>
            <button 
              onClick={() => {
                console.log('🔘 Excel button clicked, showExportMenu:', showExportMenu);
                setShowExportMenu(!showExportMenu);
              }}
              className="btn-secondary flex items-center space-x-2"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>אקסל</span>
              <ChevronDown className={`w-4 h-4 transition-transform ${showExportMenu ? 'rotate-180' : ''}`} />
            </button>
            {showExportMenu && (
              <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
                <button
                  onClick={() => {
                    handleExportGuests();
                    setShowExportMenu(false);
                  }}
                  className="w-full text-right px-4 py-3 hover:bg-gray-50 flex items-center space-x-2 space-x-reverse transition-colors rounded-t-lg border-b border-gray-100"
                >
                  <Download className="w-4 h-4" />
                  <span>ייצוא רשימת אורחים</span>
                </button>
                <button
                  onClick={() => {
                    setShowImportModal(true);
                    setShowExportMenu(false);
                  }}
                  className="w-full text-right px-4 py-3 hover:bg-gray-50 flex items-center space-x-2 space-x-reverse transition-colors rounded-b-lg"
                >
                  <Upload className="w-4 h-4" />
                  <span>ייבוא רשימת אורחים</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Enhanced Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-7 gap-4">
        <div className="stat-card-orange">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-orange-700">נותר להושיב</p>
              <p className="text-3xl font-bold text-orange-600">
                {(() => {
                  // Calculate total guests count in tables (sum of guestCount)
                  const seatedGuestsCount = currentEvent.tables?.reduce((acc, table) => {
                    return acc + table.guests.reduce((sum, guestId) => {
                      const guest = currentEvent.guests.find(g => g.id === guestId);
                      return sum + (guest?.guestCount || 1);
                    }, 0);
                  }, 0) || 0;
                  return stats.totalGuests - seatedGuestsCount;
                })()}
              </p>
            </div>
            <Users className="w-8 h-8 text-orange-600" />
          </div>
        </div>

        <div className="stat-card-green">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-green-700">יושבים</p>
              <p className="text-3xl font-bold text-green-600">
                {(() => {
                  // Calculate total guests count in tables (sum of guestCount)
                  return currentEvent.tables?.reduce((acc, table) => {
                    return acc + table.guests.reduce((sum, guestId) => {
                      const guest = currentEvent.guests.find(g => g.id === guestId);
                      return sum + (guest?.guestCount || 1);
                    }, 0);
                  }, 0) || 0;
                })()}
              </p>
            </div>
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
        </div>

        <div className="stat-card-blue">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-blue-700">סה"כ אורחים</p>
              <p className="text-3xl font-bold text-blue-600">{stats.totalGuests}</p>
            </div>
            <Users className="w-8 h-8 text-blue-600" />
          </div>
        </div>

        <div className="stat-card-teal bg-gradient-to-br from-teal-50 to-teal-100 border-2 border-teal-200 rounded-lg p-4 shadow-md">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-teal-700">הגיעו בפועל</p>
              <p className="text-3xl font-bold text-teal-600">
                {(() => {
                  const attendedGuests = currentEvent.guests?.filter(g => g.actualAttendance === 'attended') || [];
                  const totalAttendedCount = attendedGuests.reduce((sum, g) => sum + (g.guestCount || 1), 0);
                  console.log('📊 Calculating attended count:', {
                    records: attendedGuests.length,
                    totalGuests: totalAttendedCount,
                    details: attendedGuests.map(g => ({ name: g.firstName, guestCount: g.guestCount || 1 }))
                  });
                  return totalAttendedCount;
                })()}
              </p>
              <p className="text-xs text-teal-600 mt-1">
                {(() => {
                  const attendedGuests = currentEvent.guests?.filter(g => g.actualAttendance === 'attended') || [];
                  const totalAttendedCount = attendedGuests.reduce((sum, g) => sum + (g.guestCount || 1), 0);
                  return stats.totalGuests > 0 
                    ? `${Math.round((totalAttendedCount / stats.totalGuests) * 100)}%`
                    : '0%';
                })()}
              </p>
            </div>
            <CheckCircle className="w-8 h-8 text-teal-600" />
          </div>
        </div>

        <div className="stat-card-purple">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-purple-700">מגיעים</p>
              <p className="text-3xl font-bold text-purple-600">{stats.confirmed}</p>
            </div>
            <CheckCircle className="w-8 h-8 text-purple-600" />
          </div>
        </div>

        <div className="stat-card-red">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-red-700">לא מגיעים</p>
              <p className="text-3xl font-bold text-red-600">{stats.declined}</p>
            </div>
            <XCircle className="w-8 h-8 text-red-600" />
          </div>
        </div>

        <div className="stat-card-yellow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-yellow-700">אחוז תגובה</p>
              <p className="text-3xl font-bold text-yellow-600">{stats.responseRate}%</p>
            </div>
            <MessageSquare className="w-8 h-8 text-yellow-600" />
          </div>
        </div>
      </div>

      {/* Enhanced Search and Filter */}
      <div className="flex flex-col lg:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="🔍 חיפוש אורחים..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="input-field pr-10 text-lg border-2 border-gray-200 focus:border-blue-500 rounded-xl"
          />
        </div>
        
        <div className="flex gap-2">
          <button className="btn-warning flex items-center space-x-2 px-4 py-2 rounded-lg font-medium">
            <Users className="w-4 h-4" />
            <span>אורחים ממתינים ({stats.totalGuests - (currentEvent.tables?.reduce((acc, table) => {
              const tableGuests = currentEvent.guests?.filter(g => g.tableId === table.id) || [];
              return acc + tableGuests.reduce((sum, guest) => sum + (guest.guestCount || 1), 0);
            }, 0) || 0)})</span>
          </button>
          
          <button className="btn-primary flex items-center space-x-2 px-4 py-2 rounded-lg font-medium">
            <Users className="w-4 h-4" />
            <span>הושב אורח</span>
          </button>
        </div>
        
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="input-field w-full lg:w-48 border-2 border-gray-200 focus:border-blue-500 rounded-xl"
        >
          <option value="all">כל הסטטוסים</option>
          <option value="pending">לא ענה</option>
          <option value="confirmed">מגיע</option>
          <option value="declined">לא מגיע</option>
          <option value="maybe">אולי מגיע</option>
        </select>
        
        <button
          onClick={() => setShowAddGuest(true)}
          className="btn-primary flex items-center space-x-2 px-4 py-2 rounded-lg font-medium"
        >
          <Plus className="w-4 h-4" />
          <span>הוסף מוזמן</span>
        </button>
      </div>

      {/* Add/Edit Guest Modal */}
      {(showAddGuest || editingGuest) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">
                {editingGuest ? 'עריכת מוזמן' : 'הוספת מוזמן חדש'}
              </h3>
              <button
                onClick={() => {
                  setShowAddGuest(false);
                  cancelEdit();
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Search existing guests */}
            <div className="mb-6">
              <div className="relative">
                <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="חיפוש אורחים קיימים..."
                  value={modalSearchTerm}
                  onChange={(e) => setModalSearchTerm(e.target.value)}
                  className="w-full pr-10 pl-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              {modalSearchTerm && (
                <div className="mt-3 max-h-40 overflow-y-auto border border-gray-200 rounded-lg">
                  {modalFilteredGuests.length > 0 ? (
                    <div className="space-y-1 p-2">
                      {modalFilteredGuests.map((guest) => (
                        <div key={guest.id} className="flex items-center justify-between p-2 hover:bg-gray-50 rounded">
                          <div>
                            <span className="text-sm font-medium">
                              {guest.firstName} {guest.lastName}
                            </span>
                            <span className="text-sm text-gray-500 mr-2">
                              {guest.phoneNumber}
                            </span>
                          </div>
                          <button
                            onClick={() => {
                              setNewGuest({
                                firstName: guest.firstName,
                                lastName: guest.lastName,
                                phoneNumber: guest.phoneNumber,
                                guestCount: guest.guestCount,
                                notes: guest.notes || ''
                              });
                              setModalSearchTerm('');
                            }}
                            className="text-blue-600 hover:text-blue-800 text-sm"
                          >
                            בחר
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-4 text-center text-gray-500 text-sm">
                      לא נמצאו אורחים התואמים לחיפוש
                    </div>
                  )}
                </div>
              )}
            </div>
            <form onSubmit={editingGuest ? handleUpdateGuest : handleAddGuest} className="space-y-4">
              <input
                type="text"
                placeholder="שם מלא"
                value={newGuest.firstName}
                onChange={(e) => setNewGuest({...newGuest, firstName: e.target.value})}
                className="input-field"
                required
              />
              
              <input
                type="tel"
                placeholder="מספר טלפון"
                value={newGuest.phoneNumber}
                onChange={(e) => setNewGuest({...newGuest, phoneNumber: e.target.value})}
                className="input-field"
                required
              />
              
              <div className="grid grid-cols-2 gap-4">
                <input
                  type="number"
                  placeholder="מספר מוזמנים"
                  value={newGuest.guestCount}
                  onChange={(e) => setNewGuest({...newGuest, guestCount: parseInt(e.target.value) || 1})}
                  className="input-field"
                  min="1"
                />
                <input
                  type="text"
                  placeholder="הערות (אופציונלי)"
                  value={newGuest.notes}
                  onChange={(e) => setNewGuest({...newGuest, notes: e.target.value})}
                  className="input-field"
                />
              </div>
              
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddGuest(false);
                    cancelEdit();
                  }}
                  className="btn-secondary"
                >
                  ביטול
                </button>
                <button type="submit" className="btn-primary flex items-center space-x-2">
                  <Save className="w-4 h-4" />
                  <span>{editingGuest ? 'עדכן' : 'הוסף'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Guests Table */}
      <div className="card">
        <div className="overflow-x-auto">
          <div className="min-w-full">
          <table className="w-full divide-y divide-gray-200 table-fixed" style={{ minWidth: '1200px' }}>
            <thead className="bg-gradient-to-r from-gray-50 to-gray-100 sticky top-0 z-10">
              <tr>
                <th className="px-3 py-4 text-center text-sm font-semibold text-gray-700 uppercase tracking-wider w-12">
                  #
                </th>
                <th className="px-4 py-4 text-right text-sm font-semibold text-gray-700 uppercase tracking-wider">
                  <input
                    type="checkbox"
                    checked={selectedGuests.length === filteredGuests.length && filteredGuests.length > 0}
                    onChange={selectedGuests.length === filteredGuests.length ? handleDeselectAllGuests : handleSelectAllGuests}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 w-4 h-4"
                  />
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
                <th className="px-3 py-4 text-right text-sm font-semibold text-gray-700 uppercase tracking-wider whitespace-nowrap">
                  פעולות
                </th>
              </tr>
            </thead>
            <tbody key={`${guestsKey}-${forceUpdate}-${eventsVersion}-${filteredGuests.length}-${eventsHash.substring(0, 50)}`} className="bg-white divide-y divide-gray-200">
              {filteredGuests.length === 0 ? (
                <tr>
                  <td colSpan={11} className="px-6 py-12 text-center">
                    <div className="text-gray-500">
                      <Users className="mx-auto h-12  text-gray-400 mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">אין אורחים</h3>
                      <p className="text-gray-500 mb-4">
                        {searchTerm || filterStatus !== 'all' 
                          ? 'לא נמצאו אורחים התואמים לחיפוש' 
                          : 'עדיין לא נוספו אורחים לאירוע זה'
                        }
                      </p>
                      <button
                        onClick={() => {
                          console.log('הוסף אורח ראשון clicked');
                          setShowAddGuest(true);
                        }}
                        className="btn-primary flex items-center justify-center space-x-2 mx-auto w-full max-w-xs py-3 px-6"
                      >
                        <Plus className="w-4 h-4" />
                        <span>הוסף אורח ראשון</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredGuests.map((guest, index) => (
                <tr key={`${guest.id}-${guest.rsvpStatus}-${guest.guestCount}-${guest.actualAttendance}-${guest.tableId}-${eventsVersion}-${index}-${guest.responseDate ? (guest.responseDate instanceof Date ? guest.responseDate.getTime() : new Date(guest.responseDate).getTime()) : ''}`} className={`hover:bg-blue-50 transition-colors duration-200 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                  <td className="px-3 py-4 text-center text-sm font-semibold text-gray-600 w-12">
                    {index + 1}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <input
                      type="checkbox"
                      checked={selectedGuests.includes(guest.id)}
                      onChange={() => handleSelectGuest(guest.id)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 w-4 h-4"
                    />
                  </td>
                  <td className="px-4 py-4 w-40">
                    <div>
                      <div className="text-sm font-semibold text-gray-900 break-words">
                        {guest.firstName} {guest.lastName}
                      </div>
                      {guest.notes && (
                        <div className="text-xs text-gray-500 break-words mt-1">{guest.notes}</div>
                      )}
                    </div>
                  </td>
                  <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                    {guest.phoneNumber}
                  </td>
                  <td className="px-3 py-4 text-sm text-gray-900 w-24 min-w-[100px]">
                    <input
                      type="number"
                      value={guest.guestCount}
                      onChange={(e) => handleUpdateGuestField(guest.id, { guestCount: parseInt(e.target.value) || 1 })}
                      className="w-full text-center border-2 border-gray-200 rounded-lg px-2 py-1 text-sm focus:border-blue-500 focus:outline-none"
                      min="1"
                    />
                  </td>
                  <td className="px-3 py-4 w-32 min-w-[120px]">
                    <select
                      value={guest.rsvpStatus}
                      onChange={(e) => handleUpdateGuestStatus(guest.id, e.target.value)}
                      className={`text-sm font-semibold ${getStatusColor(guest.rsvpStatus)} bg-transparent border-2 border-gray-200 rounded-lg px-2 py-1 w-full focus:outline-none focus:border-blue-500`}
                    >
                      <option value="pending">לא ענה</option>
                      <option value="confirmed">מגיע</option>
                      <option value="declined">לא מגיע</option>
                      <option value="maybe">אולי מגיע</option>
                    </select>
                  </td>
                  <td className="px-3 py-4 w-32 min-w-[120px]">
                    <select
                      value={guest.actualAttendance || 'not_marked'}
                      onChange={(e) => handleUpdateAttendance(guest.id, e.target.value)}
                      className="text-sm font-semibold bg-transparent border-2 border-gray-200 rounded-lg px-2 py-1 w-full focus:outline-none focus:border-blue-500"
                    >
                      <option value="not_marked">לא סומן</option>
                      <option value="attended">הגיע</option>
                      <option value="not_attended">לא הגיע</option>
                    </select>
                  </td>
                  <td className="px-3 py-4 text-sm text-gray-500 w-32 min-w-[120px]">
                    <select
                      value={guest.channel || 'manual'}
                      onChange={(e) => handleUpdateGuestField(guest.id, { channel: e.target.value as 'whatsapp' | 'sms' | 'manual' })}
                      className="text-sm border-2 border-gray-200 rounded-lg px-2 py-1 bg-white focus:outline-none focus:border-blue-500 w-full"
                    >
                      <option value="whatsapp">וואטסאפ</option>
                      <option value="sms">SMS</option>
                      <option value="manual">ידני</option>
                    </select>
                  </td>
                  <td className="px-3 py-4 text-sm text-gray-500 w-36 min-w-[140px]">
                    <select
                      value={guest.tableId || ''}
                      onChange={(e) => {
                        const tableId = e.target.value;
                        if (tableId) {
                          handleUpdateGuestField(guest.id, { 
                            tableId: tableId
                          });
                        } else {
                          handleUpdateGuestField(guest.id, { tableId: undefined });
                        }
                      }}
                      className="text-sm border-2 border-gray-200 rounded-lg px-2 py-1 bg-white focus:outline-none focus:border-blue-500 w-full"
                    >
                      <option value="">ללא שולחן</option>
                      {currentEvent.tables?.map(table => (
                        <option key={table.id} value={table.id}>
                          שולחן {table.number}
                        </option>
                      ))}
                    </select>
                    {/* Display table number from notes if tableId doesn't exist */}
                    {!guest.tableId && guest.notes && guest.notes.includes('שולחן:') && (
                      <div className="text-xs text-blue-600 font-semibold mt-1">
                        {(() => {
                          const match = guest.notes.match(/שולחן:\s*(\d+)/);
                          return match ? `שולחן ${match[1]}` : null;
                        })()}
                      </div>
                    )}
                    {/* Show message if no table number at all */}
                    {!guest.tableId && (!guest.notes || !guest.notes.includes('שולחן:')) && (
                      <div className="text-xs text-gray-400 italic mt-1">
                        ללא שולחן
                      </div>
                    )}
                  </td>
                  <td className="px-3 py-4 text-sm text-gray-500 w-36 min-w-[140px]">
                    <select
                      value={guest.messageStatus || 'not_sent'}
                      onChange={(e) => handleUpdateGuestField(guest.id, { messageStatus: e.target.value })}
                      className={`text-sm font-semibold ${getMessageStatusColor(guest.messageStatus || 'not_sent')} bg-transparent border-2 border-gray-200 rounded-lg px-2 py-1 w-full focus:outline-none focus:border-blue-500`}
                    >
                      <option value="not_sent">לא נשלחה</option>
                      <option value="sent">נשלחה</option>
                      <option value="delivered">נשלחה והתקבלה</option>
                      <option value="failed">נשלחה ונכשלה</option>
                      <option value="sms_sent">נשלח SMS</option>
                    </select>
                  </td>
                  <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-500 w-28">
                    {guest.messageSentDate ? formatDate(guest.messageSentDate) : '-'}
                  </td>
                  <td className="px-3 py-4 whitespace-nowrap text-sm font-medium w-24">
                    <div className="flex items-center space-x-1">
                      <button
                        onClick={() => handleSendToSingleGuest(guest)}
                        className="text-green-600 hover:text-green-900 p-2 rounded-lg hover:bg-green-50 transition-colors duration-200"
                        title="שלח הודעה"
                      >
                        <Send className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleEditGuest(guest)}
                        className="text-blue-600 hover:text-blue-900 p-2 rounded-lg hover:bg-blue-50 transition-colors duration-200"
                        title="ערוך"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteGuest(guest.id)}
                        className="text-red-600 hover:text-red-900 p-2 rounded-lg hover:bg-red-50 transition-colors duration-200"
                        title="מחק"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
                ))
              )}
            </tbody>
          </table>
          </div>
        </div>
      </div>

      {/* Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96 max-w-md mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">ייבוא רשימת אורחים מקובץ</h3>
            
            <div className="space-y-4">
              <div className="bg-teal-50 p-4 rounded-lg">
                <h4 className="font-medium text-teal-900 mb-2">הוראות ייבוא:</h4>
                <ol className="text-sm text-teal-800 space-y-1 list-decimal list-inside">
                  <li>הורד את קובץ התבנית "תבנית רשימת אורחים"</li>
                  <li>מלא את פרטי האורחים בקובץ</li>
                  <li>שמור כקובץ Excel (.xlsx) או CSV</li>
                  <li>העלה את הקובץ כאן</li>
                </ol>
                <div className="mt-2 text-sm text-teal-700">
                  <strong>עמודות נדרשות:</strong> הערות | שיוך למשפחה | כמות מגיעים | פלאפון האורח | שם האורח
                </div>
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={handleDownloadTemplate}
                  className="btn-secondary flex-1 flex items-center justify-center space-x-2"
                >
                  <Download className="w-4 h-4" />
                  <span>הורד תבנית רשימת אורחים</span>
                </button>
                
                <label className="btn-primary flex-1 flex items-center justify-center space-x-2 cursor-pointer">
                  <Upload className="w-4 h-4" />
                  <span>העלה רשימת אורחים</span>
                  <input
                    type="file"
                    accept=".csv,.xlsx,.xls"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowImportModal(false)}
                className="btn-secondary"
              >
                ביטול
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Send Message Modal */}
      {showSendMessageModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4">שליחת הודעה למוזמנים נבחרים</h3>
            
            <div className="space-y-4">
              <div className="bg-yellow-50 border border-yello0 rounded-lg p-3">
                <p className="text-yellow-800 text-sm font-medium">📱 שליחת הודעות אמיתית מופעלת!</p>
                <p className="text-yellow-700 text-sm mt-1">
                  נבחרו {selectedGuests.length} מוזמנים לשליחה
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  ערוץ שליחה
                </label>
                <div className="flex space-x-4">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      value="whatsapp"
                      checked={messageChannel === 'whatsapp'}
                      onChange={(e) => setMessageChannel(e.target.value as 'whatsapp' | 'sms')}
                      className="ml-2"
                    />
                    <MessageSquare className="w-4 h-4 text-green-600 ml-1" />
                    <span className="text-sm">וואטסאפ</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      value="sms"
                      checked={messageChannel === 'sms'}
                      onChange={(e) => setMessageChannel(e.target.value as 'whatsapp' | 'sms')}
                      className="ml-2"
                    />
                    <Phone className="w-4 h-4 text-blue-600 ml-1" />
                    <span className="text-sm">SMS</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  תוכן ההודעה (אופציונלי)
                </label>
                <textarea
                  value={customMessage}
                  onChange={(e) => setCustomMessage(e.target.value)}
                  className="input-field h-32"
                  placeholder="השאר ריק לשימוש בהודעה ברירת מחדל..."
                />
                <p className="text-sm text-gray-500 mt-1">
                  אם תשאיר ריק, תישלח הודעה ברירת מחדל עם פרטי האירוע
                </p>
              </div>

              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-sm font-medium text-gray-700 mb-2">מוזמנים נבחרים:</p>
                <div className="max-h-32 overflow-y-auto">
                  {selectedGuests.map(guestId => {
                    const guest = currentEvent.guests.find(g => g.id === guestId);
                    return guest ? (
                      <div key={guestId} className="text-sm text-gray-600 py-1">
                        {guest.firstName} {guest.lastName} - {guest.phoneNumber}
                      </div>
                    ) : null;
                  })}
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <button
                onClick={() => {
                  setShowSendMessageModal(false);
                  setSelectedGuests([]);
                  setCustomMessage('');
                }}
                className="btn-secondary"
              >
                ביטול
              </button>
              <button
                onClick={handleSendMessage}
                className="btn-warning flex items-center space-x-2"
              >
                <Send className="w-4 h-4" />
                <span>שלח הודעה</span>
              </button>
            </div>
          </div>
        </div>
      )}
        </div>
      </div>
    );
  } catch (error) {
    console.error('Error rendering EventManagement:', error);
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
        <h2 className="text-lg font-semibold text-red-800 mb-2">שגיאה בטעינת הדף</h2>
        <p className="text-red-600">אירעה שגיאה בטעינת דף ניהול האירוע. אנא רענן את הדף ונסה שוב.</p>
        <button 
          onClick={() => window.location.reload()}
          className="mt-3 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
        >
          רענן דף
        </button>
      </div>
    );
  }
};

export default EventManagement;