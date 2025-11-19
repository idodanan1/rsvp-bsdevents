import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useEventStore } from '../store/eventStore';
import { calculateEventStats, formatDate, formatDateTime, getStatusIcon, getStatusColor } from '../utils/helpers';
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
  RefreshCw,
  Download,
  Share2
} from 'lucide-react';

const ClientDashboard: React.FC = () => {
  const { eventId } = useParams<{ eventId: string }>();
  const { events, fetchEvents } = useEventStore();
  const [currentEvent, setCurrentEvent] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  useEffect(() => {
    if (eventId) {
      // Try to find event in current events first
      const event = events.find(e => e.id === eventId);
      if (event) {
        setCurrentEvent(event);
        setIsLoading(false);
      } else {
        // If event not found, try to load from localStorage directly (for public client dashboard)
        try {
          const stored = localStorage.getItem('rsvp-events-storage');
          if (stored) {
            const parsed = JSON.parse(stored);
            if (parsed.state && parsed.state.events) {
              // Find event by ID without filtering by userId (public access)
              const foundEvent = parsed.state.events.find((e: any) => e.id === eventId);
              if (foundEvent) {
                setCurrentEvent(foundEvent);
                setIsLoading(false);
                return;
              }
            }
          }
          
          // If still not found, try fetchEvents (will filter by userId if logged in)
          fetchEvents().then(() => {
            const foundEvent = events.find(e => e.id === eventId);
            if (foundEvent) {
              setCurrentEvent(foundEvent);
            }
            setIsLoading(false);
          });
        } catch (error) {
          console.error('Error loading event:', error);
          setIsLoading(false);
        }
      }
    }
  }, [eventId, events, fetchEvents]);

  const handleRefresh = () => {
    setIsLoading(true);
    try {
      // Try to load from localStorage directly (for public client dashboard)
      const stored = localStorage.getItem('rsvp-events-storage');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.state && parsed.state.events) {
          // Find event by ID without filtering by userId (public access)
          const foundEvent = parsed.state.events.find((e: any) => e.id === eventId);
          if (foundEvent) {
            setCurrentEvent(foundEvent);
            setLastUpdated(new Date());
            setIsLoading(false);
            return;
          }
        }
      }
      
      // If not found, try fetchEvents
      fetchEvents().then(() => {
        const event = events.find(e => e.id === eventId);
        if (event) {
          setCurrentEvent(event);
          setLastUpdated(new Date());
        }
        setIsLoading(false);
      });
    } catch (error) {
      console.error('Error refreshing event:', error);
      setIsLoading(false);
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
      lastUpdated: formatDateTime(lastUpdated)
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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">טוען נתונים...</p>
        </div>
      </div>
    );
  }

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
              <button
                onClick={handleRefresh}
                className="flex items-center space-x-2 px-3 py-2 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
                disabled={isLoading}
              >
                <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                <span>רענן</span>
              </button>
              
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
            
            <div className="text-right">
              <p className="text-sm text-gray-500">עודכן לאחרונה</p>
              <p className="text-sm font-medium text-gray-900">{formatDateTime(lastUpdated)}</p>
            </div>
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
                          {guest.firstName} {guest.lastName}
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
