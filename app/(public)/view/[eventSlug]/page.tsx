import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import PublicViewClient from '@/components/public/PublicViewClient'

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

  return <PublicViewClient eventId={event.id} eventName={event.name} />
}

