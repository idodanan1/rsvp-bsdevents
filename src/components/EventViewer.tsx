import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useEventStore } from '../store/eventStore';
import { calculateEventStats, formatDate, formatDateTime, getStatusIcon, getStatusColor, formatFullName } from '../utils/helpers';
import { 
  ArrowRight, 
  Users, 
  CheckCircle,
  XCircle,
  HelpCircle,
  Clock,
  MessageSquare,
  Phone,
  Calendar,
  MapPin,
  Upload,
  Image,
  Plus,
  X,
  Edit
} from 'lucide-react';

const EventViewer: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { events, currentEvent, setCurrentEvent, updateEvent } = useEventStore();
  
  const [showImageUpload, setShowImageUpload] = useState(false);
  const [newImageUrl, setNewImageUrl] = useState('');
  const [editingImageIndex, setEditingImageIndex] = useState<number | null>(null);

  useEffect(() => {
    if (id) {
      const event = events.find(e => e.id === id);
      if (event) {
        setCurrentEvent(event);
      } else {
        navigate('/');
      }
    }
  }, [id, events, setCurrentEvent, navigate]);

  // Image management functions
  const handleAddImage = async () => {
    if (!newImageUrl.trim() || !currentEvent) return;
    
    const updatedImages = [...(currentEvent.eventImages || []), newImageUrl];
    await updateEvent(currentEvent.id, { eventImages: updatedImages });
    setNewImageUrl('');
    setShowImageUpload(false);
  };

  const handleEditImage = async (index: number) => {
    if (!newImageUrl.trim() || !currentEvent) return;
    
    const updatedImages = [...(currentEvent.eventImages || [])];
    updatedImages[index] = newImageUrl;
    await updateEvent(currentEvent.id, { eventImages: updatedImages });
    setNewImageUrl('');
    setEditingImageIndex(null);
  };

  const handleDeleteImage = async (index: number) => {
    if (!currentEvent) return;
    
    const updatedImages = [...(currentEvent.eventImages || [])];
    updatedImages.splice(index, 1);
    await updateEvent(currentEvent.id, { eventImages: updatedImages });
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const formData = new FormData();
        formData.append('image', file);
        
        const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'https://whatsapp-backend-enfz.onrender.com';
        const response = await fetch(`${BACKEND_URL}/api/upload/image`, {
          method: 'POST',
          body: formData
        });
        
        if (response.ok) {
          const data = await response.json();
          setNewImageUrl(data.imageUrl);
          // Auto-add the image to the event
          if (currentEvent && data.imageUrl) {
            const updatedImages = [...(currentEvent.eventImages || []), data.imageUrl];
            await updateEvent(currentEvent.id, { eventImages: updatedImages });
            setShowImageUpload(false);
            setNewImageUrl('');
          }
        } else {
          alert('שגיאה בהעלאת התמונה');
        }
      } catch (error) {
        console.error('Error uploading image:', error);
        alert('שגיאה בהעלאת התמונה');
      }
    }
  };

  if (!currentEvent) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const stats = calculateEventStats(currentEvent);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigate('/')}
            className="flex items-center text-gray-600 hover:text-gray-800"
          >
            <ArrowRight className="w-5 h-5 ml-2" />
            חזרה לדשבורד
          </button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{currentEvent.coupleName}</h1>
            <p className="text-gray-600 flex items-center">
              <Calendar className="w-4 h-4 ml-1" />
              {formatDate(currentEvent.eventDate)} - {currentEvent.eventTime}
            </p>
            <p className="text-gray-600 flex items-center">
              <MapPin className="w-4 h-4 ml-1" />
              {currentEvent.venue}
            </p>
            <p className="text-sm text-yellow-500 font-medium">בס"ד אירועים - אישורי הגעה וסידורי הושבה</p>
          </div>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="stat-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">סה"כ מוזמנים</p>
              <p className="text-3xl font-bold text-blue-600">{stats.totalGuests}</p>
            </div>
            <Users className="w-8 h-8 text-blue-600" />
          </div>
        </div>

        <div className="stat-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">מגיעים</p>
              <p className="text-3xl font-bold text-green-600">{stats.confirmed}</p>
            </div>
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
        </div>

        <div className="stat-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">לא מגיעים</p>
              <p className="text-3xl font-bold text-red-600">{stats.declined}</p>
            </div>
            <XCircle className="w-8 h-8 text-red-600" />
          </div>
        </div>

        <div className="stat-card">
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
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">פירוט תגובות</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <CheckCircle className="w-5 h-5 text-green-600 ml-2" />
                <span className="text-gray-700">מגיעים</span>
              </div>
              <span className="font-semibold text-green-600">{stats.confirmed}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <XCircle className="w-5 h-5 text-red-600 ml-2" />
                <span className="text-gray-700">לא מגיעים</span>
              </div>
              <span className="font-semibold text-red-600">{stats.declined}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <HelpCircle className="w-5 h-5 text-yellow-600 ml-2" />
                <span className="text-gray-700">אולי מגיעים</span>
              </div>
              <span className="font-semibold text-yellow-600">{stats.maybe}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <Clock className="w-5 h-5 text-gray-600 ml-2" />
                <span className="text-gray-700">לא ענו</span>
              </div>
              <span className="font-semibold text-gray-600">{stats.pending}</span>
            </div>
          </div>
        </div>

        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">ערוצי תקשורת</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <MessageSquare className="w-5 h-5 text-green-600 ml-2" />
                <span className="text-gray-700">וואטסאפ</span>
              </div>
              <span className="font-semibold">
                {currentEvent.guests.filter(g => g.channel === 'whatsapp').length}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <Phone className="w-5 h-5 text-blue-600 ml-2" />
                <span className="text-gray-700">SMS</span>
              </div>
              <span className="font-semibold">
                {currentEvent.guests.filter(g => g.channel === 'sms').length}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <Users className="w-5 h-5 text-gray-600 ml-2" />
                <span className="text-gray-700">ידני</span>
              </div>
              <span className="font-semibold">
                {currentEvent.guests.filter(g => g.channel === 'manual').length}
              </span>
            </div>
          </div>
        </div>

        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">סטטיסטיקות נוספות</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-gray-700">אחוז תגובה</span>
              <span className="font-semibold text-blue-600">{stats.responseRate}%</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-700">אחוז הגעה</span>
              <span className="font-semibold text-green-600">{stats.attendanceRate}%</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-700">סה"כ מוזמנים</span>
              <span className="font-semibold text-purple-600">{stats.totalGuests}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Event Images Gallery */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center">
            <Image className="w-5 h-5 ml-2" />
            תמונות האירוע
          </h3>
          <button
            onClick={() => setShowImageUpload(true)}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4 ml-2" />
            הוסף תמונה
          </button>
        </div>

        {/* Image Upload Modal */}
        {showImageUpload && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-lg font-semibold">הוסף תמונה חדשה</h4>
                <button
                  onClick={() => {
                    setShowImageUpload(false);
                    setNewImageUrl('');
                  }}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    העלה קובץ תמונה
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                
                <div className="text-center text-gray-500">או</div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    קישור לתמונה
                  </label>
                  <input
                    type="url"
                    value={newImageUrl}
                    onChange={(e) => setNewImageUrl(e.target.value)}
                    placeholder="https://example.com/image.jpg"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                
                {newImageUrl && (
                  <div className="mt-3">
                    <p className="text-sm font-medium text-gray-700 mb-2">תצוגה מקדימה:</p>
                    <div className="border border-gray-300 rounded-lg p-2 bg-gray-50">
                      <img
                        src={newImageUrl}
                        alt="תצוגה מקדימה"
                        className="max-w-full h-32 object-contain rounded"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                    </div>
                  </div>
                )}
                
                <div className="flex justify-end space-x-3 space-x-reverse">
                  <button
                    onClick={() => {
                      setShowImageUpload(false);
                      setNewImageUrl('');
                    }}
                    className="px-4 py-2 text-gray-600 hover:text-gray-800"
                  >
                    ביטול
                  </button>
                  <button
                    onClick={handleAddImage}
                    disabled={!newImageUrl.trim()}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    הוסף תמונה
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Images Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {currentEvent.eventImages?.map((imageUrl, index) => (
            <div key={index} className="relative group">
              <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden">
                <img
                  src={imageUrl}
                  alt={`תמונת אירוע ${index + 1}`}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
              </div>
              
              {/* Image Actions */}
              <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="flex space-x-1 space-x-reverse">
                  <button
                    onClick={() => {
                      setEditingImageIndex(index);
                      setNewImageUrl(imageUrl);
                    }}
                    className="p-1 bg-white rounded-full shadow-md hover:bg-gray-50"
                    title="ערוך תמונה"
                  >
                    <Edit className="w-4 h-4 text-gray-600" />
                  </button>
                  <button
                    onClick={() => handleDeleteImage(index)}
                    className="p-1 bg-white rounded-full shadow-md hover:bg-red-50"
                    title="מחק תמונה"
                  >
                    <X className="w-4 h-4 text-red-600" />
                  </button>
                </div>
              </div>
            </div>
          ))}
          
          {/* Empty State */}
          {(!currentEvent.eventImages || currentEvent.eventImages.length === 0) && (
            <div className="col-span-full text-center py-12">
              <Image className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500 mb-4">אין תמונות עדיין</p>
              <button
                onClick={() => setShowImageUpload(true)}
                className="flex items-center mx-auto px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus className="w-4 h-4 ml-2" />
                הוסף תמונה ראשונה
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Guests List */}
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">רשימת מוזמנים</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  מוזמן
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  טלפון
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  מספר מוזמנים
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  סטטוס אישור
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  הגעה בפועל
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
              {currentEvent.guests.map((guest) => (
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
                    {guest.phoneNumber}
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
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <span className={`text-sm font-medium ${getStatusColor(guest.actualAttendance || 'not_marked')}`}>
                        {getStatusIcon(guest.actualAttendance || 'not_marked')} {guest.actualAttendance === 'attended' ? 'הגיע' :
                         guest.actualAttendance === 'not_attended' ? 'לא הגיע' : 'לא סומן'}
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
  );
};

export default EventViewer;
