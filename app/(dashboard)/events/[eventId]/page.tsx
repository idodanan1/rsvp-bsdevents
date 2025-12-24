import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { he } from '@/lib/i18n/he'

export default async function EventPage({
  params,
}: {
  params: Promise<{ eventId: string }>
}) {
  const { eventId } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // TEMPORARILY DISABLED: if (!user) { redirect('/login') }

  const { data: event, error } = await supabase
    .from('events')
    .select('*')
    .eq('id', eventId)
    .single()

  if (error || !event) {
    redirect('/dashboard')
  }

  // Get stats
  const { count: guestsCount } = await supabase
    .from('guests')
    .select('*', { count: 'exact', head: true })
    .eq('event_id', eventId)

  const { count: confirmedCount } = await supabase
    .from('guests')
    .select('*', { count: 'exact', head: true })
    .eq('event_id', eventId)
    .eq('rsvp_status', 'confirmed')

  const { count: arrivedCount } = await supabase
    .from('guests')
    .select('*', { count: 'exact', head: true })
    .eq('event_id', eventId)
    .eq('check_in_status', 'arrived')

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">{event.name}</h1>
        {event.event_date && (
          <p className="text-gray-600">
            {new Date(event.event_date).toLocaleDateString('he-IL', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </p>
        )}
        {event.location && <p className="text-gray-600">{event.location}</p>}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-sm font-medium text-gray-500 mb-1">
            {he.publicView.totalGuests}
          </h3>
          <p className="text-2xl font-bold text-gray-900">{guestsCount || 0}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-sm font-medium text-gray-500 mb-1">
            {he.publicView.confirmed}
          </h3>
          <p className="text-2xl font-bold text-gray-900">{confirmedCount || 0}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-sm font-medium text-gray-500 mb-1">
            {he.publicView.arrived}
          </h3>
          <p className="text-2xl font-bold text-gray-900">{arrivedCount || 0}</p>
        </div>
      </div>

      {/* Navigation */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Link
          href={`/dashboard/events/${eventId}/guests`}
          className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow"
        >
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            {he.guests.title}
          </h3>
          <p className="text-gray-600">נהל אורחים, RSVP, וייבוא/ייצוא</p>
        </Link>

        <Link
          href={`/dashboard/events/${eventId}/seating`}
          className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow"
        >
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            {he.seating.title}
          </h3>
          <p className="text-gray-600">צור שולחנות והקצה אורחים</p>
        </Link>

        <Link
          href={`/dashboard/events/${eventId}/whatsapp`}
          className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow"
        >
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            {he.whatsapp.title}
          </h3>
          <p className="text-gray-600">שלח הודעות וקמפיינים</p>
        </Link>
      </div>
    </div>
  )
}

