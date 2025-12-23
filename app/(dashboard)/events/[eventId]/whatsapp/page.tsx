import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import WhatsAppDashboard from '@/components/whatsapp/WhatsAppDashboard'

export default async function WhatsAppPage({
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

  return <WhatsAppDashboard eventId={eventId} userId={user.id} />
}

