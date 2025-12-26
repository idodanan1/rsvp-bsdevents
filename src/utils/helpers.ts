// Helper functions for the RSVP Management System
import React from 'react';
import { CheckCircle, XCircle, Clock, HelpCircle } from 'lucide-react';

// Type definitions
type Event = any;
type Guest = any;

export interface EventStats {
  totalGuests: number;
  confirmed: number;
  declined: number;
  maybe: number;
  pending: number;
  attended: number;
  notAttended: number;
  notMarked: number;
}

export function calculateEventStats(event: Event): EventStats {
  const guests = event.guests || [];
  
  const totalGuests = guests.reduce((sum: any, guest: any) => sum + (guest.guestCount || 1), 0);
  const confirmed = guests
    .filter((g: any) => g.rsvpStatus === 'confirmed')
    .reduce((sum: any, guest: any) => sum + (guest.guestCount || 1), 0);
  const declined = guests
    .filter((g: any) => g.rsvpStatus === 'declined')
    .reduce((sum: any, guest: any) => sum + (guest.guestCount || 1), 0);
  const maybe = guests
    .filter((g: any) => g.rsvpStatus === 'maybe')
    .reduce((sum: any, guest: any) => sum + (guest.guestCount || 1), 0);
  const pending = guests
    .filter((g: any) => g.rsvpStatus === 'pending')
    .reduce((sum: any, guest: any) => sum + (guest.guestCount || 1), 0);
  const attended = guests
    .filter((g: any) => g.actualAttendance === 'attended')
    .reduce((sum: any, guest: any) => sum + (guest.guestCount || 1), 0);
  const notAttended = guests
    .filter((g: any) => g.actualAttendance === 'not_attended')
    .reduce((sum: any, guest: any) => sum + (guest.guestCount || 1), 0);
  const notMarked = guests
    .filter((g: any) => !g.actualAttendance || g.actualAttendance === 'not_marked')
    .reduce((sum: any, guest: any) => sum + (guest.guestCount || 1), 0);

  return {
    totalGuests,
    confirmed,
    declined,
    maybe,
    pending,
    attended,
    notAttended,
    notMarked
  };
}

export function calculateGlobalStats(events: Event[]): any {
  const allGuests = events.flatMap((event: any) => event.guests || []);
  
  const totalGuests = allGuests.reduce((sum: any, guest: any) => sum + (guest.guestCount || 1), 0);
  const confirmed = allGuests
    .filter((g: any) => g.rsvpStatus === 'confirmed')
    .reduce((sum: any, guest: any) => sum + (guest.guestCount || 1), 0);
  const declined = allGuests
    .filter((g: any) => g.rsvpStatus === 'declined')
    .reduce((sum: any, guest: any) => sum + (guest.guestCount || 1), 0);
  const maybe = allGuests
    .filter((g: any) => g.rsvpStatus === 'maybe')
    .reduce((sum: any, guest: any) => sum + (guest.guestCount || 1), 0);
  const pending = allGuests
    .filter((g: any) => g.rsvpStatus === 'pending')
    .reduce((sum: any, guest: any) => sum + (guest.guestCount || 1), 0);
  
  const responseRate = totalGuests > 0 
    ? Math.round(((confirmed + declined + maybe) / totalGuests) * 100) 
    : 0;

  const now = new Date();
  const activeEvents = events.filter((event: any) => {
    const eventDate = event.eventDate ? new Date(event.eventDate) : null;
    return eventDate && eventDate >= now;
  }).length;

  return {
    totalGuests,
    confirmed,
    declined,
    maybe,
    pending,
    responseRate,
    averageResponseRate: responseRate,
    totalConfirmed: confirmed,
    totalEvents: events.length,
    activeEvents
  };
}

export function formatDate(date: Date | string | undefined): string {
  if (!date) return '';
  
  const d = date instanceof Date ? date : new Date(date);
  if (isNaN(d.getTime())) return '';
  
  return d.toLocaleDateString('he-IL', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
}

export function formatDateTime(date: Date | string | undefined): string {
  if (!date) return '';
  
  const d = date instanceof Date ? date : new Date(date);
  if (isNaN(d.getTime())) return '';
  
  return d.toLocaleString('he-IL', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
}

export function formatTime(date: Date | string | undefined): string {
  if (!date) return '';
  
  const d = date instanceof Date ? date : new Date(date);
  if (isNaN(d.getTime())) return '';
  
  return d.toLocaleTimeString('he-IL', {
    hour: '2-digit',
    minute: '2-digit'
  });
}

export function getStatusColor(status: string): string {
  switch (status) {
    case 'confirmed':
      return 'text-green-600';
    case 'declined':
      return 'text-red-600';
    case 'maybe':
      return 'text-yellow-600';
    case 'pending':
    default:
      return 'text-gray-600';
  }
}

export function getStatusIcon(status: string): React.ReactElement {
  switch (status) {
    case 'confirmed':
      return <CheckCircle className="w-4 h-4 text-green-600 inline mr-1" />;
    case 'declined':
      return <XCircle className="w-4 h-4 text-red-600 inline mr-1" />;
    case 'maybe':
      return <Clock className="w-4 h-4 text-yellow-600 inline mr-1" />;
    case 'attended':
      return <CheckCircle className="w-4 h-4 text-green-600 inline mr-1" />;
    case 'not_attended':
      return <XCircle className="w-4 h-4 text-red-600 inline mr-1" />;
    case 'not_marked':
    case 'pending':
    default:
      return <HelpCircle className="w-4 h-4 text-gray-600 inline mr-1" />;
  }
}

export function formatFullName(firstName: string, lastName: string): string {
  return `${firstName} ${lastName}`.trim();
}

export function cleanName(name: string): string {
  return name.trim().replace(/\s+/g, ' ');
}

export function generateGuestResponseLink(
  eventId: string,
  guestId: string,
  firstName: string,
  lastName: string,
  phoneNumber: string,
  rowNumber?: number
): string {
  const baseUrl = (process.env as any).NEXT_PUBLIC_FRONTEND_URL || (process.env as any).VITE_FRONTEND_URL || window.location.origin;
  const params = new URLSearchParams({
    eventId,
    guestId,
    firstName: cleanName(firstName),
    lastName: cleanName(lastName),
    phone: phoneNumber
  });
  
  if (rowNumber) {
    params.append('row', rowNumber.toString());
  }
  
  return `${baseUrl}/guest-response?${params.toString()}`;
}

export const ensureUniqueEventIds = (events: any[]) => {
  const ids = new Set();
  return events.filter((event: any) => {
    if (!event.id || ids.has(event.id)) return false;
    ids.add(event.id);
    return true;
  });
};

