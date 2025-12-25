// Message service for sending WhatsApp messages
const BACKEND_URL = (import.meta.env as any).VITE_BACKEND_URL || 'https://whatsapp-backend-enfz.onrender.com';

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

class MessageService {
  async sendBulkMessages(options: SendMessageOptions): Promise<SendMessageResult> {
    try {
      const response = await fetch(`${BACKEND_URL}/api/messages/send-bulk`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: options.message,
          imageUrl: options.imageUrl,
          recipients: options.recipients,
          templateName: options.templateName || '1'
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Failed to send messages: ${response.statusText}`);
      }

      const data = await response.json();
      return {
        success: true,
        sent: data.sent || 0,
        failed: data.failed || 0,
        errors: data.errors || []
      };
    } catch (error) {
      console.error('Error sending bulk messages:', error);
      return {
        success: false,
        sent: 0,
        failed: options.recipients.length,
        errors: [error instanceof Error ? error.message : String(error)]
      };
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


