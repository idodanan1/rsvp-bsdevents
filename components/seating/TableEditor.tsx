'use client'

import { useState } from 'react'
import { he } from '@/lib/i18n/he'
import type { Database } from '@/types/database.types'

type Table = Database['public']['Tables']['tables']['Row']
type Guest = Database['public']['Tables']['guests']['Row']
type Assignment = Database['public']['Tables']['table_assignments']['Row']

interface TableEditorProps {
  eventId?: string
  table?: Table
  guests: Guest[]
  assignments: Assignment[]
  onCreate?: (data: Omit<Table, 'id' | 'event_id' | 'created_at' | 'updated_at'>) => Promise<boolean>
  onUpdate?: (id: string, updates: Partial<Table>) => Promise<boolean>
  onDelete?: (id: string) => Promise<boolean>
  onAssignGuest?: (guestId: string, tableId: string) => Promise<boolean>
  onUnassignGuest?: (guestId: string) => Promise<boolean>
  getTableGuests?: (tableId: string) => Guest[]
}

export default function TableEditor({
  eventId,
  table,
  guests,
  assignments,
  onCreate,
  onUpdate,
  onDelete,
  onAssignGuest,
  onUnassignGuest,
  getTableGuests,
}: TableEditorProps) {
  const [formData, setFormData] = useState({
    name: table?.name || '',
    table_number: table?.table_number || 1,
    capacity: table?.capacity || 1,
  })
  const [loading, setLoading] = useState(false)

  const isEditing = !!table
  const tableGuests = table && getTableGuests ? getTableGuests(table.id) : []
  const unassignedGuests = guests.filter(
    g => !assignments.some(a => a.guest_id === g.id)
  )

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!eventId && !table) return

    setLoading(true)
    let success = false

    if (isEditing && onUpdate && table) {
      success = await onUpdate(table.id, formData)
    } else if (onCreate && eventId) {
      success = await onCreate({
        ...formData,
        position_x: null,
        position_y: null,
      })
    }

    if (success && !isEditing) {
      setFormData({ name: '', table_number: 1, capacity: 1 })
    }
    setLoading(false)
  }

  const handleAssign = async (guestId: string) => {
    if (table && onAssignGuest) {
      await onAssignGuest(guestId, table.id)
    }
  }

  const handleUnassign = async (guestId: string) => {
    if (onUnassignGuest) {
      await onUnassignGuest(guestId)
    }
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-xl font-semibold mb-4">
        {isEditing ? he.common.edit : he.seating.createTable}
      </h2>

      {!isEditing && (
        <form onSubmit={handleSubmit} className="space-y-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {he.seating.tableName} *
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {he.seating.tableNumber} *
            </label>
            <input
              type="number"
              required
              min="1"
              value={formData.table_number}
              onChange={(e) => setFormData({ ...formData, table_number: parseInt(e.target.value) || 1 })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {he.seating.capacity} *
            </label>
            <input
              type="number"
              required
              min="1"
              value={formData.capacity}
              onChange={(e) => setFormData({ ...formData, capacity: parseInt(e.target.value) || 1 })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary-600 text-white px-4 py-2 rounded-md hover:bg-primary-700 disabled:opacity-50"
          >
            {loading ? he.common.loading : he.common.save}
          </button>
        </form>
      )}

      {isEditing && (
        <div className="space-y-4">
          <div>
            <h3 className="font-medium mb-2">{he.seating.tableName}: {table.name}</h3>
            <p className="text-sm text-gray-600">
              {he.seating.tableNumber}: {table.table_number}
            </p>
            <p className="text-sm text-gray-600">
              {he.seating.capacity}: {table.capacity}
            </p>
          </div>

          <div>
            <h3 className="font-medium mb-2">אורחים בשולחן ({tableGuests.length})</h3>
            <div className="space-y-2">
              {tableGuests.map((guest) => (
                <div
                  key={guest.id}
                  className="flex justify-between items-center p-2 bg-gray-50 rounded"
                >
                  <span>{guest.full_name}</span>
                  <button
                    onClick={() => handleUnassign(guest.id)}
                    className="text-red-600 hover:text-red-800 text-sm"
                  >
                    הסר
                  </button>
                </div>
              ))}
            </div>
          </div>

          {unassignedGuests.length > 0 && (
            <div>
              <h3 className="font-medium mb-2">הוסף אורח</h3>
              <select
                onChange={(e) => {
                  if (e.target.value) {
                    handleAssign(e.target.value)
                    e.target.value = ''
                  }
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              >
                <option value="">בחר אורח...</option>
                {unassignedGuests.map((guest) => (
                  <option key={guest.id} value={guest.id}>
                    {guest.full_name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {onDelete && (
            <button
              onClick={() => table && onDelete(table.id)}
              className="w-full bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700"
            >
              {he.common.delete}
            </button>
          )}
        </div>
      )}
    </div>
  )
}

