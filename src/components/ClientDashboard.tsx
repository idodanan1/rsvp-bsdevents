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
  Share2
} from 'lucide-react';

const ClientDashboard: React.FC = () => {
  const { eventId } = useParams<{ eventId: string }>();
  const { events, fetchEvents } = useEventStore();
  const [currentEvent, setCurrentEvent] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false); // Start with false - show page immediately
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
      console.log(`✅ Found event in store: ${event.coupleName} - showing immediately, will update from backend`);
      setCurrentEvent(event);
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
              console.log(`✅ Found event in localStorage: ${foundEvent.coupleName} - showing immediately, will update from backend`);
              setCurrentEvent(foundEvent);
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
            console.log(`✅ Found event silently in API: ${foundEvent.coupleName}`);
            setCurrentEvent(foundEvent);
          } else {
            console.error(`❌ Event ${eventId} not found in API`);
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
    if (userId) {
      // User is logged in - try fetchEvents first, then also load from public API
      fetchEvents().then(() => {
        const foundEvent = events.find(e => e.id === eventId);
        if (foundEvent) {
          console.log(`✅ Found event silently via fetchEvents: ${foundEvent.coupleName}`);
          setCurrentEvent(foundEvent);
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
      
      // Poll every 5 seconds for updates
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
              // Always update to ensure latest data is shown (backend is source of truth)
              setCurrentEvent((prev: any) => {
                if (!prev) {
                  console.log('🔄 ClientDashboard: Setting initial event from backend');
                  return foundEvent;
                }
                
                // Compare guests by ID, not by index (guests might be in different order)
                const prevGuestsMap = new Map((prev.guests || []).map((g: any) => [g.id, g]));
                const newGuestsMap = new Map((foundEvent.guests || []).map((g: any) => [g.id, g]));
                
                // Check if number of guests changed
                if (prevGuestsMap.size !== newGuestsMap.size) {
                  console.log('🔄 ClientDashboard: Guest count changed, updating from backend');
                  return foundEvent;
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
                  console.log('🔄 ClientDashboard: Event data updated silently from backend');
                  return foundEvent;
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
      console.log('🔄 Starting webhookService for ClientDashboard...');
      webhookService.startPolling(5000); // Poll every 5 seconds
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
            console.log('🔄 ClientDashboard: Setting initial event from store');
            return foundEvent;
          }
          
          // Compare guests by ID, not by index (guests might be in different order)
          const prevGuestsMap = new Map((prev.guests || []).map((g: any) => [g.id, g]));
          const newGuestsMap = new Map((foundEvent.guests || []).map((g: any) => [g.id, g]));
          
          // Check if number of guests changed
          if (prevGuestsMap.size !== newGuestsMap.size) {
            console.log('🔄 ClientDashboard: Guest count changed, updating from store');
            return foundEvent;
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
            return foundEvent;
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
                <h1 className="text-xl font-bold text-gray-900">{currentEvent.coupleName}</h1>
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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Event Info */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">{currentEvent.coupleName}</h2>
              <div className="flex items-center space-x-6 text-gray-600">
                <div className="flex items-center space-x-2">
                  <Calendar className="w-5 h-5" />
                  <span>{formatDate(currentEvent.eventDate)} - {currentEvent.eventTime}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <MapPin className="w-5 h-5" />
                  <span>{currentEvent.venue}</span>
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
                  {currentEvent.guests.filter((g: any) => g.channel === 'whatsapp').length}
                </span>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Phone className="w-5 h-5 text-blue-600" />
                  <span className="text-gray-700">SMS</span>
                </div>
                <span className="text-2xl font-bold text-blue-600">
                  {currentEvent.guests.filter((g: any) => g.channel === 'sms').length}
                </span>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Users className="w-5 h-5 text-gray-600" />
                  <span className="text-gray-700">ידני</span>
                </div>
                <span className="text-2xl font-bold text-gray-600">
                  {currentEvent.guests.filter((g: any) => g.channel === 'manual').length}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Guests List */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">רשימת מוזמנים</h3>
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
                {currentEvent.guests.map((guest: any) => (
                  <tr key={guest.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {formatFullName(guest.firstName, guest.lastName)}
                        </div>
                        {guest.notes && (
                          <div className="text-sm text-gray-500">{guest.notes}</div>
                        )}
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
                      {guest.responseDate ? formatDateTime(guest.responseDate) : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClientDashboard;
