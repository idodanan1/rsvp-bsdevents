import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ eventSlug: string }> }
) {
  try {
    const supabase = await createClient()
    const { eventSlug } = await params

    // Get event by slug
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('id')
      .eq('slug', eventSlug)
      .eq('public_view_enabled', true)
      .single()

    if (eventError || !event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 })
    }

    // Get stats
    const { count: total } = await supabase
      .from('guests')
      .select('*', { count: 'exact', head: true })
      .eq('event_id', event.id)

    const { count: confirmed } = await supabase
      .from('guests')
      .select('*', { count: 'exact', head: true })
      .eq('event_id', event.id)
      .eq('rsvp_status', 'confirmed')

    const { count: arrived } = await supabase
      .from('guests')
      .select('*', { count: 'exact', head: true })
      .eq('event_id', event.id)
      .eq('check_in_status', 'arrived')

    return NextResponse.json({
      total: total || 0,
      confirmed: confirmed || 0,
      arrived: arrived || 0,
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

