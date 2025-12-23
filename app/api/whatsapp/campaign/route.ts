import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { CampaignScheduler } from '@/lib/services/whatsapp/campaigns'

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
    const { eventId, type, targetStatus, scheduledAt, templateId } = body

    if (!eventId || !type || !targetStatus || !Array.isArray(targetStatus)) {
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

    // Create campaign
    const scheduler = new CampaignScheduler(supabase)
    const campaign = await scheduler.scheduleCampaign(
      eventId,
      type,
      targetStatus,
      scheduledAt || new Date().toISOString(),
      templateId
    )

    // If scheduled for now or past, execute immediately
    const scheduledDate = new Date(scheduledAt || new Date())
    if (scheduledDate <= new Date()) {
      await scheduler.executeCampaign(campaign.id)
    }

    return NextResponse.json({ success: true, campaign })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

