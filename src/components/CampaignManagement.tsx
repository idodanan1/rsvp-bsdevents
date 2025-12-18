import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useEventStore } from '../store/eventStore';
import { useCampaignStore } from '../store/campaignStore';
import { formatDate, formatDateTime } from '../utils/helpers';
import { messageService } from '../services/messageService';
import { 
  ArrowRight, 
  Plus, 
  Send, 
  Clock, 
  CheckCircle,
  XCircle,
  MessageSquare,
  Phone,
  Image,
  Calendar,
  Users,
  BarChart3,
  Edit,
  Trash2,
  Play,
  Timer,
  Grid,
  List,
  X
} from 'lucide-react';
import ScheduleCalendar from './ScheduleCalendar';
import MessagePreview from './MessagePreview';

const CampaignManagement: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { events, currentEvent, setCurrentEvent, sendCampaign, sendTestMessage, scheduleCampaign: scheduleEventCampaign } = useEventStore();
  const { createCampaign, updateCampaign, deleteCampaign, scheduleCampaign, isLoading } = useCampaignStore();
  
  const [showCreateCampaign, setShowCreateCampaign] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<any>(null);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [schedulingCampaign, setSchedulingCampaign] = useState<any>(null);
  const [newCampaign, setNewCampaign] = useState({
    name: '',
    message: '',
    imageUrl: '',
    channel: 'whatsapp' as 'whatsapp',
    scheduledDate: '',
    scheduledTime: '',
    repeatType: 'none' as 'none' | 'daily' | 'weekly' | 'custom',
    repeatInterval: 1,
    repeatDays: [] as number[],
    repeatEndDate: ''
  });

  const [scheduleData, setScheduleData] = useState({
    scheduledDate: '',
    scheduledTime: '',
    repeatType: 'none' as 'none' | 'daily' | 'weekly' | 'custom',
    repeatInterval: 1,
    repeatDays: [] as number[],
    repeatEndDate: ''
  });

  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
  const [selectedCampaign, setSelectedCampaign] = useState<any>(null);

  const weekDays = [
    { id: 0, name: 'ראשון', short: 'א' },
    { id: 1, name: 'שני', short: 'ב' },
    { id: 2, name: 'שלישי', short: 'ג' },
    { id: 3, name: 'רביעי', short: 'ד' },
    { id: 4, name: 'חמישי', short: 'ה' },
    { id: 5, name: 'שישי', short: 'ו' },
    { id: 6, name: 'שבת', short: 'ש' }
  ];

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

  if (!currentEvent) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const eventCampaigns = currentEvent.campaigns || [];

  const handleCreateCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCampaign.name || !newCampaign.message) {
      return;
    }

    try {
      const scheduledDateTime = new Date(`${newCampaign.scheduledDate}T${newCampaign.scheduledTime}`);
      
      await createCampaign({
        eventId: currentEvent.id,
        name: newCampaign.name,
        message: newCampaign.message,
        imageUrl: newCampaign.imageUrl || undefined,
        channel: newCampaign.channel,
        scheduledDate: scheduledDateTime,
        status: 'draft',
        sentCount: 0,
        responseCount: 0
      });
      
      setNewCampaign({
        name: '',
        message: '',
        imageUrl: '',
        channel: 'whatsapp',
        scheduledDate: '',
        scheduledTime: '',
        repeatType: 'none',
        repeatInterval: 1,
        repeatDays: [],
        repeatEndDate: ''
      });
      setShowCreateCampaign(false);
    } catch (error) {
      console.error('Error creating campaign:', error);
    }
  };

  const handleEditCampaign = (campaign: any) => {
    setEditingCampaign(campaign);
    setNewCampaign({
      name: campaign.name,
      message: campaign.message,
      imageUrl: campaign.imageUrl || '',
      channel: campaign.channel,
      scheduledDate: formatDate(campaign.scheduledDate).split(' ')[0],
      scheduledTime: campaign.scheduledDate.toTimeString().slice(0, 5),
      repeatType: 'none',
      repeatInterval: 1,
      repeatDays: [],
      repeatEndDate: ''
    });
  };

  const handleUpdateCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCampaign || !newCampaign.name || !newCampaign.message) {
      return;
    }

    try {
      const scheduledDateTime = new Date(`${newCampaign.scheduledDate}T${newCampaign.scheduledTime}`);
      
      await updateCampaign(editingCampaign.id, {
        name: newCampaign.name,
        message: newCampaign.message,
        imageUrl: newCampaign.imageUrl || undefined,
        channel: newCampaign.channel,
        scheduledDate: scheduledDateTime
      });
      
      setEditingCampaign(null);
      setNewCampaign({
        name: '',
        message: '',
        imageUrl: '',
        channel: 'whatsapp',
        scheduledDate: '',
        scheduledTime: '',
        repeatType: 'none',
        repeatInterval: 1,
        repeatDays: [],
        repeatEndDate: ''
      });
    } catch (error) {
      console.error('Error updating campaign:', error);
    }
  };

  const handleSendCampaign = async (campaignId: string) => {
    try {
      if (!currentEvent) return;
      
      const result = await sendCampaign(currentEvent.id, campaignId);
      
      // Show detailed result message
      let message = '';
      if (result.successful > 0 && result.failed === 0) {
        message = `✅ הודעות נשלחו בהצלחה!\n\n${result.successful} הודעות נשלחו בהצלחה`;
      } else if (result.successful > 0 && result.failed > 0) {
        message = `⚠️ הודעות נשלחו חלקית\n\n✅ ${result.successful} הודעות נשלחו בהצלחה\n❌ ${result.failed} הודעות נכשלו`;
      } else {
        message = `❌ כל ההודעות נכשלו\n\n${result.failed} הודעות נכשלו`;
      }
      
      // Add error details if any failed
      if (result.failed > 0 && result.results) {
        const failedResults = result.results.filter(r => !r.success);
        if (failedResults.length > 0) {
          message += '\n\n🔍 פרטי שגיאות:';
          
          // Group errors by type to show patterns
          const errorTypes: Record<string, number> = {};
          failedResults.forEach(failed => {
            if (failed.error) {
              const errorKey = failed.error.substring(0, 100); // First 100 chars as key
              errorTypes[errorKey] = (errorTypes[errorKey] || 0) + 1;
            }
          });
          
          // Show unique error types first
          const uniqueErrors = Object.keys(errorTypes).slice(0, 3);
          uniqueErrors.forEach((errorKey, index) => {
            message += `\n\n${index + 1}. שגיאה נפוצה (${errorTypes[errorKey]} הודעות):`;
            const errorMsg = errorKey.length > 400 
              ? errorKey.substring(0, 400) + '...' 
              : errorKey;
            message += `\n   ${errorMsg}`;
          });
          
          // Show first 3 individual errors
          failedResults.slice(0, 3).forEach((failed, index) => {
            message += `\n\n${index + 1 + uniqueErrors.length}. ${failed.recipientName} (${failed.phoneNumber}):`;
            if (failed.error) {
              // Show first 300 characters of error to avoid too long message
              const errorMsg = failed.error.length > 300 
                ? failed.error.substring(0, 300) + '...' 
                : failed.error;
              message += `\n   ${errorMsg}`;
            }
          });
          
          if (failedResults.length > 3) {
            message += `\n\n...ועוד ${failedResults.length - 3} שגיאות נוספות`;
          }
          
          // Add troubleshooting tips
          message += '\n\n💡 טיפים לפתרון:';
          message += '\n1. בדוק את פרטי האימות של WhatsApp/Twilio';
          message += '\n2. ודא שהתבנית ב-Meta Business Manager מאושרת';
          message += '\n3. בדוק שהתמונה (אם נדרשת) היא HTTPS תקין';
          message += '\n4. פתח את הקונסול בדפדפן לפרטים נוספים';
        }
      }
      
      // Use a more user-friendly alert or console log
      console.error('📊 Campaign send result:', result);
      alert(message);
      
      // No need to reload - the state will update automatically
    } catch (error: any) {
      console.error('Error sending campaign:', error);
      const errorMessage = error?.message || error?.toString() || 'שגיאה לא ידועה';
      alert(`❌ שגיאה בשליחת ההודעות\n\n🔍 שגיאה: ${errorMessage}`);
    }
  };

  const handleSendTestMessage = async (campaign: any) => {
    const phoneNumber = prompt('הזן מספר טלפון לבדיקה:');
    if (!phoneNumber) return;

    try {
      const success = await sendTestMessage(phoneNumber, campaign.message, 'whatsapp');
      
      if (success) {
        alert('הודעת בדיקה נשלחה בהצלחה!');
      } else {
        alert('שגיאה בשליחת הודעת הבדיקה');
      }
    } catch (error) {
      console.error('Error sending test message:', error);
      alert('שגיאה בשליחת הודעת הבדיקה');
    }
  };

  const handleScheduleCampaign = (campaign: any) => {
    setSchedulingCampaign(campaign);
    
    // Get current date/time or use campaign's scheduled date if exists
    const now = new Date();
    const scheduledDate = campaign.scheduledDate ? new Date(campaign.scheduledDate) : now;
    
    // Format date as YYYY-MM-DD
    const dateStr = scheduledDate.toISOString().split('T')[0];
    
    // Format time as HH:MM
    const timeStr = scheduledDate.toTimeString().slice(0, 5);
    
    setScheduleData({
      scheduledDate: dateStr,
      scheduledTime: timeStr,
      repeatType: 'none',
      repeatInterval: 1,
      repeatDays: [],
      repeatEndDate: ''
    });
    setShowScheduleModal(true);
  };

  const handleSaveSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!schedulingCampaign || !currentEvent) return;

    try {
      const scheduledDateTime = new Date(`${scheduleData.scheduledDate}T${scheduleData.scheduledTime}`);
      
      // Check if this is an event campaign (has eventId) or a standalone campaign
      if (schedulingCampaign.eventId || currentEvent.campaigns?.some(c => c.id === schedulingCampaign.id)) {
        // Schedule through eventStore
        await scheduleEventCampaign(currentEvent.id, schedulingCampaign.id, scheduledDateTime);
        console.log(`✅ Scheduled event campaign: ${schedulingCampaign.name} for ${scheduledDateTime.toLocaleString('he-IL')}`);
      } else {
        // Schedule through campaignStore (standalone campaign)
        await scheduleCampaign(schedulingCampaign.id, scheduledDateTime);
        console.log(`✅ Scheduled standalone campaign: ${schedulingCampaign.name} for ${scheduledDateTime.toLocaleString('he-IL')}`);
      }
      
      setShowScheduleModal(false);
      setSchedulingCampaign(null);
    } catch (error) {
      console.error('Error scheduling campaign:', error);
      alert('שגיאה בתזמון הקמפיין. אנא נסה שוב.');
    }
  };

  const handleDeleteCampaign = async (campaignId: string) => {
    if (window.confirm('האם אתה בטוח שברצונך למחוק את הקמפיין?')) {
      try {
        await deleteCampaign(campaignId);
      } catch (error) {
        console.error('Error deleting campaign:', error);
      }
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'draft': return <MessageSquare className="w-4 h-4 text-gray-500" />;
      case 'scheduled': return <Clock className="w-4 h-4 text-yellow-500" />;
      case 'sending': return <Send className="w-4 h-4 text-blue-500" />;
      case 'sent': return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'failed': return <XCircle className="w-4 h-4 text-red-500" />;
      default: return <MessageSquare className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'draft': return 'טיוטה';
      case 'scheduled': return 'מתוזמן';
      case 'sending': return 'נשלח';
      case 'sent': return 'נשלח';
      case 'failed': return 'נכשל';
      default: return 'לא ידוע';
    }
  };

  const getChannelIcon = (channel: string) => {
    return channel === 'whatsapp' ? 
      <MessageSquare className="w-4 h-4 text-green-600" /> : 
      <Phone className="w-4 h-4 text-blue-600" />;
  };

  const toggleRepeatDay = (dayId: number) => {
    setScheduleData(prev => ({
      ...prev,
      repeatDays: prev.repeatDays.includes(dayId)
        ? prev.repeatDays.filter(id => id !== dayId)
        : [...prev.repeatDays, dayId]
    }));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigate(`/event/${currentEvent.id}/manage`)}
            className="flex items-center text-gray-600 hover:text-gray-800"
          >
            <ArrowRight className="w-5 h-5 ml-2" />
            חזרה לניהול אירוע
          </button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">ניהול קמפיינים - <span className="text-yellow-500">בס"ד אירועים</span></h1>
            <p className="text-gray-600">{currentEvent.coupleName}</p>
            <p className="text-sm text-teal-600 font-medium">כל האורחים יקבלו WhatsApp • אם נכשל - ישלח SMS אוטומטית</p>
            <p className="text-xs text-gray-500 mt-1">5 תזמונים ברירת מחדל נוצרו אוטומטית - ניתן לערוך ולהוסיף</p>
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mt-3">
              <p className="text-yellow-800 text-sm font-medium">🚀 שליחת הודעות אמיתית מופעלת!</p>
              <p className="text-yellow-700 text-xs mt-1">
                במצב פיתוח - ההודעות מדומות. להפעלה אמיתית:
              </p>
           <div className="bg-green-50 border border-green-200 rounded p-2 mt-2">
             <p className="text-green-800 text-xs font-medium">📱 WhatsApp Business (ברירת מחדל):</p>
             <p className="text-green-700 text-xs mt-1">1. הרשם ב-https://business.whatsapp.com</p>
             <p className="text-green-700 text-xs mt-1">2. קבל Access Token</p>
             <p className="text-green-700 text-xs mt-1">3. צור קובץ .env עם המפתח</p>
             <p className="text-green-700 text-xs mt-1">4. WhatsApp יישלח מ: +1 (415) 523-8886</p>
             <p className="text-green-700 text-xs mt-1">5. WhatsApp ראשון, SMS כגיבוי</p>
           </div>
           <div className="bg-blue-50 border border-blue-200 rounded p-2 mt-2">
             <p className="text-blue-800 text-xs font-medium">📞 SMS עם Twilio (גיבוי):</p>
             <p className="text-blue-700 text-xs mt-1">1. הרשם ב-https://www.twilio.com (חינם - $15 קרדיט)</p>
             <p className="text-blue-700 text-xs mt-1">2. קבל Account SID ו-Auth Token</p>
             <p className="text-blue-700 text-xs mt-1">3. צור קובץ .env עם המפתחות</p>
             <p className="text-blue-700 text-xs mt-1">4. SMS יישלחו מ: +1 (234) 704-0727</p>
           </div>
            </div>
          </div>
        </div>
        
        <div className="flex items-center space-x-3">
          <div className="flex items-center bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-md ${viewMode === 'list' ? 'bg-white shadow-sm' : 'text-gray-600'}`}
            >
              <List className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('calendar')}
              className={`p-2 rounded-md ${viewMode === 'calendar' ? 'bg-white shadow-sm' : 'text-gray-600'}`}
            >
              <Grid className="w-4 h-4" />
            </button>
          </div>
          
          <button
            onClick={() => setShowCreateCampaign(true)}
            className="btn-primary flex items-center space-x-2"
          >
            <Plus className="w-4 h-4" />
            <span>קמפיין חדש</span>
          </button>
        </div>
      </div>

      {/* Campaign Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="stat-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">סה"כ קמפיינים</p>
              <p className="text-3xl font-bold text-blue-600">{eventCampaigns?.length || 0}</p>
            </div>
            <BarChart3 className="w-8 h-8 text-blue-600" />
          </div>
        </div>

        <div className="stat-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">נשלחו</p>
              <p className="text-3xl font-bold text-green-600">
                {eventCampaigns?.filter(c => c.status === 'sent').length || 0}
              </p>
            </div>
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
        </div>

        <div className="stat-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">מתוזמנים</p>
              <p className="text-3xl font-bold text-yellow-600">
                {eventCampaigns?.filter(c => c.status === 'scheduled').length || 0}
              </p>
            </div>
            <Clock className="w-8 h-8 text-yellow-600" />
          </div>
        </div>

        <div className="stat-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">הודעות נשלחו</p>
              <p className="text-3xl font-bold text-purple-600">
                {eventCampaigns?.reduce((sum, c) => sum + (c.sentCount || 0), 0) || 0}
              </p>
            </div>
            <Send className="w-8 h-8 text-purple-600" />
          </div>
        </div>
      </div>

      {/* Create/Edit Campaign Modal */}
      {(showCreateCampaign || editingCampaign) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4">
              {editingCampaign ? 'עריכת קמפיין' : 'יצירת קמפיין חדש'}
            </h3>
            <form onSubmit={editingCampaign ? handleUpdateCampaign : handleCreateCampaign} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    שם הקמפיין
                  </label>
                  <input
                    type="text"
                    value={newCampaign.name}
                    onChange={(e) => setNewCampaign({...newCampaign, name: e.target.value})}
                    className="input-field"
                    placeholder="הזן שם לקמפיין"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    ערוץ שליחה
                  </label>
                  <div className="flex items-center text-sm text-gray-600 py-2">
                    <MessageSquare className="w-4 h-4 text-green-600 ml-1" />
                    <span>וואטסאפ</span>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  תוכן ההודעה
                </label>
                <textarea
                  value={newCampaign.message}
                  onChange={(e) => setNewCampaign({...newCampaign, message: e.target.value})}
                  className="input-field h-32"
                  placeholder="הזן את תוכן ההודעה... ניתן להשתמש במשתנים: {firstName}, {coupleName}, {groomName}, {brideName}, {eventType}, {eventDate}, {eventTime}, {venue}"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  משתנים זמינים: {'{firstName}'}, {'{coupleName}'}, {'{groomName}'}, {'{brideName}'}, {'{eventType}'}, {'{eventDate}'}, {'{eventTime}'}, {'{venue}'}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  קישור לתמונה (אופציונלי)
                </label>
                <input
                  type="url"
                  value={newCampaign.imageUrl}
                  onChange={(e) => setNewCampaign({...newCampaign, imageUrl: e.target.value})}
                  className="input-field"
                  placeholder="https://example.com/image.jpg"
                />
                <p className="text-xs text-gray-500 mt-1">
                  התמונה תוצג בכל ההודעות שנשלחו עם הקמפיין הזה
                </p>
                {newCampaign.imageUrl && (
                  <div className="mt-2">
                    <img 
                      src={newCampaign.imageUrl} 
                      alt="תצוגה מקדימה" 
                      className="w-32 h-24 object-cover rounded-lg border"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    תאריך שליחה
                  </label>
                  <input
                    type="date"
                    value={newCampaign.scheduledDate}
                    onChange={(e) => setNewCampaign({...newCampaign, scheduledDate: e.target.value})}
                    className="input-field"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    שעת שליחה
                  </label>
                  <input
                    type="time"
                    value={newCampaign.scheduledTime}
                    onChange={(e) => setNewCampaign({...newCampaign, scheduledTime: e.target.value})}
                    className="input-field"
                    required
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateCampaign(false);
                    setEditingCampaign(null);
                    setNewCampaign({
                      name: '',
                      message: '',
                      imageUrl: '',
                      channel: 'whatsapp',
                      scheduledDate: '',
                      scheduledTime: '',
                      repeatType: 'none',
                      repeatInterval: 1,
                      repeatDays: [],
                      repeatEndDate: ''
                    });
                  }}
                  className="btn-secondary"
                >
                  ביטול
                </button>
                <button type="submit" className="btn-primary">
                  {editingCampaign ? 'עדכן' : 'צור קמפיין'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Schedule Modal */}
      {showScheduleModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4">תזמון קמפיין</h3>
            <form onSubmit={handleSaveSchedule} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    תאריך שליחה
                  </label>
                  <input
                    type="date"
                    value={scheduleData.scheduledDate}
                    onChange={(e) => setScheduleData({...scheduleData, scheduledDate: e.target.value})}
                    className="input-field"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    שעת שליחה
                  </label>
                  <input
                    type="time"
                    value={scheduleData.scheduledTime}
                    onChange={(e) => setScheduleData({...scheduleData, scheduledTime: e.target.value})}
                    className="input-field"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  חזרה
                </label>
                <select
                  value={scheduleData.repeatType}
                  onChange={(e) => setScheduleData({...scheduleData, repeatType: e.target.value as any})}
                  className="input-field"
                >
                  <option value="none">ללא חזרה</option>
                  <option value="daily">יומי</option>
                  <option value="weekly">שבועי</option>
                  <option value="custom">מותאם אישית</option>
                </select>
              </div>

              {scheduleData.repeatType === 'custom' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    ימי שבוע
                  </label>
                  <div className="grid grid-cols-7 gap-2">
                    {weekDays.map(day => (
                      <button
                        key={day.id}
                        type="button"
                        onClick={() => toggleRepeatDay(day.id)}
                        className={`p-2 text-sm rounded-lg border ${
                          scheduleData.repeatDays.includes(day.id)
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'bg-gray-100 text-gray-700 border-gray-300'
                        }`}
                      >
                        {day.short}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {scheduleData.repeatType !== 'none' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      תאריך סיום
                    </label>
                    <input
                      type="date"
                      value={scheduleData.repeatEndDate}
                      onChange={(e) => setScheduleData({...scheduleData, repeatEndDate: e.target.value})}
                      className="input-field"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      מרווח (ימים)
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={scheduleData.repeatInterval}
                      onChange={(e) => setScheduleData({...scheduleData, repeatInterval: parseInt(e.target.value) || 1})}
                      className="input-field"
                    />
                  </div>
                </div>
              )}

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowScheduleModal(false);
                    setSchedulingCampaign(null);
                  }}
                  className="btn-secondary"
                >
                  ביטול
                </button>
                <button type="submit" className="btn-primary flex items-center space-x-2">
                  <Timer className="w-4 h-4" />
                  <span>תזמן</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Campaigns List or Calendar */}
      <div className="space-y-4">
        {(!eventCampaigns || eventCampaigns.length === 0) ? (
          <div className="text-center py-12">
            <MessageSquare className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-medium text-gray-900 mb-2">אין קמפיינים עדיין</h3>
            <p className="text-gray-600 mb-6">התחל ביצירת הקמפיין הראשון שלך</p>
            <button
              onClick={() => setShowCreateCampaign(true)}
              className="btn-primary inline-flex items-center space-x-2"
            >
              <Plus className="w-5 h-5" />
              <span>צור קמפיין חדש</span>
            </button>
          </div>
        ) : viewMode === 'calendar' ? (
          <ScheduleCalendar
            campaigns={eventCampaigns}
            onCampaignClick={(campaign) => setSelectedCampaign(campaign)}
            onDateClick={(date) => {
              setNewCampaign(prev => ({
                ...prev,
                scheduledDate: date.toISOString().split('T')[0],
                scheduledTime: '10:00'
              }));
              setShowCreateCampaign(true);
            }}
          />
        ) : (
          eventCampaigns.map((campaign) => (
            <div key={campaign.id} className="card">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <h3 className="text-lg font-semibold text-gray-900">{campaign.name}</h3>
                    <div className="flex items-center space-x-1">
                      {getStatusIcon(campaign.status)}
                      <span className="text-sm text-gray-600">{getStatusText(campaign.status)}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      {getChannelIcon(campaign.channel)}
                      <span className="text-sm text-gray-600">
                        {campaign.channel === 'whatsapp' ? 'וואטסאפ' : 'SMS'}
                      </span>
                    </div>
                  </div>
                  
                  <div className="mb-3">
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-3">
                      <div className="flex items-center space-x-2 mb-2">
                        <MessageSquare className="w-4 h-4 text-blue-600" />
                        <span className="text-sm font-medium text-blue-800">הערה חשובה</span>
                      </div>
                      <p className="text-xs text-blue-700">
                        הקישור בדף התגובה יהיה אישי לכל אורח (כולל מזהה ייחודי) כדי שהעדכונים יסתנכרנו במערכת.
                      </p>
                    </div>
                    <MessagePreview campaign={campaign} eventId={id!} />
                  </div>
                  
                  {campaign.imageUrl && (
                    <div className="mb-3">
                      <div className="flex items-center space-x-2 mb-2">
                        <Image className="w-4 h-4 text-gray-500" />
                        <span className="text-sm text-gray-600">כולל תמונה</span>
                      </div>
                      <img 
                        src={campaign.imageUrl} 
                        alt="תצוגה מקדימה" 
                        className="w-24 h-18 object-cover rounded-lg border"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                    </div>
                  )}
                  
                  <div className="flex items-center space-x-6 text-sm text-gray-500">
                    <div className="flex items-center space-x-1">
                      <Calendar className="w-4 h-4" />
                      <span>{formatDateTime(campaign.scheduledDate)}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Users className="w-4 h-4" />
                      <span>{campaign.sentCount} נשלחו</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <CheckCircle className="w-4 h-4" />
                      <span>{campaign.responseCount} תגובות</span>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handleSendTestMessage(campaign)}
                    className="btn-secondary text-sm flex items-center space-x-1"
                    disabled={isLoading}
                    title="שלח הודעת בדיקה"
                  >
                    <MessageSquare className="w-4 h-4" />
                    <span>בדיקה</span>
                  </button>
                  
                  {campaign.status === 'draft' && (
                  <button
                    onClick={() => handleSendCampaign(campaign.id)}
                    className="btn-primary text-sm flex items-center space-x-1"
                    disabled={isLoading}
                  >
                    <Play className="w-4 h-4" />
                    <span>שלח עכשיו</span>
                  </button>
                  )}
                  
                  {campaign.status === 'scheduled' && (
                    <button
                      onClick={() => handleSendCampaign(campaign.id)}
                      className="btn-warning text-sm flex items-center space-x-1"
                      disabled={isLoading}
                    >
                      <Play className="w-4 h-4" />
                      <span>שלח עכשיו</span>
                    </button>
                  )}

                  <button
                    onClick={() => handleScheduleCampaign(campaign)}
                    className="btn-secondary text-sm flex items-center space-x-1"
                    disabled={isLoading}
                  >
                    <Timer className="w-4 h-4" />
                    <span>תזמן</span>
                  </button>

                  <button
                    onClick={() => handleEditCampaign(campaign)}
                    className="text-blue-600 hover:text-blue-900 p-1"
                    title="ערוך"
                  >
                    <Edit className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => handleDeleteCampaign(campaign.id)}
                    className="text-red-600 hover:text-red-900 p-1"
                    title="מחק"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Campaign Details Modal */}
      {selectedCampaign && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">{selectedCampaign.name}</h3>
              <button
                onClick={() => setSelectedCampaign(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-3">
              <div>
                <p className="text-sm text-gray-600">תוכן ההודעה:</p>
                <p className="text-gray-900">{selectedCampaign.message}</p>
              </div>
              
              <div className="flex items-center space-x-4 text-sm">
                <div className="flex items-center space-x-1">
                  {getChannelIcon(selectedCampaign.channel)}
                  <span>וואטסאפ</span>
                </div>
                <div className="flex items-center space-x-1">
                  <Clock className="w-4 h-4 text-gray-500" />
                  <span>{formatDateTime(selectedCampaign.scheduledDate)}</span>
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                <span className={`px-2 py-1 rounded-full text-xs ${getStatusIcon(selectedCampaign.status)}`}>
                  {getStatusText(selectedCampaign.status)}
                </span>
              </div>
              
              <div className="flex justify-end space-x-2 pt-4">
                <button
                  onClick={() => {
                    setSelectedCampaign(null);
                    handleEditCampaign(selectedCampaign);
                  }}
                  className="btn-secondary text-sm"
                >
                  ערוך
                </button>
                <button
                  onClick={() => {
                    setSelectedCampaign(null);
                    handleScheduleCampaign(selectedCampaign);
                  }}
                  className="btn-primary text-sm"
                >
                  תזמן
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CampaignManagement;