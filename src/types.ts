// Type definitions for the RSVP Management System

export interface Guest {
  id: string;
  firstName: string;
  lastName: string;
  phoneNumber: string;
  guestCount: number;
  rsvpStatus: 'pending' | 'confirmed' | 'declined' | 'maybe';
  actualAttendance?: 'attended' | 'not_attended' | 'not_marked';
  tableId?: string;
  notes?: string;
  responseDate?: Date | string;
  attendanceDate?: Date | string;
  messageStatus?: 'not_sent' | 'sent' | 'delivered' | 'failed';
  messageSentDate?: Date | string;
  messageDeliveredDate?: Date | string;
  messageFailedDate?: Date | string;
  source?: string;
}

export interface Table {
  id: string;
  number: number;
  capacity: number;
  guests?: string[];
}

export interface Campaign {
  id: string;
  name: string;
  message: string;
  status: 'draft' | 'scheduled' | 'sending' | 'sent' | 'failed';
  sentCount?: number;
  sentDate?: Date | string;
  scheduledDate?: Date | string;
  imageUrl?: string;
  eventId?: string;
  channel?: 'whatsapp' | 'sms';
  responseCount?: number;
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

export interface Event {
  id: string;
  name: string;
  coupleName: string;
  eventDate: Date | string;
  eventTime?: string;
  venue: string;
  guests: Guest[];
  tables?: Table[];
  campaigns?: Campaign[];
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

