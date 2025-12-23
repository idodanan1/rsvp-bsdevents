'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Database } from '@/types/database.types'

type Table = Database['public']['Tables']['tables']['Row']
type Assignment = Database['public']['Tables']['table_assignments']['Row']
type Guest = Database['public']['Tables']['guests']['Row']

interface SeatingChartViewProps {
  eventId: string
}

export default function SeatingChartView({ eventId }: SeatingChartViewProps) {
  const [tables, setTables] = useState<Table[]>([])
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [guests, setGuests] = useState<Guest[]>([])
  const supabase = createClient()

  useEffect(() => {
    fetchData()

    // Subscribe to real-time updates
    const channel = supabase
      .channel(`seating-view:${eventId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tables',
          filter: `event_id=eq.${eventId}`,
        },
        () => {
          fetchTables()
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'table_assignments',
          filter: `event_id=eq.${eventId}`,
        },
        () => {
          fetchAssignments()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [eventId])

  const fetchData = async () => {
    await Promise.all([fetchTables(), fetchAssignments(), fetchGuests()])
  }

  const fetchTables = async () => {
    const { data } = await supabase
      .from('tables')
      .select('*')
      .eq('event_id', eventId)
      .order('table_number')

    if (data) {
      setTables(data)
    }
  }

  const fetchAssignments = async () => {
    const { data } = await supabase
      .from('table_assignments')
      .select('*')
      .eq('event_id', eventId)

    if (data) {
      setAssignments(data)
    }
  }

  const fetchGuests = async () => {
    const { data } = await supabase
      .from('guests')
      .select('*')
      .eq('event_id', eventId)

    if (data) {
      setGuests(data)
    }
  }

  const getTableGuests = (tableId: string) => {
    return guests.filter(g =>
      assignments.some(a => a.guest_id === g.id && a.table_id === tableId)
    )
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-xl font-semibold mb-4">תרשים הושבה</h2>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {tables.map((table) => {
          const tableGuests = getTableGuests(table.id)
          return (
            <div
              key={table.id}
              className="p-4 border-2 border-gray-300 rounded-lg"
            >
              <div className="font-semibold mb-2">
                {table.name} (#{table.table_number})
              </div>
              <div className="text-sm text-gray-600 mb-2">
                {tableGuests.length} / {table.capacity}
              </div>
              <div className="space-y-1">
                {tableGuests.map((guest) => (
                  <div key={guest.id} className="text-xs bg-gray-50 px-2 py-1 rounded">
                    {guest.full_name}
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

