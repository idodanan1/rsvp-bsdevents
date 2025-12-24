import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Database } from '@/types/database.types'

type Guest = Database['public']['Tables']['guests']['Row']

export function useRealtimeGuests(eventId: string) {
  const [guests, setGuests] = useState<Guest[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    const fetchGuests = async () => {
      const { data } = await supabase
        .from('guests')
        .select('*')
        .eq('event_id', eventId)
        .order('updated_at', { ascending: false })

      if (data) {
        setGuests(data)
      }
      setLoading(false)
    }

    fetchGuests()

    const channel = supabase
      .channel(`guests:${eventId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'guests',
          filter: `event_id=eq.${eventId}`,
        },
        () => {
          fetchGuests()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [eventId])

  return { guests, loading }
}

