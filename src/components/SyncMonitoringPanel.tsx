import React, { useState, useEffect } from 'react';
import { useEventStore } from '../store/eventStore';
import { 
  Activity, 
  CheckCircle, 
  Clock, 
  AlertCircle, 
  RefreshCw, 
  Users, 
  MessageSquare,
  Wifi,
  WifiOff,
  TrendingUp,
  BarChart3,
  XCircle
} from 'lucide-react';

interface SyncMonitoringPanelProps {
  eventId: string;
}

interface UpdateLog {
  timestamp: number;
  type: 'status' | 'guestCount' | 'attendance' | 'table';
  guestName: string;
  guestId: string;
  oldValue?: any;
  newValue?: any;
  source: 'manual' | 'guest_link' | 'whatsapp' | 'api';
  synced: boolean;
}

const SyncMonitoringPanel: React.FC<SyncMonitoringPanelProps> = ({ eventId }) => {
  const { events, fetchEvents } = useEventStore();
  const [updateLogs, setUpdateLogs] = useState<UpdateLog[]>([]);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [pendingUpdatesCount, setPendingUpdatesCount] = useState(0);
  const [syncStatus, setSyncStatus] = useState<'online' | 'offline' | 'syncing'>('online');

  const event = events.find(e => e.id === eventId);

  // Calculate statistics
  const stats = React.useMemo(() => {
    if (!event) return null;

    const totalGuests = event.guests.length;
    const confirmed = event.guests.filter(g => g.rsvpStatus === 'confirmed').length;
    const declined = event.guests.filter(g => g.rsvpStatus === 'declined').length;
    const maybe = event.guests.filter(g => g.rsvpStatus === 'maybe').length;
    const pending = event.guests.filter(g => g.rsvpStatus === 'pending' || !g.rsvpStatus).length;
    
    // Guests with response date (updated via link)
    const guestsWithResponse = event.guests.filter(g => g.responseDate).length;
    const responseRate = totalGuests > 0 ? ((guestsWithResponse / totalGuests) * 100).toFixed(1) : '0';
    
    // Recent updates (last 24 hours)
    const now = Date.now();
    const oneDayAgo = now - (24 * 60 * 60 * 1000);
    const recentUpdates = event.guests.filter(g => {
      if (!g.responseDate) return false;
      const responseTime = new Date(g.responseDate).getTime();
      return responseTime > oneDayAgo;
    }).length;

    return {
      totalGuests,
      confirmed,
      declined,
      maybe,
      pending,
      guestsWithResponse,
      responseRate,
      recentUpdates
    };
  }, [event]);

  // Check for pending updates from backend
  useEffect(() => {
    const checkPendingUpdates = async () => {
      try {
        const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'https://whatsapp-backend-enfz.onrender.com';
        const response = await fetch(`${BACKEND_URL}/api/guests/pending-updates`, {
          signal: AbortSignal.timeout(3000)
        });
        
        if (response.ok) {
          const data = await response.json();
          setPendingUpdatesCount(data.totalPending || 0);
          setSyncStatus('online');
        } else {
          setSyncStatus('offline');
        }
      } catch (error) {
        setSyncStatus('offline');
      }
    };

    checkPendingUpdates();
    const interval = setInterval(checkPendingUpdates, 5000); // Check every 5 seconds
    return () => clearInterval(interval);
  }, []);

  // Track sync time
  useEffect(() => {
    const handleSync = () => {
      setLastSyncTime(new Date());
      setIsSyncing(true);
      setTimeout(() => setIsSyncing(false), 1000);
    };

    // Listen for fetchEvents calls
    const originalFetchEvents = useEventStore.getState().fetchEvents;
    useEventStore.setState({
      fetchEvents: async (...args) => {
        handleSync();
        return originalFetchEvents(...args);
      }
    });

    return () => {
      // Restore original
      useEventStore.setState({ fetchEvents: originalFetchEvents });
    };
  }, []);

  // Monitor guest changes
  useEffect(() => {
    if (!event) return;

    const currentGuests = event.guests;
    
    // This will track changes by comparing with previous state
    // For now, we'll just show current statistics
  }, [event]);

  const handleManualSync = async () => {
    setIsSyncing(true);
    setSyncStatus('syncing');
    try {
      await fetchEvents();
      setLastSyncTime(new Date());
      setSyncStatus('online');
    } catch (error) {
      setSyncStatus('offline');
      console.error('❌ Sync failed:', error);
    } finally {
      setIsSyncing(false);
    }
  };

  if (!event || !stats) {
    return null;
  }

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <BarChart3 className="w-6 h-6 text-blue-600" />
          <h2 className="text-2xl font-bold text-gray-800">ניטור עדכונים וסינכרון</h2>
        </div>
        <button
          onClick={handleManualSync}
          disabled={isSyncing}
          className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
          <span>{isSyncing ? 'מסנכרן...' : 'רענון ידני'}</span>
        </button>
      </div>

      {/* Sync Status */}
      <div className="mb-6 p-4 bg-gray-50 rounded-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {syncStatus === 'online' ? (
              <Wifi className="w-5 h-5 text-green-600" />
            ) : syncStatus === 'syncing' ? (
              <RefreshCw className="w-5 h-5 text-blue-600 animate-spin" />
            ) : (
              <WifiOff className="w-5 h-5 text-red-600" />
            )}
            <div>
              <p className="font-semibold text-gray-800">
                סטטוס סינכרון: {syncStatus === 'online' ? 'מחובר' : syncStatus === 'syncing' ? 'מסנכרן...' : 'מנותק'}
              </p>
              {lastSyncTime && (
                <p className="text-sm text-gray-600">
                  עדכון אחרון: {lastSyncTime.toLocaleTimeString('he-IL')}
                </p>
              )}
            </div>
          </div>
          {pendingUpdatesCount > 0 && (
            <div className="flex items-center space-x-2 px-3 py-1 bg-yellow-100 rounded-lg">
              <AlertCircle className="w-4 h-4 text-yellow-600" />
              <span className="text-sm font-medium text-yellow-800">
                {pendingUpdatesCount} עדכונים ממתינים
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Statistics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4 border border-blue-200">
          <div className="flex items-center justify-between mb-2">
            <Users className="w-5 h-5 text-blue-600" />
            <span className="text-2xl font-bold text-blue-700">{stats.totalGuests}</span>
          </div>
          <p className="text-sm text-gray-600">סה"כ מוזמנים</p>
        </div>

        <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4 border border-green-200">
          <div className="flex items-center justify-between mb-2">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <span className="text-2xl font-bold text-green-700">{stats.confirmed}</span>
          </div>
          <p className="text-sm text-gray-600">מגיעים</p>
        </div>

        <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-lg p-4 border border-yellow-200">
          <div className="flex items-center justify-between mb-2">
            <MessageSquare className="w-5 h-5 text-yellow-600" />
            <span className="text-2xl font-bold text-yellow-700">{stats.guestsWithResponse}</span>
          </div>
          <p className="text-sm text-gray-600">עדכנו תגובה ({stats.responseRate}%)</p>
        </div>

        <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-4 border border-purple-200">
          <div className="flex items-center justify-between mb-2">
            <TrendingUp className="w-5 h-5 text-purple-600" />
            <span className="text-2xl font-bold text-purple-700">{stats.recentUpdates}</span>
          </div>
          <p className="text-sm text-gray-600">עדכונים (24 שעות)</p>
        </div>
      </div>

      {/* Response Status Breakdown */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white border-2 border-gray-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <span className="text-xl font-bold text-gray-800">{stats.confirmed}</span>
          </div>
          <p className="text-sm text-gray-600">מגיעים</p>
          <div className="mt-2 h-2 bg-gray-200 rounded-full overflow-hidden">
            <div 
              className="h-full bg-green-500 rounded-full"
              style={{ width: `${stats.totalGuests > 0 ? (stats.confirmed / stats.totalGuests) * 100 : 0}%` }}
            />
          </div>
        </div>

        <div className="bg-white border-2 border-gray-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <XCircle className="w-5 h-5 text-red-600" />
            <span className="text-xl font-bold text-gray-800">{stats.declined}</span>
          </div>
          <p className="text-sm text-gray-600">לא מגיעים</p>
          <div className="mt-2 h-2 bg-gray-200 rounded-full overflow-hidden">
            <div 
              className="h-full bg-red-500 rounded-full"
              style={{ width: `${stats.totalGuests > 0 ? (stats.declined / stats.totalGuests) * 100 : 0}%` }}
            />
          </div>
        </div>

        <div className="bg-white border-2 border-gray-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <Clock className="w-5 h-5 text-yellow-600" />
            <span className="text-xl font-bold text-gray-800">{stats.maybe}</span>
          </div>
          <p className="text-sm text-gray-600">מתלבטים</p>
          <div className="mt-2 h-2 bg-gray-200 rounded-full overflow-hidden">
            <div 
              className="h-full bg-yellow-500 rounded-full"
              style={{ width: `${stats.totalGuests > 0 ? (stats.maybe / stats.totalGuests) * 100 : 0}%` }}
            />
          </div>
        </div>

        <div className="bg-white border-2 border-gray-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <AlertCircle className="w-5 h-5 text-gray-600" />
            <span className="text-xl font-bold text-gray-800">{stats.pending}</span>
          </div>
          <p className="text-sm text-gray-600">ממתינים</p>
          <div className="mt-2 h-2 bg-gray-200 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gray-500 rounded-full"
              style={{ width: `${stats.totalGuests > 0 ? (stats.pending / stats.totalGuests) * 100 : 0}%` }}
            />
          </div>
        </div>
      </div>

      {/* Health Check */}
      <div className="bg-gray-50 rounded-lg p-4">
        <h3 className="font-semibold text-gray-800 mb-3">בדיקת תקינות המערכת</h3>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">חיבור ל-backend</span>
            {syncStatus === 'online' ? (
              <span className="flex items-center space-x-1 text-green-600">
                <CheckCircle className="w-4 h-4" />
                <span>מחובר</span>
              </span>
            ) : (
              <span className="flex items-center space-x-1 text-red-600">
                <AlertCircle className="w-4 h-4" />
                <span>מנותק</span>
              </span>
            )}
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">סינכרון אוטומטי</span>
            <span className="flex items-center space-x-1 text-green-600">
              <CheckCircle className="w-4 h-4" />
              <span>פעיל (כל 2 שניות)</span>
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">עדכונים ממתינים</span>
            {pendingUpdatesCount === 0 ? (
              <span className="flex items-center space-x-1 text-green-600">
                <CheckCircle className="w-4 h-4" />
                <span>אין</span>
              </span>
            ) : (
              <span className="flex items-center space-x-1 text-yellow-600">
                <AlertCircle className="w-4 h-4" />
                <span>{pendingUpdatesCount} עדכונים</span>
              </span>
            )}
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">שיעור תגובה</span>
            <span className={`font-semibold ${parseFloat(stats.responseRate) >= 50 ? 'text-green-600' : parseFloat(stats.responseRate) >= 25 ? 'text-yellow-600' : 'text-red-600'}`}>
              {stats.responseRate}%
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SyncMonitoringPanel;

