// סוגי נתונים למערכת ניהול אישורי הגעה

export interface Guest {
  id: string;
  firstName: string;
  lastName: string;
  phoneNumber: string;
  guestCount: number;
  notes?: string;
  rsvpStatus: RSVPStatus;
  responseDate?: Date;
  channel: MessageChannel;
  actualAttendance?: AttendanceStatus;
  attendanceDate?: Date;
  tags?: string[];
  tableId?: string; // שולחן שהוקצה לאורח
  seatNumber?: number; // מספר מושב בשולחן
  // נתוני שליחת הודעות
  messageStatus?: MessageStatus;
  messageSentDate?: Date;
  messageDeliveredDate?: Date;
  messageFailedDate?: Date;
  smsSentDate?: Date;
  firstMessageSent?: boolean; // האם נשלחה הודעה ראשונה (טמפלט)
  firstMessageSentDate?: Date; // תאריך שליחת הודעה ראשונה
}

export type RSVPStatus = 'pending' | 'confirmed' | 'declined' | 'maybe';
export type AttendanceStatus = 'attended' | 'not_attended' | 'not_marked';
export type MessageChannel = 'whatsapp' | 'sms' | 'manual';
export type MessageStatus = 'not_sent' | 'sent' | 'delivered' | 'failed' | 'sms_sent';

export interface Table {
  id: string;
  number: number; // מספר השולחן
  name?: string; // שם השולחן (אופציונלי)
  capacity: number; // כמות מושבים
  guests: string[]; // רשימת ID של אורחים
  notes?: string;
  // Venue Editor Properties
  x: number; // מיקום X בסקיצה
  y: number; // מיקום Y בסקיצה
  width: number; // רוחב השולחן
  height: number; // גובה השולחן
  rotation: number; // סיבוב השולחן (במעלות)
  shape: 'rectangle' | 'circle' | 'oval'; // צורת השולחן
  createdAt: Date;
  updatedAt: Date;
}

