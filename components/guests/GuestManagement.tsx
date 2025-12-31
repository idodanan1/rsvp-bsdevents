'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import GuestTable from './GuestTable'
import GuestFilters from './GuestFilters'
import ImportExport from './ImportExport'
import AddGuestForm from './AddGuestForm'
import { he } from '@/lib/i18n/he'
import type { Database } from '@/types/database.types'

type Guest = Database['public']['Tables']['guests']['Row']

interface GuestManagementProps {
  eventId: string
}

export default function GuestManagement({ eventId }: GuestManagementProps) {
  const [guests, setGuests] = useState<Guest[]>([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({
    rsvpStatus: 'all' as 'all' | 'pending' | 'confirmed' | 'maybe' | 'declined',
    messageStatus: 'all' as 'all' | 'not_sent' | 'sent' | 'delivered' | 'read' | 'failed',
    checkInStatus: 'all' as 'all' | 'not_arrived' | 'arrived',
    sortBy: 'updated_at' as 'updated_at' | 'created_at' | 'full_name',
  })
  const [showAddForm, setShowAddForm] = useState(false)
  const supabase = createClient()

  const fetchGuests = async () => {
    setLoading(true)
    let query = supabase
      .from('guests')
      .select('*')
      .eq('event_id', eventId)

    // Apply filters
    if (filters.rsvpStatus !== 'all') {
      query = query.eq('rsvp_status', filters.rsvpStatus)
    }
    if (filters.messageStatus !== 'all') {
      query = query.eq('message_status', filters.messageStatus)
    }
    if (filters.checkInStatus !== 'all') {
      query = query.eq('check_in_status', filters.checkInStatus)
    }

    // Apply sorting
    query = query.order(filters.sortBy, { ascending: false })

    const { data, error } = await query

    if (error) {
      console.error('Error fetching guests:', error)
    } else {
      setGuests(data || [])
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchGuests()

    // Subscribe to real-time updates
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
  }, [eventId, filters])

  const handleAddGuest = async (guestData: Omit<Guest, 'id' | 'event_id' | 'created_at' | 'updated_at'>) => {
    const { error } = await supabase
      .from('guests')
      .insert({
        ...guestData,
        event_id: eventId,
      })

    if (error) {
      console.error('Error adding guest:', error)
      return false
    }
    setShowAddForm(false)
    return true
  }

  const handleUpdateGuest = async (id: string, updates: Partial<Guest>) => {
    const { error } = await supabase
      .from('guests')
      .update(updates)
      .eq('id', id)

    if (error) {
      console.error('Error updating guest:', error)
      return false
    }
    return true
  }

  const handleDeleteGuest = async (id: string) => {
    if (!confirm('האם אתה בטוח שברצונך למחוק את האורח הזה?')) {
      return false
    }

    const { error } = await supabase
      .from('guests')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting guest:', error)
      return false
    }
    return true
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900">{he.guests.title}</h1>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="bg-primary-600 text-white px-4 py-2 rounded-md hover:bg-primary-700"
        >
          {he.guests.addGuest}
        </button>
      </div>

      {showAddForm && (
        <div className="mb-6">
          <AddGuestForm
            onSubmit={handleAddGuest}
            onCancel={() => setShowAddForm(false)}
          />
        </div>
      )}

      <div className="mb-6">
        <GuestFilters filters={filters} onFiltersChange={setFilters} />
      </div>

      <div className="mb-4">
        <ImportExport eventId={eventId} onImportComplete={fetchGuests} />
      </div>

      {loading ? (
        <div className="text-center py-12">
          <p className="text-gray-500">{he.common.loading}</p>
        </div>
      ) : (
        <GuestTable
          guests={guests}
          onUpdate={handleUpdateGuest}
          onDelete={handleDeleteGuest}
        />
      )}
    </div>
  )
}

