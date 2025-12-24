'use client'

import { he } from '@/lib/i18n/he'

interface GuestDisplayProps {
  guest: {
    id: string
    full_name: string
    table_number: number | null
  }
  onReset: () => void
}

export default function GuestDisplay({ guest, onReset }: GuestDisplayProps) {
  return (
    <div className="bg-white rounded-lg shadow p-8 text-center">
      <div className="mb-6">
        <div className="text-6xl mb-4">✓</div>
        <h2 className="text-2xl font-bold text-green-600 mb-2">
          {he.checkin.checkInSuccess}
        </h2>
      </div>

      <div className="space-y-4 mb-6">
        <div>
          <p className="text-sm text-gray-500 mb-1">{he.checkin.guestName}</p>
          <p className="text-xl font-semibold text-gray-900">{guest.full_name}</p>
        </div>

        {guest.table_number && (
          <div>
            <p className="text-sm text-gray-500 mb-1">{he.checkin.tableNumber}</p>
            <p className="text-xl font-semibold text-gray-900">{guest.table_number}</p>
          </div>
        )}
      </div>

      <button
        onClick={onReset}
        className="bg-primary-600 text-white px-6 py-3 rounded-md hover:bg-primary-700"
      >
        סרוק אורח נוסף
      </button>
    </div>
  )
}

