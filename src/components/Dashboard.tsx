import React, { useState, useEffect, startTransition } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useEventStore } from '../store/eventStore';
import { useUserStore } from '../store/userStore';
import { calculateGlobalStats, formatDate, getStatusIcon, getStatusColor } from '../utils/helpers';
import { Plus, Users, Calendar, CheckCircle, XCircle, HelpCircle, Clock, Trash2, RotateCcw, Edit, Eye, Settings, RefreshCw, Monitor, LogOut, CalendarDays, User as UserIcon } from 'lucide-react';
import DeletedEventsModal from './DeletedEventsModal';
import toast from 'react-hot-toast';

// Hebrew month names
const hebrewMonths = [
  'ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני',
  'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'
];

// Helper function to format date in Hebrew
const formatDateHebrew = (date: Date | string | undefined): string => {
  if (!date) return '';
  const d = date instanceof Date ? date : new Date(date);
  if (isNaN(d.getTime())) return '';
  const day = d.getDate();
  const month = hebrewMonths[d.getMonth()];
  const year = d.getFullYear();
  return `${day} ב${month} ${year}`;
};

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
  const [showRestoreByIdModal, setShowRestoreByIdModal] = useState(false);
  const [restoreEventId, setRestoreEventId] = useState<string>('');
  const { logout } = useUserStore();

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

  // Handle logout
  const handleLogout = () => {
    logout();
    toast.success('התנתקת בהצלחה');
    navigate('/login');
  };

  // Handle update campaigns
  const handleUpdateCampaigns = async () => {
    try {
      await updateExistingEventsCampaigns();
      toast.success('כל האירועים עודכנו בהצלחה');
    } catch (error: any) {
      console.error('❌ Error updating campaigns:', error);
      toast.error('שגיאה בעדכון האירועים');
    }
  };

  // Handle sync to API
  const handleSyncToAPI = async () => {
    try {
      await syncAllEventsToAPI();
      toast.success('כל האירועים סונכרנו בהצלחה');
    } catch (error: any) {
      console.error('❌ Error syncing to API:', error);
      toast.error('שגיאה בסנכרון האירועים');
    }
  };

  // Handle clear and reload
  const handleClearAndReload = async () => {
    const confirmed = window.confirm('האם אתה בטוח שברצונך לנקות ולטעון מחדש? פעולה זו תמחק את כל האירועים של משתמשים אחרים מהמאגר המקומי.');
    if (confirmed) {
      try {
        cleanupOtherUsersEvents();
        await handleRefresh();
        toast.success('נוקה וטען מחדש בהצלחה');
      } catch (error: any) {
        console.error('❌ Error clearing and reloading:', error);
        toast.error('שגיאה בניקוי וטעינה מחדש');
      }
    }
  };

  // Handle restore from localStorage
  const handleRestoreFromLocalStorage = async () => {
    try {
      const stored = localStorage.getItem('rsvp-events-storage');
      if (!stored) {
        toast.error('לא נמצאו אירועים ב-localStorage');
        return;
      }
      const parsed = JSON.parse(stored);
      if (parsed.state && parsed.state.deletedEvents && parsed.state.deletedEvents.length > 0) {
        const lastDeleted = parsed.state.deletedEvents[parsed.state.deletedEvents.length - 1];
        if (lastDeleted) {
          await restoreDeletedEvent(lastDeleted.id);
          toast.success('אירוע שוחזר מ-localStorage');
        } else {
          toast.error('לא נמצאו אירועים מחוקים ב-localStorage');
        }
      } else {
        toast.error('לא נמצאו אירועים מחוקים ב-localStorage');
      }
    } catch (error: any) {
      console.error('❌ Error restoring from localStorage:', error);
      toast.error('שגיאה בשחזור מ-localStorage');
    }
  };

  // Handle restore by ID
  const handleRestoreById = async () => {
    if (!restoreEventId.trim()) {
      toast.error('נא להזין מזהה אירוע');
      return;
    }
    try {
      await restoreDeletedEvent(restoreEventId.trim());
      toast.success('אירוע שוחזר בהצלחה');
      setShowRestoreByIdModal(false);
      setRestoreEventId('');
    } catch (error: any) {
      console.error('❌ Error restoring event:', error);
      toast.error('שגיאה בשחזור האירוע');
    }
  };


  // Only show loading spinner if we're loading AND have no events
  // If we have events (even from localStorage), show them immediately
  if (isLoading && events.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Dashboard Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">דשבורד</h1>
          <p className="text-gray-600 font-medium">בס"ד אירועים - אישורי הגעה וסידורי הושבה מעודכן: {currentTime.toLocaleString('he-IL')}</p>
        </div>

        {/* Action Buttons Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-4">
          <Link
            to="/create-event"
            className="flex flex-col items-center justify-center p-4 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-all font-medium shadow-md"
          >
            <Plus className="w-6 h-6 mb-2" />
            <span className="text-sm text-center">אירוע חדש</span>
          </Link>
          
          <Link
            to="/calendar"
            className="flex flex-col items-center justify-center p-4 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-all font-medium shadow-md"
          >
            <CalendarDays className="w-6 h-6 mb-2" />
            <span className="text-sm text-center">לוח שנה</span>
          </Link>
          
          <button
            onClick={handleUpdateCampaigns}
            className="flex flex-col items-center justify-center p-4 bg-green-400 text-white rounded-lg hover:bg-green-500 transition-all font-medium shadow-md"
          >
            <RefreshCw className="w-6 h-6 mb-2" />
            <span className="text-sm text-center">עדכן כל האירועים לתבנית חדשה</span>
          </button>
          
          <button
            onClick={handleSyncToAPI}
            className="flex flex-col items-center justify-center p-4 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-all font-medium shadow-md"
          >
            <RefreshCw className="w-6 h-6 mb-2" />
            <span className="text-sm text-center">סנכרן אירועים ל-API</span>
          </button>
          
          <button
            onClick={handleClearAndReload}
            className="flex flex-col items-center justify-center p-4 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-all font-medium shadow-md"
          >
            <Trash2 className="w-6 h-6 mb-2" />
            <span className="text-sm text-center">נקה וטען מחדש</span>
          </button>
          
          <button
            onClick={handleRestoreFromLocalStorage}
            className="flex flex-col items-center justify-center p-4 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-all font-medium shadow-md"
          >
            <RotateCcw className="w-6 h-6 mb-2" />
            <span className="text-sm text-center">שחזר מ-localStorage</span>
          </button>
          
          <button
            onClick={() => setShowRestoreByIdModal(true)}
            className="flex flex-col items-center justify-center p-4 bg-green-400 text-white rounded-lg hover:bg-green-500 transition-all font-medium shadow-md"
          >
            <RotateCcw className="w-6 h-6 mb-2" />
            <span className="text-sm text-center">שחזר אירוע לפי מזהה</span>
          </button>
        </div>

      {/* Quick Stats - Ordered to match model */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 w-full">
        {/* 1. אישרו הגעה (Confirmed Attendance) */}
        <div className="stat-card bg-white border-2 border-purple-200 hover:shadow-lg transition-all duration-300 w-full">
          <div className="flex items-center justify-between w-full">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-purple-700 mb-1">אישרו הגעה</p>
              <p className="text-3xl font-bold text-purple-600 stat-number">{globalStats.totalConfirmed}</p>
            </div>
            <div className="bg-purple-100 rounded-full p-3 flex-shrink-0">
              <CheckCircle className="w-8 h-8 text-purple-600" />
            </div>
          </div>
        </div>

        {/* 2. אחוז תגובה (Response Rate) */}
        <div className="stat-card bg-white border-2 border-green-200 hover:shadow-lg transition-all duration-300 w-full">
          <div className="flex items-center justify-between w-full">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-green-700 mb-1">אחוז תגובה</p>
              <p className="text-3xl font-bold text-green-600 stat-number">{globalStats.averageResponseRate}%</p>
            </div>
            <div className="bg-green-100 rounded-full p-3 flex-shrink-0">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
          </div>
        </div>

        {/* 3. מוזמנים סה"כ (Total Invited) */}
        <div className="stat-card bg-white border-2 border-yellow-200 hover:shadow-lg transition-all duration-300 w-full">
          <div className="flex items-center justify-between w-full">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-yellow-700 mb-1">מוזמנים סה"כ</p>
              <p className="text-3xl font-bold text-yellow-600 stat-number">{globalStats.totalGuests}</p>
            </div>
            <div className="bg-yellow-100 rounded-full p-3 flex-shrink-0">
              <Users className="w-8 h-8 text-yellow-600" />
            </div>
          </div>
        </div>

        {/* 4. אירועים פעילים (Active Events) */}
        <div className="stat-card bg-white border-2 border-teal-200 hover:shadow-lg transition-all duration-300 w-full">
          <div className="flex items-center justify-between w-full">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-teal-700 mb-1">אירועים פעילים</p>
              <p className="text-3xl font-bold text-teal-600 stat-number">{globalStats.activeEvents}</p>
            </div>
            <div className="bg-teal-100 rounded-full p-3 flex-shrink-0">
              <Calendar className="w-8 h-8 text-teal-600" />
            </div>
          </div>
        </div>

        {/* 5. מחשבים מחוברים (Connected Computers) */}
        <div className="stat-card bg-white border-2 border-blue-200 hover:shadow-lg transition-all duration-300 w-full">
          <div className="flex items-center justify-between w-full">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-blue-700 mb-1">מחשבים מחוברים</p>
              <p className="text-3xl font-bold text-blue-600 stat-number">{connectedDevicesCount}</p>
            </div>
            <div className="bg-blue-100 rounded-full p-3 flex-shrink-0">
              <Monitor className="w-8 h-8 text-blue-600" />
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
          <div className="text-center py-12">
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
          <div className="space-y-6">
            {events.map((event: any) => {
              const totalGuests = event.guests?.length || 0;
              const confirmed = event.guests?.filter((g: any) => g.rsvpStatus === 'confirmed').length || 0;
              const declined = event.guests?.filter((g: any) => g.rsvpStatus === 'declined').length || 0;
              const maybe = event.guests?.filter((g: any) => g.rsvpStatus === 'maybe').length || 0;
              const pending = event.guests?.filter((g: any) => g.rsvpStatus === 'pending' || !g.rsvpStatus).length || 0;
              
              const eventName = event.coupleName || (event.groomName && event.brideName ? `${event.groomName} & ${event.brideName}` : 'אירוע');
              const eventDate = event.eventDate ? formatDateHebrew(event.eventDate) : '';
              const eventTime = event.eventTime || '';

              return (
                <div 
                  key={event.id} 
                  className="bg-white border border-gray-200 rounded-lg shadow-md p-6 hover:shadow-lg transition-all"
                >
                  {/* Event Header */}
                  <div className="mb-4">
                    <h3 className="text-2xl font-bold text-gray-900 mb-2">{eventName}</h3>
                    <p className="text-sm text-gray-600 mb-1">מזהה: {event.id}</p>
                    {eventDate && (
                      <p className="text-sm text-gray-700 font-medium">
                        {eventDate}{eventTime ? ` - ${eventTime}` : ''}
                      </p>
                    )}
                  </div>

                  {/* Statistics Cards */}
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
                    <div className="bg-blue-100 border border-blue-200 rounded-lg p-3 text-center">
                      <p className="text-xs text-blue-700 mb-1">סה"כ מוזמנים</p>
                      <p className="text-2xl font-bold text-blue-800">{totalGuests}</p>
                    </div>
                    <div className="bg-green-100 border border-green-200 rounded-lg p-3 text-center">
                      <div className="flex items-center justify-center mb-1">
                        <CheckCircle className="w-4 h-4 text-green-700" />
                      </div>
                      <p className="text-xs text-green-700 mb-1">מגיעים</p>
                      <p className="text-2xl font-bold text-green-800">{confirmed}</p>
                    </div>
                    <div className="bg-red-100 border border-red-200 rounded-lg p-3 text-center">
                      <div className="flex items-center justify-center mb-1">
                        <XCircle className="w-4 h-4 text-red-700" />
                      </div>
                      <p className="text-xs text-red-700 mb-1">לא מגיעים</p>
                      <p className="text-2xl font-bold text-red-800">{declined}</p>
                    </div>
                    <div className="bg-yellow-100 border border-yellow-200 rounded-lg p-3 text-center">
                      <p className="text-xs text-yellow-700 mb-1">אולי</p>
                      <p className="text-2xl font-bold text-yellow-800">{maybe}</p>
                    </div>
                    <div className="bg-gray-100 border border-gray-200 rounded-lg p-3 text-center">
                      <p className="text-xs text-gray-700 mb-1">לא ענו</p>
                      <p className="text-2xl font-bold text-gray-800">{pending}</p>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-3 flex-wrap">
                    <Link
                      to={`/event/${event.id}/view`}
                      className="flex items-center gap-2 px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-800 transition-all font-medium"
                    >
                      <Eye className="w-4 h-4" />
                      <span>צפייה</span>
                    </Link>
                    <Link
                      to={`/event/${event.id}/seating`}
                      className="flex items-center gap-2 px-4 py-2 bg-purple-300 text-purple-800 rounded-lg hover:bg-purple-400 transition-all font-medium"
                    >
                      <span>הושבה</span>
                    </Link>
                    <button
                      onClick={() => handleEditEvent(event)}
                      className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-all font-medium"
                    >
                      <Edit className="w-4 h-4" />
                      <span>עריכה</span>
                    </button>
                    <Link
                      to={`/event/${event.id}/campaigns`}
                      className="flex items-center gap-2 px-4 py-2 bg-green-400 text-white rounded-lg hover:bg-green-500 transition-all font-medium"
                    >
                      <span>הודעות</span>
                    </Link>
                    <button
                      onClick={() => handleDeleteEvent(event.id, eventName)}
                      className="flex items-center gap-2 px-3 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-all"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
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

      {/* Restore by ID Modal */}
      {showRestoreByIdModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-800">שחזר אירוע לפי מזהה</h2>
                <button
                  onClick={() => {
                    setShowRestoreByIdModal(false);
                    setRestoreEventId('');
                  }}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ✕
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    מזהה האירוע
                  </label>
                  <input
                    type="text"
                    value={restoreEventId}
                    onChange={(e) => setRestoreEventId(e.target.value)}
                    placeholder="הזן מזהה אירוע"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        handleRestoreById();
                      }
                    }}
                  />
                </div>
                <div className="flex justify-end space-x-3 space-x-reverse">
                  <button
                    onClick={() => {
                      setShowRestoreByIdModal(false);
                      setRestoreEventId('');
                    }}
                    className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300"
                  >
                    ביטול
                  </button>
                  <button
                    onClick={handleRestoreById}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                  >
                    שחזר
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

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
    </div>
  );
};

export default Dashboard;