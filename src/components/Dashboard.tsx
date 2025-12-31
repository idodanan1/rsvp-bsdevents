import React, { useState, useEffect, startTransition } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useEventStore } from '../store/eventStore';
import { useUserStore } from '../store/userStore';
import { calculateGlobalStats, formatDate, getStatusIcon, getStatusColor } from '../utils/helpers';
import { Plus, Users, Calendar, CheckCircle, XCircle, HelpCircle, Clock, Trash2, RotateCcw, Edit, Eye, Settings, RefreshCw, Monitor } from 'lucide-react';
import DeletedEventsModal from './DeletedEventsModal';

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { 
    events, 
    deletedEvents,
    isLoading, 
    deleteEvent,
    restoreDeletedEvent,
    permanentlyDeleteEvent,
    fetchEvents,
    updateExistingEventsCampaigns,
    syncAllEventsToAPI,
    cleanupOtherUsersEvents
  } = useEventStore();
  const { user } = useUserStore();
  const globalStats = calculateGlobalStats(events);
  const [showDeletedEventsModal, setShowDeletedEventsModal] = useState(false);
  const [showEditEventModal, setShowEditEventModal] = useState(false);
  const [selectedEventForEdit, setSelectedEventForEdit] = useState<any>(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [connectedDevicesCount, setConnectedDevicesCount] = useState<number>(0);
  const [sessionId, setSessionId] = useState<string>('');

  // Update time every second
  useEffect(() => {
    const timeInterval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timeInterval);
  }, []);

  // Get or create session ID - use localStorage so it persists across browser sessions
  useEffect(() => {
    // First check localStorage (persists across browser restarts)
    let currentSessionId = localStorage.getItem('rsvp-session-id');
    
    // If not in localStorage, check sessionStorage (for current session)
    if (!currentSessionId) {
      currentSessionId = sessionStorage.getItem('rsvp-session-id');
    }
    
    // If still no session ID, create a new one
    if (!currentSessionId) {
      currentSessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    
    // Save to both localStorage and sessionStorage
    localStorage.setItem('rsvp-session-id', currentSessionId);
      localStorage.setItem('rsvp-last-session-id', currentSessionId);
    sessionStorage.setItem('rsvp-session-id', currentSessionId);
    
    setSessionId(currentSessionId);
  }, []);

  // Fetch connected devices count
  useEffect(() => {
    const fetchConnectedDevices = async () => {
      if (!user?.id) return;
      
      try {
        const BACKEND_URL = (process.env as any).NEXT_PUBLIC_BACKEND_URL || (process.env as any).VITE_BACKEND_URL || 'https://whatsapp-backend-enfz.onrender.com';
        const response = await fetch(`${BACKEND_URL}/api/users/${user.id}/sessions/count`);
        if (response.ok) {
          const data = await response.json();
          setConnectedDevicesCount(data.count || 0);
        }
      } catch (error: any) {
        console.error('❌ Error fetching connected devices:', error);
      }
    };

    fetchConnectedDevices();
    
    // Update session activity every 5 minutes
    const activityInterval = setInterval(async () => {
      if (user?.id && sessionId) {
        try {
          const BACKEND_URL = (process.env as any).NEXT_PUBLIC_BACKEND_URL || (process.env as any).VITE_BACKEND_URL || 'https://whatsapp-backend-enfz.onrender.com';
          await fetch(`${BACKEND_URL}/api/users/${user.id}/sessions/activity`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sessionId })
          });
        } catch (error: any) {
          console.error('❌ Error updating session activity:', error);
        }
      }
    }, 5 * 60 * 1000); // 5 minutes

    // Refresh devices count every 30 seconds
    const devicesInterval = setInterval(fetchConnectedDevices, 30000);

    return () => {
      clearInterval(activityInterval);
      clearInterval(devicesInterval);
    };
  }, [user?.id, sessionId]);

  // Fetch immediately on mount to get latest data from API
  useEffect(() => {
    // CRITICAL: Get fetchEvents from store to ensure it's accessible in useEffect
    const storeState = useEventStore.getState();
    const fetchEventsFn = storeState.fetchEvents;
    if (fetchEventsFn && typeof fetchEventsFn === 'function') {
      fetchEventsFn(true).catch((error: any) => {
        console.error('❌ Error initial fetch:', error);
      });
    } else {
      console.error('❌ fetchEvents is not available in store state');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Removed fetchEvents from deps to prevent infinite loop

  // Manual refresh handler - uses forceRefresh to clear localStorage and fetch fresh data
  const handleRefresh = async () => {
    try {
      setCurrentTime(new Date());
      // CRITICAL: Use forceRefresh to clear localStorage and fetch fresh data from server
      const storeState = useEventStore.getState();
      const forceRefreshFn = storeState.forceRefresh;
      if (forceRefreshFn && typeof forceRefreshFn === 'function') {
        await forceRefreshFn();
        console.log('✅ Force refresh completed - localStorage cleared and fresh data loaded from server');
      } else {
        // Fallback to regular fetchEvents if forceRefresh is not available
        console.warn('⚠️ forceRefresh not available, using regular fetchEvents');
        const fetchEventsFn = storeState.fetchEvents;
        if (fetchEventsFn && typeof fetchEventsFn === 'function') {
          await fetchEventsFn(true);
        } else {
          console.error('❌ fetchEvents is not available in store state');
        }
      }
    } catch (error: any) {
      console.error('❌ Error refreshing events:', error);
    }
  };


  const handleDeleteEvent = async (eventId: string, eventName: string) => {
    const confirmed = window.confirm(
      `האם אתה בטוח שברצונך למחוק את האירוע "${eventName}"?\n\nפעולה זו תמחק את כל הנתונים הקשורים לאירוע כולל:\n• רשימת המוזמנים\n• קמפיינים\n• שולחנות\n• כל הנתונים האחרים\n\nפעולה זו לא ניתנת לביטול!`
    );
    
    if (confirmed) {
      try {
        await deleteEvent(eventId);
        alert('✅ האירוע נמחק בהצלחה!');
      } catch (error: any) {
        console.error('❌ Error deleting event:', error);
        alert('❌ שגיאה במחיקת האירוע. נסה שוב.');
      }
    }
  };

  // פתיחת חלון עריכת אירוע
  const handleEditEvent = (event: any) => {
    setSelectedEventForEdit(event);
    setShowEditEventModal(true);
  };

  // סגירת חלון עריכת אירוע
  const closeEditEventModal = () => {
    setShowEditEventModal(false);
    setSelectedEventForEdit(null);
  };

  // שמירת עריכת אירוע
  const handleSaveEventEdit = async () => {
    if (!selectedEventForEdit) return;
    
    try {
      const { updateEvent } = useEventStore.getState();
      await updateEvent(selectedEventForEdit.id, {
        coupleName: selectedEventForEdit.coupleName,
        groomName: selectedEventForEdit.groomName,
        brideName: selectedEventForEdit.brideName,
        groomParentsName: selectedEventForEdit.groomParentsName || undefined,
        brideParentsName: selectedEventForEdit.brideParentsName || undefined,
        eventDate: selectedEventForEdit.eventDate,
        eventTime: selectedEventForEdit.eventTime,
        venue: selectedEventForEdit.venue,
        couplePhone: selectedEventForEdit.couplePhone,
        coupleEmail: selectedEventForEdit.coupleEmail,
        eventType: selectedEventForEdit.eventType,
        eventTypeHebrew: selectedEventForEdit.eventTypeHebrew,
        invitationImageUrl: selectedEventForEdit.invitationImageUrl
      });
      
      // Verify the image was saved
      const updatedEvent = useEventStore.getState().events.find((e: any) => e.id === selectedEventForEdit.id);
      
      alert(`✅ האירוע עודכן בהצלחה!${updatedEvent?.invitationImageUrl ? `\n\nתמונת הזמנה: ${updatedEvent.invitationImageUrl}` : '\n\n⚠️ שים לב: תמונת הזמנה לא נשמרה. נא לנסות להעלות שוב.'}`);
      closeEditEventModal();
    } catch (error: any) {
      console.error('❌ Error updating event:', error);
      alert('❌ שגיאה בעדכון האירוע. נסה שוב.');
    }
  };


  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-full space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-teal-50 to-yellow-50 rounded-xl p-6 border border-teal-200 shadow-sm w-full">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 w-full">
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">דשבורד</h1>
            <p className="text-gray-600 font-medium">בס"ד אירועים - אישורי הגעה וסידורי הושבה</p>
            <p className="text-sm text-gray-500 mt-1">מעודכן: {currentTime.toLocaleString('he-IL')}</p>
          </div>
          <div className="flex flex-wrap gap-2 flex-shrink-0">
          <Link
            to="/create-event"
            className="btn-primary flex items-center gap-2 px-6 py-3 shadow-md hover:shadow-lg transition-all"
          >
            <Plus className="w-5 h-5" />
            <span>אירוע חדש</span>
          </Link>
          <button
            onClick={handleRefresh}
            disabled={isLoading}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2 font-semibold shadow-md hover:shadow-lg transition-all"
            title="טען נתונים מהמאגר"
          >
            {isLoading ? (
              <>
                <RefreshCw className="w-5 h-5 animate-spin" />
                <span>טוען...</span>
              </>
            ) : (
              <>
                <RefreshCw className="w-5 h-5" />
                <span>רענן</span>
              </>
            )}
          </button>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 w-full">
        <div className="stat-card bg-gradient-to-br from-blue-50 to-blue-100 border-2 border-blue-200 hover:shadow-lg transition-all duration-300 w-full">
          <div className="flex items-center justify-between w-full">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-blue-700 mb-1">מחשבים מחוברים</p>
              <p className="text-3xl font-bold text-blue-600 stat-number">{connectedDevicesCount}</p>
            </div>
            <div className="bg-blue-200 rounded-full p-3 flex-shrink-0">
              <Monitor className="w-8 h-8 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="stat-card bg-gradient-to-br from-teal-50 to-teal-100 border-2 border-teal-200 hover:shadow-lg transition-all duration-300 w-full">
          <div className="flex items-center justify-between w-full">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-teal-700 mb-1">אירועים פעילים</p>
              <p className="text-3xl font-bold text-teal-600 stat-number">{globalStats.activeEvents}</p>
            </div>
            <div className="bg-teal-200 rounded-full p-3 flex-shrink-0">
              <Calendar className="w-8 h-8 text-teal-600" />
            </div>
          </div>
        </div>

        <div className="stat-card bg-gradient-to-br from-yellow-50 to-yellow-100 border-2 border-yellow-200 hover:shadow-lg transition-all duration-300 w-full">
          <div className="flex items-center justify-between w-full">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-yellow-700 mb-1">מוזמנים סה"כ</p>
              <p className="text-3xl font-bold text-yellow-600 stat-number">{globalStats.totalGuests}</p>
            </div>
            <div className="bg-yellow-200 rounded-full p-3 flex-shrink-0">
              <Users className="w-8 h-8 text-yellow-600" />
            </div>
          </div>
        </div>

        <div className="stat-card bg-gradient-to-br from-green-50 to-green-100 border-2 border-green-200 hover:shadow-lg transition-all duration-300 w-full">
          <div className="flex items-center justify-between w-full">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-green-700 mb-1">אחוז תגובה</p>
              <p className="text-3xl font-bold text-green-600 stat-number">{globalStats.averageResponseRate}%</p>
            </div>
            <div className="bg-green-200 rounded-full p-3 flex-shrink-0">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
          </div>
        </div>

        <div className="stat-card bg-gradient-to-br from-purple-50 to-purple-100 border-2 border-purple-200 hover:shadow-lg transition-all duration-300 w-full">
          <div className="flex items-center justify-between w-full">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-purple-700 mb-1">אישרו הגעה</p>
              <p className="text-3xl font-bold text-purple-600 stat-number">{globalStats.totalConfirmed}</p>
            </div>
            <div className="bg-purple-200 rounded-full p-3 flex-shrink-0">
              <CheckCircle className="w-8 h-8 text-purple-600" />
            </div>
          </div>
        </div>
      </div>


      {/* Events Grid */}
      <div className="w-full">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 w-full">
          <h2 className="text-2xl font-bold text-gray-900">האירועים שלי</h2>
          <div className="flex flex-wrap gap-2 items-center">
            {deletedEvents.length > 0 && (
              <button
                onClick={() => setShowDeletedEventsModal(true)}
                className="bg-orange-100 text-orange-700 px-4 py-2 rounded-lg hover:bg-orange-200 flex items-center gap-2 font-medium transition-colors border border-orange-200"
              >
                <RotateCcw className="w-4 h-4" />
                <span>שחזר אירועים ({deletedEvents.length})</span>
              </button>
            )}
          </div>
        </div>
        
        {events.length === 0 ? (
          <div className="text-center py-12 w-full">
            <Calendar className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-medium text-gray-900 mb-2">אין אירועים עדיין</h3>
            <p className="text-gray-600 mb-6">התחל ביצירת האירוע הראשון שלך</p>
            <div className="flex gap-3 justify-center items-center flex-wrap">
              <button
                onClick={handleRefresh}
                disabled={isLoading}
                className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2 font-semibold shadow-lg"
                title="טען נתונים מהמאגר"
              >
                {isLoading ? (
                  <>
                    <RefreshCw className="w-5 h-5 animate-spin" />
                    <span>טוען מהמאגר...</span>
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-5 h-5" />
                    <span>טען מהמאגר</span>
                  </>
                )}
              </button>
              <Link
                to="/create-event"
                className="btn-primary inline-flex items-center space-x-2"
              >
                <Plus className="w-5 h-5" />
                <span>צור אירוע חדש</span>
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 w-full">
            {events.map((event: any) => {
              const confirmed = event.guests?.filter((g: any) => g.rsvpStatus === 'confirmed').length || 0;
              const declined = event.guests?.filter((g: any) => g.rsvpStatus === 'declined').length || 0;
              const maybe = event.guests?.filter((g: any) => g.rsvpStatus === 'maybe').length || 0;
              const pending = event.guests?.filter((g: any) => g.rsvpStatus === 'pending').length || 0;
              const total = event.guests.length;

              return (
                <div 
                  key={event.id} 
                  className="event-card bg-white border-2 border-gray-200 hover:border-teal-400 hover:shadow-xl transition-all duration-300 rounded-xl overflow-hidden w-full h-full"
                >
                  <div className="bg-gradient-to-r from-teal-500 to-blue-500 p-4 text-white">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="text-xl font-bold mb-1">
                          {event.coupleName || (event.groomName && event.brideName ? `${event.groomName} & ${event.brideName}` : 'אירוע')}
                        </h3>
                        <p className="text-sm text-teal-50 flex items-center">
                          <Calendar className="w-4 h-4 ms-1" />
                          {formatDate(event.eventDate)} - {event.eventTime}
                        </p>
                      </div>
                      <div className="text-right bg-white/20 backdrop-blur-sm rounded-lg p-3 border border-white/30">
                        <p className="text-xs text-white/90 font-medium mb-1">סה"כ מוזמנים</p>
                        <p className="text-2xl font-bold stat-number">{total}</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="p-5">

                    {/* Enhanced Stats */}
                    <div className="grid grid-cols-2 gap-3 mb-5">
                      <div className="text-center p-3 bg-green-50 rounded-lg border-2 border-green-200 hover:bg-green-100 transition-colors">
                        <div className="flex items-center justify-center mb-1">
                          <CheckCircle className="w-5 h-5 text-green-600 ms-1" />
                          <span className="text-2xl font-bold text-green-600 stat-number">{confirmed}</span>
                        </div>
                        <p className="text-xs text-green-700 font-semibold">מגיעים</p>
                      </div>

                      <div className="text-center p-3 bg-red-50 rounded-lg border-2 border-red-200 hover:bg-red-100 transition-colors">
                        <div className="flex items-center justify-center mb-1">
                          <XCircle className="w-5 h-5 text-red-600 ms-1" />
                          <span className="text-2xl font-bold text-red-600 stat-number">{declined}</span>
                        </div>
                        <p className="text-xs text-red-700 font-semibold">לא מגיעים</p>
                      </div>

                      <div className="text-center p-3 bg-yellow-50 rounded-lg border-2 border-yellow-200 hover:bg-yellow-100 transition-colors">
                        <div className="flex items-center justify-center mb-1">
                          <HelpCircle className="w-5 h-5 text-yellow-600 ms-1" />
                          <span className="text-2xl font-bold text-yellow-600 stat-number">{maybe}</span>
                        </div>
                        <p className="text-xs text-yellow-700 font-semibold">אולי</p>
                      </div>

                      <div className="text-center p-3 bg-gray-50 rounded-lg border-2 border-gray-200 hover:bg-gray-100 transition-colors">
                        <div className="flex items-center justify-center mb-1">
                          <Clock className="w-5 h-5 text-gray-600 ms-1" />
                          <span className="text-2xl font-bold text-gray-600 stat-number">{pending}</span>
                        </div>
                        <p className="text-xs text-gray-700 font-semibold">לא ענו</p>
                      </div>
                    </div>

                    {/* Enhanced Actions */}
                    <div className="space-y-2">
                      {/* Primary Actions */}
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                            e.preventDefault();
                            e.stopPropagation();
                            navigate(`/event/${event.id}/manage`);
                          }}
                          className="flex-1 bg-teal-600 text-white text-center py-2.5 rounded-lg font-semibold flex items-center justify-center gap-2 hover:bg-teal-700 transition-all shadow-md hover:shadow-lg"
                        >
                          <Eye className="w-4 h-4" />
                          <span>ניהול</span>
                        </button>
                        <button
                          type="button"
                          onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleEditEvent(event);
                          }}
                          className="flex-1 bg-blue-600 text-white text-center py-2.5 rounded-lg font-semibold flex items-center justify-center gap-2 hover:bg-blue-700 transition-all shadow-md hover:shadow-lg"
                        >
                          <Edit className="w-4 h-4" />
                          <span>עריכה</span>
                        </button>
                      </div>
                      
                      {/* Secondary Actions */}
                      <div className="flex gap-2">
                        <Link
                          to={`/event/${event.id}/campaigns`}
                          onClick={(e) => e.stopPropagation()}
                          className="flex-1 px-3 py-2 bg-green-50 text-green-700 rounded-lg hover:bg-green-100 text-center text-sm font-semibold transition-all border border-green-200"
                        >
                          הודעות
                        </Link>
                        <button
                          onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                            e.stopPropagation();
                            navigate(`/event/${event.id}/seating`);
                          }}
                          className="flex-1 px-3 py-2 bg-purple-50 text-purple-700 rounded-lg hover:bg-purple-100 text-center text-sm font-semibold transition-all border border-purple-200"
                        >
                          הושבה
                        </button>
                        <button
                          onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                            e.stopPropagation();
                            handleDeleteEvent(event.id, event.coupleName);
                          }}
                          className="px-3 py-2 bg-red-50 text-red-700 rounded-lg hover:bg-red-100 transition-all border border-red-200"
                          title="מחק אירוע"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Deleted Events Modal */}
      <DeletedEventsModal
        isOpen={showDeletedEventsModal}
        onClose={() => setShowDeletedEventsModal(false)}
        deletedEvents={deletedEvents}
        onRestoreEvent={restoreDeletedEvent}
        onPermanentlyDeleteEvent={permanentlyDeleteEvent}
      />

      {/* Edit Event Modal */}
      {showEditEventModal && selectedEventForEdit && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-800">ערוך אירוע</h2>
                <button
                  onClick={closeEditEventModal}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      תאריך האירוע
                    </label>
                    <input
                      type="date"
                      value={selectedEventForEdit.eventDate ? new Date(selectedEventForEdit.eventDate).toISOString().split('T')[0] : ''}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSelectedEventForEdit({
                        ...selectedEventForEdit,
                        eventDate: new Date(e.target.value)
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      שם החתן
                    </label>
                    <input
                      type="text"
                      value={selectedEventForEdit.groomName || ''}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSelectedEventForEdit({
                        ...selectedEventForEdit,
                        groomName: e.target.value
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      שם הכלה
                    </label>
                    <input
                      type="text"
                      value={selectedEventForEdit.brideName || ''}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSelectedEventForEdit({
                        ...selectedEventForEdit,
                        brideName: e.target.value
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      שם הורי החתן (אופציונלי)
                    </label>
                    <input
                      type="text"
                      value={selectedEventForEdit.groomParentsName || ''}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSelectedEventForEdit({
                        ...selectedEventForEdit,
                        groomParentsName: e.target.value
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      שם הורי הכלה (אופציונלי)
                    </label>
                    <input
                      type="text"
                      value={selectedEventForEdit.brideParentsName || ''}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSelectedEventForEdit({
                        ...selectedEventForEdit,
                        brideParentsName: e.target.value
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      שעת האירוע
                    </label>
                    <input
                      type="time"
                      value={selectedEventForEdit.eventTime || ''}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSelectedEventForEdit({
                        ...selectedEventForEdit,
                        eventTime: e.target.value
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      מקום האירוע
                    </label>
                    <input
                      type="text"
                      value={selectedEventForEdit.venue || ''}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSelectedEventForEdit({
                        ...selectedEventForEdit,
                        venue: e.target.value
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      טלפון הזוג
                    </label>
                    <input
                      type="tel"
                      value={selectedEventForEdit.couplePhone || ''}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSelectedEventForEdit({
                        ...selectedEventForEdit,
                        couplePhone: e.target.value
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      אימייל הזוג
                    </label>
                    <input
                      type="email"
                      value={selectedEventForEdit.coupleEmail || ''}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSelectedEventForEdit({
                        ...selectedEventForEdit,
                        coupleEmail: e.target.value
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    סוג האירוע
                  </label>
                  <select
                    value={selectedEventForEdit.eventType || 'wedding'}
                    onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
                      const eventTypeMap: Record<string, string> = {
                        'wedding': 'חתונה',
                        'bar_mitzvah': 'בר מצווה',
                        'bat_mitzvah': 'בת מצווה',
                        'birthday': 'יום הולדת',
                        'anniversary': 'יום נישואין',
                        'other': 'אחר'
                      };
                      setSelectedEventForEdit({
                        ...selectedEventForEdit,
                        eventType: e.target.value,
                        eventTypeHebrew: eventTypeMap[e.target.value]
                      });
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="wedding">חתונה</option>
                    <option value="bar_mitzvah">בר מצווה</option>
                    <option value="bat_mitzvah">בת מצווה</option>
                    <option value="birthday">יום הולדת</option>
                    <option value="anniversary">יום נישואין</option>
                    <option value="other">אחר</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    תמונת הזמנה
                  </label>
                  
                  {/* File upload option */}
                  <div className="mb-2">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          try {
                            const formData = new FormData();
                            formData.append('image', file);
                            
                            const BACKEND_URL = (process.env as any).NEXT_PUBLIC_BACKEND_URL || (process.env as any).VITE_BACKEND_URL || 'https://whatsapp-backend-enfz.onrender.com';
                            
                            // Show loading indicator
                            const uploadButton = e.target as HTMLInputElement;
                            const originalDisabled = uploadButton.disabled;
                            uploadButton.disabled = true;
                            
                            const response = await fetch(`${BACKEND_URL}/api/upload/image`, {
                              method: 'POST',
                              // Don't set Content-Type header - browser will set it automatically with boundary
                              body: formData
                            });
                            
                            uploadButton.disabled = originalDisabled;
                            
                            if (response.ok) {
                              const data = await response.json();
                              console.log('✅ Image upload response:', data);
                              // CRITICAL: Verify imageUrl is a valid HTTP/HTTPS URL, not a local file path
                              if (data.imageUrl && !data.imageUrl.startsWith('file://')) {
                                console.log('✅ Valid image URL received:', data.imageUrl);
                              setSelectedEventForEdit({
                                ...selectedEventForEdit,
                                invitationImageUrl: data.imageUrl
                              });
                                alert(`✅ התמונה הועלתה בהצלחה!\n\nקישור: ${data.imageUrl}`);
                            } else {
                                alert('שגיאה: התמונה לא הועלתה לשרת. נא לנסות שוב.');
                                console.error('❌ Invalid image URL received:', data.imageUrl);
                              }
                            } else {
                              const errorText = await response.text().catch(() => 'Unknown error');
                              let errorData;
                              try {
                                errorData = JSON.parse(errorText);
                              } catch {
                                errorData = { error: errorText || response.statusText };
                              }
                              const errorMessage = errorData.error || errorData.message || response.statusText || 'שגיאה לא ידועה';
                              console.error('❌ Image upload failed:', {
                                status: response.status,
                                statusText: response.statusText,
                                error: errorData
                              });
                              
                              // Show detailed error message
                              alert(
                                `❌ שגיאה בהעלאת התמונה לשרת\n\n` +
                                `קוד שגיאה: ${response.status}\n` +
                                `הודעה: ${errorMessage}\n\n` +
                                `💡 פתרונות אפשריים:\n` +
                                `1. נסה להעלות תמונה קטנה יותר (מקסימום 5MB)\n` +
                                `2. ודא שהקובץ הוא תמונה בפורמט תקני (JPG, PNG, GIF)\n` +
                                `3. נסה להעלות את התמונה ל-Imgur (https://imgur.com/upload) ולהזין את הקישור כאן`
                              );
                              
                              // Offer alternative: use URL input instead
                              const useUrl = confirm(
                                `האם תרצה להזין קישור לתמונה ישירות במקום?\n\n` +
                                `(חייב להיות URL נגיש דרך האינטרנט, למשל מ-Imgur או Google Drive)`
                              );
                              
                              if (useUrl) {
                                // Focus on URL input
                                const urlInput = document.querySelector('input[type="url"]') as HTMLInputElement;
                                if (urlInput) {
                                  urlInput.focus();
                                  urlInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                }
                              }
                            }
                          } catch (error: any) {
                            console.error('Error uploading image:', error);
                            const useUrl = confirm(
                              `שגיאה בהעלאת התמונה: ${error instanceof Error ? error.message : 'שגיאה לא ידועה'}\n\n` +
                              `האם תרצה להזין קישור לתמונה ישירות במקום? (חייב להיות URL נגיש דרך האינטרנט)`
                            );
                            
                            if (useUrl) {
                              // Focus on URL input
                              const urlInput = document.querySelector('input[type="url"]') as HTMLInputElement;
                              if (urlInput) {
                                urlInput.focus();
                                urlInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
                              }
                            }
                          }
                        }
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      או הכנס קישור לתמונה (חייב להיות URL נגיש דרך האינטרנט, למשל מ-Imgur או Google Drive)
                    </p>
                  </div>
                  
                  {/* URL input option */}
                  <input
                    type="url"
                    placeholder="https://example.com/image.jpg או https://i.imgur.com/xxxxx.jpg"
                    value={selectedEventForEdit.invitationImageUrl || ''}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                      const url = e.target.value.trim();
                      
                      // Reject file:// URLs - user should use file upload instead
                      if (url.startsWith('file://')) {
                        alert('⚠️ לא ניתן להשתמש בנתיב מקומי.\n\nאנא השתמש באפשרות "העלאת קובץ" למעלה, או העלה את התמונה ל-Imgur (https://imgur.com/upload) והזן את הקישור כאן.');
                        e.target.value = '';
                        return;
                      }
                      
                      // Validate URL format
                      if (url && (url.startsWith('http://') || url.startsWith('https://'))) {
                        setSelectedEventForEdit({
                      ...selectedEventForEdit,
                          invitationImageUrl: url
                        });
                      } else if (url === '') {
                        // Allow clearing the URL
                        setSelectedEventForEdit({
                          ...selectedEventForEdit,
                          invitationImageUrl: undefined
                        });
                      } else if (url) {
                        // Only warn if there's actually a value (not empty)
                        alert('⚠️ פורמט URL לא תקין. הקישור חייב להתחיל ב-http:// או https://');
                        e.target.value = '';
                      }
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    תמונה זו תוצג בכל ההודעות שנשלחו לאורחים
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    💡 טיפ: אם ההעלאה נכשלת, תוכל להעלות את התמונה ל-Imgur (https://imgur.com/upload) ולהזין את הקישור כאן
                  </p>
                  
                  {/* תצוגת תמונה אם קיימת */}
                  {selectedEventForEdit.invitationImageUrl && (
                    <div className="mt-3">
                      <p className="text-sm font-medium text-gray-700 mb-2">תצוגה מקדימה:</p>
                      <div className="border border-gray-300 rounded-lg p-2 bg-gray-50">
                        <img
                          src={selectedEventForEdit.invitationImageUrl}
                          alt="תמונת הזמנה"
                          className="max-w-full h-32 object-contain rounded"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                          }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex justify-end space-x-3 space-x-reverse mt-6">
                <button
                  onClick={closeEditEventModal}
                  className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300"
                >
                  ביטול
                </button>
                <button
                  onClick={handleSaveEventEdit}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  שמור שינויים
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;