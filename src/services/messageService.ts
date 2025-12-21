// Unified Message Service - Handles WhatsApp only
import { whatsappService, WhatsAppMessage } from './whatsappService';

export interface MessageRecipient {
  id: string;
  firstName: string;
  lastName: string;
  phoneNumber: string;
  channel: 'whatsapp';
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
  channel: 'whatsapp';
  success: boolean;
  messageId?: string;
  error?: string;
  warning?: string;
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
      .replace(/\{eventType\}/g, eventData.eventTypeHebrew || 'חתונה')
      .replace(/\{eventDate\}/g, eventData.eventDate)
      .replace(/\{eventTime\}/g, eventData.eventTime)
      .replace(/\{venue\}/g, eventData.venue);
  }

  async sendBulkMessages(messageData: MessageData): Promise<BulkMessageResult> {
    console.log('🚀 messageService.sendBulkMessages called');
    console.log('📋 messageData:', {
      recipientsCount: messageData.recipients.length,
      templateName: messageData.templateName,
      hasTemplateParams: !!messageData.templateParams,
      message: messageData.message?.substring(0, 100)
    });
    
    const results: MessageResult[] = [];
    let successful = 0;
    let failed = 0;

    console.log(`📤 Starting bulk message send to ${messageData.recipients.length} recipients`);

    for (const recipient of messageData.recipients) {
      try {
        // Only WhatsApp is supported
        console.log(`📱 Sending WhatsApp message to ${recipient.firstName} ${recipient.lastName}...`);
        const whatsappResult = await this.sendWhatsAppMessage(recipient, messageData);
        
        results.push(whatsappResult);

        if (whatsappResult.success) {
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
          channel: 'whatsapp',
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
    // CRITICAL: Priority for templateParams: recipient.templateParams > messageData.templateParams
    // This ensures that when sending from table (handleSendToSingleGuest), the params are used
    let templateParams = recipient.templateParams || messageData.templateParams;
    
    // Debug: Log template params sources
    console.log('🔍 Template params sources:', {
      recipientTemplateParams: recipient.templateParams,
      messageDataTemplateParams: messageData.templateParams,
      finalTemplateParams: templateParams
    });
    
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
    //    - If no templateName → use "aa" template
    // 2. If not first message → send regular message (can use template if provided, but not required)
    // CRITICAL: If explicit templateName is undefined AND there's message content, send as regular message
    // This allows manual messages to be sent as free-form text even for first messages
    
    const hasMessageContent = processedMessage && processedMessage.trim().length > 0;
    const hasButtons = recipient.buttons && recipient.buttons.length > 0;
    
    // CRITICAL: Check if templateName was explicitly set to undefined (user wants free-form message)
    // If messageData.templateName is explicitly undefined AND there's message content, send as regular message
    const explicitlyNoTemplate = messageData.templateName === undefined && hasMessageContent;
    
    // CRITICAL: If no buttons are provided, don't use template - send as regular message
    // BUT: First messages MUST use a template (Meta requirement), so don't clear templateName for first messages
    // Templates like "a" require buttons, so if we don't have buttons, use regular message
    // Exception: Template "aa" doesn't require buttons (has no buttons in Meta - user removed them)
    if (!hasButtons && templateName && !isFirstMessage) {
      console.log('📝 No buttons provided and not first message - sending as regular message instead of template');
      templateName = undefined;
      templateParams = undefined;
    }
    
    // CRITICAL: If explicit templateName is provided (e.g., 'aa'), ALWAYS use the template (only if buttons exist OR it's first message)
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
      isFirstMessage,
      explicitlyNoTemplate,
      hasMessageContent
    });
    
    if (hasValidTemplate) {
      // Explicit template provided → ALWAYS use template (Meta will use template content, not campaign message)
      console.log('✅ Explicit template provided:', templateName, '- using Meta template (campaign message content will be ignored)');
      console.log('📋 Template parameters from recipient:', recipient.templateParams);
      console.log('📋 Template parameters from messageData:', messageData.templateParams);
      console.log('📋 Final template parameters:', templateParams);
      
      // CRITICAL: Ensure templateParams are set correctly
      // Priority: recipient.templateParams > messageData.templateParams
      if (!templateParams || Object.keys(templateParams).length === 0) {
        console.warn('⚠️ No template parameters provided - using defaults for template:', templateName);
        // If template is "aa" and no params, create default params
        if (templateName.toLowerCase() === 'aa' && recipient.eventData) {
          templateParams = {
            paramsOrder: ['guest_name', 'event_type', 'groom_name', 'bride_name', 
                         'event_date', 'event_time', 'venue', 'couple_name'],
            guest_name: recipient.firstName,
            event_type: recipient.eventData.eventTypeHebrew || 'חתונה',
            groom_name: recipient.eventData.groomName || '',
            bride_name: recipient.eventData.brideName || '',
            event_date: recipient.eventData.eventDate || '',
            event_time: recipient.eventData.eventTime || '',
            venue: recipient.eventData.venue || '',
            couple_name: recipient.eventData.coupleName || '',
            language: 'he'
          };
          console.log('📋 Created default template parameters for "aa":', templateParams);
        }
      }
      
      // Keep templateName and templateParams as provided - Meta will use template content
      // The campaign.message content will be ignored when using templates
    } else if (explicitlyNoTemplate) {
      // CRITICAL: User explicitly wants free-form message (templateName === undefined with message content)
      // For first messages, Meta REQUIRES a template, so we MUST use template "aa"
      // BUT: We'll send the free-form message content as a regular text message AFTER the template
      // OR: We can try to send as regular message and let Meta reject it, then fallback to template
      if (isFirstMessage) {
        console.log('⚠️ User requested free-form message, but this is a FIRST MESSAGE');
        console.log('⚠️ Meta requires template for first messages - sending as regular text message anyway');
        console.log('⚠️ If Meta rejects, we will fallback to template "aa"');
        // Try sending as regular message first - Meta will reject if it's a first message
        // The whatsappService will handle the rejection and retry with template if needed
        templateName = undefined;
        templateParams = undefined;
      } else {
        // NOT a first message - can send free-form message as requested
        console.log('📝 Explicitly no template requested - sending as regular text message (free-form)');
        templateName = undefined;
        templateParams = undefined;
      }
    } else if (isFirstMessage) {
      // FIRST MESSAGE - Meta requires approved template
      // No explicit template from campaign → use "aa" template as fallback (instead of hello_world)
      console.log('⚠️ First message - no valid template from campaign, using "aa" template as fallback');
      console.log('⚠️ Note: Message content will be ignored - only template content will be sent');
      console.log('⚠️ Debug: templateName was:', templateName, 'type:', typeof templateName);
      // CRITICAL: Always set templateName to 'aa' for first messages (Meta requirement)
      templateName = 'aa';
      // Prepare template parameters for template "aa" (8 parameters)
      // Template "aa" expects: guest_name, event_type, groom_name, bride_name, event_date, event_time, venue, couple_name
      const eventData = recipient.eventData;
      if (eventData) {
        templateParams = {
          paramsOrder: ['guest_name', 'event_type', 'groom_name', 'bride_name', 
                       'event_date', 'event_time', 'venue', 'couple_name'],
          guest_name: recipient.firstName,
          event_type: eventData.eventTypeHebrew || 'חתונה',
          groom_name: eventData.groomName || '',
          bride_name: eventData.brideName || '',
          event_date: eventData.eventDate || '',
          event_time: eventData.eventTime || '',
          venue: eventData.venue || '',
          couple_name: eventData.coupleName || '',
          language: 'he'
        };
      } else {
        templateParams = {
          language: 'he'
        };
      }
      // CRITICAL: Verify templateName is set correctly
      if (!templateName || templateName !== 'aa') {
        console.error('❌ CRITICAL ERROR: templateName not set correctly for first message!');
        console.error('❌ templateName:', templateName, 'type:', typeof templateName);
        templateName = 'aa'; // Force set to 'aa' as fallback
      }
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
    
    // CRITICAL: Final safety check - ensure templateName is set for first messages
    // BUT: Only if user didn't explicitly request no template (explicitlyNoTemplate)
    if (isFirstMessage && !explicitlyNoTemplate && (!templateName || typeof templateName !== 'string' || templateName.trim().length === 0)) {
      console.error('❌ CRITICAL ERROR: First message requires template but templateName is not set!');
      console.error('❌ templateName:', templateName, 'type:', typeof templateName);
      console.error('❌ Forcing templateName to "aa" for first message');
      templateName = 'aa';
      // Ensure templateParams are set for "aa" template
      // Template "aa" expects: guest_name, event_type, groom_name, bride_name, event_date, event_time, venue, couple_name
      const eventData = recipient.eventData;
      if (eventData && !templateParams) {
        templateParams = {
          paramsOrder: ['guest_name', 'event_type', 'groom_name', 'bride_name', 
                       'event_date', 'event_time', 'venue', 'couple_name'],
          guest_name: recipient.firstName,
          event_type: eventData.eventTypeHebrew || 'חתונה',
          groom_name: eventData.groomName || '',
          bride_name: eventData.brideName || '',
          event_date: eventData.eventDate || '',
          event_time: eventData.eventTime || '',
          venue: eventData.venue || '',
          couple_name: eventData.coupleName || '',
          language: 'he'
        };
      } else if (!templateParams) {
        templateParams = {
          language: 'he'
        };
      }
    }
    
    // CRITICAL: Add event invitation image to templateParams so it's used as header image
    // This ensures event invitation image is always used, not campaign image
    if (recipient.eventData?.invitationImageUrl && templateParams) {
      (templateParams as any).headerImageUrl = recipient.eventData.invitationImageUrl;
      (templateParams as any).eventData = recipient.eventData; // Also pass full eventData for reference
    }
    
    // CRITICAL: Final validation before sending
    console.log('🔍 FINAL CHECK before sending:', {
      templateName,
      templateNameType: typeof templateName,
      templateNameLength: templateName ? templateName.length : 0,
      isFirstMessage,
      explicitlyNoTemplate,
      hasTemplateParams: !!templateParams,
      templateParamsKeys: templateParams ? Object.keys(templateParams) : []
    });
    
    // CRITICAL: Ensure templateName is never undefined for first messages
    // BUT: Only if user didn't explicitly request no template (explicitlyNoTemplate)
    // This prevents "templateName is not defined" errors while respecting user's choice
    if (isFirstMessage && !explicitlyNoTemplate && (templateName === undefined || templateName === null || (typeof templateName === 'string' && templateName.trim().length === 0))) {
      console.error('❌ CRITICAL: templateName is invalid for first message, forcing to "aa"');
      templateName = 'aa';
      // Ensure templateParams are set
      // Template "aa" expects: guest_name, event_type, groom_name, bride_name, event_date, event_time, venue, couple_name
      if (!templateParams) {
        const eventData = recipient.eventData;
        templateParams = eventData ? {
          paramsOrder: ['guest_name', 'event_type', 'groom_name', 'bride_name', 
                       'event_date', 'event_time', 'venue', 'couple_name'],
          guest_name: recipient.firstName,
          event_type: eventData.eventTypeHebrew || 'חתונה',
          groom_name: eventData.groomName || '',
          bride_name: eventData.brideName || '',
          event_date: eventData.eventDate || '',
          event_time: eventData.eventTime || '',
          venue: eventData.venue || '',
          couple_name: eventData.coupleName || '',
          language: 'he'
        } : { language: 'he' };
      }
    }
    
    // CRITICAL: For free-form messages, pass eventData and guest name in templateParams so whatsappService can use it for retry
    // This ensures that if Meta rejects the free-form message (error 131047), whatsappService can retry with template "aa"
    let finalTemplateParams = templateParams;
    if (!templateParams && recipient.eventData) {
      // Pass eventData and guest name in templateParams even for free-form messages so retry can use it
      finalTemplateParams = {
        eventData: recipient.eventData,
        guestName: recipient.firstName, // Pass guest name for retry with template "aa"
        language: 'he'
      } as any;
    } else if (templateParams && recipient.eventData) {
      // Add eventData and guest name to existing templateParams
      finalTemplateParams = {
        ...templateParams,
        eventData: recipient.eventData,
        guestName: recipient.firstName // Pass guest name for retry with template "aa"
      } as any;
    }
    
    // CRITICAL: Only include buttons if we're using a template
    // For free-form messages (templateName === undefined), buttons should NOT be included
    // Meta API rejects regular text messages with buttons
    const shouldIncludeButtons = templateName && templateName.trim().length > 0;
    
    const whatsappMessage: WhatsAppMessage = {
      to: recipient.phoneNumber,
      message: processedMessage,
      imageUrl: imageUrl, // This is already set to event.invitationImageUrl || campaign.imageUrl
      templateName: templateName, // This should never be undefined for first messages
      templateParams: finalTemplateParams,
      buttons: shouldIncludeButtons ? recipient.buttons : undefined // Only include buttons for templates
    };
    
    // Final validation log
    console.log('✅ WhatsApp message prepared:', {
      to: whatsappMessage.to,
      hasTemplate: !!whatsappMessage.templateName,
      templateName: whatsappMessage.templateName,
      isFirstMessage,
      hasButtons: !!whatsappMessage.buttons && whatsappMessage.buttons.length > 0,
      hasTemplateParams: !!whatsappMessage.templateParams,
      templateParamsKeys: whatsappMessage.templateParams ? Object.keys(whatsappMessage.templateParams) : [],
      templateParamsParamsOrder: whatsappMessage.templateParams?.paramsOrder
    });
    
    console.log('🔘 DEBUG: WhatsApp message buttons:', whatsappMessage.buttons);
    console.log('🔘 DEBUG: WhatsApp message buttons length:', whatsappMessage.buttons?.length || 0);
    console.log('📋 DEBUG: Full templateParams being sent:', JSON.stringify(whatsappMessage.templateParams, null, 2));
    
    // CRITICAL: Validate message before sending
    if (!whatsappMessage.to || !whatsappMessage.to.trim()) {
      console.error('❌ CRITICAL ERROR: Recipient phone number is missing or empty!');
      return {
        recipientId: recipient.id,
        recipientName: `${recipient.firstName} ${recipient.lastName}`,
        phoneNumber: recipient.phoneNumber,
        channel: 'whatsapp',
        success: false,
        error: 'Recipient phone number is missing or empty'
      };
    }
    
    if (whatsappMessage.templateName && (!whatsappMessage.templateParams || Object.keys(whatsappMessage.templateParams).length === 0)) {
      console.warn('⚠️ WARNING: Template specified but no template parameters provided');
      console.warn('⚠️ Template name:', whatsappMessage.templateName);
      console.warn('⚠️ This may cause the message to fail');
    }

    console.log('🚀 About to send WhatsApp message...');
    const response = await whatsappService.sendMessage(whatsappMessage);
    console.log('📊 WhatsApp service response:', {
      success: response.success,
      messageId: response.messageId,
      error: response.error,
      warning: response.warning
    });
    
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

  // Check WhatsApp availability for multiple recipients
  async checkWhatsAppAvailability(recipients: MessageRecipient[]): Promise<MessageRecipient[]> {
    // All recipients use WhatsApp only
    return recipients.map(recipient => ({
      ...recipient,
      channel: 'whatsapp' as const
    }));
  }

  // Get message statistics
  getMessageStats(results: MessageResult[]) {
    const whatsappResults = results.filter(r => r.channel === 'whatsapp');

    return {
      total: results.length,
      successful: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
      whatsapp: {
        total: whatsappResults.length,
        successful: whatsappResults.filter(r => r.success).length,
        failed: whatsappResults.filter(r => !r.success).length
      }
    };
  }
}

export const messageService = new MessageService();
