import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useEventStore } from '../store/eventStore';
import { useUserStore } from '../store/userStore';
import { toast } from 'react-hot-toast';
import { Calendar, User, Phone, Mail, MapPin, ArrowRight, ArrowLeft } from 'lucide-react';

const CreateEvent: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { createEvent, isLoading } = useEventStore();
  const user = useUserStore(state => state.user);
  const checkCredits = useUserStore(state => state.checkCredits);
  const deductCredits = useUserStore(state => state.deductCredits);
  
  const [formData, setFormData] = useState({
    groomName: '',
    brideName: '',
    eventDate: '',
    eventTime: '',
    venue: '',
    couplePhone: '',
    coupleEmail: '',
    eventType: 'wedding' as 'wedding' | 'bar_mitzvah' | 'bat_mitzvah' | 'birthday' | 'anniversary' | 'other',
    eventTypeHebrew: 'חתונה',
    invitationImageUrl: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // קבלת תאריך מה-URL אם קיים
  useEffect(() => {
    const dateFromUrl = searchParams.get('date');
    if (dateFromUrl) {
      setFormData(prev => ({
        ...prev,
        eventDate: dateFromUrl
      }));
    }
  }, [searchParams]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const handleEventTypeChange = (eventType: string) => {
    const eventTypeMap: Record<string, string> = {
      'wedding': 'חתונה',
      'bar_mitzvah': 'בר מצווה',
      'bat_mitzvah': 'בת מצווה',
      'birthday': 'יום הולדת',
      'anniversary': 'יום נישואין',
      'other': 'אחר'
    };
    
    setFormData(prev => ({
      ...prev,
      eventType: eventType as any,
      eventTypeHebrew: eventTypeMap[eventType] || 'אחר'
    }));
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.groomName.trim()) {
      newErrors.groomName = 'שם החתן הוא שדה חובה';
    }

    if (!formData.brideName.trim()) {
      newErrors.brideName = 'שם הכלה הוא שדה חובה';
    }

    if (!formData.eventDate) {
      newErrors.eventDate = 'תאריך האירוע הוא שדה חובה';
    } else {
      const eventDate = new Date(formData.eventDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      if (eventDate < today) {
        newErrors.eventDate = 'תאריך האירוע לא יכול להיות בעבר';
      }
    }

    if (!formData.eventTime) {
      newErrors.eventTime = 'שעת האירוע היא שדה חובה';
    }

    if (!formData.venue.trim()) {
      newErrors.venue = 'מיקום האירוע הוא שדה חובה';
    }

    if (!formData.couplePhone.trim()) {
      newErrors.couplePhone = 'מספר טלפון הוא שדה חובה';
    } else {
      const phoneRegex = /^(\+972|0)?[2-9]\d{8}$/;
      const cleanedPhone = formData.couplePhone.replace(/\D/g, '');
      if (!phoneRegex.test(cleanedPhone)) {
        newErrors.couplePhone = 'מספר טלפון לא תקין';
      }
    }

    if (formData.coupleEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.coupleEmail)) {
      newErrors.coupleEmail = 'כתובת אימייל לא תקינה';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      toast.error('אנא תקן את השגיאות בטופס');
      return;
    }

    try {
      // CRITICAL FIX: Check if user is logged in - double check
      const currentUser = useUserStore.getState().user;
      const isAuth = useUserStore.getState().isAuthenticated;
      
      if (!user || !currentUser || !isAuth) {
        console.error('❌ User not authenticated - redirecting to login');
        toast.error('אנא התחבר תחילה');
        useUserStore.getState().logout(); // Clear any stale state
        navigate('/login');
        return;
      }

      // CRITICAL FIX: Verify user has credits property
      if (typeof currentUser.credits !== 'number') {
        console.error('❌ Invalid user credits:', currentUser);
        toast.error('שגיאה בנתוני המשתמש. אנא התחבר מחדש.');
        useUserStore.getState().logout();
        navigate('/login');
        return;
      }

      // Calculate credits needed (minimum 50)
      const creditsNeeded = 50; // Minimum for now, can be based on guest count later

      // CRITICAL FIX: Check if user has enough credits - use currentUser
      if (!checkCredits(creditsNeeded)) {
        toast.error(`אין לך מספיק רשומות. נדרשות ${creditsNeeded} רשומות. יתרה נוכחית: ${currentUser.credits}`);
        navigate('/pricing');
        return;
      }

      const eventData = {
        coupleName: `${formData.groomName} & ${formData.brideName}`,
        groomName: formData.groomName,
        brideName: formData.brideName,
        eventDate: new Date(formData.eventDate),
        eventTime: formData.eventTime,
        venue: formData.venue,
        couplePhone: formData.couplePhone,
        coupleEmail: formData.coupleEmail || undefined,
        eventType: formData.eventType,
        eventTypeHebrew: formData.eventTypeHebrew,
        invitationImageUrl: formData.invitationImageUrl || undefined,
        guests: [],
        campaigns: [],
        tables: [],
        isActive: true
      };

      // Deduct credits before creating event
      const success = await deductCredits(creditsNeeded);
      if (!success) {
        toast.error('שגיאה בניכוי רשומות');
        return;
      }

      await createEvent(eventData);
      toast.success(`האירוע נוצר בהצלחה! נוכו ${creditsNeeded} רשומות מהחשבון שלך.`);
      navigate('/');
    } catch (error) {
      toast.error('שגיאה ביצירת האירוע');
    }
  };

  const handleCancel = () => {
    navigate('/');
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-8">
        <button
          onClick={handleCancel}
          className="flex items-center text-gray-600 hover:text-gray-800 mb-4"
        >
          <ArrowRight className="w-5 h-5 ml-2" />
          חזרה לדשבורד
        </button>
        
        <h1 className="text-3xl font-bold text-gray-900">יצירת אירוע חדש - <span className="text-yellow-500">בס"ד אירועים</span></h1>
        <p className="text-gray-600 mt-2">מלא את הפרטים הבסיסיים של האירוע</p>
        <div className="bg-teal-50 border border-teal-200 rounded-lg p-4 mt-4">
          <p className="text-teal-800 font-medium">✨ תזמונים אוטומטיים</p>
          <p className="text-teal-700 text-sm mt-1">
            יווצרו 5 תזמונים אוטומטיים: 3 סבבי הזמנות (30, 14, 7 ימים לפני), תזכורת לאירוע (ניתנת לעריכת מועד), והודעת תודה למגיעים (יום אחרי).
            תוכל לערוך אותם במידת הצורך ולהוסיף עוד סבבים.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Couple Names */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <User className="w-4 h-4 inline ml-1" />
              שם החתן
            </label>
            <input
              type="text"
              name="groomName"
              value={formData.groomName}
              onChange={handleInputChange}
              className={`input-field ${errors.groomName ? 'border-red-500' : ''}`}
              placeholder="הזן את שם החתן"
            />
            {errors.groomName && (
              <p className="text-red-500 text-sm mt-1">{errors.groomName}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <User className="w-4 h-4 inline ml-1" />
              שם הכלה
            </label>
            <input
              type="text"
              name="brideName"
              value={formData.brideName}
              onChange={handleInputChange}
              className={`input-field ${errors.brideName ? 'border-red-500' : ''}`}
              placeholder="הזן את שם הכלה"
            />
            {errors.brideName && (
              <p className="text-red-500 text-sm mt-1">{errors.brideName}</p>
            )}
          </div>
        </div>

        {/* Event Date and Time */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Calendar className="w-4 h-4 inline ml-1" />
              תאריך האירוע
            </label>
            <input
              type="date"
              name="eventDate"
              value={formData.eventDate}
              onChange={handleInputChange}
              className={`input-field ${errors.eventDate ? 'border-red-500' : ''}`}
            />
            {errors.eventDate && (
              <p className="text-red-500 text-sm mt-1">{errors.eventDate}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              שעת האירוע
            </label>
            <input
              type="time"
              name="eventTime"
              value={formData.eventTime}
              onChange={handleInputChange}
              className={`input-field ${errors.eventTime ? 'border-red-500' : ''}`}
            />
            {errors.eventTime && (
              <p className="text-red-500 text-sm mt-1">{errors.eventTime}</p>
            )}
          </div>
        </div>

        {/* Event Type */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            סוג האירוע
          </label>
          <select
            name="eventType"
            value={formData.eventType}
            onChange={(e) => handleEventTypeChange(e.target.value)}
            className="input-field"
          >
            <option value="wedding">חתונה</option>
            <option value="bar_mitzvah">בר מצווה</option>
            <option value="bat_mitzvah">בת מצווה</option>
            <option value="birthday">יום הולדת</option>
            <option value="anniversary">יום נישואין</option>
            <option value="other">אחר</option>
          </select>
        </div>

        {/* Venue */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <MapPin className="w-4 h-4 inline ml-1" />
            מיקום האירוע
          </label>
          <input
            type="text"
            name="venue"
            value={formData.venue}
            onChange={handleInputChange}
            className={`input-field ${errors.venue ? 'border-red-500' : ''}`}
            placeholder="הזן את מיקום האירוע"
          />
          {errors.venue && (
            <p className="text-red-500 text-sm mt-1">{errors.venue}</p>
          )}
        </div>

        {/* Invitation Image */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            קישור לתמונת הזמנה (אופציונלי)
          </label>
          <input
            type="url"
            name="invitationImageUrl"
            value={formData.invitationImageUrl}
            onChange={handleInputChange}
            className="input-field"
            placeholder="https://example.com/invitation.jpg"
          />
          <p className="text-xs text-gray-500 mt-1">
            תמונה זו תוצג בכל ההודעות שנשלחו לאורחים
          </p>
        </div>

        {/* Contact Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Phone className="w-4 h-4 inline ml-1" />
              מספר טלפון של הזוג
            </label>
            <input
              type="tel"
              name="couplePhone"
              value={formData.couplePhone}
              onChange={handleInputChange}
              className={`input-field ${errors.couplePhone ? 'border-red-500' : ''}`}
              placeholder="+972-50-1234567"
            />
            {errors.couplePhone && (
              <p className="text-red-500 text-sm mt-1">{errors.couplePhone}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Mail className="w-4 h-4 inline ml-1" />
              כתובת אימייל (אופציונלי)
            </label>
            <input
              type="email"
              name="coupleEmail"
              value={formData.coupleEmail}
              onChange={handleInputChange}
              className={`input-field ${errors.coupleEmail ? 'border-red-500' : ''}`}
              placeholder="example@email.com"
            />
            {errors.coupleEmail && (
              <p className="text-red-500 text-sm mt-1">{errors.coupleEmail}</p>
            )}
          </div>
        </div>

        {/* Submit Buttons */}
        <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200">
          <button
            type="button"
            onClick={handleCancel}
            className="btn-secondary"
            disabled={isLoading}
          >
            ביטול
          </button>
          <button
            type="submit"
            className="btn-primary flex items-center space-x-2"
            disabled={isLoading}
          >
            {isLoading ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            ) : (
              <>
                <span>צור אירוע</span>
                <ArrowLeft className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CreateEvent;
