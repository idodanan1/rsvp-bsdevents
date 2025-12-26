import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Reminder } from '../types';
import type { Client, ClientEvent, ClientStats, ClientFilterOptions, ReminderFilterOptions } from '../types/index';
import { formatDate, cleanName } from '../utils/helpers';
import { crossTabSync } from '../utils/crossTabSync';

// Local helper function
const generateId = () => Math.random().toString(36).substr(2, 9);

export interface ClientStore {
  clients: Client[];
  reminders: Reminder[];
  currentClient: Client | null;
  isLoading: boolean;
  error: string | null;
  filters: ClientFilterOptions;
  reminderFilters: ReminderFilterOptions;
  
  // Client Actions
  fetchClients: () => Promise<void>;
  createClient: (client: Omit<Client, 'id' | 'createdAt' | 'updatedAt' | 'events' | 'totalEvents' | 'totalGuests'>) => Promise<void>;
  updateClient: (id: string, updates: Partial<Client>) => Promise<void>;
  deleteClient: (id: string) => Promise<void>;
  setCurrentClient: (client: Client | null) => void;
  addClientEvent: (clientId: string, event: Omit<ClientEvent, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateClientEvent: (clientId: string, eventId: string, updates: Partial<ClientEvent>) => Promise<void>;
  removeClientEvent: (clientId: string, eventId: string) => Promise<void>;
  
  // Reminder Actions
  createReminder: (reminder: Omit<Reminder, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateReminder: (id: string, updates: Partial<Reminder>) => Promise<void>;
  deleteReminder: (id: string) => Promise<void>;
  completeReminder: (id: string, completedBy?: string, notes?: string) => Promise<void>;
  markReminderOverdue: (id: string) => Promise<void>;
  
  // Filter Actions
  setFilters: (filters: ClientFilterOptions) => void;
  setReminderFilters: (filters: ReminderFilterOptions) => void;
  clearFilters: () => void;
  clearReminderFilters: () => void;
  
  // Stats
  getClientStats: () => ClientStats;
  getFilteredClients: () => Client[];
  getFilteredReminders: () => Reminder[];
  getUpcomingReminders: (days?: number) => Reminder[];
  getOverdueReminders: () => Reminder[];
  
  // Utility Actions
  searchClients: (query: string) => Client[];
  getClientEvents: (clientId: string) => ClientEvent[];
  getClientReminders: (clientId: string) => Reminder[];
  syncWithEvents: () => Promise<void>;
}

export const useClientStore = create<ClientStore>()(
  persist(
    (set, get) => ({
      clients: [],
      reminders: [],
      currentClient: null,
      isLoading: false,
      error: null,
      filters: {},
      reminderFilters: {},

      fetchClients: async () => {
        set({ isLoading: true, error: null });
        try {
          // Check if there are clients in localStorage
          const stored = localStorage.getItem('client-store');
          if (stored) {
            const parsed = JSON.parse(stored);
            if (parsed.state && parsed.state.clients) {
              set({ 
                clients: parsed.state.clients, 
                reminders: parsed.state.reminders || [],
                isLoading: false 
              });
              return;
            }
          }
          
          console.log('📝 No clients found in localStorage');
          set({ clients: [], reminders: [], isLoading: false });
        } catch (error) {
          console.error('❌ Error fetching clients:', error);
          set({ error: 'שגיאה בטעינת הלקוחות', isLoading: false });
        }
      },

      createClient: async (clientData: any) => {
        set({ isLoading: true, error: null });
        try {
          const newClient: Client = {
            ...clientData,
            id: generateId(),
            firstName: cleanName(clientData.firstName),
            lastName: cleanName(clientData.lastName),
            events: [],
            totalEvents: 0,
            totalGuests: 0,
            createdAt: new Date(),
            updatedAt: new Date()
          };
          
          set((state: any) => ({
            clients: [...state.clients, newClient],
            isLoading: false
          }));
        } catch (error) {
          set({ error: 'שגיאה ביצירת הלקוח', isLoading: false });
        }
      },

      updateClient: async (id: any, updates: any) => {
        set({ isLoading: true, error: null });
        try {
          // Clean names if they're being updated
          const cleanedUpdates = { ...updates };
          if (updates.firstName !== undefined) {
            cleanedUpdates.firstName = cleanName(updates.firstName);
          }
          if (updates.lastName !== undefined) {
            cleanedUpdates.lastName = cleanName(updates.lastName);
          }
          
          set((state: any) => ({
            clients: state.clients.map((client: any) =>
              client.id === id
                ? { ...client, ...cleanedUpdates, updatedAt: new Date() }
                : client
            ),
            currentClient: state.currentClient?.id === id 
              ? { ...state.currentClient, ...cleanedUpdates, updatedAt: new Date() }
              : state.currentClient,
            isLoading: false
          }));
        } catch (error) {
          set({ error: 'שגיאה בעדכון הלקוח', isLoading: false });
        }
      },

      deleteClient: async (id: any) => {
        set({ isLoading: true, error: null });
        try {
          set((state: any) => ({
            clients: state.clients.filter((client: any) => client.id !== id),
            currentClient: state.currentClient?.id === id ? null : state.currentClient,
            reminders: state.reminders.filter((reminder: any) => reminder.clientId !== id),
            isLoading: false
          }));
        } catch (error) {
          set({ error: 'שגיאה במחיקת הלקוח', isLoading: false });
        }
      },

      setCurrentClient: (client: any) => {
        set({ currentClient: client });
      },

      addClientEvent: async (clientId: any, eventData: any) => {
        set({ isLoading: true, error: null });
        try {
          const newEvent: ClientEvent = {
            ...eventData,
            id: generateId(),
            createdAt: new Date(),
            updatedAt: new Date()
          };
          
          set((state: any) => {
            const updatedClients = state.clients.map((client: any) =>
              client.id === clientId
                ? { 
                    ...client, 
                    events: [...client.events, newEvent],
                    totalEvents: client.totalEvents + 1,
                    totalGuests: client.totalGuests + eventData.guestCount,
                    updatedAt: new Date()
                  }
                : client
            );
            
            return {
              clients: updatedClients,
              currentClient: state.currentClient?.id === clientId 
                ? { 
                    ...state.currentClient, 
                    events: [...state.currentClient.events, newEvent],
                    totalEvents: state.currentClient.totalEvents + 1,
                    totalGuests: state.currentClient.totalGuests + eventData.guestCount,
                    updatedAt: new Date()
                  }
                : state.currentClient,
              isLoading: false
            };
          });
        } catch (error) {
          set({ error: 'שגיאה בהוספת אירוע ללקוח', isLoading: false });
        }
      },

      updateClientEvent: async (clientId: any, eventId: any, updates: any) => {
        set({ isLoading: true, error: null });
        try {
          set((state: any) => {
            const updatedClients = state.clients.map((client: any) =>
              client.id === clientId
                ? {
                    ...client,
                    events: client.events.map((event: any) =>
                      event.id === eventId
                        ? { ...event, ...updates, updatedAt: new Date() }
                        : event
                    ),
                    updatedAt: new Date()
                  }
                : client
            );
            
            return {
              clients: updatedClients,
              currentClient: state.currentClient?.id === clientId 
                ? {
                    ...state.currentClient,
                    events: state.currentClient.events.map((event: any) =>
                      event.id === eventId
                        ? { ...event, ...updates, updatedAt: new Date() }
                        : event
                    ),
                    updatedAt: new Date()
                  }
                : state.currentClient,
              isLoading: false
            };
          });
        } catch (error) {
          set({ error: 'שגיאה בעדכון אירוע הלקוח', isLoading: false });
        }
      },

      removeClientEvent: async (clientId: any, eventId: any) => {
        set({ isLoading: true, error: null });
        try {
          set((state: any) => {
            const client = state.clients.find((c: any) => c.id === clientId);
            const eventToRemove = client?.events.find((e: any) => e.id === eventId);
            
            const updatedClients = state.clients.map((client: any) =>
              client.id === clientId
                ? {
                    ...client,
                    events: client.events.filter((event: any) => event.id !== eventId),
                    totalEvents: Math.max(0, client.totalEvents - 1),
                    totalGuests: Math.max(0, client.totalGuests - (eventToRemove?.guestCount || 0)),
                    updatedAt: new Date()
                  }
                : client
            );
            
            return {
              clients: updatedClients,
              currentClient: state.currentClient?.id === clientId 
                ? {
                    ...state.currentClient,
                    events: state.currentClient.events.filter((event: any) => event.id !== eventId),
                    totalEvents: Math.max(0, state.currentClient.totalEvents - 1),
                    totalGuests: Math.max(0, state.currentClient.totalGuests - (eventToRemove?.guestCount || 0)),
                    updatedAt: new Date()
                  }
                : state.currentClient,
              isLoading: false
            };
          });
        } catch (error) {
          set({ error: 'שגיאה בהסרת אירוע מהלקוח', isLoading: false });
        }
      },

      createReminder: async (reminderData: any) => {
        set({ isLoading: true, error: null });
        try {
          const newReminder: Reminder = {
            ...reminderData,
            id: generateId(),
            createdAt: new Date(),
            updatedAt: new Date()
          };
          
          set((state: any) => ({
            reminders: [...state.reminders, newReminder],
            isLoading: false
          }));
        } catch (error) {
          set({ error: 'שגיאה ביצירת התזכורת', isLoading: false });
        }
      },

      updateReminder: async (id: any, updates: any) => {
        set({ isLoading: true, error: null });
        try {
          set((state: any) => ({
            reminders: state.reminders.map((reminder: any) =>
              reminder.id === id
                ? { ...reminder, ...updates, updatedAt: new Date() }
                : reminder
            ),
            isLoading: false
          }));
        } catch (error) {
          set({ error: 'שגיאה בעדכון התזכורת', isLoading: false });
        }
      },

      deleteReminder: async (id: any) => {
        set({ isLoading: true, error: null });
        try {
          set((state: any) => ({
            reminders: state.reminders.filter((reminder: any) => reminder.id !== id),
            isLoading: false
          }));
        } catch (error) {
          set({ error: 'שגיאה במחיקת התזכורת', isLoading: false });
        }
      },

      completeReminder: async (id: any, completedBy: any, notes: any) => {
        set({ isLoading: true, error: null });
        try {
          set((state: any) => ({
            reminders: state.reminders.map((reminder: any) =>
              reminder.id === id
                ? { 
                    ...reminder, 
                    status: 'completed',
                    completedAt: new Date(),
                    completedBy,
                    notes: notes || reminder.notes,
                    updatedAt: new Date()
                  }
                : reminder
            ),
            isLoading: false
          }));
        } catch (error) {
          set({ error: 'שגיאה בסיום התזכורת', isLoading: false });
        }
      },

      markReminderOverdue: async (id: any) => {
        set({ isLoading: true, error: null });
        try {
          set((state: any) => ({
            reminders: state.reminders.map((reminder: any) =>
              reminder.id === id
                ? { ...reminder, status: 'overdue', updatedAt: new Date() }
                : reminder
            ),
            isLoading: false
          }));
        } catch (error) {
          set({ error: 'שגיאה בסימון התזכורת כפגת תוקף', isLoading: false });
        }
      },

      setFilters: (filters: any) => {
        set({ filters });
      },

      setReminderFilters: (filters: any) => {
        set({ reminderFilters: filters });
      },

      clearFilters: () => {
        set({ filters: {} });
      },

      clearReminderFilters: () => {
        set({ reminderFilters: {} });
      },

      getClientStats: () => {
        const { clients, reminders } = get();
        const now = new Date();
        
        const totalClients = clients.length;
        const activeClients = clients.filter((c: any) => c.isActive).length;
        const totalEvents = clients.reduce((sum: number, c: any) => sum + c.totalEvents, 0);
        const upcomingEvents = clients.reduce((sum: number, c: any) => 
          sum + c.events.filter((e: any) => e.status === 'upcoming' && new Date(e.eventDate) > now).length, 0
        );
        const completedEvents = clients.reduce((sum: number, c: any) => 
          sum + c.events.filter((e: any) => e.status === 'completed').length, 0
        );
        const totalGuests = clients.reduce((sum: number, c: any) => sum + c.totalGuests, 0);
        const averageResponseRate = clients.length > 0 
          ? clients.reduce((sum: number, c: any) => 
              sum + c.events.reduce((eventSum: number, e: any) => eventSum + e.responseRate, 0) / c.events.length, 0
            ) / clients.length
          : 0;
        const pendingReminders = reminders.filter((r: any) => r.status === 'pending').length;
        const overdueReminders = reminders.filter((r: any) => r.status === 'overdue').length;

        return {
          totalClients,
          activeClients,
          totalEvents,
          upcomingEvents,
          completedEvents,
          averageResponseRate,
          totalGuests,
          pendingReminders,
          overdueReminders
        };
      },

      getFilteredClients: () => {
        const { clients, filters } = get();
        let filtered = [...clients];

        if (filters.searchTerm) {
          const searchLower = filters.searchTerm.toLowerCase();
          filtered = filtered.filter((client: any) =>
            client.firstName.toLowerCase().includes(searchLower) ||
            client.lastName.toLowerCase().includes(searchLower) ||
            client.phoneNumber.includes(searchLower) ||
            client.email?.toLowerCase().includes(searchLower) ||
            client.company?.toLowerCase().includes(searchLower)
          );
        }

        if (filters.tags && filters.tags.length > 0) {
          filtered = filtered.filter((client: any) =>
            client.tags?.some((tag: any) => filters.tags!.includes(tag))
          );
        }

        if (filters.status && filters.status.length > 0) {
          filtered = filtered.filter((client: any) =>
            filters.status!.includes(client.isActive ? 'active' : 'inactive')
          );
        }

        if (filters.eventType && filters.eventType.length > 0) {
          filtered = filtered.filter((client: any) =>
            client.events.some((event: any) => filters.eventType!.includes(event.eventType))
          );
        }

        if (filters.dateRange) {
          filtered = filtered.filter((client: any) =>
            client.events.some((event: any) => {
              const eventDate = new Date(event.eventDate);
              return eventDate >= filters.dateRange!.start && eventDate <= filters.dateRange!.end;
            })
          );
        }

        if (filters.hasUpcomingEvents) {
          const now = new Date();
          filtered = filtered.filter((client: any) =>
            client.events.some((event: any) => 
              event.status === 'upcoming' && new Date(event.eventDate) > now
            )
          );
        }

        if (filters.hasOverdueReminders) {
          const overdueReminderIds = get().getOverdueReminders().map((r: any) => r.clientId);
          filtered = filtered.filter((client: any) => overdueReminderIds.includes(client.id));
        }

        if (filters.serviceAreas && filters.serviceAreas.length > 0) {
          filtered = filtered.filter((client: any) => {
            if (!client.serviceAreas || client.serviceAreas.length === 0) return false;
            
            // Check if client has any of the selected service areas
            return filters.serviceAreas!.some((area: any) => 
              client.serviceAreas!.includes(area) || 
              (area === 'all' && client.serviceAreas!.includes('all'))
            );
          });
        }

        return filtered;
      },

      getFilteredReminders: () => {
        const { reminders, reminderFilters } = get();
        let filtered = [...reminders];

        if (reminderFilters.clientId) {
          filtered = filtered.filter((reminder: any) => reminder.clientId === reminderFilters.clientId);
        }

        if (reminderFilters.eventId) {
          filtered = filtered.filter((reminder: any) => reminder.eventId === reminderFilters.eventId);
        }

        if (reminderFilters.type && reminderFilters.type.length > 0) {
          filtered = filtered.filter((reminder: any) => reminderFilters.type!.includes(reminder.type));
        }

        if (reminderFilters.status && reminderFilters.status.length > 0) {
          filtered = filtered.filter((reminder: any) => reminderFilters.status!.includes(reminder.status));
        }

        if (reminderFilters.priority && reminderFilters.priority.length > 0) {
          filtered = filtered.filter((reminder: any) => reminderFilters.priority!.includes(reminder.priority));
        }

        if (reminderFilters.dateRange) {
          filtered = filtered.filter((reminder: any) => {
            const reminderDate = new Date(reminder.reminderDate);
            return reminderDate >= reminderFilters.dateRange!.start && 
                   reminderDate <= reminderFilters.dateRange!.end;
          });
        }

        if (reminderFilters.isOverdue) {
          const now = new Date();
          filtered = filtered.filter((reminder: any) => 
            reminder.status === 'pending' && new Date(reminder.reminderDate) < now
          );
        }

        return filtered;
      },

      getUpcomingReminders: (days: any = 7) => {
        const { reminders } = get();
        const now = new Date();
        const futureDate = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
        
        return reminders.filter((reminder: any) =>
          reminder.status === 'pending' &&
          new Date(reminder.reminderDate) >= now &&
          new Date(reminder.reminderDate) <= futureDate
        ).sort((a: any, b: any) => new Date(a.reminderDate).getTime() - new Date(b.reminderDate).getTime());
      },

      getOverdueReminders: () => {
        const { reminders } = get();
        const now = new Date();
        
        return reminders.filter((reminder: any) =>
          reminder.status === 'pending' && new Date(reminder.reminderDate) < now
        ).sort((a: any, b: any) => new Date(a.reminderDate).getTime() - new Date(b.reminderDate).getTime());
      },

      searchClients: (query: any) => {
        const { clients } = get();
        const searchLower = query.toLowerCase();
        
        return clients.filter((client: any) =>
          client.firstName.toLowerCase().includes(searchLower) ||
          client.lastName.toLowerCase().includes(searchLower) ||
          client.phoneNumber.includes(searchLower) ||
          client.email?.toLowerCase().includes(searchLower) ||
          client.company?.toLowerCase().includes(searchLower)
        );
      },

      getClientEvents: (clientId: any) => {
        const client = get().clients.find((c: any) => c.id === clientId);
        return client?.events || [];
      },

      getClientReminders: (clientId: any) => {
        const { reminders } = get();
        return reminders.filter((reminder: any) => reminder.clientId === clientId);
      },

      syncWithEvents: async () => {
        set({ isLoading: true, error: null });
        try {
          // This would sync with the event store to keep client events in sync
          // For now, we'll just mark as completed
          set({ isLoading: false });
        } catch (error) {
          set({ error: 'שגיאה בסנכרון עם אירועים', isLoading: false });
        }
      }
    }),
    {
      name: 'client-store',
      partialize: (state: any) => ({ 
        clients: state.clients,
        reminders: state.reminders,
        currentClient: state.currentClient
      })
    }
  )
);

// Set up cross-tab synchronization listener for clientStore
if (typeof window !== 'undefined') {
  crossTabSync.subscribe('client-store', (message) => {
    if (message.type === 'store-update' || message.type === 'force-refresh') {
      const store = useClientStore.getState();
      
      // Handle force refresh
      if (message.type === 'force-refresh' || message.action === 'force-refresh') {
        console.log('🔄 Cross-tab: Force refreshing clients...');
        store.fetchClients().catch((err: any) => {
          console.error('❌ Error refreshing clients from cross-tab:', err);
        });
        return;
      }
      
      // Handle store updates
      if (message.data?.state) {
        console.log('🔄 Cross-tab: Updating clients from other tab...');
        const newState = message.data.state;
        
        // Mark that this update is from cross-tab to avoid broadcasting back
        (window as any).__rsvp_cross_tab_update = true;
        
        // Update store with new state
        useClientStore.setState({
          clients: newState.clients || store.clients,
          reminders: newState.reminders || store.reminders,
          currentClient: newState.currentClient || store.currentClient,
        });
      }
    }
  });
  
  // Broadcast store updates when state changes
  let lastStateHash = '';
  useClientStore.subscribe((state) => {
    // Create a hash of the state to detect changes
    const stateHash = JSON.stringify({
      clientsCount: state.clients.length,
      remindersCount: state.reminders.length,
      currentClientId: state.currentClient?.id,
    });
    
    // Only broadcast if state actually changed
    if (stateHash !== lastStateHash) {
      lastStateHash = stateHash;
      
      // Broadcast the update (but avoid infinite loops by checking if this is from a cross-tab update)
      const isFromCrossTab = (window as any).__rsvp_cross_tab_update;
      if (!isFromCrossTab && crossTabSync.isReady()) {
        crossTabSync.broadcast({
          type: 'store-update',
          storeName: 'client-store',
          action: 'state-change',
          data: {
            state: {
              clients: state.clients,
              reminders: state.reminders,
              currentClient: state.currentClient,
            },
          },
        });
      }
      (window as any).__rsvp_cross_tab_update = false;
    }
  });
}
