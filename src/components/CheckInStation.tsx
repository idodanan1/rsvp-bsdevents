import React, { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Html5Qrcode } from 'html5-qrcode';
import { useEventStore } from '../store/eventStore';
import { parseQRUrl } from '../services/qrService';
import { formatFullName } from '../utils/helpers';
import { Event, Guest, Table } from '../types';
import { CheckCircle, Table as TableIcon, Users, Camera, AlertCircle, RotateCcw } from 'lucide-react';
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
  const clearDisplayTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [availableCameras, setAvailableCameras] = useState<{id: string, label: string}[]>([]);
  const [currentCameraIndex, setCurrentCameraIndex] = useState<number>(0);
  const [isSwitchingCamera, setIsSwitchingCamera] = useState(false);

  useEffect(() => {
    if (events.length === 0) {
      // CRITICAL: Get fetchEvents from store to ensure it's accessible
      const storeState = useEventStore.getState();
      const fetchEventsFn = storeState.fetchEvents;
      if (fetchEventsFn && typeof fetchEventsFn === 'function') {
        fetchEventsFn().catch((error: any) => {
          console.error('❌ Error fetching events in CheckInStation:', error);
        });
      } else {
        console.error('❌ fetchEvents is not available in store state');
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [events.length]); // Removed fetchEvents from deps to prevent infinite loop

  useEffect(() => {
    if (eventId) {
      // Load cameras first, then start scanner
      loadCameras().then((initialIndex) => {
        startScanner(initialIndex);
      });
    }

    return () => {
      stopScanner();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId]);

  const loadCameras = async () => {
    try {
      const devices = await Html5Qrcode.getCameras();
      console.log('📷 Available cameras:', devices.length);
      
      if (devices && devices.length > 0) {
        setAvailableCameras(devices);
        
        // Find back camera index
        const backCameraIndex = devices.findIndex((device: any) => 
          device.label.toLowerCase().includes('back') || 
          device.label.toLowerCase().includes('rear') ||
          device.label.toLowerCase().includes('environment')
        );
        
        if (backCameraIndex !== -1) {
          setCurrentCameraIndex(backCameraIndex);
          return backCameraIndex;
        } else {
          setCurrentCameraIndex(0);
          return 0;
        }
      }
      return 0;
    } catch (deviceError) {
      console.warn('⚠️ Could not enumerate cameras:', deviceError);
      setAvailableCameras([]);
      return 0;
    }
  };

  const startScanner = async (cameraIndex?: number) => {
    if (!eventId) return;

    try {
      // Stop existing scanner if running
      if (scannerRef.current) {
        await stopScanner();
      }

      const html5QrCode = new Html5Qrcode('reader');
      scannerRef.current = html5QrCode;

      // Load cameras if not already loaded
      let cameras = availableCameras;
      let targetIndex = cameraIndex !== undefined ? cameraIndex : currentCameraIndex;
      
      if (cameras.length === 0) {
        const initialIndex = await loadCameras();
        // Get fresh cameras from state after update
        // Use a callback to get the latest state
        await new Promise(resolve => setTimeout(resolve, 50));
        // Re-read cameras - they should be updated now
        // For now, we'll get them directly
        try {
          const devices = await Html5Qrcode.getCameras();
          if (devices && devices.length > 0) {
            cameras = devices;
            if (cameraIndex === undefined) {
              targetIndex = initialIndex;
            }
          }
        } catch (e: any) {
          console.warn('Could not re-read cameras:', e);
        }
      }

      // Determine which camera to use
      let cameraId: string | null = null;
      let facingMode: string = 'environment'; // Default to back camera
      
      if (cameras.length > 0) {
        const safeIndex = targetIndex < cameras.length ? targetIndex : 0;
        cameraId = cameras[safeIndex].id;
        setCurrentCameraIndex(safeIndex);
        console.log(`📷 Using camera ${safeIndex + 1}/${cameras.length}:`, cameras[safeIndex].label);
      }

      // Start scanner with camera ID or facingMode
      const config = cameraId 
        ? { deviceId: { exact: cameraId } }
        : { facingMode: facingMode };

      await html5QrCode.start(
        config,
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0,
          disableFlip: false // Allow flipping if needed
        },
        (decodedText) => {
          handleQRScan(decodedText);
        },
        (errorMessage) => {
          // Ignore scanning errors (they're frequent during scanning)
          // Only log if it's a significant error
          if (errorMessage && !errorMessage.includes('NotFoundException')) {
            console.debug('Scanning:', errorMessage);
          }
        }
      );

      setIsScanning(true);
      setError(null);
      console.log('✅ Scanner started successfully');
    } catch (err: any) {
      console.error('❌ Error starting scanner:', err);
      
      // Provide more specific error messages
      let errorMessage = 'שגיאה בהפעלת המצלמה. ';
      if (err.name === 'NotAllowedError' || err.message?.includes('permission')) {
        errorMessage += 'אנא אשר גישה למצלמה בדפדפן.';
      } else if (err.name === 'NotFoundError' || err.message?.includes('camera')) {
        errorMessage += 'לא נמצאה מצלמה במכשיר.';
      } else if (err.name === 'NotReadableError') {
        errorMessage += 'המצלמה תפוסה על ידי אפליקציה אחרת.';
      } else {
        errorMessage += 'אנא ודא שהמצלמה מחוברת וקיבלת הרשאה לשימוש בה.';
      }
      
      setError(errorMessage);
      toast.error('שגיאה בהפעלת המצלמה');
      setIsScanning(false);
    }
  };

  const switchCamera = async () => {
    if (availableCameras.length < 2) {
      toast.error('לא נמצאו מצלמות נוספות להחלפה');
      return;
    }

    setIsSwitchingCamera(true);
    try {
      // Stop current scanner
      await stopScanner();
      
      // Switch to next camera
      const nextIndex = (currentCameraIndex + 1) % availableCameras.length;
      setCurrentCameraIndex(nextIndex);
      
      // Wait a bit before starting new camera
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // Start with new camera
      await startScanner(nextIndex);
      
      const cameraName = availableCameras[nextIndex].label || `מצלמה ${nextIndex + 1}`;
      toast.success(`החלפה ל${cameraName}`);
    } catch (err) {
      console.error('Error switching camera:', err);
      toast.error('שגיאה בהחלפת מצלמה');
    } finally {
      setIsSwitchingCamera(false);
    }
  };

  const stopScanner = async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
        scannerRef.current.clear();
      } catch (err) {
        console.error('Error stopping scanner:', err);
      }
      scannerRef.current = null;
    }
    setIsScanning(false);
    if (scanTimeoutRef.current) {
      clearTimeout(scanTimeoutRef.current);
      scanTimeoutRef.current = null;
    }
    if (clearDisplayTimeoutRef.current) {
      clearTimeout(clearDisplayTimeoutRef.current);
      clearDisplayTimeoutRef.current = null;
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
      const event = events.find((e: any) => e.id === eventId);
      if (!event) {
        setError('אירוע לא נמצא');
        toast.error('אירוע לא נמצא');
        return;
      }

      const guest = event.guests?.find((g: any) => g.id === qrData.guestId);
      if (!guest) {
        toast.error('אורח לא נמצא');
        return;
      }

      // Check if already marked as attended
      if (guest.actualAttendance === 'attended') {
        // Still show the info, but don't update again
        const guestTable = event.tables?.find((table: any) => table.guests?.includes(guest.id));
        const tableNumber = guestTable ? guestTable.number : null;
        
        // Clear any existing timeout
        if (clearDisplayTimeoutRef.current) {
          clearTimeout(clearDisplayTimeoutRef.current);
          clearDisplayTimeoutRef.current = null;
        }
        
        const guestFullName = formatFullName(guest.firstName, guest.lastName);
        setScannedGuest({
          id: guest.id,
          firstName: guest.firstName,
          lastName: guest.lastName,
          tableNumber: tableNumber,
          greeting: `ברוך הבא ${guestFullName}!`,
          scannedAt: new Date()
        });
        
        toast.success('האורח כבר סומן כמגיע');
        
        // Clear the display after 5 seconds
        clearDisplayTimeoutRef.current = setTimeout(() => {
          setScannedGuest(null);
          clearDisplayTimeoutRef.current = null;
        }, 5000);
        
        return;
      }

      // Find table number
      const guestTable = event.tables?.find((table: any) => table.guests?.includes(guest.id));
      const tableNumber = guestTable ? guestTable.number : null;

      // Update guest status to attended
      const updatedGuest = {
        ...guest,
        actualAttendance: 'attended' as const,
        attendanceDate: new Date()
      };

      await updateGuestResponse(eventId, qrData.guestId, updatedGuest);

      // Create greeting message
      const guestFullName = formatFullName(guest.firstName, guest.lastName);
      const greeting = `ברוך הבא ${guestFullName}!`;

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
      toast.success(`ברוך הבא ${guestFullName}!`);

      // Clear any existing timeout before setting a new one
      if (clearDisplayTimeoutRef.current) {
        clearTimeout(clearDisplayTimeoutRef.current);
        clearDisplayTimeoutRef.current = null;
      }

      // Clear the display after 5 seconds and continue scanning
      clearDisplayTimeoutRef.current = setTimeout(() => {
        setScannedGuest(null);
        clearDisplayTimeoutRef.current = null;
      }, 5000);

    } catch (err) {
      console.error('Error processing QR scan:', err);
      toast.error('שגיאה בעיבוד הסריקה');
    }
  };

  const event = events.find((e: any) => e.id === eventId);

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
    <div className="h-screen bg-gradient-to-br from-teal-50 to-yellow-50 p-2 overflow-hidden" dir="rtl">
      <div className="h-full max-w-6xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 h-full">
          {/* Camera Scanner Section */}
          <div className="bg-white rounded-xl shadow-lg p-3 flex flex-col overflow-hidden">
            <div className="flex items-center justify-between mb-2 flex-shrink-0">
              <h2 className="text-lg font-bold text-gray-800 flex items-center">
                <Camera className="h-5 w-5 ml-2" />
                עמדת סריקה
              </h2>
              <div className="flex items-center space-x-2 space-x-reverse">
                {availableCameras.length > 1 && (
                  <button
                    onClick={switchCamera}
                    disabled={isSwitchingCamera || !isScanning}
                    className="flex items-center space-x-1 px-2 py-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded text-xs transition-colors duration-200"
                    title="החלף מצלמה"
                  >
                    <RotateCcw className={`h-3 w-3 ${isSwitchingCamera ? 'animate-spin' : ''}`} />
                    <span className="text-xs">{isSwitchingCamera ? 'מחליף...' : 'החלף'}</span>
                  </button>
                )}
                <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                  isScanning ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                }`}>
                  {isScanning ? 'סורק...' : 'מוכן'}
                </div>
              </div>
            </div>
            
            {availableCameras.length > 0 && (
              <div className="mb-2 text-xs text-gray-600 flex-shrink-0">
                <p>מצלמה: {availableCameras[currentCameraIndex]?.label || `מצלמה ${currentCameraIndex + 1}`}</p>
              </div>
            )}
            
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-2 mb-2 text-xs flex-shrink-0">
                <p className="text-red-800">{error}</p>
              </div>
            )}

            {/* Welcome message for guests */}
            <div className="bg-gradient-to-r from-teal-500 to-blue-500 rounded-lg p-2 mb-2 text-white text-center shadow-lg flex-shrink-0">
              <p className="text-sm font-bold mb-0.5">שלום אורח יקר!</p>
              <p className="text-xs">אנא סרוק את הברקוד שנשלח אליך בוואטסאפ</p>
            </div>

            <div className="relative w-full rounded-lg overflow-hidden bg-gray-900 flex-1 min-h-0" style={{ maxHeight: '100%' }}>
              <div id="reader" className="w-full h-full"></div>
              {!isScanning && !error && (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-900 bg-opacity-90">
                  <div className="text-center text-white">
                    <Camera className="h-8 w-8 mx-auto mb-2 animate-pulse" />
                    <p className="text-sm font-medium">מתחיל מצלמה...</p>
                    <p className="text-xs mt-1 opacity-75">אנא אשר גישה למצלמה</p>
                  </div>
                </div>
              )}
              {isScanning && (
                <div className="absolute top-2 left-2 bg-green-500 text-white px-2 py-0.5 rounded-full text-xs font-medium flex items-center">
                  <div className="w-1.5 h-1.5 bg-white rounded-full ml-1.5 animate-pulse"></div>
                  פעילה
                </div>
              )}
            </div>
            
            <div className="mt-1 text-center text-gray-600 flex-shrink-0">
              {isScanning ? (
                <p className="text-xs font-medium">הצב את הברקוד מול המצלמה</p>
              ) : (
                <p className="text-xs text-gray-500">ממתין להפעלת המצלמה...</p>
              )}
            </div>
          </div>

          {/* Display Section */}
          <div className="bg-white rounded-xl shadow-lg p-3 flex flex-col overflow-hidden">
            <h2 className="text-lg font-bold text-gray-800 mb-2 flex items-center flex-shrink-0">
              <Users className="h-5 w-5 ml-2" />
              מידע אורח
            </h2>

            <div className="flex-1 overflow-y-auto">
              {scannedGuest ? (
                <div className="space-y-3">
                  <div className="bg-gradient-to-br from-teal-50 to-yellow-50 rounded-lg p-3 border-2 border-teal-200">
                    <div className="text-center mb-2">
                      <CheckCircle className="h-10 w-10 text-green-500 mx-auto mb-2" />
                      <h3 className="text-xl font-bold text-gray-800 mb-1">
                        {scannedGuest.greeting}
                      </h3>
                      <p className="text-base text-gray-600">
                        {formatFullName(scannedGuest.firstName, scannedGuest.lastName)}
                      </p>
                    </div>

                    {scannedGuest.tableNumber && (
                      <div className="bg-yellow-50 border-2 border-yellow-300 rounded-lg p-3 mt-2">
                        <div className="flex items-center justify-center">
                          <TableIcon className="h-6 w-6 ml-2 text-yellow-600" />
                          <div className="text-center">
                            <p className="text-sm font-medium text-gray-700 mb-0.5">מספר השולחן שלך:</p>
                            <p className="text-3xl font-bold text-yellow-700">{scannedGuest.tableNumber}</p>
                          </div>
                        </div>
                      </div>
                    )}

                    {!scannedGuest.tableNumber && (
                      <div className="bg-gray-50 border border-gray-200 rounded-lg p-2 mt-2 text-center">
                        <p className="text-sm text-gray-600">שולחן לא הוקצה</p>
                      </div>
                    )}

                    <div className="mt-2 text-center text-xs text-gray-500">
                      <p>נסרק ב: {scannedGuest.scannedAt.toLocaleTimeString('he-IL')}</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center h-full bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                  <div className="text-center text-gray-400">
                    <Camera className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">ממתין לסריקה...</p>
                  </div>
                </div>
              )}
            </div>

            {/* Event Info */}
            <div className="mt-2 pt-2 border-t border-gray-200 flex-shrink-0">
              <h3 className="text-sm font-bold text-gray-800 mb-1">פרטי האירוע:</h3>
              <p className="text-xs text-gray-600">{event.coupleName}</p>
              <p className="text-xs text-gray-500">{(event as any).eventTypeHebrew}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CheckInStation;

