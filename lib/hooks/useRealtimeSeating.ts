import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Database } from '@/types/database.types'

type Table = Database['public']['Tables']['tables']['Row']
type Assignment = Database['public']['Tables']['table_assignments']['Row']

export function useRealtimeSeating(eventId: string) {
  const [tables, setTables] = useState<Table[]>([])
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const supabase = createClient()

  useEffect(() => {
    const fetchData = async () => {
      const [tablesRes, assignmentsRes] = await Promise.all([
        supabase
          .from('tables')
          .select('*')
          .eq('event_id', eventId)
          .order('table_number'),
        supabase
          .from('table_assignments')
          .select('*')
          .eq('event_id', eventId),
      ])

      if (tablesRes.data) {
        setTables(tablesRes.data)
      }
      if (assignmentsRes.data) {
        setAssignments(assignmentsRes.data)
      }
    }

    fetchData()

    const channel = supabase
      .channel(`seating:${eventId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tables',
          filter: `event_id=eq.${eventId}`,
        },
        () => {
          fetchData()
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
          fetchData()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [eventId])

  return { tables, assignments }
}

