// Hebrew translations
export const he = {
  // Common
  common: {
    save: 'שמור',
    cancel: 'ביטול',
    delete: 'מחק',
    edit: 'ערוך',
    create: 'צור',
    search: 'חפש',
    filter: 'סנן',
    export: 'ייצא',
    import: 'ייבא',
    loading: 'טוען...',
    error: 'שגיאה',
    success: 'הצלחה',
    confirm: 'אישור',
    close: 'סגור',
  },
  // Auth
  auth: {
    login: 'התחבר',
    signup: 'הרשמה',
    logout: 'התנתק',
    email: 'אימייל',
    password: 'סיסמה',
    fullName: 'שם מלא',
    forgotPassword: 'שכחת סיסמה?',
    alreadyHaveAccount: 'כבר יש לך חשבון?',
    dontHaveAccount: 'אין לך חשבון?',
  },
  // Events
  events: {
    title: 'אירועים',
    createEvent: 'צור אירוע חדש',
    eventName: 'שם האירוע',
    eventDate: 'תאריך האירוע',
    location: 'מיקום',
    description: 'תיאור',
    noEvents: 'אין אירועים',
    manage: 'נהל',
    view: 'צפה',
  },
  // Guests
  guests: {
    title: 'אורחים',
    addGuest: 'הוסף אורח',
    fullName: 'שם מלא',
    phone: 'טלפון',
    guestCount: 'מספר אורחים',
    groupCategory: 'קבוצה/קטגוריה',
    rsvpStatus: 'סטטוס RSVP',
    messageStatus: 'סטטוס הודעה',
    checkInStatus: 'סטטוס הגעה',
    rsvpStatuses: {
      pending: 'ממתין',
      confirmed: 'אושר',
      maybe: 'אולי',
      declined: 'נדחה',
    },
    messageStatuses: {
      notSent: 'לא נשלח',
      sent: 'נשלח',
      delivered: 'נמסר',
      read: 'נקרא',
      failed: 'נכשל',
    },
    checkInStatuses: {
      notArrived: 'לא הגיע',
      arrived: 'הגיע',
    },
    lastUpdated: 'עודכן לאחרונה',
    notes: 'הערות',
    importExcel: 'ייבא מאקסל',
    exportExcel: 'ייצא לאקסל',
  },
  // WhatsApp
  whatsapp: {
    title: 'WhatsApp',
    sendMessage: 'שלח הודעה',
    createCampaign: 'צור קמפיין',
    templates: 'תבניות',
    messageHistory: 'היסטוריית הודעות',
    campaigns: 'קמפיינים',
    campaignTypes: {
      inviteRound1: 'הזמנה - סבב 1',
      inviteRound2: 'הזמנה - סבב 2',
      inviteRound3: 'הזמנה - סבב 3',
      reminder: 'תזכורת',
      thankYou: 'תודה',
      custom: 'מותאם אישית',
    },
    schedule: 'תזמן',
    scheduledAt: 'מתוזמן ל',
  },
  // Seating
  seating: {
    title: 'הושבה',
    createTable: 'צור שולחן',
    tableName: 'שם השולחן',
    tableNumber: 'מספר שולחן',
    capacity: 'קיבולת',
    assignGuest: 'הקצה אורח',
    dragDrop: 'גרור ושחרר אורחים לשולחנות',
    currentCapacity: 'קיבולת נוכחית',
    of: 'מתוך',
  },
  // Check-in
  checkin: {
    title: 'הרשמה',
    scanQR: 'סרוק QR',
    guestName: 'שם האורח',
    tableNumber: 'מספר שולחן',
    checkInSuccess: 'הרשמה בוצעה בהצלחה',
    alreadyCheckedIn: 'כבר נרשם',
    notFound: 'אורח לא נמצא',
  },
  // Public View
  publicView: {
    title: 'תצוגה ציבורית',
    stats: 'סטטיסטיקות',
    rsvpCounts: 'מספרי RSVP',
    seatingChart: 'תרשים הושבה',
    checkInProgress: 'התקדמות הרשמה',
    totalGuests: 'סה"כ אורחים',
    confirmed: 'אושרו',
    pending: 'ממתינים',
    arrived: 'הגיעו',
    of: 'מתוך',
  },
}

export type Translations = typeof he

