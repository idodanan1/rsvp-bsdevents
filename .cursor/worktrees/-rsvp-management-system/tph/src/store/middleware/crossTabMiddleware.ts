/**
 * Zustand middleware for cross-tab synchronization
 * Broadcasts store changes to all other tabs
 */

import { StateCreator } from 'zustand';
import { crossTabSync } from '../../utils/crossTabSync';

export interface CrossTabConfig {
  storeName: string;
  // Actions to broadcast (empty array = broadcast all)
  broadcastActions?: string[];
  // Actions to ignore (won't be broadcast)
  ignoreActions?: string[];
}

/**
 * Middleware that broadcasts store changes to other tabs
 */
export const crossTabMiddleware = <T extends object>(
  config: CrossTabConfig
) => {
  return (f: StateCreator<T>) => {
    return (set: any, get: any, api: any) => {
      const store = f(set, get, api);

      // Wrap the set function to broadcast changes
      const originalSet = api.setState;
      api.setState = (partial: any, replace?: boolean, action?: string) => {
        // Call original set
        originalSet(partial, replace);

        // Broadcast to other tabs
        if (crossTabSync.isReady()) {
          const shouldBroadcast = 
            !config.broadcastActions || // If no specific actions, broadcast all
            config.broadcastActions.length === 0 || // Empty array = broadcast all
            (action && config.broadcastActions.includes(action)) || // Action is in broadcast list
            (!action && config.broadcastActions.length === 0); // No action specified and broadcast all

          const shouldIgnore = 
            action && 
            config.ignoreActions && 
            config.ignoreActions.includes(action);

          if (shouldBroadcast && !shouldIgnore) {
            crossTabSync.broadcast({
              type: 'store-update',
              storeName: config.storeName,
              action: action || 'setState',
              data: {
                partial,
                replace,
                state: get(),
              },
            });
          }
        }
      };

      return store;
    };
  };
};

/**
 * Helper to create a cross-tab aware store action
 * Use this to manually broadcast specific actions
 */
export const createCrossTabAction = <T extends (...args: any[]) => any>(
  storeName: string,
  actionName: string,
  action: T
): T => {
  return ((...args: Parameters<T>) => {
    const result = action(...args);
    
    // Broadcast the action
    if (crossTabSync.isReady()) {
      crossTabSync.broadcast({
        type: 'store-update',
        storeName,
        action: actionName,
        data: {
          args,
          result,
        },
      });
    }
    
    return result;
  }) as T;
};

