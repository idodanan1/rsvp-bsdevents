// Unified Message Service - Handles both WhatsApp and SMS
import { whatsappService, WhatsAppMessage } from './whatsappService';
import { smsService, SMSMessage } from './smsService';

export interface MessageRecipient {
  id: string;
  firstName: string;
  lastName: string;
  phoneNumber: string;
  channel: 'whatsapp' | 'sms';
  message?: string;
  templateParams?: Record<string, string>;
  firstMessageSent?: boolean; // האם נשלחה הודעה ראשונה למספר הזה
  buttons?: Array<{
    type: 'url' | 'reply';
    url?: string;
    title: string;
    id?: string; // For reply buttons
  }>;
  eventData?: {
    coupleName: string;
    groomName: string;
    brideName: string;
    eventType: string;
    eventTypeHebrew: string;
    eventDate: string;
    eventTime: string;
    venue: string;
    invitationImageUrl?: string;
  };
}

export interface MessageData {
  message: string;
  imageUrl?: string;
  recipients: MessageRecipient[];
  templateName?: string;
  templateParams?: Record<string, string>;
}

export interface MessageResult {
  recipientId: string;
  recipientName: string;
  phoneNumber: string;
  channel: 'whatsapp' | 'sms';
  success: boolean;
  messageId?: string;
  error?: string;
  warning?: string;
  fallbackUsed?: boolean;
  isFirstMessage?: boolean; // האם זו הודעה ראשונה שנשלחה עם טמפלט
}

export interface BulkMessageResult {
  totalSent: number;
  successful: number;
  failed: number;
  results: MessageResult[];
}

class MessageService {
  // Process template variables in message content
  private processTemplateVariables(message: string, recipient: MessageRecipient): string {
    if (!recipient.eventData) return message;
    
    const { eventData } = recipient;
    const { firstName, lastName } = recipient;
    
    return message
      .replace(/\{firstName\}/g, firstName)
      .replace(/\{lastName\}/g, lastName)
      .replace(/\{coupleName\}/g, eventData.coupleName)
      .replace(/\{groomName\}/g, eventData.groomName)
      .replace(/\{brideName\}/g, eventData.brideName)
      .replace(/\{eventType\}/g, eventData.eventTypeHebrew)
      .replace(/\{eventDate\}/g, eventData.eventDate)
      .replace(/\{eventTime\}/g, eventData.eventTime)
      .replace(/\{venue\}/g, eventData.venue);
  }

  async sendBulkMessages(messageData: MessageData): Promise<BulkMessageResult> {
    const results: MessageResult[] = [];
    let successful = 0;
    let failed = 0;

    console.log(`📤 Starting bulk message send to ${messageData.recipients.length} recipients`);

    for (const recipient of messageData.recipients) {
      try {
        let result: MessageResult;

        if (recipient.channel === 'whatsapp') {
          // Try WhatsApp with multiple APIs
          console.log(`📱 Trying WhatsApp for ${recipient.firstName} ${recipient.lastName}...`);
          const whatsappResult = await this.sendWhatsAppMessage(recipient, messageData);
          
          if (whatsappResult.success) {
            result = whatsappResult;
          } else {
            // Fallback to SMS
            console.log(`📞 WhatsApp failed for ${recipient.firstName} ${recipient.lastName}, trying SMS...`);
            const smsResult = await this.sendSMSMessage(recipient, messageData);
            result = {
              ...smsResult,
              fallbackUsed: true
            };
          }
        } else {
          // Send SMS directly
          result = await this.sendSMSMessage(recipient, messageData);
        }

        results.push(result);

        if (result.success) {
          successful++;
        } else {
          failed++;
        }

        // Add delay between recipients to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));

      } catch (error) {
        console.error(`Error sending message to ${recipient.firstName} ${recipient.lastName}:`, error);
        
        results.push({
          recipientId: recipient.id,
          recipientName: `${recipient.firstName} ${recipient.lastName}`,
          phoneNumber: recipient.phoneNumber,
          channel: recipient.channel,
          success: false,
          error: 'Unexpected error occurred'
        });
        
        failed++;
      }
    }

    console.log(`📊 Bulk message completed: ${successful} successful, ${failed} failed`);

    return {
      totalSent: messageData.recipients.length,
      successful,
      failed,
      results
    };
  }

