import React, { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Html5Qrcode } from 'html5-qrcode';
import { useEventStore } from '../store/eventStore';
import { parseQRUrl } from '../services/qrService';
import { CheckCircle, Table, Users, Camera, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';

interface ScannedGuest {
  id: string;
  firstName: string;
  lastName: string;
  tableNumber: number | null;
  greeting: string;
  scannedAt: Date;
}

const CheckInStation: React.FC = () => {
  const { eventId } = useParams<{ eventId: string }>();
  const { events, fetchEvents, updateGuestResponse } = useEventStore();
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scannedGuest, setScannedGuest] = useState<ScannedGuest | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastScannedId, setLastScannedId] = useState<string | null>(null);
  const scanTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (events.length === 0) {
      fetchEvents();
    }
  }, [events.length, fetchEvents]);

  useEffect(() => {
    if (eventId) {
      startScanner();
    }

    return () => {
      stopScanner();
    };
  }, [eventId]);

  const startScanner = async () => {
    if (!eventId) return;

    try {
      const html5QrCode = new Html5Qrcode('reader');
      scannerRef.current = html5QrCode;

      await html5QrCode.start(
        { facingMode: 'environment' }, // Use back camera
        {
          fps: 10,
          qrbox: { width: 300, height: 300 },
          aspectRatio: 1.0
        },
        (decodedText) => {
          handleQRScan(decodedText);
        },
        (errorMessage) => {
          // Ignore scanning errors (they're frequent during scanning)
        }
      );

      setIsScanning(true);
      setError(null);
    } catch (err: any) {
      console.error('Error starting scanner:', err);
      setError('שגיאה בהפעלת המצלמה. אנא ודא שהמצלמה מחוברת וקיבלת הרשאה לשימוש בה.');
      toast.error('שגיאה בהפעלת המצלמה');
    }
  };

  const stopScanner = () => {
    if (scannerRef.current) {
      scannerRef.current.stop().catch((err) => {
        console.error('Error stopping scanner:', err);
      });
      scannerRef.current.clear();
      scannerRef.current = null;
    }
    setIsScanning(false);
    if (scanTimeoutRef.current) {
      clearTimeout(scanTimeoutRef.current);
    }
  };

  const handleQRScan = async (qrText: string) => {
    // Prevent duplicate scans within 2 seconds
    if (scanTimeoutRef.current) {
      return;
    }

    scanTimeoutRef.current = setTimeout(() => {
      scanTimeoutRef.current = null;
    }, 2000);

    try {
      // Parse QR code URL to get eventId and guestId
      let qrData = parseQRUrl(qrText);
      
      if (!qrData) {
        // Try to parse as direct URL with eventId and guestId
        const urlMatch = qrText.match(/qr-scan[\/#]([^\/]+)\/([^\/]+)/);
        if (urlMatch) {
          qrData = {
            eventId: urlMatch[1],
            guestId: urlMatch[2]
          };
        } else {
          console.warn('Invalid QR code format:', qrText);
          toast.error('ברקוד לא תקין');
          return;
        }
      }

      // Verify eventId matches
      if (qrData.eventId !== eventId) {
        toast.error('ברקוד לא שייך לאירוע הזה');
        return;
      }

      // Prevent scanning the same guest multiple times quickly
      if (lastScannedId === qrData.guestId) {
        return;
      }

      // Find the event and guest
      const event = events.find(e => e.id === eventId);
      if (!event) {
        setError('אירוע לא נמצא');
        toast.error('אירוע לא נמצא');
        return;
      }

      const guest = event.guests.find(g => g.id === qrData.guestId);
      if (!guest) {
        toast.error('אורח לא נמצא');
        return;
      }

      // Check if already marked as attended
      if (guest.actualAttendance === 'attended') {
        // Still show the info, but don't update again
        const guestTable = event.tables?.find(table => table.guests.includes(guest.id));
        const tableNumber = guestTable ? guestTable.number : null;
        
        setScannedGuest({
          id: guest.id,
          firstName: guest.firstName,
          lastName: guest.lastName,
          tableNumber: tableNumber,
          greeting: `ברוך הבא ${guest.firstName}!`,
          scannedAt: new Date()
        });
        
        toast.success('האורח כבר סומן כמגיע');
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

      await updateGuestResponse(eventId, qrData.guestId, updatedGuest);

      // Create greeting message
      const greeting = `ברוך הבא ${guest.firstName}!`;

      // Set scanned guest info to display
      setScannedGuest({
        id: guest.id,
        firstName: guest.firstName,
        lastName: guest.lastName,
        tableNumber: tableNumber,
        greeting: greeting,
        scannedAt: new Date()
      });

      setLastScannedId(qrData.guestId);
      toast.success(`ברוך הבא ${guest.firstName}!`);

      // Clear the display after 5 seconds and continue scanning
      setTimeout(() => {
        setScannedGuest(null);
      }, 5000);

    } catch (err) {
      console.error('Error processing QR scan:', err);
      toast.error('שגיאה בעיבוד הסריקה');
    }
  };

  const event = events.find(e => e.id === eventId);

  if (!event) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-teal-50 to-yellow-50 flex items-center justify-center p-4" dir="rtl">
        <div className="bg-white rounded-xl shadow-lg p-8 max-w-md w-full text-center">
          <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-800 mb-4">אירוע לא נמצא</h1>
          <p className="text-gray-600">אנא ודא שהקישור תקין</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 to-yellow-50 p-4" dir="rtl">
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Camera Scanner Section */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-gray-800 flex items-center">
                <Camera className="h-6 w-6 ml-2" />
                עמדת סריקה
              </h2>
              <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                isScanning ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
              }`}>
                {isScanning ? 'סורק...' : 'מוכן'}
              </div>
            </div>
            
            {error && (
              <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4 mb-4">
                <p className="text-red-800">{error}</p>
              </div>
            )}

            <div id="reader" className="w-full rounded-lg overflow-hidden bg-gray-100" style={{ minHeight: '400px' }}></div>
            
            <div className="mt-4 text-center text-gray-600">
              <p>הצב את הברקוד מול המצלמה</p>
            </div>
          </div>

          {/* Display Section */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center">
              <Users className="h-6 w-6 ml-2" />
              מידע אורח
            </h2>

            {scannedGuest ? (
              <div className="space-y-6">
                <div className="bg-gradient-to-br from-teal-50 to-yellow-50 rounded-lg p-6 border-2 border-teal-200">
                  <div className="text-center mb-4">
                    <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
                    <h3 className="text-3xl font-bold text-gray-800 mb-2">
                      {scannedGuest.greeting}
                    </h3>
                    <p className="text-xl text-gray-600">
                      {scannedGuest.firstName} {scannedGuest.lastName}
                    </p>
                  </div>

                  {scannedGuest.tableNumber && (
                    <div className="bg-yellow-50 border-2 border-yellow-300 rounded-lg p-6 mt-4">
                      <div className="flex items-center justify-center">
                        <Table className="h-8 w-8 ml-3 text-yellow-600" />
                        <div className="text-center">
                          <p className="text-lg font-medium text-gray-700 mb-1">מספר השולחן שלך:</p>
                          <p className="text-5xl font-bold text-yellow-700">{scannedGuest.tableNumber}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {!scannedGuest.tableNumber && (
                    <div className="bg-gray-50 border-2 border-gray-200 rounded-lg p-4 mt-4 text-center">
                      <p className="text-gray-600">שולחן לא הוקצה</p>
                    </div>
                  )}

                  <div className="mt-6 text-center text-sm text-gray-500">
                    <p>נסרק ב: {scannedGuest.scannedAt.toLocaleTimeString('he-IL')}</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-64 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                <div className="text-center text-gray-400">
                  <Camera className="h-16 w-16 mx-auto mb-4 opacity-50" />
                  <p className="text-lg">ממתין לסריקה...</p>
                </div>
              </div>
            )}

            {/* Event Info */}
            <div className="mt-6 pt-6 border-t border-gray-200">
              <h3 className="text-lg font-bold text-gray-800 mb-2">פרטי האירוע:</h3>
              <p className="text-gray-600">{event.coupleName}</p>
              <p className="text-sm text-gray-500 mt-1">{event.eventTypeHebrew}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CheckInStation;

