import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { whatsappService } from '../services/whatsappService';
import { schedulerService } from '../services/schedulerService';

// Type definitions
type Campaign = any;
type CampaignStore = any;
type MessageTemplate = any;

// Local helper function
const generateId = () => Math.random().toString(36).substr(2, 9);

// Mock data for development
const mockCampaigns: Campaign[] = [
  {
    id: '1',
    eventId: '1',
    name: 'הזמנה ראשונית',
    message: 'שלום! אתם מוזמנים לחתונה של דוד ושרה ב-15 במרץ 2024 בשעה 18:00. אנא אשרו הגעה.',
    imageUrl: 'https://example.com/wedding-invitation.jpg',
    channel: 'whatsapp',
    scheduledDate: new Date('2024-03-01T10:00:00'),
    status: 'sent',
    sentCount: 80,
    responseCount: 65,
    createdAt: new Date('2024-02-28'),
    updatedAt: new Date('2024-03-01')
  },
  {
    id: '2',
    eventId: '1',
    name: 'תזכורת שבוע לפני',
    message: 'תזכורת: החתונה של דוד ושרה תתקיים בעוד שבוע! אנא אשרו הגעה אם עדיין לא עשיתם זאת.',
    channel: 'whatsapp',
    scheduledDate: new Date('2024-03-08T10:00:00'),
    status: 'scheduled',
    sentCount: 0,
    responseCount: 0,
    createdAt: new Date('2024-03-01'),
    updatedAt: new Date('2024-03-01')
  }
];

const mockTemplates: MessageTemplate[] = [
  {
    id: '1',
    name: 'הזמנה אישית - חתונה',
    content: `🎉 שלום {firstName}! 

אנחנו שמחים להזמין אותך ל{eventType} של {groomName} ו{brideName}! 

📅 תאריך: {eventDate}
🕐 שעה: {eventTime}
📍 מיקום: {venue}

אנא אשר/י הגעה בקישור הבא:
🔗 https://rsvp.example.com/event/{eventId}/guest/{guestId}

בברכה,
{groomName} ו{brideName} 💕`,
    imageUrl: 'https://images.unsplash.com/photo-1519741497674-611481863552?w=800&h=600&fit=crop',
    channel: 'whatsapp',
    isDefault: true,
    createdAt: new Date('2024-02-01')
  },
  {
    id: '2',
    name: 'הזמנה אישית - בר מצווה',
    content: `🎊 שלום {firstName}! 

אנחנו שמחים להזמין אותך ל{eventType} של {groomName}! 

📅 תאריך: {eventDate}
🕐 שעה: {eventTime}
📍 מיקום: {venue}

אנא אשר/י הגעה בקישור הבא:
🔗 https://rsvp.example.com/event/{eventId}/guest/{guestId}

בברכה,
משפחת {groomName} 🎉`,
    imageUrl: 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=800&h=600&fit=crop',
    channel: 'whatsapp',
    isDefault: true,
    createdAt: new Date('2024-02-01')
  },
  {
    id: '3',
    name: 'הזמנה אישית - בת מצווה',
    content: `🌸 שלום {firstName}! 

אנחנו שמחים להזמין אותך ל{eventType} של {brideName}! 

📅 תאריך: {eventDate}
🕐 שעה: {eventTime}
📍 מיקום: {venue}

אנא אשר/י הגעה בקישור הבא:
🔗 https://rsvp.example.com/event/{eventId}/guest/{guestId}

בברכה,
משפחת {brideName} 🌸`,
    imageUrl: 'https://images.unsplash.com/photo-1519741497674-611481863552?w=800&h=600&fit=crop',
    channel: 'whatsapp',
    isDefault: true,
    createdAt: new Date('2024-02-01')
  },
  {
    id: '4',
    name: 'תזכורת חמה',
    content: `⏰ שלום {firstName}! 

תזכורת חמה: ה{eventType} של {coupleName} מתקרב! 

📅 תאריך: {eventDate}
🕐 שעה: {eventTime}
📍 מיקום: {venue}

אם עדיין לא אשרת הגעה, אנא עשה זאת בקישור:
🔗 https://rsvp.example.com/event/{eventId}/guest/{guestId}

מחכים לראות אותך! 🎉`,
    channel: 'whatsapp',
    isDefault: true,
    createdAt: new Date('2024-02-01')
  },
  {
    id: '5',
    name: 'הודעת תודה',
    content: `🙏 שלום {firstName}! 

תודה רבה שהגעת ל{eventType} של {coupleName}! 

היה לנו כיף לראות אותך ולהיות איתנו ביום המיוחד הזה.

תודה על הברכות והמתנות! 💝

באהבה,
{coupleName} 💕`,
    channel: 'whatsapp',
    isDefault: true,
    createdAt: new Date('2024-02-01')
  },
  {
    id: '6',
    name: 'SMS חלופי - חתונה',
    content: `שלום {firstName}! 

אנחנו שמחים להזמין אותך ל{eventType} של {groomName} ו{brideName}! 

📅 תאריך: {eventDate}
🕐 שעה: {eventTime}
📍 מיקום: {venue}

אנא אשר/י הגעה בקישור הבא:
https://rsvp.example.com/event/{eventId}/guest/{guestId}

בברכה,
{groomName} ו{brideName}`,
    channel: 'sms',
    isDefault: true,
    createdAt: new Date('2024-02-01')
  },
  {
    id: '7',
    name: 'SMS חלופי - בר מצווה',
    content: `שלום {firstName}! 

אנחנו שמחים להזמין אותך ל{eventType} של {groomName}! 

📅 תאריך: {eventDate}
🕐 שעה: {eventTime}
📍 מיקום: {venue}

אנא אשר/י הגעה בקישור הבא:
https://rsvp.example.com/event/{eventId}/guest/{guestId}

בברכה,
משפחת {groomName}`,
    channel: 'sms',
    isDefault: true,
    createdAt: new Date('2024-02-01')
  },
  {
    id: '8',
    name: 'SMS חלופי - בת מצווה',
    content: `שלום {firstName}! 

אנחנו שמחים להזמין אותך ל{eventType} של {brideName}! 

📅 תאריך: {eventDate}
🕐 שעה: {eventTime}
📍 מיקום: {venue}

אנא אשר/י הגעה בקישור הבא:
https://rsvp.example.com/event/{eventId}/guest/{guestId}

בברכה,
משפחת {brideName}`,
    channel: 'sms',
    isDefault: true,
    createdAt: new Date('2024-02-01')
  },
  {
    id: '9',
    name: 'SMS תזכורת',
    content: `שלום {firstName}! 

תזכורת: ה{eventType} של {coupleName} מתקרב! 

📅 תאריך: {eventDate}
🕐 שעה: {eventTime}
📍 מיקום: {venue}

אם עדיין לא אשרת הגעה, אנא עשה זאת בקישור:
https://rsvp.example.com/event/{eventId}/guest/{guestId}

מחכים לראות אותך!`,
    channel: 'sms',
    isDefault: true,
    createdAt: new Date('2024-02-01')
  },
  {
    id: '10',
    name: 'SMS הודעת תודה',
    content: `שלום {firstName}! 

תודה רבה שהגעת ל{eventType} של {coupleName}! 

היה לנו כיף לראות אותך ולהיות איתנו ביום המיוחד הזה.

תודה על הברכות והמתנות!

באהבה,
{coupleName}`,
    channel: 'sms',
    isDefault: true,
    createdAt: new Date('2024-02-01')
  }
];

