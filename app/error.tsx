'use client'

import { useEffect } from 'react'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="text-center">
        <h2 className="text-2xl font-semibold text-gray-700 mb-4">משהו השתבש!</h2>
        <p className="text-gray-600 mb-8">{error.message || 'אירעה שגיאה לא צפויה'}</p>
        <div className="flex gap-4 justify-center">
          <button
            onClick={reset}
            className="bg-primary-600 text-white px-6 py-3 rounded-md hover:bg-primary-700"
          >
            נסה שוב
          </button>
          <button
            onClick={() => window.location.href = '/dashboard'}
            className="bg-gray-600 text-white px-6 py-3 rounded-md hover:bg-gray-700"
          >
            חזור לדף הבית
          </button>
        </div>
      </div>
    </div>
  )
}

