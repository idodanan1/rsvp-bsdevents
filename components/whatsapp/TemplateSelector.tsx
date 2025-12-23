'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Database } from '@/types/database.types'

type Guest = Database['public']['Tables']['guests']['Row']
type Template = Database['public']['Tables']['message_templates']['Row']

interface TemplateSelectorProps {
  eventId: string
  value: string
  onChange: (value: string) => void
  type: 'guest' | 'template'
}

export default function TemplateSelector({ eventId, value, onChange, type }: TemplateSelectorProps) {
  const [options, setOptions] = useState<Guest[] | Template[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    if (type === 'guest') {
      fetchGuests()
    } else {
      fetchTemplates()
    }
  }, [eventId, type])

  const fetchGuests = async () => {
    const { data } = await supabase
      .from('guests')
      .select('*')
      .eq('event_id', eventId)
      .order('full_name')

    if (data) {
      setOptions(data)
    }
    setLoading(false)
  }

  const fetchTemplates = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data } = await supabase
      .from('message_templates')
      .select('*')
      .eq('user_id', user.id)
      .order('name')

    if (data) {
      setOptions(data)
    }
    setLoading(false)
  }

  if (loading) {
    return <div className="text-gray-500">טוען...</div>
  }

  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
    >
      <option value="">בחר {type === 'guest' ? 'אורח' : 'תבנית'}</option>
      {options.map((option) => (
        <option key={option.id} value={option.id}>
          {type === 'guest' ? (option as Guest).full_name : (option as Template).name}
        </option>
      ))}
    </select>
  )
}

