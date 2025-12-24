import QRCode from 'qrcode'
import crypto from 'crypto'

const SECRET = process.env.QR_CODE_SECRET || 'default-secret-change-in-production'

export interface QRCodeData {
  eventId: string
  guestId: string
  timestamp: number
}

export function generateQRCodeData(eventId: string, guestId: string): string {
  const data: QRCodeData = {
    eventId,
    guestId,
    timestamp: Date.now(),
  }

  const json = JSON.stringify(data)
  const hmac = crypto.createHmac('sha256', SECRET)
  hmac.update(json)
  const signature = hmac.digest('hex')

  const signedData = {
    data,
    signature,
  }

  return Buffer.from(JSON.stringify(signedData)).toString('base64')
}

export function verifyQRCodeData(encoded: string): QRCodeData | null {
  try {
    const decoded = JSON.parse(Buffer.from(encoded, 'base64').toString())
    const { data, signature } = decoded

    const hmac = crypto.createHmac('sha256', SECRET)
    hmac.update(JSON.stringify(data))
    const expectedSignature = hmac.digest('hex')

    if (signature !== expectedSignature) {
      return null
    }

    return data as QRCodeData
  } catch {
    return null
  }
}

export async function generateQRCodeImage(data: string): Promise<string> {
  try {
    const qrCodeDataURL = await QRCode.toDataURL(data, {
      errorCorrectionLevel: 'M',
      type: 'image/png',
      width: 300,
      margin: 1,
    })
    return qrCodeDataURL
  } catch (error) {
    throw new Error('Failed to generate QR code image')
  }
}

