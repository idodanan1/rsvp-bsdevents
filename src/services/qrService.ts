// QR Code Service - Creates unique QR codes for guests

export interface QRCodeData {
  eventId: string;
  guestId: string;
}

/**
 * Generate a unique QR code URL for a guest
 */
export function generateQRUrl(eventId: string, guestId: string): string {
  // Use the base URL - adjust this to match your deployment
  const baseUrl = typeof window !== 'undefined' 
    ? `${window.location.protocol}//${window.location.host}`
    : 'http://192.168.1.47:3001';
  
  return `${baseUrl}/qr-scan/${eventId}/${guestId}`;
}

/**
 * Parse QR code URL to extract event and guest IDs
 */
export function parseQRUrl(url: string): QRCodeData | null {
  try {
    // Try to parse as full URL first
    try {
      const urlObj = new URL(url);
      const pathParts = urlObj.pathname.split('/');
      
      const qrIndex = pathParts.indexOf('qr-scan');
      if (qrIndex !== -1 && pathParts.length >= qrIndex + 3) {
        return {
          eventId: pathParts[qrIndex + 1],
          guestId: pathParts[qrIndex + 2]
        };
      }
    } catch (e) {
      // Not a full URL, try to parse as path
    }
    
    // Try to parse as path (e.g., /qr-scan/eventId/guestId or #/qr-scan/eventId/guestId)
    const pathMatch = url.match(/qr-scan[\/#]([^\/]+)\/([^\/]+)/);
    if (pathMatch) {
      return {
        eventId: pathMatch[1],
        guestId: pathMatch[2]
      };
    }
    
    return null;
  } catch (error) {
    console.error('Error parsing QR URL:', error);
    return null;
  }
}

/**
 * Generate QR code as image URL for embedding in messages
 * Uses QR Server API for generating QR code images
 */
export async function generateQRCodeImage(
  eventId: string, 
  guestId: string,
  size: number = 256
): Promise<string> {
  const qrUrl = generateQRUrl(eventId, guestId);
  
  // Use QR Server API to generate QR code image
  // This is a free service that generates QR codes from URLs
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(qrUrl)}`;
}