  private async sendWhatsAppMessage(
    recipient: MessageRecipient, 
    messageData: MessageData
  ): Promise<MessageResult> {
    // Process template variables in the message
    const processedMessage = this.processTemplateVariables(
      recipient.message || messageData.message, 
      recipient
    );
    
    // Use invitation image if available, otherwise use campaign image
    const imageUrl = recipient.eventData?.invitationImageUrl || messageData.imageUrl;
    
    console.log('🖼️ Image URL in messageService:', imageUrl);
    console.log('🖼️ Event data invitationImageUrl:', recipient.eventData?.invitationImageUrl);
    console.log('🖼️ Message data imageUrl:', messageData.imageUrl);
    
    // Check if this is a first message - if so, use template
    // First message = no previous message sent AND no explicit template provided
    const isFirstMessage = !recipient.firstMessageSent;
    
    // If explicit template is provided, use it (for campaigns that need specific templates)
    // Otherwise, if this is a first message, use hello_world template
    let templateName = messageData.templateName;
    let templateParams = recipient.templateParams || messageData.templateParams;
    
    // Debug logging
    console.log('🔍 DEBUG templateName check:', {
      messageDataTemplateName: messageData.templateName,
      recipientTemplateParams: recipient.templateParams,
      messageDataTemplateParams: messageData.templateParams,
      isFirstMessage: isFirstMessage,
      firstMessageSent: recipient.firstMessageSent,
      finalTemplateName: templateName,
      finalTemplateParams: templateParams
    });
    
    // Logic for when to use templates:
    // CRITICAL: Meta requires ALL first messages to use approved templates
    // 1. If it's a first message → MUST use template (Meta requirement)
    //    - If explicit templateName from campaign → use it
    //    - If no templateName → use hello_world template
    // 2. If not first message → send regular message (can use template if provided, but not required)
    
    const hasMessageContent = processedMessage && processedMessage.trim().length > 0;
    
    // CRITICAL: If explicit templateName is provided (e.g., 'aa'), ALWAYS use the template
    // This ensures campaigns that specify a template (like "הזמנה ראשונית" with template 'aa') 
    // will use the Meta template, not the campaign message content
    // Check for both truthy value and non-empty string
    const hasValidTemplate = templateName && typeof templateName === 'string' && templateName.trim().length > 0;
    
    console.log('🔍 Template validation:', {
      templateName,
      typeofTemplateName: typeof templateName,
      templateNameLength: templateName ? templateName.length : 0,
      templateNameTrimmed: templateName ? templateName.trim() : '',
      hasValidTemplate,
      isFirstMessage
    });
    
    if (hasValidTemplate) {
      // Explicit template provided → ALWAYS use template (Meta will use template content, not campaign message)
      console.log('✅ Explicit template provided:', templateName, '- using Meta template (campaign message content will be ignored)');
      console.log('📋 Template parameters:', templateParams);
      // Keep templateName and templateParams as provided - Meta will use template content
      // The campaign.message content will be ignored when using templates
    } else if (isFirstMessage) {
      // FIRST MESSAGE - Meta requires approved template
      // No explicit template from campaign → use hello_world as fallback
      console.log('⚠️ First message - no valid template from campaign, using "hello_world" template as fallback');
      console.log('⚠️ Note: Message content will be ignored - only template content will be sent');
      console.log('⚠️ Debug: templateName was:', templateName, 'type:', typeof templateName);
      templateName = 'hello_world';
      templateParams = {
        language: 'en_US'
      };
    } else if (hasMessageContent) {
      // NOT FIRST MESSAGE and no template → send regular message with campaign content
      console.log('📋 Not first message - sending regular text message with campaign content');
      templateName = undefined;
      templateParams = undefined;
    } else {
      // No template and no message content → send regular message
      console.log('📋 No template and no message content - sending empty message');
      templateName = undefined;
      templateParams = undefined;
    }
    
    console.log('🔘 DEBUG: Recipient buttons:', recipient.buttons);
    console.log('🔘 DEBUG: Recipient buttons length:', recipient.buttons?.length || 0);
    
    // CRITICAL: Add event invitation image to templateParams so it's used as header image
    // This ensures event invitation image is always used, not campaign image
    if (recipient.eventData?.invitationImageUrl && templateParams) {
      (templateParams as any).headerImageUrl = recipient.eventData.invitationImageUrl;
      (templateParams as any).eventData = recipient.eventData; // Also pass full eventData for reference
    }
    
    const whatsappMessage: WhatsAppMessage = {
      to: recipient.phoneNumber,
      message: processedMessage,
      imageUrl: imageUrl, // This is already set to event.invitationImageUrl || campaign.imageUrl
      templateName: templateName,
      templateParams: templateParams,
      buttons: recipient.buttons // Add buttons from recipient
    };
    
    console.log('🔘 DEBUG: WhatsApp message buttons:', whatsappMessage.buttons);
    console.log('🔘 DEBUG: WhatsApp message buttons length:', whatsappMessage.buttons?.length || 0);

    const response = await whatsappService.sendMessage(whatsappMessage);
    
    // If message was sent successfully and it was a template (first message), mark it
    if (response.success && templateName && isFirstMessage) {
      console.log('✅ First message sent successfully with template');
    }

    // Ensure response is valid
    if (!response) {
      return {
        recipientId: recipient.id,
        recipientName: `${recipient.firstName} ${recipient.lastName}`,
        phoneNumber: recipient.phoneNumber,
        channel: 'whatsapp',
        success: false,
        error: 'No response from WhatsApp service'
      };
    }

    return {
      recipientId: recipient.id,
      recipientName: `${recipient.firstName} ${recipient.lastName}`,
      phoneNumber: recipient.phoneNumber,
      channel: 'whatsapp',
      success: response.success || false,
      messageId: response.messageId,
      error: response.error,
      warning: response.warning,
      isFirstMessage: isFirstMessage && templateName ? true : false
    };
  }

