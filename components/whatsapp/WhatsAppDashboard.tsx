'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import MessageComposer from './MessageComposer'
import CampaignManager from './CampaignManager'
import TemplateSelector from './TemplateSelector'
import { he } from '@/lib/i18n/he'
import type { Database } from '@/types/database.types'

type Message = Database['public']['Tables']['whatsapp_messages']['Row']
type Campaign = Database['public']['Tables']['whatsapp_campaigns']['Row']

interface WhatsAppDashboardProps {
  eventId: string
  userId: string
}

export default function WhatsAppDashboard({ eventId, userId }: WhatsAppDashboardProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [activeTab, setActiveTab] = useState<'compose' | 'campaigns' | 'history'>('compose')
  const supabase = createClient()

  useEffect(() => {
    fetchMessages()
    fetchCampaigns()

    // Subscribe to real-time updates
    const channel = supabase
      .channel(`whatsapp:${eventId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'whatsapp_messages',
          filter: `event_id=eq.${eventId}`,
        },
        () => {
          fetchMessages()
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'whatsapp_campaigns',
          filter: `event_id=eq.${eventId}`,
        },
        () => {
          fetchCampaigns()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [eventId])

  const fetchMessages = async () => {
    const { data } = await supabase
      .from('whatsapp_messages')
      .select('*')
      .eq('event_id', eventId)
      .order('created_at', { ascending: false })
      .limit(50)

    if (data) {
      setMessages(data)
    }
  }

  const fetchCampaigns = async () => {
    const { data } = await supabase
      .from('whatsapp_campaigns')
      .select('*')
      .eq('event_id', eventId)
      .order('created_at', { ascending: false })

    if (data) {
      setCampaigns(data)
    }
  }

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 mb-6">{he.whatsapp.title}</h1>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('compose')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'compose'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            {he.whatsapp.sendMessage}
          </button>
          <button
            onClick={() => setActiveTab('campaigns')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'campaigns'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            {he.whatsapp.campaigns}
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'history'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            {he.whatsapp.messageHistory}
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'compose' && (
        <MessageComposer eventId={eventId} userId={userId} />
      )}

      {activeTab === 'campaigns' && (
        <CampaignManager eventId={eventId} userId={userId} />
      )}

      {activeTab === 'history' && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                    טלפון
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                    סטטוס
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                    נשלח ב
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {messages.map((message) => (
                  <tr key={message.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {message.phone_number}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {message.status}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {message.sent_at
                        ? new Date(message.sent_at).toLocaleString('he-IL')
                        : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

