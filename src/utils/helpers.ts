// Helper functions for the RSVP Management System
import { Event, Guest } from '../types';

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
  
  const totalGuests = guests.reduce((sum, guest) => sum + (guest.guestCount || 1), 0);
  const confirmed = guests
    .filter(g => g.rsvpStatus === 'confirmed')
    .reduce((sum, guest) => sum + (guest.guestCount || 1), 0);
  const declined = guests
    .filter(g => g.rsvpStatus === 'declined')
    .reduce((sum, guest) => sum + (guest.guestCount || 1), 0);
  const maybe = guests
    .filter(g => g.rsvpStatus === 'maybe')
    .reduce((sum, guest) => sum + (guest.guestCount || 1), 0);
  const pending = guests
    .filter(g => g.rsvpStatus === 'pending')
    .reduce((sum, guest) => sum + (guest.guestCount || 1), 0);
  const attended = guests
    .filter(g => g.actualAttendance === 'attended')
    .reduce((sum, guest) => sum + (guest.guestCount || 1), 0);
  const notAttended = guests
    .filter(g => g.actualAttendance === 'not_attended')
    .reduce((sum, guest) => sum + (guest.guestCount || 1), 0);
  const notMarked = guests
    .filter(g => !g.actualAttendance || g.actualAttendance === 'not_marked')
    .reduce((sum, guest) => sum + (guest.guestCount || 1), 0);

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
  const baseUrl = (import.meta.env as any).VITE_FRONTEND_URL || window.location.origin;
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




