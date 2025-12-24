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

  const userId = user?.id || '00000000-0000-0000-0000-000000000000'
  return <WhatsAppDashboard eventId={eventId} userId={userId} />
}

