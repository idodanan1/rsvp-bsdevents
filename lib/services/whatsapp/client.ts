interface WhatsAppMessage {
  to: string
  template?: {
    name: string
    language: { code: string }
    components?: Array<{
      type: string
      parameters?: Array<{ type: string; text?: string; image?: { link: string } }>
    }>
  }
  text?: {
    body: string
  }
}

export class WhatsAppClient {
  private accessToken: string
  private phoneNumberId: string
  private apiKey: string
  private phoneNumber: string
  private apiVersion = 'v21.0'
  private enabled: boolean

  constructor() {
    this.accessToken = process.env.WHATSAPP_ACCESS_TOKEN || ''
    this.phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID || ''
    this.apiKey = process.env.WHATSAPP_API_KEY || ''
    this.phoneNumber = process.env.WHATSAPP_PHONE_NUMBER || ''
    this.enabled = process.env.ENABLE_WHATSAPP_SENDING === 'true'
  }

  private async makeRequest(endpoint: string, method: string, body?: any) {
    const url = `https://graph.facebook.com/${this.apiVersion}/${this.phoneNumberId}/${endpoint}`
    
    const response = await fetch(url, {
      method,
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error?.message || 'WhatsApp API error')
    }

    return response.json()
  }

  async sendMessage(message: WhatsAppMessage) {
    if (!this.enabled) {
      console.log('[WhatsApp] Sending disabled (ENABLE_WHATSAPP_SENDING=false)')
      return { messages: [{ id: 'mock_message_id' }] }
    }

    return this.makeRequest('messages', 'POST', message)
  }

  async sendTemplateMessage(
    to: string,
    templateName: string,
    languageCode: string = 'he',
    parameters?: string[]
  ) {
    const components = parameters && parameters.length > 0 ? [
      {
        type: 'body',
        parameters: parameters.map(param => ({
          type: 'text',
          text: param,
        })),
      },
    ] : undefined

    return this.sendMessage({
      to,
      template: {
        name: templateName,
        language: { code: languageCode },
        components,
      },
    })
  }

  async sendTextMessage(to: string, text: string) {
    return this.sendMessage({
      to,
      text: { body: text },
    })
  }
}

