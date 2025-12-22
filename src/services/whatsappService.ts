// WhatsApp Business API Service
export interface WhatsAppMessage {
  to: string;
  message: string;
  imageUrl?: string;
  templateName?: string;
  templateParams?: Record<string, string>;
  buttons?: Array<{
    type: 'url' | 'reply';
    url?: string;
    title: string;
    id?: string; // For reply buttons
  }>;
}

export interface WhatsAppResponse {
  success: boolean;
  messageId?: string;
  error?: string;
  contact?: any; // WhatsApp contact info from API response
  warning?: string; // Warning message for user
}

class WhatsAppService {
  private accessToken = import.meta.env.VITE_WHATSAPP_ACCESS_TOKEN || 'EAAQ16mfCx58BPZCAepGf7EQMznC5dwYUmsun7pZCvzLPqjOjnq778EeJtXGEdemBVXdqTEt9pJ0bm2l5EyL9BZAR9kVS15kjz9rWYAcbKZCZBVOQswHeZAfmkUNv2TZAeX8KGaJ8OZCb4ZCtOaZAEZARqvG2TE7DHCmZBDWRATOKdvfHZA4j8FGluUX8NNGdsqbBEVgFjNgZDZD';
  private phoneNumberId = import.meta.env.VITE_WHATSAPP_PHONE_NUMBER_ID || '874204535776090'; // Phone Number ID
  
  constructor() {
    try {
      // WhatsApp Service initialized
    } catch (error) {
      console.error('❌ Error initializing WhatsApp Service:', error);
      // Don't throw - allow app to continue loading
    }
  }

  // Get meaningful placeholder value for empty parameters
  private getPlaceholderForParameter(paramName: string): string {
    const placeholders: Record<string, string> = {
      'guest_name': 'אורח',
      'event_type': 'אירוע',
      'groom_name': 'חתן',
      'bride_name': 'כלה',
      'event_date': 'תאריך',
      'event_time': 'שעה',
      'venue': 'מיקום',
      'couple_name': 'זוג',
      'guest_response_link': 'קישור'
    };
    
    return placeholders[paramName] || 'ערך';
  }

