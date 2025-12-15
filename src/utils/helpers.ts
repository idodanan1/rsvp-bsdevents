import { Event, EventStats, GlobalStats } from '../types';

// Generate unique ID
export const generateId = (): string => {
  return Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
};

// Clean name by removing extra spaces
export const cleanName = (name: string | undefined | null): string => {
  if (!name) return '';
  // Trim whitespace and replace multiple spaces with single space
  return name.trim().replace(/\s+/g, ' ');
};

// Format full name (first + last) with proper spacing
export const formatFullName = (firstName: string | undefined | null, lastName: string | undefined | null): string => {
  const first = cleanName(firstName);
  const last = cleanName(lastName);
  if (!first && !last) return '';
  if (!first) return last;
  if (!last) return first;
  return `${first} ${last}`;
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
export const formatDate = (date: Date | string | undefined | null): string => {
  // Handle undefined or null
  if (!date || date === null || date === undefined) {
    return '-';
  }
  
  try {
    // Convert string to Date if needed (from localStorage)
    let dateObj: Date;
    if (typeof date === 'string') {
      dateObj = new Date(date);
    } else if (date instanceof Date) {
      dateObj = date;
    } else {
      return '-';
    }
    
    // Check if dateObj is valid Date object and has valid getTime method
    if (!dateObj || !(dateObj instanceof Date) || typeof dateObj.getTime !== 'function') {
      return '-';
    }
    
    const timeValue = dateObj.getTime();
    if (isNaN(timeValue) || !isFinite(timeValue)) {
      return '-';
    }
    
    return new Intl.DateTimeFormat('he-IL', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }).format(dateObj);
  } catch (error) {
    // If any error occurs, return '-'
    return '-';
  }
};

// Format date and time for display
export const formatDateTime = (date: Date | string | undefined | null): string => {
  // Handle undefined or null
  if (!date || date === null || date === undefined) {
    return '-';
  }
  
  try {
    // Convert string to Date if needed (from localStorage)
    let dateObj: Date;
    if (typeof date === 'string') {
      dateObj = new Date(date);
    } else if (date instanceof Date) {
      dateObj = date;
    } else {
      return '-';
    }
    
    // Check if dateObj is valid Date object and has valid getTime method
    if (!dateObj || !(dateObj instanceof Date) || typeof dateObj.getTime !== 'function') {
      return '-';
    }
    
    const timeValue = dateObj.getTime();
    if (isNaN(timeValue) || !isFinite(timeValue)) {
      return '-';
    }
    
    return new Intl.DateTimeFormat('he-IL', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(dateObj);
  } catch (error) {
    // If any error occurs, return '-'
    return '-';
  }
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
  // CRITICAL: Ensure guests array exists to prevent errors
  const guests = event.guests || [];
  // Calculate total guests count (sum of guestCount for all guests)
  const totalGuests = guests.reduce((sum, g) => sum + (g.guestCount || 1), 0);
  
  // Calculate confirmed guests count (sum of guestCount for confirmed guests)
  const confirmed = guests
    .filter(g => g.rsvpStatus === 'confirmed')
    .reduce((sum, g) => sum + (g.guestCount || 1), 0);
  
  // Calculate declined guests count (sum of guestCount for declined guests)
  const declined = guests
    .filter(g => g.rsvpStatus === 'declined')
    .reduce((sum, g) => sum + (g.guestCount || 1), 0);
  
  // Calculate maybe guests count (sum of guestCount for maybe guests)
  const maybe = guests
    .filter(g => g.rsvpStatus === 'maybe')
    .reduce((sum, g) => sum + (g.guestCount || 1), 0);
  
  // Calculate pending guests count (sum of guestCount for pending guests)
  const pending = guests
    .filter(g => g.rsvpStatus === 'pending')
    .reduce((sum, g) => sum + (g.guestCount || 1), 0);
  
  // Response rate based on total guest count
  const responseRate = totalGuests > 0 ? Math.round(((confirmed + declined + maybe) / totalGuests) * 100) : 0;
  
  // Calculate attended guests count (sum of guestCount for attended guests)
  const attended = guests
    .filter(g => g.actualAttendance === 'attended')
    .reduce((sum, g) => sum + (g.guestCount || 1), 0);
  
  // Attendance rate based on confirmed guest count
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

// Get production frontend URL (works on all devices)
export const getFrontendUrl = (): string => {
  // Always use production URL for guest links (works on all devices)
  // This ensures links work even when sent from different devices
  const productionUrl = import.meta.env.VITE_FRONTEND_URL || 'https://rsvp-frontend-wy47.onrender.com';
  
  // In development, allow localhost for testing
  if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
    return window.location.origin;
  }
  
  return productionUrl;
};

// Generate guest response link (works on all devices)
// CRITICAL: Always includes eventId to distinguish between events, even if guests are identical
export const generateGuestResponseLink = (eventId: string, guestId: string): string => {
  // Validate inputs
  if (!eventId || !guestId) {
    console.error('❌ generateGuestResponseLink: Missing eventId or guestId', { eventId, guestId });
    throw new Error('EventId and guestId are required to generate guest response link');
  }
  
  const frontendUrl = getFrontendUrl();
  // Use HashRouter format for static hosting compatibility
  // Format: /#/guest-response/{eventId}?guest={guestId}
  // This ensures each link is unique per event, even if guests have the same ID across events
  const link = `${frontendUrl}/#/guest-response/${eventId}?guest=${guestId}`;
  console.log('🔗 Generated guest response link:', link, 'EventId:', eventId, 'GuestId:', guestId);
  return link;
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

// Create AbortSignal with timeout (compatible with older browsers)
export const createTimeoutSignal = (timeoutMs: number): AbortSignal => {
  // Use AbortSignal.timeout if available (newer browsers)
  if (typeof AbortSignal !== 'undefined' && 'timeout' in AbortSignal && typeof AbortSignal.timeout === 'function') {
    return AbortSignal.timeout(timeoutMs);
  }
  
  // Fallback for older browsers using AbortController
  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    controller.abort();
  }, timeoutMs);
  
  // Clean up timeout if signal is aborted manually
  controller.signal.addEventListener('abort', () => {
    clearTimeout(timeoutId);
  });
  
  return controller.signal;
};