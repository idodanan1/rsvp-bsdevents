import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { he } from '@/lib/i18n/he'

export default async function DashboardPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: events, error } = await supabase
    .from('events')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900">{he.events.title}</h1>
        <Link
          href="/dashboard/events/new"
          className="bg-primary-600 text-white px-4 py-2 rounded-md hover:bg-primary-700"
        >
          {he.events.createEvent}
        </Link>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
          {error.message}
        </div>
      )}

      {events && events.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500 mb-4">{he.events.noEvents}</p>
          <Link
            href="/dashboard/events/new"
            className="text-primary-600 hover:text-primary-700"
          >
            {he.events.createEvent}
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {events?.map((event) => (
            <Link
              key={event.id}
              href={`/dashboard/events/${event.id}`}
              className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow"
            >
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                {event.name}
              </h3>
              {event.event_date && (
                <p className="text-gray-600 mb-2">
                  {new Date(event.event_date).toLocaleDateString('he-IL')}
                </p>
              )}
              {event.location && (
                <p className="text-gray-600 mb-4">{event.location}</p>
              )}
              <div className="flex gap-2">
                <span className="text-sm text-primary-600 hover:text-primary-700">
                  {he.events.manage}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

