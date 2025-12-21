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
        const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3002';
        const response = await fetch(`${BACKEND_URL}/api/users/${user.id}/sessions/count`);
        if (response.ok) {
          const data = await response.json();
          setConnectedDevicesCount(data.count || 0);
        }
      } catch (error) {
        console.error('❌ Error fetching connected devices:', error);
      }
    };

    fetchConnectedDevices();
    
    // Update session activity every 5 minutes
    const activityInterval = setInterval(async () => {
      if (user?.id && sessionId) {
        try {
          const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3002';
          await fetch(`${BACKEND_URL}/api/users/${user.id}/sessions/activity`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sessionId })
          });
        } catch (error) {
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
    fetchEvents(true).catch(error => {
      console.error('❌ Error initial fetch:', error);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Removed fetchEvents from deps to prevent infinite loop

  // Manual refresh handler
  const handleRefresh = async () => {
    try {
      setCurrentTime(new Date());
      await fetchEvents(true);
    } catch (error) {
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
      } catch (error) {
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
      const updatedEvent = useEventStore.getState().events.find(e => e.id === selectedEventForEdit.id);
      
      alert(`✅ האירוע עודכן בהצלחה!${updatedEvent?.invitationImageUrl ? `\n\nתמונת הזמנה: ${updatedEvent.invitationImageUrl}` : '\n\n⚠️ שים לב: תמונת הזמנה לא נשמרה. נא לנסות להעלות שוב.'}`);
      closeEditEventModal();
    } catch (error) {
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
    <div className="space-y-8">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">דשבורד</h1>
          <p className="text-yellow-500 mt-2 font-medium">בס"ד אירועים - אישורי הגעה וסידורי הושבה ✅ מעודכן: {currentTime.toLocaleString('he-IL')}</p>
        </div>
        <div className="flex space-x-3">
          {/* Quick restore button for specific event */}
          <button
            onClick={async () => {
              const eventId = prompt('הזן את מזהה האירוע לשחזור:');
              if (eventId && eventId.trim()) {
                try {
                  const success = await restoreDeletedEvent(eventId.trim());
                  if (success) {
                    alert('✅ האירוע שוחזר בהצלחה!');
                    await fetchEvents(true);
                  } else {
                    alert('❌ שגיאה בשחזור האירוע. נסה לבדוק את המזהה או לפתוח את חלון האירועים שנמחקו.');
                  }
                } catch (error: any) {
                  console.error('❌ Error restoring event:', error);
                  alert(`❌ שגיאה בשחזור האירוע: ${error?.message || 'שגיאה לא ידועה'}`);
                }
              }
            }}
            className="btn-secondary flex items-center space-x-2 space-x-reverse bg-green-100 text-green-700 hover:bg-green-200 border-green-300"
            title="שחזר אירוע לפי מזהה"
          >
            <RotateCcw className="w-5 h-5" />
            <span>שחזר אירוע לפי מזהה</span>
          </button>
          {/* Restore from localStorage button */}
          <button
            onClick={async () => {
              const confirmed = window.confirm(
                'האם אתה בטוח שברצונך לשחזר את כל האירועים מ-localStorage?\n\n' +
                'זה יחליף את כל האירועים הנוכחיים בנתונים מ-localStorage.\n\n' +
                '⚠️ שים לב: זה יכול לגרום לאובדן נתונים אם localStorage לא מעודכן.'
              );
              
              if (confirmed) {
                try {
                  const { restoreEvents } = useEventStore.getState();
                  const success = restoreEvents();
                  
                  if (success) {
                    // Sync restored events to backend
                    const { syncAllEventsToAPI, fetchEvents } = useEventStore.getState();
                    await syncAllEventsToAPI();
                    await fetchEvents(true);
                    
                    alert('✅ האירועים שוחזרו מ-localStorage בהצלחה!\n\nכל האירועים נשלחו לשרת.');
                  } else {
                    alert('❌ לא נמצאו נתונים ב-localStorage לשחזור.');
                  }
                } catch (error: any) {
                  console.error('❌ Error restoring from localStorage:', error);
                  alert(`❌ שגיאה בשחזור מ-localStorage: ${error?.message || 'שגיאה לא ידועה'}`);
                }
              }
            }}
            className="btn-secondary flex items-center space-x-2 space-x-reverse bg-purple-100 text-purple-700 hover:bg-purple-200 border-purple-300"
            title="שחזר אירועים מ-localStorage (גיבוי מקומי)"
          >
            <RotateCcw className="w-5 h-5" />
            <span>שחזר מ-localStorage</span>
          </button>
          {deletedEvents.length > 0 && (
            <button
              onClick={() => setShowDeletedEventsModal(true)}
              className="btn-secondary flex items-center space-x-2 space-x-reverse bg-orange-100 text-orange-700 hover:bg-orange-200 border-orange-300"
            >
              <RotateCcw className="w-5 h-5" />
              <span>שחזר אירועים ({deletedEvents.length})</span>
            </button>
          )}
          <button
            onClick={async () => {
              try {
                // First, clean up localStorage
                cleanupOtherUsersEvents();
                
                // Then, force refresh from API (this will load only current user's events)
                await fetchEvents(true);
                
                alert('✅ ניקיתי את האירועים שלא שייכים לך וטענתי מחדש מה-API.\n\nעכשיו תראה רק את האירועים שלך.');
              } catch (error: any) {
                console.error('❌ Error cleaning up:', error);
                alert(`❌ שגיאה בניקוי: ${error?.message || 'שגיאה לא ידועה'}`);
              }
            }}
            className="btn-secondary flex items-center space-x-2 bg-red-100 text-red-700 hover:bg-red-200 border-red-300"
            title="נקה אירועים שלא שייכים למשתמש הנוכחי וטען מחדש מה-API"
          >
            <Trash2 className="w-5 h-5" />
            <span>נקה וטען מחדש</span>
          </button>
          <button
            onClick={async () => {
              try {
                const result = await syncAllEventsToAPI();
                alert(`✅ סנכרנו ${result.synced} אירועים ל-API בהצלחה!\n\nעכשיו תוכל לראות אותם גם במחשבים אחרים.`);
              } catch (error: any) {
                console.error('❌ Error syncing events:', error);
                alert(`❌ שגיאה בסנכרון: ${error?.message || 'שגיאה לא ידועה'}`);
              }
            }}
            className="btn-warning flex items-center space-x-2 bg-blue-500 hover:bg-blue-600 text-white"
            title="סנכרן את כל האירועים מה-localStorage ל-API כדי לראות אותם במחשבים אחרים"
          >
            <RefreshCw className="w-5 h-5" />
            <span>סנכרן אירועים ל-API</span>
          </button>
          <button
            onClick={async () => {
              try {
                updateExistingEventsCampaigns();
                await fetchEvents();
                alert('✅ כל האירועים הקיימים עודכנו להשתמש בתבנית החדשה!');
              } catch (error) {
                console.error('❌ Error updating campaigns:', error);
                alert('❌ שגיאה בעדכון קמפיינים: ' + error);
              }
            }}
            className="btn-primary flex items-center space-x-2"
          >
            <RefreshCw className="w-5 h-5" />
            <span>עדכן כל האירועים לתבנית חדשה</span>
          </button>
          <Link
            to="/calendar"
            className="btn-secondary flex items-center space-x-2"
          >
            <Calendar className="w-5 h-5" />
            <span>לוח שנה</span>
          </Link>
          <Link
            to="/create-event"
            className="btn-primary flex items-center space-x-2"
          >
            <Plus className="w-5 h-5" />
            <span>אירוע חדש</span>
          </Link>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        <div className="stat-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">מחשבים מחוברים</p>
              <p className="text-3xl font-bold text-blue-600 stat-number">{connectedDevicesCount}</p>
            </div>
            <Monitor className="w-8 h-8 text-blue-600" />
          </div>
        </div>

        <div className="stat-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">אירועים פעילים</p>
              <p className="text-3xl font-bold text-teal-600 stat-number">{globalStats.activeEvents}</p>
            </div>
            <Calendar className="w-8 h-8 text-teal-600" />
          </div>
        </div>

        <div className="stat-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">מוזמנים סה"כ</p>
              <p className="text-3xl font-bold text-yellow-500 stat-number">{globalStats.totalGuests}</p>
            </div>
            <Users className="w-8 h-8 text-yellow-500" />
          </div>
        </div>

        <div className="stat-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">אחוז תגובה</p>
              <p className="text-3xl font-bold text-yellow-600 stat-number">{globalStats.averageResponseRate}%</p>
            </div>
            <CheckCircle className="w-8 h-8 text-yellow-600" />
          </div>
        </div>

        <div className="stat-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">אישרו הגעה</p>
              <p className="text-3xl font-bold text-purple-600 stat-number">{globalStats.totalConfirmed}</p>
            </div>
            <CheckCircle className="w-8 h-8 text-purple-600" />
          </div>
        </div>
      </div>


      {/* Events Grid */}
      <div>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900">האירועים שלי</h2>
          {deletedEvents.length > 0 && (
            <button
              onClick={() => setShowDeletedEventsModal(true)}
              className="btn-secondary flex items-center space-x-2 space-x-reverse"
            >
              <RotateCcw className="w-5 h-5" />
              <span>שחזר אירועים שנמחקו ({deletedEvents.length})</span>
            </button>
          )}
        </div>
        
        {events.length === 0 ? (
          <div className="text-center py-12">
            <Calendar className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-medium text-gray-900 mb-2">אין אירועים עדיין</h3>
            <p className="text-gray-600 mb-6">התחל ביצירת האירוע הראשון שלך</p>
            <Link
              to="/create-event"
              className="btn-primary inline-flex items-center space-x-2"
            >
              <Plus className="w-5 h-5" />
              <span>צור אירוע חדש</span>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {events.map((event) => {
              const confirmed = event.guests.filter(g => g.rsvpStatus === 'confirmed').length;
              const declined = event.guests.filter(g => g.rsvpStatus === 'declined').length;
              const maybe = event.guests.filter(g => g.rsvpStatus === 'maybe').length;
              const pending = event.guests.filter(g => g.rsvpStatus === 'pending').length;
              const total = event.guests.length;

              return (
                <div 
                  key={event.id} 
                  className="event-card bg-gradient-to-br from-white to-gray-50 border-2 border-gray-200 hover:border-blue-300 transition-all duration-300 cursor-pointer"
                  onClick={() => navigate(`/event/${event.id}/manage`)}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-xl font-bold text-gray-900 mb-1">
                        {event.coupleName || (event.groomName && event.brideName ? `${event.groomName} & ${event.brideName}` : 'אירוע')}
                      </h3>
                      {(event.groomName || event.brideName) && (
                        <p className="text-sm text-gray-500 mb-1">
                          {event.groomName && event.brideName 
                            ? `${event.groomName} & ${event.brideName}`
                            : event.groomName || event.brideName}
                        </p>
                      )}
                      <p className="text-xs text-gray-400 mb-1 font-mono">
                        מזהה: {event.id}
                      </p>
                      <p className="text-gray-600 flex items-center font-medium">
                        <Calendar className="w-4 h-4 mr-1" />
                        {formatDate(event.eventDate)} - {event.eventTime}
                      </p>
                    </div>
                    <div className="text-right bg-blue-50 rounded-lg p-3 border border-blue-200">
                      <p className="text-sm text-blue-700 font-medium">סה"כ מוזמנים</p>
                      <p className="text-2xl font-bold text-blue-600 stat-number">{total}</p>
                    </div>
                  </div>

                  {/* Enhanced Stats */}
                  <div className="grid grid-cols-2 gap-3 mb-6">
                    <div className="text-center p-3 bg-green-50 rounded-lg border-2 border-green-200">
                      <div className="flex items-center justify-center mb-1">
                        <CheckCircle className="w-4 h-4 text-green-600 mr-1" />
                        <span className="text-xl font-bold text-green-600 stat-number">{confirmed}</span>
                      </div>
                      <p className="text-xs text-green-700 font-medium">מגיעים</p>
                    </div>

                    <div className="text-center p-3 bg-red-50 rounded-lg border-2 border-red-200">
                      <div className="flex items-center justify-center mb-1">
                        <XCircle className="w-4 h-4 text-red-600 mr-1" />
                        <span className="text-xl font-bold text-red-600 stat-number">{declined}</span>
                      </div>
                      <p className="text-xs text-red-700 font-medium">לא מגיעים</p>
                    </div>

                    <div className="text-center p-3 bg-yellow-50 rounded-lg border-2 border-yellow-200">
                      <div className="flex items-center justify-center mb-1">
                        <HelpCircle className="w-4 h-4 text-yellow-600 mr-1" />
                        <span className="text-xl font-bold text-yellow-600 stat-number">{maybe}</span>
                      </div>
                      <p className="text-xs text-yellow-700 font-medium">אולי</p>
                    </div>

                    <div className="text-center p-3 bg-gray-50 rounded-lg border-2 border-gray-200">
                      <div className="flex items-center justify-center mb-1">
                        <Clock className="w-4 h-4 text-gray-600 mr-1" />
                        <span className="text-xl font-bold text-gray-600 stat-number">{pending}</span>
                      </div>
                      <p className="text-xs text-gray-700 font-medium">לא ענו</p>
                    </div>
                  </div>

                  {/* Enhanced Actions */}
                  <div className="space-y-2">
                    {/* Primary Actions */}
                    <div className="flex space-x-2">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleEditEvent(event);
                        }}
                        onPointerUp={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleEditEvent(event);
                        }}
                        onPointerDown={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleEditEvent(event);
                        }}
                        onMouseDown={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleEditEvent(event);
                        }}
                        onTouchStart={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleEditEvent(event);
                        }}
                        className="flex-1 bg-blue-600 text-white text-center py-2 rounded-lg font-medium flex items-center justify-center gap-2 hover:bg-blue-700 transition-colors cursor-pointer"
                        style={{ pointerEvents: 'auto', zIndex: 10 }}
                      >
                        <Edit className="w-4 h-4" />
                        <span>עריכה</span>
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          console.log('View button clicked for event:', event);
                          navigate(`/event/${event.id}/view`);
                        }}
                        onPointerUp={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          console.log('View button pointer up for event:', event);
                          navigate(`/event/${event.id}/view`);
                        }}
                        onPointerDown={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          navigate(`/event/${event.id}/view`);
                        }}
                        onMouseDown={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          console.log('View button clicked for event:', event);
                          navigate(`/event/${event.id}/view`);
                        }}
                        onTouchStart={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          console.log('View button touched for event:', event);
                          navigate(`/event/${event.id}/view`);
                        }}
                        className="flex-1 bg-gray-600 text-white text-center py-2 rounded-lg font-medium flex items-center justify-center gap-2 hover:bg-gray-700 transition-colors cursor-pointer"
                        style={{ pointerEvents: 'auto', zIndex: 10 }}
                      >
                        <Eye className="w-4 h-4" />
                        <span>צפייה</span>
                      </button>
                    </div>
                    
                    {/* Secondary Actions */}
                    <div className="flex space-x-2">
                      <Link
                        to={`/event/${event.id}/campaigns`}
                        className="flex-1 px-3 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 text-center text-sm font-medium transition-colors"
                      >
                        הודעות
                      </Link>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/event/${event.id}/seating`);
                        }}
                        className="flex-1 px-3 py-2 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 text-center text-sm font-medium transition-colors"
                      >
                        הושבה
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteEvent(event.id, event.coupleName);
                        }}
                        className="px-3 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors"
                        title="מחק אירוע"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
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
                      onChange={(e) => setSelectedEventForEdit({
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
                      onChange={(e) => setSelectedEventForEdit({
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
                      onChange={(e) => setSelectedEventForEdit({
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
                      onChange={(e) => setSelectedEventForEdit({
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
                      onChange={(e) => setSelectedEventForEdit({
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
                      onChange={(e) => setSelectedEventForEdit({
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
                      onChange={(e) => setSelectedEventForEdit({
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
                      onChange={(e) => setSelectedEventForEdit({
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
                      onChange={(e) => setSelectedEventForEdit({
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
                    onChange={(e) => {
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
                            
                            const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3002';
                            
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
                          } catch (error) {
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
                    onChange={(e) => {
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
                    placeholder="https://example.com/invitation.jpg או https://i.imgur.com/xxxxx.jpg"
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