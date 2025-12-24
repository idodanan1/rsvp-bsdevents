import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import EventForm from '@/components/events/EventForm'

export default async function NewEventPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // TEMPORARILY DISABLED: if (!user) { redirect('/login') }

  // Use a default user ID or get from first user
  const userId = user?.id || '00000000-0000-0000-0000-000000000000'
  return <EventForm userId={userId} />
}

