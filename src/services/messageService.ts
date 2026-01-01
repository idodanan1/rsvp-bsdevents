// Message service for sending WhatsApp messages
<<<<<<< HEAD
const BACKEND_URL = (process.env as any).NEXT_PUBLIC_BACKEND_URL || (process.env as any).VITE_BACKEND_URL || 'https://whatsapp-backend-enfz.onrender.com';
=======
const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://whatsapp-backend-enfz.onrender.com';
>>>>>>> 86e722ebed052cbfd599d333b3ae65939a606cab

export interface Recipient {
  phoneNumber: string;
  message?: string;
  guestId?: string;
  guestLink?: string;
}

export interface SendMessageOptions {
  message: string;
  imageUrl?: string;
  recipients: Recipient[];
  templateName?: string;
}

export interface SendMessageResult {
  success: boolean;
  sent: number;
  failed: number;
  errors?: string[];
}

// Extended types for eventStore compatibility
export interface MessageRecipient {
  id: string;
  firstName: string;
  lastName: string;
  phoneNumber: string;
  channel: 'whatsapp' | 'sms';
  message?: string;
  firstMessageSent?: boolean;
  eventData?: {
    coupleName?: string;
    groomName?: string;
    brideName?: string;
    eventType?: string;
    eventTypeHebrew?: string;
    eventDate?: string;
    eventTime?: string;
    venue?: string;
    invitationImageUrl?: string;
  };
  templateParams?: any;
  buttons?: Array<{
    type: 'url' | 'reply';
    url?: string;
    title: string;
    id?: string;
  }>;
}

export interface MessageData {
  message: string;
  imageUrl?: string;
  recipients: MessageRecipient[];
  templateName?: string;
  templateParams?: any;
}

export interface BulkMessageResult {
  results: Array<{
    recipientId: string;
    success: boolean;
    error?: string;
  }>;
  successful: number;
  failed: number;
}

class MessageService {
  async sendBulkMessages(options: SendMessageOptions | MessageData): Promise<SendMessageResult | BulkMessageResult> {
    try {
      // Handle both SendMessageOptions and MessageData types
      const isMessageData = 'recipients' in options && options.recipients.length > 0 && 'id' in options.recipients[0];
      
      let requestBody: any;
      if (isMessageData) {
        const messageData = options as MessageData;
        requestBody = {
          message: messageData.message,
          imageUrl: messageData.imageUrl,
          recipients: messageData.recipients.map(r => ({
            id: r.id,
            phoneNumber: r.phoneNumber,
            firstName: r.firstName,
            lastName: r.lastName,
            channel: r.channel,
            message: r.message,
            firstMessageSent: r.firstMessageSent,
            eventData: r.eventData,
            templateParams: r.templateParams,
            buttons: r.buttons
          })),
          templateName: messageData.templateName || '1',
          templateParams: messageData.templateParams
        };
      } else {
        const sendOptions = options as SendMessageOptions;
        requestBody = {
          message: sendOptions.message,
          imageUrl: sendOptions.imageUrl,
          recipients: sendOptions.recipients,
          templateName: sendOptions.templateName || '1'
        };
      }

      const response = await fetch(`${BACKEND_URL}/api/messages/send-bulk`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        // If endpoint doesn't exist (404), return a graceful error result
        if (response.status === 404) {
          console.warn('⚠️ send-bulk endpoint not available (404) - endpoint may not be implemented');
          const recipients = 'recipients' in options ? options.recipients : [];
          const recipientCount = recipients.length;
          const isMessageData = 'recipients' in options && recipients.length > 0 && 'id' in (recipients[0] as any);
          
          if (isMessageData) {
            const messageData = options as MessageData;
            return {
              results: messageData.recipients.map(r => ({
                recipientId: r.id,
                success: false,
                error: 'Send-bulk endpoint not available (404)'
              })),
              successful: 0,
              failed: recipientCount
            } as BulkMessageResult;
          } else {
            return {
              success: false,
              sent: 0,
              failed: recipientCount,
              errors: ['Send-bulk endpoint not available (404)']
            } as SendMessageResult;
          }
        }
        
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Failed to send messages: ${response.statusText}`);
      }

      const data = await response.json();
      
      // Return BulkMessageResult if MessageData was used, otherwise SendMessageResult
      if (isMessageData) {
        const messageData = options as MessageData;
        // Map response to BulkMessageResult format
        const results = messageData.recipients.map((recipient, index) => ({
          recipientId: recipient.id,
          success: data.results?.[index]?.success ?? (data.sent > index),
          error: data.results?.[index]?.error
        }));
        
        return {
          results,
          successful: data.sent || data.successful || 0,
          failed: data.failed || 0
        } as BulkMessageResult;
      } else {
        return {
          success: true,
          sent: data.sent || 0,
          failed: data.failed || 0,
          errors: data.errors || []
        } as SendMessageResult;
      }
    } catch (error) {
      console.error('Error sending bulk messages:', error);
      const recipients = 'recipients' in options ? options.recipients : [];
      const recipientCount = recipients.length;
      
      // Return appropriate type based on input
      const isMessageData = 'recipients' in options && recipients.length > 0 && 'id' in (recipients[0] as any);
      
      if (isMessageData) {
        const messageData = options as MessageData;
        return {
          results: messageData.recipients.map(r => ({
            recipientId: r.id,
            success: false,
            error: error instanceof Error ? error.message : String(error)
          })),
          successful: 0,
          failed: recipientCount
        } as BulkMessageResult;
      } else {
        return {
          success: false,
          sent: 0,
          failed: recipientCount,
          errors: [error instanceof Error ? error.message : String(error)]
        } as SendMessageResult;
      }
    }
  }

  async sendSingleMessage(
    phoneNumber: string,
    message: string,
    imageUrl?: string,
    templateName?: string
  ): Promise<boolean> {
    try {
      const response = await fetch(`${BACKEND_URL}/api/messages/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          phoneNumber,
          message,
          imageUrl,
          templateName: templateName || '1'
        })
      });

      return response.ok;
    } catch (error) {
      console.error('Error sending single message:', error);
      return false;
    }
  }
}

export const messageService = new MessageService();











