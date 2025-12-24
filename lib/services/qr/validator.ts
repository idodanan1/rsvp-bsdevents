import { verifyQRCodeData } from './generator'

export function validateQRCode(encoded: string): {
  valid: boolean
  data?: { eventId: string; guestId: string }
  error?: string
} {
  const decoded = verifyQRCodeData(encoded)

  if (!decoded) {
    return {
      valid: false,
      error: 'Invalid QR code signature',
    }
  }

  // Check if QR code is not too old (optional, e.g., 1 year)
  const maxAge = 365 * 24 * 60 * 60 * 1000 // 1 year
  const age = Date.now() - decoded.timestamp

  if (age > maxAge) {
    return {
      valid: false,
      error: 'QR code expired',
    }
  }

  return {
    valid: true,
    data: {
      eventId: decoded.eventId,
      guestId: decoded.guestId,
    },
  }
}

