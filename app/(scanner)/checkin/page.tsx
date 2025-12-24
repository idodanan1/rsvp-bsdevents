'use client'

import { useState, useEffect } from 'react'
import QRScanner from '@/components/checkin/QRScanner'
import GuestDisplay from '@/components/checkin/GuestDisplay'
import { he } from '@/lib/i18n/he'

export default function CheckInPage() {
  const [scannedData, setScannedData] = useState<string | null>(null)
  const [guestInfo, setGuestInfo] = useState<{
    id: string
    full_name: string
    table_number: number | null
  } | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleScan = async (qrCode: string) => {
    setScannedData(qrCode)
    setLoading(true)
    setError(null)
    setGuestInfo(null)

    try {
      const response = await fetch('/api/checkin/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ qrCode }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to process check-in')
      }

      const data = await response.json()
      setGuestInfo(data.guest)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleReset = () => {
    setScannedData(null)
    setGuestInfo(null)
    setError(null)
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-6 text-center">
          {he.checkin.title}
        </h1>

        {!scannedData && !guestInfo && (
          <QRScanner onScan={handleScan} />
        )}

        {loading && (
          <div className="text-center py-12">
            <p className="text-gray-500">{he.common.loading}</p>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
            {error}
            <button
              onClick={handleReset}
              className="block mt-2 text-sm underline"
            >
              נסה שוב
            </button>
          </div>
        )}

        {guestInfo && (
          <GuestDisplay
            guest={guestInfo}
            onReset={handleReset}
          />
        )}
      </div>
    </div>
  )
}

