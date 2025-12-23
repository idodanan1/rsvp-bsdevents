import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { validateQRCode } from '@/lib/services/qr/validator'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const body = await request.json()
    const { qrCode } = body

    if (!qrCode) {
      return NextResponse.json({ error: 'Missing QR code' }, { status: 400 })
    }

    // Validate QR code
    const validation = validateQRCode(qrCode)
    if (!validation.valid || !validation.data) {
      return NextResponse.json({ error: validation.error || 'Invalid QR code' }, { status: 400 })
    }

    const { eventId, guestId } = validation.data

    // Get guest
    const { data: guest, error: guestError } = await supabase
      .from('guests')
      .select('*, events!inner(id, name)')
      .eq('id', guestId)
      .eq('event_id', eventId)
      .single()

    if (guestError || !guest) {
      return NextResponse.json({ error: 'Guest not found' }, { status: 404 })
    }

    // Check if already checked in
    const { data: existingCheckIn } = await supabase
      .from('check_ins')
      .select('*')
      .eq('event_id', eventId)
      .eq('guest_id', guestId)
      .single()

    if (existingCheckIn) {
      return NextResponse.json({
        success: true,
        alreadyCheckedIn: true,
        guest: {
          id: guest.id,
          full_name: guest.full_name,
          table_number: null, // Will be fetched from assignments
        },
      })
    }

    // Get table assignment
    const { data: assignment } = await supabase
      .from('table_assignments')
      .select('tables!inner(table_number)')
      .eq('guest_id', guestId)
      .eq('event_id', eventId)
      .single()

    // Create check-in record
    const { data: qrCodeRecord } = await supabase
      .from('qr_codes')
      .select('id')
      .eq('code', qrCode)
      .single()

    const { error: checkInError } = await supabase
      .from('check_ins')
      .insert({
        event_id: eventId,
        guest_id: guestId,
        qr_code_id: qrCodeRecord?.id || null,
      })

    if (checkInError) {
      return NextResponse.json({ error: checkInError.message }, { status: 500 })
    }

    // Update guest check-in status
    await supabase
      .from('guests')
      .update({
        check_in_status: 'arrived',
        checked_in_at: new Date().toISOString(),
      })
      .eq('id', guestId)

    return NextResponse.json({
      success: true,
      guest: {
        id: guest.id,
        full_name: guest.full_name,
        table_number: assignment?.tables?.table_number || null,
      },
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

