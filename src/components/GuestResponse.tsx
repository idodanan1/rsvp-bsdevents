import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useEventStore } from '../store/eventStore';
import { formatDate, formatDateTime } from '../utils/helpers';
import { CheckCircle, XCircle, Users, Calendar, MapPin, Phone, User, MessageSquare, Clock, Heart } from 'lucide-react';

const GuestResponse = () => {
  const { eventId: paramEventId } = useParams<{ eventId: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { events, updateGuestResponse, fetchEvents } = useEventStore();
  
  // Parse eventId from hash if not in params (HashRouter fallback)
  const parseEventIdFromHash = () => {
    if (paramEventId) return paramEventId;
    
    // Try to parse from hash
    const hash = window.location.hash;
    if (hash) {
      // Hash format: #/guest-response/eventId?guest=guestId
      const match = hash.match(/\/guest-response\/([^/?]+)/);
      if (match && match[1]) {
        console.log('✅ Parsed eventId from hash:', match[1]);
        return match[1];
      }
    }
    return null;
  };
  
  const eventId = paramEventId || parseEventIdFromHash();
  
  // Parse guestId from hash or search params
  const parseGuestId = () => {
    const fromSearch = searchParams.get('guest');
    if (fromSearch) return fromSearch;
    
    // Try to parse from hash
    const hash = window.location.hash;
    if (hash) {
      const match = hash.match(/[?&]guest=([^&]+)/);
      if (match && match[1]) {
        console.log('✅ Parsed guestId from hash:', match[1]);
        return decodeURIComponent(match[1]);
      }
    }
    return null;
  };
  
  const guestId = parseGuestId();
  
  // Force fetch events on component mount
  React.useEffect(() => {
    console.log('🔄 GuestResponse mounted, fetching events...');
    console.log('🔍 Parsed IDs:', { eventId, guestId, paramEventId, hash: window.location.hash });
    fetchEvents();
    
    // Also try to load directly from localStorage
    const stored = localStorage.getItem('rsvp-events-storage');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        console.log('📋 Direct localStorage check:', parsed);
        if (parsed.state && parsed.state.events) {
          console.log('📋 Found events in localStorage:', parsed.state.events.length);
          parsed.state.events.forEach((event: any, index: number) => {
            console.log(`📅 Event ${index + 1}:`, {
              id: event.id,
              coupleName: event.coupleName,
              guestsCount: event.guests?.length || 0
            });
          });
        }
      } catch (error) {
        console.error('❌ Error parsing localStorage:', error);
      }
    }
  }, [fetchEvents, eventId, guestId]);
  
  // Debug URL parameters
  console.log('🔍 URL Parameters Debug:', {
    eventId,
    guestId,
    searchParams: Object.fromEntries(searchParams.entries()),
    allSearchParams: searchParams.toString()
  });
  
  const [formData, setFormData] = useState({
    phoneNumber: '',
    fullName: '',
    guestCount: 1,
    notes: '',
    response: 'attending' as 'attending' | 'not_attending' | 'maybe',
    actualAttendance: 'not_marked' as 'attended' | 'not_attended' | 'not_marked'
  });
  
  const [showGuestCount, setShowGuestCount] = useState(false);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error' | 'not_found'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  
  // State to store event found directly from localStorage (for public access)
  const [directEvent, setDirectEvent] = React.useState<any>(null);
  const [directGuest, setDirectGuest] = React.useState<any>(null);
  
  // State to track loading
  const [isLoadingEvent, setIsLoadingEvent] = useState(true);

  // Try to find event from store first, then from direct localStorage
  const event = events.find(e => e.id === eventId) || directEvent;
  const guest = event?.guests.find(g => g.id === guestId) || directGuest;
  
  // Fallback: Try to find guest by partial ID match
  const fallbackGuest = event?.guests.find(g => guestId && (g.id.includes(guestId) || guestId.includes(g.id)));
  
  // Use fallback guest if main guest not found
  const finalGuest = guest || fallbackGuest || directGuest;
  
  // Debug logging
  console.log('🔍 GuestResponse Debug:', {
    currentUrl: window.location.href,
    eventId,
    guestId,
    eventsCount: events.length,
    events: events.map(e => ({ id: e.id, coupleName: e.coupleName, guestsCount: e.guests?.length || 0 })),
    foundEvent: event ? { id: event.id, coupleName: event.coupleName, guestsCount: event.guests?.length || 0 } : null,
    foundGuest: guest ? { id: guest.id, name: `${guest.firstName} ${guest.lastName}` } : null,
    finalGuest: finalGuest ? { id: finalGuest.id, name: `${finalGuest.firstName} ${finalGuest.lastName}` } : null
  });
  
  // Debug: Show all guests in the event
  if (event) {
    console.log('🔍 All guests in event:', event.guests.map(g => ({ id: g.id, name: `${g.firstName} ${g.lastName}` })));
    console.log('🔍 Fallback guest found:', fallbackGuest ? { id: fallbackGuest.id, name: `${fallbackGuest.firstName} ${fallbackGuest.lastName}` } : null);
  }
  
  // Additional debug for URL parsing
  console.log('🔍 URL Debug:', {
    pathname: window.location.pathname,
    search: window.location.search,
    hash: window.location.hash,
    fullUrl: window.location.href
  });
  
  useEffect(() => {
    console.log('🔍 useEffect triggered:', { event, finalGuest, eventId, guestId });
    
    // Try to load event from API first (for cross-device access)
    const loadEventFromAPI = async () => {
      if (!eventId) {
        setIsLoadingEvent(false);
        return;
      }
      
      try {
        const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'https://whatsapp-backend-enfz.onrender.com';
        console.log('🌐 Attempting to load event from API:', `${BACKEND_URL}/api/events/all`);
        
        // Try to fetch all events and find the one we need (public access)
        const response = await fetch(`${BACKEND_URL}/api/events/all`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
          // Add timeout
          signal: AbortSignal.timeout(8000) // 8 second timeout
        });
        
        if (response.ok) {
          const data = await response.json();
          console.log('📋 API response:', { success: data.success, total: data.total });
          const allEvents = data.events || [];
          console.log(`📋 Found ${allEvents.length} events in API`);
          
          const foundEvent = allEvents.find((e: any) => e.id === eventId);
          if (foundEvent) {
            console.log('✅ Found event from API:', foundEvent.id);
            setDirectEvent(foundEvent);
            setIsLoadingEvent(false);
            
            // Find guest in the found event
            if (guestId) {
              const foundGuest = foundEvent.guests?.find((g: any) => g.id === guestId);
              if (foundGuest) {
                console.log('✅ Found guest from API:', foundGuest.id);
                setDirectGuest(foundGuest);
              } else {
                // Try fallback - partial match
                const fallbackGuest = foundEvent.guests?.find((g: any) => 
                  guestId && (g.id.includes(guestId) || guestId.includes(g.id))
                );
                if (fallbackGuest) {
                  console.log('✅ Found guest with fallback match from API:', fallbackGuest.id);
                  setDirectGuest(fallbackGuest);
                } else {
                  console.warn('⚠️ Guest not found in event from API:', guestId);
                }
              }
            }
            return; // Found in API, don't check localStorage
          } else {
            console.warn('⚠️ Event not found in API. Looking for:', eventId);
            console.log('📋 Available event IDs:', allEvents.map((e: any) => e.id));
          }
        } else {
          console.warn('⚠️ API response not OK:', response.status, response.statusText);
        }
      } catch (error: any) {
        if (error.name === 'TimeoutError' || error.name === 'AbortError') {
          console.warn('⚠️ API request timed out, trying localStorage...');
        } else {
          console.warn('⚠️ Could not load event from API, trying localStorage:', error);
        }
      }
      
      // Fallback: Try to load event directly from localStorage (public access, no userId filter)
      const stored = localStorage.getItem('rsvp-events-storage');
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          if (parsed.state && parsed.state.events) {
            console.log(`📋 Found ${parsed.state.events.length} events in localStorage`);
            // Find event by ID without filtering by userId (public access)
            const foundEvent = parsed.state.events.find((e: any) => e.id === eventId);
            if (foundEvent) {
              console.log('✅ Found event directly from localStorage:', foundEvent.id);
              setDirectEvent(foundEvent);
              setIsLoadingEvent(false);
              
              // Find guest in the found event
              if (guestId) {
                const foundGuest = foundEvent.guests?.find((g: any) => g.id === guestId);
                if (foundGuest) {
                  console.log('✅ Found guest directly from localStorage:', foundGuest.id);
                  setDirectGuest(foundGuest);
                } else {
                  // Try fallback - partial match
                  const fallbackGuest = foundEvent.guests?.find((g: any) => 
                    guestId && (g.id.includes(guestId) || guestId.includes(g.id))
                  );
                  if (fallbackGuest) {
                    console.log('✅ Found guest with fallback match:', fallbackGuest.id);
                    setDirectGuest(fallbackGuest);
                  } else {
                    console.warn('⚠️ Guest not found in event from localStorage:', guestId);
                  }
                }
              }
            } else {
              console.warn('⚠️ Event not found in localStorage. Looking for:', eventId);
              console.log('📋 Available event IDs:', parsed.state.events.map((e: any) => e.id));
              setIsLoadingEvent(false);
            }
          } else {
            setIsLoadingEvent(false);
          }
        } catch (error) {
          console.error('❌ Error parsing localStorage:', error);
          setIsLoadingEvent(false);
        }
      } else {
        console.warn('⚠️ No events found in localStorage');
        setIsLoadingEvent(false);
      }
    };
    
    if (eventId) {
      loadEventFromAPI();
    }
    
    // Force load events from localStorage if not loaded
    if (events.length === 0) {
      console.log('🔄 No events loaded, trying to load from localStorage...');
      fetchEvents();
    }
    
    // If we have events but the specific event is not found, try to find it
    if (events.length > 0 && !event && eventId) {
      console.log('🔍 Event not found in current events, checking localStorage directly...');
      const stored = localStorage.getItem('rsvp-events-storage');
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          if (parsed.state && parsed.state.events) {
            const targetEvent = parsed.state.events.find((e: any) => e.id === eventId);
            if (targetEvent) {
              console.log('✅ Found target event in localStorage:', targetEvent);
              console.log('🔄 Refreshing page to load correct event...');
              // Refresh events without full page reload
            fetchEvents();
              return;
            } else {
              console.log('❌ Target event not found in localStorage');
              console.log('Available events:', parsed.state.events.map((e: any) => e.id));
            }
          }
        } catch (error) {
          console.error('❌ Error parsing localStorage:', error);
        }
      }
    }
    
    // If no events at all, try to load from localStorage
    if (events.length === 0) {
      console.log('🔄 No events loaded, trying direct localStorage access...');
      const stored = localStorage.getItem('rsvp-events-storage');
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          if (parsed.state && parsed.state.events) {
            console.log('📋 Found events in localStorage, refreshing...');
            // Refresh events without full page reload
            fetchEvents();
            return;
          }
        } catch (error) {
          console.error('❌ Error parsing localStorage:', error);
        }
      }
    }
    
    // Wait a bit for directEvent to load before showing error
    if (!event && eventId) {
      // Give it a moment to load from localStorage
      const timeout = setTimeout(() => {
        if (!directEvent) {
          console.log('❌ Event not found for ID:', eventId);
          setSubmitStatus('not_found');
        }
      }, 500);
      return () => clearTimeout(timeout);
    }
    
    const currentEvent = event || directEvent;
    if (currentEvent && guestId && !finalGuest) {
      console.log('❌ Guest not found for ID:', guestId, 'in event:', currentEvent.id);
      setSubmitStatus('not_found');
    } else if (finalGuest || !guestId) {
      // Pre-fill form with guest data
      setFormData(prev => ({
        ...prev,
        phoneNumber: finalGuest.phoneNumber,
        fullName: `${finalGuest.firstName} ${finalGuest.lastName}`,
        guestCount: finalGuest.guestCount || 1,
        notes: finalGuest.notes || '',
        response: finalGuest.rsvpStatus === 'confirmed' ? 'attending' : 
                 finalGuest.rsvpStatus === 'declined' ? 'not_attending' : 
                 finalGuest.rsvpStatus === 'maybe' ? 'maybe' : 'attending',
        actualAttendance: finalGuest.actualAttendance || 'not_marked'
      }));
    }
  }, [event, directEvent, finalGuest, guestId]);
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'guestCount' ? parseInt(value) || 1 : value
    }));
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const currentEvent = event || directEvent;
    const currentGuest = guest || directGuest || finalGuest;
    
    if (!currentEvent) {
      console.error('❌ No event found');
      setSubmitStatus('error');
      setErrorMessage('אירוע לא נמצא');
      return;
    }
    
    setIsSubmitting(true);
    setSubmitStatus('idle');
    setErrorMessage('');
    
    try {
      // Determine the guest to update
      const guestToUpdate = currentGuest || (guestId ? currentEvent.guests?.find((g: any) => g.id === guestId) : null);
      
      // Determine the response status
      const responseStatus = formData.response === 'attending' ? 'confirmed' : 
                            formData.response === 'maybe' ? 'maybe' : 'declined';
      
      console.log('📝 Submitting response:', {
        eventId: currentEvent.id,
        guestId: guestToUpdate?.id || guestId,
        response: formData.response,
        responseStatus: responseStatus,
        guestCount: formData.guestCount
      });
      
      if (guestToUpdate) {
        // Update existing guest
        const updatedGuest = {
          ...guestToUpdate,
          guestCount: formData.guestCount,
          notes: formData.notes,
          rsvpStatus: responseStatus as 'confirmed' | 'declined' | 'maybe',
          responseDate: new Date(),
          actualAttendance: (formData.response === 'attending' ? 'not_marked' : 'not_marked') as 'attended' | 'not_attended' | 'not_marked'
        };
        
        console.log('✅ Updating guest:', updatedGuest);
        await updateGuestResponse(currentEvent.id, guestToUpdate.id, updatedGuest);
      } else if (guestId) {
        // Try to find guest by ID in event
        const foundGuest = currentEvent.guests?.find((g: any) => g.id === guestId);
        if (foundGuest) {
          const updatedGuest = {
            ...foundGuest,
            guestCount: formData.guestCount,
            notes: formData.notes,
            rsvpStatus: responseStatus as 'confirmed' | 'declined' | 'maybe',
            responseDate: new Date(),
            actualAttendance: (formData.response === 'attending' ? 'not_marked' : 'not_marked') as 'attended' | 'not_attended' | 'not_marked'
          };
          
          console.log('✅ Updating found guest:', updatedGuest);
          await updateGuestResponse(currentEvent.id, guestId, updatedGuest);
        } else {
          // Create new guest (fallback for direct access)
          const newGuest = {
            id: guestId || 'guest-' + Date.now(),
            firstName: formData.fullName.split(' ')[0] || 'אורח',
            lastName: formData.fullName.split(' ').slice(1).join(' ') || 'דמו',
            phoneNumber: formData.phoneNumber || '000-0000000',
            guestCount: formData.guestCount,
            notes: formData.notes,
            rsvpStatus: responseStatus as 'confirmed' | 'declined' | 'maybe',
            responseDate: new Date(),
            channel: 'manual' as const,
            actualAttendance: (formData.response === 'attending' ? 'not_marked' : 'not_marked') as 'attended' | 'not_attended' | 'not_marked'
          };
          
          console.log('✅ Creating new guest:', newGuest);
          await updateGuestResponse(currentEvent.id, newGuest.id, newGuest);
        }
      } else {
        console.error('❌ No guest ID provided');
        setSubmitStatus('error');
        setErrorMessage('אורח לא נמצא');
        return;
      }
      
      console.log('✅ Response submitted successfully');
      setSubmitStatus('success');
      
    } catch (error) {
      console.error('❌ Error submitting response:', error);
      setSubmitStatus('error');
      setErrorMessage('אירעה שגיאה בעדכון התגובה. אנא נסה שוב.');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // State to track loading
  const [isLoadingEvent, setIsLoadingEvent] = useState(true);
  
  // Update loading state when event is found
  useEffect(() => {
    if (event || directEvent) {
      setIsLoadingEvent(false);
    }
  }, [event, directEvent]);
  
  // Show loading while trying to find event (with timeout)
  useEffect(() => {
    if (eventId && !event && !directEvent) {
      // Set timeout to stop loading after 10 seconds
      const timeout = setTimeout(() => {
        setIsLoadingEvent(false);
      }, 10000);
      
      return () => clearTimeout(timeout);
    }
  }, [eventId, event, directEvent]);
  
  if ((!event && !directEvent && eventId) || isLoadingEvent) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600">טוען את האירוע...</p>
          <p className="text-gray-400 text-sm mt-2">אם זה לוקח זמן, אנא נסה לרענן את הדף</p>
        </div>
      </div>
    );
  }
  
  // Use directEvent if event is not found in store
  const currentEvent = event || directEvent;
  const currentGuest = guest || directGuest || finalGuest;
  
  if (!currentEvent || (guestId && !currentGuest)) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full text-center">
          <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-800 mb-2">
            {!currentEvent ? 'אירוע לא נמצא' : 'אורח לא נמצא'}
          </h1>
          <p className="text-gray-600 mb-6">
            {!currentEvent ? 'הקוד שסופק לא תואם לאף אירוע במערכת' : 'האורח לא נמצא ברשימה או שהקישור שגוי.'}
          </p>
          <button
            onClick={() => navigate('/')}
            className="btn-primary w-full"
          >
            חזרה לעמוד הראשי
          </button>
        </div>
      </div>
    );
  }
  
  if (submitStatus === 'success') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full text-center">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-800 mb-2">תגובתך התקבלה!</h1>
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
            <p className="text-green-800 font-medium">
              {formData.response === 'attending' 
                ? `אתם ${formData.guestCount} ${formData.guestCount === 1 ? 'אורח' : 'אורחים'} תגיעו לאירוע!` 
                : formData.response === 'maybe'
                ? 'תודה על התגובה! נשמח לעדכון נוסף'
                : 'אנו מצטערים שלא תוכלו להגיע'
              }
            </p>
            <p className="text-green-700 text-xs mt-2">
              סטטוס: {formData.response === 'attending' ? 'מגיע' : formData.response === 'maybe' ? 'מתלבט' : 'לא מגיע'} | מספר אורחים: {formData.guestCount}
            </p>
            {formData.notes && (
              <p className="text-green-700 text-sm mt-2">
                הערות: {formData.notes}
              </p>
            )}
          </div>
          <p className="text-gray-600 mb-6">
            תודה רבה על התגובה. אנו מצפים לראות אתכם באירוע!
          </p>
          <button
            onClick={() => setSubmitStatus('idle')}
            className="btn-primary w-full"
          >
            שליחת תגובה נוספת
          </button>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-white to-pink-50">
      {/* Header with Event Details */}
      <div className="bg-gradient-to-r from-amber-500 to-amber-600 text-white shadow-lg">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="flex items-center justify-center space-x-2 mb-4">
            <Heart className="w-6 h-6 fill-current" />
            <h1 className="text-2xl font-bold">{currentEvent.coupleName}</h1>
          </div>
          
          {/* Event Image */}
          {currentEvent.invitationImageUrl && (
            <div className="mb-4 flex justify-center">
              <img 
                src={currentEvent.invitationImageUrl} 
                alt="תמונת האירוע"
                className="max-w-full h-48 object-cover rounded-xl shadow-lg border-4 border-white"
              />
            </div>
          )}
          
          {/* Event Details */}
          <div className="bg-white/20 backdrop-blur-sm rounded-xl p-4 space-y-2">
            <div className="flex items-center justify-center space-x-2 text-white/90">
              <Calendar className="w-5 h-5" />
              <span className="font-medium">{formatDate(currentEvent.eventDate)}</span>
            </div>
            {currentEvent.eventTime && (
              <div className="flex items-center justify-center space-x-2 text-white/90">
                <Clock className="w-5 h-5" />
                <span className="font-medium">{currentEvent.eventTime}</span>
              </div>
            )}
            {currentEvent.venue && (
              <div className="flex items-center justify-center space-x-2 text-white/90">
                <MapPin className="w-5 h-5" />
                <span className="font-medium">{currentEvent.venue}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Main Content */}
        <div className="bg-white rounded-2xl shadow-xl p-8 mb-6">
          <div className="text-center mb-8">
            <div className="flex items-center justify-center space-x-2 mb-4">
              <Heart className="w-8 h-8 text-amber-500 fill-current" />
              <h2 className="text-3xl font-bold text-gray-800">
                שיניתם תכניות?
              </h2>
            </div>
            <p className="text-lg text-gray-600">
              נשמח שתעדכנו אותנו
            </p>
          </div>
          {/* Simple Response Buttons */}
          {!showGuestCount ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <button
                onClick={() => {
                  setFormData(prev => ({ ...prev, response: 'attending' }));
                  setShowGuestCount(true);
                }}
                className="bg-gradient-to-br from-green-500 to-green-600 text-white rounded-xl px-8 py-6 font-bold text-lg shadow-lg hover:from-green-600 hover:to-green-700 transition-all transform hover:scale-105 flex items-center justify-center space-x-2"
              >
                <CheckCircle className="w-6 h-6" />
                <span>מגיע</span>
              </button>
              
              <button
                onClick={() => {
                  setFormData(prev => ({ ...prev, response: 'maybe' }));
                  setShowGuestCount(true);
                }}
                className="bg-gradient-to-br from-yellow-500 to-yellow-600 text-white rounded-xl px-8 py-6 font-bold text-lg shadow-lg hover:from-yellow-600 hover:to-yellow-700 transition-all transform hover:scale-105 flex items-center justify-center space-x-2"
              >
                <MessageSquare className="w-6 h-6" />
                <span>מתלבט</span>
              </button>
              
              <button
                onClick={() => {
                  setFormData(prev => ({ ...prev, response: 'not_attending' }));
                  setShowGuestCount(true);
                }}
                className="bg-gradient-to-br from-red-500 to-red-600 text-white rounded-xl px-8 py-6 font-bold text-lg shadow-lg hover:from-red-600 hover:to-red-700 transition-all transform hover:scale-105 flex items-center justify-center space-x-2"
              >
                <XCircle className="w-6 h-6" />
                <span>לא מגיע</span>
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="text-center">
                <h2 className="text-2xl font-bold text-gray-800 mb-2">
                  {formData.response === 'attending' 
                    ? 'כמה אורחים מתכוונים להגיע?'
                    : formData.response === 'maybe'
                    ? 'כמה אורחים עשויים להגיע?'
                    : 'כמה אורחים לא יגיעו?'}
                </h2>
                <p className="text-gray-600">
                  {formData.response === 'attending' 
                    ? 'בחרו את מספר האורחים'
                    : 'אנא עדכנו אותנו'}
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
                  value={formData.guestCount > 10 ? formData.guestCount : ''}
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
                  onClick={() => setShowGuestCount(false)}
                  className="text-amber-600 hover:text-amber-700 font-medium text-sm underline"
                >
                  ← חזרה לבחירת סטטוס
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default GuestResponse;
