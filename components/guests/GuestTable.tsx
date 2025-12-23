'use client'

import { useState } from 'react'
import { he } from '@/lib/i18n/he'
import type { Database } from '@/types/database.types'

type Guest = Database['public']['Tables']['guests']['Row']

interface GuestTableProps {
  guests: Guest[]
  onUpdate: (id: string, updates: Partial<Guest>) => Promise<boolean>
  onDelete: (id: string) => Promise<boolean>
}

export default function GuestTable({ guests, onUpdate, onDelete }: GuestTableProps) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editData, setEditData] = useState<Partial<Guest>>({})

  const handleEdit = (guest: Guest) => {
    setEditingId(guest.id)
    setEditData({
      full_name: guest.full_name,
      phone: guest.phone,
      guest_count: guest.guest_count,
      group_category: guest.group_category,
      rsvp_status: guest.rsvp_status,
      notes: guest.notes,
    })
  }

  const handleSave = async (id: string) => {
    const success = await onUpdate(id, editData)
    if (success) {
      setEditingId(null)
      setEditData({})
    }
  }

  const getStatusBadge = (status: string, type: 'rsvp' | 'message' | 'checkin') => {
    const colors = {
      rsvp: {
        pending: 'bg-yellow-100 text-yellow-800',
        confirmed: 'bg-green-100 text-green-800',
        maybe: 'bg-blue-100 text-blue-800',
        declined: 'bg-red-100 text-red-800',
      },
      message: {
        not_sent: 'bg-gray-100 text-gray-800',
        sent: 'bg-blue-100 text-blue-800',
        delivered: 'bg-green-100 text-green-800',
        read: 'bg-green-200 text-green-900',
        failed: 'bg-red-100 text-red-800',
      },
      checkin: {
        not_arrived: 'bg-gray-100 text-gray-800',
        arrived: 'bg-green-100 text-green-800',
      },
    }

    const statusLabels = {
      rsvp: he.guests.rsvpStatuses,
      message: he.guests.messageStatuses,
      checkin: he.guests.checkInStatuses,
    }

    const colorClass = colors[type][status as keyof typeof colors[typeof type]] || 'bg-gray-100 text-gray-800'
    const label = statusLabels[type][status as keyof typeof statusLabels[typeof type]] || status

    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${colorClass}`}>
        {label}
      </span>
    )
  }

  if (guests.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-12 text-center">
        <p className="text-gray-500">אין אורחים להצגה</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                {he.guests.fullName}
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                {he.guests.phone}
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                {he.guests.guestCount}
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                {he.guests.rsvpStatus}
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                {he.guests.messageStatus}
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                {he.guests.checkInStatus}
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                {he.guests.lastUpdated}
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                פעולות
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {guests.map((guest) => (
              <tr key={guest.id}>
                {editingId === guest.id ? (
                  <>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <input
                        type="text"
                        value={editData.full_name || ''}
                        onChange={(e) => setEditData({ ...editData, full_name: e.target.value })}
                        className="w-full px-2 py-1 border border-gray-300 rounded"
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <input
                        type="text"
                        value={editData.phone || ''}
                        onChange={(e) => setEditData({ ...editData, phone: e.target.value })}
                        className="w-full px-2 py-1 border border-gray-300 rounded"
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <input
                        type="number"
                        value={editData.guest_count || 1}
                        onChange={(e) => setEditData({ ...editData, guest_count: parseInt(e.target.value) })}
                        className="w-full px-2 py-1 border border-gray-300 rounded"
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <select
                        value={editData.rsvp_status || 'pending'}
                        onChange={(e) => setEditData({ ...editData, rsvp_status: e.target.value as any })}
                        className="w-full px-2 py-1 border border-gray-300 rounded"
                      >
                        <option value="pending">{he.guests.rsvpStatuses.pending}</option>
                        <option value="confirmed">{he.guests.rsvpStatuses.confirmed}</option>
                        <option value="maybe">{he.guests.rsvpStatuses.maybe}</option>
                        <option value="declined">{he.guests.rsvpStatuses.declined}</option>
                      </select>
                    </td>
                    <td colSpan={4} className="px-6 py-4 whitespace-nowrap">
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleSave(guest.id)}
                          className="text-green-600 hover:text-green-900"
                        >
                          {he.common.save}
                        </button>
                        <button
                          onClick={() => setEditingId(null)}
                          className="text-gray-600 hover:text-gray-900"
                        >
                          {he.common.cancel}
                        </button>
                      </div>
                    </td>
                  </>
                ) : (
                  <>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {guest.full_name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {guest.phone || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {guest.guest_count}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(guest.rsvp_status, 'rsvp')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(guest.message_status, 'message')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(guest.check_in_status, 'checkin')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(guest.updated_at).toLocaleString('he-IL')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() => handleEdit(guest)}
                        className="text-primary-600 hover:text-primary-900 mr-4"
                      >
                        {he.common.edit}
                      </button>
                      <button
                        onClick={() => onDelete(guest.id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        {he.common.delete}
                      </button>
                    </td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

