'use client'

import { useState } from 'react'
import { he } from '@/lib/i18n/he'
import type { Database } from '@/types/database.types'

type GuestInsert = Omit<Database['public']['Tables']['guests']['Insert'], 'id' | 'event_id' | 'created_at' | 'updated_at'>

interface AddGuestFormProps {
  onSubmit: (data: GuestInsert) => Promise<boolean>
  onCancel: () => void
}

export default function AddGuestForm({ onSubmit, onCancel }: AddGuestFormProps) {
  const [formData, setFormData] = useState<GuestInsert>({
    full_name: '',
    phone: '',
    guest_count: 1,
    group_category: '',
    rsvp_status: 'pending',
    message_status: 'not_sent',
    check_in_status: 'not_arrived',
    notes: '',
  })
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    const success = await onSubmit(formData)
    if (success) {
      setFormData({
        full_name: '',
        phone: '',
        guest_count: 1,
        group_category: '',
        rsvp_status: 'pending',
        message_status: 'not_sent',
        check_in_status: 'not_arrived',
        notes: '',
      })
    }
    setLoading(false)
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-xl font-semibold mb-4">{he.guests.addGuest}</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {he.guests.fullName} *
            </label>
            <input
              type="text"
              required
              value={formData.full_name}
              onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {he.guests.phone}
            </label>
            <input
              type="tel"
              value={formData.phone || ''}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {he.guests.guestCount}
            </label>
            <input
              type="number"
              min="1"
              value={formData.guest_count}
              onChange={(e) => setFormData({ ...formData, guest_count: parseInt(e.target.value) || 1 })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {he.guests.groupCategory}
            </label>
            <input
              type="text"
              value={formData.group_category || ''}
              onChange={(e) => setFormData({ ...formData, group_category: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {he.guests.rsvpStatus}
            </label>
            <select
              value={formData.rsvp_status}
              onChange={(e) => setFormData({ ...formData, rsvp_status: e.target.value as any })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="pending">{he.guests.rsvpStatuses.pending}</option>
              <option value="confirmed">{he.guests.rsvpStatuses.confirmed}</option>
              <option value="maybe">{he.guests.rsvpStatuses.maybe}</option>
              <option value="declined">{he.guests.rsvpStatuses.declined}</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {he.guests.notes}
          </label>
          <textarea
            value={formData.notes || ''}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
          />
        </div>

        <div className="flex gap-4">
          <button
            type="submit"
            disabled={loading}
            className="bg-primary-600 text-white px-4 py-2 rounded-md hover:bg-primary-700 disabled:opacity-50"
          >
            {loading ? he.common.loading : he.common.save}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
          >
            {he.common.cancel}
          </button>
        </div>
      </form>
    </div>
  )
}

