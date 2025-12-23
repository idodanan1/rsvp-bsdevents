'use client'

import { useState } from 'react'
import { he } from '@/lib/i18n/he'
import TemplateSelector from './TemplateSelector'

interface CampaignManagerProps {
  eventId: string
  userId: string
}

export default function CampaignManager({ eventId, userId }: CampaignManagerProps) {
  const [campaignType, setCampaignType] = useState<string>('invite_round_1')
  const [targetStatus, setTargetStatus] = useState<string[]>(['pending'])
  const [scheduledAt, setScheduledAt] = useState('')
  const [templateId, setTemplateId] = useState('')
  const [loading, setLoading] = useState(false)

  const handleCreateCampaign = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const response = await fetch('/api/whatsapp/campaign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventId,
          type: campaignType,
          targetStatus,
          scheduledAt: scheduledAt || new Date().toISOString(),
          templateId: templateId || undefined,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to create campaign')
      }

      alert('קמפיין נוצר בהצלחה')
      setScheduledAt('')
    } catch (error) {
      console.error('Error creating campaign:', error)
      alert('שגיאה ביצירת קמפיין')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-xl font-semibold mb-4">{he.whatsapp.createCampaign}</h2>
      <form onSubmit={handleCreateCampaign} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            סוג קמפיין
          </label>
          <select
            value={campaignType}
            onChange={(e) => setCampaignType(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
          >
            <option value="invite_round_1">{he.whatsapp.campaignTypes.inviteRound1}</option>
            <option value="invite_round_2">{he.whatsapp.campaignTypes.inviteRound2}</option>
            <option value="invite_round_3">{he.whatsapp.campaignTypes.inviteRound3}</option>
            <option value="reminder">{he.whatsapp.campaignTypes.reminder}</option>
            <option value="thank_you">{he.whatsapp.campaignTypes.thankYou}</option>
            <option value="custom">{he.whatsapp.campaignTypes.custom}</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            סטטוסי RSVP לשליחה
          </label>
          <div className="space-y-2">
            {['pending', 'maybe', 'confirmed'].map((status) => (
              <label key={status} className="flex items-center">
                <input
                  type="checkbox"
                  checked={targetStatus.includes(status)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setTargetStatus([...targetStatus, status])
                    } else {
                      setTargetStatus(targetStatus.filter(s => s !== status))
                    }
                  }}
                  className="mr-2"
                />
                <span>{he.guests.rsvpStatuses[status as keyof typeof he.guests.rsvpStatuses]}</span>
              </label>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {he.whatsapp.scheduledAt}
          </label>
          <input
            type="datetime-local"
            value={scheduledAt}
            onChange={(e) => setScheduledAt(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {he.whatsapp.templates} (אופציונלי)
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
          disabled={loading || targetStatus.length === 0}
          className="bg-primary-600 text-white px-4 py-2 rounded-md hover:bg-primary-700 disabled:opacity-50"
        >
          {loading ? he.common.loading : he.whatsapp.createCampaign}
        </button>
      </form>
    </div>
  )
}

