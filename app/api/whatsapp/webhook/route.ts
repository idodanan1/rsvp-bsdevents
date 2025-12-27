import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import crypto from 'crypto'
import type { Database } from '@/types/database.types'

const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN || ''

// Webhook verification (GET request)
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const mode = searchParams.get('hub.mode')
  const token = searchParams.get('hub.verify_token')
  const challenge = searchParams.get('hub.challenge')

  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
    return new NextResponse(challenge, { status: 200 })
  }

  return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
}

// Webhook handler (POST request)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const entry = body.entry?.[0]
    const changes = entry?.changes?.[0]
    const value = changes?.value

    // Handle status updates
    if (value?.statuses) {
      const supabase = await createClient()
      
      for (const status of value.statuses) {
        const messageId = status.id
        const statusType = status.status

        // Find message by message_id
        const { data: message } = await supabase
          .from('whatsapp_messages')
          .select('*')
          .eq('message_id', messageId)
          .single()

        if (message) {
          // Type assertion to fix TypeScript inference issue
          const messageData = message as Database['public']['Tables']['whatsapp_messages']['Row']
          
          const updates: any = {
            status: statusType,
          }

          if (statusType === 'delivered' && status.timestamp) {
            updates.delivered_at = new Date(status.timestamp * 1000).toISOString()
          }

          if (statusType === 'read' && status.timestamp) {
            updates.read_at = new Date(status.timestamp * 1000).toISOString()
          }

          if (statusType === 'failed') {
            updates.error_message = status.errors?.[0]?.message || 'Unknown error'
          }

          // Update message
          // Type assertion to fix TypeScript inference issue
          await (supabase
            .from('whatsapp_messages') as any)
            .update(updates as Database['public']['Tables']['whatsapp_messages']['Update'])
            .eq('id', messageData.id)

          // Update guest message status
          if (messageData.guest_id) {
            // Type assertion to fix TypeScript inference issue
            await (supabase
              .from('guests') as any)
              .update({ message_status: statusType } as Database['public']['Tables']['guests']['Update'])
              .eq('id', messageData.guest_id)
          }
        }
      }
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Webhook error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

