import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useEventStore } from '../store/eventStore';
import { CheckCircle, XCircle, Users, Calendar, MapPin, Phone, Table, MessageSquare, Home } from 'lucide-react';
import { formatDate } from '../utils/helpers';
import toast from 'react-hot-toast';
import { messageService } from '../services/messageService';

const QRScan: React.FC = () => {
  const { eventId, guestId } = useParams<{ eventId: string; guestId: string }>();
  const navigate = useNavigate();
  const { events, fetchEvents, updateGuestResponse } = useEventStore();
  
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Fetch events if not loaded
    if (events.length === 0) {
      fetchEvents();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [events.length]); // Removed fetchEvents from deps to prevent infinite loop

  useEffect(() => {
    if (eventId && guestId && events.length > 0) {
      processQRScan();
    }
  }, [eventId, guestId, events]);

  const processQRScan = async () => {
    if (!eventId || !guestId) {
      setError('נתונים חסרים - לא ניתן לעבד את הסריקה');
      setIsLoading(false);
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      // Find the event and guest
      const event = events.find(e => e.id === eventId);
      if (!event) {
        setError('אירוע לא נמצא');
        setIsLoading(false);
        setIsProcessing(false);
        return;
      }

      const guest = event.guests.find(g => g.id === guestId);
      if (!guest) {
        setError('אורח לא נמצא');
        setIsLoading(false);
        setIsProcessing(false);
        return;
      }

      // Check if already marked as attended
      if (guest.actualAttendance === 'attended') {
        toast.success('האורח כבר סומן כמגיע');
        setIsCompleted(true);
        setIsLoading(false);
        setIsProcessing(false);
        return;
      }

      // Find table number
      const guestTable = event.tables?.find(table => table.guests.includes(guest.id));
      const tableNumber = guestTable ? guestTable.number : null;

      // Update guest status to attended
      const updatedGuest = {
        ...guest,
        actualAttendance: 'attended' as const,
        attendanceDate: new Date()
      };

      await updateGuestResponse(eventId, guestId, updatedGuest);

      // Send welcome message with table number
      try {
        const welcomeMessage = tableNumber 
          ? `🎉 שלום ${guest.firstName}! 

ברוך הבא ל${event.eventTypeHebrew} של ${event.coupleName}! 

🪑 מספר השולחן שלך: ${tableNumber}

תודה שהגעת! אנו שמחים לראות אותך כאן.
מקווים שתהנה מהאירוע! 💕

בברכה,
${event.coupleName}`
          : `🎉 שלום ${guest.firstName}! 

ברוך הבא ל${event.eventTypeHebrew} של ${event.coupleName}! 

תודה שהגעת! אנו שמחים לראות אותך כאן.
מקווים שתהנה מהאירוע! 💕

בברכה,
${event.coupleName}`;

        await messageService.sendBulkMessages({
          message: welcomeMessage,
          recipients: [{
            id: guest.id,
            firstName: guest.firstName,
            lastName: guest.lastName,
            phoneNumber: guest.phoneNumber,
            channel: guest.channel as 'whatsapp' | 'sms',
            message: welcomeMessage,
            eventData: {
              coupleName: event.coupleName,
              groomName: event.groomName,
              brideName: event.brideName,
              eventType: event.eventType,
              eventTypeHebrew: event.eventTypeHebrew,
              eventDate: formatDate(event.eventDate),
              eventTime: event.eventTime,
              venue: event.venue
            }
          }]
        });

        toast.success('הודעה נשלחה בהצלחה!');
      } catch (msgError) {
        console.error('Error sending welcome message:', msgError);
        // Don't fail the whole process if message sending fails
        toast.error('הגעה סומנה, אך שליחת ההודעה נכשלה');
      }

      setIsCompleted(true);
      toast.success('הגעה סומנה בהצלחה!');
    } catch (err) {
      console.error('Error processing QR scan:', err);
      setError('שגיאה בעיבוד הסריקה. אנא נסה שוב.');
      toast.error('שגיאה בעיבוד הסריקה');
    } finally {
      setIsLoading(false);
      setIsProcessing(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-teal-50 to-yellow-50 flex items-center justify-center p-4" dir="rtl">
        <div className="bg-white rounded-xl shadow-lg p-8 max-w-md w-full text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600 mx-auto mb-4"></div>
          <p className="text-gray-600">מעבד את הסריקה...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-teal-50 to-yellow-50 flex items-center justify-center p-4" dir="rtl">
        <div className="bg-white rounded-xl shadow-lg p-8 max-w-md w-full text-center">
          <XCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-800 mb-4">שגיאה</h1>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => navigate('/')}
            className="btn-primary w-full"
          >
            חזרה לעמוד הבית
          </button>
        </div>
      </div>
    );
  }

  const event = events.find(e => e.id === eventId);
  const guest = event?.guests.find(g => g.id === guestId);
  const guestTable = event?.tables?.find(table => table.guests.includes(guestId || ''));
  const tableNumber = guestTable ? guestTable.number : null;

  if (!event || !guest) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-teal-50 to-yellow-50 flex items-center justify-center p-4" dir="rtl">
        <div className="bg-white rounded-xl shadow-lg p-8 max-w-md w-full text-center">
          <XCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-800 mb-4">לא נמצא</h1>
          <p className="text-gray-600 mb-6">האירוע או האורח לא נמצאו במערכת</p>
          <button
            onClick={() => navigate('/')}
            className="btn-primary w-full"
          >
            חזרה לעמוד הבית
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 to-yellow-50 p-4" dir="rtl">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-xl shadow-lg p-8">
          {isCompleted ? (
            <>
              <div className="text-center mb-6">
                <CheckCircle className="h-20 w-20 text-green-500 mx-auto mb-4" />
                <h1 className="text-3xl font-bold text-gray-800 mb-2">
                  ברוך הבא! 🎉
                </h1>
                <p className="text-xl text-gray-600 mb-6">
                  שלום {guest.firstName} {guest.lastName}
                </p>
              </div>

              <div className="bg-gradient-to-br from-teal-50 to-yellow-50 rounded-lg p-6 mb-6">
                <h2 className="text-xl font-bold text-gray-800 mb-4 text-center">
                  פרטי האירוע
                </h2>
                
                <div className="space-y-4">
                  <div className="flex items-center text-gray-700">
                    <Calendar className="h-5 w-5 ml-3 text-teal-600" />
                    <span className="font-medium">תאריך:</span>
                    <span className="mr-2">{formatDate(event.eventDate)}</span>
                  </div>
                  
                  <div className="flex items-center text-gray-700">
                    <MapPin className="h-5 w-5 ml-3 text-teal-600" />
                    <span className="font-medium">מיקום:</span>
                    <span className="mr-2">{event.venue}</span>
                  </div>

                  {tableNumber && (
                    <div className="flex items-center text-gray-700 bg-yellow-50 p-3 rounded-lg border-2 border-yellow-200">
                      <Table className="h-6 w-6 ml-3 text-yellow-600" />
                      <span className="font-bold text-lg">מספר השולחן שלך:</span>
                      <span className="mr-2 text-2xl font-bold text-yellow-700">{tableNumber}</span>
                    </div>
                  )}

                  {!tableNumber && (
                    <div className="flex items-center text-gray-500 bg-gray-50 p-3 rounded-lg">
                      <Table className="h-5 w-5 ml-3 text-gray-400" />
                      <span>שולחן לא הוקצה</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-green-50 border-2 border-green-200 rounded-lg p-6 mb-6">
                <div className="flex items-start">
                  <MessageSquare className="h-6 w-6 ml-3 text-green-600 mt-1" />
                  <div>
                    <h3 className="font-bold text-green-800 mb-2">הודעה נשלחה</h3>
                    <p className="text-green-700">
                      נשלחה אליך הודעה עם פרטי השולחן שלך {tableNumber ? `(שולחן ${tableNumber})` : ''} וברכה אישית.
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-6 mb-6">
                <div className="flex items-start">
                  <CheckCircle className="h-6 w-6 ml-3 text-blue-600 mt-1" />
                  <div>
                    <h3 className="font-bold text-blue-800 mb-2">הגעה נרשמה</h3>
                    <p className="text-blue-700">
                      הגעתך לאירוע נרשמה במערכת בהצלחה!
                    </p>
                  </div>
                </div>
              </div>

              <div className="text-center">
                <p className="text-gray-600 mb-4">
                  מקווים שתהנה מהאירוע! 💕
                </p>
                <button
                  onClick={() => navigate('/')}
                  className="btn-primary"
                >
                  <Home className="h-5 w-5 ml-2" />
                  חזרה לעמוד הבית
                </button>
              </div>
            </>
          ) : (
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600 mx-auto mb-4"></div>
              <p className="text-gray-600">מעבד את הסריקה...</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default QRScan;

