'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import TableCanvas from './TableCanvas'
import TableEditor from './TableEditor'
import { he } from '@/lib/i18n/he'
import type { Database } from '@/types/database.types'

type Table = Database['public']['Tables']['tables']['Row']
type Guest = Database['public']['Tables']['guests']['Row']
type Assignment = Database['public']['Tables']['table_assignments']['Row']

interface SeatingEditorProps {
  eventId: string
}

export default function SeatingEditor({ eventId }: SeatingEditorProps) {
  const [tables, setTables] = useState<Table[]>([])
  const [guests, setGuests] = useState<Guest[]>([])
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [selectedTable, setSelectedTable] = useState<Table | null>(null)
  const supabase = createClient()

  useEffect(() => {
    fetchData()

    // Subscribe to real-time updates
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
    await Promise.all([fetchTables(), fetchGuests(), fetchAssignments()])
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

  const fetchGuests = async () => {
    const { data } = await supabase
      .from('guests')
      .select('*')
      .eq('event_id', eventId)
      .order('full_name')

    if (data) {
      setGuests(data)
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

  const handleCreateTable = async (tableData: Omit<Database['public']['Tables']['tables']['Insert'], 'id' | 'event_id' | 'created_at' | 'updated_at'>) => {
    // Type assertion to fix TypeScript inference issue
    const insertData: Database['public']['Tables']['tables']['Insert'] = {
      ...tableData,
      event_id: eventId,
    }
    const { error } = await (supabase
      .from('tables') as any)
      .insert(insertData)

    if (error) {
      console.error('Error creating table:', error)
      return false
    }
    return true
  }

  const handleUpdateTable = async (id: string, updates: Partial<Table>) => {
    // Type assertion to fix TypeScript inference issue
    const { error } = await (supabase
      .from('tables') as any)
      .update(updates as Database['public']['Tables']['tables']['Update'])
      .eq('id', id)

    if (error) {
      console.error('Error updating table:', error)
      return false
    }
    return true
  }

  const handleDeleteTable = async (id: string) => {
    if (!confirm('האם אתה בטוח שברצונך למחוק את השולחן הזה?')) {
      return false
    }

    const { error } = await supabase
      .from('tables')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting table:', error)
      return false
    }
    return true
  }

  const handleAssignGuest = async (guestId: string, tableId: string) => {
    // Remove existing assignment for this guest
    await supabase
      .from('table_assignments')
      .delete()
      .eq('guest_id', guestId)

    // Create new assignment
    // Type assertion to fix TypeScript inference issue
    const { error } = await (supabase
      .from('table_assignments') as any)
      .insert({
        event_id: eventId,
        guest_id: guestId,
        table_id: tableId,
      } as Database['public']['Tables']['table_assignments']['Insert'])

    if (error) {
      console.error('Error assigning guest:', error)
      return false
    }
    return true
  }

  const handleUnassignGuest = async (guestId: string) => {
    const { error } = await supabase
      .from('table_assignments')
      .delete()
      .eq('guest_id', guestId)

    if (error) {
      console.error('Error unassigning guest:', error)
      return false
    }
    return true
  }

  const getTableGuests = (tableId: string) => {
    return guests.filter(g => 
      assignments.some(a => a.guest_id === g.id && a.table_id === tableId)
    )
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900">{he.seating.title}</h1>
        <button
          onClick={() => setSelectedTable(null)}
          className="bg-primary-600 text-white px-4 py-2 rounded-md hover:bg-primary-700"
        >
          {he.seating.createTable}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <TableCanvas
            tables={tables}
            guests={guests}
            assignments={assignments}
            onAssignGuest={handleAssignGuest}
            onUnassignGuest={handleUnassignGuest}
            getTableGuests={getTableGuests}
            onTableSelect={setSelectedTable}
          />
        </div>

        <div>
          {selectedTable ? (
            <TableEditor
              table={selectedTable}
              guests={guests}
              assignments={assignments}
              onUpdate={handleUpdateTable}
              onDelete={handleDeleteTable}
              onAssignGuest={handleAssignGuest}
              onUnassignGuest={handleUnassignGuest}
              getTableGuests={getTableGuests}
            />
          ) : (
            <TableEditor
              eventId={eventId}
              guests={guests}
              assignments={assignments}
              onCreate={handleCreateTable}
            />
          )}
        </div>
      </div>
    </div>
  )
}

