'use client'

import { useState } from 'react'
import { he } from '@/lib/i18n/he'
import TemplateSelector from './TemplateSelector'

interface MessageComposerProps {
  eventId: string
  userId: string
}

export default function MessageComposer({ eventId, userId }: MessageComposerProps) {
  const [selectedGuest, setSelectedGuest] = useState('')
  const [templateId, setTemplateId] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const response = await fetch('/api/whatsapp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventId,
          guestId: selectedGuest,
          templateId: templateId || undefined,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to send message')
      }

      alert('הודעה נשלחה בהצלחה')
      setSelectedGuest('')
      setTemplateId('')
    } catch (error) {
      console.error('Error sending message:', error)
      alert('שגיאה בשליחת הודעה')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-xl font-semibold mb-4">{he.whatsapp.sendMessage}</h2>
      <form onSubmit={handleSend} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            בחר אורח
          </label>
          <TemplateSelector
            eventId={eventId}
            value={selectedGuest}
            onChange={setSelectedGuest}
            type="guest"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {he.whatsapp.templates}
          </label>
          <TemplateSelector
            eventId={eventId}
            value={templateId}
            onChange={setTemplateId}
            type="template"
          />
        </div>

        <button
          type="submit"
          disabled={loading || !selectedGuest}
          className="bg-primary-600 text-white px-4 py-2 rounded-md hover:bg-primary-700 disabled:opacity-50"
        >
          {loading ? he.common.loading : 'שלח הודעה'}
        </button>
      </form>
    </div>
  )
}