  async sendMessage(messageData: WhatsAppMessage): Promise<WhatsAppResponse> {
    try {
      console.log('📱 WhatsApp Message:', messageData);
      console.log('📞 To:', messageData.to);
      console.log('💬 Message:', messageData.message.substring(0, 100) + '...');
      console.log('🖼️ Image URL:', messageData.imageUrl || 'None');
      console.log('🔘 Buttons:', messageData.buttons || 'None');

      // Handle local file paths - skip them (can't access local files from browser)
      let finalImageUrl = messageData.imageUrl;
      if (messageData.imageUrl && (messageData.imageUrl.startsWith('file://') || messageData.imageUrl.match(/^[A-Z]:\\/i))) {
        console.error('❌ Local file path detected:', messageData.imageUrl);
        console.error('⚠️ Cannot send local files via WhatsApp Business API');
        console.error('💡 Solution: Upload the image through Dashboard → Edit Event → Upload Image File');
        console.error('💡 Or use a web URL (HTTP/HTTPS) for the image');
        finalImageUrl = undefined; // Skip local files
      }

      // Use WhatsApp Business API directly
      const phoneNumber = messageData.to.replace(/^0/, '972').replace(/[^0-9]/g, '');
      const accessToken = this.accessToken;
      const phoneNumberId = this.phoneNumberId;
      
      // Build message payload - exactly as Meta requires
      // Reference: https://developers.facebook.com/docs/whatsapp/cloud-api/reference/messages
      let messagePayload: any = {
        messaging_product: 'whatsapp',
        recipient_type: 'individual', // Optional but recommended by Meta
        to: phoneNumber
      };

      // CRITICAL: Declare templateName at outer scope so it's accessible throughout all blocks (including error handling)
      const templateName = (messageData.templateName || '').toLowerCase();
      const templateNameOriginal = messageData.templateName; // Keep original for comparisons
      
      // CRITICAL: Save reference to original templateParams for rebuilding components later
      // Log what we're receiving to debug
      console.log('🔍 DEBUG: messageData.templateParams received:', {
        hasTemplateParams: !!messageData.templateParams,
        templateParamsKeys: messageData.templateParams ? Object.keys(messageData.templateParams) : [],
        guest_response_link: messageData.templateParams ? (messageData.templateParams as any).guest_response_link : undefined,
        paramsOrder: messageData.templateParams ? (messageData.templateParams as any).paramsOrder : undefined,
        fullTemplateParams: messageData.templateParams
      });
      const originalTemplateParams = messageData.templateParams ? { ...messageData.templateParams } : undefined;

      // If template is provided, send template message (for first messages)
      // CRITICAL: Validate templateName before using it
      if (messageData.templateName && typeof messageData.templateName === 'string' && messageData.templateName.trim().length > 0) {
        console.log('📋 Sending template message:', messageData.templateName);
        
        // SIMPLE: For hello_world and aa templates, use simple payload like curl
        if (templateName === 'hello_world') {
          messagePayload.type = 'template';
          messagePayload.template = {
            name: 'hello_world',
            language: {
              code: 'en_US'
            }
          };
          // No components needed for hello_world - it's that simple!
          // Skip all the complex logic below and go directly to sending
        } else if (templateName === 'simple_invitation') {
          // NEW SIMPLE TEMPLATE: Uses positional parameters ({{1}}, {{2}}, etc.) - NO parameter_name needed
          messagePayload.type = 'template';
          messagePayload.template = {
            name: 'simple_invitation',
            language: {
              code: 'he'
            }
          };
          
          // Get data from templateParams
          const eventData = (messageData.templateParams as any)?.eventData || {};
          const guestName = (messageData.templateParams as any)?.guestName || messageData.to || 'אורח';
          const guestResponseLink = (messageData.templateParams as any)?.guest_response_link || '';
          
          // Get image URL
          const headerImageFromParams = (messageData.templateParams as any)?.headerImageUrl;
          const eventInvitationImage = eventData?.invitationImageUrl;
          const headerImageUrl = headerImageFromParams || eventInvitationImage || messageData.imageUrl;
          
          // Build 10 body parameters WITHOUT parameter_name (positional parameters)
          // Order: guest_name, event_type, groom_name, bride_name, event_date, event_time, venue, couple_name, guest_response_link, couple_name (again for signature)
          const bodyParams = [
            { type: 'text', text: (guestName && guestName.trim()) || 'אורח' }, // {{1}}
            { type: 'text', text: (eventData.eventTypeHebrew && eventData.eventTypeHebrew.trim()) || 'חתונה' }, // {{2}}
            { type: 'text', text: (eventData.groomName && eventData.groomName.trim()) || 'חתן' }, // {{3}}
            { type: 'text', text: (eventData.brideName && eventData.brideName.trim()) || 'כלה' }, // {{4}}
            { type: 'text', text: (eventData.eventDate && eventData.eventDate.trim()) || 'תאריך האירוע' }, // {{5}}
            { type: 'text', text: (eventData.eventTime && eventData.eventTime.trim()) || 'שעת האירוע' }, // {{6}}
            { type: 'text', text: (eventData.venue && eventData.venue.trim()) || 'מיקום האירוע' }, // {{7}}
            { type: 'text', text: (eventData.coupleName && eventData.coupleName.trim()) || (eventData.groomName && eventData.brideName ? `${eventData.groomName} & ${eventData.brideName}` : 'הזוג') }, // {{8}}
            { type: 'text', text: (guestResponseLink && guestResponseLink.trim()) || 'https://rsvp-frontend-wy47.onrender.com' }, // {{9}}
            { type: 'text', text: (eventData.coupleName && eventData.coupleName.trim()) || (eventData.groomName && eventData.brideName ? `${eventData.groomName} & ${eventData.brideName}` : 'הזוג') } // {{10}} - for signature
          ];
          
          // Validate all parameters are non-empty
          bodyParams.forEach((param, index) => {
            if (!param.text || param.text.trim().length === 0) {
              console.warn(`⚠️ Parameter ${index + 1} is empty, using placeholder`);
              param.text = `פרמטר ${index + 1}`;
            }
          });
          
          console.log('📋 Body parameters for template "simple_invitation":', bodyParams.map((p, i) => `${i + 1}. "${p.text.substring(0, 30)}${p.text.length > 30 ? '...' : ''}"`));
          
          // Build components array - start with body
          const components: any[] = [
            {
              type: 'body',
              parameters: bodyParams
            }
          ];
          
          // Add header image if available
          const isValidImageUrl = headerImageUrl && (
            headerImageUrl.startsWith('https://') || 
            headerImageUrl.startsWith('http://')
          );
          
          if (isValidImageUrl) {
            let imageUrlForMeta = headerImageUrl;
            if (headerImageUrl.startsWith('http://')) {
              imageUrlForMeta = headerImageUrl.replace('http://', 'https://');
            }
            
            components.unshift({
              type: 'header',
              parameters: [
                {
                  type: 'image',
                  image: {
                    link: imageUrlForMeta
                  }
                }
              ]
            });
            console.log('🖼️ ✅ Adding header image to template "simple_invitation":', imageUrlForMeta);
          }
          
          messagePayload.template.components = components;
          
          // Skip all the complex logic below and go directly to sending
        } else if (templateName === 'new' || templateName === 'aa') {
          messagePayload.type = 'template';
          messagePayload.template = {
            name: 'new', // Use "new" template name
            language: {
              code: 'he'
            }
          };
          
          // SIMPLE: Build components for template "new" - header image (if needed) + 9 body params + 1 URL button
          // Get data from templateParams (eventData, guestName, guest_response_link, headerImageUrl)
          const eventData = (messageData.templateParams as any)?.eventData || {};
          const guestName = (messageData.templateParams as any)?.guestName || messageData.to || 'אורח';
          const guestResponseLink = (messageData.templateParams as any)?.guest_response_link || '';
          
          // CRITICAL: Get image URL - priority: headerImageUrl from params > eventData.invitationImageUrl > messageData.imageUrl
          // This ensures event invitation image is always used
          const headerImageFromParams = (messageData.templateParams as any)?.headerImageUrl;
          const eventInvitationImage = eventData?.invitationImageUrl;
          const headerImageUrl = headerImageFromParams || eventInvitationImage || messageData.imageUrl;
          
          console.log('🖼️ Image URL sources for template "new":', {
            headerImageFromParams,
            eventInvitationImage,
            messageDataImageUrl: messageData.imageUrl,
            finalHeaderImageUrl: headerImageUrl
          });
          
          // Build 9 body parameters with parameter_name (template "new" uses NAMED parameters)
          // NOTE: Template "new" requires 9 body parameters (unlike "aa" which requires 8)
          // CRITICAL: Template "new" uses NAMED parameters, so parameter_name is REQUIRED
          // CRITICAL: All parameters MUST have non-empty values - Meta rejects empty parameters
          const bodyParams = [
            { type: 'text', text: (guestName && guestName.trim()) || 'אורח', parameter_name: 'guest_name' },
            { type: 'text', text: (eventData.eventTypeHebrew && eventData.eventTypeHebrew.trim()) || 'חתונה', parameter_name: 'event_type' },
            { type: 'text', text: (eventData.groomName && eventData.groomName.trim()) || 'חתן', parameter_name: 'groom_name' },
            { type: 'text', text: (eventData.brideName && eventData.brideName.trim()) || 'כלה', parameter_name: 'bride_name' },
            { type: 'text', text: (eventData.eventDate && eventData.eventDate.trim()) || 'תאריך האירוע', parameter_name: 'event_date' },
            { type: 'text', text: (eventData.eventTime && eventData.eventTime.trim()) || 'שעת האירוע', parameter_name: 'event_time' },
            { type: 'text', text: (eventData.venue && eventData.venue.trim()) || 'מיקום האירוע', parameter_name: 'venue' },
            { type: 'text', text: (eventData.coupleName && eventData.coupleName.trim()) || (eventData.groomName && eventData.brideName ? `${eventData.groomName} ו-${eventData.brideName}` : 'הזוג'), parameter_name: 'couple_name' },
            { type: 'text', text: (guestResponseLink && guestResponseLink.trim()) || 'https://rsvp-frontend-wy47.onrender.com', parameter_name: 'guest_response_link' } // 9th parameter
          ];
          
          // CRITICAL: Validate all parameters are non-empty
          bodyParams.forEach((param, index) => {
            if (!param.text || param.text.trim().length === 0) {
              console.warn(`⚠️ Parameter ${index + 1} (${param.parameter_name}) is empty, using placeholder`);
              param.text = this.getPlaceholderForParameter(param.parameter_name || `param_${index + 1}`);
            }
          });
          
          console.log('📋 Body parameters for template "new":', bodyParams.map((p, i) => `${i + 1}. ${p.parameter_name}: "${p.text.substring(0, 30)}${p.text.length > 30 ? '...' : ''}"`));
          
          // Build components array - start with body
          const components: any[] = [
            {
              type: 'body',
              parameters: bodyParams
            }
          ];
          
          // CRITICAL: Always add header image component if we have a valid image URL
          // Template "new" should include event invitation image in header
          const isValidImageUrl = headerImageUrl && (
            headerImageUrl.startsWith('https://') || 
            headerImageUrl.startsWith('http://')
          );
          
          if (isValidImageUrl) {
            let imageUrlForMeta = headerImageUrl;
            if (headerImageUrl.startsWith('http://')) {
              imageUrlForMeta = headerImageUrl.replace('http://', 'https://');
              console.log('🖼️ ⚠️ Converting HTTP to HTTPS for Meta:', imageUrlForMeta);
            }
            
            // Add header component with image
            // NOTE: For header IMAGE parameters, parameter_name is NOT used (images are positional, not named)
            // Only text body parameters use parameter_name
            components.unshift({
              type: 'header',
              parameters: [
                {
                  type: 'image',
                  image: {
                    link: imageUrlForMeta
                  }
                  // NOTE: NO parameter_name for image - images don't use named variables
                }
              ]
            });
            console.log('🖼️ ✅ Adding header image to template "new":', imageUrlForMeta);
            console.log('🖼️ 📋 Header component added to payload');
          } else {
            console.log('⚠️ Template "new" - no header image URL provided or invalid URL');
            console.log('⚠️ Image URL was:', headerImageUrl);
            console.log('⚠️ This may cause the message to fail if template requires header image');
          }
          
          // NOTE: Template "new" does NOT have a button component
          // Do NOT add button component - template "new" only has header image + body parameters
          
          messagePayload.template.components = components;
          
          // Skip all the complex logic below and go directly to sending
        } else {
          // For other templates, use the complex logic
          messagePayload.type = 'template';
          messagePayload.template = {
            name: messageData.templateName, // Use original templateName (preserves case)
            language: {
              code: messageData.templateParams?.language || 'he' // Default to Hebrew for template "a"
            }
          };
        
        // CRITICAL: For template "aa", rebuild components array FIRST before building regular components
        // This ensures we have exactly what Meta expects: ONLY body component with 8 parameters + 1 URL button
        // Use templateName (lowercase) for comparison to handle both 'aa' and 'AA'
        if (templateName === 'aa' && 
            messageData.templateParams && 
            Object.keys(messageData.templateParams).length > 0) {
          console.log('🔄 Building components array for template "aa" from original templateParams FIRST...');
          
          const expectedParams = ['guest_name', 'event_type', 'groom_name', 'bride_name', 
                                 'event_date', 'event_time', 'venue', 'couple_name'];
          
          // Build parameters array from original templateParams
          const rebuiltParams: any[] = [];
          for (let i = 0; i < 8; i++) {
            const paramKey = expectedParams[i];
            let paramValue: string;
            
            if (originalTemplateParams && paramKey in originalTemplateParams) {
              const rawValue = originalTemplateParams[paramKey];
              if (rawValue !== undefined && rawValue !== null) {
                const strValue = String(rawValue).trim();
                paramValue = strValue.length > 0 ? strValue : this.getPlaceholderForParameter(paramKey);
              } else {
                paramValue = this.getPlaceholderForParameter(paramKey);
              }
            } else {
              paramValue = this.getPlaceholderForParameter(paramKey);
            }
            
            // CRITICAL: Ensure paramValue is never empty - Meta rejects empty parameters
            const finalParamValue = paramValue.trim().length > 0 ? paramValue.trim() : this.getPlaceholderForParameter(paramKey);
            
            if (paramValue.trim().length === 0) {
              console.warn(`⚠️ Parameter ${i + 1}/8 [${paramKey}] is empty, using placeholder: "${finalParamValue}"`);
            }
            
            rebuiltParams.push({
              type: 'text',
              text: finalParamValue
            });
            
            console.log(`📋 Parameter ${i + 1}/8 [${paramKey}]: "${finalParamValue.substring(0, 50)}${finalParamValue.length > 50 ? '...' : ''}"`);
          }
          
          // Build components array with body component AND URL button component
          const rebuiltComponents: any[] = [{
            type: 'body',
            parameters: rebuiltParams
          }];
          
          // CRITICAL: Add URL button component if guest_response_link is available
          console.log('🔍 DEBUG: Looking for guest_response_link:', {
            originalTemplateParams: originalTemplateParams ? Object.keys(originalTemplateParams) : 'undefined',
            originalTemplateParamsGuestResponseLink: originalTemplateParams?.guest_response_link,
            messageDataTemplateParamsGuestResponseLink: (messageData.templateParams as any)?.guest_response_link
          });
          const guestResponseLink = originalTemplateParams?.guest_response_link || 
                                   (messageData.templateParams as any)?.guest_response_link || '';
          console.log('🔍 DEBUG: Final guestResponseLink:', guestResponseLink);
          if (guestResponseLink) {
            rebuiltComponents.push({
              type: 'button',
              sub_type: 'url',
              index: '0',
              parameters: [{
                type: 'text',
                text: guestResponseLink,
                // CRITICAL: For URL button parameters, Meta may require parameter_name
                // Try with parameter_name matching the variable name in the template
                parameter_name: 'url' // Try standard name first
              }]
            });
            console.log(`✅ Added URL button component at index 0 with URL: ${guestResponseLink}`);
          } else {
            console.error('❌ CRITICAL ERROR: Template "aa" requires a URL button parameter but guest_response_link is missing!');
            console.error('❌ The template has a URL button "לעדכון סטטוס הגעה" at index 0 that requires a URL parameter');
            console.error('❌ This will cause Meta API error 100 or 132018');
          }
          
          messagePayload.template.components = rebuiltComponents;
          console.log(`✅ Built components array for template "aa" with exactly 8 body parameters + 1 URL button`);
          
          // Skip the regular component building logic for template "aa"
          // Go directly to final validation and sending
        } else if (templateName !== 'hello_world' && 
            messageData.templateParams && 
            Object.keys(messageData.templateParams).length > 0) {
          const components: any[] = [];
          
          // Body parameters - WhatsApp expects parameters as an array in order
          // If templateParams is already an array, use it directly
          // Otherwise, convert object to array in the correct order
          let bodyParams: any[] = [];
          // CRITICAL: Declare filteredParamsOrder at outer scope so it's accessible everywhere
          let filteredParamsOrder: string[] = [];
          
          if (Array.isArray(messageData.templateParams)) {
            // If it's already an array, use it directly
            bodyParams = messageData.templateParams.map((param: any) => ({
              type: 'text',
              text: typeof param === 'string' ? param : param.text || param.value || String(param)
            }));
            // For array params, filteredParamsOrder is empty (not used)
            filteredParamsOrder = [];
          } else {
            // Convert object to array - parameters must be in order (1, 2, 3...)
            // Check if there's a paramsOrder array to specify the order
            // Default parameter order matching Meta template format
            // Template "aa" requires 8 parameters in order: guest_name, event_type, groom_name, bride_name, event_date, event_time, venue, couple_name
            // Template "a" requires 7 parameters: guest_name, event_type, event_date, event_time, venue, guest_response_link, couple_name
            // NOTE: For template "aa", guest_response_link is NOT in body parameters - it's only used for the button
            let paramsOrder: string[] = (Array.isArray(messageData.templateParams.paramsOrder) 
              ? messageData.templateParams.paramsOrder 
              : templateName === 'aa'
                ? ['guest_name', 'event_type', 'groom_name', 'bride_name', 
                   'event_date', 'event_time', 'venue', 'couple_name']
                : ['guest_name', 'event_type', 'event_date', 'event_time', 'venue', 'guest_response_link', 'couple_name']) as string[];
            
            // CRITICAL FIX: Remove guest_response_link from body params for template "aa" if it exists
            // Template "aa" does NOT include guest_response_link in body parameters - it's only used for the button
            if (templateName === 'aa') {
              paramsOrder = paramsOrder.filter(key => key !== 'guest_response_link');
            }
            
            // IMPORTANT: Meta requires ALL parameters to be sent in the exact order
            // Even if a parameter is empty, we must send it (as empty string)
            // The filter only removes 'language' and 'paramsOrder' keys, but keeps all actual template parameters
            // CRITICAL: Also filter out 'guest_response_link' for template "aa" body params (it's only for button)
            
            // CRITICAL: Validate that all required parameters exist in templateParams
            const missingParams: string[] = [];
            filteredParamsOrder = paramsOrder.filter((key: string) => 
              key !== 'language' && 
              key !== 'paramsOrder' && 
              !(templateName === 'aa' && key === 'guest_response_link')
            );
            
            // CRITICAL: Check for extra parameters in templateParams that aren't in paramsOrder
            const allowedKeys = ['language', 'paramsOrder', 'guest_response_link', 'headerImageUrl', 'eventData', ...filteredParamsOrder];
            const extraParams: string[] = [];
            Object.keys(messageData.templateParams || {}).forEach((key: string) => {
              if (!allowedKeys.includes(key)) {
                extraParams.push(key);
                console.warn(`⚠️ Extra parameter "${key}" found in templateParams but not in paramsOrder - will be ignored`);
              }
            });
            
            if (extraParams.length > 0) {
              console.warn(`⚠️ Extra parameters in templateParams (will be ignored):`, extraParams);
              console.warn(`⚠️ Only parameters in paramsOrder will be sent:`, filteredParamsOrder);
            }
            
            filteredParamsOrder.forEach((key: string) => {
              if (!(key in messageData.templateParams!)) {
                missingParams.push(key);
                console.error(`❌ CRITICAL: Parameter "${key}" is missing from templateParams!`);
                console.error(`❌ Available keys in templateParams:`, Object.keys(messageData.templateParams || {}));
              }
            });
            
            if (missingParams.length > 0) {
              console.error(`❌ Missing parameters for template "${templateName}":`, missingParams);
              console.error(`❌ This will cause Meta API error 100: "Parameter name is missing or empty"`);
              console.error(`❌ Please ensure all parameters are provided in templateParams`);
                }
                
            // CRITICAL: Get eventData if it exists in templateParams (for cases where data is nested)
            const eventData = (messageData.templateParams as any)?.eventData;
            
            // CRITICAL: Helper function to get parameter value from templateParams or eventData
            const getParamValue = (key: string): any => {
              // First try direct access in templateParams
              if (messageData.templateParams && key in messageData.templateParams) {
                return messageData.templateParams[key];
              }
              
              // If not found, try to get from eventData
              if (eventData) {
                // Map parameter keys to eventData properties
                const eventDataMap: { [key: string]: string } = {
                  'guest_name': 'guestName', // This won't be in eventData, but keep for consistency
                  'event_type': 'eventTypeHebrew',
                  'groom_name': 'groomName',
                  'bride_name': 'brideName',
                  'event_date': 'eventDate',
                  'event_time': 'eventTime',
                  'venue': 'venue',
                  'couple_name': 'coupleName'
                };
                
                const eventDataKey = eventDataMap[key];
                if (eventDataKey && eventDataKey in eventData) {
                  return eventData[eventDataKey];
                }
              }
              
              // Also check for guestName in templateParams (for retry scenarios)
              if (key === 'guest_name' && (messageData.templateParams as any)?.guestName) {
                return (messageData.templateParams as any).guestName;
              }
              
              return undefined;
            };
            
            // CRITICAL: Validate all parameters BEFORE constructing bodyParams
            // This ensures we catch any issues early
            const paramValidationErrors: string[] = [];
            filteredParamsOrder.forEach((key: string) => {
              const paramValue = getParamValue(key);
              if (paramValue === undefined || paramValue === null) {
                paramValidationErrors.push(`Parameter "${key}" is undefined or null`);
              } else {
                const strValue = String(paramValue).trim();
                if (strValue.length === 0) {
                  paramValidationErrors.push(`Parameter "${key}" is empty after trim`);
                }
              }
            });
            
            if (paramValidationErrors.length > 0) {
              console.error(`❌ CRITICAL: Parameter validation failed for template "${templateName}":`);
              paramValidationErrors.forEach(err => console.error(`  - ${err}`));
              console.error(`❌ This will cause Meta API error 100: "Parameter name is missing or empty"`);
              console.error(`❌ Please ensure all parameters have valid non-empty values`);
              console.error(`❌ Available keys in templateParams:`, Object.keys(messageData.templateParams || {}));
              if (eventData) {
                console.error(`❌ Available keys in eventData:`, Object.keys(eventData));
              }
            }
            
            bodyParams = filteredParamsOrder.map((key: string, index: number) => {
                // CRITICAL: Check if parameter exists, if not use placeholder value
                // Use helper function to get value from templateParams or eventData
                const paramValue = getParamValue(key);
                
                // Handle undefined, null, or empty values with meaningful placeholders
                let textValue: string;
                if (paramValue === undefined || paramValue === null) {
                  // Use meaningful placeholder based on parameter name
                  const placeholder = this.getPlaceholderForParameter(key);
                  console.warn(`⚠️ Parameter "${key}" (position ${index + 1}) is undefined or null, using placeholder: "${placeholder}"`);
                  textValue = placeholder;
                } else {
                  textValue = String(paramValue).trim();
                  
                  // If empty after trim, use meaningful placeholder
                  if (textValue.length === 0) {
                    const placeholder = this.getPlaceholderForParameter(key);
                    console.warn(`⚠️ Parameter "${key}" (position ${index + 1}) is empty after trim, using placeholder: "${placeholder}"`);
                    textValue = placeholder;
                  }
                }
                
                // CRITICAL: Ensure parameter is never empty - Meta rejects empty parameters
                // Final validation: if textValue is still empty or only whitespace, use placeholder
                let finalValue = textValue.trim();
                if (finalValue.length === 0) {
                  const placeholder = this.getPlaceholderForParameter(key);
                  console.error(`❌ CRITICAL: Parameter "${key}" (position ${index + 1}) is still empty after processing! Using placeholder: "${placeholder}"`);
                  finalValue = placeholder;
                }
                
                // Log each parameter for debugging with position
                console.log(`📋 Parameter ${index + 1}/${filteredParamsOrder.length} [${key}]: "${finalValue.substring(0, 50)}${finalValue.length > 50 ? '...' : ''}" (length: ${finalValue.length})`);
                
                // Return parameter in exact format Meta requires
                // CRITICAL: Body parameters do NOT include parameter_name - only header/button parameters do
                // Body parameters are sent in order, and Meta matches them by position
                // The parameter_name field is ONLY for header and button components, NOT for body parameters
                // Reference: https://developers.facebook.com/docs/whatsapp/cloud-api/guides/send-message-templates
                return {
                  type: 'text',
                  text: finalValue
                };
              });
          }
          
          // Add body component with parameters - Meta requires this exact structure
          // Reference: https://developers.facebook.com/docs/whatsapp/cloud-api/guides/send-message-templates
          if (bodyParams.length > 0) {
              // CRITICAL: Log parameters being sent for debugging
              console.log(`📋 Template "${templateName}" - Sending ${bodyParams.length} body parameters:`);
              bodyParams.forEach((param, index) => {
                console.log(`  ${index + 1}. "${param.text}" (length: ${param.text.length})`);
              });
              
              // CRITICAL: Log the actual paramsOrder being used
              console.log(`📋 paramsOrder used:`, filteredParamsOrder);
              console.log(`📋 Total keys in templateParams:`, Object.keys(messageData.templateParams || {}).length);
              console.log(`📋 Keys in templateParams:`, Object.keys(messageData.templateParams || {}));
              
              // CRITICAL: Fix invalid parameters instead of filtering them out
              // This ensures we send the message even if some parameters are empty
              const fixedBodyParams = bodyParams.map((param: any, index: number) => {
                // Fix invalid parameter structure
                if (!param || typeof param !== 'object') {
                  console.warn(`⚠️ Parameter ${index + 1} has invalid structure, fixing it...`);
                  return {
                    type: 'text',
                    text: this.getPlaceholderForParameter(`param_${index + 1}`)
                  };
                }
                
                // Fix missing or invalid type
                if (!param.type || param.type !== 'text') {
                  console.warn(`⚠️ Parameter ${index + 1} has invalid type, fixing it...`);
                  return {
                    type: 'text',
                    text: param.text || this.getPlaceholderForParameter(`param_${index + 1}`)
                  };
                }
                
                // Fix empty text - use placeholder instead of filtering out
                if (!param.text || typeof param.text !== 'string' || param.text.trim().length === 0) {
                  const placeholder = this.getPlaceholderForParameter(`param_${index + 1}`);
                  console.warn(`⚠️ Parameter ${index + 1} is empty, using placeholder: "${placeholder}"`);
                  return {
                    type: 'text',
                    text: placeholder
                  };
                }
                
                return param;
              });
              
              // Always add body component with fixed parameters (even if some were empty)
              components.push({
                type: 'body',
                parameters: fixedBodyParams
              });
              
              console.log(`✅ Prepared ${fixedBodyParams.length} body parameters (some may be placeholders for empty values)`);
          }
          
          // Always send image as header component if we have a valid HTTPS image URL
          // This ensures the image is displayed with the message
          // Priority: headerImageUrl from templateParams > eventData.invitationImageUrl > imageUrl from messageData
          // CRITICAL: Always prefer event invitation image over campaign image
          const eventInvitationImage = (messageData.templateParams as any)?.eventData?.invitationImageUrl;
          const headerImageFromParams = (messageData.templateParams as any)?.headerImageUrl;
          // CRITICAL: Use headerImageUrl from templateParams if provided, otherwise use event invitation image, then messageData imageUrl
          let headerImageUrl = headerImageFromParams || eventInvitationImage || finalImageUrl;
          
          // CRITICAL FIX: Only add header image if we have a valid URL
          // For template "aa", try sending without header first - only add if we get an error
          const DEFAULT_PLACEHOLDER_IMAGE = 'https://images.unsplash.com/photo-1519167758481-83f550bb49b3?w=800&h=600&fit=crop';
          
          // Check if we have a valid HTTPS image URL for header
          // CRITICAL: Accept both http:// and https:// URLs (some image services use http)
          const isValidImageUrl = headerImageUrl && (
            headerImageUrl.startsWith('https://') || 
            headerImageUrl.startsWith('http://')
          );
          
          // CRITICAL: Template "aa" has a STATIC header image (not a variable) in Meta Business Manager
          // Based on the template image provided by the user, the header image is static
          // Meta does NOT expect a dynamic header parameter for static images
          // Therefore, we should NOT send a header component for template "aa"
          if (templateName === 'aa') {
            // Template "aa" has a static header image - do NOT send header component
            // The image is defined in the template itself in Meta Business Manager
            console.log('ℹ️ Template "aa" - header image is STATIC (not a variable) in Meta Business Manager');
            console.log('ℹ️ Skipping header component (Meta will use the static image from the template)');
            console.log('ℹ️ headerImageUrl provided:', headerImageUrl || 'none');
          } else {
            // For other templates, use the original logic
          if (isValidImageUrl) {
            // Always add header image component if we have a valid HTTP/HTTPS URL
            let imageUrlForMeta = headerImageUrl;
            if (headerImageUrl.startsWith('http://')) {
              imageUrlForMeta = headerImageUrl.replace('http://', 'https://');
              console.log('🖼️ ⚠️ Converting HTTP to HTTPS for Meta:', imageUrlForMeta);
            }
            
            components.unshift({
              type: 'header',
              parameters: [
                {
                  type: 'image',
                  image: {
                    link: imageUrlForMeta
                  }
                }
              ]
            });
            console.log('🖼️ ✅ Adding header image to template:', imageUrlForMeta);
          } else {
            // No valid image URL - check if we should add placeholder
              const templatesRequiringHeader = ['aa', 'a', 'reminer', 'reminder'];
            
            if (templatesRequiringHeader.includes(templateName)) {
              // Template requires header image - add placeholder ONLY if no image was provided
              if (!headerImageUrl) {
                components.unshift({
                  type: 'header',
                  parameters: [
                    {
                      type: 'image',
                      image: {
                        link: DEFAULT_PLACEHOLDER_IMAGE
                      }
                    }
                  ]
                });
                console.log('🖼️ ⚠️ Adding placeholder header image (template requires it, no image provided):', DEFAULT_PLACEHOLDER_IMAGE);
              } else {
                console.log('🖼️ ⚠️ Invalid image URL provided:', headerImageUrl);
                console.log('🖼️ ⚠️ Image must be HTTP/HTTPS URL. Skipping image.');
              }
            } else {
              console.log('ℹ️ No header image URL provided - will send without header');
              console.log('ℹ️ Template name:', messageData.templateName);
              }
            }
          }
          
          // Add buttons if provided (URL buttons for guest response links, Reply buttons for quick actions)
          // IMPORTANT: Even if template has predefined buttons in Meta, URL buttons still need parameters!
          // For templates "aa" and "a", buttons are already defined in Meta, but URL buttons need parameters
          const templatesWithPredefinedButtons = ['aa', 'a', 'reminer', 'reminder'];
          const shouldSkipReplyButtons = templatesWithPredefinedButtons.includes((messageData.templateName || '').toLowerCase());
          const templateNameLower = (messageData.templateName || '').toLowerCase();
          
          // CRITICAL: Template "aa" has ONE URL button at index 0 - we MUST send the URL parameter!
          // The template "aa" in Meta Business Manager has a URL button "לעדכון סטטוס הגעה" at index 0
          // Always add URL button parameters if provided (they are required even for predefined buttons)
          // Only skip Reply buttons for predefined templates (they don't need parameters)
          const buttonComponents: any[] = [];
          
          if (messageData.buttons && messageData.buttons.length > 0) {
            // Find URL button in the buttons array
            const urlButton = messageData.buttons.find(btn => btn.type === 'url' && btn.url);
            const urlButtonIndex = messageData.buttons.findIndex(btn => btn.type === 'url' && btn.url);
            
            // CRITICAL: For templates with predefined buttons, we need to map button positions correctly
            // Template 'aa' has: URL button at index 0
            // But messageData.buttons might have: Reply at index 0, Reply at index 1, URL at index 2
            // We need to find the actual URL button and send its parameter to the correct template index
            
            messageData.buttons.forEach((btn, index) => {
              if (index >= 3) return; // WhatsApp allows max 3 buttons
              
              if (btn.type === 'url' && btn.url) {
                // URL button - ALWAYS needs parameters, even for predefined templates
                // For template 'aa', URL button is at index 0 in the template
                // But in messageData.buttons it might be at a different index
                const templateButtonIndex = shouldSkipReplyButtons && (messageData.templateName?.toLowerCase() === 'aa')
                  ? '0' // Template 'aa' has URL button at index 0
                  : index.toString(); // For other templates, use the array index
                
                buttonComponents.push({
                  type: 'button',
                  sub_type: 'url',
                  index: templateButtonIndex,
                  parameters: [{
                    type: 'text',
                    text: btn.url
                    // CRITICAL: URL button parameters do NOT need parameter_name for predefined buttons
                    // parameter_name is only needed for dynamic buttons, not for template-defined buttons
                    // Template "aa" has a predefined URL button - we just send the URL value
                  }]
                });
                console.log(`🔘 Adding URL button parameter: index ${templateButtonIndex} in template, array index ${index}, URL: ${btn.url}`);
              } else if (btn.type === 'reply' && !shouldSkipReplyButtons) {
                // Reply button - only add if template doesn't have predefined buttons
                // Note: Reply buttons don't need parameters, they're already defined in Meta
                buttonComponents.push({
                  type: 'button',
                  sub_type: 'quick_reply',
                  index: index.toString()
                });
                console.log(`🔘 Adding Reply button ${index}:`, btn.id || btn.title);
              } else if (btn.type === 'reply' && shouldSkipReplyButtons) {
                console.log(`ℹ️ Skipping Reply button ${index} - template has predefined buttons`);
              }
            });
            
            // CRITICAL: Add URL button parameter if template has predefined URL button but no URL in buttons array
            if (shouldSkipReplyButtons && messageData.templateParams?.guest_response_link && !urlButton) {
              console.log('🔘 CRITICAL: Template has predefined URL button but no URL in buttons array - adding from templateParams');
              console.log('🔘 URL parameter:', messageData.templateParams.guest_response_link);
              
              const urlButtonComponent = {
                type: 'button',
                sub_type: 'url',
                index: '0', // Template 'aa' and 'a' have URL button at index 0
                parameters: [{
                  type: 'text',
                  text: messageData.templateParams.guest_response_link
                  // CRITICAL: URL button parameters do NOT need parameter_name for predefined buttons
                  // parameter_name is only needed for dynamic buttons, not for template-defined buttons
                  // Template "aa" has a predefined URL button - we just send the URL value
                }]
              };
              
              buttonComponents.push(urlButtonComponent);
              console.log(`🔘 Added URL button parameter for predefined template button at index 0`);
            }
          } else if (shouldSkipReplyButtons && messageData.templateParams?.guest_response_link) {
            // CRITICAL FIX: Template 'aa' and 'a' have a URL button that requires a parameter
            // Even if no buttons are provided in messageData, we need to send the URL parameter
            // The template has a URL button at index 0 that needs the guest_response_link parameter
            console.log('🔘 CRITICAL: Template has predefined URL button - adding parameter from templateParams');
            console.log('🔘 URL parameter:', messageData.templateParams.guest_response_link);
            
              const urlButtonComponent = {
                type: 'button',
                sub_type: 'url',
                index: '0', // First button (index 0) is the URL button
                parameters: [{
                  type: 'text',
                  text: messageData.templateParams.guest_response_link
                  // CRITICAL: URL button parameters do NOT need parameter_name for predefined buttons
                  // parameter_name is only needed for dynamic buttons, not for template-defined buttons
                  // Template "aa" has a predefined URL button - we just send the URL value
                }]
              };
            
            buttonComponents.push(urlButtonComponent);
            console.log(`🔘 Added URL button parameter for predefined template button`);
          }
          
          // Add all button components
          buttonComponents.forEach(btnComponent => {
            components.push(btnComponent);
          });
          
          if (buttonComponents.length > 0) {
            console.log(`🔘 Added ${buttonComponents.length} button component(s) to template`);
          } else if (shouldSkipReplyButtons && messageData.buttons && messageData.buttons.some(b => b.type === 'reply')) {
            console.log('ℹ️ Template has predefined Reply buttons in Meta - skipping Reply button components');
            console.log('ℹ️ URL button parameters will be added if provided');
          } else if (templateNameLower === 'aa') {
            console.warn('⚠️ WARNING: Template "aa" requires a URL button parameter but none was provided!');
            console.warn('⚠️ The template has a URL button "לעדכון סטטוס הגעה" at index 0 that requires a URL parameter');
            console.warn('⚠️ This may cause Meta API error 100 or 132018');
          }
          
          // CRITICAL: Final validation before adding components
          // For template "aa", ensure we have exactly 8 body parameters, NO header component, and 1 URL button component at index 0
          if (templateName === 'aa') {
            const bodyComponent = components.find((c: any) => c.type === 'body');
            const headerComponent = components.find((c: any) => c.type === 'header');
            const buttonComponents = components.filter((c: any) => c.type === 'button');
            const bodyParamsCount = bodyComponent?.parameters?.length || 0;
            
            if (bodyParamsCount !== 8) {
              console.error(`❌ CRITICAL ERROR: Template "aa" requires exactly 8 body parameters, but ${bodyParamsCount} are being sent!`);
              console.error(`❌ This will cause Meta API error 100 or 132000`);
              console.error(`❌ Expected parameters: guest_name, event_type, groom_name, bride_name, event_date, event_time, venue, couple_name`);
              console.error(`❌ Actual parameters sent:`, bodyComponent?.parameters?.map((p: any, i: number) => `${i + 1}. "${p.text?.substring(0, 30)}..."`));
            }
            
            if (headerComponent) {
              console.error(`❌ CRITICAL ERROR: Template "aa" should NOT have a header component!`);
              console.error(`❌ Header image is STATIC in Meta Business Manager and does not require a parameter`);
              console.error(`❌ Removing header component to prevent error...`);
              // Remove header component
              const headerIndex = components.findIndex((c: any) => c.type === 'header');
              if (headerIndex !== -1) {
                components.splice(headerIndex, 1);
                console.log(`✅ Removed header component`);
              }
            }
            
            // CRITICAL: Template "aa" has ONE URL button at index 0 - validate we have exactly 1 button component
            if (buttonComponents.length === 0 && templateNameLower === 'aa') {
              console.error(`❌ CRITICAL ERROR: Template "aa" requires ONE URL button parameter at index 0!`);
              console.error(`❌ The template has a URL button "לעדכון סטטוס הגעה" that requires a URL parameter`);
              console.error(`❌ This will cause Meta API error 100 or 132018`);
            } else if (buttonComponents.length > 1 && templateNameLower === 'aa') {
              console.error(`❌ CRITICAL ERROR: Template "aa" should have exactly ONE button component (URL at index 0)!`);
              console.error(`❌ Found ${buttonComponents.length} button components - removing extra buttons...`);
              // Keep only the first button (URL button at index 0)
              const urlButtonComponent = buttonComponents.find((btn: any) => btn.sub_type === 'url' && btn.index === '0');
              if (urlButtonComponent) {
                // Remove all buttons and add only the URL button
                const buttonIndices: number[] = [];
                components.forEach((c: any, index: number) => {
                  if (c.type === 'button') {
                    buttonIndices.push(index);
                  }
                });
                // Remove in reverse order to maintain indices
                buttonIndices.reverse().forEach(index => {
                  components.splice(index, 1);
                });
                // Add back only the URL button
                components.push(urlButtonComponent);
                console.log(`✅ Kept only URL button at index 0, removed ${buttonComponents.length - 1} extra button(s)`);
              }
            } else if (buttonComponents.length === 1 && templateNameLower === 'aa') {
              const urlButton = buttonComponents[0];
              if (urlButton.sub_type === 'url' && urlButton.index === '0') {
                console.log(`✅ Template "aa" - correctly configured with ONE URL button at index 0`);
              } else {
                console.error(`❌ CRITICAL ERROR: Template "aa" button component is incorrect!`);
                console.error(`❌ Expected: { type: 'button', sub_type: 'url', index: '0' }`);
                console.error(`❌ Actual:`, urlButton);
              }
            }
          }
          
          // Only add components if we have parameters (Meta requirement)
          // Empty components array is not allowed
          // CRITICAL: For template "aa", ensure body component has exactly 8 parameters
          if (components.length > 0) {
            // CRITICAL: Final validation - ensure body component has valid parameters
            let bodyComponent = components.find((c: any) => c.type === 'body');
            if (bodyComponent && bodyComponent.parameters) {
              // CRITICAL: Fix invalid parameters instead of filtering them out
              // This ensures we send the message even if some parameters are empty
              const fixedParameters = bodyComponent.parameters.map((param: any, index: number) => {
                // Fix invalid parameter structure
                if (!param || typeof param !== 'object') {
                  console.warn(`⚠️ Body parameter ${index + 1} has invalid structure, fixing it...`);
                  return {
                    type: 'text',
                    text: this.getPlaceholderForParameter(`param_${index + 1}`)
                  };
                }
                
                // Fix missing or invalid type
                if (!param.type || param.type !== 'text') {
                  console.warn(`⚠️ Body parameter ${index + 1} has invalid type, fixing it...`);
                  return {
                    type: 'text',
                    text: param.text || this.getPlaceholderForParameter(`param_${index + 1}`)
                  };
                }
                
                // Fix empty text - use placeholder instead of filtering out
                if (!param.text || typeof param.text !== 'string' || param.text.trim().length === 0) {
                  const placeholder = this.getPlaceholderForParameter(`param_${index + 1}`);
                  console.warn(`⚠️ Body parameter ${index + 1} is empty, using placeholder: "${placeholder}"`);
                  return {
                    type: 'text',
                    text: placeholder
                  };
                }
                
                return param;
              });
              
              // CRITICAL: Replace the parameters array with the fixed parameters
              bodyComponent.parameters = fixedParameters;
              
              console.log(`✅ Fixed ${fixedParameters.length} body parameters (some may be placeholders for empty values)`);
            }
            
            // CRITICAL: Always set components if we have body parameters
            // Meta API requires components array when template has dynamic parameters
            // CRITICAL: Ensure components array is properly structured
            messagePayload.template.components = components;
            
            // CRITICAL: Log the full components structure being sent
            console.log('📋 Full components structure being sent:');
            components.forEach((comp, index) => {
              console.log(`  Component ${index + 1}:`, {
                type: comp.type,
                parametersCount: comp.parameters?.length || 0,
                parameters: comp.type === 'body' ? comp.parameters?.map((p: any) => ({ text: p.text?.substring(0, 50) })) : comp.parameters
              });
            });
            
            // CRITICAL: Count actual body parameters being sent
            // Note: bodyComponent already declared above, reuse it
            const headerComponent = components.find((c: any) => c.type === 'header');
            const buttonComponents = components.filter((c: any) => c.type === 'button');
            
            console.log('📊 COMPONENT SUMMARY:');
            console.log(`  - Body parameters: ${bodyComponent?.parameters?.length || 0}`);
            console.log(`  - Header components: ${headerComponent ? 1 : 0}`);
            console.log(`  - Button components: ${buttonComponents.length}`);
            console.log(`  - Total components: ${components.length}`);
            
            if (templateName === 'aa') {
              console.log('📋 Template "aa" requirements:');
              console.log('  - 0 header image components (header image is STATIC in Meta Business Manager)');
              console.log('  - 8 body parameters: guest_name, event_type, groom_name, bride_name, event_date, event_time, venue, couple_name');
              console.log('  - 1 button component (URL button at index 0: "לעדכון סטטוס הגעה")');
              const finalBodyParamsCount = bodyComponent?.parameters?.length || 0;
              const finalHeaderCount = headerComponent ? 1 : 0;
              const finalButtonCount = buttonComponents.length;
              const urlButton = buttonComponents.find((btn: any) => btn.sub_type === 'url' && btn.index === '0');
              console.log(`📊 FINAL VALIDATION: ${finalHeaderCount === 0 ? '✅' : '❌'} ${finalHeaderCount} header (should be 0), ${finalBodyParamsCount === 8 ? '✅' : '❌'} ${finalBodyParamsCount} body params (should be 8), ${finalButtonCount === 1 ? '✅' : '❌'} ${finalButtonCount} buttons (should be 1), ${urlButton ? '✅' : '❌'} URL button at index 0`);
              
              if (finalBodyParamsCount !== 8) {
                console.error(`❌ VALIDATION FAILED: Template "aa" requires exactly 8 body parameters!`);
                console.error(`❌ This payload will be rejected by Meta API with error 100 or 132000`);
              }
              if (finalHeaderCount > 0) {
                console.error(`❌ VALIDATION FAILED: Template "aa" should NOT have header components!`);
                console.error(`❌ This payload will be rejected by Meta API with error 100 or 132012`);
              }
              if (finalButtonCount !== 1) {
                console.error(`❌ VALIDATION FAILED: Template "aa" requires exactly 1 button component (URL at index 0)!`);
                console.error(`❌ Found ${finalButtonCount} button components`);
                console.error(`❌ This payload will be rejected by Meta API with error 100 or 132018`);
              }
              if (!urlButton) {
                console.error(`❌ VALIDATION FAILED: Template "aa" requires a URL button at index 0!`);
                console.error(`❌ The template has a URL button "לעדכון סטטוס הגעה" that requires a URL parameter`);
                console.error(`❌ This payload will be rejected by Meta API with error 100 or 132018`);
              }
            }
          } else {
            // If no parameters, don't send components at all (for templates without parameters)
            console.log('📋 No parameters to send - template will be sent without components');
          }
          
          console.log('📋 Template body parameters:', JSON.stringify(bodyParams, null, 2));
        }
        } // Close the else block for non-hello_world templates (line 116)
      } else {
        // Regular text message
        // CRITICAL: For regular text messages, NEVER include buttons
        // Meta API rejects regular text messages with buttons
        if (messageData.buttons && messageData.buttons.length > 0) {
          console.warn('⚠️ WARNING: Buttons provided for regular text message - ignoring buttons');
          console.warn('⚠️ Meta API does not support buttons in regular text messages');
          console.warn('⚠️ Buttons will be ignored and message will be sent as plain text');
        }
        
        messagePayload.type = 'text';
        messagePayload.text = {
          body: messageData.message
        };

        // If image URL is provided and it's a valid HTTPS URL, send image
        if (finalImageUrl && finalImageUrl.startsWith('https://')) {
          console.log('🖼️ Sending image with message...');
          messagePayload.type = 'image';
          messagePayload.image = {
            link: finalImageUrl,
            caption: messageData.message
          };
        }
      }

      // CRITICAL: Final payload validation before sending
      if (messagePayload.type === 'template' && templateName === 'aa') {
        const bodyParams = messagePayload.template?.components?.find((c: any) => c.type === 'body')?.parameters || [];
        const headerComponent = messagePayload.template?.components?.find((c: any) => c.type === 'header');
        const buttonComponents = messagePayload.template?.components?.filter((c: any) => c.type === 'button') || [];
        
        // Validate each body parameter structure
        bodyParams.forEach((param: any, index: number) => {
          if (!param.type || param.type !== 'text') {
            console.error(`❌ CRITICAL: Body parameter ${index + 1} has invalid type: ${param.type}`);
            console.error(`❌ Expected: { type: 'text', text: 'value' }`);
            console.error(`❌ Actual:`, param);
          }
          if (!param.text || typeof param.text !== 'string') {
            console.error(`❌ CRITICAL: Body parameter ${index + 1} has invalid text field:`, param.text);
          }
          // CRITICAL: Check if text value is empty or only whitespace
          if (param.text && typeof param.text === 'string' && param.text.trim().length === 0) {
            console.error(`❌ CRITICAL: Body parameter ${index + 1} has empty or whitespace-only text value!`);
            console.error(`❌ This will cause Meta API error 100: "Parameter name is missing or empty"`);
            console.error(`❌ Parameter value: "${param.text}"`);
            // Replace with placeholder
            const placeholder = this.getPlaceholderForParameter(`param_${index + 1}`);
            param.text = placeholder;
            console.warn(`⚠️ Replaced empty parameter ${index + 1} with placeholder: "${placeholder}"`);
          }
          // CRITICAL: Check for null or undefined text values
          if (param.text === null || param.text === undefined) {
            console.error(`❌ CRITICAL: Body parameter ${index + 1} has null or undefined text value!`);
            console.error(`❌ This will cause Meta API error 100: "Parameter name is missing or empty"`);
            const placeholder = this.getPlaceholderForParameter(`param_${index + 1}`);
            param.text = placeholder;
            console.warn(`⚠️ Replaced null/undefined parameter ${index + 1} with placeholder: "${placeholder}"`);
          }
          if (param.parameter_name) {
            console.error(`❌ CRITICAL: Body parameter ${index + 1} incorrectly includes 'parameter_name' field!`);
            console.error(`❌ Body parameters should NOT have 'parameter_name' - only header/button parameters do`);
            console.error(`❌ This will cause Meta API error 100`);
            // Remove parameter_name if present
            delete param.parameter_name;
            console.warn(`⚠️ Removed 'parameter_name' from body parameter ${index + 1}`);
          }
        });
        
        // Validate header component (should NOT exist for "aa")
        if (headerComponent) {
          console.error(`❌ CRITICAL: Template "aa" payload includes header component but should NOT!`);
          console.error(`❌ Header component:`, headerComponent);
          console.error(`❌ This will cause Meta API error 100 or 132012`);
        }
        
        // CRITICAL: Template "aa" requires exactly 1 URL button component at index 0
        if (buttonComponents.length === 0) {
          console.error(`❌ CRITICAL: Template "aa" requires ONE URL button component at index 0!`);
          console.error(`❌ The template has a URL button "לעדכון סטטוס הגעה" that requires a URL parameter`);
          console.error(`❌ This will cause Meta API error 100 or 132018`);
        } else if (buttonComponents.length > 1) {
          console.error(`❌ CRITICAL: Template "aa" should have exactly ONE button component, but ${buttonComponents.length} are being sent!`);
          buttonComponents.forEach((btn: any, index: number) => {
            console.error(`❌ Button component ${index + 1}:`, btn);
          });
          console.error(`❌ This will cause Meta API error 132018`);
        } else {
          const urlButton = buttonComponents[0];
          if (urlButton.sub_type !== 'url' || urlButton.index !== '0') {
            console.error(`❌ CRITICAL: Template "aa" button component is incorrect!`);
            console.error(`❌ Expected: { type: 'button', sub_type: 'url', index: '0' }`);
            console.error(`❌ Actual:`, urlButton);
            console.error(`❌ This will cause Meta API error 132018`);
          }
        }
        
        // Final count validation
        if (bodyParams.length !== 8) {
          console.error(`❌ CRITICAL VALIDATION FAILED: Template "aa" requires exactly 8 body parameters!`);
          console.error(`❌ Actual count: ${bodyParams.length}`);
          console.error(`❌ This payload will be REJECTED by Meta API`);
          console.error(`❌ Expected parameters: guest_name, event_type, groom_name, bride_name, event_date, event_time, venue, couple_name`);
        }
        
        // CRITICAL: Log detailed payload structure for template "aa" before sending
        console.log('📋 DETAILED PAYLOAD STRUCTURE FOR TEMPLATE "aa" (BEFORE SENDING):');
        console.log('📋 Body Parameters:', bodyParams.map((p: any, i: number) => ({
          position: i + 1,
          type: p.type,
          text: p.text ? `${p.text.substring(0, 50)}${p.text.length > 50 ? '...' : ''}` : 'MISSING',
          textLength: p.text ? p.text.length : 0,
          isEmpty: !p.text || p.text.trim().length === 0,
          hasParameterName: !!p.parameter_name,
          fullStructure: p // Log full structure for debugging
        })));
        console.log('📋 Button Components:', buttonComponents.map((btn: any) => ({
          type: btn.type,
          sub_type: btn.sub_type,
          index: btn.index,
          parameters: btn.parameters?.map((p: any) => ({
            type: p.type,
            text: p.text ? `${p.text.substring(0, 50)}${p.text.length > 50 ? '...' : ''}` : 'MISSING',
            hasParameterName: !!p.parameter_name,
            fullStructure: p // Log full structure for debugging
          }))
        })));
        
        // CRITICAL: Final validation - ensure all parameters are valid
        const invalidParams: any[] = [];
        bodyParams.forEach((param: any, index: number) => {
          if (!param || typeof param !== 'object') {
            invalidParams.push({ position: index + 1, error: 'Invalid object structure', param });
          } else if (!param.type || param.type !== 'text') {
            invalidParams.push({ position: index + 1, error: 'Missing or invalid type', param });
          } else if (!param.text || typeof param.text !== 'string' || param.text.trim().length === 0) {
            invalidParams.push({ position: index + 1, error: 'Missing or empty text', param });
          } else if (param.parameter_name) {
            invalidParams.push({ position: index + 1, error: 'Has parameter_name (should not)', param });
          }
        });
        
        if (invalidParams.length > 0) {
          console.error(`❌ CRITICAL: Found ${invalidParams.length} invalid body parameter(s):`);
          invalidParams.forEach(invalid => {
            console.error(`  - Position ${invalid.position}: ${invalid.error}`, invalid.param);
          });
          console.error(`❌ This will cause Meta API error 100: "Invalid parameter"`);
        }
      }

      // Log the FULL payload being sent to Meta API
      console.log('📤 FULL PAYLOAD TO META API:');
      console.log(JSON.stringify(messagePayload, null, 2));
      
      // CRITICAL: Detailed payload analysis
      if (messagePayload.type === 'template') {
        const bodyParams = messagePayload.template?.components?.find((c: any) => c.type === 'body')?.parameters || [];
        const headerComponent = messagePayload.template?.components?.find((c: any) => c.type === 'header');
        const buttonComponents = messagePayload.template?.components?.filter((c: any) => c.type === 'button') || [];
        
        console.log('📊 PAYLOAD ANALYSIS:');
        console.log(`  Template name: ${messagePayload.template?.name}`);
        console.log(`  Template language: ${messagePayload.template?.language?.code || 'NOT SET'}`);
        console.log(`  Body parameters count: ${bodyParams.length}`);
        console.log(`  Header component: ${headerComponent ? 'YES' : 'NO'}`);
        console.log(`  Button components count: ${buttonComponents.length}`);
        console.log(`  Total components: ${messagePayload.template?.components?.length || 0}`);
        
        if (messagePayload.template?.name?.toLowerCase() === 'aa') {
              console.log('📋 Template "aa" requirements:');
              console.log('  - MUST NOT have header image component (header image is STATIC in Meta Business Manager)');
              console.log('  - MUST have 8 body parameters');
              console.log('  - MUST have 1 URL button component at index 0 (template has URL button "לעדכון סטטוס הגעה")');
          console.log('  - Language code MUST be set (default: "he")');
          const actualBodyCount = bodyParams.length;
          const actualHeaderCount = headerComponent ? 1 : 0;
          const actualButtonCount = buttonComponents.length;
          const hasLanguage = !!messagePayload.template?.language?.code;
          const urlButton = buttonComponents.find((btn: any) => btn.sub_type === 'url' && btn.index === '0');
          console.log(`📊 ACTUAL PAYLOAD: ${actualHeaderCount === 0 ? '✅' : '❌'} header (${actualHeaderCount}, should be 0), ${actualBodyCount === 8 ? '✅' : '❌'} ${actualBodyCount} body params (should be 8), ${actualButtonCount === 1 ? '✅' : '❌'} ${actualButtonCount} buttons (should be 1), ${urlButton ? '✅' : '❌'} URL button at index 0, ${hasLanguage ? '✅' : '❌'} language code`);
          
          if (actualBodyCount !== 8) {
            console.error(`❌ ERROR: Template "aa" expects 8 body parameters, but ${actualBodyCount} are being sent!`);
            console.error('❌ This will cause Meta API error 100 or 132000');
            console.error('❌ Body parameters being sent:');
            bodyParams.forEach((p: any, i: number) => {
              console.error(`  ${i + 1}. "${p.text?.substring(0, 50)}${p.text?.length > 50 ? '...' : ''}"`);
            });
          }
          
          if (headerComponent) {
            console.error(`❌ ERROR: Template "aa" has a STATIC header image in Meta Business Manager!`);
            console.error('❌ Header image component should NOT be sent (it will cause Meta API error 100)');
            console.error('❌ The header image is defined in the template itself, not as a dynamic parameter');
          }
          
          if (actualButtonCount !== 1) {
            console.error(`❌ ERROR: Template "aa" requires exactly 1 button component (URL at index 0), but ${actualButtonCount} are being sent!`);
            console.error('❌ This will cause Meta API error 100 or 132018');
          } else if (!urlButton) {
            console.error(`❌ ERROR: Template "aa" requires a URL button at index 0, but it was not found!`);
            console.error('❌ The template has a URL button "לעדכון סטטוס הגעה" that requires a URL parameter');
            console.error('❌ This will cause Meta API error 100 or 132018');
          }
          
          if (!hasLanguage) {
            console.error(`❌ ERROR: Template language code is missing!`);
            console.error('❌ This may cause Meta API errors');
          }
        }
      }
      
      console.log('📤 Sending via WhatsApp Business API...');
      console.log('📤 API URL:', `https://graph.facebook.com/v22.0/${phoneNumberId}/messages`);
      console.log('📤 Phone Number ID:', phoneNumberId);
      console.log('📤 Access Token:', accessToken ? `${accessToken.substring(0, 20)}...` : 'MISSING');
      
      // Validate required fields before sending
      if (!accessToken) {
        console.error('❌ CRITICAL ERROR: Access token is missing!');
        return {
          success: false,
          error: 'WhatsApp Access Token is missing. Please check your environment variables.'
        };
      }
      
      if (!phoneNumberId) {
        console.error('❌ CRITICAL ERROR: Phone Number ID is missing!');
        return {
          success: false,
          error: 'WhatsApp Phone Number ID is missing. Please check your environment variables.'
        };
      }
      
      if (!messagePayload.to) {
        console.error('❌ CRITICAL ERROR: Recipient phone number is missing!');
        return {
          success: false,
          error: 'Recipient phone number is missing.'
        };
      }
      
      // CRITICAL: Final validation before sending - ensure components array structure is correct
      // CRITICAL: For template "aa", components array was already built above - just validate here
      if (messagePayload.type === 'template' && messagePayload.template?.components) {
        if (templateName === 'aa') {
          // CRITICAL: Template "aa" components were already built above - just validate here
          console.log('✅ Template "aa" components already built - validating structure...');
          
          const bodyComponent = messagePayload.template.components.find((c: any) => c.type === 'body');
          const headerComponent = messagePayload.template.components.find((c: any) => c.type === 'header');
          const buttonComponents = messagePayload.template.components.filter((c: any) => c.type === 'button');
          
          const bodyParamsCount = bodyComponent?.parameters?.length || 0;
          const headerCount = headerComponent ? 1 : 0;
          const buttonCount = buttonComponents.length;
          const urlButton = buttonComponents.find((btn: any) => btn.sub_type === 'url' && btn.index === '0');
          
          console.log(`📊 VALIDATION: ${headerCount === 0 ? '✅' : '❌'} ${headerCount} header (should be 0), ${bodyParamsCount === 8 ? '✅' : '❌'} ${bodyParamsCount} body params (should be 8), ${buttonCount === 1 ? '✅' : '❌'} ${buttonCount} buttons (should be 1), ${urlButton ? '✅' : '❌'} URL button at index 0`);
          
          if (bodyParamsCount !== 8) {
            console.error(`❌ VALIDATION FAILED: Template "aa" requires exactly 8 body parameters!`);
            console.error(`❌ Actual count: ${bodyParamsCount}`);
          }
          if (headerCount > 0) {
            console.error(`❌ VALIDATION FAILED: Template "aa" should NOT have header components!`);
            // Remove header component
            messagePayload.template.components = messagePayload.template.components.filter((c: any) => c.type !== 'header');
            console.log(`✅ Removed header component`);
          }
          if (buttonCount !== 1 || !urlButton) {
            console.error(`❌ VALIDATION FAILED: Template "aa" requires exactly 1 URL button at index 0!`);
            console.error(`❌ Actual button count: ${buttonCount}`);
            console.error(`❌ URL button at index 0: ${urlButton ? 'Found' : 'Missing'}`);
          }
        } else {
          // For other templates, validate and fix structure
          messagePayload.template.components = messagePayload.template.components.map((comp: any) => {
            if (comp.type === 'body' && comp.parameters) {
              comp.parameters = comp.parameters.map((param: any, index: number) => {
                if (!param || typeof param !== 'object') {
                  console.error(`❌ CRITICAL: Parameter ${index + 1} is not an object:`, param);
                  return { type: 'text', text: ' ' };
                }
                if (!param.type || param.type !== 'text') {
                  console.error(`❌ CRITICAL: Parameter ${index + 1} has invalid type:`, param.type);
                  return { type: 'text', text: param.text || ' ' };
                }
                if (!param.text || typeof param.text !== 'string') {
                  console.error(`❌ CRITICAL: Parameter ${index + 1} has invalid text:`, param.text);
                  return { type: 'text', text: String(param.text || ' ') };
                }
                const trimmedText = param.text.trim();
                if (trimmedText.length === 0) {
                  console.error(`❌ CRITICAL: Parameter ${index + 1} has empty text after trim!`);
                  const placeholder = this.getPlaceholderForParameter(`param_${index + 1}`);
                  return { type: 'text', text: placeholder };
                }
                return {
                  type: 'text',
                  text: trimmedText
                };
              });
              
              if (!comp.parameters || comp.parameters.length === 0) {
                console.error('❌ CRITICAL: Body component has no parameters after validation!');
              }
            }
            return comp;
          });
        }
      }
      
      // Try sending with current payload (may include header image)
      let response = await fetch(`https://graph.facebook.com/v22.0/${phoneNumberId}/messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(messagePayload)
      });

      console.log('📊 WhatsApp Business API response status:', response.status);
      
      // CRITICAL: Always log response for debugging
      if (!response.ok) {
        const responseClone = response.clone();
        try {
          const errorData = await responseClone.json();
          console.error('❌ WhatsApp API Error Response:', JSON.stringify(errorData, null, 2));
          console.error('❌ Error Code:', errorData.error?.code);
          console.error('❌ Error Message:', errorData.error?.message);
          console.error('❌ Error Details:', errorData.error?.error_data?.details);
        } catch (e) {
          console.error('❌ Failed to parse error response:', e);
        }
      }
      
      // Handle template header errors
      if (!response.ok && messagePayload.type === 'template') {
        // Clone response to read it without consuming it
        const responseClone = response.clone();
        let errorData: any = {};
        try {
          errorData = await responseClone.json();
        } catch (e) {
          console.error('❌ Failed to parse error response:', e);
          // Try to read error message from response text
          try {
            const errorText = await responseClone.text();
            console.error('📋 Error response text:', errorText);
          } catch (e2) {
            console.error('❌ Failed to read error response text:', e2);
          }
        }
        
        const errorCode = errorData.error?.code;
        const errorDetails = errorData.error?.error_data?.details || '';
        const errorMessage = errorData.error?.message || '';
        
        console.log('🔍 Error details:', { errorCode, errorDetails, errorMessage });
        
        // CRITICAL: For template "aa" with error 100, try removing header image
        // The header image might be defined as Static (not Variable) in Meta Business Manager
        if (errorCode === 100 && 
            templateName === 'aa' && 
            messagePayload.template?.components?.some((c: any) => c.type === 'header') &&
            (errorDetails.includes('Parameter name is missing or empty') || errorDetails.includes('Invalid parameter'))) {
          console.warn('⚠️ Template "aa" - Error 100 detected with header image');
          console.warn('💡 Header image might be Static (not Variable) in Meta Business Manager');
          console.warn('🔄 Retrying WITHOUT header image...');
          
          // Remove header component and retry
          if (messagePayload.template?.components) {
            const componentsWithoutHeader = messagePayload.template.components.filter(
              (comp: any) => comp.type !== 'header'
            );
            
            const retryPayload = {
              ...messagePayload,
              template: {
                ...messagePayload.template,
                components: componentsWithoutHeader.length > 0 ? componentsWithoutHeader : undefined
              }
            };
            
            if (!retryPayload.template.components || retryPayload.template.components.length === 0) {
              delete retryPayload.template.components;
            }
            
            console.log('📤 RETRY PAYLOAD (without header image for template "aa"):');
            console.log(JSON.stringify(retryPayload, null, 2));
            
            // Retry the request
            const retryResponse = await fetch(`https://graph.facebook.com/v22.0/${phoneNumberId}/messages`, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify(retryPayload)
            });
            
            console.log('📊 Retry response status:', retryResponse.status);
            
            if (retryResponse.ok) {
              console.log('✅ Message sent successfully WITHOUT header image');
              console.warn('💡 Note: Template "aa" header image is Static (not Variable) in Meta Business Manager.');
              console.warn('💡 The image will still appear because it\'s defined in the template itself.');
              // Use the successful retry response
              response = retryResponse;
            } else {
              // Still failed - log the error but continue with original error handling
              const retryResponseClone = retryResponse.clone();
              let errorData2: any = {};
              try {
                errorData2 = await retryResponseClone.json();
                console.error('❌ Retry without header also failed:', errorData2);
              } catch (e) {
                console.error('❌ Failed to parse retry error response:', e);
              }
              // Continue with original error handling - response is already cloned
            }
          }
        }
        
        // Check if template requires header image (error 132012 or error message mentions header/image)
        const requiresHeaderImage = 
          errorCode === 132012 || 
          (errorMessage && (errorMessage.toLowerCase().includes('header') || errorMessage.toLowerCase().includes('image'))) ||
          (errorDetails && (errorDetails.toLowerCase().includes('header') || errorDetails.toLowerCase().includes('image')));
        
        if (requiresHeaderImage) {
          console.warn('⚠️ Template requires header image but no image was provided');
          console.warn('💡 Adding placeholder image to satisfy template requirement...');
          console.warn('📋 Error code:', errorCode);
          console.warn('📋 Error message:', errorMessage);
          console.warn('📋 Error details:', errorDetails);
          
          // Use the image URL from messageData if available, otherwise use placeholder
          const headerImageUrl = messageData.imageUrl || finalImageUrl || DEFAULT_PLACEHOLDER_IMAGE;
          
          // Build components with placeholder header image
          const componentsWithHeader: any[] = [
            {
              type: 'header',
              parameters: [
                {
                  type: 'image',
                  image: {
                    link: headerImageUrl
                  }
                }
              ]
            }
          ];
          
          // Add body parameters if they exist
          if (messagePayload.template?.components) {
            const bodyComponents = messagePayload.template.components.filter(
              (comp: any) => comp.type === 'body' || comp.type === 'button'
            );
            componentsWithHeader.push(...bodyComponents);
          }
          
          const retryPayload = {
            ...messagePayload,
            template: {
              ...messagePayload.template,
              components: componentsWithHeader
            }
          };
          
          console.log('🔄 Retrying with header image...');
          console.log('📤 RETRY PAYLOAD (with header image):');
          console.log(JSON.stringify(retryPayload, null, 2));
          
          response = await fetch(`https://graph.facebook.com/v22.0/${phoneNumberId}/messages`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(retryPayload)
          });
          
          console.log('📊 Retry response status:', response.status);
          
          if (response.ok) {
            console.log('✅ Message sent successfully with header image');
            console.warn('💡 Note: Used header image because template requires it');
          } else {
            // Still failed - log the error (clone to avoid consuming)
            const retryResponseClone = response.clone();
            let errorData2: any = {};
            try {
              errorData2 = await retryResponseClone.json();
            } catch (e) {
              console.error('❌ Failed to parse retry error response:', e);
              try {
                const errorText = await retryResponseClone.text();
                console.error('📋 Retry error response text:', errorText);
                errorData2 = { error: { message: errorText } };
              } catch (e2) {
                console.error('❌ Failed to read retry error response text:', e2);
                errorData2 = { error: { message: 'Unknown error - failed to read response' } };
              }
            }
            console.error('❌ Retry with header image also failed:', errorData2);
            console.error('❌ Retry error code:', errorData2.error?.code);
            console.error('❌ Retry error message:', errorData2.error?.message);
          }
        }
        
        // Error 132018: Button type mismatch or header image issue
        if (errorCode === 132018) {
          // Check if it's a button issue
          if (errorDetails.includes('Button') && errorDetails.includes('does not require parameters')) {
            console.warn('⚠️ Button type mismatch detected');
            console.warn('💡 Template expects different button configuration');
            console.warn('🔄 Retrying without button parameters or with corrected button types...');
            
            // Remove button components and retry (buttons are defined in template, not in payload)
            if (messagePayload.template?.components) {
              const componentsWithoutButtons = messagePayload.template.components.filter(
                (comp: any) => comp.type !== 'button'
              );
              
              const retryPayload = {
                ...messagePayload,
                template: {
                  ...messagePayload.template,
                  components: componentsWithoutButtons.length > 0 ? componentsWithoutButtons : undefined
                }
              };
              
              if (!retryPayload.template.components || retryPayload.template.components.length === 0) {
                delete retryPayload.template.components;
              }
              
              console.log('📤 RETRY PAYLOAD (without buttons):');
              console.log(JSON.stringify(retryPayload, null, 2));
              
              // Retry the request
              response = await fetch(`https://graph.facebook.com/v22.0/${phoneNumberId}/messages`, {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${accessToken}`,
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify(retryPayload)
              });
              
              console.log('📊 Retry response status:', response.status);
              
              if (response.ok) {
                console.log('✅ Message sent successfully without button parameters');
                console.warn('💡 Note: Buttons are defined in the template in Meta Business Manager and do not need parameters in the API call.');
              }
            }
          } else if (errorDetails.includes('header') && errorDetails.includes('no parameters allowed')) {
            console.warn('⚠️ Template does not support header image component');
            console.warn('🔄 Retrying without header image...');
            
            // Remove header component and retry
            if (messagePayload.template?.components) {
              const componentsWithoutHeader = messagePayload.template.components.filter(
                (comp: any) => comp.type !== 'header'
              );
              
              const retryPayload = {
                ...messagePayload,
                template: {
                  ...messagePayload.template,
                  components: componentsWithoutHeader.length > 0 ? componentsWithoutHeader : undefined
                }
              };
              
              if (!retryPayload.template.components || retryPayload.template.components.length === 0) {
                delete retryPayload.template.components;
              }
              
              console.log('📤 RETRY PAYLOAD (without header):');
              console.log(JSON.stringify(retryPayload, null, 2));
              
              // Retry the request
              response = await fetch(`https://graph.facebook.com/v22.0/${phoneNumberId}/messages`, {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${accessToken}`,
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify(retryPayload)
              });
              
              console.log('📊 Retry response status:', response.status);
              
              if (response.ok) {
                console.log('✅ Message sent successfully without header image');
                console.warn('💡 Note: Template does not support header images. Image was not sent.');
                console.warn('💡 To send images, configure the template in Meta Business Manager with a header image component.');
              }
            }
          }
        }
      }
      
      if (response.ok) {
        const responseData = await response.json();
        console.log('📱 Full Response:', JSON.stringify(responseData, null, 2));
        
        // Check if message was actually accepted - both messageId and contact.wa_id are required
        const messageId = responseData.messages?.[0]?.id;
        const contact = responseData.contacts?.[0];
        const waId = contact?.wa_id;
        const messageStatus = responseData.messages?.[0]?.message_status;
        
        console.log('📊 Message Status Details:', {
          messageId,
          messageStatus,
          waId,
          contact: contact ? 'Found' : 'Not found'
        });
        
        // Validate that message was actually sent successfully
        if (!messageId) {
          console.error('❌ No message ID in response - message was NOT sent');
          console.error('📋 Response data:', responseData);
          return {
            success: false,
            error: 'WhatsApp API did not return a message ID. Message may not have been sent.'
          };
        }
        
        if (!waId) {
          console.error('❌ No WhatsApp ID (wa_id) in response - number may not have WhatsApp');
          console.error('📋 Response data:', responseData);
          console.error('📞 Phone number:', phoneNumber);
          return {
            success: false,
            error: `Phone number ${phoneNumber} does not have WhatsApp or is not registered. Please verify the number.`
          };
        }
        
        // Message was successfully sent
        console.log('✅ WhatsApp Business API sent successfully!');
        console.log('📨 Message ID:', messageId);
        console.log('📞 Contact:', contact);
        console.log('📱 WhatsApp ID:', waId);
        console.log('💡 Message should arrive shortly');
        
        // Important warnings for user
        console.warn('⚠️ IMPORTANT NOTES:');
        console.warn('1. If this is the FIRST message to this number, it MUST be sent as a WhatsApp Template');
        console.warn('2. The recipient must have saved your WhatsApp Business number in their contacts');
        console.warn('3. If the message doesn\'t arrive, check:');
        console.warn('   - The recipient hasn\'t blocked your number');
        console.warn('   - The recipient\'s WhatsApp is active');
        console.warn('   - Your WhatsApp Business account is verified');
        console.warn('4. Message status updates will come via webhook (if configured)');
        
        return {
          success: true,
          messageId: messageId,
          contact: contact,
          warning: 'Message sent successfully. If recipient doesn\'t receive it, ensure: 1) This is not the first message (first messages require templates), 2) Recipient has saved your number, 3) Recipient hasn\'t blocked you.'
        };
      } else {
        // Handle error response
        let errorData;
        let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        
        try {
          const contentType = response.headers.get('content-type');
          if (contentType && contentType.includes('application/json')) {
            errorData = await response.json();
            const errorCode = errorData.error?.code;
            errorMessage = errorData.error?.message || errorMessage;
            const errorDetails = errorData.error?.error_data?.details || '';
            
            console.error('❌ WhatsApp Business API failed:', errorData);
            console.error('📋 Error Details:', {
              code: errorCode,
              message: errorMessage,
              status: response.status,
              fullError: errorData,
              errorDetails: errorDetails
            });
            
            // Log the full error response for debugging
            console.error('📋 Full Error Response:', JSON.stringify(errorData, null, 2));
            
            let diagnosticMessage = `WhatsApp Business API failed: ${errorMessage}`;
            
            if (errorCode === 100 || errorMessage.includes('does not exist') || errorMessage.includes('missing permissions')) {
              diagnosticMessage += '\n\n🔧 Troubleshooting Steps:';
              
              // Check if this is a template-related error
              if (messageData.templateName && (errorDetails.includes('Parameter name is missing or empty') || errorDetails.includes('Invalid parameter'))) {
                diagnosticMessage += '\n\n⚠️ CRITICAL: Template Parameter Name Issue (Error Code 100)';
                diagnosticMessage += `\n   Template "${messageData.templateName}" has a parameter with MISSING or EMPTY name.`;
                diagnosticMessage += '\n   This error means: A variable in your template\'s Variable Samples section';
                diagnosticMessage += '\n   does NOT have a NAME defined (the name field is empty).';
                diagnosticMessage += '\n\n   🔴 THIS IS A TEMPLATE CONFIGURATION ISSUE IN META BUSINESS MANAGER';
                diagnosticMessage += '\n   You MUST fix the template in Meta Business Manager, not in the code.';
                diagnosticMessage += '\n\n   📋 STEP-BY-STEP FIX:';
                diagnosticMessage += '\n   1. Go to: https://business.facebook.com/wa/manage/message-templates/';
                diagnosticMessage += `\n   2. Find template "${messageData.templateName}"`;
                diagnosticMessage += '\n   3. Click "Edit" button';
                diagnosticMessage += '\n   4. Check EVERY section that has variables:';
                diagnosticMessage += '\n\n   📋 HEADER Section (if template has header image):';
                diagnosticMessage += '\n      a. Click on "Header" section';
                diagnosticMessage += '\n      b. If header type is "Image", look for "Variable Samples"';
                diagnosticMessage += '\n      c. Find the image variable';
                diagnosticMessage += '\n      d. Check the "Name" field - it MUST NOT be empty!';
                diagnosticMessage += '\n      e. If empty, enter a name (e.g., "header_image" or "event_image")';
                diagnosticMessage += '\n      f. Save the template';
                diagnosticMessage += '\n\n   📋 BODY Section:';
                diagnosticMessage += '\n      a. Click on "Body" section';
                diagnosticMessage += '\n      b. Look for "Variable Samples" section';
                diagnosticMessage += '\n      c. Check EVERY variable in the list';
                diagnosticMessage += '\n      d. For EACH variable, check the "Name" field';
                diagnosticMessage += '\n      e. EVERY variable MUST have a name (not empty!)';
                diagnosticMessage += '\n      f. Common names: guest_name, event_type, couple_name, etc.';
                diagnosticMessage += '\n      g. If ANY variable has an empty name, enter a name';
                diagnosticMessage += '\n      h. Save the template';
                // CRITICAL: Count actual body parameters being sent, not all keys in templateParams
                const actualBodyParamsCount = messagePayload.template?.components?.find((c: any) => c.type === 'body')?.parameters?.length || 0;
                const headerComponent = messagePayload.template?.components?.find((c: any) => c.type === 'header');
                const hasHeader = !!headerComponent;
                const allKeysCount = messageData.templateParams ? Object.keys(messageData.templateParams).filter(k => k !== 'language' && k !== 'paramsOrder' && k !== 'guest_response_link' && k !== 'headerImageUrl' && k !== 'eventData').length : 0;
                diagnosticMessage += `\n\n   📊 WHAT WE ARE SENDING:`;
                diagnosticMessage += `\n   - Body parameters: ${actualBodyParamsCount}`;
                diagnosticMessage += `\n   - Header image: ${hasHeader ? 'YES' : 'NO'}`;
                diagnosticMessage += `\n   - Total keys in templateParams: ${allKeysCount}`;
                diagnosticMessage += '\n\n   ⚠️ IMPORTANT:';
                diagnosticMessage += '\n   - The error "Parameter name is missing or empty" means';
                diagnosticMessage += '\n     a variable in Meta Business Manager doesn\'t have a name.';
                diagnosticMessage += '\n   - You MUST add names to ALL variables in the template.';
                diagnosticMessage += '\n   - After fixing, wait a few minutes for Meta to update.';
                diagnosticMessage += '\n   - Then try sending again.';
                
                if (messageData.templateName?.toLowerCase() === 'aa') {
                  diagnosticMessage += '\n\n   📋 SPECIFIC FIXES for template "aa":';
                  diagnosticMessage += '\n      Template "aa" has a STATIC header image (not a variable) and 8 body parameters.';
                  diagnosticMessage += '\n\n   ⚠️ IMPORTANT: Template "aa" Header Image';
                  diagnosticMessage += '\n      - The header image in template "aa" is STATIC (not a variable)';
                  diagnosticMessage += '\n      - You do NOT need to check the Header section for variable names';
                  diagnosticMessage += '\n      - The header image is defined in the template itself in Meta Business Manager';
                  diagnosticMessage += '\n      - If you see this error, it\'s likely a Body parameter issue, not Header';
                  diagnosticMessage += '\n\n   🔴 MOST COMMON ISSUE: Body Parameter Variable Names';
                  diagnosticMessage += '\n      Template "aa" has 8 body parameters - check EACH one:';
                  diagnosticMessage += '\n\n   📋 Body Parameters (8 total - check each one):';
                  diagnosticMessage += '\n      1. guest_name - MUST have a name in Variable Samples';
                  diagnosticMessage += '\n      2. event_type - MUST have a name in Variable Samples';
                  diagnosticMessage += '\n      3. groom_name - MUST have a name in Variable Samples';
                  diagnosticMessage += '\n      4. bride_name - MUST have a name in Variable Samples';
                  diagnosticMessage += '\n      5. event_date - MUST have a name in Variable Samples';
                  diagnosticMessage += '\n      6. event_time - MUST have a name in Variable Samples';
                  diagnosticMessage += '\n      7. venue - MUST have a name in Variable Samples';
                  diagnosticMessage += '\n      8. couple_name - MUST have a name in Variable Samples';
                  diagnosticMessage += '\n\n   ✅ HOW TO CHECK:';
                  diagnosticMessage += '\n      1. In Meta Business Manager → Edit template "aa"';
                  diagnosticMessage += '\n      2. Go to "Body" section → "Variable Samples"';
                  diagnosticMessage += '\n      3. For EACH of the 8 variables, check the "Name" column';
                  diagnosticMessage += '\n      4. If ANY name is empty, enter a name (e.g., "guest_name", "event_type", etc.)';
                  diagnosticMessage += '\n      5. Save the template and wait a few minutes';
                  diagnosticMessage += '\n      6. Try sending again';
                  diagnosticMessage += '\n\n   ⚠️ NOTE: Do NOT check the Header section - the header image is static!';
                }
                
                diagnosticMessage += '\n\n   📋 SUMMARY - What You Need To Do:';
                diagnosticMessage += '\n   1. Go to Meta Business Manager → WhatsApp → Message Templates';
                diagnosticMessage += `\n   2. Find and edit template "${messageData.templateName}"`;
                diagnosticMessage += '\n   3. Check EVERY variable in Header and Body sections';
                diagnosticMessage += '\n   4. For EACH variable, ensure the "Name" field is NOT empty';
                diagnosticMessage += '\n   5. If any name is empty, enter a name and save';
                diagnosticMessage += '\n   6. Wait 2-3 minutes for Meta to update';
                diagnosticMessage += '\n   7. Try sending the message again';
                diagnosticMessage += '\n\n   ⚠️ REMEMBER: This is a template configuration issue in Meta,';
                diagnosticMessage += '\n   not a code issue. You MUST fix it in Meta Business Manager.';
              }
              
              diagnosticMessage += '\n\n1. Verify Phone Number ID is correct:';
              diagnosticMessage += `\n   Current ID: ${phoneNumberId}`;
              diagnosticMessage += '\n   Go to: https://developers.facebook.com/apps/';
              diagnosticMessage += '\n   Select your app → WhatsApp → API Setup';
              diagnosticMessage += '\n   Click "Show" next to "Phone number ID" and verify it matches';
              diagnosticMessage += '\n2. Check Access Token permissions:';
              diagnosticMessage += '\n   Token must have: whatsapp_business_messaging, whatsapp_business_management';
              diagnosticMessage += '\n   Go to: Business Settings → System Users → Your User → Generate Token';
              diagnosticMessage += '\n3. Verify Phone Number ID belongs to the same Business Account as the Token';
              diagnosticMessage += '\n4. Make sure the phone number is verified in WhatsApp Business Manager';
            } else if (errorCode === 190 || errorMessage.includes('Invalid OAuth')) {
              diagnosticMessage += '\n\n🔧 Access Token is invalid or expired';
              diagnosticMessage += '\n   Generate a new token from Business Settings → System Users';
            } else if (errorCode === 100 && messageData.templateName && errorDetails.includes('Parameter name is missing or empty')) {
              // CRITICAL: Template has configuration issue - try sending as regular text message as fallback
              console.warn('⚠️ Template configuration error detected - trying fallback to regular text message');
              console.warn('💡 This will send the message content as plain text instead of using the template');
              
              // Build a plain text message from template parameters
              let fallbackMessage = messageData.message || '';
              
              // If no message provided, try to build from template params
              if (!fallbackMessage && messageData.templateParams) {
                const params = messageData.templateParams as any;
                const eventData = params.eventData;
                
                // Build a simple text message from available data
                const parts: string[] = [];
                if (params.guestName) parts.push(`שלום ${params.guestName}`);
                if (eventData?.eventType) parts.push(`סוג אירוע: ${eventData.eventType}`);
                if (eventData?.coupleName || (eventData?.groomName && eventData?.brideName)) {
                  const coupleName = eventData.coupleName || `${eventData.groomName} ו-${eventData.brideName}`;
                  parts.push(`זוג: ${coupleName}`);
                }
                if (eventData?.eventDate) parts.push(`תאריך: ${eventData.eventDate}`);
                if (eventData?.eventTime) parts.push(`שעה: ${eventData.eventTime}`);
                if (eventData?.venue) parts.push(`מיקום: ${eventData.venue}`);
                if (params.guest_response_link) parts.push(`קישור לעדכון: ${params.guest_response_link}`);
                
                fallbackMessage = parts.join('\n');
              }
              
              // Fallback to default message if still empty
              if (!fallbackMessage || fallbackMessage.trim().length === 0) {
                fallbackMessage = 'שלום, זהו עדכון לגבי האירוע שלך.';
              }
              
              console.log('📝 Fallback message:', fallbackMessage);
              
              // Try sending as regular text message
              const fallbackPayload = {
                messaging_product: 'whatsapp',
                to: messagePayload.to,
                type: 'text',
                text: {
                  body: fallbackMessage
                }
              };
              
              console.log('🔄 Attempting to send as regular text message (fallback)...');
              console.log('📤 FALLBACK PAYLOAD:', JSON.stringify(fallbackPayload, null, 2));
              
              try {
                const fallbackResponse = await fetch(`https://graph.facebook.com/v22.0/${phoneNumberId}/messages`, {
                  method: 'POST',
                  headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                  },
                  body: JSON.stringify(fallbackPayload)
                });
                
                console.log('📊 Fallback response status:', fallbackResponse.status);
                
                if (fallbackResponse.ok) {
                  const fallbackResponseData = await fallbackResponse.json();
                  console.log('✅ Message sent successfully as regular text (fallback)');
                  console.log('📨 Message ID:', fallbackResponseData.messages?.[0]?.id);
                  
                  return {
                    success: true,
                    messageId: fallbackResponseData.messages?.[0]?.id,
                    warning: 'Message sent as regular text instead of template due to template configuration issue. Please fix the template in Meta Business Manager.'
                  };
                } else {
                  const fallbackErrorData = await fallbackResponse.json();
                  console.error('❌ Fallback also failed:', fallbackErrorData);
                  
                  // If fallback failed with 131047 (first message requires template), we can't send
                  if (fallbackErrorData.error?.code === 131047) {
                    console.error('❌ Cannot send as regular text - first message requires template');
                    diagnosticMessage += '\n\n⚠️ FALLBACK ATTEMPTED: Tried to send as regular text message but failed.';
                    diagnosticMessage += '\n   This is likely a FIRST MESSAGE which requires a template.';
                    diagnosticMessage += '\n   You MUST fix the template configuration in Meta Business Manager.';
                  }
                }
              } catch (fallbackError) {
                console.error('❌ Fallback attempt failed with exception:', fallbackError);
              }
            } else if (errorCode === 131047) {
              // CRITICAL: First message requires a template - retry with template "aa"
              console.warn('⚠️ Meta rejected regular message - first message requires template');
              console.warn('🔄 Retrying with template "aa"...');
              
              // If this was a regular message (not template), retry with template "aa"
              if (messagePayload.type === 'text' && !messageData.templateName) {
                // CRITICAL: Get eventData and guestName from templateParams (passed from messageService)
                // messageService passes eventData and guestName in templateParams for free-form messages
                const eventData = (messageData.templateParams as any)?.eventData;
                let guestName = (messageData.templateParams as any)?.guestName;
                
                // If guestName not in templateParams, try to extract from message
                if (!guestName && messageData.message) {
                  const firstLine = messageData.message.split('\n')[0];
                  // Try to extract name from common Hebrew greetings
                  const nameMatch = firstLine.match(/(?:שלום|היי|הי)\s+([^\s!.,]+)/i);
                  if (nameMatch && nameMatch[1]) {
                    guestName = nameMatch[1];
                  } else {
                    // Use first word after greeting
                    const words = firstLine.split(/\s+/);
                    if (words.length > 1) {
                      guestName = words[1];
                    }
                  }
                }
                
                // Fallback to default if still no name
                if (!guestName) {
                  guestName = 'אורח';
                }
                
                // CRITICAL: Get guest_response_link from original templateParams or messageData
                // Priority: originalTemplateParams > messageData.templateParams
                const guestResponseLink = (originalTemplateParams as any)?.guest_response_link || 
                                         (messageData.templateParams as any)?.guest_response_link || '';
                
                const templateParamsForAA = {
                  paramsOrder: ['guest_name', 'event_type', 'groom_name', 'bride_name', 
                               'event_date', 'event_time', 'venue', 'couple_name'],
                  guest_name: guestName,
                  event_type: eventData?.eventTypeHebrew || 'חתונה',
                  groom_name: eventData?.groomName || '',
                  bride_name: eventData?.brideName || '',
                  event_date: eventData?.eventDate || '',
                  event_time: eventData?.eventTime || '',
                  venue: eventData?.venue || '',
                  couple_name: eventData?.coupleName || 'הזוג',
                  guest_response_link: guestResponseLink, // CRITICAL: Include guest_response_link for URL button
                  language: 'he'
                };
                
                console.log('📋 Template params for retry:', templateParamsForAA);
                
                // Retry with template "aa"
                // CRITICAL: Template "aa" requires: 8 body parameters + 1 URL button at index 0
                const retryPayload: any = {
                  messaging_product: 'whatsapp',
                  recipient_type: 'individual',
                  to: phoneNumber,
                  type: 'template',
                  template: {
                    name: 'aa',
                    language: { code: 'he' },
                    components: [{
                      type: 'body',
                      parameters: [
                        { type: 'text', text: templateParamsForAA.guest_name },
                        { type: 'text', text: templateParamsForAA.event_type },
                        { type: 'text', text: templateParamsForAA.groom_name },
                        { type: 'text', text: templateParamsForAA.bride_name },
                        { type: 'text', text: templateParamsForAA.event_date },
                        { type: 'text', text: templateParamsForAA.event_time },
                        { type: 'text', text: templateParamsForAA.venue },
                        { type: 'text', text: templateParamsForAA.couple_name }
                      ]
                    }]
                  }
                };
                
                // CRITICAL: Add URL button component for template "aa" if guest_response_link is available
                if (guestResponseLink) {
                  retryPayload.template.components.push({
                    type: 'button',
                    sub_type: 'url',
                    index: '0', // Template "aa" has URL button at index 0
                    parameters: [{
                      type: 'text',
                      text: guestResponseLink
                      // CRITICAL: URL button parameters do NOT need parameter_name for predefined buttons
                      // parameter_name is only needed for dynamic buttons, not for template-defined buttons
                      // Template "aa" has a predefined URL button - we just send the URL value
                    }]
                  });
                  console.log(`🔘 Added URL button component for template "aa" retry at index 0 with URL: ${guestResponseLink}`);
                } else {
                  console.warn('⚠️ WARNING: Template "aa" requires a URL button parameter but guest_response_link is missing in retry!');
                  console.warn('⚠️ The template has a URL button "לעדכון סטטוס הגעה" at index 0 that requires a URL parameter');
                  console.warn('⚠️ This may cause Meta API error 100 or 132018');
                }
                
                console.log('📤 Retrying with template "aa":', JSON.stringify(retryPayload, null, 2));
                
                const retryResponse = await fetch(`https://graph.facebook.com/v22.0/${phoneNumberId}/messages`, {
                  method: 'POST',
                  headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                  },
                  body: JSON.stringify(retryPayload)
                });
                
                if (retryResponse.ok) {
                  const retryData = await retryResponse.json();
                  console.log('✅ Message sent successfully with template "aa" after retry');
                  return {
                    success: true,
                    messageId: retryData.messages?.[0]?.id,
                    contact: retryData.contacts?.[0],
                    warning: 'Message sent as template "aa" (first message requires template)'
                  };
                } else {
                  const retryErrorData = await retryResponse.json();
                  console.error('❌ Retry with template "aa" also failed:', retryErrorData);
                  console.error('❌ Retry error code:', retryErrorData.error?.code);
                  console.error('❌ Retry error message:', retryErrorData.error?.message);
                }
              }
              
              diagnosticMessage += '\n\n🔧 First message requires a Template';
              diagnosticMessage += '\n   Go to: WhatsApp → Message Templates and create a template';
            } else if (errorCode === 131026) {
              diagnosticMessage += '\n\n🔧 Phone number is not registered on WhatsApp';
              diagnosticMessage += `\n   The number ${phoneNumber} does not have WhatsApp`;
            } else if (errorCode === 132000) {
              diagnosticMessage += '\n\n🔧 Template Parameter Mismatch (Error Code 132000)';
              diagnosticMessage += '\n   Number of parameters does not match the expected number of params.';
              diagnosticMessage += '\n\n   Possible causes:';
              diagnosticMessage += '\n   1. Wrong number of body parameters sent';
              diagnosticMessage += '\n   2. Header component added when template doesn\'t require it';
              diagnosticMessage += '\n   3. Button component added when template doesn\'t require it';
              diagnosticMessage += '\n   4. Parameter order mismatch';
              diagnosticMessage += '\n\n   🔍 CRITICAL CHECKS:';
              diagnosticMessage += `\n   1. Template "${messageData.templateName}" expects specific number of parameters`;
              if (messageData.templateName?.toLowerCase() === 'aa') {
                diagnosticMessage += '\n   2. Template "aa" expects 8 body parameters: guest_name, event_type, groom_name, bride_name, event_date, event_time, venue, couple_name';
                diagnosticMessage += '\n   3. Template "aa" does NOT require header image - check if header was added incorrectly';
                diagnosticMessage += '\n   4. Template "aa" may not have buttons - check if button parameters were added incorrectly';
                diagnosticMessage += '\n   5. Verify in Meta Business Manager that template "aa" has exactly 8 variable samples in the Body section';
              }
              diagnosticMessage += '\n\n   Check the console logs above for:';
              diagnosticMessage += '\n   - Number of body parameters being sent';
              diagnosticMessage += '\n   - Whether header component was added';
              diagnosticMessage += '\n   - Whether button components were added';
              diagnosticMessage += '\n   - Full payload being sent to Meta API';
            } else if (errorCode === 132012) {
              diagnosticMessage += '\n\n🔧 Template Header Image Mismatch (Error Code 132012)';
              diagnosticMessage += '\n   The template in Meta is configured with a header image, but we are not sending one.';
              diagnosticMessage += '\n\n   Solutions:';
              diagnosticMessage += '\n   1. Remove header image from template in Meta Business Manager:';
              diagnosticMessage += '\n      - Go to: Meta Business Manager → WhatsApp → Message Templates';
              diagnosticMessage += `\n      - Find template "${messageData.templateName}"`;
              diagnosticMessage += '\n      - Click "Edit" → Remove image from Header section';
              diagnosticMessage += '\n      - Save template';
              diagnosticMessage += '\n\n   2. OR upload your image to a public HTTPS URL:';
              diagnosticMessage += '\n      - Upload image to a cloud storage (e.g., Google Drive, Dropbox, Imgur)';
              diagnosticMessage += '\n      - Get the public HTTPS URL';
              diagnosticMessage += '\n      - Update the event/campaign with the HTTPS image URL';
              diagnosticMessage += '\n      - The system will automatically send it as header image';
              if (messageData.imageUrl && !messageData.imageUrl.startsWith('https://')) {
                diagnosticMessage += `\n\n   ⚠️ Current image URL is a local file: ${messageData.imageUrl}`;
                diagnosticMessage += '\n   This cannot be sent via WhatsApp API. Please upload to HTTPS URL.';
              }
            }
            
            return {
              success: false,
              error: diagnosticMessage
            };
          } else {
            // Non-JSON error response
            const textError = await response.text();
            console.error('❌ WhatsApp Business API failed (non-JSON):', textError);
            return {
              success: false,
              error: `WhatsApp API error: ${errorMessage}. Response: ${textError.substring(0, 200)}`
            };
          }
        } catch (parseError) {
          console.error('❌ Failed to parse error response:', parseError);
          return {
            success: false,
            error: `WhatsApp API error: ${errorMessage}. Failed to parse response.`
          };
        }
      }
      
    } catch (error: any) {
      console.error('❌ WhatsApp Error:', error);
      const errorMsg = error?.message || error?.toString() || 'Unknown error occurred';
      return {
        success: false,
        error: `Failed to send WhatsApp message: ${errorMsg}`
      };
    }
  }

  async sendBulkMessages(messages: WhatsAppMessage[]): Promise<WhatsAppResponse[]> {
    const results: WhatsAppResponse[] = [];
    
    console.log(`📤 Sending bulk WhatsApp to ${messages.length} recipients`);
    
    for (let i = 0; i < messages.length; i++) {
      const message = messages[i];
      
      try {
        console.log(`📱 Sending ${i + 1}/${messages.length} to ${message.to}...`);
        
        // Use the same sendMessage method for each message
        const result = await this.sendMessage(message);
        results.push(result);
        
        // Add delay between messages (2 seconds) to avoid rate limiting
        if (i < messages.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
        
        console.log(`✅ Message ${i + 1} sent successfully!`);
        
      } catch (error) {
        console.error(`Error sending WhatsApp to ${message.to}:`, error);
        results.push({
          success: false,
          error: 'Failed to send WhatsApp message'
        });
      }
    }
    
    console.log(`📊 Bulk WhatsApp completed: ${results.filter(r => r.success).length} successful, ${results.filter(r => !r.success).length} failed`);
    
    return results;
  }

  // Check if phone number has WhatsApp
  async checkWhatsAppAvailability(phoneNumber: string): Promise<boolean> {
    try {
      if (import.meta.env.DEV) {
        // Simulate check - 80% of numbers have WhatsApp
        return Math.random() > 0.2;
      }

      // Format phone number for WhatsApp Business API
      const formattedPhone = phoneNumber.replace(/^0/, '972').replace(/[^0-9]/g, '');
      const accessToken = this.accessToken;
      const phoneNumberId = this.phoneNumberId;

      // Use WhatsApp Business API to check contact availability
      const response = await fetch(
        `https://graph.facebook.com/v22.0/${phoneNumberId}/contacts`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            contacts: [formattedPhone]
          })
        }
      );

      if (!response.ok) {
        console.error('WhatsApp contact check failed:', response.status);
        return false;
      }

      const data = await response.json();
      
      // Response structure:
      // {
      //   "messaging_product": "whatsapp",
      //   "contacts": [
      //     {
      //       "input": "<PHONE_NUMBER>",
      //       "wa_id": "<WHATSAPP_ID>" // Only present if number has WhatsApp
      //     }
      //   ]
      // }
      
      const contact = data.contacts?.[0];
      const hasWhatsApp = contact?.wa_id !== undefined;
      
      console.log(`📱 WhatsApp check for ${formattedPhone}:`, hasWhatsApp ? '✅ Has WhatsApp' : '❌ No WhatsApp');
      
      return hasWhatsApp;
    } catch (error) {
      console.error('WhatsApp availability check error:', error);
      return false;
    }
  }
}

export const whatsappService = new WhatsAppService();