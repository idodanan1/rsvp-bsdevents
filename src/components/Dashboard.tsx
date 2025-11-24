import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useEventStore } from '../store/eventStore';
import { calculateGlobalStats, formatDate, getStatusIcon, getStatusColor } from '../utils/helpers';
import { Plus, Users, Calendar, CheckCircle, XCircle, HelpCircle, Clock, Trash2, RotateCcw, Edit, Eye, Settings } from 'lucide-react';
import DeletedEventsModal from './DeletedEventsModal';

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { 
    events, 
    deletedEvents,
    isLoading, 
    restoreEvents, 
    forceRefresh, 
    cleanupLocalStorage, 
    deleteEvent,
    restoreDeletedEvent,
    permanentlyDeleteEvent,
    recreateCampaigns,
    updateExistingEventsCampaigns,
    fetchEvents
  } = useEventStore();
  const globalStats = calculateGlobalStats(events);
  const [showDeletedEventsModal, setShowDeletedEventsModal] = useState(false);
  const [showEditEventModal, setShowEditEventModal] = useState(false);
  const [selectedEventForEdit, setSelectedEventForEdit] = useState<any>(null);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Update time every second
  useEffect(() => {
    const timeInterval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timeInterval);
  }, []);

  // Auto-refresh data every 30 seconds (data already loaded from localStorage via persist)
  useEffect(() => {
    // Set up auto-refresh interval - don't fetch immediately, data already loaded
    const dataInterval = setInterval(() => {
      console.log('🔄 Auto-refreshing data...');
      fetchEvents().catch(error => {
        console.error('❌ Error auto-refreshing events:', error);
      });
    }, 30000); // 30 seconds

    return () => clearInterval(dataInterval);
  }, [fetchEvents]);

  const handleRestoreEvents = () => {
    // First, let's check what's in localStorage
    const stored = localStorage.getItem('rsvp-events-storage');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        console.log('🔍 localStorage data:', parsed);
        
        if (parsed.state && parsed.state.events) {
          console.log('📋 Found events in localStorage:', parsed.state.events.length);
          parsed.state.events.forEach((event: any, index: number) => {
            console.log(`📅 Event ${index + 1}:`, {
              id: event.id,
              coupleName: event.coupleName,
              guestsCount: event.guests?.length || 0,
              campaignsCount: event.campaigns?.length || 0,
              tablesCount: event.tables?.length || 0
            });
          });
        }
      } catch (error) {
        console.error('❌ Error parsing localStorage:', error);
      }
    } else {
      console.log('❌ No data found in localStorage');
    }
    
    const restored = restoreEvents();
    if (restored) {
      alert('✅ האירועים שוחזרו בהצלחה! רענן את הדף לראות את השינויים.');
    } else {
      alert('❌ לא נמצאו אירועים לשחזור');
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
    console.log('Edit button clicked for event:', event);
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
        eventDate: selectedEventForEdit.eventDate,
        eventTime: selectedEventForEdit.eventTime,
        venue: selectedEventForEdit.venue,
        couplePhone: selectedEventForEdit.couplePhone,
        coupleEmail: selectedEventForEdit.coupleEmail,
        eventType: selectedEventForEdit.eventType,
        eventTypeHebrew: selectedEventForEdit.eventTypeHebrew,
        invitationImageUrl: selectedEventForEdit.invitationImageUrl
      });
      alert('✅ האירוע עודכן בהצלחה!');
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="stat-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">אירועים פעילים</p>
              <p className="text-3xl font-bold text-teal-600">{globalStats.activeEvents}</p>
            </div>
            <Calendar className="w-8 h-8 text-teal-600" />
          </div>
        </div>

        <div className="stat-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">מוזמנים סה"כ</p>
              <p className="text-3xl font-bold text-yellow-500">{globalStats.totalGuests}</p>
            </div>
            <Users className="w-8 h-8 text-yellow-500" />
          </div>
        </div>

        <div className="stat-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">אחוז תגובה</p>
              <p className="text-3xl font-bold text-yellow-600">{globalStats.averageResponseRate}%</p>
            </div>
            <CheckCircle className="w-8 h-8 text-yellow-600" />
          </div>
        </div>

        <div className="stat-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">אישרו הגעה</p>
              <p className="text-3xl font-bold text-purple-600">{globalStats.totalConfirmed}</p>
            </div>
            <CheckCircle className="w-8 h-8 text-purple-600" />
          </div>
        </div>
      </div>


      {/* Events Grid */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-6">האירועים שלי</h2>
        
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
              
              console.log('Event ID:', event.id, 'Event Name:', event.coupleName);

              return (
                <div 
                  key={event.id} 
                  className="event-card bg-gradient-to-br from-white to-gray-50 border-2 border-gray-200 hover:border-blue-300 transition-all duration-300 cursor-pointer"
                  onClick={() => navigate(`/event/${event.id}/manage`)}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-xl font-bold text-gray-900 mb-1">
                        {event.coupleName}
                      </h3>
                      <p className="text-gray-600 flex items-center font-medium">
                        <Calendar className="w-4 h-4 mr-1" />
                        {formatDate(event.eventDate)} - {event.eventTime}
                      </p>
                    </div>
                    <div className="text-right bg-blue-50 rounded-lg p-3 border border-blue-200">
                      <p className="text-sm text-blue-700 font-medium">סה"כ מוזמנים</p>
                      <p className="text-2xl font-bold text-blue-600">{total}</p>
                    </div>
                  </div>

                  {/* Enhanced Stats */}
                  <div className="grid grid-cols-2 gap-3 mb-6">
                    <div className="text-center p-3 bg-green-50 rounded-lg border-2 border-green-200">
                      <div className="flex items-center justify-center mb-1">
                        <CheckCircle className="w-4 h-4 text-green-600 mr-1" />
                        <span className="text-xl font-bold text-green-600">{confirmed}</span>
                      </div>
                      <p className="text-xs text-green-700 font-medium">מגיעים</p>
                    </div>

                    <div className="text-center p-3 bg-red-50 rounded-lg border-2 border-red-200">
                      <div className="flex items-center justify-center mb-1">
                        <XCircle className="w-4 h-4 text-red-600 mr-1" />
                        <span className="text-xl font-bold text-red-600">{declined}</span>
                      </div>
                      <p className="text-xs text-red-700 font-medium">לא מגיעים</p>
                    </div>

                    <div className="text-center p-3 bg-yellow-50 rounded-lg border-2 border-yellow-200">
                      <div className="flex items-center justify-center mb-1">
                        <HelpCircle className="w-4 h-4 text-yellow-600 mr-1" />
                        <span className="text-xl font-bold text-yellow-600">{maybe}</span>
                      </div>
                      <p className="text-xs text-yellow-700 font-medium">אולי</p>
                    </div>

                    <div className="text-center p-3 bg-gray-50 rounded-lg border-2 border-gray-200">
                      <div className="flex items-center justify-center mb-1">
                        <Clock className="w-4 h-4 text-gray-600 mr-1" />
                        <span className="text-xl font-bold text-gray-600">{pending}</span>
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
                          console.log('Edit button clicked for event:', event);
                          handleEditEvent(event);
                        }}
                        onPointerUp={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          console.log('Edit button pointer up for event:', event);
                          handleEditEvent(event);
                        }}
                        onPointerDown={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          console.log('Edit button pointer down for event:', event);
                          handleEditEvent(event);
                        }}
                        onMouseDown={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          console.log('Edit button clicked for event:', event);
                          handleEditEvent(event);
                        }}
                        onTouchStart={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          console.log('Edit button touched for event:', event);
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
                          console.log('View button pointer down for event:', event);
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
                      שם הזוג
                    </label>
                    <input
                      type="text"
                      value={selectedEventForEdit.coupleName || ''}
                      onChange={(e) => setSelectedEventForEdit({
                        ...selectedEventForEdit,
                        coupleName: e.target.value
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
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
                            const response = await fetch(`${BACKEND_URL}/api/upload/image`, {
                              method: 'POST',
                              body: formData
                            });
                            
                            if (response.ok) {
                              const data = await response.json();
                              setSelectedEventForEdit({
                                ...selectedEventForEdit,
                                invitationImageUrl: data.imageUrl
                              });
                            } else {
                              alert('שגיאה בהעלאת התמונה');
                            }
                          } catch (error) {
                            console.error('Error uploading image:', error);
                            alert('שגיאה בהעלאת התמונה');
                          }
                        }
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      או הכנס קישור לתמונה (חייב להיות URL נגיש דרך האינטרנט)
                    </p>
                  </div>
                  
                  {/* URL input option */}
                  <input
                    type="url"
                    value={selectedEventForEdit.invitationImageUrl || ''}
                    onChange={(e) => setSelectedEventForEdit({
                      ...selectedEventForEdit,
                      invitationImageUrl: e.target.value
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="https://example.com/invitation.jpg"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    תמונה זו תוצג בכל ההודעות שנשלחו לאורחים
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
