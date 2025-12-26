// Webhook service for syncing WhatsApp updates
const BACKEND_URL = (import.meta.env as any).VITE_BACKEND_URL || 'https://whatsapp-backend-enfz.onrender.com';

export interface SyncResult {
  processed: number;
  failed: number;
  remaining: number;
}

class WebhookService {
  async syncAllUpdates(onlyToday: boolean = false): Promise<SyncResult> {
    try {
      const url = `${BACKEND_URL}/api/guests/sync-updates?onlyToday=${onlyToday}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Sync failed: ${response.statusText}`);
      }

      const data = await response.json();
      return {
        processed: data.processed || 0,
        failed: data.failed || 0,
        remaining: data.remaining || 0
      };
    } catch (error) {
      console.error('Error syncing updates:', error);
      return {
        processed: 0,
        failed: 0,
        remaining: 0
      };
    }
  }

  async getPendingUpdatesCount(): Promise<number> {
    try {
      const url = `${BACKEND_URL}/api/guests/pending-updates?all=true`;
      const response = await fetch(url);

      if (!response.ok) {
        return 0;
      }

      const data = await response.json();
      return data.totalPending || 0;
    } catch (error) {
      console.error('Error getting pending updates count:', error);
      return 0;
    }
  }
}

export const webhookService = new WebhookService();



