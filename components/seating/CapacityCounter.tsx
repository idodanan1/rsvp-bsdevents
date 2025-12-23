'use client'

import { he } from '@/lib/i18n/he'

interface CapacityCounterProps {
  current: number
  capacity: number
  className?: string
}

export default function CapacityCounter({ current, capacity, className = '' }: CapacityCounterProps) {
  const isFull = current >= capacity
  const percentage = capacity > 0 ? Math.round((current / capacity) * 100) : 0

  return (
    <div className={`${className}`}>
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm font-medium text-gray-700">
          {he.seating.currentCapacity}
        </span>
        <span
          className={`text-sm font-semibold ${
            isFull ? 'text-red-600' : percentage > 80 ? 'text-yellow-600' : 'text-green-600'
          }`}
        >
          {current} {he.seating.of} {capacity}
        </span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div
          className={`h-2 rounded-full transition-all duration-300 ${
            isFull
              ? 'bg-red-500'
              : percentage > 80
              ? 'bg-yellow-500'
              : 'bg-green-500'
          }`}
          style={{ width: `${Math.min(percentage, 100)}%` }}
        />
      </div>
      {isFull && (
        <p className="text-xs text-red-600 mt-1">שולחן מלא</p>
      )}
    </div>
  )
}

