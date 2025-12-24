'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { he } from '@/lib/i18n/he'

interface StatsDashboardProps {
  eventId: string
}

export default function StatsDashboard({ eventId }: StatsDashboardProps) {
  const [stats, setStats] = useState({
    total: 0,
    confirmed: 0,
    pending: 0,
    maybe: 0,
    declined: 0,
    arrived: 0,
  })
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  const fetchStats = async () => {
    const { count: total } = await supabase
      .from('guests')
      .select('*', { count: 'exact', head: true })
      .eq('event_id', eventId)

    const { count: confirmed } = await supabase
      .from('guests')
      .select('*', { count: 'exact', head: true })
      .eq('event_id', eventId)
      .eq('rsvp_status', 'confirmed')

    const { count: pending } = await supabase
      .from('guests')
      .select('*', { count: 'exact', head: true })
      .eq('event_id', eventId)
      .eq('rsvp_status', 'pending')

    const { count: maybe } = await supabase
      .from('guests')
      .select('*', { count: 'exact', head: true })
      .eq('event_id', eventId)
      .eq('rsvp_status', 'maybe')

    const { count: declined } = await supabase
      .from('guests')
      .select('*', { count: 'exact', head: true })
      .eq('event_id', eventId)
      .eq('rsvp_status', 'declined')

    const { count: arrived } = await supabase
      .from('guests')
      .select('*', { count: 'exact', head: true })
      .eq('event_id', eventId)
      .eq('check_in_status', 'arrived')

    setStats({
      total: total || 0,
      confirmed: confirmed || 0,
      pending: pending || 0,
      maybe: maybe || 0,
      declined: declined || 0,
      arrived: arrived || 0,
    })
    setLoading(false)
  }

  useEffect(() => {
    fetchStats()

    // Subscribe to real-time updates
    const channel = supabase
      .channel(`stats:${eventId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'guests',
          filter: `event_id=eq.${eventId}`,
        },
        () => {
          fetchStats()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [eventId])

  if (loading) {
    return <div className="text-center py-12">{he.common.loading}</div>
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-sm font-medium text-gray-500 mb-1">
          {he.publicView.totalGuests}
        </h3>
        <p className="text-3xl font-bold text-gray-900">{stats.total}</p>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-sm font-medium text-gray-500 mb-1">
          {he.publicView.confirmed}
        </h3>
        <p className="text-3xl font-bold text-green-600">{stats.confirmed}</p>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-sm font-medium text-gray-500 mb-1">
          {he.publicView.pending}
        </h3>
        <p className="text-3xl font-bold text-yellow-600">{stats.pending}</p>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-sm font-medium text-gray-500 mb-1">
          {he.guests.rsvpStatuses.maybe}
        </h3>
        <p className="text-3xl font-bold text-blue-600">{stats.maybe}</p>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-sm font-medium text-gray-500 mb-1">
          {he.guests.rsvpStatuses.declined}
        </h3>
        <p className="text-3xl font-bold text-red-600">{stats.declined}</p>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-sm font-medium text-gray-500 mb-1">
          {he.publicView.arrived}
        </h3>
        <p className="text-3xl font-bold text-green-700">{stats.arrived}</p>
      </div>
    </div>
  )
}