  private async sendSMSMessage(
    recipient: MessageRecipient, 
    messageData: MessageData
  ): Promise<MessageResult> {
    // Process template variables in the message
    const processedMessage = this.processTemplateVariables(
      recipient.message || messageData.message, 
      recipient
    );
    
    // Format message for SMS (remove emojis, limit length)
    const smsMessage = this.formatMessageForSMS(processedMessage);
    
    const smsData: SMSMessage = {
      to: smsService.formatPhoneNumber(recipient.phoneNumber),
      message: smsMessage
    };

    const response = await smsService.sendMessage(smsData);

    return {
      recipientId: recipient.id,
      recipientName: `${recipient.firstName} ${recipient.lastName}`,
      phoneNumber: recipient.phoneNumber,
      channel: 'sms',
      success: response.success,
      messageId: response.messageId,
      error: response.error
    };
  }

  private formatMessageForSMS(message: string): string {
    // Keep important emojis but remove complex ones
    let formatted = message
      .replace(/[📅🕐📍✅❌❓➕🎉🎊]/g, '') // Remove complex emojis
      .replace(/[🔗]/g, 'LINK:') // Replace link emoji with text
      .replace(/\n\n+/g, '\n') // Replace multiple newlines with single
      .trim();

    // Keep the message as is - SMS can handle longer messages
    return formatted;
  }

  // Check WhatsApp availability for multiple recipients
  async checkWhatsAppAvailability(recipients: MessageRecipient[]): Promise<MessageRecipient[]> {
    const updatedRecipients: MessageRecipient[] = [];

    for (const recipient of recipients) {
      try {
        const hasWhatsApp = await whatsappService.checkWhatsAppAvailability(recipient.phoneNumber);
        
        updatedRecipients.push({
          ...recipient,
          channel: hasWhatsApp ? 'whatsapp' : 'sms'
        });
      } catch (error) {
        console.error(`Error checking WhatsApp for ${recipient.phoneNumber}:`, error);
        // Default to SMS if check fails
        updatedRecipients.push({
          ...recipient,
          channel: 'sms'
        });
      }
    }

    return updatedRecipients;
  }

  // Get message statistics
  getMessageStats(results: MessageResult[]) {
    const whatsappResults = results.filter(r => r.channel === 'whatsapp');
    const smsResults = results.filter(r => r.channel === 'sms');
    const fallbackResults = results.filter(r => r.fallbackUsed);

    return {
      total: results.length,
      successful: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
      whatsapp: {
        total: whatsappResults.length,
        successful: whatsappResults.filter(r => r.success).length,
        failed: whatsappResults.filter(r => !r.success).length
      },
      sms: {
        total: smsResults.length,
        successful: smsResults.filter(r => r.success).length,
        failed: smsResults.filter(r => !r.success).length
      },
      fallbacks: fallbackResults.length
    };
  }
}

export const messageService = new MessageService();