export interface VenueLayout {
  id: string;
  name: string;
  width: number; // רוחב האולם (בפיקסלים)
  height: number; // גובה האולם (בפיקסלים)
  backgroundImage?: string; // תמונת רקע של האולם
  tables: Table[];
  venueElements?: {
    entrance: { x: number; y: number; width: number; height: number; visible: boolean };
    danceFloor: { x: number; y: number; width: number; height: number; visible: boolean };
    bar: { x: number; y: number; width: number; height: number; visible: boolean };
    dj: { x: number; y: number; width: number; height: number; visible: boolean };
    partitions: Array<{ id: string; x: number; y: number; width: number; height: number; visible: boolean }>;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface Event {
  id: string;
  userId: string; // NEW: מזהה המשתמש שיצר את האירוע
  userEmail?: string; // NEW: אימייל המשתמש (לחיבור אירועים למשתמשים שנרשמו מחדש)
  coupleName: string;
  groomName: string;
  brideName: string;
  eventDate: Date;
  eventTime: string;
  venue: string;
  couplePhone: string;
  coupleEmail?: string;
  eventType: 'wedding' | 'bar_mitzvah' | 'bat_mitzvah' | 'birthday' | 'anniversary' | 'other';
  eventTypeHebrew: string; // שם האירוע בעברית
  guests: Guest[];
  campaigns: Campaign[];
  tables: Table[]; // שולחנות לאירוע
  venueLayout?: VenueLayout; // סקיצת האולם
  invitationImageUrl?: string; // תמונת הזמנה
  eventImages?: string[]; // תמונות האירוע
  creditsUsed: number; // NEW: כמות רשומות ששימשו לאירוע זה
  createdAt: Date;
  updatedAt: Date;
  isActive: boolean;
}

export interface Campaign {
  id: string;
  eventId?: string;
  name: string;
  message: string;
  imageUrl?: string;
  channel: MessageChannel;
  scheduledDate: Date;
  scheduledTime?: string;
  status: CampaignStatus;
  sentCount?: number;
  responseCount?: number;
  repeatType?: string;
  repeatInterval?: number;
  repeatDays?: number[];
  repeatEndDate?: Date | null;
  createdAt: Date;
  updatedAt: Date;
  // WhatsApp buttons
  whatsappButtons?: WhatsAppButton[];
  // SMS fallback message
  smsMessage?: string;
  // WhatsApp template name (for first messages)
  templateName?: string;
}

export interface WhatsAppButton {
  type: 'reply' | 'url' | 'phone';
  reply?: {
    id: string;
    title: string;
  };
  url?: {
    url: string;
    title: string;
  };
  phone?: {
    phone_number: string;
    title: string;
  };
}

export type CampaignStatus = 'draft' | 'scheduled' | 'sending' | 'sent' | 'failed';

export interface MessageTemplate {
  id: string;
  name: string;
  content: string;
  imageUrl?: string;
  channel: MessageChannel;
  isDefault: boolean;
  createdAt: Date;
}

export interface EventStats {
  totalGuests: number;
  confirmed: number;
  declined: number;
  maybe: number;
  pending: number;
  responseRate: number;
  attendanceRate: number;
}

export interface GlobalStats {
  totalEvents: number;
  totalGuests: number;
  totalConfirmed: number;
  averageResponseRate: number;
  activeEvents: number;
}

export interface ExcelImportData {
  firstName: string;
  lastName: string;
  phoneNumber: string;
  guestCount: number;
  notes?: string;
}

export interface ExcelExportData extends ExcelImportData {
  rsvpStatus: string;
  responseDate?: string;
  actualAttendance?: string;
  attendanceDate?: string;
}

// סוגי API
export interface WhatsAppMessage {
  to: string;
  message: string;
  imageUrl?: string;
  templateId?: string;
}

export interface SMSMessage {
  to: string;
  message: string;
  senderId?: string;
}

export interface APIResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// סוגי Store (Zustand)
export interface EventStore {
  events: Event[];
  deletedEvents: (Event & { deletedAt: Date })[];
  currentEvent: Event | null;
  isLoading: boolean;
  error: string | null;
  manualChanges: Map<string, number>; // Track manual changes: "eventId-guestId" -> timestamp
  
  // Actions
  fetchEvents: () => Promise<void>;
  createEvent: (event: Omit<Event, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateEvent: (id: string, updates: Partial<Event>) => Promise<void>;
  deleteEvent: (id: string) => Promise<void>;
  restoreDeletedEvent: (deletedEventId: string) => Promise<boolean>;
  permanentlyDeleteEvent: (deletedEventId: string) => Promise<boolean>;
  setCurrentEvent: (event: Event | null) => void;
  addGuest: (eventId: string, guest: Omit<Guest, 'id'>) => Promise<void>;
  updateGuest: (eventId: string, guestId: string, updates: Partial<Guest>) => Promise<void>;
  updateGuestResponse: (eventId: string, guestId: string, updatedGuest: Guest) => Promise<void>;
  deleteGuest: (eventId: string, guestId: string) => Promise<void>;
  importGuestsFromExcel: (eventId: string, data: ExcelImportData[]) => Promise<void>;
  exportGuestsToExcel: (eventId: string) => Promise<void>;
  createCampaign: (campaign: Omit<Campaign, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  sendCampaign: (eventId: string, campaignId: string) => Promise<any>;
  sendTestMessage: (phoneNumber: string, message: string, channel: 'whatsapp' | 'sms') => Promise<boolean>;
  updateExistingEventsCampaigns: () => void;
  recreateCampaigns: (eventId: string) => Promise<void>;
  
  // Table Management
  addTable: (eventId: string, table: Omit<Table, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateTable: (eventId: string, tableId: string, updates: Partial<Table>) => Promise<void>;
  deleteTable: (eventId: string, tableId: string) => Promise<void>;
  assignGuestToTable: (eventId: string, guestId: string, tableId: string, seatNumber?: number) => Promise<void>;
  removeGuestFromTable: (eventId: string, guestId: string) => Promise<void>;
  moveGuestToTable: (eventId: string, guestId: string, newTableId: string, newSeatNumber?: number) => Promise<void>;
  
  // Venue Layout Management
  createVenueLayout: (eventId: string, layout: Omit<VenueLayout, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateVenueLayout: (eventId: string, updates: Partial<VenueLayout>) => Promise<void>;
  updateTablePosition: (eventId: string, tableId: string, x: number, y: number) => Promise<void>;
  updateTableSize: (eventId: string, tableId: string, width: number, height: number) => Promise<void>;
  updateTableRotation: (eventId: string, tableId: string, rotation: number) => Promise<void>;
  updateTableShape: (eventId: string, tableId: string, shape: 'rectangle' | 'circle' | 'oval') => Promise<void>;
  
  // Admin functions
  getAllEvents: () => Event[]; // קבלת כל האירועים (רק למנהל)
  getEventsByUserId: (userId: string) => Event[]; // קבלת אירועים לפי userId
  getEventStatsByUserId: (userId: string) => {
    totalEvents: number;
    totalGuests: number;
    totalCreditsUsed: number;
  }; // סטטיסטיקות אירועים למשתמש
}

export interface CampaignStore {
  campaigns: Campaign[];
  currentCampaign: Campaign | null;
  isLoading: boolean;
  error: string | null;
  
  // Actions
  createCampaign: (campaign: Omit<Campaign, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateCampaign: (id: string, updates: Partial<Campaign>) => Promise<void>;
  deleteCampaign: (id: string) => Promise<void>;
  sendCampaign: (id: string) => Promise<void>;
  scheduleCampaign: (id: string, scheduledDate: Date) => Promise<void>;
}

// סוגי UI
export interface FilterOptions {
  rsvpStatus?: RSVPStatus[];
  channel?: MessageChannel[];
  tags?: string[];
  searchTerm?: string;
}

export interface SortOptions {
  field: keyof Guest;
  direction: 'asc' | 'desc';
}

export interface PaginationOptions {
  page: number;
  limit: number;
  total: number;
}

// Client Management Types
export interface Client {
  id: string;
  firstName: string;
  lastName: string;
  phoneNumber: string;
  email?: string;
  company?: string;
  notes?: string;
  events: ClientEvent[];
  createdAt: Date;
  updatedAt: Date;
  isActive: boolean;
  tags?: string[];
  serviceAreas?: string[]; // תחומי שירות: photography, videography, seating, all
  lastContactDate?: Date;
  totalEvents: number;
  totalGuests: number;
}

export interface ClientEvent {
  id: string;
  clientId: string;
  eventId: string;
  eventName: string;
  eventDate: Date;
  eventType: string;
  eventTypeHebrew: string;
  venue: string;
  status: 'upcoming' | 'completed' | 'cancelled';
  guestCount: number;
  confirmedGuests: number;
  responseRate: number;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Reminder {
  id: string;
  clientId: string;
  eventId?: string;
  title: string;
  description?: string;
  reminderDate: Date;
  reminderTime?: string;
  type: 'call' | 'email' | 'whatsapp' | 'sms' | 'meeting' | 'follow_up';
  status: 'pending' | 'completed' | 'cancelled' | 'overdue';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  isRecurring: boolean;
  recurringInterval?: 'daily' | 'weekly' | 'monthly' | 'yearly';
  recurringEndDate?: Date;
  completedAt?: Date;
  completedBy?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ClientStats {
  totalClients: number;
  activeClients: number;
  totalEvents: number;
  upcomingEvents: number;
  completedEvents: number;
  averageResponseRate: number;
  totalGuests: number;
  pendingReminders: number;
  overdueReminders: number;
}

export interface ClientFilterOptions {
  searchTerm?: string;
  tags?: string[];
  serviceAreas?: string[]; // תחומי שירות לסינון
  status?: ('active' | 'inactive')[];
  eventType?: string[];
  dateRange?: {
    start: Date;
    end: Date;
  };
  hasUpcomingEvents?: boolean;
  hasOverdueReminders?: boolean;
}

export interface ReminderFilterOptions {
  clientId?: string;
  eventId?: string;
  type?: Reminder['type'][];
  status?: Reminder['status'][];
  priority?: Reminder['priority'][];
  dateRange?: {
    start: Date;
    end: Date;
  };
  isOverdue?: boolean;
}

// User Management Types (SaaS)
export interface User {
  id: string;
  email: string;
  name: string;
  credits: number; // יתרת רשומות
  createdAt: Date;
  updatedAt: Date;
  isAdmin?: boolean; // האם מנהל המערכת
}

export interface Transaction {
  id: string;
  userId: string;
  amount: number; // סכום התשלום בשקלים
  credits: number; // כמות רשומות שנרכשו
  stripePaymentId?: string; // מזהה תשלום מ-Stripe
  status: 'pending' | 'success' | 'failed';
  createdAt: Date;
}

export interface PricingPackage {
  credits: number; // כמות רשומות
  price: number; // מחיר בשקלים
  label: string; // תווית (למשל: "50 רשומות")
}

// User Store Interface
export interface UserStore {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  
  // Actions
  signUp: (email: string, password: string, name: string) => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  updateCredits: (credits: number) => void;
  deductCredits: (amount: number) => Promise<boolean>; // מחזיר true אם יש מספיק
  checkCredits: (required: number) => boolean; // בודק אם יש מספיק רשומות
  makeAdmin: () => void; // הופך את המשתמש הנוכחי למנהל
  addCreditsToUser: (userEmailOrName: string, creditsToAdd: number) => Promise<{
    success: boolean;
    user: User;
    previousCredits: number;
    newCredits: number;
  }>; // מוסיף רשומות למשתמש אחר (רק למנהל)
  getAllUsers: () => User[];
  getAllUsersWithPasswords: () => Promise<(User & { password: string })[]>; // קבלת כל המשתמשים (רק למנהל)
}
