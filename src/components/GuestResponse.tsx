import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useEventStore } from '../store/eventStore';
import type { useEventStore as UseEventStoreType } from '../store/eventStore';
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
        return decodeURIComponent(match[1]);
      }
    }
    return null;
  };
  
  const guestId = parseGuestId();
  
  // Load event IMMEDIATELY from localStorage first (fast, no waiting)
  React.useEffect(() => {
    if (!eventId) {
      setIsLoadingEvent(false);
      return;
    }
    
    // CRITICAL: Load from localStorage FIRST (instant, no API delay)
    const stored = localStorage.getItem('rsvp-events-storage');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (parsed.state && parsed.state.events) {
          const foundEvent = parsed.state.events.find((e: any) => e.id === eventId);
          if (foundEvent) {
            setDirectEvent(foundEvent);
            setIsLoadingEvent(false);
            
            // Find guest immediately
            if (guestId) {
              const foundGuest = foundEvent.guests?.find((g: any) => g.id === guestId);
              if (foundGuest) {
                setDirectGuest(foundGuest);
              } else {
                // Try fallback - partial match
                const fallbackGuest = foundEvent.guests?.find((g: any) => 
                  guestId && (g.id.includes(guestId) || guestId.includes(g.id))
                );
                if (fallbackGuest) {
                  setDirectGuest(fallbackGuest);
                }
              }
            }
            return; // Found in localStorage, show page immediately
          }
        }
      } catch (error) {
        console.error('❌ Error parsing localStorage:', error);
      }
    }
    
    // If not found in localStorage, try API (but don't block page rendering)
    // This runs in background
    const loadFromAPI = async () => {
      try {
        const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'https://whatsapp-backend-enfz.onrender.com';
        // Use AbortController for timeout (compatible with older browsers)
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);
        
        const response = await fetch(`${BACKEND_URL}/api/events/all`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (response.ok) {
          const data = await response.json();
          const allEvents = data.events || [];
          const foundEvent = allEvents.find((e: any) => e.id === eventId);
          if (foundEvent) {
            setDirectEvent(foundEvent);
            setIsLoadingEvent(false);
            
            if (guestId) {
              const foundGuest = foundEvent.guests?.find((g: any) => g.id === guestId);
              if (foundGuest) {
                setDirectGuest(foundGuest);
              }
            }
          }
        }
      } catch (error) {
        // Silent fail - don't block page
        setIsLoadingEvent(false);
      }
    };
    
    // Try API in background (non-blocking)
    loadFromAPI();
    
    // Also try fetchEvents (non-blocking)
    fetchEvents().catch(() => {}); // Don't wait for it
  }, [eventId, guestId, fetchEvents]);
  
  // Removed debug logging for performance
  
  const [formData, setFormData] = useState({
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
  
  // Removed debug logging for performance
  
  // Pre-fill form when guest is found (only once, don't overwrite user input)
  useEffect(() => {
    const currentEvent = event || directEvent;
    const currentGuest = guest || directGuest || finalGuest;
    
    if (currentGuest && !formData.fullName && currentGuest.firstName) {
      setFormData(prev => ({
        ...prev,
        phoneNumber: currentGuest.phoneNumber || prev.phoneNumber,
        fullName: `${currentGuest.firstName} ${currentGuest.lastName || ''}`.trim() || prev.fullName,
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
    
    const currentEvent = event || directEvent;
    const currentGuest = guest || directGuest || finalGuest;
    
    console.log('📋 Current event:', currentEvent?.id, 'Current guest:', currentGuest?.id);
    
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
      
      console.log('👤 Guest to update:', guestToUpdate?.id, guestToUpdate?.firstName);
      
      // Determine the response status
      const responseStatus = formData.response === 'attending' ? 'confirmed' : 
                            formData.response === 'maybe' ? 'maybe' : 'declined';
      
      console.log('📝 Response status:', responseStatus);
      
      if (guestToUpdate) {
        // Update existing guest - CRITICAL: explicitly set rsvpStatus to override any existing value
        const updatedGuest = {
          ...guestToUpdate,
          guestCount: formData.guestCount,
          notes: formData.notes,
          rsvpStatus: responseStatus as 'confirmed' | 'declined' | 'maybe', // EXPLICITLY set status
          responseDate: new Date(),
          actualAttendance: (formData.response === 'attending' ? 'not_marked' : 'not_marked') as 'attended' | 'not_attended' | 'not_marked'
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
        
        // CRITICAL: Force refresh events from store MULTIPLE TIMES to ensure UI updates
        // This is the same approach used in webhook service for WhatsApp updates
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
            if (refreshedGuest.rsvpStatus !== updatedGuest.rsvpStatus) {
              console.error(`❌ STATUS MISMATCH! Expected: ${updatedGuest.rsvpStatus}, Got: ${refreshedGuest.rsvpStatus}`);
            }
          }
        }
        
        // CRITICAL: Force MULTIPLE refreshes to ensure all components see the update
        // This ensures the table in EventManagement updates immediately
        for (let i = 0; i < 3; i++) {
          setTimeout(() => {
            storeState.fetchEvents(false, true).catch(err => {
              console.warn(`⚠️ Failed to refresh events after guest response update (attempt ${i + 1}):`, err);
            });
          }, 50 * (i + 1)); // 50ms, 100ms, 150ms
        }
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
          
          await updateGuestResponse(currentEvent.id, guestId, updatedGuest);
          
          // CRITICAL: Force refresh events from store to ensure UI updates immediately
          // This is the same approach used in webhook service for WhatsApp updates
          const storeModule = await import('../store/eventStore');
          const storeState = storeModule.useEventStore.getState();
          const refreshedEvent = storeState.events.find(e => e.id === currentEvent.id);
          const refreshedGuest = refreshedEvent?.guests?.find(g => g.id === guestId);
          console.log(`🔄 Refreshed guest status after update: ${refreshedGuest?.rsvpStatus}`);
          
          // Force a re-fetch of events to ensure all components see the update
          // This ensures the table in EventManagement updates immediately
          setTimeout(() => {
            storeState.fetchEvents(false, true).catch(err => {
              console.warn('⚠️ Failed to refresh events after guest response update:', err);
            });
          }, 100);
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
  
  // Stop loading after short timeout if event not found
  useEffect(() => {
    if (eventId && !event && !directEvent) {
      // Much shorter timeout - show page quickly
      const timeout = setTimeout(() => {
        setIsLoadingEvent(false);
      }, 1000); // Only 1 second - don't make user wait
      
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
          <h2 className="text-3xl font-bold text-gray-800 mb-4">
            הבחירה התקבלה!
          </h2>
          <div className="bg-green-50 border-2 border-green-300 rounded-lg p-6 mb-6">
            <p className="text-green-800 font-bold text-lg mb-3">
              {formData.response === 'attending' 
                ? `אתם ${formData.guestCount} ${formData.guestCount === 1 ? 'אורח' : 'אורחים'} תגיעו לאירוע!` 
                : formData.response === 'maybe'
                ? 'תודה על העדכון!'
                : 'אנו מצטערים שלא תוכלו להגיע'
              }
            </p>
            {(formData.response === 'maybe' || formData.response === 'not_attending') && (
              <p className="text-green-700 text-base font-semibold mb-2 bg-green-100 rounded-lg p-3">
                נשמח לעדכון אם יש שינוי בתכניות
              </p>
            )}
            <p className="text-green-700 text-xs mt-2">
              סטטוס: {formData.response === 'attending' ? 'מגיע' : formData.response === 'maybe' ? 'מתלבט' : 'לא מגיע'} | מספר אורחים: {formData.guestCount}
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
          {/* Main Status Button */}
          {!showStatusButtons && !showGuestCount && !showConfirmButton ? (
            <div className="text-center space-y-4">
              <button
                onClick={() => setShowStatusButtons(true)}
                className="bg-gradient-to-r from-amber-500 to-amber-600 text-white rounded-xl px-12 py-6 font-bold text-xl shadow-2xl hover:from-amber-600 hover:to-amber-700 transition-all transform hover:scale-105 flex items-center justify-center space-x-3 mx-auto"
              >
                <Users className="w-7 h-7" />
                <span>עדכן סטטוס הגעה</span>
                <svg className="w-6 h-6 transform transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              <div>
                <button
                  onClick={() => window.history.back()}
                  className="text-amber-600 hover:text-amber-700 font-medium text-sm underline"
                >
                  ← חזרה
                </button>
              </div>
            </div>
          ) : !showGuestCount && !showConfirmButton ? (
            <div className="space-y-4">
              <div className="text-center mb-4">
                <button
                  onClick={() => setShowStatusButtons(false)}
                  className="text-amber-600 hover:text-amber-700 font-medium text-sm underline"
                >
                  ← חזרה
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <button
                  onClick={() => {
                    console.log('🟢 "מגיע" button clicked - showing guest count selection');
                    setFormData(prev => ({ ...prev, response: 'attending' }));
                    setShowGuestCount(true);
                  }}
                  className="bg-gradient-to-br from-green-500 to-green-600 text-white rounded-xl px-8 py-6 font-bold text-lg shadow-lg hover:from-green-600 hover:to-green-700 transition-all transform hover:scale-105 flex items-center justify-center space-x-2"
                >
                  <CheckCircle className="w-6 h-6" />
                  <span>מגיע</span>
                </button>
                
                <button
                  onClick={async () => {
                    console.log('🟡 "מתלבט" button clicked - submitting immediately');
                    const currentEvent = event || directEvent;
                    const currentGuest = guest || directGuest || finalGuest;
                    if (currentEvent && currentGuest) {
                      setIsSubmitting(true);
                      try {
                        const updatedGuest = {
                          ...currentGuest,
                          guestCount: 1,
                          notes: '',
                          rsvpStatus: 'maybe' as const,
                          responseDate: new Date(),
                          actualAttendance: 'not_marked' as const
                        };
                        console.log('🔄 Calling updateGuestResponse directly from "מתלבט" button');
                        console.log('📋 Event ID:', currentEvent.id, 'Guest ID:', currentGuest.id);
                        await updateGuestResponse(currentEvent.id, currentGuest.id, updatedGuest);
                        
                        // CRITICAL: Force refresh events from store to ensure UI updates immediately
                        const storeModule = await import('../store/eventStore');
                        const storeState = storeModule.useEventStore.getState();
                        const refreshedEvent = storeState.events.find(e => e.id === currentEvent.id);
                        const refreshedGuest = refreshedEvent?.guests?.find(g => g.id === currentGuest.id);
                        console.log(`🔄 Refreshed guest status after "מתלבט" update: ${refreshedGuest?.rsvpStatus}`);
                        
                        // Force a re-fetch of events to ensure all components see the update
                        setTimeout(() => {
                          storeState.fetchEvents(false, true).catch(err => {
                            console.warn('⚠️ Failed to refresh events after "מתלבט" update:', err);
                          });
                        }, 100);
                        
                        await fetchEvents();
                        setSubmitStatus('success');
                      } catch (error) {
                        console.error('❌ Error submitting:', error);
                        setSubmitStatus('error');
                        setErrorMessage('אירעה שגיאה בעדכון התגובה');
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
                  className="bg-gradient-to-br from-yellow-500 to-yellow-600 text-white rounded-xl px-8 py-6 font-bold text-lg shadow-lg hover:from-yellow-600 hover:to-yellow-700 transition-all transform hover:scale-105 flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <MessageSquare className="w-6 h-6" />
                  <span>{isSubmitting ? 'שולח...' : 'מתלבט'}</span>
                </button>
                
                <button
                  onClick={async () => {
                    console.log('🔴 "לא מגיע" button clicked - submitting immediately');
                    const currentEvent = event || directEvent;
                    const currentGuest = guest || directGuest || finalGuest;
                    if (currentEvent && currentGuest) {
                      setIsSubmitting(true);
                      try {
                        const updatedGuest = {
                          ...currentGuest,
                          guestCount: 1,
                          notes: '',
                          rsvpStatus: 'declined' as const,
                          responseDate: new Date(),
                          actualAttendance: 'not_marked' as const
                        };
                        console.log('🔄 Calling updateGuestResponse directly from "לא מגיע" button');
                        console.log('📋 Event ID:', currentEvent.id, 'Guest ID:', currentGuest.id);
                        await updateGuestResponse(currentEvent.id, currentGuest.id, updatedGuest);
                        
                        // CRITICAL: Force refresh events from store to ensure UI updates immediately
                        const storeModule = await import('../store/eventStore');
                        const storeState = storeModule.useEventStore.getState();
                        const refreshedEvent = storeState.events.find(e => e.id === currentEvent.id);
                        const refreshedGuest = refreshedEvent?.guests?.find(g => g.id === currentGuest.id);
                        console.log(`🔄 Refreshed guest status after "לא מגיע" update: ${refreshedGuest?.rsvpStatus}`);
                        
                        // Force a re-fetch of events to ensure all components see the update
                        setTimeout(() => {
                          storeState.fetchEvents(false, true).catch(err => {
                            console.warn('⚠️ Failed to refresh events after "לא מגיע" update:', err);
                          });
                        }, 100);
                        
                        await fetchEvents();
                        setSubmitStatus('success');
                      } catch (error) {
                        console.error('❌ Error submitting:', error);
                        setSubmitStatus('error');
                        setErrorMessage('אירעה שגיאה בעדכון התגובה');
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
                  className="bg-gradient-to-br from-red-500 to-red-600 text-white rounded-xl px-8 py-6 font-bold text-lg shadow-lg hover:from-red-600 hover:to-red-700 transition-all transform hover:scale-105 flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <XCircle className="w-6 h-6" />
                  <span>{isSubmitting ? 'שולח...' : 'לא מגיע'}</span>
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
      </div>
    </div>
  );
};

export default GuestResponse;
