import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import * as XLSX from 'xlsx'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const eventId = searchParams.get('eventId')

    if (!eventId) {
      return NextResponse.json({ error: 'Missing eventId' }, { status: 400 })
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

    // Fetch guests
    const { data: guests, error: fetchError } = await supabase
      .from('guests')
      .select('*')
      .eq('event_id', eventId)
      .order('updated_at', { ascending: false })

    if (fetchError) {
      return NextResponse.json({ error: fetchError.message }, { status: 500 })
    }

    // Convert to Excel format with Hebrew headers
    const excelData = (guests || []).map((guest) => ({
      'שם מלא': guest.full_name,
      'טלפון': guest.phone || '',
      'מספר אורחים': guest.guest_count,
      'קבוצה/קטגוריה': guest.group_category || '',
      'סטטוס RSVP': guest.rsvp_status,
      'סטטוס הודעה': guest.message_status,
      'סטטוס הגעה': guest.check_in_status,
      'הערות': guest.notes || '',
      'עודכן לאחרונה': new Date(guest.updated_at).toLocaleString('he-IL'),
    }))

    // Create workbook
    const worksheet = XLSX.utils.json_to_sheet(excelData)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'אורחים')

    // Generate buffer
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' })

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="guests-${eventId}.xlsx"`,
      },
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

