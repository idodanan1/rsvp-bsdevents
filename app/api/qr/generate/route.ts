import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { generateQRCodeData, generateQRCodeImage } from '@/lib/services/qr/generator'
import type { Database } from '@/types/database.types'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { eventId, guestId } = body

    if (!eventId || !guestId) {
      return NextResponse.json({ error: 'Missing eventId or guestId' }, { status: 400 })
    }

    // Verify event ownership
    const { data: event } = await supabase
      .from('events')
      .select('id')
      .eq('id', eventId)
      .eq('user_id', user.id)
      .single()

    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 })
    }

    // Check if QR code already exists
    const { data: existingQR } = await supabase
      .from('qr_codes')
      .select('*')
      .eq('guest_id', guestId)
      .single()

    let qrCode: string
    let qrImage: string

    if (existingQR) {
      // Type assertion to fix TypeScript inference issue
      const qrData = existingQR as Database['public']['Tables']['qr_codes']['Row']
      qrCode = qrData.code
      qrImage = qrData.qr_image_url || ''
      
    } else {
      // Generate new QR code
      qrCode = generateQRCodeData(eventId, guestId)
      qrImage = await generateQRCodeImage(qrCode)

      // Store in database
      // Type assertion to fix TypeScript inference issue
      const { error: insertError } = await (supabase
        .from('qr_codes') as any)
        .insert({
          event_id: eventId,
          guest_id: guestId,
          code: qrCode,
          qr_image_url: qrImage,
        } as Database['public']['Tables']['qr_codes']['Insert'])

      if (insertError) {
        return NextResponse.json({ error: insertError.message }, { status: 500 })
      }
    }

    return NextResponse.json({
      success: true,
      qrCode,
      qrImage,
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

