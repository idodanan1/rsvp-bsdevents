// Webhook service for syncing WhatsApp updates
const BACKEND_URL = (process.env as any).NEXT_PUBLIC_BACKEND_URL || (process.env as any).VITE_BACKEND_URL || 'https://whatsapp-backend-enfz.onrender.com';
export interface SyncResult {
  processed: number;
  failed: number;
  remaining: number;
}

class WebhookService {
  pollingActive: boolean = false;
  private pollingInterval: NodeJS.Timeout | null = null;

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
        // If endpoint doesn't exist (404), silently return empty result
        if (response.status === 404) {
          // Don't log warning - endpoint doesn't exist, this is expected
          return {
            processed: 0,
            failed: 0,
            remaining: 0
          };
        }
        // For other errors, throw but catch below
        throw new Error(`Sync failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      return {
        processed: data.processed || 0,
        failed: data.failed || 0,
        remaining: data.remaining || 0
      };
    } catch (error) {
      // Silently handle all errors - endpoint may not exist or network may be down
      // Only log if it's not a 404 (which we already handled above)
      if (error instanceof Error) {
        // Check if it's a network error or 404
        if (error.message.includes('404') || error.message.includes('Failed to fetch')) {
          // Don't log - endpoint doesn't exist or network issue, this is expected
        } else {
          // Only log unexpected errors (not 404, not network)
          console.warn('⚠️ sync-updates error (non-critical):', error.message);
        }
      }
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

  startPolling(interval: number = 8000): void {
    if (this.pollingActive) {
      this.stopPolling();
    }
    
    this.pollingActive = true;
    console.log(`🔄 Starting webhook polling every ${interval}ms`);
    
    this.pollingInterval = setInterval(async () => {
      try {
        await this.syncAllUpdates(false);
      } catch (error) {
        console.error('Error during polling:', error);
      }
    }, interval);
  }

  stopPolling(): void {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
    this.pollingActive = false;
    console.log('🛑 Stopped webhook polling');
  }
}

export const webhookService = new WebhookService();











