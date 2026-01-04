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
  groomName?: string;
  brideName?: string;
  groomParentsName?: string;
  brideParentsName?: string;
  eventDate: Date | string;
  eventTime?: string;
  venue: string;
  guests: Guest[];
  tables?: Table[];
  campaigns?: Campaign[];
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

export interface Reminder {
  id: string;
  clientId: string;
  eventId?: string;
  title: string;
  description?: string;
  reminderDate: Date | string;
  reminderTime?: string;
  type: 'call' | 'email' | 'meeting' | 'task' | 'follow-up' | 'other';
  priority: 'low' | 'medium' | 'high';
  isRecurring?: boolean;
  recurringInterval?: 'daily' | 'weekly' | 'monthly' | 'yearly';
  recurringEndDate?: Date | string;
  notes?: string;
  isCompleted?: boolean;
  completedDate?: Date | string;
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

export type VendorCategory = 
  | 'venue' 
  | 'catering' 
  | 'photography' 
  | 'videography' 
  | 'music' 
  | 'flowers' 
  | 'decoration' 
  | 'transportation' 
  | 'hair_makeup'
  | 'dress'
  | 'suit'
  | 'rings'
  | 'invitations'
  | 'other';
