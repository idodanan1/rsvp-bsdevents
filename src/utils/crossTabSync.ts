/**
 * Cross-tab synchronization utility using BroadcastChannel API
 * Enables real-time updates across all open tabs/pages
 */

export interface CrossTabMessage {
  type: 'store-update' | 'force-refresh' | 'ping';
  storeName: string;
  action?: string;
  data?: any;
  timestamp: number;
  tabId: string;
}

class CrossTabSync {
  private channel: BroadcastChannel | null = null;
  private tabId: string;
  private listeners: Map<string, Set<(message: CrossTabMessage) => void>> = new Map();
  private isInitialized = false;

  constructor() {
    // Generate unique tab ID
    this.tabId = `tab_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Initialize BroadcastChannel if available
    if (typeof BroadcastChannel !== 'undefined') {
      try {
        this.channel = new BroadcastChannel('rsvp-app-sync');
        this.setupListener();
        this.isInitialized = true;
        console.log('✅ Cross-tab sync initialized with BroadcastChannel');
      } catch (error) {
        console.warn('⚠️ BroadcastChannel not available, falling back to localStorage events:', error);
        this.setupLocalStorageFallback();
      }
    } else {
      console.warn('⚠️ BroadcastChannel not supported, using localStorage events');
      this.setupLocalStorageFallback();
    }
  }

  private setupListener() {
    if (!this.channel) return;

    this.channel.onmessage = (event: MessageEvent<CrossTabMessage>) => {
      const message = event.data;
      
      // Ignore messages from this tab
      if (message.tabId === this.tabId) {
        return;
      }

      console.log(`📨 Received cross-tab message:`, message.type, message.storeName);

      // Notify all listeners for this store
      const storeListeners = this.listeners.get(message.storeName);
      if (storeListeners) {
        storeListeners.forEach(listener => {
          try {
            listener(message);
          } catch (error) {
            console.error('❌ Error in cross-tab listener:', error);
          }
        });
      }

      // Also notify general listeners
      const generalListeners = this.listeners.get('*');
      if (generalListeners) {
        generalListeners.forEach(listener => {
          try {
            listener(message);
          } catch (error) {
            console.error('❌ Error in general cross-tab listener:', error);
          }
        });
      }
    };
  }

  private setupLocalStorageFallback() {
    // Fallback to localStorage events for older browsers
    if (typeof window === 'undefined') return;

    window.addEventListener('storage', (event: StorageEvent) => {
      if (event.key !== 'rsvp-cross-tab-sync') return;
      if (!event.newValue) return;

      try {
        const message: CrossTabMessage = JSON.parse(event.newValue);
        
        // Ignore messages from this tab
        if (message.tabId === this.tabId) {
          return;
        }

        console.log(`📨 Received cross-tab message (localStorage):`, message.type, message.storeName);

        // Notify listeners
        const storeListeners = this.listeners.get(message.storeName);
        if (storeListeners) {
          storeListeners.forEach(listener => {
            try {
              listener(message);
            } catch (error) {
              console.error('❌ Error in cross-tab listener:', error);
            }
          });
        }

        const generalListeners = this.listeners.get('*');
        if (generalListeners) {
          generalListeners.forEach(listener => {
            try {
              listener(message);
            } catch (error) {
              console.error('❌ Error in general cross-tab listener:', error);
            }
          });
        }
      } catch (error) {
        console.error('❌ Error parsing cross-tab message:', error);
      }
    });

    this.isInitialized = true;
    console.log('✅ Cross-tab sync initialized with localStorage fallback');
  }

  /**
   * Broadcast a message to all other tabs
   */
  broadcast(message: Omit<CrossTabMessage, 'timestamp' | 'tabId'>) {
    // CRITICAL: Ensure only clean JSON is sent through BroadcastChannel
    // DataCloneError occurs when trying to send complex objects with functions or proxies
    // Use JSON.parse(JSON.stringify()) to create a clean, serializable copy
    const cleanMessage = {
      type: message.type,
      storeName: message.storeName,
      action: message.action || undefined,
      // Deep clone data to ensure it's clean JSON (no functions, proxies, or circular refs)
      data: message.data ? JSON.parse(JSON.stringify(message.data)) : undefined,
    };
    
    const fullMessage: CrossTabMessage = {
      ...cleanMessage,
      timestamp: Date.now(),
      tabId: this.tabId,
    };

    if (this.channel) {
      // Use BroadcastChannel (preferred)
      try {
        // CRITICAL: Ensure message is clean JSON before sending
        // This prevents DataCloneError from complex objects
        this.channel.postMessage(fullMessage);
        console.log(`📤 Broadcasted cross-tab message:`, message.type, message.storeName);
      } catch (error) {
        console.error('❌ Error broadcasting message:', error);
        // If BroadcastChannel fails, fall back to localStorage
        try {
          localStorage.setItem('rsvp-cross-tab-sync', JSON.stringify(fullMessage));
          setTimeout(() => {
            localStorage.removeItem('rsvp-cross-tab-sync');
          }, 0);
        } catch (fallbackError) {
          console.error('❌ Error broadcasting message (localStorage fallback):', fallbackError);
        }
      }
    } else {
      // Fallback to localStorage
      try {
        localStorage.setItem('rsvp-cross-tab-sync', JSON.stringify(fullMessage));
        // Remove immediately to trigger storage event
        setTimeout(() => {
          localStorage.removeItem('rsvp-cross-tab-sync');
        }, 0);
      } catch (error) {
        console.error('❌ Error broadcasting message (localStorage):', error);
      }
    }
  }

  /**
   * Subscribe to messages for a specific store
   */
  subscribe(storeName: string, callback: (message: CrossTabMessage) => void) {
    if (!this.listeners.has(storeName)) {
      this.listeners.set(storeName, new Set());
    }
    this.listeners.get(storeName)!.add(callback);

    // Return unsubscribe function
    return () => {
      const storeListeners = this.listeners.get(storeName);
      if (storeListeners) {
        storeListeners.delete(callback);
        if (storeListeners.size === 0) {
          this.listeners.delete(storeName);
        }
      }
    };
  }

  /**
   * Subscribe to all messages
   */
  subscribeAll(callback: (message: CrossTabMessage) => void) {
    return this.subscribe('*', callback);
  }

  /**
   * Force all tabs to refresh their data
   */
  forceRefresh(storeName: string) {
    this.broadcast({
      type: 'force-refresh',
      storeName,
    });
  }

  /**
   * Get the current tab ID
   */
  getTabId(): string {
    return this.tabId;
  }

  /**
   * Check if cross-tab sync is initialized
   */
  isReady(): boolean {
    return this.isInitialized;
  }

  /**
   * Cleanup
   */
  destroy() {
    if (this.channel) {
      this.channel.close();
      this.channel = null;
    }
    this.listeners.clear();
    this.isInitialized = false;
  }
}

// Singleton instance
export const crossTabSync = new CrossTabSync();

// Cleanup on page unload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    crossTabSync.destroy();
  });
}

