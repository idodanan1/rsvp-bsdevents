import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
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
    const { eventId, guestId, tableId } = body

    if (!eventId || !guestId || !tableId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
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

    // Remove existing assignment for this guest
    await supabase
      .from('table_assignments')
      .delete()
      .eq('guest_id', guestId)

    // Create new assignment
    // Type assertion to fix TypeScript inference issue
    const { data, error } = await (supabase
      .from('table_assignments') as any)
      .insert({
        event_id: eventId,
        guest_id: guestId,
        table_id: tableId,
      } as Database['public']['Tables']['table_assignments']['Insert'])
      .select()
      .single()
      

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, assignment: data })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

