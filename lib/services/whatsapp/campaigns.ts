import { createClient } from '@/lib/supabase/server'
import { WhatsAppClient } from './client'
import type { Database } from '@/types/database.types'

type Campaign = Database['public']['Tables']['whatsapp_campaigns']['Row']
type Guest = Database['public']['Tables']['guests']['Row']

export class CampaignScheduler {
  private supabase: any
  private whatsapp: WhatsAppClient

  constructor(supabase: any) {
    this.supabase = supabase
    this.whatsapp = new WhatsAppClient()
  }

  async executeCampaign(campaignId: string) {
    const { data: campaign, error: campaignError } = await this.supabase
      .from('whatsapp_campaigns')
      .select('*')
      .eq('id', campaignId)
      .single()

    if (campaignError || !campaign) {
      throw new Error('Campaign not found')
    }

    if (campaign.status !== 'scheduled' && campaign.status !== 'running') {
      throw new Error('Campaign is not in a runnable state')
    }

    // Update campaign status to running
    await this.supabase
      .from('whatsapp_campaigns')
      .update({ status: 'running' })
      .eq('id', campaignId)

    // Get target guests
    const { data: guests, error: guestsError } = await this.supabase
      .from('guests')
      .select('*')
      .eq('event_id', campaign.event_id)
      .in('rsvp_status', campaign.target_status)

    if (guestsError) {
      throw new Error('Failed to fetch guests')
    }

    let sentCount = 0
    let failedCount = 0

    // Send messages to each guest
    for (const guest of guests || []) {
      if (!guest.phone) continue

      try {
        // Get template if available
        let templateName = 'default_invite'
        if (campaign.template_id) {
          const { data: template } = await this.supabase
            .from('message_templates')
            .select('template_id, content')
            .eq('id', campaign.template_id)
            .single()

          if (template?.template_id) {
            templateName = template.template_id
          }
        }

        // Prepare message parameters
        const parameters = [
          guest.full_name,
          // Add more parameters based on template requirements
        ]

        // Send message
        const result = await this.whatsapp.sendTemplateMessage(
          guest.phone,
          templateName,
          'he',
          parameters
        )

        // Record message
        await this.supabase
          .from('whatsapp_messages')
          .insert({
            event_id: campaign.event_id,
            guest_id: guest.id,
            template_id: campaign.template_id,
            message_id: result.messages?.[0]?.id,
            phone_number: guest.phone,
            status: 'sent',
            sent_at: new Date().toISOString(),
          })

        // Update guest message status
        await this.supabase
          .from('guests')
          .update({ message_status: 'sent' })
          .eq('id', guest.id)

        sentCount++
      } catch (error: any) {
        console.error(`Failed to send message to ${guest.phone}:`, error)

        // Record failed message
        await this.supabase
          .from('whatsapp_messages')
          .insert({
            event_id: campaign.event_id,
            guest_id: guest.id,
            phone_number: guest.phone,
            status: 'failed',
            error_message: error.message,
          })

        failedCount++
      }
    }

    // Update campaign status
    await this.supabase
      .from('whatsapp_campaigns')
      .update({
        status: 'completed',
        sent_count: sentCount,
        failed_count: failedCount,
      })
      .eq('id', campaignId)

    return { sentCount, failedCount }
  }

  async scheduleCampaign(
    eventId: string,
    type: Campaign['type'],
    targetStatus: string[],
    scheduledAt: string,
    templateId?: string
  ) {
    const { data: campaign, error } = await this.supabase
      .from('whatsapp_campaigns')
      .insert({
        event_id: eventId,
        template_id: templateId,
        name: `Campaign ${type}`,
        type,
        target_status: targetStatus,
        scheduled_at: scheduledAt,
        status: 'scheduled',
      })
      .select()
      .single()

    if (error) {
      throw new Error(error.message)
    }

    return campaign
  }
}

