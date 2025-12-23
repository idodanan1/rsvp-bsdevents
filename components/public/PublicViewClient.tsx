'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import StatsDashboard from './StatsDashboard'
import SeatingChartView from './SeatingChartView'
import CheckInProgress from './CheckInProgress'
import { he } from '@/lib/i18n/he'

interface PublicViewClientProps {
  eventId: string
  eventName: string
}

export default function PublicViewClient({ eventId, eventName }: PublicViewClientProps) {
  const [activeTab, setActiveTab] = useState<'stats' | 'seating' | 'checkin'>('stats')
  const supabase = createClient()

  useEffect(() => {
    // Subscribe to real-time updates
    const channel = supabase
      .channel(`public:${eventId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'guests',
          filter: `event_id=eq.${eventId}`,
        },
        () => {
          // Trigger re-render by updating state
          setActiveTab(prev => prev)
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'check_ins',
          filter: `event_id=eq.${eventId}`,
        },
        () => {
          setActiveTab(prev => prev)
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [eventId, supabase])

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">{eventName}</h1>
        <p className="text-gray-600 mb-8">{he.publicView.title}</p>

        {/* Tabs */}
        <div className="border-b border-gray-200 mb-6">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('stats')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'stats'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {he.publicView.stats}
            </button>
            <button
              onClick={() => setActiveTab('seating')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'seating'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {he.publicView.seatingChart}
            </button>
            <button
              onClick={() => setActiveTab('checkin')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'checkin'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {he.publicView.checkInProgress}
            </button>
          </nav>
        </div>

        {/* Tab Content */}
        {activeTab === 'stats' && <StatsDashboard eventId={eventId} />}
        {activeTab === 'seating' && <SeatingChartView eventId={eventId} />}
        {activeTab === 'checkin' && <CheckInProgress eventId={eventId} />}
      </div>
    </div>
  )
}

