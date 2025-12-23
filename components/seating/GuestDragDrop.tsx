'use client'

import { useState } from 'react'
import type { Database } from '@/types/database.types'

type Guest = Database['public']['Tables']['guests']['Row']

interface GuestDragDropProps {
  guest: Guest
  onDrop: (guestId: string, tableId: string) => Promise<boolean>
  className?: string
}

export default function GuestDragDrop({ guest, onDrop, className = '' }: GuestDragDropProps) {
  const [isDragging, setIsDragging] = useState(false)

  return (
    <div
      draggable
      onDragStart={() => {
        setIsDragging(true)
        // Store guest data in dataTransfer for drop handler
        if (typeof window !== 'undefined' && window.event) {
          const e = window.event as DragEvent
          if (e.dataTransfer) {
            e.dataTransfer.setData('guestId', guest.id)
            e.dataTransfer.effectAllowed = 'move'
          }
        }
      }}
      onDragEnd={() => {
        setIsDragging(false)
      }}
      className={`px-3 py-2 bg-gray-100 rounded-md cursor-move hover:bg-gray-200 transition-colors ${
        isDragging ? 'opacity-50' : ''
      } ${className}`}
    >
      {guest.full_name}
      {guest.guest_count > 1 && (
        <span className="text-xs text-gray-500 mr-1">
          ({guest.guest_count})
        </span>
      )}
    </div>
  )
}

