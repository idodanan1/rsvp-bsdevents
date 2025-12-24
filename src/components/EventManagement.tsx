import React, { useState, useEffect, useRef, useMemo, startTransition, useCallback, ChangeEvent } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useEventStore } from '../store/eventStore';
import { Event, Guest, Table, Campaign } from '../types';
import { calculateEventStats, formatDate, getStatusColor, formatFullName, cleanName, generateGuestResponseLink } from '../utils/helpers';
import { webhookService } from '../services/webhookService';
// Import messageService dynamically to avoid circular dependency issues
// import { messageService } from '../services/messageService';
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
  Edit,
  Trash2,
  Save,
  Send,
  X,
  RefreshCw,
  ChevronDown,
  FileSpreadsheet,
  Camera,
  Activity,
  BarChart3,
  Clock,
  Play,
  AlertCircle
} from 'lucide-react';
import SyncMonitoringPanel from './SyncMonitoringPanel';

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

const EventManagement: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  // CRITICAL: Use specific selectors to ensure React detects changes
  // This ensures the component re-renders when the specific event changes
  // CRITICAL: Subscribe to events array length AND a version counter to force re-renders
  const events = useEventStore((state: any) => state.events);
  const currentEvent = useEventStore((state: any) => state.currentEvent);
  const isLoading = useEventStore((state: any) => state.isLoading);
  // CRITICAL: Use a simple primitive selector to avoid React #310 errors
  // Subscribe to events length and currentEvent id to trigger re-renders
  const eventsLength = useEventStore((state: any) => state.events.length);
  const currentEventId = useEventStore((state: any) => state.currentEvent?.id || '');
  const currentEventUpdatedAt = useEventStore((state: any) => {
    if (!state.currentEvent?.updatedAt) return 0;
    const date = state.currentEvent.updatedAt instanceof Date 
      ? state.currentEvent.updatedAt 
      : new Date(state.currentEvent.updatedAt);
    return isNaN(date.getTime()) ? 0 : date.getTime();
  });
  
  // CRITICAL: Get events array to detect changes even when currentEvent is undefined
  // This ensures updates from guest response page are detected
  const eventsUpdatedAtHash = useEventStore((state: any) => {
    // Create a hash from all events' updatedAt timestamps to detect changes
    return state.events.map((e: Event) => {
      const updatedAt = e.updatedAt ? (e.updatedAt instanceof Date ? e.updatedAt.getTime() : new Date(e.updatedAt).getTime()) : 0;
      return `${e.id}:${updatedAt}`;
    }).join('||');
  });
  
  // CRITICAL: Create a stable hash using useMemo with ONLY primitive dependencies
  // This avoids React #310 errors by using stable primitive values as dependencies
  const eventsHash = useMemo(() => {
    const state = useEventStore.getState();
    // Create a hash from events that changes when any event or guest changes
      const eventsToHash = state.events.map((e: Event) => {
      // If this is the currentEvent, use currentEvent data (it's more up-to-date)
      const eventToUse = (state.currentEvent && state.currentEvent.id === e.id) ? state.currentEvent : e;
      
        const guestsHash = eventToUse.guests?.map((g: Guest) => {
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
      const eventUpdatedAt = eventToUse.updatedAt ? (eventToUse.updatedAt instanceof Date ? eventToUse.updatedAt.getTime() : new Date(eventToUse.updatedAt).getTime()) : 0;
      return `${e.id}:${eventUpdatedAt}:${guestsHash}`;
    }).join('||');
    
    // CRITICAL: Also include currentEvent hash to catch immediate updates
    const currentEventHash = state.currentEvent ? (() => {
      const guestsHash = state.currentEvent.guests?.map((g: Guest) => {
        try {
          let responseDateValue = '';
          if (g.responseDate) {
            const date = g.responseDate instanceof Date ? g.responseDate : new Date(g.responseDate);
            responseDateValue = isNaN(date.getTime()) ? '' : String(date.getTime());
          }
          return `${g.id}:${g.rsvpStatus}:${g.guestCount}:${g.actualAttendance}:${g.tableId || ''}:${g.notes || ''}:${responseDateValue}`;
        } catch (error) {
          return `${g.id}:${g.rsvpStatus}:${g.guestCount}:${g.actualAttendance}:${g.tableId || ''}:${g.notes || ''}:`;
        }
      }).join('|') || '';
      const eventUpdatedAt = state.currentEvent.updatedAt ? (state.currentEvent.updatedAt instanceof Date ? state.currentEvent.updatedAt.getTime() : new Date(state.currentEvent.updatedAt).getTime()) : 0;
      return `||current:${state.currentEvent.id}:${eventUpdatedAt}:${guestsHash}`;
    })() : '';
    
    // CRITICAL: Combine both hashes to ensure we catch updates from both sources
    return `${eventsToHash}${currentEventHash}`;
  }, [eventsLength, currentEventId, currentEventUpdatedAt, eventsUpdatedAtHash]);
  const setCurrentEvent = useEventStore((state: any) => state.setCurrentEvent);
  const addGuest = useEventStore((state: any) => state.addGuest);
  const updateGuest = useEventStore((state: any) => state.updateGuest);
  const deleteGuest = useEventStore((state: any) => state.deleteGuest);
  const fetchEvents = useEventStore((state: any) => state.fetchEvents);
  const assignGuestToTable = useEventStore((state: any) => state.assignGuestToTable);
  const removeGuestFromTable = useEventStore((state: any) => state.removeGuestFromTable);
  const moveGuestToTable = useEventStore((state: any) => state.moveGuestToTable);
  const syncCurrentEventToAPI = useEventStore((state: any) => state.syncCurrentEventToAPI);
  const recreateCampaigns = useEventStore((state: any) => state.recreateCampaigns);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [messageFilterStatus, setMessageFilterStatus] = useState<string>('all');
  const [showAddGuest, setShowAddGuest] = useState(false);
  const [editingGuest, setEditingGuest] = useState<any>(null);
  const [modalSearchTerm, setModalSearchTerm] = useState('');
  const [showImportModal, setShowImportModal] = useState(false);
  const [showSendMessageModal, setShowSendMessageModal] = useState(false);
  const [showSyncMonitoringModal, setShowSyncMonitoringModal] = useState(false);
  const [pendingUpdatesCount, setPendingUpdatesCount] = useState(0);
  const [isProcessingPendingUpdates, setIsProcessingPendingUpdates] = useState(false);
  const [selectedGuests, setSelectedGuests] = useState<string[]>([]);
  const [messageChannel] = useState<'whatsapp'>('whatsapp');
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
    
    // CRITICAL: Perform initial sync of all WhatsApp updates when component mounts
    // This ensures all pending updates from WhatsApp are processed immediately
    // Process ALL updates (not just today's) to catch any missed updates
    webhookService.syncAllUpdates(false).then(result => {
      if (result.processed > 0) {
        console.log(`✅ Initial sync completed: ${result.processed} updates processed, ${result.failed} failed, ${result.remaining} remaining`);
        // Refresh events to show updated data
        fetchEvents(false, true).catch(err => {
          console.warn('⚠️ Failed to refresh events after initial sync:', err);
        });
      } else if (result.remaining > 0) {
        console.log(`ℹ️ No updates processed, but ${result.remaining} updates remain (may need manual processing)`);
      }
    }).catch(err => {
      console.warn('⚠️ Initial sync failed (non-critical):', err);
    });
    
    // Initial fetch
    fetchEvents().catch(error => {
      console.error('❌ Error initial fetch:', error);
    });
    
    // No auto-refresh or polling - user will use manual refresh button
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]); // Removed fetchEvents from deps to prevent infinite loop

  // Manual refresh handler
  const handleRefresh = async () => {
    try {
      await fetchEvents(false);
    } catch (error) {
      console.error('❌ Error refreshing events:', error);
    }
  };

  // Check for pending updates
  useEffect(() => {
    if (!id) return;
    
    const checkPendingUpdates = async () => {
      try {
        const BACKEND_URL = (import.meta.env as any).VITE_BACKEND_URL || 'https://whatsapp-backend-enfz.onrender.com';
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3000);
        
        const response = await fetch(`${BACKEND_URL}/api/guests/pending-updates?all=true`, {
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (response.ok) {
          const data = await response.json();
          const totalPending = data.totalPending || 0;
          console.log(`📊 EventManagement: Found ${totalPending} pending updates`);
          setPendingUpdatesCount(totalPending);
        }
      } catch (error) {
        // Silent fail - don't show error to user
      }
    };

    checkPendingUpdates();
    const interval = setInterval(checkPendingUpdates, 30000); // Check every 30 seconds
    return () => clearInterval(interval);
  }, [id]);

  // Handle processing pending updates
  const handleProcessPendingUpdates = async () => {
    setIsProcessingPendingUpdates(true);
    try {
      const BACKEND_URL = (import.meta.env as any).VITE_BACKEND_URL || 'https://whatsapp-backend-enfz.onrender.com';
      
      // First, check current pending count before processing
      let pendingBeforeProcessing = pendingUpdatesCount;
      try {
        const checkResponse = await fetch(`${BACKEND_URL}/api/guests/pending-updates?all=true`, {
          signal: AbortSignal.timeout(3000)
        });
        if (checkResponse.ok) {
          const checkData = await checkResponse.json();
          pendingBeforeProcessing = checkData.totalPending || 0;
          console.log(`📊 Pending updates before processing: ${pendingBeforeProcessing}`);
        }
      } catch (err) {
        console.warn('⚠️ Could not check pending count before processing:', err);
      }
      
      console.log(`🔄 Processing all pending updates...`);
      
      const response = await fetch(`${BACKEND_URL}/api/guests/process-all-updates`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log(`✅ Processed ${data.processed} updates, ${data.failed} failed, ${data.remaining} remaining`);
        console.log(`📊 Processed updates details:`, data.processedUpdates?.slice(0, 5));
        
        // Update pending count immediately
        setPendingUpdatesCount(data.remaining || 0);
        
        // CRITICAL: Always refresh the table, even if processed count is 0
        // This is because updates might have been processed by automatic sync on component mount
        // Refresh events to show updated data - use force refresh
        console.log(`🔄 Refreshing events after processing updates...`);
        await fetchEvents(true, true); // Force refresh to get latest data
        console.log(`✅ Events refreshed after processing updates`);
        
        // Show appropriate message
        if (data.processed > 0) {
          alert(`✅ עובדו ${data.processed} עדכונים בהצלחה!${data.failed > 0 ? `\n⚠️ ${data.failed} עדכונים נכשלו.` : ''}\n\n🔄 הטבלה מתעדכנת...`);
        } else if (pendingBeforeProcessing > 0 && data.remaining === 0) {
          // Updates were already processed (probably by automatic sync)
          alert(`ℹ️ כל העדכונים כבר עובדו (${pendingBeforeProcessing} עדכונים).\n\n🔄 מרענן את הטבלה...`);
        } else if (data.remaining > 0) {
          // Some updates remain (failed to process)
          alert(`⚠️ ${data.remaining} עדכונים עדיין ממתינים לעיבוד.\n${data.failed > 0 ? `\n❌ ${data.failed} עדכונים נכשלו.` : ''}\n\n🔄 מרענן את הטבלה...`);
        } else {
          alert('ℹ️ לא נמצאו עדכונים לעיבוד.\n\n🔄 מרענן את הטבלה...');
        }
        
        // Wait a bit and refresh again to ensure all updates are reflected
        setTimeout(async () => {
          console.log(`🔄 Second refresh to ensure all updates are reflected...`);
          await fetchEvents(true, true);
          console.log(`✅ Second refresh completed`);
          
          // Also refresh pending count after a delay to ensure it's accurate
          try {
            const refreshCheckResponse = await fetch(`${BACKEND_URL}/api/guests/pending-updates?all=true`, {
              signal: AbortSignal.timeout(3000)
            });
            if (refreshCheckResponse.ok) {
              const refreshCheckData = await refreshCheckResponse.json();
              setPendingUpdatesCount(refreshCheckData.totalPending || 0);
              console.log(`📊 Updated pending count after refresh: ${refreshCheckData.totalPending || 0}`);
            }
          } catch (err) {
            console.warn('⚠️ Could not refresh pending count:', err);
          }
        }, 1000);
      } else {
        const errorText = await response.text();
        console.error(`❌ Backend processing failed: ${response.status}`, errorText);
        throw new Error(`Backend processing failed: ${response.status}`);
      }
    } catch (error) {
      console.error('❌ Error processing pending updates:', error);
      alert('❌ שגיאה בעיבוד עדכונים ממתינים. נסה שוב.');
    } finally {
      setIsProcessingPendingUpdates(false);
    }
  };

  // CRITICAL: Track last guests key to detect changes
  const lastGuestsKeyRef = useRef<string>('');
  const lastEventIdRef = useRef<string>('');
  const lastEventUpdatedAtRef = useRef<number>(0);
  
  // CRITICAL: Single useEffect to update currentEvent when events array changes
  // This ensures UI updates immediately when guest status changes via link or WhatsApp buttons
  useEffect(() => {
    if (!id) return;
    
    // Wait a bit for events to load if they're empty
    if (events.length === 0) {
      return;
    }
    
    const event = events.find((e: Event) => e.id === id);
    if (!event) {
      // CRITICAL: Clear currentEvent if event not found to prevent "לא נמצא אירוע פעיל" errors
      if (currentEvent && currentEvent.id === id) {
        console.warn('⚠️ Event not found in events array, clearing currentEvent');
        setCurrentEvent(null);
      }
      
      // Event not found - redirect after a short delay to allow events to load
      const timeout = setTimeout(() => {
        // Use events from closure instead of getState() to avoid React hooks issues
        if (events.length > 0 && !events.find((e: Event) => e.id === id)) {
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
      lastEventUpdatedAtRef.current = 0;
    }
    
    // CRITICAL: Check if event was actually updated (by updatedAt timestamp)
    // This prevents unnecessary updates when events array is recreated but content is the same
    const eventUpdatedAt = event.updatedAt ? (event.updatedAt instanceof Date ? event.updatedAt.getTime() : new Date(event.updatedAt).getTime()) : 0;
    const lastEventUpdatedAt = lastEventUpdatedAtRef.current || 0;
    const eventActuallyUpdated = eventUpdatedAt !== lastEventUpdatedAt;
    
    // Create a key from guests to detect changes
    // CRITICAL: Include responseDate to detect updates even if status doesn't change
    const newGuestsKey = event.guests?.map((g: Guest) => {
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
    // CRITICAL: Always update if currentEvent is null or doesn't match the event ID
    // This ensures currentEvent is set even if nothing changed (initial load)
    const shouldUpdate = event.id === id && (
      !currentEvent || 
      currentEvent.id !== id || 
      guestsChanged || 
      eventChanged || 
      eventActuallyUpdated
    );
    if (shouldUpdate) {
      // Update currentEvent when guests change
      
      // CRITICAL: Always create new object reference with new guest array references to force React re-render
      // This ensures the table updates immediately when guest status changes
      const newCurrentEvent = { 
        ...event,
        guests: event.guests ? event.guests.map((g: Guest) => ({ ...g })) : [] // New array and new object references
      };
      setCurrentEvent(newCurrentEvent);
      console.log('✅ Updated currentEvent in EventManagement useEffect:', newCurrentEvent.id, 'guests:', newCurrentEvent.guests.length);
      
      // Update refs AFTER setting state to prevent infinite loops
      lastGuestsKeyRef.current = newGuestsKey;
      lastEventUpdatedAtRef.current = eventUpdatedAt;
      
      // Log message statistics for verification
      if (newCurrentEvent.guests && newCurrentEvent.guests.length > 0) {
        const messageStats = {
          total: newCurrentEvent.guests.length,
          not_sent: newCurrentEvent.guests.filter((g: Guest) => !g.messageStatus || g.messageStatus === 'not_sent').length,
          sent: newCurrentEvent.guests.filter((g: Guest) => g.messageStatus === 'sent').length,
          delivered: newCurrentEvent.guests.filter((g: Guest) => g.messageStatus === 'delivered').length,
          failed: newCurrentEvent.guests.filter((g: Guest) => g.messageStatus === 'failed').length,
          sent_or_delivered: newCurrentEvent.guests.filter((g: Guest) => g.messageStatus === 'sent' || g.messageStatus === 'delivered').length
        };
        console.log('📊 Message Statistics:', messageStats);
        console.log('✅ Verified: Delivered messages count =', messageStats.delivered);
        if (messageStats.delivered === 53) {
          console.log('✅ Confirmed: Exactly 53 messages were successfully delivered');
        } else {
          console.log(`ℹ️ Note: Delivered count is ${messageStats.delivered}, not 53`);
        }
      }
    }
    // CRITICAL: Do NOT include currentEvent in dependencies to prevent infinite loop
    // The useEffect should only run when events array changes, not when currentEvent changes
  }, [id, events, setCurrentEvent, navigate]); // Removed currentEvent to prevent infinite loop

  // CRITICAL: Auto-sync event to API when it's loaded and has guests
  // This ensures that if the local event has guests but the server doesn't, it gets synced automatically
  const syncedEventsRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    if (!id || !currentEvent || currentEvent.id !== id) {
      return;
    }
    
    // Only sync if event has guests
    if (!currentEvent.guests || currentEvent.guests.length === 0) {
      return;
    }
    
    // Only sync once per event (tracked by ref)
    if (syncedEventsRef.current.has(currentEvent.id)) {
      return;
    }
    
    // Mark as synced immediately to prevent duplicate syncs
    syncedEventsRef.current.add(currentEvent.id);
    
    // Sync in background (don't await to avoid blocking UI)
    console.log(`🔄 Auto-syncing event ${currentEvent.id} with ${currentEvent.guests.length} guests to server...`);
    syncCurrentEventToAPI(currentEvent.id).catch((error: any) => {
      console.warn('⚠️ Auto-sync failed:', error);
      // Remove from synced set so we can retry later
      syncedEventsRef.current.delete(currentEvent.id);
    });
  }, [id, currentEvent, syncCurrentEventToAPI]);

  // CRITICAL: Force immediate table update when currentEvent changes
  // This ensures the table updates immediately when guest status changes via link or WhatsApp
  const currentEventGuestsKeyRef = useRef<string>('');
  useEffect(() => {
    if (!currentEvent || !currentEvent.guests || currentEvent.id !== id) {
      return;
    }
    
    // Create a key from guests to detect changes
    const guestsKey = currentEvent.guests.map((g: Guest) => {
      try {
        let responseDateValue = '';
        if (g.responseDate) {
          const date = g.responseDate instanceof Date ? g.responseDate : new Date(g.responseDate);
          responseDateValue = isNaN(date.getTime()) ? '' : String(date.getTime());
        }
        return `${g.id}:${g.rsvpStatus}:${g.guestCount}:${g.actualAttendance}:${g.messageStatus || ''}:${responseDateValue}`;
      } catch (error) {
        return `${g.id}:${g.rsvpStatus}:${g.guestCount}:${g.actualAttendance}:${g.messageStatus || ''}:`;
      }
    }).join('|');
    
    // Only update if guests actually changed
    if (guestsKey !== currentEventGuestsKeyRef.current) {
      currentEventGuestsKeyRef.current = guestsKey;
      
      // Force guestsToDisplay to recalculate by incrementing eventsVersion
      // This ensures the table updates immediately when currentEvent changes
      setEventsVersion(prev => {
        const newVersion = prev + 1;
        console.log('🔄 currentEvent guests changed, forcing table update - eventsVersion:', newVersion);
        return newVersion;
      });
      
      // Log message statistics for verification
      const messageStats = {
        total: currentEvent.guests.length,
        not_sent: currentEvent.guests.filter((g: Guest) => !g.messageStatus || g.messageStatus === 'not_sent').length,
        sent: currentEvent.guests.filter((g: Guest) => g.messageStatus === 'sent').length,
        delivered: currentEvent.guests.filter((g: Guest) => g.messageStatus === 'delivered').length,
        failed: currentEvent.guests.filter((g: Guest) => g.messageStatus === 'failed').length,
        sent_or_delivered: currentEvent.guests.filter((g: Guest) => g.messageStatus === 'sent' || g.messageStatus === 'delivered').length
      };
      
      console.log('📊 Message Statistics Breakdown:', {
        eventId: currentEvent.id,
        eventName: currentEvent.coupleName || currentEvent.eventTypeHebrew,
        ...messageStats,
        deliveryRate: messageStats.sent_or_delivered > 0 
          ? `${Math.round((messageStats.delivered / messageStats.sent_or_delivered) * 100)}%` 
          : '0%'
      });
      
      if (messageStats.delivered === 53) {
        console.log('✅ VERIFIED: Exactly 53 messages were successfully delivered');
      } else {
        console.log(`ℹ️ Current delivered count: ${messageStats.delivered} ${messageStats.delivered === 53 ? '(matches expected)' : `(expected: 53)`}`);
      }
    }
  }, [currentEvent, id]);

  // CRITICAL: Auto-create campaigns if they don't exist
  // This ensures events always have campaigns available
  const campaignsCreatedRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    if (!id || !currentEvent || currentEvent.id !== id) {
      return;
    }
    
    // Check if campaigns exist
    if (currentEvent.campaigns && currentEvent.campaigns.length > 0) {
      return;
    }
    
    // Only create once per event (tracked by ref)
    if (campaignsCreatedRef.current.has(currentEvent.id)) {
      return;
    }
    
    // Mark as created immediately to prevent duplicate creation
    campaignsCreatedRef.current.add(currentEvent.id);
    
    // Create campaigns in background (don't await to avoid blocking UI)
    console.log(`🔄 Auto-creating campaigns for event ${currentEvent.id}...`);
    recreateCampaigns(currentEvent.id).then(() => {
      console.log(`✅ Campaigns created for event ${currentEvent.id}`);
      // Refresh events to get the updated event with campaigns
      fetchEvents(false, true).catch((error: any) => {
        console.warn('⚠️ Failed to refresh events after campaign creation:', error);
      });
    }).catch((error: any) => {
      console.warn('⚠️ Auto-create campaigns failed:', error);
      // Remove from created set so we can retry later
      campaignsCreatedRef.current.delete(currentEvent.id);
    });
  }, [id, currentEvent, recreateCampaigns, fetchEvents]);

  // CRITICAL: Listen for guest status updates and refresh event data from backend
  // This ensures the table updates immediately after guest status changes via GuestResponse page
  // Use a more efficient approach: check for updates periodically, but also listen to store changes
  const lastRefreshTimeRef = useRef<number>(0);
  // REMOVED: Auto-refresh polling - user will use manual refresh button instead
  // This prevents 404 errors when event doesn't exist and reduces server load
  // Manual refresh is available via the "רענן" button in the header
  useEffect(() => {
    if (!id) return;
    // No auto-polling - user will use manual refresh button
  }, [id]);

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
    // Create a comprehensive key from events that includes guest data to detect ALL changes
    // This ensures we catch updates even if they're for a different event
    // CRITICAL: Include responseDate in the key to catch timestamp changes
    const eventsKey = events.map((e: Event) => {
      const guestsKey = e.guests?.map((g: Guest) => {
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
    
    // Update if events length changed, events key changed, or eventsHash changed
    if (events.length !== lastEventsLengthRef.current || 
        eventsKey !== lastEventsKeyRef.current || 
        eventsHash !== lastEventsHashRef.current) {
      lastEventsLengthRef.current = events.length;
      lastEventsKeyRef.current = eventsKey;
      lastEventsHashRef.current = eventsHash;
      setEventsVersion(prev => {
        const newVersion = prev + 1;
        // Only log in development mode
        if (process.env.NODE_ENV === 'development') {
          console.log('🔄 Events array changed, incrementing eventsVersion to:', newVersion);
        }
        return newVersion;
      });
    }
  }, [events, eventsHash]); // Include eventsHash to detect changes from Zustand store
  
  // Update the ref when id or events change, but only if the event actually changed
  useEffect(() => {
    if (!id) {
      currentEventFromStoreRef.current = null;
      return;
    }
    
    const event = events.find((e: Event) => e.id === id);
    if (event) {
      // Create a key from guests to detect changes (including status, count, responseDate)
      const currentGuestsKey = currentEventFromStoreRef.current?.guests?.map((g: any) => 
        `${g.id}:${g.rsvpStatus}:${g.guestCount}:${g.responseDate ? new Date(g.responseDate).getTime() : ''}`
      ).join('|') || '';
      const newGuestsKey = event.guests?.map((g: Guest) => 
        `${g.id}:${g.rsvpStatus}:${g.guestCount}:${g.responseDate ? new Date(g.responseDate).getTime() : ''}`
      ).join('|') || '';
      
      // Update if event ID changed, event was updated, guests changed, or guests key changed
      if (lastEventIdRef2.current !== id || 
          currentEventFromStoreRef.current?.updatedAt !== event.updatedAt ||
          currentEventFromStoreRef.current?.guests?.length !== event.guests?.length ||
          currentGuestsKey !== newGuestsKey) {
        currentEventFromStoreRef.current = event;
        lastEventIdRef2.current = id;
      }
    } else {
      currentEventFromStoreRef.current = null;
    }
  }, [id, events]);
  
  // Use the ref value in a stable way
  const currentEventFromStore = currentEventFromStoreRef.current;
  
  // CRITICAL: All hooks must be before any conditional returns
  // Get guests from store - ALWAYS use getState() inside useMemo to avoid React #310 errors
  // Use useMemo with minimal dependencies to avoid React #310 errors
  const guestsToDisplay = useMemo(() => {
    // CRITICAL: Use getState() inside useMemo to avoid React #310 errors
    // This ensures we don't access unstable references (events, currentEvent) directly
    // React will not complain because getState() is a stable function reference
    const state = useEventStore.getState();
    const currentEvents = state.events;
    const currentEventFromState = state.currentEvent;
    
    console.log('🔄 guestsToDisplay recalculating:', {
      eventId: id,
      eventsLength: currentEvents.length,
      eventsVersion,
      eventFound: !!currentEvents.find((e: Event) => e.id === id)
    });
    
    // CRITICAL: Always get directly from events array (most up-to-date)
    // Use getState() to get the latest data - don't rely on refs or component state
    let event = currentEvents.find((e: Event) => e.id === id) || null;
    
    // Final fallback to currentEvent from state if it matches the ID
    if (!event && currentEventFromState && currentEventFromState.id === id) {
      event = currentEventFromState;
    }
    
    if (event?.guests && Array.isArray(event.guests) && event.guests.length > 0) {
      // CRITICAL: Create deep copy with new object references to ensure React detects changes
      // ALWAYS create new object references, even if data appears unchanged
      // This forces React to re-render when eventsVersion changes
      // CRITICAL: Force new object references by adding a unique key based on eventsHash
      const guests = event.guests.map((g: Guest, index: number) => {
        try {
          // CRITICAL: Always create a completely new object with all properties spread
          // This ensures React sees this as a new object reference, triggering re-render
          // CRITICAL: Add a unique key based on eventsHash to force new reference
          const guestCopy = {
            ...g,
            responseDate: g.responseDate ? (typeof g.responseDate === 'string' ? new Date(g.responseDate) : g.responseDate instanceof Date ? g.responseDate : undefined) : undefined,
            // CRITICAL: Remove _forceUpdate to avoid React #310 errors
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
            responseDate: undefined
          };
          delete (guestCopy as any)._updateTimestamp;
          delete (guestCopy as any)._renderKey;
          return guestCopy;
        }
      });
      
      // Update the ref to track changes
      // CRITICAL: Include ALL fields that might change to ensure we catch updates
      const newKey = guests.map((g: Guest) => {
        try {
          let responseDateValue = '';
          if (g.responseDate) {
            const date = g.responseDate instanceof Date ? g.responseDate : new Date(g.responseDate);
            responseDateValue = isNaN(date.getTime()) ? '' : String(date.getTime());
          }
          // CRITICAL: Include ALL fields that might change
          return `${g.id}:${g.firstName || ''}:${g.lastName || ''}:${g.rsvpStatus}:${g.guestCount}:${g.actualAttendance}:${g.tableId || ''}:${g.notes || ''}:${g.phoneNumber || ''}:${g.messageStatus || ''}:${responseDateValue}`;
        } catch (error) {
          return `${g.id}:${g.firstName || ''}:${g.lastName || ''}:${g.rsvpStatus}:${g.guestCount}:${g.actualAttendance}:${g.tableId || ''}:${g.notes || ''}:${g.phoneNumber || ''}:${g.messageStatus || ''}:`;
        }
      }).join('|');
      
      const keyChanged = newKey !== eventGuestsKeyRef.current;
      
      if (keyChanged) {
        console.log('📊 Guests data changed in guestsToDisplay:', {
          eventId: id,
          guestsCount: guests.length,
          eventsVersion,
          sampleGuests: guests.slice(0, 3).map((g: Guest) => ({
            id: g.id,
            name: `${g.firstName} ${g.lastName}`,
            status: g.rsvpStatus,
            count: g.guestCount,
            actualAttendance: g.actualAttendance,
            responseDate: g.responseDate ? (g.responseDate instanceof Date ? g.responseDate.toISOString() : String(g.responseDate)) : 'none'
          }))
        });
        eventGuestsKeyRef.current = newKey;
      } else {
        // CRITICAL: Even if key unchanged, we still need to return a new array reference
        // This ensures React detects changes when eventsVersion or eventsHash changes
        console.log('ℹ️ guestsToDisplay: Guests key unchanged, but returning new array reference anyway (eventsVersion:', eventsVersion, ', eventsHash:', eventsHash.substring(0, 20) + '...)');
      }
      
      // CRITICAL: Always return a new array reference with deep copy of guests
      // This ensures React detects changes even if the key is the same
      // CRITICAL: Include eventsHash and eventsVersion to force new reference
      // CRITICAL: Map to create new object references for each guest
      // CRITICAL: Also include eventsHash in the returned array to ensure React sees it as new
      // CRITICAL: Add a timestamp to force new reference on every calculation
      const guestsCopy = guests.map((g, index) => ({ 
        ...g,
        // Add a unique key based on eventsHash and eventsVersion to force React to see this as new
        _renderKey: `${g.id}-${eventsHash.substring(0, 20)}-${eventsVersion}-${index}`
      }));
      // CRITICAL: Add eventsHash as a property to force new reference when it changes
      // This ensures React detects changes even if guests array appears unchanged
      (guestsCopy as any)._eventsHash = eventsHash;
      (guestsCopy as any)._eventsVersion = eventsVersion;
      (guestsCopy as any)._timestamp = Date.now();
      return guestsCopy;
    }
    
    // Only log warning if we have events but not for this ID
    if (currentEvents.length > 0) {
      console.log('⚠️ No guests found for event:', id, '- Event exists:', !!currentEvents.find((e: Event) => e.id === id));
    }
    return [];
    // CRITICAL: Use only primitive stable values as dependencies to avoid React #310 errors
    // DO NOT include arrays or objects directly - they cause infinite loops
    // Use eventsVersion and eventsHash (string is primitive and stable)
    // CRITICAL: eventsHash is a string from zustand selector, which is stable as a dependency
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, eventsVersion, eventsHash]);
  
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
        lastGuestsKeyForUpdate.current = guestsKey;
        setForceUpdate(prev => prev + 1);
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
      lastEventsHashForUpdate.current = eventsHash;
      setForceUpdate(prev => prev + 1);
    }
  }, [eventsHash]);
  
  // CRITICAL: Listen to guestsKey changes to force re-render
  // This ensures we catch updates immediately when guest data changes
  // CRITICAL: Use guestsKey instead of guestsToDisplay to avoid React #310 errors
  useEffect(() => {
    try {
      const eventId = currentEvent?.id || id || 'unknown';
      if (guestsToDisplay && guestsToDisplay.length > 0) {
        console.log('📊 EVENT_MANAGEMENT: Sample guest statuses:', guestsToDisplay.slice(0, 3).map((g: Guest) => {
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
    const allEventsKey = events.map((e: Event) => {
      const guestsKey = e.guests?.map((g: Guest) => {
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
      lastEventsArrayKeyRef.current = allEventsKey;
      
      // CRITICAL: eventsVersion is already updated by the other useEffect
      // This useEffect just updates currentEvent if needed
      
      // Also update currentEvent if it's the one being viewed
      const event = events.find((e: Event) => e.id === id);
      if (event && event.guests) {
        const eventGuestsKey = event.guests.map((g: Guest) => {
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
            guests: event.guests ? event.guests.map((g: Guest) => ({ ...g })) : []
          };
          setCurrentEvent(newCurrentEvent);
          console.log('✅ Updated currentEvent from events array change:', newCurrentEvent.id, 'guests:', newCurrentEvent.guests.length);
        }
      }
    } else {
      console.log('ℹ️ Events array key unchanged, no update needed');
    }
  }, [id, events, setCurrentEvent]);

  // CRITICAL: All useCallback hooks MUST be before early return
  // React hooks must be called before any conditional returns
  const handleEditGuest = useCallback((guest: any) => {
    setEditingGuest(guest);
    setNewGuest({
      firstName: guest.firstName,
      lastName: guest.lastName,
      phoneNumber: guest.phoneNumber,
      guestCount: guest.guestCount,
      notes: guest.notes || ''
    });
  }, []);

  const handleUpdateGuestStatus = useCallback(async (guestId: string, status: string) => {
    const event = useEventStore.getState().currentEvent;
    if (!event || !event.id) {
      alert('שגיאה: לא נמצא אירוע פעיל');
      return;
    }
    
    try {
      console.log('🎯 handleUpdateGuestStatus called:', { guestId, status, eventId: event.id });
      
      // NEW APPROACH: Update directly in store using updateGuestResponse instead of updateGuest
      // This ensures the update is processed the same way as guest_link updates
      const guest = event.guests?.find(g => g.id === guestId);
      if (!guest) {
        console.error('❌ Guest not found:', guestId);
        return;
      }
      
      // Use updateGuestResponse to ensure consistent update flow
      const { updateGuestResponse } = useEventStore.getState();
      const updatedGuest = {
        ...guest,
        rsvpStatus: status as 'confirmed' | 'declined' | 'maybe' | 'pending',
        responseDate: new Date(),
        source: 'manual_update' // Mark as manual update from status page
      };
      
      console.log('🔄 Updating guest via updateGuestResponse:', { guestId, status });
      await updateGuestResponse(event.id, guestId, updatedGuest);
      
      // CRITICAL: Don't refresh from server immediately - this would overwrite the local update
      // The updateGuestResponse function already syncs to the server and will refresh when ready
      // The table will update automatically from the store state change
      console.log('✅ Guest status updated - table will update automatically from store state');
      
      // CRITICAL: Update currentEvent from store to ensure table shows the update immediately
      // This ensures the UI reflects the change without waiting for server refresh
      const updatedState = useEventStore.getState();
      const updatedEvent = updatedState.events.find(e => e.id === event.id);
      if (updatedEvent) {
        const updatedGuest = updatedEvent.guests?.find(g => g.id === guestId);
        if (updatedGuest && updatedGuest.rsvpStatus === status) {
          // Update currentEvent to reflect the change immediately
          setCurrentEvent({
            ...updatedEvent,
            guests: updatedEvent.guests.map(g => ({ ...g }))
          });
          console.log('✅ CurrentEvent updated from store - table will show updated status');
        } else {
          console.warn('⚠️ Updated guest not found in store or status mismatch:', {
            found: !!updatedGuest,
            expectedStatus: status,
            actualStatus: updatedGuest?.rsvpStatus
          });
        }
      }
    } catch (error) {
      console.error('❌ Error updating guest:', error);
    }
  }, [setCurrentEvent, fetchEvents]);

  const handleUpdateAttendance = useCallback(async (guestId: string, attendance: string) => {
    const event = useEventStore.getState().currentEvent;
    if (!event || !event.id) {
      alert('שגיאה: לא נמצא אירוע פעיל');
      return;
    }
    
    try {
      console.log('🎯 handleUpdateAttendance called:', { guestId, attendance, eventId: event.id });
      
      // NEW APPROACH: Update directly in store using updateGuestResponse
      const guest = event.guests?.find(g => g.id === guestId);
      if (!guest) {
        console.error('❌ Guest not found:', guestId);
        return;
      }
      
      // Use updateGuestResponse to ensure consistent update flow
      const { updateGuestResponse } = useEventStore.getState();
      const updatedGuest = {
        ...guest,
        actualAttendance: attendance as 'attended' | 'not_attended' | 'not_marked',
        attendanceDate: new Date(),
        source: 'manual_update' // Mark as manual update from status page
      };
      
      console.log('🔄 Updating attendance via updateGuestResponse:', { guestId, attendance });
      await updateGuestResponse(event.id, guestId, updatedGuest);
      
      // CRITICAL: Don't refresh from server immediately - this would overwrite the local update
      // The updateGuestResponse function already syncs to the server and will refresh when ready
      // The table will update automatically from the store state change
      console.log('✅ Guest attendance updated - table will update automatically from store state');
      
      // CRITICAL: Update currentEvent from store to ensure table shows the update immediately
      // This ensures the UI reflects the change without waiting for server refresh
      const updatedState = useEventStore.getState();
      const updatedEvent = updatedState.events.find(e => e.id === event.id);
      if (updatedEvent) {
        const updatedGuest = updatedEvent.guests?.find(g => g.id === guestId);
        if (updatedGuest && updatedGuest.actualAttendance === attendance) {
          // Update currentEvent to reflect the change immediately
          setCurrentEvent({
            ...updatedEvent,
            guests: updatedEvent.guests.map(g => ({ ...g }))
          });
          console.log('✅ CurrentEvent updated from store - table will show updated attendance');
        } else {
          console.warn('⚠️ Updated guest not found in store or attendance mismatch:', {
            found: !!updatedGuest,
            expectedAttendance: attendance,
            actualAttendance: updatedGuest?.actualAttendance
          });
        }
      }
      
      console.log('✅ handleUpdateAttendance completed successfully');
    } catch (error) {
      console.error('❌ Error updating attendance:', error);
    }
  }, [setCurrentEvent, fetchEvents]);

  const handleUpdateGuestField = useCallback(async (guestId: string, updates: any) => {
    const state = useEventStore.getState();
    // CRITICAL: Try to get event from currentEvent first, then from events array
    let event = state.currentEvent;
    if (!event || !event.id) {
      // If currentEvent is not set, try to find event from events array using the URL
      const eventId = id; // Get eventId from URL params
      if (eventId) {
        event = state.events.find(e => e.id === eventId);
      }
    }
    if (!event || !event.id) {
      alert('שגיאה: לא נמצא אירוע פעיל');
      return;
    }
    
    try {
      console.log('🎯 handleUpdateGuestField called:', { guestId, updates, eventId: event.id });
      
      // CRITICAL: If tableId is being changed, use assignGuestToTable/moveGuestToTable/removeGuestFromTable
      // This ensures seating management is updated correctly
      if (updates.tableId !== undefined) {
        const currentGuest = event.guests?.find(g => g.id === guestId);
        const oldTableId = currentGuest?.tableId;
        const newTableId = updates.tableId;
        
        if (newTableId && newTableId !== oldTableId) {
          // Moving to a new table
          console.log(`🔄 Moving guest ${guestId} from table ${oldTableId || 'none'} to table ${newTableId}`);
          await moveGuestToTable(event.id, guestId, newTableId);
        } else if (!newTableId && oldTableId) {
          // Removing from table
          console.log(`🔄 Removing guest ${guestId} from table ${oldTableId}`);
          await removeGuestFromTable(event.id, guestId);
        } else if (newTableId && newTableId === oldTableId) {
          // Same table, just update other fields if any
          const otherUpdates = { ...updates };
          delete otherUpdates.tableId;
          if (Object.keys(otherUpdates).length > 0) {
            await updateGuest(event.id, guestId, otherUpdates);
          }
        }
      } else {
        // Update other fields normally - always include responseDate for timestamp-based conflict resolution
        // If updating guestCount, always use current timestamp and ensure source is manual_update
        const updatesWithTimestamp = updates.guestCount !== undefined 
          ? { 
              ...updates, 
              responseDate: new Date(),
              source: 'manual_update' // CRITICAL: Mark as manual_update to prevent old updates from overwriting
            }
          : { ...updates, source: updates.source || 'manual_update' };
        await updateGuest(event.id, guestId, updatesWithTimestamp);
      }
      
      // CRITICAL: Get updated currentEvent from store immediately after update
      // This ensures the UI updates instantly with the latest data from store
      // Important for: tableId, actualAttendance, guestCount, rsvpStatus, firstName, lastName, phoneNumber
      const criticalFields = ['tableId', 'actualAttendance', 'guestCount', 'rsvpStatus', 'firstName', 'lastName', 'phoneNumber', 'notes'];
      const hasCriticalField = criticalFields.some(field => updates[field] !== undefined);
      
      if (hasCriticalField) {
        // CRITICAL: For guestCount updates, immediately update local state to prevent reversion
        if (updates.guestCount !== undefined) {
          setCurrentEvent((prev: Event | null) => {
            if (!prev || prev.id !== event.id) return prev;
            return {
              ...prev,
              guests: prev.guests?.map((g: Guest) => 
                g.id === guestId 
                  ? { ...g, guestCount: updates.guestCount }
                  : g
              ) || []
            };
          });
          console.log(`✅ Immediately updated local state for guestCount: ${updates.guestCount}`);
        }
        
        // Also get from store to ensure consistency
        const storeState = useEventStore.getState();
        const updatedEvent = storeState.currentEvent;
        if (updatedEvent && updatedEvent.id === event.id) {
          setCurrentEvent(updatedEvent);
          console.log('✅ handleUpdateGuestField - currentEvent updated immediately from store for:', Object.keys(updates).join(', '));
        }
      }
    } catch (error) {
      console.error('Error updating guest:', error);
    }
  }, [updateGuest, setCurrentEvent, moveGuestToTable, removeGuestFromTable]);

  const handleDeleteGuest = useCallback(async (guestId: string) => {
    const event = useEventStore.getState().currentEvent;
    if (!event || !event.id) {
      alert('שגיאה: לא נמצא אירוע פעיל');
      return;
    }
    
    if (window.confirm('האם אתה בטוח שברצונך למחוק את המוזמן?')) {
      try {
        await deleteGuest(event.id, guestId);
      } catch (error) {
        console.error('Error deleting guest:', error);
        alert('אירעה שגיאה במחיקת המוזמן');
      }
    }
  }, [deleteGuest]);

  const handleSelectGuest = useCallback((guestId: string) => {
    setSelectedGuests(prev => 
      prev.includes(guestId) 
        ? prev.filter(id => id !== guestId)
        : [...prev, guestId]
    );
  }, []);

  const handleSelectAllGuests = useCallback(() => {
    // Calculate filteredGuests inside the callback to avoid dependency issues
    const event = useEventStore.getState().currentEvent;
    if (!event || !event.guests) return;
    
    const guests = event.guests || [];
    const filtered = guests.filter((guest: Guest) => {
      const matchesSearch = 
        guest.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (guest.lastName && guest.lastName.toLowerCase().includes(searchTerm.toLowerCase())) ||
        guest.phoneNumber.includes(searchTerm);
      
      const matchesFilter = filterStatus === 'all' || guest.rsvpStatus === filterStatus;
      
      let matchesMessageFilter = true;
      const currentMessageStatus = guest.messageStatus || 'not_sent';
      
      if (messageFilterStatus === 'sent_not_delivered') {
        matchesMessageFilter = currentMessageStatus === 'sent';
      } else if (messageFilterStatus !== 'all') {
        if (messageFilterStatus === 'not_sent') {
          matchesMessageFilter = !guest.messageStatus || currentMessageStatus === 'not_sent';
        } else {
          matchesMessageFilter = currentMessageStatus === messageFilterStatus;
        }
      }
      
      return matchesSearch && matchesFilter && matchesMessageFilter;
    });
    
    const allGuestIds = filtered.map((guest: Guest) => guest.id);
    setSelectedGuests(allGuestIds);
  }, [searchTerm, filterStatus, messageFilterStatus]);

  const handleDeselectAllGuests = useCallback(() => {
    setSelectedGuests([]);
  }, []);

  // Early return after ALL hooks (no hooks after this point!)
  if (!currentEvent) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12  border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // CRITICAL: Use useMemo to recalculate stats when currentEvent or eventsHash changes
  // This ensures stats update immediately when guestCount changes
  const stats = useMemo(() => {
    if (!currentEvent) {
      return {
        totalGuests: 0,
        confirmed: 0,
        declined: 0,
        maybe: 0,
        pending: 0,
        responseRate: 0,
        attendanceRate: 0
      };
    }
    const calculatedStats = calculateEventStats(currentEvent);
    console.log('📊 Stats recalculated:', {
      totalGuests: calculatedStats.totalGuests,
      confirmed: calculatedStats.confirmed,
      eventId: currentEvent.id,
      guestsCount: currentEvent.guests?.length || 0,
      eventsHash: eventsHash.substring(0, 50) + '...'
    });
    return calculatedStats;
  }, [currentEvent, eventsHash]); // CRITICAL: Include eventsHash to detect guestCount changes
  
  // CRITICAL: Calculate filteredGuests directly without useMemo to avoid React #310 errors
  // Calculate on every render - guestsToDisplay is already memoized, so this is efficient
  // This avoids circular dependencies that cause React #310 errors
  const filteredGuests = (() => {
    const guests = guestsToDisplay || [];
    console.log('🔄 Calculating filteredGuests - guests length:', guests.length);
    
    const filtered = guests.filter((guest: Guest) => {
    const matchesSearch = 
      guest.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (guest.lastName && guest.lastName.toLowerCase().includes(searchTerm.toLowerCase())) ||
      guest.phoneNumber.includes(searchTerm);
    
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
  });
    
    console.log('📊 Filtered guests result:', filtered.length, 'guests');
    if (filtered.length > 0) {
      console.log('📊 Filtered guest statuses:', filtered.map((g: Guest) => `${g.firstName} ${g.lastName}: ${g.rsvpStatus}`).join(', '));
    }
    
    return filtered;
  })();

  // Filter guests for modal search
  const modalFilteredGuests = (currentEvent?.guests || []).filter((guest: Guest) => 
      guest.firstName.toLowerCase().includes(modalSearchTerm.toLowerCase()) ||
      (guest.lastName && guest.lastName.toLowerCase().includes(modalSearchTerm.toLowerCase())) ||
    guest.phoneNumber.includes(modalSearchTerm)
  );
  

  const handleAddGuest = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('🔍 handleAddGuest called with:', newGuest);
    console.log('🔍 currentEvent.id:', currentEvent?.id);
    
    if (!currentEvent || !currentEvent.id) {
      alert('שגיאה: לא נמצא אירוע פעיל');
      return;
    }
    
    if (!newGuest.firstName || !newGuest.phoneNumber) {
      console.log('❌ Missing required fields');
      return;
    }

    try {
      console.log('📤 Calling addGuest...');
      await addGuest(currentEvent.id, {
        ...newGuest,
        firstName: cleanName(newGuest.firstName),
        lastName: cleanName(newGuest.lastName || ''), // שם משפחה לא נדרש יותר
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

  const handleUpdateGuest = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!currentEvent || !currentEvent.id) {
      alert('שגיאה: לא נמצא אירוע פעיל');
      return;
    }
    
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
      
      // Update in store first - clean names before updating
      // CRITICAL: If guestCount is being updated, include source and responseDate to prevent reversion
      await updateGuest(currentEvent.id, editingGuest.id, {
        firstName: cleanName(newGuest.firstName),
        lastName: cleanName(newGuest.lastName),
        phoneNumber: newGuest.phoneNumber,
        guestCount: newGuest.guestCount,
        notes: newGuest.notes,
        // CRITICAL: Mark as manual_update and include responseDate for guestCount updates
        source: 'manual_update',
        responseDate: new Date()
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

  const getMessageStatusColor = (status: string) => {
    switch (status) {
      case 'sent': return 'text-blue-600 bg-blue-50';
      case 'delivered': return 'text-green-600 bg-green-50';
      case 'failed': return 'text-red-600 bg-red-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getMessageStatusIcon = (status: string) => {
    switch (status) {
      case 'sent':
        return <Send className="w-4 h-4 text-blue-600" />;
      case 'delivered':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-600" />;
      default:
        return <MessageSquare className="w-4 h-4 text-gray-400" />;
    }
  };

  const getMessageStatusText = (status: string) => {
    switch (status) {
      case 'not_sent': return 'לא נשלחה';
      case 'sent': return 'נשלח';
      case 'delivered': return 'נמסר';
      case 'failed': return 'נכשל';
      default: return 'לא נשלח';
    }
  };

  const getMessageStatusTooltip = (guest: any) => {
    const parts: string[] = [];
    if (guest.messageSentDate) {
      parts.push(`נשלח: ${formatDate(guest.messageSentDate)}`);
    }
    if (guest.messageDeliveredDate) {
      parts.push(`נמסר: ${formatDate(guest.messageDeliveredDate)}`);
    }
    if (guest.messageFailedDate) {
      parts.push(`נכשל: ${formatDate(guest.messageFailedDate)}`);
    }
    return parts.length > 0 ? parts.join('\n') : 'אין פרטים נוספים';
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
    currentEvent.tables.forEach((table: Table) => {
      const tableGuests = currentEvent.guests.filter((guest: Guest) => guest.tableId === table.id);
      
      // Count actual attendance - use guestCount, not number of records
      const totalGuests = tableGuests.reduce((sum: number, guest: Guest) => sum + (guest.guestCount || 1), 0);
      const attended = tableGuests
        .filter((g: Guest) => g.actualAttendance === 'attended')
        .reduce((sum: number, guest: Guest) => sum + (guest.guestCount || 1), 0);
      const notAttended = tableGuests
        .filter((g: Guest) => g.actualAttendance === 'not_attended')
        .reduce((sum: number, guest: Guest) => sum + (guest.guestCount || 1), 0);
      const notMarked = tableGuests
        .filter((g: Guest) => !g.actualAttendance || g.actualAttendance === 'not_marked')
        .reduce((sum: number, guest: Guest) => sum + (guest.guestCount || 1), 0);
      
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
    // CRITICAL: Use guestCount for accurate totals (not just guest count)
    const totalAttended = currentEvent.guests
      .filter(g => g.actualAttendance === 'attended')
      .reduce((sum: number, g: Guest) => sum + (g.guestCount || 1), 0);
    const totalNotAttended = currentEvent.guests
      .filter(g => g.actualAttendance === 'not_attended')
      .reduce((sum: number, g: Guest) => sum + (g.guestCount || 1), 0);
    const totalNotMarked = currentEvent.guests
      .filter(g => !g.actualAttendance || g.actualAttendance === 'not_marked')
      .reduce((sum: number, g: Guest) => sum + (g.guestCount || 1), 0);
    const totalGuests = currentEvent.guests.reduce((sum: number, g: Guest) => sum + (g.guestCount || 1), 0);
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
    currentEvent.tables.forEach((table: Table) => {
      const tableGuests = currentEvent.guests.filter((guest: Guest) => guest.tableId === table.id);
      
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
      const totalGuests = tableGuests.reduce((sum: number, guest: Guest) => sum + (guest.guestCount || 1), 0);
      const attendedCount = tableGuests
        .filter((g: Guest) => g.actualAttendance === 'attended')
        .reduce((sum: number, guest: Guest) => sum + (guest.guestCount || 1), 0);

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
      tableGuests.forEach((guest: Guest) => {
        const attendanceStatus = getActualAttendanceText(guest.actualAttendance || 'unknown');
        const statusIcon = guest.actualAttendance === 'attended' ? '✓' : 
                          guest.actualAttendance === 'not_attended' ? '✗' : '?';
        
        dataRows.push([
          `${statusIcon} ${formatFullName(guest.firstName, guest.lastName)}`,
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

  const handleDeleteSelectedGuests = async () => {
    if (!currentEvent || !currentEvent.id) {
      alert('שגיאה: לא נמצא אירוע פעיל');
      return;
    }
    
    if (selectedGuests.length === 0) {
      alert('אנא בחר אורחים למחיקה');
      return;
    }

    const confirmMessage = `האם אתה בטוח שברצונך למחוק ${selectedGuests.length} מוזמנים? פעולה זו לא ניתנת לביטול.`;
    if (!window.confirm(confirmMessage)) {
      return;
    }

    const eventId = currentEvent.id; // Store eventId to prevent issues if currentEvent changes
    const guestsToDelete = [...selectedGuests]; // Create a copy to avoid issues if state changes

    try {
      // Delete all selected guests
      for (const guestId of guestsToDelete) {
        // Double-check event still exists before each deletion
        const storeState = useEventStore.getState();
        const eventExists = storeState.events.some(e => e.id === eventId);
        if (!eventExists) {
          alert('האירוע נמחק במהלך המחיקה. נא לרענן את הדף.');
          setSelectedGuests([]);
          return;
        }
        await deleteGuest(eventId, guestId);
      }
      
      // Clear selection after deletion
      setSelectedGuests([]);
      alert(`נמחקו ${guestsToDelete.length} מוזמנים בהצלחה!`);
    } catch (error) {
      console.error('Error deleting selected guests:', error);
      alert('אירעה שגיאה במחיקת המוזמנים');
      setSelectedGuests([]);
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
    worksheet.getRow(1).eachCell((cell: any) => {
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
      row.eachCell((cell: any) => {
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
    worksheet.eachRow((row: any) => {
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
    
    // Create worksheet - LTR order: עמודה A תהיה "שם מלא" (שמאל), עמודה K תהיה "הערות" (ימין)
    const worksheet = workbook.addWorksheet('רשימת אורחים', {
      properties: {
        tabColor: { argb: 'FF2F5597' }
      }
    });
    
    // Define columns in LTR order - עמודה A תהיה "שם מלא" (שמאל), עמודה K תהיה "הערות" (ימין)
    worksheet.columns = [
      { header: 'שם מלא', key: 'fullName', width: 25 },
      { header: 'מספר טלפון', key: 'phoneNumber', width: 15 },
      { header: 'מספר מוזמנים', key: 'guestCount', width: 12 },
      { header: 'סטטוס אישור', key: 'rsvpStatus', width: 15 },
      { header: 'תאריך תגובה', key: 'responseDate', width: 12 },
      { header: 'ערוץ', key: 'channel', width: 12 },
      { header: 'הגעה בפועל', key: 'actualAttendance', width: 15 },
      { header: 'שולחן', key: 'table', width: 8 },
      { header: 'סטטוס הודעה', key: 'messageStatus', width: 15 },
      { header: 'תאריך שליחה', key: 'messageSentDate', width: 12 },
      { header: 'הערות', key: 'notes', width: 30 }
    ];
    
    // Style header row
    worksheet.getRow(1).eachCell((cell: any) => {
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
    
    // Add data rows - סדר הנתונים תואם לסדר העמודות (LTR)
    currentEvent.guests.forEach((guest: Guest, index: number) => {
      const row = worksheet.addRow({
        fullName: formatFullName(guest.firstName, guest.lastName),
        phoneNumber: guest.phoneNumber || '',
        guestCount: guest.guestCount || 1,
        rsvpStatus: getRsvpStatusText(guest.rsvpStatus),
        responseDate: guest.responseDate ? formatDate(guest.responseDate) : '',
        channel: guest.channel || 'וואטסאפ',
        actualAttendance: getActualAttendanceText(guest.actualAttendance || 'unknown'),
        table: guest.tableId ? currentEvent.tables?.find((t: Table) => t.id === guest.tableId)?.number?.toString() || '?' : 'ללא',
        messageStatus: getMessageStatusText(guest.messageStatus || 'not_sent'),
        messageSentDate: guest.messageSentDate ? formatDate(guest.messageSentDate) : '',
        notes: guest.notes || ''
      });
      
      // Style data row
      const isEvenRow = (index + 1) % 2 === 0;
      row.eachCell((cell: any) => {
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
    worksheet.eachRow((row: any) => {
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
    reader.onload = async (e: ProgressEvent<FileReader>) => {
      try {
        const data = e.target?.result;
        // Read Excel file with proper encoding options for Hebrew text
        const workbook = XLSX.read(data, { 
          type: 'binary',
          codepage: 65001, // UTF-8 encoding for proper Hebrew character support
          cellText: false,
          cellDates: true
        });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        // Convert to JSON with proper handling of Hebrew text
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { 
          header: 1,
          defval: '', // Default value for empty cells
          raw: false // Convert all values to strings to preserve Hebrew characters
        });

        // Helper function to parse RSVP status from text
        const parseRsvpStatus = (text: string): 'pending' | 'confirmed' | 'declined' | 'maybe' => {
          if (!text || !text.trim()) return 'pending';
          
          const lowerText = text.toLowerCase().trim();
          // Check for confirmed status
          if (lowerText.includes('מגיע') || lowerText.includes('confirmed') || lowerText.includes('אישר') || 
              lowerText.includes('אישור') || lowerText === '✓' || lowerText === 'v') {
            return 'confirmed';
          }
          // Check for declined status
          if (lowerText.includes('לא מגיע') || lowerText.includes('declined') || lowerText.includes('דחה') || 
              lowerText.includes('דחייה') || lowerText === '✗' || lowerText === 'x') {
            return 'declined';
          }
          // Check for maybe status
          if (lowerText.includes('אולי') || lowerText.includes('maybe') || lowerText.includes('לא בטוח')) {
            return 'maybe';
          }
          return 'pending';
        };

        // Helper function to parse actual attendance from text
        const parseActualAttendance = (text: string): 'attended' | 'not_attended' | 'not_marked' => {
          if (!text || !text.trim()) return 'not_marked';
          
          const lowerText = text.toLowerCase().trim();
          // Check for attended status
          if (lowerText.includes('הגיע') || lowerText.includes('attended') || lowerText.includes('כן') || 
              lowerText.includes('נוכח') || lowerText === '✓' || lowerText === 'v') {
            return 'attended';
          }
          // Check for not attended status
          if (lowerText.includes('לא הגיע') || lowerText.includes('not_attended') || 
              (lowerText.includes('לא') && !lowerText.includes('לא בטוח')) || lowerText === '✗' || lowerText === 'x') {
            return 'not_attended';
          }
          return 'not_marked';
        };

        // Convert to guests array
        // Excel columns order (LTR - Left to Right, משמאל לימין): 
        // Column A: שם מלא, B: מספר טלפון, C: מספר מוזמנים, D: סטטוס אישור, E: תאריך תגובה, 
        // F: ערוץ, G: הגעה בפועל, H: שולחן, I: סטטוס הודעה, J: תאריך שליחה, K: הערות
        // Array indices (0-based): [0] שם מלא, [1] מספר טלפון, [2] מספר מוזמנים, [3] סטטוס אישור, 
        // [4] תאריך תגובה, [5] ערוץ, [6] הגעה בפועל, [7] שולחן, [8] סטטוס הודעה, [9] תאריך שליחה, [10] הערות
        
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
            
            // Excel structure (LTR - משמאל לימין): 
            // Column A (index 0): שם מלא
            const fullName = String(row[0] || '').trim();
            console.log(`📋 Full name from column A (index 0): "${fullName}"`);
            
            let firstName = '';
            let lastName = '';
            if (fullName) {
              // Split name by common separators (space, comma)
              // Note: We don't split by "ו" because it's part of Hebrew names (e.g., "יובל", "ליאור", "נווה")
              // If names are connected with "ו" (e.g., "דוד ורותי"), they should be separated by spaces in Excel
              const nameParts = fullName.split(/[\s,]+/).filter((part: string) => part.trim());
              firstName = nameParts[0] || '';
              lastName = nameParts.slice(1).join(' ') || '';
            }
            
            // Column B (index 1): מספר טלפון
            const phoneNumber = String(row[1] || '').trim();
            console.log(`📋 Phone from column B (index 1): "${phoneNumber}"`);
            const finalPhone = phoneNumber.replace(/[^\d]/g, ''); // Remove non-digits
            
            // Column C (index 2): מספר מוזמנים
            const guestCount = parseInt(String(row[2] || '1')) || 1;
            console.log(`📋 Guest count from column C (index 2): "${guestCount}"`);
            
            // Column D (index 3): סטטוס אישור (RSVP Status)
            const rsvpStatusText = String(row[3] || '').trim();
            console.log(`📋 RSVP status from column D (index 3): "${rsvpStatusText}"`);
            const rsvpStatus = parseRsvpStatus(rsvpStatusText) || 'pending';
            
            // Column G (index 6): הגעה בפועל (Actual Attendance)
            const actualAttendanceText = String(row[6] || '').trim();
            console.log(`📋 Actual attendance from column G (index 6): "${actualAttendanceText}"`);
            const actualAttendance = parseActualAttendance(actualAttendanceText) || 'not_marked';
            
            // Column H (index 7): שולחן
            const tableNumber = String(row[7] || '').trim();
            console.log(`📋 Table number from column H (index 7): "${tableNumber}"`);
            
            // Column K (index 10): הערות
            const notes = String(row[10] || '').trim();
            console.log(`📋 Notes from column K (index 10): "${notes}"`);
            
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
          console.log('📋 Expected columns (LTR - משמאל לימין):', [
            '[0] Column A: שם מלא',
            '[1] Column B: מספר טלפון',
            '[2] Column C: מספר מוזמנים',
            '[3] Column D: סטטוס אישור',
            '[4] Column E: תאריך תגובה',
            '[5] Column F: ערוץ',
            '[6] Column G: הגעה בפועל',
            '[7] Column H: שולחן',
            '[8] Column I: סטטוס הודעה',
            '[9] Column J: תאריך שליחה',
            '[10] Column K: הערות'
          ]);
          alert('לא נמצאו אורחים לייבוא.\n\nאנא ודא שהקובץ Excel מכיל את העמודות הבאות (משמאל לימין):\n- Column A: שם מלא\n- Column B: מספר טלפון\n- Column C: מספר מוזמנים\n- Column D: סטטוס אישור\n- Column E: תאריך תגובה\n- Column F: ערוץ\n- Column G: הגעה בפועל\n- Column H: שולחן\n- Column I: סטטוס הודעה\n- Column J: תאריך שליחה\n- Column K: הערות\n\nשים לב: ניתן לייבא גם קובץ עם העמודות הבסיסיות בלבד (A, B, C, K).');
        }

        // Check for duplicates in the imported file
        const phoneCounts: Record<string, { count: number; guests: Guest[] }> = {};
        guests.forEach((guest: Guest, index: number) => {
          if (guest.phoneNumber && guest.phoneNumber.trim().length > 0) {
            const phone = guest.phoneNumber.trim();
            if (!phoneCounts[phone]) {
              phoneCounts[phone] = { count: 0, guests: [] };
            }
            phoneCounts[phone].count++;
            phoneCounts[phone].guests.push({ ...guest, rowNumber: index + 2 }); // +2 because header is row 1 and index is 0-based
          }
        });

        // Find duplicates (phone numbers that appear more than once)
        const duplicates = Object.entries(phoneCounts)
          .filter(([phone, data]) => data.count > 1)
          .map(([phone, data]) => ({ phone, ...data }));

        // Check for duplicates with existing guests in the system
        const existingGuests = currentEvent.guests || [];
        const existingPhones = new Set(existingGuests.map((g: Guest) => g.phoneNumber?.trim()).filter(Boolean));
        const duplicatesWithExisting = guests.filter((guest: Guest) => 
          guest.phoneNumber && existingPhones.has(guest.phoneNumber.trim())
        );

        // Show warning if duplicates found
        if (duplicates.length > 0 || duplicatesWithExisting.length > 0) {
          let warningMessage = '⚠️ נמצאו כפילויות!\n\n';
          
          if (duplicates.length > 0) {
            warningMessage += `📋 כפילויות בקובץ Excel (${duplicates.length} מספרי טלפון מופיעים יותר מפעם אחת):\n\n`;
            duplicates.forEach((dup: any, idx: number) => {
              warningMessage += `${idx + 1}. מספר טלפון: ${dup.phone}\n`;
              warningMessage += `   מופיע ${dup.count} פעמים בשורות:\n`;
              dup.guests.forEach((guest: Guest) => {
                warningMessage += `   - שורה ${guest.rowNumber}: ${formatFullName(guest.firstName, guest.lastName)}\n`;
              });
              warningMessage += '\n';
            });
          }

          if (duplicatesWithExisting.length > 0) {
            warningMessage += `\n📋 כפילויות עם אורחים קיימים במערכת (${duplicatesWithExisting.length} אורחים):\n\n`;
            duplicatesWithExisting.forEach((guest: Guest, idx: number) => {
              const existingGuest = existingGuests.find((g: Guest) => g.phoneNumber?.trim() === guest.phoneNumber?.trim());
              warningMessage += `${idx + 1}. ${formatFullName(guest.firstName, guest.lastName)} - ${guest.phoneNumber}\n`;
              if (existingGuest) {
                warningMessage += `   קיים במערכת: ${formatFullName(existingGuest.firstName, existingGuest.lastName)}\n`;
              }
              warningMessage += '\n';
            });
          }

          warningMessage += '\n💡 המלצה: בדוק את הרשומות הכפולות לפני המשך הייבוא.\n';
          warningMessage += 'האם אתה רוצה להמשיך בכל זאת?';

          const shouldContinue = window.confirm(warningMessage);
          if (!shouldContinue) {
            setShowImportModal(false);
            return;
          }
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
              firstName: guest.firstName?.trim() || '',
              lastName: guest.lastName?.trim() || '',
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

  const handleSendMessage = async () => {
    console.log('🚀 handleSendMessage called');
    console.log('📋 selectedGuests:', selectedGuests);
    console.log('📋 currentEvent:', currentEvent);
    
    if (selectedGuests.length === 0) {
      console.warn('⚠️ No guests selected');
      alert('אנא בחר לפחות מוזמן אחד');
      return;
    }

    try {
      console.log('✅ Starting message send process...');
      const guestsToSend = currentEvent.guests.filter(guest => selectedGuests.includes(guest.id));
      console.log('📋 guestsToSend:', guestsToSend.length, 'guests');
      
      // Use default message if no custom message
      const baseMessage = customMessage || `שלום! אתם מוזמנים לאירוע שלנו!\n\n📅 ${formatDate(currentEvent.eventDate)}\n📍 ${currentEvent.venue}\n\nאנא אשרו הגעה.\n\nבברכה,\n${currentEvent.coupleName}`;

      const recipients = guestsToSend.map((guest: Guest) => {
        // CRITICAL: Find the original row number of the guest in the event (not filtered)
        const originalRowNumber = currentEvent.guests.findIndex((g: Guest) => g.id === guest.id) + 1;
        // Use helper function to ensure production URL (works on all devices)
        const guestLink = generateGuestResponseLink(currentEvent.id, guest.id, guest.firstName, guest.lastName, guest.phoneNumber, originalRowNumber);
      console.log('🔗 Generated guest link:', guestLink);
      console.log('🔗 Event ID:', currentEvent.id);
      console.log('🔗 Guest ID:', guest.id);
        console.log('🖼️ Event invitation image:', currentEvent.invitationImageUrl);
      
      const personalizedMessage = customMessage 
        ? customMessage.replace('{{guest_link}}', guestLink)
        : `${baseMessage}\n\n🔗 לאשר הגעה ולעדכן סטטוס: ${guestLink}`;
      
      // CRITICAL: Prepare template parameters for template "new" (8 parameters + guest_response_link)
      // Template "new" expects: guest_name, event_type, groom_name, bride_name, event_date, event_time, venue, couple_name
      // Plus guest_response_link for the URL button at index 0
      const coupleName = currentEvent.coupleName || 
        (currentEvent.groomName && currentEvent.brideName 
          ? `${currentEvent.groomName} ו${currentEvent.brideName}` 
          : 'הזוג');
      const groomName = currentEvent.groomName || '';
      const brideName = currentEvent.brideName || '';
      
      const templateParamsForNew = {
        paramsOrder: ['guest_name', 'event_type', 'groom_name', 'bride_name', 
                     'event_date', 'event_time', 'venue', 'couple_name'],
        guest_name: guest.firstName,
        event_type: currentEvent.eventTypeHebrew || 'חתונה',
        groom_name: groomName,
        bride_name: brideName,
        event_date: formatDate(currentEvent.eventDate) || '',
        event_time: currentEvent.eventTime || '',
        venue: currentEvent.venue || '',
        couple_name: coupleName,
        guest_response_link: guestLink, // CRITICAL: Required for template "new" URL button at index 0
        language: 'he'
      };
        
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
          },
          // CRITICAL: Pass template params for template "new" so it can be used if needed (first message or retry)
          templateParams: templateParamsForNew
        };
      });

      console.log('📤 About to call messageService.sendBulkMessages');
      console.log('📋 Recipients count:', recipients.length);
      console.log('📋 Recipients:', recipients.map((r: any) => ({ name: `${r.firstName} ${r.lastName}`, phone: r.phoneNumber, firstMessageSent: r.firstMessageSent })));
      
      console.log('📤 About to call messageService.sendBulkMessages');
      console.log('📋 Recipients count:', recipients.length);
      console.log('📋 Recipients:', recipients.map((r: any) => ({ name: `${r.firstName} ${r.lastName}`, phone: r.phoneNumber, firstMessageSent: r.firstMessageSent })));
      
      let result;
      try {
        // CRITICAL: Import messageService dynamically to avoid circular dependency issues
        const { messageService } = await import('../services/messageService');
        
        // CRITICAL: For free-form messages, pass the message content
        // Each recipient has their own personalized message in recipient.message
        // But we also need to pass a base message for messageService to use
        const baseMessage = customMessage || `שלום! אתם מוזמנים לאירוע שלנו!\n\n📅 ${formatDate(currentEvent.eventDate)}\n📍 ${currentEvent.venue}\n\nאנא אשרו הגעה.\n\nבברכה,\n${currentEvent.coupleName}`;
        
        // CRITICAL: Each recipient already has templateParams with all 8 parameters + guest_response_link
        // This allows whatsappService to use template "aa" if needed (first message or retry after error 131047)
        // The templateParams are already set in the recipients array above
        
        result = await messageService.sendBulkMessages({
          message: baseMessage, // Base message for free-form messages
          templateName: undefined, // CRITICAL: No template - send as regular text message (will use template "aa" if first message)
          templateParams: undefined, // CRITICAL: Template params are already in each recipient.templateParams
          recipients
        });
        
        console.log('📊 messageService.sendBulkMessages result:', result);
      } catch (error) {
        console.error('❌ ERROR in messageService.sendBulkMessages:', error);
        console.error('❌ Error details:', {
          message: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
          error: error
        });
        throw error; // Re-throw to be caught by outer try-catch
      }

      // Update guest channels and message status based on actual results
      result.results.forEach((messageResult: any) => {
        const guest = guestsToSend.find((g: Guest) => g.id === messageResult.recipientId);
        if (guest && messageResult.success) {
          let messageStatus = 'sent';
          
          const updateData: any = { 
            channel: 'whatsapp',
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
      const successMessage = `✅ הודעות נשלחו בהצלחה!\n\n📊 סיכום:\n• ${result.successful} הודעות נשלחו בהצלחה\n• ${result.failed} הודעות נכשלו\n\n📱 ערוצים:\n• WhatsApp: ${result.results.filter((r: any) => r.channel === 'whatsapp' && r.success).length}\n• SMS: ${result.results.filter((r: any) => r.channel === 'sms' && r.success).length}`;
      
      alert(successMessage);
      
      setShowSendMessageModal(false);
      setSelectedGuests([]);
      setCustomMessage('');
    } catch (error) {
      console.error('❌ ERROR in handleSendMessage:', error);
      console.error('❌ Error details:', {
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        error: error
      });
      alert(`שגיאה בשליחת ההודעות: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  const handleSendToSingleGuest = useCallback(async (guest: any) => {
    console.log('🚀 handleSendToSingleGuest called');
    console.log('📋 guest:', { id: guest.id, name: `${guest.firstName} ${guest.lastName}`, phone: guest.phoneNumber });
    
    try {
      const event = useEventStore.getState().currentEvent;
      console.log('📋 event:', event ? { id: event.id, name: event.eventName } : 'null');
      
      if (!event || !event.id) {
        console.error('❌ No active event found');
        alert('שגיאה: לא נמצא אירוע פעיל');
        return;
      }
      
      // Use local IP for testing - replace with your actual IP
      const baseUrl = window.location.origin || 'http://192.168.1.47:3001';
      
      // Debug: Check if guest ID is correct
      console.log('🔍 DEBUG - Guest ID from parameter:', guest.id);
      console.log('🔍 DEBUG - Guest object:', guest);
      console.log('🔍 DEBUG - All guests in event:', event.guests?.map((g: Guest) => ({ id: g.id, name: `${g.firstName} ${g.lastName}` })));
      
      // Find the correct guest by name to get the real ID
      const realGuest = event.guests?.find((g: Guest) => 
        g.firstName === guest.firstName && g.lastName === guest.lastName
      );
      
      console.log('🔍 DEBUG - Real guest found:', realGuest);
      
      // Use the real guest ID if found, otherwise use the parameter ID
      const guestIdToUse = realGuest?.id || guest.id;
      // Use helper function to ensure production URL (works on all devices)
      const guestToUse = event.guests.find((g: Guest) => g.id === guestIdToUse) || realGuest || guest;
      // CRITICAL: Find the original row number of the guest in the event (not filtered)
      const guestIndex = event.guests.findIndex((g: Guest) => g.id === guestIdToUse);
      const originalRowNumber = guestIndex >= 0 ? guestIndex + 1 : 0;
      console.log('🔍 DEBUG - Original row number for guest:', {
        guestId: guestIdToUse,
        guestName: `${guestToUse?.firstName} ${guestToUse?.lastName}`,
        guestIndex,
        originalRowNumber,
        totalGuests: event.guests.length,
        willIncludeInLink: originalRowNumber > 0
      });
      const guestLink = generateGuestResponseLink(event.id, guestIdToUse, guestToUse?.firstName, guestToUse?.lastName, guestToUse?.phoneNumber, originalRowNumber);
      
      console.log('🔗 Single guest link:', guestLink);
      console.log('🔍 DEBUG - Link includes row?', guestLink.includes('row='));
      console.log('🔗 Single Event ID:', event.id);
      console.log('🔗 Single Guest ID used:', guestIdToUse);
      
      // Get the first campaign (הזמנה ראשונית)
      const firstCampaign = event.campaigns?.find((c: Campaign) => c.name === 'הזמנה ראשונית') || 
                            event.campaigns?.[0];
      
      // Debug: Log campaigns info
      console.log('🔍 DEBUG Campaigns check:', {
        campaignsExists: !!event.campaigns,
        campaignsLength: event.campaigns?.length || 0,
        campaignsNames: event.campaigns?.map((c: Campaign) => c.name) || [],
        firstCampaignFound: !!firstCampaign,
        firstCampaignName: firstCampaign?.name,
        firstCampaignTemplateName: firstCampaign?.templateName
      });
      
      let message: string;
      let campaignImageUrl: string | undefined;
      
      // Get couple name - use groomName & brideName if coupleName is not available
        const coupleName = event.coupleName || 
          (event.groomName && event.brideName ? `${event.groomName} & ${event.brideName}` : 
           event.groomName || event.brideName || 'הזוג');
        const groomName = event.groomName || '';
        const brideName = event.brideName || '';
        
        // DEBUG: Log template variables
        console.log('🔍 DEBUG Template Variables:', {
          coupleName: coupleName,
          groomName: groomName,
          brideName: brideName,
          eventCoupleName: event.coupleName,
          eventGroomName: event.groomName,
          eventBrideName: event.brideName
        });
      
      if (firstCampaign) {
        console.log('📧 Using first campaign message:', firstCampaign.name);
        
        // Replace template variables in campaign message
        const guestTable = event.tables?.find((table: Table) => table.guests.includes(guestIdToUse));
        const tableNumber = guestTable ? guestTable.number : 'לא הוקצה';
        
        message = firstCampaign.message
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
        
        campaignImageUrl = firstCampaign.imageUrl;
      } else {
        // Fallback to default message if no campaign found
        // BUT: For first messages, we should use template "aa" instead of regular message
        console.log('⚠️ No campaign found, but will use template "aa" for first message');
        message = customMessage || `שלום ${guest.firstName}! אתם מוזמנים לאירוע שלנו!\n\n📅 ${formatDate(event.eventDate)}\n📍 ${event.venue || ''}\n\n🔗 לאשר הגעה ולעדכן סטטוס: ${guestLink}\n\nבברכה,\n${coupleName}`;
      }

      // CRITICAL FIX: Use event invitation image if available, otherwise use campaign image
      // Priority: event.invitationImageUrl > campaign.imageUrl
      const finalImageUrl = event.invitationImageUrl || campaignImageUrl;
      
      console.log('🖼️ Image URL priority check:', {
        eventInvitationImageUrl: currentEvent.invitationImageUrl,
        campaignImageUrl: campaignImageUrl,
        finalImageUrl: finalImageUrl
      });
      
      // CRITICAL: For manual messages from table, use template "new" (simple like curl)
      console.log('📝 Sending manual message with template "new"');
      console.log('📝 Message:', message.substring(0, 100) + '...');
      
      // Template "new" - needs 8 body parameters + URL button
      // Use Hebrew language (he) for new template
      const templateParamsForNew = {
        language: 'he', // new template exists in Hebrew
        guest_response_link: guestLink, // CRITICAL: Required for URL button
        guestName: guest.firstName, // For body parameter 1
        eventData: {
          coupleName: event.coupleName || coupleName,
          groomName: event.groomName || groomName,
          brideName: event.brideName || brideName,
          eventType: event.eventType,
          eventTypeHebrew: event.eventTypeHebrew || 'חתונה',
          eventDate: formatDate(event.eventDate),
          eventTime: event.eventTime || '',
          venue: event.venue || '',
          invitationImageUrl: finalImageUrl
        }
      };
      
      console.log('📤 About to call messageService.sendBulkMessages for single guest');
      console.log('📋 Guest:', { id: guest.id, name: `${guest.firstName} ${guest.lastName}`, phone: guest.phoneNumber });
      console.log('📋 Template params:', templateParamsForNew);
      
      let result;
      try {
        // CRITICAL: Import messageService dynamically to avoid circular dependency issues
        const { messageService } = await import('../services/messageService');
        
        result = await messageService.sendBulkMessages({
          message,
          imageUrl: finalImageUrl,
          // CRITICAL: Use template "new" (simple like curl - no components)
          templateName: '1', // Use template "1" from Meta Business Manager
          templateParams: templateParamsForNew,
          recipients: [{
            id: guest.id,
            firstName: guest.firstName,
            lastName: guest.lastName,
            phoneNumber: guest.phoneNumber,
            channel: messageChannel,
            message: message,
            firstMessageSent: guest.firstMessageSent || false, // Pass first message status
            eventData: {
              coupleName: event.coupleName || coupleName,
              groomName: event.groomName || groomName,
              brideName: event.brideName || brideName,
              eventType: event.eventType,
              eventTypeHebrew: event.eventTypeHebrew || 'חתונה',
              eventDate: formatDate(event.eventDate),
              eventTime: event.eventTime || '',
              venue: event.venue || '',
              invitationImageUrl: finalImageUrl // Use event image first, then campaign image
            },
            // CRITICAL: Pass template params for template "new"
            templateParams: templateParamsForNew
          }]
        });
        
        console.log('📊 messageService.sendBulkMessages result:', result);
      } catch (error) {
        console.error('❌ ERROR in messageService.sendBulkMessages:', error);
        console.error('❌ Error details:', {
          message: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
          error: error
        });
        throw error; // Re-throw to be caught by outer try-catch
      }

      // Update guest channel and message status based on actual result
      if (result.results.length > 0) {
        const messageResult = result.results[0];
        if (messageResult.success) {
          let messageStatus = 'sent';
          
          updateGuest(event.id, guest.id, { 
            channel: 'whatsapp',
            messageStatus: messageStatus as any,
            messageSentDate: new Date()
          });
        }
      }

      if (result.successful > 0) {
        const channel = result.results[0]?.channel === 'whatsapp' ? 'WhatsApp' : 'SMS';
        const warning = result.results[0]?.warning;
        const guestFullName = formatFullName(guest.firstName, guest.lastName);
        let message = `✅ הודעה נשלחה בהצלחה ל-${guestFullName}!\n\n📱 ערוץ: ${channel}\n📞 טלפון: ${guest.phoneNumber}`;
        
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
        const guestFullName = formatFullName(guest.firstName, guest.lastName);
        alert(`❌ שגיאה בשליחת הודעה ל-${guestFullName}\n\n🔍 שגיאה: ${error}\n\n💡 אנא פתח את הקונסול (F12) לפרטים נוספים`);
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
  }, [updateGuest]);

  try {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-md p-4 mb-4">
        <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">
                {currentEvent.coupleName || (currentEvent.groomName && currentEvent.brideName ? `${currentEvent.groomName} & ${currentEvent.brideName}` : 'אירוע')}
              </h2>
              {(currentEvent.groomName || currentEvent.brideName) && (
                <p className="text-gray-500 mt-1 text-lg">
                  {currentEvent.groomName && currentEvent.brideName 
                    ? `${currentEvent.groomName} & ${currentEvent.brideName}`
                    : currentEvent.groomName || currentEvent.brideName}
                </p>
              )}
              <p className="text-gray-600 mt-1">
                {formatDate(currentEvent.eventDate)} - {currentEvent.eventTime} | {currentEvent.venue}
              </p>
            </div>
          <div className="flex items-center space-x-2">
            {/* Manual Refresh Button */}
            <button
              onClick={handleRefresh}
              disabled={isLoading}
              className="flex items-center text-blue-600 hover:text-blue-800 px-3 py-2 rounded-lg hover:bg-blue-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title="רענן נתונים"
            >
              <RefreshCw className={`w-5 h-5 ml-2 ${isLoading ? 'animate-spin' : ''}`} />
              רענן
            </button>
            {pendingUpdatesCount > 0 && (
              <button
                onClick={handleProcessPendingUpdates}
                disabled={isProcessingPendingUpdates || isLoading}
                className="flex items-center bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-md font-semibold"
                title={`עבד ${pendingUpdatesCount} עדכונים ממתינים`}
              >
                <Play className={`w-5 h-5 ml-2 ${isProcessingPendingUpdates ? 'animate-spin' : ''}`} />
                <span>{isProcessingPendingUpdates ? 'מעבד...' : `עבד ${pendingUpdatesCount} עדכונים ממתינים`}</span>
              </button>
            )}
            <button
              onClick={() => setShowSyncMonitoringModal(true)}
              className="flex items-center text-blue-600 hover:text-blue-800 px-3 py-2 rounded-lg hover:bg-blue-50 transition-colors"
              title="פתח חלון ניטור עדכונים וסינכרון"
            >
              <Activity className="w-5 h-5 ml-2" />
              ניטור סינכרון
            </button>
            <button
              onClick={async () => {
                try {
                  // Process all updates (not just today's) to catch any missed updates
                  const result = await webhookService.syncAllUpdates(false);
                  alert(`✅ סריקה הושלמה!\nעובדו: ${result.processed} עדכונים\nנכשלו: ${result.failed} עדכונים\nנותרו: ${result.remaining} עדכונים`);
                  // Refresh events to show updated data
                  await fetchEvents(false, true);
                } catch (error) {
                  console.error('❌ Error syncing updates:', error);
                  alert('❌ שגיאה בסריקת עדכונים. נסה שוב.');
                }
              }}
              className="flex items-center text-green-600 hover:text-green-800 px-3 py-2 rounded-lg hover:bg-green-50 transition-colors"
              title="סרוק ועדכן את כל העדכונים מ-WhatsApp (כולל ישנים)"
            >
              <RefreshCw className="w-5 h-5 ml-2" />
              סנכרן עדכוני WhatsApp
            </button>
            <button
              onClick={() => navigate('/')}
              className="flex items-center text-gray-600 hover:text-gray-800 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors"
              aria-label="חזרה לדשבורד"
              title="חזרה לדשבורד"
            >
              <ArrowRight className="w-5 h-5 ml-2" />
              חזרה לדשבורד
            </button>
          </div>
          </div>
        </div>
        
        <div className="flex space-x-3">
          <button
            onClick={() => setShowSendMessageModal(true)}
            className="btn-warning flex items-center space-x-2"
            disabled={selectedGuests.length === 0}
            aria-label={`שלח הודעה ל-${selectedGuests.length} מוזמנים נבחרים`}
            title={`שלח הודעה ל-${selectedGuests.length} מוזמנים נבחרים`}
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
          {(!currentEvent.campaigns || currentEvent.campaigns.length === 0) && (
            <button
              onClick={async () => {
                if (!id) return;
                try {
                  await recreateCampaigns(id);
                  await fetchEvents(false, true);
                  alert('✅ הקמפיינים נוצרו בהצלחה!');
                } catch (error: any) {
                  console.error('❌ Error recreating campaigns:', error);
                  alert(`❌ שגיאה ביצירת קמפיינים: ${error?.message || 'שגיאה לא ידועה'}`);
                }
              }}
              className="btn-warning flex items-center space-x-2 bg-yellow-500 hover:bg-yellow-600 text-white"
              title="צור קמפיינים מחדש לאירוע"
            >
              <RefreshCw className="w-4 h-4" />
              <span>צור קמפיינים</span>
            </button>
          )}
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
          <Link
            to={`/check-in/${currentEvent.id}`}
            target="_blank"
            className="btn-primary flex items-center space-x-2 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white font-bold shadow-lg transform hover:scale-105 transition-all duration-200"
            title="פתח עמדת סריקת ברקוד לאירוע"
          >
            <Camera className="w-5 h-5" />
            <span>עמדת סריקת ברקוד</span>
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-8 gap-4">
        <div className="stat-card-orange">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-orange-700">נותר להושיב</p>
              <p className="text-3xl font-bold text-orange-600">
                {(() => {
                  // Calculate total confirmed guests count (only those who are coming)
                  const totalConfirmedGuests = stats.confirmed || 0;
                  
                  // Calculate seated guests count (only confirmed guests who are seated)
                  const seatedConfirmedGuestsCount = currentEvent.tables?.reduce((acc: number, table: Table) => {
                    return acc + table.guests.reduce((sum: number, guestId: string) => {
                      const guest = currentEvent.guests.find((g: Guest) => g.id === guestId);
                      // Only count confirmed guests (those who are coming)
                      if (guest && guest.rsvpStatus === 'confirmed') {
                        return sum + (guest.guestCount || 1);
                      }
                      return sum;
                    }, 0);
                  }, 0) || 0;
                  
                  // Remaining to seat = total confirmed - seated confirmed
                  return totalConfirmedGuests - seatedConfirmedGuestsCount;
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
                  return currentEvent.tables?.reduce((acc: number, table: Table) => {
                    return acc + table.guests.reduce((sum: number, guestId: string) => {
                      const guest = currentEvent.guests.find((g: Guest) => g.id === guestId);
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
                  const attendedGuests = currentEvent.guests?.filter((g: Guest) => g.actualAttendance === 'attended') || [];
                  const totalAttendedCount = attendedGuests.reduce((sum: number, g: Guest) => sum + (g.guestCount || 1), 0);
                  return totalAttendedCount;
                })()}
              </p>
              <p className="text-xs text-teal-600 mt-1">
                {(() => {
                  const attendedGuests = currentEvent.guests?.filter((g: Guest) => g.actualAttendance === 'attended') || [];
                  const totalAttendedCount = attendedGuests.reduce((sum: number, g: Guest) => sum + (g.guestCount || 1), 0);
                  return stats.totalGuests > 0 
                    ? `${Math.round((totalAttendedCount / stats.totalGuests) * 100)}%`
                    : '0%';
                })()}
              </p>
            </div>
            <CheckCircle className="w-8 h-8 text-teal-600" />
          </div>
        </div>

        {/* Message Status Statistics */}
        <div className="stat-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">הודעות נשלחו</p>
              <p className="text-3xl font-bold text-blue-600">
                {currentEvent.guests?.filter((g: Guest) => g.messageStatus === 'sent' || g.messageStatus === 'delivered').length || 0}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                מתוך {currentEvent.guests?.length || 0} אורחים
              </p>
            </div>
            <Send className="w-8 h-8 text-blue-600" />
          </div>
        </div>

        <div className="stat-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">הודעות נמסרו</p>
              <p className="text-3xl font-bold text-green-600">
                {currentEvent.guests?.filter((g: Guest) => g.messageStatus === 'delivered').length || 0}
              </p>
              <p className="text-xs text-green-600 mt-1">
                {currentEvent.guests?.filter((g: Guest) => g.messageStatus === 'sent' || g.messageStatus === 'delivered').length > 0
                  ? `${Math.round((currentEvent.guests?.filter((g: Guest) => g.messageStatus === 'delivered').length || 0) / (currentEvent.guests?.filter((g: Guest) => g.messageStatus === 'sent' || g.messageStatus === 'delivered').length || 1) * 100)}%`
                  : '0%'} מסירה
              </p>
            </div>
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
        </div>

        <div className="stat-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">הודעות נכשלו</p>
              <p className="text-3xl font-bold text-red-600">
                {currentEvent.guests?.filter((g: Guest) => g.messageStatus === 'failed').length || 0}
              </p>
              <p className="text-xs text-red-600 mt-1">
                {currentEvent.guests?.filter((g: Guest) => g.messageStatus === 'failed').length > 0 ? 'נדרש טיפול' : 'אין שגיאות'}
              </p>
            </div>
            <XCircle className="w-8 h-8 text-red-600" />
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

        <div className="stat-card bg-gradient-to-br from-indigo-50 to-indigo-100 border-2 border-indigo-200 rounded-lg p-4 shadow-md">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-indigo-700">הודעות נשלחו</p>
              <p className="text-3xl font-bold text-indigo-600">
                {(() => {
                  // Count total messages sent:
                  // 1. Sum of sentCount from all campaigns that were sent
                  const campaignMessages = currentEvent.campaigns?.reduce((sum: number, campaign: Campaign) => {
                    if (campaign.status === 'sent' && campaign.sentCount) {
                      return sum + campaign.sentCount;
                    }
                    return sum;
                  }, 0) || 0;
                  
                  // 2. Count individual messages sent (guests with messageSentDate)
                  // Each guest with messageSentDate represents at least one message sent
                  // Note: This counts each guest once, but if same guest received multiple individual messages,
                  // we can't track exact count without message history
                  const individualMessages = currentEvent.guests?.filter((g: Guest) => {
                    const status = g.messageStatus || 'not_sent';
                    // Count guests who received individual messages (not through campaigns)
                    // We check if they have messageSentDate but weren't counted in campaigns
                    return (status === 'sent' || status === 'delivered') && g.messageSentDate;
                  }).length || 0;
                  
                  // Total = campaign messages + individual messages
                  // Note: This is an approximation - if a guest received both campaign and individual messages,
                  // they might be counted twice, but it's the best we can do without message history
                  const totalMessages = campaignMessages + individualMessages;
                  
                  return totalMessages;
                })()}
              </p>
              <p className="text-xs text-indigo-600 mt-1">
                {(() => {
                  const campaignMessages = currentEvent.campaigns?.reduce((sum: number, campaign: Campaign) => {
                    if (campaign.status === 'sent' && campaign.sentCount) {
                      return sum + campaign.sentCount;
                    }
                    return sum;
                  }, 0) || 0;
                  
                  const individualMessages = currentEvent.guests?.filter((g: Guest) => {
                    const status = g.messageStatus || 'not_sent';
                    return (status === 'sent' || status === 'delivered') && g.messageSentDate;
                  }).length || 0;
                  
                  return `קמפיינים: ${campaignMessages} | אישיות: ${individualMessages}`;
                })()}
              </p>
            </div>
            <Send className="w-8 h-8 text-indigo-600" />
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
            onChange={(e: ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
            className="input-field pr-10 text-lg border-2 border-gray-200 focus:border-blue-500 rounded-xl"
            aria-label="חיפוש אורחים"
            title="חיפוש אורחים"
          />
        </div>
        
        <div className="flex gap-2">
          <button 
            onClick={() => {
              // Filter to show only guests without table assignment
              const unseatedGuests = currentEvent.guests?.filter((g: Guest) => !g.tableId) || [];
              if (unseatedGuests.length === 0) {
                alert('✅ כל האורחים הושבו!');
                return;
              }
              // Set filter to show unseated guests
              setFilterStatus('all');
              setSearchTerm('');
              // Scroll to table and highlight unseated guests
              const tableElement = document.querySelector('table');
              if (tableElement) {
                tableElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }
            }}
            className="btn-warning flex items-center space-x-2 px-4 py-2 rounded-lg font-medium hover:bg-yellow-600 transition-colors cursor-pointer"
            aria-label="הצג אורחים ממתינים לשיבוץ"
            title="הצג אורחים ממתינים לשיבוץ"
          >
            <Users className="w-4 h-4" />
            <span>אורחים ממתינים ({stats.totalGuests - (currentEvent.tables?.reduce((acc: number, table: Table) => {
              const tableGuests = currentEvent.guests?.filter((g: Guest) => g.tableId === table.id) || [];
              return acc + tableGuests.reduce((sum: number, guest: Guest) => sum + (guest.guestCount || 1), 0);
            }, 0) || 0)})</span>
          </button>
          
          <button 
            onClick={() => {
              navigate(`/event/${currentEvent.id}/seating`);
            }}
            className="btn-primary flex items-center space-x-2 px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors cursor-pointer"
            aria-label="הושב אורח לשולחן"
            title="הושב אורח לשולחן"
          >
            <Users className="w-4 h-4" />
            <span>הושב אורח</span>
          </button>
        </div>
        
        <select
          value={filterStatus}
          onChange={(e: ChangeEvent<HTMLSelectElement>) => setFilterStatus(e.target.value)}
          className="input-field w-full lg:w-48 border-2 border-gray-200 focus:border-blue-500 rounded-xl"
          aria-label="סנן לפי סטטוס"
          title="סנן לפי סטטוס"
        >
          <option value="all">כל הסטטוסים</option>
          <option value="pending">לא ענה</option>
          <option value="confirmed">מגיע</option>
          <option value="declined">לא מגיע</option>
          <option value="maybe">אולי מגיע</option>
        </select>
        
        <select
          value={messageFilterStatus}
          onChange={(e: ChangeEvent<HTMLSelectElement>) => setMessageFilterStatus(e.target.value)}
          className="input-field w-full lg:w-56 border-2 border-gray-200 focus:border-blue-500 rounded-xl"
          aria-label="סנן לפי סטטוס הודעה"
          title="סנן לפי סטטוס הודעה"
        >
          <option value="all">כל סטטוסי הודעות</option>
          <option value="sent_not_delivered">נשלח ולא התקבל</option>
          <option value="not_sent">לא נשלחה</option>
          <option value="sent">נשלחה</option>
          <option value="delivered">נשלחה והתקבלה</option>
          <option value="failed">נשלחה ונכשלה</option>
        </select>
        
        <button
          onClick={() => setShowAddGuest(true)}
          className="btn-primary flex items-center space-x-2 px-4 py-2 rounded-lg font-medium"
          aria-label="הוסף מוזמן חדש"
          title="הוסף מוזמן חדש"
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
                aria-label="סגור חלון הוספה/עריכה"
                title="סגור חלון הוספה/עריכה"
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
                  onChange={(e: ChangeEvent<HTMLInputElement>) => setModalSearchTerm(e.target.value)}
                  className="w-full pr-10 pl-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  aria-label="חיפוש אורחים קיימים"
                  title="חיפוש אורחים קיימים"
                />
              </div>
              
              {modalSearchTerm && (
                <div className="mt-3 max-h-40 overflow-y-auto border border-gray-200 rounded-lg">
                  {modalFilteredGuests.length > 0 ? (
                    <div className="space-y-1 p-2">
                      {modalFilteredGuests.map((guest: Guest) => (
                        <div key={guest.id} className="flex items-center justify-between p-2 hover:bg-gray-50 rounded">
                          <div>
                            <span className="text-sm font-medium">
                              {formatFullName(guest.firstName, guest.lastName)}
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
                            aria-label={`בחר את ${formatFullName(guest.firstName, guest.lastName)}`}
                            title={`בחר את ${formatFullName(guest.firstName, guest.lastName)}`}
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
                onChange={(e: ChangeEvent<HTMLInputElement>) => setNewGuest({...newGuest, firstName: e.target.value})}
                className="input-field"
                required
                aria-label="שם מלא של המוזמן"
                title="שם מלא של המוזמן"
              />
              
              <input
                type="tel"
                placeholder="מספר טלפון"
                value={newGuest.phoneNumber}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setNewGuest({...newGuest, phoneNumber: e.target.value})}
                className="input-field"
                required
                aria-label="מספר טלפון של המוזמן"
                title="מספר טלפון של המוזמן"
              />
              
              <div className="grid grid-cols-2 gap-4">
                <input
                  type="number"
                  placeholder="מספר מוזמנים"
                  value={newGuest.guestCount}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => setNewGuest({...newGuest, guestCount: parseInt(e.target.value) || 1})}
                  className="input-field"
                  min="1"
                  aria-label="מספר מוזמנים"
                  title="מספר מוזמנים"
                />
                <input
                  type="text"
                  placeholder="הערות (אופציונלי)"
                  value={newGuest.notes}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => setNewGuest({...newGuest, notes: e.target.value})}
                  className="input-field"
                  aria-label="הערות על המוזמן"
                  title="הערות על המוזמן"
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
                  aria-label="ביטול הוספה/עריכה"
                  title="ביטול הוספה/עריכה"
                >
                  ביטול
                </button>
                <button 
                  type="submit" 
                  className="btn-primary flex items-center space-x-2"
                  aria-label={editingGuest ? 'עדכן מוזמן' : 'הוסף מוזמן'}
                  title={editingGuest ? 'עדכן מוזמן' : 'הוסף מוזמן'}
                >
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
          <table className="w-full divide-y divide-gray-200 table-fixed min-w-[1200px]">
            <thead className="bg-gradient-to-r from-gray-50 to-gray-100 sticky top-0 z-10 pointer-events-none">
              <tr>
                <th className="px-3 py-4 text-center text-sm font-semibold text-gray-700 uppercase tracking-wider w-12 pointer-events-auto">
                  #
                </th>
                <th className="px-4 py-4 text-right text-sm font-semibold text-gray-700 uppercase tracking-wider pointer-events-auto">
                  <input
                    type="checkbox"
                    checked={selectedGuests.length === filteredGuests.length && filteredGuests.length > 0}
                    onChange={selectedGuests.length === filteredGuests.length ? handleDeselectAllGuests : handleSelectAllGuests}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 w-4 h-4"
                    aria-label="בחר/בטל בחירת כל האורחים"
                    title="בחר/בטל בחירת כל האורחים"
                  />
                </th>
                <th className="px-4 py-4 text-right text-sm font-semibold text-gray-700 uppercase tracking-wider whitespace-nowrap pointer-events-auto">
                  מוזמן
                </th>
                <th className="px-3 py-4 text-right text-sm font-semibold text-gray-700 uppercase tracking-wider whitespace-nowrap pointer-events-auto">
                  טלפון
                </th>
                <th className="px-3 py-4 text-center text-sm font-semibold text-gray-700 uppercase tracking-wider w-24 min-w-[100px] pointer-events-auto">
                  מספר מוזמנים
                </th>
                <th className="px-3 py-4 text-right text-sm font-semibold text-gray-700 uppercase tracking-wider w-32 min-w-[120px] pointer-events-auto">
                  סטטוס אישור
                </th>
                <th className="px-3 py-4 text-right text-sm font-semibold text-gray-700 uppercase tracking-wider w-32 min-w-[120px] pointer-events-auto">
                  הגעה בפועל
                </th>
                <th className="px-3 py-4 text-right text-sm font-semibold text-gray-700 uppercase tracking-wider w-32 min-w-[120px] pointer-events-auto">
                  ערוץ
                </th>
                <th className="px-3 py-4 text-right text-sm font-semibold text-gray-700 uppercase tracking-wider w-36 min-w-[140px] pointer-events-auto">
                  שולחן
                </th>
                <th className="px-3 py-4 text-right text-sm font-semibold text-gray-700 uppercase tracking-wider w-36 min-w-[140px] pointer-events-auto">
                  סטטוס הודעה
                </th>
                <th className="px-3 py-4 text-right text-sm font-semibold text-gray-700 uppercase tracking-wider whitespace-nowrap pointer-events-auto">
                  תאריך שליחה
                </th>
                <th className="px-3 py-4 text-right text-sm font-semibold text-gray-700 uppercase tracking-wider whitespace-nowrap pointer-events-auto">
                  פעולות
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200 relative z-0">
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
                filteredGuests.map((guest: Guest, index: number) => {
                  // CRITICAL: Find the original row number of the guest in the event (not filtered)
                  const originalRowNumber = currentEvent.guests.findIndex((g: Guest) => g.id === guest.id) + 1;
                  return (
                <tr key={guest.id} className={`hover:bg-blue-50 transition-colors duration-200 relative z-0 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                  <td className="px-3 py-4 text-center text-sm font-bold w-12">
                    <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-blue-600 text-white shadow-sm" title={`מספר שורה מקורי: ${originalRowNumber}`}>
                      {originalRowNumber}
                    </span>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <input
                      type="checkbox"
                      checked={selectedGuests.includes(guest.id)}
                      onChange={() => handleSelectGuest(guest.id)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 w-4 h-4"
                      aria-label={`בחר אורח ${guest.firstName} ${guest.lastName}`}
                      title={`בחר אורח ${guest.firstName} ${guest.lastName}`}
                    />
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
                  <td className="px-3 py-4 text-sm text-gray-900 w-24 min-w-[100px]">
                    <input
                      type="number"
                      value={guest.guestCount ?? 1}
                      onChange={async (e: ChangeEvent<HTMLInputElement>) => {
                        const inputValue = e.target.value;
                        // Allow empty string while typing
                        if (inputValue === '') {
                          return;
                        }
                        const newValue = parseInt(inputValue);
                        if (!isNaN(newValue) && newValue >= 1) {
                          // CRITICAL: Update immediately with the new value to prevent reversion
                          // Use await to ensure the update completes before continuing
                          await handleUpdateGuestField(guest.id, { 
                            guestCount: newValue,
                            source: 'manual_update',
                            responseDate: new Date()
                          });
                        }
                      }}
                      onBlur={(e: React.FocusEvent<HTMLInputElement>) => {
                        // Ensure value is at least 1 when field loses focus
                        const value = parseInt(e.target.value);
                        if (isNaN(value) || value < 1) {
                          handleUpdateGuestField(guest.id, { 
                            guestCount: 1,
                            source: 'manual_update',
                            responseDate: new Date()
                          });
                        }
                      }}
                      className="w-full text-center border-2 border-gray-200 rounded-lg px-2 py-1 text-sm focus:border-blue-500 focus:outline-none"
                      min="1"
                    />
                  </td>
                  <td className="px-3 py-4 w-32 min-w-[120px]">
                    <select
                      value={guest.rsvpStatus}
                      onChange={(e: ChangeEvent<HTMLSelectElement>) => handleUpdateGuestStatus(guest.id, e.target.value)}
                      className={`text-sm font-semibold ${getStatusColor(guest.rsvpStatus)} bg-transparent border-2 border-gray-200 rounded-lg px-2 py-1 w-full focus:outline-none focus:border-blue-500`}
                      aria-label={`סטטוס RSVP עבור ${guest.firstName} ${guest.lastName}`}
                      title={`סטטוס RSVP עבור ${guest.firstName} ${guest.lastName}`}
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
                      onChange={(e: ChangeEvent<HTMLSelectElement>) => handleUpdateAttendance(guest.id, e.target.value)}
                      className="text-sm font-semibold bg-transparent border-2 border-gray-200 rounded-lg px-2 py-1 w-full focus:outline-none focus:border-blue-500"
                      aria-label={`נוכחות בפועל עבור ${guest.firstName} ${guest.lastName}`}
                      title={`נוכחות בפועל עבור ${guest.firstName} ${guest.lastName}`}
                    >
                      <option value="not_marked">לא סומן</option>
                      <option value="attended">הגיע</option>
                      <option value="not_attended">לא הגיע</option>
                    </select>
                  </td>
                  <td className="px-3 py-4 text-sm text-gray-500 w-32 min-w-[120px]">
                    <select
                      value={guest.channel || 'manual'}
                      onChange={(e: ChangeEvent<HTMLSelectElement>) => handleUpdateGuestField(guest.id, { channel: e.target.value as 'whatsapp' | 'sms' | 'manual' })}
                      className="text-sm border-2 border-gray-200 rounded-lg px-2 py-1 bg-white focus:outline-none focus:border-blue-500 w-full"
                      aria-label={`ערוץ תקשורת עבור ${guest.firstName} ${guest.lastName}`}
                      title={`ערוץ תקשורת עבור ${guest.firstName} ${guest.lastName}`}
                    >
                      <option value="whatsapp">וואטסאפ</option>
                      <option value="sms">SMS</option>
                      <option value="manual">ידני</option>
                    </select>
                  </td>
                  <td className="px-3 py-4 text-sm text-gray-500 w-36 min-w-[140px]">
                    <select
                      value={guest.tableId || ''}
                      onChange={(e: ChangeEvent<HTMLSelectElement>) => {
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
                      aria-label={`מספר שולחן עבור ${guest.firstName} ${guest.lastName}`}
                      title={`מספר שולחן עבור ${guest.firstName} ${guest.lastName}`}
                    >
                      <option value="">ללא שולחן</option>
                      {currentEvent.tables?.map((table: Table) => (
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
                  <td className="px-3 py-4 text-sm text-gray-500 w-40 min-w-[160px]">
                    <div className="flex items-center space-x-2 space-x-reverse">
                      <div className={`flex items-center space-x-1 space-x-reverse px-2 py-1 rounded-lg ${getMessageStatusColor(guest.messageStatus || 'not_sent')}`}>
                        {getMessageStatusIcon(guest.messageStatus || 'not_sent')}
                        <span className="font-semibold text-xs">
                          {getMessageStatusText(guest.messageStatus || 'not_sent')}
                        </span>
                      </div>
                      {(guest.messageSentDate || guest.messageDeliveredDate || guest.messageFailedDate) && (
                        <div 
                          className="relative group cursor-help"
                          title={getMessageStatusTooltip(guest)}
                        >
                          <Activity className="w-4 h-4 text-gray-400 hover:text-gray-600" />
                          <div className="absolute bottom-full right-0 mb-2 w-48 p-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 whitespace-pre-line">
                            {getMessageStatusTooltip(guest)}
                          </div>
                        </div>
                      )}
                    </div>
                    <select
                      value={guest.messageStatus || 'not_sent'}
                      onChange={(e: ChangeEvent<HTMLSelectElement>) => handleUpdateGuestField(guest.id, { messageStatus: e.target.value })}
                      className={`text-xs mt-1 ${getMessageStatusColor(guest.messageStatus || 'not_sent')} bg-transparent border border-gray-200 rounded px-1 py-0.5 w-full focus:outline-none focus:border-blue-500`}
                      aria-label={`סטטוס הודעה עבור ${guest.firstName} ${guest.lastName}`}
                      title={`סטטוס הודעה עבור ${guest.firstName} ${guest.lastName}`}
                    >
                      <option value="not_sent">לא נשלחה</option>
                      <option value="sent">נשלחה</option>
                      <option value="delivered">נמסרה</option>
                      <option value="failed">נכשלה</option>
                    </select>
                  </td>
                  <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-500 w-32">
                    <div className="flex flex-col">
                      {guest.messageSentDate && (
                        <div className="text-xs">
                          <span className="text-gray-400">נשלח:</span> {formatDate(guest.messageSentDate)}
                        </div>
                      )}
                      {guest.messageDeliveredDate && (
                        <div className="text-xs text-green-600">
                          <span className="text-gray-400">נמסר:</span> {formatDate(guest.messageDeliveredDate)}
                        </div>
                      )}
                      {guest.messageFailedDate && (
                        <div className="text-xs text-red-600">
                          <span className="text-gray-400">נכשל:</span> {formatDate(guest.messageFailedDate)}
                        </div>
                      )}
                      {!guest.messageSentDate && !guest.messageDeliveredDate && !guest.messageFailedDate && (
                        <span className="text-gray-400">-</span>
                      )}
                    </div>
                  </td>
                  <td className="px-3 py-4 whitespace-nowrap text-sm font-medium w-24">
                    <div className="flex items-center space-x-1">
                      <button
                        onClick={(e) => {
                          console.log('🔘 Send to Single Guest button clicked!');
                          console.log('🔘 Guest:', { id: guest.id, name: `${guest.firstName} ${guest.lastName}`, phone: guest.phoneNumber });
                          console.log('🔘 handleSendToSingleGuest function:', typeof handleSendToSingleGuest);
                          try {
                            handleSendToSingleGuest(guest);
                          } catch (error) {
                            console.error('❌ ERROR in button onClick handler:', error);
                            alert(`שגיאה: ${error instanceof Error ? error.message : String(error)}`);
                          }
                        }}
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
                  );
                })
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
                  aria-label="הורד תבנית רשימת אורחים"
                  title="הורד תבנית רשימת אורחים"
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
                aria-label="ביטול ייבוא"
                title="ביטול ייבוא"
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
              <div className="bg-yellow-50 border border-yellow-500 rounded-lg p-3">
                <p className="text-yellow-800 text-sm font-medium">📱 שליחת הודעות אמיתית מופעלת!</p>
                <p className="text-yellow-700 text-sm mt-1">
                  נבחרו {selectedGuests.length} מוזמנים לשליחה
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  ערוץ שליחה
                </label>
                <div className="flex items-center text-sm text-gray-600">
                  <MessageSquare className="w-4 h-4 text-green-600 ml-1" />
                  <span>וואטסאפ</span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  תוכן ההודעה (אופציונלי)
                </label>
                <textarea
                  value={customMessage}
                  onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setCustomMessage(e.target.value)}
                  className="input-field h-32"
                  placeholder="השאר ריק לשימוש בהודעה ברירת מחדל..."
                  aria-label="תוכן ההודעה"
                  title="תוכן ההודעה"
                />
                <p className="text-sm text-gray-500 mt-1">
                  אם תשאיר ריק, תישלח הודעה ברירת מחדל עם פרטי האירוע
                </p>
              </div>

              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-sm font-medium text-gray-700 mb-2">מוזמנים נבחרים:</p>
                <div className="max-h-32 overflow-y-auto">
                  {selectedGuests.map(guestId => {
                    const guest = currentEvent.guests.find((g: Guest) => g.id === guestId);
                    return guest ? (
                      <div key={guestId} className="text-sm text-gray-600 py-1">
                        {formatFullName(guest.firstName, guest.lastName)} – {guest.phoneNumber}
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
                aria-label="ביטול שליחת הודעה"
                title="ביטול שליחת הודעה"
              >
                ביטול
              </button>
              <button
                onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                  console.log('🔘 Send Message button clicked!');
                  console.log('🔘 Event:', e);
                  console.log('🔘 handleSendMessage function:', typeof handleSendMessage);
                  try {
                    handleSendMessage();
                  } catch (error) {
                    console.error('❌ ERROR in button onClick handler:', error);
                    alert(`שגיאה: ${error instanceof Error ? error.message : String(error)}`);
                  }
                }}
                className="btn-warning flex items-center space-x-2"
                aria-label="שלח הודעה למוזמנים נבחרים"
                title="שלח הודעה למוזמנים נבחרים"
              >
                <Send className="w-4 h-4" />
                <span>שלח הודעה</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sync Monitoring Modal */}
      {showSyncMonitoringModal && id && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold text-gray-900 flex items-center">
                <Activity className="w-6 h-6 ml-2 text-blue-600" />
                ניטור עדכונים וסינכרון
              </h3>
              <button
                onClick={() => setShowSyncMonitoringModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
                title="סגור חלון"
              >
                <X className="w-6 h-6" />
              </button>
        </div>
            <div className="border-t border-gray-200 pt-4">
              <SyncMonitoringPanel eventId={id} />
            </div>
          </div>
        </div>
      )}
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
          aria-label="רענן את הדף"
          title="רענן את הדף"
        >
          רענן דף
        </button>
      </div>
    );
  }
};

export default EventManagement;