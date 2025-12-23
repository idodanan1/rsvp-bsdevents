import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { WhatsAppClient } from '@/lib/services/whatsapp/client'

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
    const { eventId, guestId, templateId } = body

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

    // Get guest
    const { data: guest, error: guestError } = await supabase
      .from('guests')
      .select('*')
      .eq('id', guestId)
      .eq('event_id', eventId)
      .single()

    if (guestError || !guest || !guest.phone) {
      return NextResponse.json({ error: 'Guest not found or no phone number' }, { status: 404 })
    }

    // Get template if provided
    let templateName = 'default_invite'
    if (templateId) {
      const { data: template } = await supabase
        .from('message_templates')
        .select('template_id, content')
        .eq('id', templateId)
        .single()

      if (template?.template_id) {
        templateName = template.template_id
      }
    }

    // Send message via WhatsApp
    const whatsapp = new WhatsAppClient()
    const result = await whatsapp.sendTemplateMessage(
      guest.phone,
      templateName,
      'he',
      [guest.full_name]
    )

    // Record message
    const { error: messageError } = await supabase
      .from('whatsapp_messages')
      .insert({
        event_id: eventId,
        guest_id: guestId,
        template_id: templateId || null,
        message_id: result.messages?.[0]?.id,
        phone_number: guest.phone,
        status: 'sent',
        sent_at: new Date().toISOString(),
      })

    if (messageError) {
      return NextResponse.json({ error: messageError.message }, { status: 500 })
    }

    // Update guest message status
    await supabase
      .from('guests')
      .update({ message_status: 'sent' })
      .eq('id', guestId)

    return NextResponse.json({ success: true, messageId: result.messages?.[0]?.id })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

