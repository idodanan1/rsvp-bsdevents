'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { he } from '@/lib/i18n/he'

interface CheckInProgressProps {
  eventId: string
}

export default function CheckInProgress({ eventId }: CheckInProgressProps) {
  const [stats, setStats] = useState({
    total: 0,
    arrived: 0,
    percentage: 0,
  })
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  const fetchStats = async () => {
    const { count: total } = await supabase
      .from('guests')
      .select('*', { count: 'exact', head: true })
      .eq('event_id', eventId)

    const { count: arrived } = await supabase
      .from('guests')
      .select('*', { count: 'exact', head: true })
      .eq('event_id', eventId)
      .eq('check_in_status', 'arrived')

    const percentage = total && total > 0 ? Math.round((arrived || 0) / total * 100) : 0

    setStats({
      total: total || 0,
      arrived: arrived || 0,
      percentage,
    })
    setLoading(false)
  }

  useEffect(() => {
    fetchStats()

    // Subscribe to real-time updates
    const channel = supabase
      .channel(`checkin:${eventId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'check_ins',
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
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-xl font-semibold mb-4">{he.publicView.checkInProgress}</h2>
      
      <div className="mb-6">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium text-gray-700">
            {he.publicView.arrived}: {stats.arrived} {he.publicView.of} {stats.total}
          </span>
          <span className="text-sm font-medium text-gray-700">
            {stats.percentage}%
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-4">
          <div
            className="bg-primary-600 h-4 rounded-full transition-all duration-300"
            style={{ width: `${stats.percentage}%` }}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="text-center p-4 bg-gray-50 rounded">
          <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
          <p className="text-sm text-gray-600">{he.publicView.totalGuests}</p>
        </div>
        <div className="text-center p-4 bg-green-50 rounded">
          <p className="text-2xl font-bold text-green-600">{stats.arrived}</p>
          <p className="text-sm text-gray-600">{he.publicView.arrived}</p>
        </div>
      </div>
    </div>
  )
}

