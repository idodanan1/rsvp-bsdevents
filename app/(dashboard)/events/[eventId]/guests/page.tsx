import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import GuestManagement from '@/components/guests/GuestManagement'

export default async function GuestsPage({
  params,
}: {
  params: Promise<{ eventId: string }>
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { eventId } = await params

  // Verify event ownership
  const { data: event } = await supabase
    .from('events')
    .select('id')
    .eq('id', eventId)
    .eq('user_id', user.id)
    .single()

  if (!event) {
    redirect('/dashboard')
  }

  return <GuestManagement eventId={eventId} />
}

