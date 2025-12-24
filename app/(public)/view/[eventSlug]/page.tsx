import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import PublicViewClient from '@/components/public/PublicViewClient'
import type { Database } from '@/types/database.types'

export default async function PublicViewPage({
  params,
}: {
  params: Promise<{ eventSlug: string }>
}) {
  const supabase = await createClient()
  const { eventSlug } = await params

  // Get event by slug
  const { data: event, error } = await supabase
    .from('events')
    .select('*')
    .eq('slug', eventSlug)
    .eq('public_view_enabled', true)
    .single()

  if (error || !event) {
    notFound()
  }

  // Type assertion to fix TypeScript inference issue
  const eventData = event as Database['public']['Tables']['events']['Row']

  return <PublicViewClient eventId={eventData.id} eventName={eventData.name} />
}

