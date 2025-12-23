import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export function useRealtimeCheckins(eventId: string) {
  const [checkInCount, setCheckInCount] = useState(0)
  const [totalGuests, setTotalGuests] = useState(0)
  const supabase = createClient()

  useEffect(() => {
    const fetchStats = async () => {
      const { count: arrived } = await supabase
        .from('guests')
        .select('*', { count: 'exact', head: true })
        .eq('event_id', eventId)
        .eq('check_in_status', 'arrived')

      const { count: total } = await supabase
        .from('guests')
        .select('*', { count: 'exact', head: true })
        .eq('event_id', eventId)

      setCheckInCount(arrived || 0)
      setTotalGuests(total || 0)
    }

    fetchStats()

    const channel = supabase
      .channel(`checkins:${eventId}`)
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

  return { checkInCount, totalGuests, percentage: totalGuests > 0 ? Math.round((checkInCount / totalGuests) * 100) : 0 }
}

