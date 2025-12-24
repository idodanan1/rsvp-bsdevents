import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import SeatingEditor from '@/components/seating/SeatingEditor'

export default async function SeatingPage({
  params,
}: {
  params: Promise<{ eventId: string }>
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // TEMPORARILY DISABLED: if (!user) { redirect('/login') }

  const { eventId } = await params

  // Verify event ownership (temporarily disabled)
  const { data: event } = await supabase
    .from('events')
    .select('id')
    .eq('id', eventId)
    .single()

  if (!event) {
    redirect('/dashboard')
  }

  return <SeatingEditor eventId={eventId} />
}

