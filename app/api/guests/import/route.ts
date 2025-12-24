import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import * as XLSX from 'xlsx'
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

    const formData = await request.formData()
    const file = formData.get('file') as File
    const eventId = formData.get('eventId') as string

    if (!file || !eventId) {
      return NextResponse.json({ error: 'Missing file or eventId' }, { status: 400 })
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

    // Read Excel file
    const arrayBuffer = await file.arrayBuffer()
    const workbook = XLSX.read(arrayBuffer, { type: 'array' })
    const sheetName = workbook.SheetNames[0]
    const worksheet = workbook.Sheets[sheetName]
    const data = XLSX.utils.sheet_to_json(worksheet) as any[]

    // Map Excel columns to guest fields
    // Expected columns: שם מלא, טלפון, מספר אורחים, קבוצה/קטגוריה
    const guests = data.map((row) => {
      const fullName = row['שם מלא'] || row['Full Name'] || row['full_name'] || ''
      const phone = row['טלפון'] || row['Phone'] || row['phone'] || null
      const guestCount = parseInt(row['מספר אורחים'] || row['Guest Count'] || row['guest_count'] || '1')
      const groupCategory = row['קבוצה/קטגוריה'] || row['Group/Category'] || row['group_category'] || null

      return {
        event_id: eventId,
        full_name: fullName,
        phone: phone ? String(phone).replace(/\D/g, '') : null,
        guest_count: isNaN(guestCount) ? 1 : guestCount,
        group_category: groupCategory,
        rsvp_status: 'pending' as const,
        message_status: 'not_sent' as const,
        check_in_status: 'not_arrived' as const,
      }
    }).filter((g) => g.full_name) // Filter out rows without names

    if (guests.length === 0) {
      return NextResponse.json({ error: 'No valid guests found' }, { status: 400 })
    }

    // Insert guests
    // Type assertion to fix TypeScript inference issue
    const { error: insertError } = await (supabase
      .from('guests') as any)
      .insert(guests as Database['public']['Tables']['guests']['Insert'][])
    

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, count: guests.length })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

