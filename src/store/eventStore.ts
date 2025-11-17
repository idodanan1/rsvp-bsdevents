import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Event, Guest, EventStore, ExcelImportData, ExcelExportData, Table, VenueLayout, Campaign } from '../types';
import { generateId, formatDate } from '../utils/helpers';
import { messageService, MessageData, MessageRecipient, BulkMessageResult } from '../services/messageService';
import { generateQRCodeImage } from '../services/qrService';

const mockEvents: Event[] = [];

export const useEventStore = create<EventStore>()(
  persist(
    (set, get) => ({
      events: mockEvents,
      deletedEvents: [], // אירועים שנמחקו
      currentEvent: null,
      isLoading: false,
      error: null,

      fetchEvents: async () => {
        set({ isLoading: true, error: null });
        try {
          // Get current user ID
          const userStorage = localStorage.getItem('rsvp-user-storage');
          let userId = '';
          if (userStorage) {
            const parsed = JSON.parse(userStorage);
            userId = parsed.state?.user?.id || '';
          }

          // Check if there are events in localStorage
          const stored = localStorage.getItem('rsvp-events-storage');
          if (stored) {
            const parsed = JSON.parse(stored);
            if (parsed.state && parsed.state.events && parsed.state.events.length > 0) {
              // Filter events by userId (if logged in)
              let filteredEvents = parsed.state.events;
              if (userId) {
                filteredEvents = parsed.state.events.filter((event: Event) => event.userId === userId);
              }
              console.log('📋 Found existing events:', filteredEvents.length, 'for user:', userId);
              set({ events: filteredEvents, isLoading: false });
              return;
            }
          }
          
          // If no events found, don't create sample events
          console.log('📝 No events found in localStorage');
          set({ events: [], isLoading: false });
        } catch (error) {
          console.error('❌ Error fetching events:', error);
          set({ error: 'שגיאה בטעינת האירועים', isLoading: false });
        }
      },

      createEvent: async (eventData) => {
        console.log('🔍 createEvent called with:', eventData);
        set({ isLoading: true, error: null });
        try {
          const eventId = generateId();
          
          // Create 5 default campaigns according to the correct schedule
          const defaultCampaigns: Campaign[] = [
            {
              id: generateId(),
              eventId: eventId,
              name: 'הזמנה ראשונית',
              message: `🎉 שלום {{guest_name}}! 

אנחנו שמחים להזמין אותך ל{{event_type}} של {{groom_name}} ו{{bride_name}}! 

📅 תאריך: {{event_date}}
🕐 שעה: {{event_time}}
📍 מיקום: {{venue}}

אנא אשר/י הגעה בקישור הבא:
🔗 {{guest_response_link}}

בברכה,
{{couple_name}} 💕`,
              channel: 'whatsapp' as const,
              scheduledDate: new Date(eventData.eventDate.getTime() - 30 * 24 * 60 * 60 * 1000), // 30 days before
              status: 'draft' as const,
              sentCount: 0,
              responseCount: 0,
              createdAt: new Date(),
              updatedAt: new Date(),
              // Use WhatsApp template for first message
              templateName: 'aa', // Template name in Meta Business Manager
              // WhatsApp buttons
              whatsappButtons: [
                {
                  type: 'reply' as const,
                  reply: {
                    id: 'attendance_update',
                    title: 'לעדכון סטטוס הגעה'
                  }
                },
                {
                  type: 'reply' as const,
                  reply: {
                    id: 'gift_info',
                    title: 'להענקת מתנה'
                  }
                }
              ],
              // SMS fallback with link
              smsMessage: `שלום {{guest_name}}! 

אנחנו שמחים להזמין אותך ל{{event_type}} של {{groom_name}} ו{{bride_name}}! 

📅 תאריך: {{event_date}}
🕐 שעה: {{event_time}}
📍 מיקום: {{venue}}

אנא אשר/י הגעה בקישור הבא:
{{guest_response_link}}

בברכה,
{{couple_name}}`
            },
            {
              id: generateId(),
              name: 'תזכורת שנייה',
              message: `⏰ שלום {{guest_name}}! 

תזכורת חמה: ה{{event_type}} של {{couple_name}} מתקרב! 

📅 תאריך: {{event_date}}
🕐 שעה: {{event_time}}
📍 מיקום: {{venue}}

אם עדיין לא אשרת הגעה, אנא עשה זאת בקישור:
🔗 {{guest_response_link}}

מחכים לראות אותך! 🎉`,
              channel: 'whatsapp' as const,
              scheduledDate: new Date(eventData.eventDate.getTime() - 14 * 24 * 60 * 60 * 1000), // 14 days before
              status: 'draft' as const,
              sentCount: 0,
              responseCount: 0,
              createdAt: new Date(),
              updatedAt: new Date(),
              // Use WhatsApp template 'aa' for this campaign
              templateName: 'aa', // Template name in Meta Business Manager
              // WhatsApp buttons
              whatsappButtons: [
                {
                  type: 'reply',
                  reply: {
                    id: 'attendance_update',
                    title: 'לעדכון סטטוס הגעה'
                  }
                }
              ],
              // SMS fallback with link
              smsMessage: `שלום {{guest_name}}! 

תזכורת: ה{{event_type}} של {{couple_name}} מתקרב! 

📅 תאריך: {{event_date}}
🕐 שעה: {{event_time}}
📍 מיקום: {{venue}}

אם עדיין לא אשרת הגעה, אנא עשה זאת בקישור:
{{guest_response_link}}

מחכים לראות אותך!`
            },
            {
              id: generateId(),
              name: 'תזכורת שבועית',
              message: `⏰ שלום {{guest_name}}! 

תזכורת אחרונה: ה{{event_type}} של {{couple_name}} בעוד שבוע! 

📅 תאריך: {{event_date}}
🕐 שעה: {{event_time}}
📍 מיקום: {{venue}}

אנא אשר/י הגעה עד סוף השבוע:
🔗 {{guest_response_link}}

בברכה,
{{couple_name}} 💕`,
              channel: 'whatsapp' as const,
              scheduledDate: new Date(eventData.eventDate.getTime() - 7 * 24 * 60 * 60 * 1000), // 7 days before
              status: 'draft' as const,
              sentCount: 0,
              responseCount: 0,
              createdAt: new Date(),
              updatedAt: new Date(),
              // Use WhatsApp template 'aa' for this campaign
              templateName: 'aa', // Template name in Meta Business Manager
              // WhatsApp buttons
              whatsappButtons: [
                {
                  type: 'reply',
                  reply: {
                    id: 'attendance_update',
                    title: 'לעדכון סטטוס הגעה'
                  }
                }
              ],
              // SMS fallback with link
              smsMessage: `שלום {{guest_name}}! 

תזכורת אחרונה: ה{{event_type}} של {{couple_name}} בעוד שבוע! 

📅 תאריך: {{event_date}}
🕐 שעה: {{event_time}}
📍 מיקום: {{venue}}

אנא אשר/י הגעה עד סוף השבוע:
{{guest_response_link}}

בברכה,
{{couple_name}}`
            },
            {
              id: generateId(),
              name: 'תזכורת אחרונה',
              message: `🎉 שלום {{first_name}}! 

מחר זה קורה! ה{{event_type}} של {{couple_name}}! 

📅 תאריך: {{event_date}}
🕐 שעה: {{event_time}}
📍 מיקום: {{venue}}
🪑 שולחן: {{table_number}}

אנא הגיעו 15 דקות לפני הזמן.

🔗 לעדכן סטטוס ההגעה לחץ

לא לשכוח להביא מצב רוח טוב! 😊`,
              channel: 'whatsapp' as const,
              scheduledDate: new Date(eventData.eventDate.getTime() - 24 * 60 * 60 * 1000), // 1 day before
              status: 'draft' as const,
              sentCount: 0,
              responseCount: 0,
              createdAt: new Date(),
              updatedAt: new Date(),
              // Use WhatsApp template 'reminer' for this campaign
              templateName: 'reminer', // Template name in Meta is "reminer" (not "reminder")
              // WhatsApp buttons
              whatsappButtons: [
                {
                  type: 'reply',
                  reply: {
                    id: 'attendance_update',
                    title: 'לעדכון סטטוס הגעה'
                  }
                }
              ],
              // SMS fallback with link
              smsMessage: `שלום {{first_name}}! 

מחר זה קורה! ה{{event_type}} של {{couple_name}}! 

📅 תאריך: {{event_date}}
🕐 שעה: {{event_time}}
📍 מיקום: {{venue}}
🪑 שולחן: {{table_number}}

אנא הגיעו 15 דקות לפני הזמן.

🔗 לעדכן סטטוס ההגעה לחץ

לא לשכוח להביא מצב רוח טוב!

בברכה,
{{couple_name}}`
            },
            {
              id: generateId(),
              name: 'תזכורת יום האירוע',
              message: `🎉 שלום {{guest_name}}! 

היום זה היום! ה{{event_type}} של {{couple_name}} מתקיים היום! 

📅 תאריך: {{event_date}}
🕐 שעה: {{event_time}}
📍 מיקום: {{venue}}
🪑 שולחן: {{table_number}}

סרוק את קוד ה-QR המצורף כשתגיע לאולם כדי:
✅ לקבל הודעה על מספר השולחן שלך
✅ לקבל ברכה אישית
✅ להירשם במערכת שהגעת

מחכים לראות אותך! 💕

בברכה,
{{couple_name}}`,
              channel: 'whatsapp' as const,
              scheduledDate: new Date(new Date(eventData.eventDate).setHours(8, 0, 0, 0)), // Same day at 8 AM
              status: 'draft' as const,
              sentCount: 0,
              responseCount: 0,
              createdAt: new Date(),
              updatedAt: new Date(),
              // WhatsApp buttons
              whatsappButtons: [
                {
                  type: 'reply',
                  reply: {
                    id: 'attendance_update',
                    title: 'לעדכון סטטוס הגעה'
                  }
                }
              ],
              // SMS fallback with link
              smsMessage: `שלום {{guest_name}}! 

היום זה היום! ה{{event_type}} של {{couple_name}} מתקיים היום! 

📅 תאריך: {{event_date}}
🕐 שעה: {{event_time}}
📍 מיקום: {{venue}}
🪑 שולחן: {{table_number}}

סרוק את קוד ה-QR המצורף כשתגיע לאולם.

מחכים לראות אותך!

בברכה,
{{couple_name}}`
            },
            {
              id: generateId(),
              name: 'הודעת תודה למגיעים',
              message: `🙏 שלום {{guest_name}}! 

תודה רבה שהגעת ל{{event_type}} של {{couple_name}}! 

היה לנו כיף לראות אותך ולהיות איתנו ביום המיוחד הזה.

תודה על הברכות והמתנות! 💝

תמונות מהאירוע יועלו בקרוב.

באהבה,
{{couple_name}} 💕`,
              channel: 'whatsapp' as const,
              scheduledDate: new Date(eventData.eventDate.getTime() + 24 * 60 * 60 * 1000), // 1 day after
              status: 'draft' as const,
              sentCount: 0,
              responseCount: 0,
              createdAt: new Date(),
              updatedAt: new Date(),
              // SMS fallback with link
              smsMessage: `שלום {{guest_name}}! 

תודה רבה שהגעת ל{{event_type}} של {{couple_name}}! 

היה לנו כיף לראות אותך ולהיות איתנו ביום המיוחד הזה.

תודה על הברכות והמתנות!

תמונות מהאירוע יועלו בקרוב.

באהבה,
{{couple_name}}`
            }
          ];
          
          // Get userId from localStorage (temporary - will be from backend)
          const userStorage = localStorage.getItem('rsvp-user-storage');
          let userId = '';
          if (userStorage) {
            const parsed = JSON.parse(userStorage);
            userId = parsed.state?.user?.id || '';
          }

          // Calculate credits needed (minimum 50, based on guest count)
          const guestCount = eventData.guests?.length || 0;
          const creditsNeeded = Math.max(50, Math.ceil(guestCount / 50) * 50); // Round up to nearest 50

          const newEvent: Event = {
            ...eventData,
            id: eventId,
            userId: userId || 'anonymous', // Add userId
            creditsUsed: creditsNeeded, // Add creditsUsed
            campaigns: defaultCampaigns,
            createdAt: new Date(),
            updatedAt: new Date()
          };
          
          set(state => {
            console.log('🔍 Before createEvent - events count:', state.events.length);
            const updatedEvents = [...state.events, newEvent];
            console.log('🔍 After createEvent - events count:', updatedEvents.length);
            console.log('🔍 New event created with 5 default campaigns:', newEvent);
            return {
              events: updatedEvents,
              isLoading: false
            };
          });
        } catch (error) {
          set({ error: 'שגיאה ביצירת האירוע', isLoading: false });
        }
      },

      updateEvent: async (id, updates) => {
        set({ isLoading: true, error: null });
        try {
          set(state => ({
            events: state.events.map(event =>
              event.id === id
                ? { ...event, ...updates, updatedAt: new Date() }
                : event
            ),
            isLoading: false
          }));
        } catch (error) {
          set({ error: 'שגיאה בעדכון האירוע', isLoading: false });
        }
      },

      deleteEvent: async (id) => {
        set({ isLoading: true, error: null });
        try {
          const eventToDelete = get().events.find(event => event.id === id);
          if (eventToDelete) {
          set(state => ({
            events: state.events.filter(event => event.id !== id),
              deletedEvents: [...state.deletedEvents, { ...eventToDelete, deletedAt: new Date() }],
            currentEvent: state.currentEvent?.id === id ? null : state.currentEvent,
            isLoading: false
          }));
          }
        } catch (error) {
          set({ error: 'שגיאה במחיקת האירוע', isLoading: false });
        }
      },

      setCurrentEvent: (event) => {
        console.log('🔍 setCurrentEvent called with:', event?.id);
        set({ currentEvent: event });
      },

      addGuest: async (eventId, guestData) => {
        console.log('🔍 addGuest called with:', { eventId, guestData });
        set({ isLoading: true, error: null });
        try {
          const newGuest: Guest = {
            ...guestData,
            id: generateId()
          };
          
          console.log('🔍 Generated new guest:', newGuest);
          
          set(state => {
            console.log('🔍 Current state events count:', state.events.length);
            console.log('🔍 Current event ID:', state.currentEvent?.id);
            
            const updatedEvents = state.events.map(event =>
              event.id === eventId
                ? { ...event, guests: [...event.guests, newGuest] }
                : event
            );
            
            const updatedCurrentEvent = state.currentEvent?.id === eventId 
              ? { ...state.currentEvent, guests: [...state.currentEvent.guests, newGuest] }
              : state.currentEvent;
            
            console.log('🔍 Before update - currentEvent guests count:', state.currentEvent?.guests?.length);
            console.log('🔍 After update - currentEvent guests count:', updatedCurrentEvent?.guests?.length);
            
            console.log('🔍 Updated events count:', updatedEvents.length);
            console.log('🔍 Updated current event guests count:', updatedCurrentEvent?.guests?.length);
            
            return {
              events: updatedEvents,
              currentEvent: updatedCurrentEvent,
              isLoading: false
            };
          });
          
          console.log('✅ addGuest completed successfully');
        } catch (error) {
          console.error('❌ Error in addGuest:', error);
          set({ error: 'שגיאה בהוספת מוזמן', isLoading: false });
        }
      },

      updateGuest: async (eventId, guestId, updates) => {
        set({ isLoading: true, error: null });
        try {
          set(state => {
            const updatedEvents = state.events.map(event =>
              event.id === eventId
                ? {
                    ...event,
                    guests: event.guests.map(guest =>
                      guest.id === guestId
                        ? { ...guest, ...updates }
                        : guest
                    )
                  }
                : event
            );
            
            const updatedCurrentEvent = state.currentEvent?.id === eventId 
              ? {
                  ...state.currentEvent,
                  guests: state.currentEvent.guests.map(guest =>
                    guest.id === guestId
                      ? { ...guest, ...updates }
                      : guest
                  )
                }
              : state.currentEvent;
            
            return {
              events: updatedEvents,
              currentEvent: updatedCurrentEvent,
              isLoading: false
            };
          });
        } catch (error) {
          set({ error: 'שגיאה בעדכון מוזמן', isLoading: false });
        }
      },

      updateGuestResponse: async (eventId, guestId, updatedGuest) => {
        set({ isLoading: true, error: null });
        try {
          const currentState = get();
          console.log(`🔄 updateGuestResponse called:`, {
            eventId,
            guestId,
            oldStatus: currentState.events.find(e => e.id === eventId)?.guests?.find(g => g.id === guestId)?.rsvpStatus,
            newStatus: updatedGuest.rsvpStatus
          });
          
          set(state => {
            const event = state.events.find(e => e.id === eventId);
            const guest = event?.guests?.find(g => g.id === guestId);
            
            console.log(`📋 Before update - Guest status:`, guest?.rsvpStatus);
            
            const updatedEvents = state.events.map(event =>
              event.id === eventId
                ? {
                    ...event,
                    guests: event.guests.map(guest =>
                      guest.id === guestId
                        ? { ...updatedGuest }
                        : guest
                    )
                  }
                : event
            );
            
            const updatedCurrentEvent = state.currentEvent?.id === eventId 
              ? {
                  ...state.currentEvent,
                  guests: state.currentEvent.guests.map(guest =>
                    guest.id === guestId
                      ? { ...updatedGuest }
                      : guest
                  )
                }
              : state.currentEvent;
            
            // Verify the update
            const verifyEvent = updatedEvents.find(e => e.id === eventId);
            const verifyGuest = verifyEvent?.guests?.find(g => g.id === guestId);
            console.log(`✅ After update - Guest status:`, verifyGuest?.rsvpStatus);
            
            return {
              events: updatedEvents,
              currentEvent: updatedCurrentEvent,
              isLoading: false
            };
          });
        } catch (error) {
          console.error('❌ Error in updateGuestResponse:', error);
          set({ error: 'שגיאה בעדכון תגובת מוזמן', isLoading: false });
        }
      },

      deleteGuest: async (eventId, guestId) => {
        set({ isLoading: true, error: null });
        try {
          set(state => {
            const updatedEvents = state.events.map(event =>
              event.id === eventId
                ? {
                    ...event,
                    guests: event.guests.filter(guest => guest.id !== guestId)
                  }
                : event
            );
            
            const updatedCurrentEvent = state.currentEvent?.id === eventId 
              ? {
                  ...state.currentEvent,
                  guests: state.currentEvent.guests.filter(guest => guest.id !== guestId)
                }
              : state.currentEvent;
            
            return {
              events: updatedEvents,
              currentEvent: updatedCurrentEvent,
              isLoading: false
            };
          });
        } catch (error) {
          set({ error: 'שגיאה במחיקת מוזמן', isLoading: false });
        }
      },

      importGuestsFromExcel: async (eventId, data) => {
        set({ isLoading: true, error: null });
        try {
          const newGuests: Guest[] = data.map(guestData => ({
            id: generateId(),
            firstName: guestData.firstName,
            lastName: guestData.lastName,
            phoneNumber: guestData.phoneNumber,
            guestCount: guestData.guestCount,
            notes: guestData.notes,
            rsvpStatus: 'pending',
            channel: 'manual',
            actualAttendance: 'not_marked',
            tags: []
          }));

          set(state => ({
            events: state.events.map(event =>
              event.id === eventId
                ? { ...event, guests: [...event.guests, ...newGuests] }
                : event
            ),
            isLoading: false
          }));
        } catch (error) {
          set({ error: 'שגיאה בייבוא נתונים', isLoading: false });
        }
      },

      exportGuestsToExcel: async (eventId) => {
        set({ isLoading: true, error: null });
        try {
          const event = get().events.find(e => e.id === eventId);
          if (!event) {
            throw new Error('אירוע לא נמצא');
          }

          const exportData: ExcelExportData[] = event.guests.map(guest => ({
            firstName: guest.firstName,
            lastName: guest.lastName,
            phoneNumber: guest.phoneNumber,
            guestCount: guest.guestCount,
            notes: guest.notes,
            rsvpStatus: guest.rsvpStatus,
            responseDate: guest.responseDate?.toISOString(),
            actualAttendance: guest.actualAttendance,
            attendanceDate: guest.attendanceDate?.toISOString()
          }));

          console.log('Exporting data:', exportData);
          set({ isLoading: false });
        } catch (error) {
          set({ error: 'שגיאה בייצוא נתונים', isLoading: false });
        }
      },

      createCampaign: async (campaignData) => {
        set({ isLoading: true, error: null });
        try {
          const newCampaign = {
            ...campaignData,
            id: generateId(),
            createdAt: new Date(),
            updatedAt: new Date()
          };

          set(state => ({
            events: state.events.map(event =>
              event.id === campaignData.eventId
                ? { 
                    ...event, 
                    campaigns: [...(event.campaigns || []), newCampaign],
                    updatedAt: new Date()
                  }
                : event
            ),
            isLoading: false
          }));
        } catch (error) {
          set({ error: 'שגיאה ביצירת הקמפיין', isLoading: false });
        }
      },

      sendCampaign: async (eventId: string, campaignId: string): Promise<BulkMessageResult> => {
        set({ isLoading: true, error: null });
        try {
          const event = get().events.find(e => e.id === eventId);
          if (!event) {
            throw new Error('Event not found');
          }

          const campaign = event.campaigns?.find(c => c.id === campaignId);
          if (!campaign) {
            throw new Error('Campaign not found');
          }

          const guests = event.guests || [];
          
          // Check if this is the "event day reminder" campaign (contains QR code)
          const isEventDayReminder = campaign.name === 'תזכורת יום האירוע';
          
          // Determine template name based on campaign FIRST (before building templateParams)
          // If campaign has explicit templateName, use it
          // Otherwise, use default templates based on campaign name
          let templateNameForCampaign = campaign.templateName;
          if (!templateNameForCampaign) {
            // Use template 'aa' for these campaigns:
            if (campaign.name === 'הזמנה ראשונית' || 
                campaign.name === 'תזכורת שנייה' || 
                campaign.name === 'תזכורת שבועית') {
              templateNameForCampaign = 'aa'; // Template name in Meta Business Manager
            } else if (campaign.name === 'תזכורת אחרונה') {
              // Use template 'reminer' for "תזכורת אחרונה" campaign
              templateNameForCampaign = 'reminer';
            }
          }
          
          // Create personalized messages for each guest
          const personalizedMessages = await Promise.all(guests.map(async (guest) => {
            let personalizedMessage = campaign.message;
            let personalizedSmsMessage = campaign.smsMessage || campaign.message;
            
            // Replace the generic link with guest-specific link
            // Use production URL from environment or fallback to window.location.origin
            const frontendUrl = typeof window !== 'undefined' 
              ? window.location.origin 
              : (import.meta.env.VITE_FRONTEND_URL || 'https://rsvp-frontend-wy47.onrender.com');
            const guestLink = `${frontendUrl}/guest-response/${eventId}?guest=${guest.id}`;
            
            // Debug: Log the guest ID being used
            console.log('🔗 Campaign - Guest ID:', guest.id, 'for guest:', `${guest.firstName} ${guest.lastName}`);
            console.log('🔗 Campaign - Original message:', personalizedMessage);
            
            // Find the table number for this guest
            const guestTable = event.tables?.find(table => table.guests.includes(guest.id));
            const tableNumber = guestTable ? guestTable.number : 'לא הוקצה';
            
            // Replace template variables with actual values
            // Use consistent variable names: {{guest_name}} instead of {{first_name}}
            personalizedMessage = personalizedMessage
              .replace(/\{\{guest_name\}\}/g, guest.firstName)
              .replace(/\{\{first_name\}\}/g, guest.firstName) // Support both for backward compatibility
              .replace(/\{\{last_name\}\}/g, guest.lastName)
              .replace(/\{\{event_date\}\}/g, formatDate(event.eventDate))
              .replace(/\{\{event_time\}\}/g, event.eventTime)
              .replace(/\{\{event_type\}\}/g, event.eventTypeHebrew)
              .replace(/\{\{venue\}\}/g, event.venue)
              .replace(/\{\{couple_name\}\}/g, event.coupleName)
              .replace(/\{\{groom_name\}\}/g, event.groomName)
              .replace(/\{\{bride_name\}\}/g, event.brideName)
              .replace(/\{\{table_number\}\}/g, tableNumber.toString())
              .replace(/\{\{guest_response_link\}\}/g, guestLink);
            
            personalizedSmsMessage = personalizedSmsMessage
              .replace(/\{\{guest_name\}\}/g, guest.firstName)
              .replace(/\{\{first_name\}\}/g, guest.firstName) // Support both for backward compatibility
              .replace(/\{\{last_name\}\}/g, guest.lastName)
              .replace(/\{\{event_date\}\}/g, formatDate(event.eventDate))
              .replace(/\{\{event_time\}\}/g, event.eventTime)
              .replace(/\{\{event_type\}\}/g, event.eventTypeHebrew)
              .replace(/\{\{venue\}\}/g, event.venue)
              .replace(/\{\{couple_name\}\}/g, event.coupleName)
              .replace(/\{\{groom_name\}\}/g, event.groomName)
              .replace(/\{\{bride_name\}\}/g, event.brideName)
              .replace(/\{\{table_number\}\}/g, tableNumber.toString())
              .replace(/\{\{guest_response_link\}\}/g, guestLink);
            
            console.log('🔗 Campaign - Final message:', personalizedMessage);
            console.log('📏 Message length:', personalizedMessage.length, 'characters');
            console.log('📏 SMS Message length:', personalizedSmsMessage.length, 'characters');
            
            // Generate QR code image URL for event day reminder
            let qrCodeImageUrl: string | undefined;
            if (isEventDayReminder) {
              try {
                qrCodeImageUrl = await generateQRCodeImage(eventId, guest.id, 256);
                console.log('📱 Generated QR code for guest:', guest.id, qrCodeImageUrl);
              } catch (error) {
                console.error('❌ Error generating QR code:', error);
              }
            }
            
            return {
              guest,
              message: personalizedMessage,
              smsMessage: personalizedSmsMessage,
              qrCodeImageUrl
            };
          }));

          // Prepare template parameters for WhatsApp
          // IMPORTANT: Parameters must be in the exact order as defined in the Meta template
          // Order: {{1}} = first_name, {{2}} = event_type, {{3}} = groom_name, {{4}} = bride_name,
          //        {{5}} = event_date, {{6}} = event_time, {{7}} = venue, {{8}} = guest_response_link
          const recipients: MessageRecipient[] = personalizedMessages.map(({ guest, message, smsMessage, qrCodeImageUrl }) => {
            const guestTable = event.tables?.find(table => table.guests.includes(guest.id));
            const tableNumber = guestTable ? guestTable.number?.toString() : 'לא הוקצה';
            // Use production URL from environment or fallback to window.location.origin
            const frontendUrl = typeof window !== 'undefined' 
              ? window.location.origin 
              : (import.meta.env.VITE_FRONTEND_URL || 'https://rsvp-frontend-wy47.onrender.com');
            const guestLink = `${frontendUrl}/guest-response/${eventId}?guest=${guest.id}`;
            
            // Prepare template parameters based on the template name (use corrected templateNameForCampaign)
            // Different templates require different parameters
            let templateParams: any = {};
            
            if (templateNameForCampaign === 'aa' || templateNameForCampaign === 'AA' || templateNameForCampaign === 'a') {
              // Template "aa" requires these 9 parameters in order:
              // IMPORTANT: Order must match Meta template exactly: guest_name, event_type, bride_name, groom_name, event_date, event_time, venue, guest_response_link, couple_name
              // NOTE: Based on error message, the parameter name in Meta is "guest_response_link"
              templateParams = {
                paramsOrder: ['guest_name', 'event_type', 'bride_name', 'groom_name', 
                             'event_date', 'event_time', 'venue', 'guest_response_link', 'couple_name'],
                guest_name: guest.firstName,
                event_type: event.eventTypeHebrew,
                bride_name: event.brideName, // Parameter 3 - bride_name comes BEFORE groom_name in Meta template
                groom_name: event.groomName, // Parameter 4 - groom_name comes AFTER bride_name in Meta template
                event_date: formatDate(event.eventDate),
                event_time: event.eventTime,
                venue: event.venue,
                guest_response_link: guestLink, // Using guest_response_link as per Meta template definition
                couple_name: event.coupleName,
                language: 'he'
              };
            } else if (templateNameForCampaign === 'reminer' || templateNameForCampaign === 'reminder') {
              // Template "reminer" (note: name in Meta is "reminer", not "reminder") requires these 7 parameters in order:
              // 1. first_name (not guest_name!)
              // 2. event_type
              // 3. couple_name
              // 4. event_date
              // 5. event_time
              // 6. venue
              // 7. table_number
              // NOTE: guest_response_link is NOT included in this template
              const guestTable = event.tables?.find(table => table.guests.includes(guest.id));
              const tableNumber = guestTable ? guestTable.number?.toString() : 'לא הוקצה';
              
              templateParams = {
                paramsOrder: ['first_name', 'event_type', 'couple_name', 'event_date', 
                             'event_time', 'venue', 'table_number'],
                first_name: guest.firstName, // Parameter 1 - note: uses first_name, not guest_name
                event_type: event.eventTypeHebrew, // Parameter 2
                couple_name: event.coupleName, // Parameter 3
                event_date: formatDate(event.eventDate), // Parameter 4
                event_time: event.eventTime, // Parameter 5
                venue: event.venue, // Parameter 6
                table_number: tableNumber, // Parameter 7
                language: 'he' // Hebrew - as shown in Meta template
              };
            } else {
              // Default: use template "a" parameters
              // IMPORTANT: Order must match Meta template exactly: guest_name, event_type, bride_name, groom_name, event_date, event_time, venue, guest_response_link, couple_name
              // NOTE: Based on error message, the parameter name in Meta is "guest_response_link"
              templateParams = {
                paramsOrder: ['guest_name', 'event_type', 'bride_name', 'groom_name', 
                             'event_date', 'event_time', 'venue', 'guest_response_link', 'couple_name'],
                guest_name: guest.firstName,
                event_type: event.eventTypeHebrew,
                bride_name: event.brideName, // Parameter 3 - bride_name comes BEFORE groom_name in Meta template
                groom_name: event.groomName, // Parameter 4 - groom_name comes AFTER bride_name in Meta template
                event_date: formatDate(event.eventDate),
                event_time: event.eventTime,
                venue: event.venue,
                guest_response_link: guestLink, // Using guest_response_link as per Meta template definition
                couple_name: event.coupleName,
                language: 'he'
              };
            }
            
            // Create personalized buttons with guest-specific link
            const personalizedButtons = campaign.whatsappButtons?.map(button => {
              if (button.type === 'url' && button.url) {
                // Replace {{guest_response_link}} placeholder with actual guest link
                const buttonUrl = button.url.url.replace(/\{\{guest_response_link\}\}/g, guestLink);
                return {
                  type: 'url' as const,
                  url: buttonUrl,
                  title: button.url.title || 'אישור הגעה'
                };
              } else if (button.type === 'reply' && button.reply) {
                // Reply button - keep as is (no personalization needed)
                return {
                  type: 'reply' as const,
                  id: button.reply.id,
                  title: button.reply.title
                };
              }
              return button;
            }) || [
              // Default buttons
              {
                type: 'url' as const,
                url: guestLink,
                title: 'אישור הגעה'
              },
              {
                type: 'reply' as const,
                id: 'decline_attendance',
                title: 'לא אוכל להגיע'
              }
            ];
            
            return {
              id: guest.id,
              firstName: guest.firstName,
              lastName: guest.lastName,
              phoneNumber: guest.phoneNumber,
              channel: guest.channel as 'whatsapp' | 'sms',
              message: guest.channel === 'whatsapp' ? message : smsMessage,
              firstMessageSent: guest.firstMessageSent || false, // Pass first message status
              eventData: {
                coupleName: event.coupleName,
                groomName: event.groomName,
                brideName: event.brideName,
                eventType: event.eventType,
                eventTypeHebrew: event.eventTypeHebrew,
                eventDate: formatDate(event.eventDate),
                eventTime: event.eventTime,
                venue: event.venue,
                invitationImageUrl: qrCodeImageUrl || event.invitationImageUrl // Use QR code image for event day reminder
              },
              templateParams: guest.channel === 'whatsapp' ? templateParams : undefined,
              buttons: guest.channel === 'whatsapp' ? personalizedButtons : undefined
            };
          });

          // For event day reminder, use QR code image, otherwise use campaign image
          const imageUrlForCampaign = isEventDayReminder 
            ? undefined // QR codes will be in individual recipients
            : (campaign.imageUrl || undefined);
          
          const messageData: MessageData = {
            message: '', // Will be overridden by individual messages
            imageUrl: imageUrlForCampaign,
            recipients,
            // Use template if campaign specifies one (for first message campaigns)
            templateName: templateNameForCampaign
          };

          const result = await messageService.sendBulkMessages(messageData);

          set(state => ({
            events: state.events.map(event =>
              event.id === eventId
                ? {
                    ...event,
                    campaigns: event.campaigns?.map(c =>
                      c.id === campaignId
                        ? { ...c, status: 'sent', sentCount: result.successful, updatedAt: new Date() }
                        : c
                    ),
                    updatedAt: new Date()
                  }
                : event
            ),
            isLoading: false
          }));

          return result;
        } catch (error) {
          set({ error: 'שגיאה בשליחת הקמפיין', isLoading: false });
          throw error;
        }
      },

      sendTestMessage: async (phoneNumber: string, message: string, channel: 'whatsapp' | 'sms'): Promise<boolean> => {
        set({ isLoading: true, error: null });
        try {
          const recipients: MessageRecipient[] = [{
            id: 'test',
            firstName: 'Test',
            lastName: 'User',
            phoneNumber,
            channel
          }];

          const messageData: MessageData = {
            message,
            recipients
          };

          const result = await messageService.sendBulkMessages(messageData);
          
          set({ isLoading: false });
          return result.successful > 0;
        } catch (error) {
          set({ error: 'שגיאה בשליחת הודעת בדיקה', isLoading: false });
          return false;
        }
      },



      // Venue Layout Management Functions
      createVenueLayout: async (eventId: string, layoutData) => {
        set({ isLoading: true, error: null });
        try {
          const layoutId = generateId();
          const newLayout = {
            ...layoutData,
            id: layoutId,
            createdAt: new Date(),
            updatedAt: new Date()
          };

          set((state) => ({
            events: state.events.map(event => 
              event.id === eventId 
                ? { 
                    ...event, 
                    venueLayout: newLayout,
                    updatedAt: new Date()
                  }
                : event
            ),
            currentEvent: state.currentEvent?.id === eventId 
              ? { 
                  ...state.currentEvent, 
                  venueLayout: newLayout,
                  updatedAt: new Date()
                }
              : state.currentEvent,
            isLoading: false
          }));
        } catch (error) {
          set({ error: 'שגיאה ביצירת סקיצת אולם', isLoading: false });
        }
      },

      updateVenueLayout: async (eventId: string, updates) => {
        set({ isLoading: true, error: null });
        try {
          set((state) => ({
            events: state.events.map(event => 
              event.id === eventId 
                ? { 
                    ...event, 
                    venueLayout: event.venueLayout ? { ...event.venueLayout, ...updates, updatedAt: new Date() } : undefined,
                    updatedAt: new Date()
                  }
                : event
            ),
            currentEvent: state.currentEvent?.id === eventId 
              ? { 
                  ...state.currentEvent, 
                  venueLayout: state.currentEvent.venueLayout ? { ...state.currentEvent.venueLayout, ...updates, updatedAt: new Date() } : undefined,
                  updatedAt: new Date()
                }
              : state.currentEvent,
            isLoading: false
          }));
        } catch (error) {
          set({ error: 'שגיאה בעדכון סקיצת אולם', isLoading: false });
        }
      },

      updateTablePosition: async (eventId: string, tableId: string, x: number, y: number) => {
        set({ isLoading: true, error: null });
        try {
          set((state) => ({
            events: state.events.map(event => 
              event.id === eventId 
                ? { 
                    ...event, 
                    tables: event.tables.map(table => 
                      table.id === tableId 
                        ? { ...table, x, y, updatedAt: new Date() }
                        : table
                    ),
                    updatedAt: new Date()
                  }
                : event
            ),
            currentEvent: state.currentEvent?.id === eventId 
              ? { 
                  ...state.currentEvent, 
                  tables: state.currentEvent.tables.map(table => 
                    table.id === tableId 
                      ? { ...table, x, y, updatedAt: new Date() }
                      : table
                  ),
                  updatedAt: new Date()
                }
              : state.currentEvent,
            isLoading: false
          }));
        } catch (error) {
          set({ error: 'שגיאה בעדכון מיקום שולחן', isLoading: false });
        }
      },

      updateTableSize: async (eventId: string, tableId: string, width: number, height: number) => {
        set({ isLoading: true, error: null });
        try {
          set((state) => ({
            events: state.events.map(event => 
              event.id === eventId 
                ? { 
                    ...event, 
                    tables: event.tables.map(table => 
                      table.id === tableId 
                        ? { ...table, width, height, updatedAt: new Date() }
                        : table
                    ),
                    updatedAt: new Date()
                  }
                : event
            ),
            currentEvent: state.currentEvent?.id === eventId 
              ? { 
                  ...state.currentEvent, 
                  tables: state.currentEvent.tables.map(table => 
                    table.id === tableId 
                      ? { ...table, width, height, updatedAt: new Date() }
                      : table
                  ),
                  updatedAt: new Date()
                }
              : state.currentEvent,
            isLoading: false
          }));
        } catch (error) {
          set({ error: 'שגיאה בעדכון גודל שולחן', isLoading: false });
        }
      },

      updateTableRotation: async (eventId: string, tableId: string, rotation: number) => {
        set({ isLoading: true, error: null });
        try {
          set((state) => ({
            events: state.events.map(event => 
              event.id === eventId 
                ? { 
                    ...event, 
                    tables: event.tables.map(table => 
                      table.id === tableId 
                        ? { ...table, rotation, updatedAt: new Date() }
                        : table
                    ),
                    updatedAt: new Date()
                  }
                : event
            ),
            currentEvent: state.currentEvent?.id === eventId 
              ? { 
                  ...state.currentEvent, 
                  tables: state.currentEvent.tables.map(table => 
                    table.id === tableId 
                      ? { ...table, rotation, updatedAt: new Date() }
                      : table
                  ),
                  updatedAt: new Date()
                }
              : state.currentEvent,
            isLoading: false
          }));
        } catch (error) {
          set({ error: 'שגיאה בעדכון סיבוב שולחן', isLoading: false });
        }
      },

      updateTableShape: async (eventId: string, tableId: string, shape: 'rectangle' | 'circle' | 'oval') => {
        set({ isLoading: true, error: null });
        try {
          set((state) => ({
            events: state.events.map(event => 
              event.id === eventId 
                ? { 
                    ...event, 
                    tables: event.tables.map(table => 
                      table.id === tableId 
                        ? { ...table, shape, updatedAt: new Date() }
                        : table
                    ),
                    updatedAt: new Date()
                  }
                : event
            ),
            currentEvent: state.currentEvent?.id === eventId 
              ? { 
                  ...state.currentEvent, 
                  tables: state.currentEvent.tables.map(table => 
                    table.id === tableId 
                      ? { ...table, shape, updatedAt: new Date() }
                      : table
                  ),
                  updatedAt: new Date()
                }
              : state.currentEvent,
            isLoading: false
          }));
        } catch (error) {
          set({ error: 'שגיאה בעדכון צורת שולחן', isLoading: false });
        }
      },

      // Function to restore a specific deleted event
      restoreDeletedEvent: async (deletedEventId: string) => {
        set({ isLoading: true, error: null });
        try {
          const deletedEvent = get().deletedEvents.find(event => event.id === deletedEventId);
          if (deletedEvent) {
            // Remove deletedAt property and restore the event
            const { deletedAt, ...eventToRestore } = deletedEvent;
            
            set(state => ({
              events: [...state.events, eventToRestore],
              deletedEvents: state.deletedEvents.filter(event => event.id !== deletedEventId),
              isLoading: false
            }));
            
            return true;
          }
          return false;
        } catch (error) {
          set({ error: 'שגיאה בשחזור האירוע', isLoading: false });
          return false;
        }
      },

      // Function to permanently delete an event from deleted events
      permanentlyDeleteEvent: async (deletedEventId: string) => {
        set({ isLoading: true, error: null });
        try {
          set(state => ({
            deletedEvents: state.deletedEvents.filter(event => event.id !== deletedEventId),
            isLoading: false
          }));
          return true;
        } catch (error) {
          set({ error: 'שגיאה במחיקה סופית של האירוע', isLoading: false });
          return false;
        }
      },

      // Function to restore events from localStorage
      restoreEvents: () => {
        try {
          const stored = localStorage.getItem('rsvp-events-storage');
          if (stored) {
            const parsed = JSON.parse(stored);
            if (parsed.state && parsed.state.events) {
              console.log('🔄 Restoring events from localStorage:', parsed.state.events.length);
              console.log('📋 Events data:', parsed.state.events);
              
              // Force complete restoration by updating the store directly
              set((state) => {
                console.log('🔄 Current state before restore:', state);
                return {
                  ...state,
                  events: parsed.state.events,
                  currentEvent: parsed.state.currentEvent || null
                };
              });
              
              // Log details about each event
              parsed.state.events.forEach((event: any, index: number) => {
                console.log(`📅 Event ${index + 1}:`, {
                  id: event.id,
                  coupleName: event.coupleName,
                  guestsCount: event.guests?.length || 0,
                  campaignsCount: event.campaigns?.length || 0,
                  tablesCount: event.tables?.length || 0
                });
              });
              
              return true;
            }
          }
          return false;
        } catch (error) {
          console.error('❌ Error restoring events:', error);
          return false;
        }
      },

      // Force refresh from localStorage
      forceRefresh: () => {
        try {
          const stored = localStorage.getItem('rsvp-events-storage');
          if (stored) {
            const parsed = JSON.parse(stored);
            console.log('🔄 Force refreshing from localStorage...', parsed);
            
            if (parsed.state) {
              set(parsed.state);
              return true;
            }
          }
          return false;
        } catch (error) {
          console.error('❌ Error force refreshing:', error);
          return false;
        }
      },

      // Clean up duplicate data in localStorage
      cleanupLocalStorage: () => {
        try {
          // Remove old 'event-store' key if it exists
          localStorage.removeItem('event-store');
          
          // Get current data
          const stored = localStorage.getItem('rsvp-events-storage');
          if (stored) {
            const parsed = JSON.parse(stored);
            console.log('🧹 Cleaning up localStorage...', parsed);
            
            if (parsed.state && parsed.state.events) {
              // Remove duplicate events (keep only the most recent)
              const uniqueEvents = parsed.state.events.filter((event: any, index: number, self: any[]) => 
                index === self.findIndex(e => e.coupleName === event.coupleName)
              );
              
              if (uniqueEvents.length !== parsed.state.events.length) {
                console.log(`🧹 Removed ${parsed.state.events.length - uniqueEvents.length} duplicate events`);
                parsed.state.events = uniqueEvents;
                localStorage.setItem('rsvp-events-storage', JSON.stringify(parsed));
              }
              
              return true;
            }
          }
          return false;
        } catch (error) {
          console.error('❌ Error cleaning up localStorage:', error);
          return false;
        }
      },

      // Function to update existing events campaigns with consistent variable names
      updateExistingEventsCampaigns: () => {
        console.log('🔄 Updating existing events campaigns with consistent variable names...');
        set(state => {
          const updatedEvents = state.events.map(event => {
            if (!event.campaigns || event.campaigns.length === 0) {
              return event;
            }
            
            // Update all campaigns to use consistent variable names
            const updatedCampaigns = event.campaigns.map(campaign => {
              console.log(`✅ Updating campaign "${campaign.name}" for event "${event.coupleName}"`);
              
              // Update message to use consistent variable names
              let updatedMessage = campaign.message
                .replace(/\{\{first_name\}\}/g, '{{guest_name}}')
                .replace(/\{\{last_name\}\}/g, '')
                // Update ending to use couple_name instead of groom_name + bride_name
                .replace(/בברכה,\s*\{\{groom_name\}\} ו\{\{bride_name\}\}/g, 'בברכה,\n{{couple_name}} 💕')
                .replace(/בברכה,\s*\{\{groom_name\}\} ו\{\{bride_name\}\}\s*💕/g, 'בברכה,\n{{couple_name}} 💕');
              
              // Special handling for "תזכורת אחרונה" campaign - remove guest_response_link and use first_name
              if (campaign.name === 'תזכורת אחרונה') {
                updatedMessage = updatedMessage
                  .replace(/\{\{guest_name\}\}/g, '{{first_name}}')
                  .replace(/🔗\s*לעדכן סטטוס[^:]*:\s*\{\{guest_response_link\}\}/g, '🔗 לעדכן סטטוס ההגעה לחץ')
                  .replace(/\{\{guest_response_link\}\}/g, '')
                  .replace(/לעדכן סטטוס[^:]*:\s*\{\{guest_response_link\}\}/g, 'לעדכן סטטוס ההגעה לחץ')
                  .replace(/בברכה,\s*\{\{couple_name\}\}\s*💕/g, '')
                  .trim();
              }
              
              // Update SMS message as well
              let updatedSmsMessage = campaign.smsMessage;
              if (updatedSmsMessage) {
                updatedSmsMessage = updatedSmsMessage
                  .replace(/\{\{first_name\}\}/g, '{{guest_name}}')
                  .replace(/\{\{last_name\}\}/g, '')
                  .replace(/בברכה,\s*\{\{groom_name\}\} ו\{\{bride_name\}\}/g, 'בברכה,\n{{couple_name}}');
                
                // Special handling for "תזכורת אחרונה" campaign SMS
                if (campaign.name === 'תזכורת אחרונה') {
                  updatedSmsMessage = updatedSmsMessage
                    .replace(/\{\{guest_name\}\}/g, '{{first_name}}')
                    .replace(/🔗\s*לעדכן סטטוס[^:]*:\s*\{\{guest_response_link\}\}/g, '🔗 לעדכן סטטוס ההגעה לחץ')
                    .replace(/\{\{guest_response_link\}\}/g, '')
                    .replace(/לעדכן סטטוס[^:]*:\s*\{\{guest_response_link\}\}/g, 'לעדכן סטטוס ההגעה לחץ');
                }
              }
              
              // Set templateName for campaigns that should use template 'aa'
              let updatedTemplateName = campaign.templateName;
              if (campaign.name === 'הזמנה ראשונית' || 
                  campaign.name === 'תזכורת שנייה' || 
                  campaign.name === 'תזכורת שבועית') {
                // Force lowercase 'aa' - Meta is case-sensitive!
                updatedTemplateName = 'aa'; // Template name in Meta Business Manager (lowercase!)
                console.log(`   📋 Set templateName to 'aa' (lowercase) for campaign "${campaign.name}"`);
              } else if (campaign.templateName === 'AA') {
                // Fix old campaigns that might have 'AA' instead of 'aa'
                updatedTemplateName = 'aa';
                console.log(`   📋 Fixed templateName from 'AA' to 'aa' for campaign "${campaign.name}"`);
              } else if (campaign.name === 'תזכורת אחרונה') {
                // Reminder campaign uses template "reminer" (note: name in Meta is "reminer", not "reminder")
                updatedTemplateName = 'reminer';
                console.log(`   📋 Set templateName to 'reminer' for campaign "${campaign.name}"`);
              }
              
              return {
                ...campaign,
                message: updatedMessage,
                smsMessage: updatedSmsMessage,
                templateName: updatedTemplateName,
                updatedAt: new Date()
              };
            });
            
            return {
              ...event,
              campaigns: updatedCampaigns,
              updatedAt: new Date()
            };
          });
          
          console.log(`✅ Updated ${updatedEvents.length} events`);
          return { events: updatedEvents };
        });
      },

      // Function to recreate campaigns with correct links
      recreateCampaigns: (eventId: string) => {
        console.log('🔄 recreateCampaigns called with eventId:', eventId);
        const event = get().events.find(e => e.id === eventId);
        if (!event) {
          console.log('❌ Event not found for campaign recreation');
          return;
        }

        console.log('📅 Found event:', event.coupleName, 'with', event.campaigns?.length || 0, 'existing campaigns');

        // Convert eventDate to Date object if it's a string
        const eventDate = typeof event.eventDate === 'string' 
          ? new Date(event.eventDate) 
          : event.eventDate;

        console.log('🗑️ Deleting old campaigns and creating new ones...');

        // Create new campaigns with correct guest links
        const newCampaigns: Campaign[] = [
          {
            id: generateId(),
            eventId: eventId,
            name: 'הזמנה ראשונית',
            message: `🎉 שלום {{guest_name}}! 

אנחנו שמחים להזמין אותך ל{{event_type}} של {{groom_name}} ו{{bride_name}}! 

📅 תאריך: {{event_date}}
🕐 שעה: {{event_time}}
📍 מיקום: {{venue}}

אנא אשר/י הגעה בקישור הבא:
🔗 {{guest_response_link}}

בברכה,
{{couple_name}} 💕`,
            channel: 'whatsapp' as const,
            scheduledDate: new Date(eventDate.getTime() - 30 * 24 * 60 * 60 * 1000),
            status: 'draft' as const,
            sentCount: 0,
            responseCount: 0,
            // Use WhatsApp template for first message
            templateName: 'aa', // Template name in Meta Business Manager
            whatsappButtons: [
              {
                type: 'url',
                url: {
                  url: '{{guest_response_link}}',
                  title: 'אישור הגעה'
                }
              },
              {
                type: 'reply',
                reply: {
                  id: 'decline_attendance',
                  title: 'לא אוכל להגיע'
                }
              }
            ],
            smsMessage: `שלום {{guest_name}}! 

אנחנו שמחים להזמין אותך ל{{event_type}} של {{groom_name}} ו{{bride_name}}! 

📅 תאריך: {{event_date}}
🕐 שעה: {{event_time}}
📍 מיקום: {{venue}}

אנא אשר/י הגעה בקישור הבא:
{{guest_response_link}}

בברכה,
{{couple_name}}`,
            createdAt: new Date(),
            updatedAt: new Date()
          },
          {
            id: generateId(),
            eventId: eventId,
            name: 'תזכורת שנייה',
            message: `שלום! רק שבועיים לאירוע! 🎊

📅 {{event_date}}
📍 {{venue}}

אם עדיין לא אישרתם הגעה, אנא עשו זאת עכשיו!

🔗 לאשר הגעה ולעדכן סטטוס: {{guest_response_link}}

נרגש לראות אתכם!`,
            channel: 'whatsapp' as const,
            scheduledDate: new Date(eventDate.getTime() - 14 * 24 * 60 * 60 * 1000),
            status: 'draft' as const,
            sentCount: 0,
            responseCount: 0,
            // Use WhatsApp template 'a' for this campaign
            templateName: 'a',
            whatsappButtons: [
              {
                type: 'reply',
                reply: {
                  id: 'confirm_attendance',
                  title: 'לעדכון סטטוס הגעה'
                }
              }
            ],
            smsMessage: `שלום {{guest_name}}! 

תזכורת: ה{{event_type}} של {{couple_name}} מתקרב! 

📅 תאריך: {{event_date}}
🕐 שעה: {{event_time}}
📍 מיקום: {{venue}}

אם עדיין לא אשרת הגעה, אנא עשה זאת בקישור:
{{guest_response_link}}

מחכים לראות אותך!`,
            createdAt: new Date(),
            updatedAt: new Date()
          },
          {
            id: generateId(),
            eventId: eventId,
            name: 'תזכורת שבועית',
            message: `⏰ שלום {{guest_name}}! 

תזכורת אחרונה: ה{{event_type}} של {{couple_name}} בעוד שבוע! 

📅 תאריך: {{event_date}}
🕐 שעה: {{event_time}}
📍 מיקום: {{venue}}

אנא אשר/י הגעה עד סוף השבוע:
🔗 {{guest_response_link}}

בברכה,
{{couple_name}} 💕`,
            channel: 'whatsapp' as const,
            scheduledDate: new Date(eventDate.getTime() - 7 * 24 * 60 * 60 * 1000),
            status: 'draft' as const,
            sentCount: 0,
            responseCount: 0,
            // Use WhatsApp template 'a' for this campaign
            templateName: 'a',
            whatsappButtons: [
              {
                type: 'reply',
                reply: {
                  id: 'confirm_attendance',
                  title: 'לעדכון סטטוס הגעה'
                }
              }
            ],
            smsMessage: `שלום {{guest_name}}! 

תזכורת אחרונה: ה{{event_type}} של {{couple_name}} בעוד שבוע! 

📅 תאריך: {{event_date}}
🕐 שעה: {{event_time}}
📍 מיקום: {{venue}}

אנא אשר/י הגעה עד סוף השבוע:
{{guest_response_link}}

בברכה,
{{couple_name}}`,
            createdAt: new Date(),
            updatedAt: new Date()
          },
          {
            id: generateId(),
            eventId: eventId,
            name: 'תזכורת אחרונה',
            message: `🎉 שלום {{first_name}}! 

מחר זה קורה! ה{{event_type}} של {{couple_name}}! 

📅 תאריך: {{event_date}}
🕐 שעה: {{event_time}}
📍 מיקום: {{venue}}
🪑 שולחן: {{table_number}}

אנא הגיעו 15 דקות לפני הזמן.

🔗 לעדכן סטטוס ההגעה לחץ

לא לשכוח להביא מצב רוח טוב! 😊`,
            channel: 'whatsapp' as const,
            scheduledDate: new Date(eventDate.getTime() - 24 * 60 * 60 * 1000),
            status: 'draft' as const,
            sentCount: 0,
            responseCount: 0,
            // Use WhatsApp template 'reminer' for this campaign
            templateName: 'reminer', // Template name in Meta is "reminer" (not "reminder")
            whatsappButtons: [
              {
                type: 'reply',
                reply: {
                  id: 'confirm_attendance',
                  title: 'לעדכון סטטוס הגעה'
                }
              }
            ],
            smsMessage: `שלום {{first_name}}! 

מחר זה קורה! ה{{event_type}} של {{couple_name}}! 

📅 תאריך: {{event_date}}
🕐 שעה: {{event_time}}
📍 מיקום: {{venue}}
🪑 שולחן: {{table_number}}

אנא הגיעו 15 דקות לפני הזמן.

🔗 לעדכן סטטוס ההגעה לחץ

לא לשכוח להביא מצב רוח טוב!

בברכה,
{{couple_name}}`,
            createdAt: new Date(),
            updatedAt: new Date()
          },
          {
            id: generateId(),
            eventId: eventId,
            name: 'הודעת תודה למגיעים',
            message: `🙏 שלום {{guest_name}}! 

תודה רבה שהגעת ל{{event_type}} של {{couple_name}}! 

היה לנו כיף לראות אותך ולהיות איתנו ביום המיוחד הזה.

תודה על הברכות והמתנות! 💝

תמונות מהאירוע יועלו בקרוב.

באהבה,
{{couple_name}} 💕`,
            channel: 'whatsapp' as const,
            scheduledDate: new Date(eventDate.getTime() + 24 * 60 * 60 * 1000),
            status: 'draft' as const,
            sentCount: 0,
            responseCount: 0,
            smsMessage: `שלום {{guest_name}}! 

תודה רבה שהגעת ל{{event_type}} של {{couple_name}}! 

היה לנו כיף לראות אותך ולהיות איתנו ביום המיוחד הזה.

תודה על הברכות והמתנות!

תמונות מהאירוע יועלו בקרוב.

באהבה,
{{couple_name}}`,
            createdAt: new Date(),
            updatedAt: new Date()
          }
        ];

        // Update the event with new campaigns
        set(state => {
          const updatedEvents = state.events.map(e => 
            e.id === eventId 
              ? { ...e, campaigns: newCampaigns }
              : e
          );
          
          console.log('🔄 Updated events in state');
          console.log('📊 Event campaigns after update:', updatedEvents.find(e => e.id === eventId)?.campaigns?.length || 0);
          
          return { events: updatedEvents };
        });

        console.log('🔄 Recreated campaigns with correct guest links');
        console.log('📊 New campaigns created:', newCampaigns.length);
        console.log('🔗 Sample link from first campaign:', newCampaigns[0]?.message?.includes('?guest={{guest_id}}') ? 'CORRECT' : 'INCORRECT');
        console.log('🔗 Full message preview:', newCampaigns[0]?.message?.substring(0, 200) + '...');
      },

      // Table management functions
      addTable: async (eventId: string, tableData: Omit<Table, 'id' | 'createdAt' | 'updatedAt'>) => {
        set({ isLoading: true, error: null });
        try {
          const event = get().events.find(e => e.id === eventId);
          if (!event) {
            throw new Error('Event not found');
          }

          const newTable: Table = {
            id: generateId(),
            ...tableData,
            guests: [],
            createdAt: new Date(),
            updatedAt: new Date()
          };

          set(state => ({
            events: state.events.map(e => 
              e.id === eventId 
                ? { ...e, tables: [...(e.tables || []), newTable] }
                : e
            ),
            currentEvent: state.currentEvent?.id === eventId 
              ? { ...state.currentEvent, tables: [...(state.currentEvent.tables || []), newTable] }
              : state.currentEvent,
            isLoading: false
          }));
        } catch (error) {
          set({ error: 'שגיאה בהוספת השולחן', isLoading: false });
        }
      },

      updateTable: async (eventId: string, tableId: string, updates: Partial<Table>) => {
        set({ isLoading: true, error: null });
        try {
          set(state => ({
            events: state.events.map(e => 
              e.id === eventId 
                ? { 
                    ...e, 
                    tables: e.tables?.map(t => 
                      t.id === tableId 
                        ? { ...t, ...updates, updatedAt: new Date() }
                        : t
                    ) || []
                  }
                : e
            ),
            currentEvent: state.currentEvent?.id === eventId 
              ? { 
                  ...state.currentEvent, 
                  tables: state.currentEvent.tables?.map(t => 
                    t.id === tableId 
                      ? { ...t, ...updates, updatedAt: new Date() }
                      : t
                  ) || []
                }
              : state.currentEvent,
            isLoading: false
          }));
        } catch (error) {
          set({ error: 'שגיאה בעדכון השולחן', isLoading: false });
        }
      },

      deleteTable: async (eventId: string, tableId: string) => {
        set({ isLoading: true, error: null });
        try {
          set(state => ({
            events: state.events.map(e => 
              e.id === eventId 
                ? { 
                    ...e, 
                    tables: e.tables?.filter(t => t.id !== tableId) || [],
                    guests: e.guests?.map(guest => 
                      guest.tableId === tableId 
                        ? { ...guest, tableId: undefined }
                        : guest
                    ) || []
                  }
                : e
            ),
            currentEvent: state.currentEvent?.id === eventId 
              ? { 
                  ...state.currentEvent, 
                  tables: state.currentEvent.tables?.filter(t => t.id !== tableId) || [],
                  guests: state.currentEvent.guests?.map(guest => 
                    guest.tableId === tableId 
                      ? { ...guest, tableId: undefined }
                      : guest
                  ) || []
                }
              : state.currentEvent,
            isLoading: false
          }));
        } catch (error) {
          set({ error: 'שגיאה במחיקת השולחן', isLoading: false });
        }
      },

      assignGuestToTable: async (eventId: string, guestId: string, tableId: string, seatNumber?: number) => {
        set({ isLoading: true, error: null });
        try {
          set(state => ({
            events: state.events.map(e => 
              e.id === eventId 
                ? { 
                    ...e, 
                    guests: e.guests?.map(guest => 
                      guest.id === guestId 
                        ? { ...guest, tableId: tableId, seatNumber: seatNumber }
                        : guest
                    ) || []
                  }
                : e
            ),
            currentEvent: state.currentEvent?.id === eventId 
              ? { 
                  ...state.currentEvent, 
                  guests: state.currentEvent.guests?.map(guest => 
                    guest.id === guestId 
                      ? { ...guest, tableId: tableId, seatNumber: seatNumber }
                      : guest
                  ) || []
                }
              : state.currentEvent,
            isLoading: false
          }));
        } catch (error) {
          set({ error: 'שגיאה בהקצאת האורח לשולחן', isLoading: false });
        }
      },

      removeGuestFromTable: async (eventId: string, guestId: string) => {
        set({ isLoading: true, error: null });
        try {
          set(state => ({
            events: state.events.map(e => 
              e.id === eventId 
                ? { 
                    ...e, 
                    guests: e.guests?.map(guest => 
                      guest.id === guestId 
                        ? { ...guest, tableId: undefined, seatNumber: undefined }
                        : guest
                    ) || []
                  }
                : e
            ),
            currentEvent: state.currentEvent?.id === eventId 
              ? { 
                  ...state.currentEvent, 
                  guests: state.currentEvent.guests?.map(guest => 
                    guest.id === guestId 
                      ? { ...guest, tableId: undefined, seatNumber: undefined }
                      : guest
                  ) || []
                }
              : state.currentEvent,
            isLoading: false
          }));
        } catch (error) {
          set({ error: 'שגיאה בהסרת האורח מהשולחן', isLoading: false });
        }
      },

      moveGuestToTable: async (eventId: string, guestId: string, newTableId: string, newSeatNumber?: number) => {
        set({ isLoading: true, error: null });
        try {
          set(state => ({
            events: state.events.map(e => 
              e.id === eventId 
                ? { 
                    ...e, 
                    guests: e.guests?.map(guest => 
                      guest.id === guestId 
                        ? { ...guest, tableId: newTableId, seatNumber: newSeatNumber }
                        : guest
                    ) || []
                  }
                : e
            ),
            currentEvent: state.currentEvent?.id === eventId 
              ? { 
                  ...state.currentEvent, 
                  guests: state.currentEvent.guests?.map(guest => 
                    guest.id === guestId 
                      ? { ...guest, tableId: newTableId, seatNumber: newSeatNumber }
                      : guest
                  ) || []
                }
              : state.currentEvent,
            isLoading: false
          }));
        } catch (error) {
          set({ error: 'שגיאה בהעברת האורח לשולחן', isLoading: false });
        }
      },

    }),
    {
      name: 'rsvp-events-storage',
      partialize: (state) => ({ 
        events: state.events,
        deletedEvents: state.deletedEvents,
        currentEvent: state.currentEvent 
      }),
      onRehydrateStorage: () => (state) => {
        console.log('🔄 Rehydrating from localStorage...', state);
        if (state) {
          console.log('📋 Restored events:', state.events?.length || 0);
          state.events?.forEach((event: any, index: number) => {
            console.log(`📅 Event ${index + 1}:`, {
              id: event.id,
              coupleName: event.coupleName,
              guestsCount: event.guests?.length || 0,
              campaignsCount: event.campaigns?.length || 0,
              tablesCount: event.tables?.length || 0
            });
          });
        }
      },
    }
  )
);