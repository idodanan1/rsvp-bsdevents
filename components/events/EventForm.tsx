'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { he } from '@/lib/i18n/he'
import { generateSlug } from '@/lib/utils/slug'
import type { Database } from '@/types/database.types'

interface EventFormProps {
  userId: string
  eventId?: string
  initialData?: {
    name: string
    description: string | null
    event_date: string | null
    location: string | null
  }
}

export default function EventForm({ userId, eventId, initialData }: EventFormProps) {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    name: initialData?.name || '',
    description: initialData?.description || '',
    event_date: initialData?.event_date ? initialData.event_date.split('T')[0] : '',
    location: initialData?.location || '',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const slug = generateSlug(formData.name)

      if (eventId) {
        // Update existing event
        // Use typed variable to fix TypeScript inference issue
        const updateData: Database['public']['Tables']['events']['Update'] = {
          name: formData.name,
          slug,
          description: formData.description || null,
          event_date: formData.event_date ? new Date(formData.event_date).toISOString() : null,
          location: formData.location || null,
        }
        // Type assertion to fix TypeScript inference issue
        const { error: updateError } = await (supabase
          .from('events') as any)
          .update(updateData as Database['public']['Tables']['events']['Update'])
          .eq('id', eventId)
          .eq('user_id', userId)
          

        if (updateError) throw updateError
        router.push(`/dashboard/events/${eventId}`)
      } else {
        // Create new event
        // Use typed variable to fix TypeScript inference issue
        const insertData: Database['public']['Tables']['events']['Insert'] = {
          user_id: userId,
          name: formData.name,
          slug,
          description: formData.description || null,
          event_date: formData.event_date ? new Date(formData.event_date).toISOString() : null,
          location: formData.location || null,
        }
        const { data, error: insertError } = await (supabase
          .from('events') as any)
          .insert(insertData)
          .select()
          .single()

        if (insertError) throw insertError
        router.push(`/dashboard/events/${data.id}`)
      }
    } catch (err: any) {
      setError(err.message)
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold text-gray-900 mb-6">
        {eventId ? he.common.edit : he.events.createEvent}
      </h1>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white shadow rounded-lg p-6 space-y-4">
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
            {he.events.eventName} *
          </label>
          <input
            type="text"
            id="name"
            required
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
          />
        </div>

        <div>
          <label htmlFor="event_date" className="block text-sm font-medium text-gray-700 mb-1">
            {he.events.eventDate}
          </label>
          <input
            type="date"
            id="event_date"
            value={formData.event_date}
            onChange={(e) => setFormData({ ...formData, event_date: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
          />
        </div>

        <div>
          <label htmlFor="location" className="block text-sm font-medium text-gray-700 mb-1">
            {he.events.location}
          </label>
          <input
            type="text"
            id="location"
            value={formData.location}
            onChange={(e) => setFormData({ ...formData, location: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
          />
        </div>

        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
            {he.events.description}
          </label>
          <textarea
            id="description"
            rows={4}
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
          />
        </div>

        <div className="flex gap-4">
          <button
            type="submit"
            disabled={loading}
            className="flex-1 bg-primary-600 text-white px-4 py-2 rounded-md hover:bg-primary-700 disabled:opacity-50"
          >
            {loading ? he.common.loading : he.common.save}
          </button>
          <button
            type="button"
            onClick={() => router.back()}
            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
          >
            {he.common.cancel}
          </button>
        </div>
      </form>
    </div>
  )
}