export const useCampaignStore = create<CampaignStore>()(
  persist(
    (set, get) => ({
  campaigns: mockCampaigns,
  currentCampaign: null,
  isLoading: false,
  error: null,

  createCampaign: async (campaignData: any) => {
    set({ isLoading: true, error: null });
    try {
      const newCampaign: Campaign = {
        ...campaignData,
        id: generateId(),
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
          set((state: any) => ({
        campaigns: [...state.campaigns, newCampaign],
        isLoading: false
      }));
    } catch (error) {
      set({ error: 'שגיאה ביצירת הקמפיין', isLoading: false });
    }
  },

  updateCampaign: async (id: any, updates: any) => {
    set({ isLoading: true, error: null });
    try {
          set((state: any) => ({
        campaigns: state.campaigns.map((campaign: any) =>
          campaign.id === id
            ? { ...campaign, ...updates, updatedAt: new Date() }
            : campaign
        ),
        isLoading: false
      }));
    } catch (error) {
      set({ error: 'שגיאה בעדכון הקמפיין', isLoading: false });
    }
  },

  deleteCampaign: async (id: any) => {
    set({ isLoading: true, error: null });
    try {
          set((state: any) => ({
        campaigns: state.campaigns.filter((campaign: any) => campaign.id !== id),
        currentCampaign: state.currentCampaign?.id === id ? null : state.currentCampaign,
        isLoading: false
      }));
    } catch (error) {
      set({ error: 'שגיאה במחיקת הקמפיין', isLoading: false });
    }
  },

  sendCampaign: async (id: any) => {
    set({ isLoading: true, error: null });
    try {
      const campaign = get().campaigns.find((c: any) => c.id === id);
      if (!campaign) {
        throw new Error('קמפיין לא נמצא');
      }

      // Update campaign status to sending
      await get().updateCampaign(id, { status: 'sending' });

      // Here you would integrate with the actual messaging services
      // For now, we'll simulate the sending process
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Update campaign status to sent
      await get().updateCampaign(id, { 
        status: 'sent',
        sentCount: (campaign.sentCount || 0) + 1
      });

      set({ isLoading: false });
    } catch (error) {
      set({ error: 'שגיאה בשליחת הקמפיין', isLoading: false });
    }
  },

  scheduleCampaign: async (id: any, scheduledDate: any) => {
    set({ isLoading: true, error: null });
    try {
      const campaign = get().campaigns.find((c: any) => c.id === id);
      if (!campaign) {
        throw new Error('קמפיין לא נמצא');
      }

      // Cancel any existing scheduled task for this campaign
      schedulerService.cancelCampaign(id);

      // Update campaign with scheduled date and status
      await get().updateCampaign(id, { 
        scheduledDate,
        status: 'scheduled'
      });

      // Get updated campaign
      const updatedCampaign = get().campaigns.find((c: any) => c.id === id);
      if (!updatedCampaign) {
        throw new Error('קמפיין לא נמצא לאחר העדכון');
      }

      // Schedule the campaign using schedulerService
      schedulerService.scheduleCampaign(updatedCampaign, async () => {
        try {
          // When scheduled time arrives, send the campaign
          console.log(`⏰ Scheduled time reached for campaign: ${updatedCampaign.name}`);
          
          // If campaign has eventId, use eventStore to send it
          if (updatedCampaign.eventId) {
            const { useEventStore } = await import('./eventStore');
            const eventStore = useEventStore.getState();
            await eventStore.sendCampaign(updatedCampaign.eventId, updatedCampaign.id);
          } else {
            // Otherwise, use the local sendCampaign method
            await get().sendCampaign(id);
          }
        } catch (error) {
          console.error('Error sending scheduled campaign:', error);
          // Update campaign status to failed
          const currentCampaign = get().campaigns.find((c: any) => c.id === id);
          if (currentCampaign) {
            await get().updateCampaign(id, { status: 'failed' });
          }
        }
      });

      console.log(`✅ Scheduled campaign: ${updatedCampaign.name} for ${scheduledDate.toLocaleString('he-IL')}`);
      set({ isLoading: false });
    } catch (error) {
      set({ error: 'שגיאה בתזמון הקמפיין', isLoading: false });
    }
  }
    }),
    {
      name: 'rsvp-campaigns-storage',
      partialize: (state: any) => ({ 
        campaigns: state.campaigns,
        currentCampaign: state.currentCampaign 
      }),
    }
  )
);

// Message Templates Store
export const useTemplateStore = create<{
  templates: MessageTemplate[];
  currentTemplate: MessageTemplate | null;
  isLoading: boolean;
  error: string | null;
  
  fetchTemplates: () => Promise<void>;
  createTemplate: (template: Omit<MessageTemplate, 'id' | 'createdAt'>) => Promise<void>;
  updateTemplate: (id: string, updates: Partial<MessageTemplate>) => Promise<void>;
  deleteTemplate: (id: string) => Promise<void>;
  setCurrentTemplate: (template: MessageTemplate | null) => void;
}>((set, get) => ({
  templates: mockTemplates,
  currentTemplate: null,
  isLoading: false,
  error: null,

  fetchTemplates: async () => {
    set({ isLoading: true, error: null });
    try {
      // In a real app, this would be an API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      set({ templates: mockTemplates, isLoading: false });
    } catch (error) {
      set({ error: 'שגיאה בטעינת התבניות', isLoading: false });
    }
  },

  createTemplate: async (templateData: any) => {
    set({ isLoading: true, error: null });
    try {
      const newTemplate: MessageTemplate = {
        ...templateData,
        id: generateId(),
        createdAt: new Date()
      };
      
          set((state: any) => ({
        templates: [...state.templates, newTemplate],
        isLoading: false
      }));
    } catch (error) {
      set({ error: 'שגיאה ביצירת התבנית', isLoading: false });
    }
  },

  updateTemplate: async (id: any, updates: any) => {
    set({ isLoading: true, error: null });
    try {
          set((state: any) => ({
        templates: state.templates.map((template: any) =>
          template.id === id
            ? { ...template, ...updates }
            : template
        ),
        isLoading: false
      }));
    } catch (error) {
      set({ error: 'שגיאה בעדכון התבנית', isLoading: false });
    }
  },

  deleteTemplate: async (id: any) => {
    set({ isLoading: true, error: null });
    try {
          set((state: any) => ({
        templates: state.templates.filter((template: any) => template.id !== id),
        currentTemplate: state.currentTemplate?.id === id ? null : state.currentTemplate,
        isLoading: false
      }));
    } catch (error) {
      set({ error: 'שגיאה במחיקת התבנית', isLoading: false });
    }
  },

  setCurrentTemplate: (template: any) => {
    set({ currentTemplate: template });
  }
}));
