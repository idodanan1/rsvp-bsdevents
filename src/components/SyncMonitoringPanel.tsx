// Sync Monitoring Panel component
import React, { useState, useEffect } from 'react';
import { Activity, RefreshCw, CheckCircle, XCircle, Clock } from 'lucide-react';
import { webhookService } from '../services/webhookService';

interface SyncMonitoringPanelProps {
  eventId: string;
}

interface SyncStatus {
  lastSync: Date | null;
  pendingUpdates: number;
  isSyncing: boolean;
  lastSyncResult: {
    processed: number;
    failed: number;
    remaining: number;
  } | null;
}

const SyncMonitoringPanel: React.FC<SyncMonitoringPanelProps> = ({ eventId }) => {
  const [status, setStatus] = useState<SyncStatus>({
    lastSync: null,
    pendingUpdates: 0,
    isSyncing: false,
    lastSyncResult: null
  });

  const checkPendingUpdates = async () => {
    try {
      const count = await webhookService.getPendingUpdatesCount();
      setStatus(prev => ({ ...prev, pendingUpdates: count }));
    } catch (error) {
      console.error('Error checking pending updates:', error);
    }
  };

  const handleSync = async () => {
    setStatus(prev => ({ ...prev, isSyncing: true }));
    try {
      const result = await webhookService.syncAllUpdates(false);
      setStatus(prev => ({
        ...prev,
        lastSync: new Date(),
        lastSyncResult: result,
        pendingUpdates: result.remaining,
        isSyncing: false
      }));
    } catch (error) {
      console.error('Error syncing:', error);
      setStatus(prev => ({ ...prev, isSyncing: false }));
    }
  };

  useEffect(() => {
    checkPendingUpdates();
    const interval = setInterval(checkPendingUpdates, 30000); // Check every 30 seconds
    return () => clearInterval(interval);
  }, [eventId]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-lg font-semibold text-gray-900">סטטוס סינכרון</h4>
        <button
          onClick={handleSync}
          disabled={status.isSyncing}
          className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label="סנכרן עדכונים"
          title="סנכרן עדכונים"
        >
          <RefreshCw className={`w-4 h-4 ${status.isSyncing ? 'animate-spin' : ''}`} />
          <span>סנכרן</span>
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-gray-50 p-4 rounded-lg">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">עדכונים ממתינים</span>
            <span className="text-2xl font-bold text-orange-600">{status.pendingUpdates}</span>
          </div>
        </div>

        <div className="bg-gray-50 p-4 rounded-lg">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">סנכרון אחרון</span>
            {status.lastSync ? (
              <span className="text-sm text-gray-700">
                {status.lastSync.toLocaleTimeString('he-IL')}
              </span>
            ) : (
              <span className="text-sm text-gray-400">לא בוצע</span>
            )}
          </div>
        </div>
      </div>

      {status.lastSyncResult && (
        <div className="bg-blue-50 p-4 rounded-lg">
          <h5 className="font-semibold text-blue-900 mb-2">תוצאות סנכרון אחרון</h5>
          <div className="grid grid-cols-3 gap-4">
            <div className="flex items-center space-x-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <div>
                <span className="text-sm text-gray-600">עובדו</span>
                <p className="text-lg font-bold text-green-600">{status.lastSyncResult.processed}</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <XCircle className="w-5 h-5 text-red-600" />
              <div>
                <span className="text-sm text-gray-600">נכשלו</span>
                <p className="text-lg font-bold text-red-600">{status.lastSyncResult.failed}</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Clock className="w-5 h-5 text-orange-600" />
              <div>
                <span className="text-sm text-gray-600">נותרו</span>
                <p className="text-lg font-bold text-orange-600">{status.lastSyncResult.remaining}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SyncMonitoringPanel;

