'use client'

import { he } from '@/lib/i18n/he'

interface GuestFiltersProps {
  filters: {
    rsvpStatus: 'all' | 'pending' | 'confirmed' | 'maybe' | 'declined'
    messageStatus: 'all' | 'not_sent' | 'sent' | 'delivered' | 'read' | 'failed'
    checkInStatus: 'all' | 'not_arrived' | 'arrived'
    sortBy: 'updated_at' | 'created_at' | 'full_name'
  }
  onFiltersChange: (filters: any) => void
}

export default function GuestFilters({ filters, onFiltersChange }: GuestFiltersProps) {
  const updateFilter = (key: string, value: any) => {
    onFiltersChange({ ...filters, [key]: value })
  }

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {he.guests.rsvpStatus}
          </label>
          <select
            value={filters.rsvpStatus}
            onChange={(e) => updateFilter('rsvpStatus', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
          >
            <option value="all">הכל</option>
            <option value="pending">{he.guests.rsvpStatuses.pending}</option>
            <option value="confirmed">{he.guests.rsvpStatuses.confirmed}</option>
            <option value="maybe">{he.guests.rsvpStatuses.maybe}</option>
            <option value="declined">{he.guests.rsvpStatuses.declined}</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {he.guests.messageStatus}
          </label>
          <select
            value={filters.messageStatus}
            onChange={(e) => updateFilter('messageStatus', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
          >
            <option value="all">הכל</option>
            <option value="not_sent">{he.guests.messageStatuses.notSent}</option>
            <option value="sent">{he.guests.messageStatuses.sent}</option>
            <option value="delivered">{he.guests.messageStatuses.delivered}</option>
            <option value="read">{he.guests.messageStatuses.read}</option>
            <option value="failed">{he.guests.messageStatuses.failed}</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {he.guests.checkInStatus}
          </label>
          <select
            value={filters.checkInStatus}
            onChange={(e) => updateFilter('checkInStatus', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
          >
            <option value="all">הכל</option>
            <option value="not_arrived">{he.guests.checkInStatuses.notArrived}</option>
            <option value="arrived">{he.guests.checkInStatuses.arrived}</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            מיון לפי
          </label>
          <select
            value={filters.sortBy}
            onChange={(e) => updateFilter('sortBy', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
          >
            <option value="updated_at">{he.guests.lastUpdated}</option>
            <option value="created_at">תאריך יצירה</option>
            <option value="full_name">שם</option>
          </select>
        </div>
      </div>
    </div>
  )
}

