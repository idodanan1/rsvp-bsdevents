import { Event, EventStats, GlobalStats } from '../types';

// Generate unique ID
export const generateId = (): string => {
  return Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
};

// Format phone number for display
export const formatPhoneNumber = (phone: string): string => {
  // Remove all non-digit characters
  const cleaned = phone.replace(/\D/g, '');
  
  // Format Israeli phone number
  if (cleaned.startsWith('972')) {
    return `+${cleaned.slice(0, 3)}-${cleaned.slice(3, 5)}-${cleaned.slice(5)}`;
  } else if (cleaned.startsWith('0')) {
    return `+972-${cleaned.slice(1, 4)}-${cleaned.slice(4)}`;
  }
  
  return phone;
};

// Format date for display
export const formatDate = (date: Date | string): string => {
  // Convert string to Date if needed (from localStorage)
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  // Check if date is valid
  if (isNaN(dateObj.getTime())) {
    return 'תאריך לא תקין';
  }
  
  return new Intl.DateTimeFormat('he-IL', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  }).format(dateObj);
};

// Format date and time for display
export const formatDateTime = (date: Date | string): string => {
  // Convert string to Date if needed (from localStorage)
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  // Check if date is valid
  if (isNaN(dateObj.getTime())) {
    return 'תאריך לא תקין';
  }
  
  return new Intl.DateTimeFormat('he-IL', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(dateObj);
};

// Format time for display
export const formatTime = (time: string | Date): string => {
  if (typeof time === 'string') {
    // If it's already a time string (HH:MM), return as is
    if (/^\d{2}:\d{2}$/.test(time)) {
      return time;
    }
    // If it's a full date string, extract time
    const date = new Date(time);
    if (!isNaN(date.getTime())) {
      return date.toLocaleTimeString('he-IL', {
        hour: '2-digit',
        minute: '2-digit'
      });
    }
  } else if (time instanceof Date) {
    return time.toLocaleTimeString('he-IL', {
      hour: '2-digit',
      minute: '2-digit'
    });
  }
  
  return time.toString();
};

// Calculate event statistics
export const calculateEventStats = (event: Event): EventStats => {
  const totalGuests = event.guests.length;
  const confirmed = event.guests.filter(g => g.rsvpStatus === 'confirmed').length;
  const declined = event.guests.filter(g => g.rsvpStatus === 'declined').length;
  const maybe = event.guests.filter(g => g.rsvpStatus === 'maybe').length;
  const pending = event.guests.filter(g => g.rsvpStatus === 'pending').length;
  
  const responseRate = totalGuests > 0 ? Math.round(((confirmed + declined + maybe) / totalGuests) * 100) : 0;
  
  const attended = event.guests.filter(g => g.actualAttendance === 'attended').length;
  const attendanceRate = confirmed > 0 ? Math.round((attended / confirmed) * 100) : 0;

  return {
    totalGuests,
    confirmed,
    declined,
    maybe,
    pending,
    responseRate,
    attendanceRate
  };
};

// Calculate global statistics
export const calculateGlobalStats = (events: Event[]): GlobalStats => {
  const activeEvents = events.filter(e => e.isActive).length;
  const totalGuests = events.reduce((sum, event) => sum + event.guests.length, 0);
  const totalConfirmed = events.reduce((sum, event) => {
    return sum + event.guests.filter(g => g.rsvpStatus === 'confirmed').length;
  }, 0);
  
  const totalResponses = events.reduce((sum, event) => {
    return sum + event.guests.filter(g => g.rsvpStatus !== 'pending').length;
  }, 0);
  
  const averageResponseRate = totalGuests > 0 ? Math.round((totalResponses / totalGuests) * 100) : 0;

  return {
    totalEvents: events.length,
    totalGuests,
    totalConfirmed,
    averageResponseRate,
    activeEvents
  };
};

// Validate phone number
export const isValidPhoneNumber = (phone: string): boolean => {
  const cleaned = phone.replace(/\D/g, '');
  // Israeli phone number validation
  return /^(972|0)?[2-9]\d{8}$/.test(cleaned);
};

// Validate email
export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Format RSVP status for display
export const formatRSVPStatus = (status: string): string => {
  const statusMap: Record<string, string> = {
    pending: 'לא ענה',
    confirmed: 'מגיע',
    declined: 'לא מגיע',
    maybe: 'אולי מגיע'
  };
  return statusMap[status] || status;
};

// Format attendance status for display
export const formatAttendanceStatus = (status: string): string => {
  const statusMap: Record<string, string> = {
    attended: 'הגיע',
    not_attended: 'לא הגיע',
    not_marked: 'לא סומן'
  };
  return statusMap[status] || status;
};

// Get status color class
export const getStatusColor = (status: string): string => {
  const colorMap: Record<string, string> = {
    pending: 'text-gray-500',
    confirmed: 'text-green-600',
    declined: 'text-red-600',
    maybe: 'text-yellow-600',
    attended: 'text-green-600',
    not_attended: 'text-red-600',
    not_marked: 'text-gray-500'
  };
  return colorMap[status] || 'text-gray-500';
};

// Get status icon
export const getStatusIcon = (status: string): string => {
  const iconMap: Record<string, string> = {
    pending: '⏳',
    confirmed: '✅',
    declined: '❌',
    maybe: '❓',
    attended: '🟢',
    not_attended: '🔴',
    not_marked: '⚪'
  };
  return iconMap[status] || '❓';
};

// Debounce function
export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

// Sort events by date
export const sortEventsByDate = (events: Event[], ascending: boolean = true): Event[] => {
  return [...events].sort((a, b) => {
    const dateA = new Date(a.eventDate).getTime();
    const dateB = new Date(b.eventDate).getTime();
    return ascending ? dateA - dateB : dateB - dateA;
  });
};

// Filter events by search term
export const filterEventsBySearch = (events: Event[], searchTerm: string): Event[] => {
  if (!searchTerm.trim()) return events;
  
  const term = searchTerm.toLowerCase();
  return events.filter(event =>
    event.coupleName.toLowerCase().includes(term) ||
    event.groomName.toLowerCase().includes(term) ||
    event.brideName.toLowerCase().includes(term) ||
    event.venue.toLowerCase().includes(term)
  );
};

// Export data to CSV
export const exportToCSV = (data: any[], filename: string): void => {
  const csvContent = [
    Object.keys(data[0]).join(','),
    ...data.map(row => Object.values(row).join(','))
  ].join('\n');
  
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
