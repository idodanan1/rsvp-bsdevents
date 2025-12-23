'use client'

import { useState } from 'react'
import { he } from '@/lib/i18n/he'
import CapacityCounter from './CapacityCounter'
import GuestDragDrop from './GuestDragDrop'
import type { Database } from '@/types/database.types'

type Table = Database['public']['Tables']['tables']['Row']
type Guest = Database['public']['Tables']['guests']['Row']
type Assignment = Database['public']['Tables']['table_assignments']['Row']

interface TableCanvasProps {
  tables: Table[]
  guests: Guest[]
  assignments: Assignment[]
  onAssignGuest: (guestId: string, tableId: string) => Promise<boolean>
  onUnassignGuest: (guestId: string) => Promise<boolean>
  getTableGuests: (tableId: string) => Guest[]
  onTableSelect: (table: Table | null) => void
}

export default function TableCanvas({
  tables,
  guests,
  assignments,
  onAssignGuest,
  onUnassignGuest,
  getTableGuests,
  onTableSelect,
}: TableCanvasProps) {
  const [draggedGuest, setDraggedGuest] = useState<Guest | null>(null)
  const [dragOverTable, setDragOverTable] = useState<string | null>(null)

  const handleDragStart = (guest: Guest) => {
    setDraggedGuest(guest)
  }

  const handleDragOver = (e: React.DragEvent, tableId: string) => {
    e.preventDefault()
    setDragOverTable(tableId)
  }

  const handleDrop = async (e: React.DragEvent, tableId: string) => {
    e.preventDefault()
    if (draggedGuest) {
      await onAssignGuest(draggedGuest.id, tableId)
      setDraggedGuest(null)
      setDragOverTable(null)
    }
  }

  const handleDragEnd = () => {
    setDraggedGuest(null)
    setDragOverTable(null)
  }

  const unassignedGuests = guests.filter(
    g => !assignments.some(a => a.guest_id === g.id)
  )

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-xl font-semibold mb-4">תרשים הושבה</h2>
      
      {/* Unassigned Guests */}
      <div className="mb-6">
        <h3 className="text-sm font-medium text-gray-700 mb-2">אורחים ללא שולחן</h3>
        <div className="flex flex-wrap gap-2">
          {unassignedGuests.map((guest) => (
            <GuestDragDrop
              key={guest.id}
              guest={guest}
              onDrop={onAssignGuest}
            />
          ))}
        </div>
      </div>

      {/* Tables Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {tables.map((table) => {
          const tableGuests = getTableGuests(table.id)
          const isFull = tableGuests.length >= table.capacity
          const isDragOver = dragOverTable === table.id

          return (
            <div
              key={table.id}
              onClick={() => onTableSelect(table)}
              onDragOver={(e) => handleDragOver(e, table.id)}
              onDrop={(e) => handleDrop(e, table.id)}
              className={`p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                isDragOver
                  ? 'border-primary-500 bg-primary-50'
                  : isFull
                  ? 'border-red-300 bg-red-50'
                  : 'border-gray-300 hover:border-primary-300'
              }`}
            >
              <div className="font-semibold mb-2">
                {table.name} (#{table.table_number})
              </div>
              <CapacityCounter
                current={tableGuests.length}
                capacity={table.capacity}
                className="mb-2"
              />
              <div className="space-y-1">
                {tableGuests.map((guest) => (
                  <div
                    key={guest.id}
                    className="text-xs bg-white px-2 py-1 rounded"
                  >
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

