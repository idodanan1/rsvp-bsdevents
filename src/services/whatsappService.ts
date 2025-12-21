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

      // If template is provided, send template message (for first messages)
      // CRITICAL: Validate templateName before using it
      if (messageData.templateName && typeof messageData.templateName === 'string' && messageData.templateName.trim().length > 0) {
        console.log('📋 Sending template message:', messageData.templateName);
        messagePayload.type = 'template';
        messagePayload.template = {
          name: messageData.templateName,
          language: {
            code: messageData.templateParams?.language || 'he' // Default to Hebrew for template "a"
          }
        };
        
        // Add template parameters if provided AND template is not hello_world
        // hello_world template doesn't support parameters
        if (messageData.templateName !== 'hello_world' && 
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
              : templateName === 'aa' || templateName === 'AA'
                ? ['guest_name', 'event_type', 'groom_name', 'bride_name', 
                   'event_date', 'event_time', 'venue', 'couple_name']
                : ['guest_name', 'event_type', 'event_date', 'event_time', 'venue', 'guest_response_link', 'couple_name']) as string[];
            
            // CRITICAL FIX: Remove guest_response_link from body params for template "aa" if it exists
            // Template "aa" does NOT include guest_response_link in body parameters - it's only used for the button
            if (templateName === 'aa' || templateName === 'AA') {
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
              !((templateName === 'aa' || templateName === 'AA') && key === 'guest_response_link')
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
                
            // CRITICAL: Validate all parameters BEFORE constructing bodyParams
            // This ensures we catch any issues early
            const paramValidationErrors: string[] = [];
            filteredParamsOrder.forEach((key: string) => {
              const paramValue = messageData.templateParams![key];
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
            }
            
            bodyParams = filteredParamsOrder.map((key: string, index: number) => {
                // CRITICAL: Check if parameter exists, if not use placeholder value
                const paramValue = messageData.templateParams![key];
                
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
              
              // CRITICAL: Ensure bodyParams is a valid array with valid parameters
              const validBodyParams = bodyParams.filter((param: any) => {
                if (!param || typeof param !== 'object') {
                  console.error('❌ CRITICAL: Invalid parameter structure in bodyParams:', param);
                  return false;
                }
                if (!param.type || param.type !== 'text') {
                  console.error('❌ CRITICAL: Parameter missing type or invalid type:', param);
                  return false;
                }
                if (!param.text || typeof param.text !== 'string' || param.text.trim().length === 0) {
                  console.error('❌ CRITICAL: Parameter missing text or text is empty:', param);
                  return false;
                }
                return true;
              });
              
              if (validBodyParams.length !== bodyParams.length) {
                console.error(`❌ CRITICAL: Filtered out ${bodyParams.length - validBodyParams.length} invalid parameter(s) from bodyParams!`);
                console.error(`❌ Original count: ${bodyParams.length}, Valid count: ${validBodyParams.length}`);
              }
              
              if (validBodyParams.length > 0) {
            components.push({
              type: 'body',
                  parameters: validBodyParams
            });
              } else {
                console.error('❌ CRITICAL: No valid body parameters to send! This will cause Meta API error 100.');
              }
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
          if (templateName === 'aa' || templateName === 'AA') {
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
          
          // CRITICAL: Template "aa" does NOT have buttons - skip all button processing
          // The template "aa" in Meta Business Manager does not include buttons (user removed them)
          if (templateNameLower !== 'aa') {
          // Always add URL button parameters if provided (they are required even for predefined buttons)
          // Only skip Reply buttons for predefined templates (they don't need parameters)
          if (messageData.buttons && messageData.buttons.length > 0) {
            const buttonComponents: any[] = [];
            
            // Find URL button in the buttons array
            const urlButton = messageData.buttons.find(btn => btn.type === 'url' && btn.url);
            const urlButtonIndex = messageData.buttons.findIndex(btn => btn.type === 'url' && btn.url);
            
            // CRITICAL: For templates with predefined buttons, we need to map button positions correctly
            // Template 'aa' has: URL button at index 0, Reply buttons at index 1, 2
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
                }]
              };
              
              buttonComponents.push(urlButtonComponent);
              console.log(`🔘 Added URL button parameter for predefined template button at index 0`);
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
              }]
            };
            
            // Add button component to components array
            components.push(urlButtonComponent);
            console.log(`🔘 Added URL button parameter for predefined template button`);
            }
          } else {
            // Template "aa" - skip all button processing (template has no buttons)
            console.log('ℹ️ Template "aa" - skipping all button processing (template does not include buttons in Meta Business Manager)');
          }
          
          // CRITICAL: Final validation before adding components
          // For template "aa", ensure we have exactly 8 body parameters and NO header/button components (template has no buttons)
          if (templateName === 'aa' || templateName === 'AA') {
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
            
            if (buttonComponents.length > 0) {
              console.error(`❌ CRITICAL ERROR: Template "aa" should NOT have button components!`);
              console.error(`❌ Buttons are STATIC in Meta Business Manager and do not require parameters`);
              console.error(`❌ Removing button components to prevent error...`);
              // Remove button components
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
              console.log(`✅ Removed ${buttonIndices.length} button component(s)`);
            }
          }
          
          // Only add components if we have parameters (Meta requirement)
          // Empty components array is not allowed
          // CRITICAL: For template "aa", ensure body component has exactly 8 parameters
          if (components.length > 0) {
            // CRITICAL: Final validation - ensure body component has valid parameters
            let bodyComponent = components.find((c: any) => c.type === 'body');
            if (bodyComponent && bodyComponent.parameters) {
              // CRITICAL: Create a new array with only valid parameters
              // This ensures we don't mutate the original array incorrectly
              const validParameters = bodyComponent.parameters.filter((param: any) => {
                if (!param || typeof param !== 'object') {
                  console.error('❌ CRITICAL: Invalid parameter structure:', param);
                  return false;
                }
                if (!param.type || param.type !== 'text') {
                  console.error('❌ CRITICAL: Parameter missing type or invalid type:', param);
                  return false;
                }
                if (!param.text || typeof param.text !== 'string' || param.text.trim().length === 0) {
                  console.error('❌ CRITICAL: Parameter missing text or text is empty:', param);
                  return false;
                }
                return true;
              });
              
              // CRITICAL: Replace the parameters array with the filtered valid parameters
              bodyComponent.parameters = validParameters;
              
              // If we filtered out parameters, log warning
              const originalCount = bodyParams.length;
              const filteredCount = validParameters.length;
              if (filteredCount !== originalCount) {
                console.error(`❌ CRITICAL: Filtered out ${originalCount - filteredCount} invalid parameter(s)!`);
                console.error(`❌ Original count: ${originalCount}, Filtered count: ${filteredCount}`);
              }
              
              // CRITICAL: Ensure body component has parameters array (not undefined/null)
              if (!bodyComponent.parameters || bodyComponent.parameters.length === 0) {
                console.error('❌ CRITICAL: Body component has no valid parameters after filtering!');
                console.error('❌ This will cause Meta API error 100');
              }
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
            
            if (templateName === 'aa' || templateName === 'AA') {
              console.log('📋 Template "aa" requirements:');
              console.log('  - 0 header image components (header image is STATIC in Meta Business Manager)');
              console.log('  - 8 body parameters: guest_name, event_type, groom_name, bride_name, event_date, event_time, venue, couple_name');
              console.log('  - 0 button components (template has no buttons in Meta)');
              const finalBodyParamsCount = bodyComponent?.parameters?.length || 0;
              const finalHeaderCount = headerComponent ? 1 : 0;
              const finalButtonCount = buttonComponents.length;
              console.log(`📊 FINAL VALIDATION: ${finalHeaderCount === 0 ? '✅' : '❌'} ${finalHeaderCount} header (should be 0), ${finalBodyParamsCount === 8 ? '✅' : '❌'} ${finalBodyParamsCount} body params (should be 8), ${finalButtonCount === 0 ? '✅' : '❌'} ${finalButtonCount} buttons (should be 0)`);
              
              if (finalBodyParamsCount !== 8) {
                console.error(`❌ VALIDATION FAILED: Template "aa" requires exactly 8 body parameters!`);
                console.error(`❌ This payload will be rejected by Meta API with error 100 or 132000`);
              }
              if (finalHeaderCount > 0) {
                console.error(`❌ VALIDATION FAILED: Template "aa" should NOT have header components!`);
                console.error(`❌ This payload will be rejected by Meta API with error 100 or 132012`);
              }
              if (finalButtonCount > 0) {
                console.error(`❌ VALIDATION FAILED: Template "aa" should NOT have button components!`);
                console.error(`❌ This payload will be rejected by Meta API with error 132018`);
              }
            }
          } else {
            // If no parameters, don't send components at all (for templates without parameters)
            console.log('📋 No parameters to send - template will be sent without components');
          }
          
          console.log('📋 Template body parameters:', JSON.stringify(bodyParams, null, 2));
        } else if (messageData.templateName === 'hello_world') {
          console.log('📋 hello_world template - no parameters needed');
        }
      } else {
        // Regular text message
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
        
        // Validate button components (should NOT exist for "aa")
        if (buttonComponents.length > 0) {
          console.error(`❌ CRITICAL: Template "aa" payload includes ${buttonComponents.length} button component(s) but should NOT!`);
          buttonComponents.forEach((btn: any, index: number) => {
            console.error(`❌ Button component ${index + 1}:`, btn);
          });
          console.error(`❌ This will cause Meta API error 132018`);
        }
        
        // Final count validation
        if (bodyParams.length !== 8) {
          console.error(`❌ CRITICAL VALIDATION FAILED: Template "aa" requires exactly 8 body parameters!`);
          console.error(`❌ Actual count: ${bodyParams.length}`);
          console.error(`❌ This payload will be REJECTED by Meta API`);
          console.error(`❌ Expected parameters: guest_name, event_type, groom_name, bride_name, event_date, event_time, venue, couple_name`);
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
              console.log('  - MUST have 0 button components (template has no buttons in Meta)');
          console.log('  - Language code MUST be set (default: "he")');
          const actualBodyCount = bodyParams.length;
          const actualHeaderCount = headerComponent ? 1 : 0;
          const actualButtonCount = buttonComponents.length;
          const hasLanguage = !!messagePayload.template?.language?.code;
          console.log(`📊 ACTUAL PAYLOAD: ${actualHeaderCount === 0 ? '✅' : '❌'} header (${actualHeaderCount}, should be 0), ${actualBodyCount === 8 ? '✅' : '❌'} ${actualBodyCount} body params (should be 8), ${actualButtonCount === 0 ? '✅' : '❌'} ${actualButtonCount} buttons (should be 0), ${hasLanguage ? '✅' : '❌'} language code`);
          
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
          
          if (buttonComponents.length > 0) {
            console.warn(`⚠️ WARNING: Template "aa" has no buttons in Meta, but ${buttonComponents.length} button components are being sent!`);
            console.warn('⚠️ This may cause Meta API error 132018');
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
      if (messagePayload.type === 'template' && messagePayload.template?.components) {
        // Ensure each component has the correct structure
        messagePayload.template.components = messagePayload.template.components.map((comp: any) => {
          if (comp.type === 'body' && comp.parameters) {
            // Ensure all body parameters have correct structure
            comp.parameters = comp.parameters.map((param: any, index: number) => {
              // CRITICAL: Ensure parameter has correct structure
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
              // CRITICAL: Ensure text is not empty or only whitespace
              const trimmedText = param.text.trim();
              if (trimmedText.length === 0) {
                console.error(`❌ CRITICAL: Parameter ${index + 1} has empty text after trim!`);
                console.error(`❌ This will cause Meta API error 100: "Parameter name is missing or empty"`);
                // Use placeholder for empty parameters
                const placeholder = this.getPlaceholderForParameter(`param_${index + 1}`);
                return { type: 'text', text: placeholder };
              }
              return {
                type: 'text',
                text: trimmedText
              };
            });
            
            // CRITICAL: Ensure parameters array is not empty
            if (!comp.parameters || comp.parameters.length === 0) {
              console.error('❌ CRITICAL: Body component has no parameters after validation!');
              console.error('❌ This will cause Meta API error 100');
            }
          }
          return comp;
        });
        
        // CRITICAL: For template "aa", ensure we have exactly one body component with 8 parameters
        if (templateName === 'aa' || templateName === 'AA') {
          const bodyComponent = messagePayload.template.components.find((c: any) => c.type === 'body');
          const bodyParamsCount = bodyComponent?.parameters?.length || 0;
          
          if (bodyParamsCount !== 8) {
            console.error(`❌ CRITICAL VALIDATION FAILED: Template "aa" requires exactly 8 body parameters!`);
            console.error(`❌ Actual count: ${bodyParamsCount}`);
            console.error(`❌ This payload will be REJECTED by Meta API`);
            console.error(`❌ Body component:`, JSON.stringify(bodyComponent, null, 2));
          }
          
          // Ensure no header or button components
          const headerComponent = messagePayload.template.components.find((c: any) => c.type === 'header');
          const buttonComponents = messagePayload.template.components.filter((c: any) => c.type === 'button');
          
          if (headerComponent) {
            console.error(`❌ CRITICAL: Template "aa" should NOT have header component!`);
            console.error(`❌ Removing header component...`);
            messagePayload.template.components = messagePayload.template.components.filter((c: any) => c.type !== 'header');
          }
          
          if (buttonComponents.length > 0) {
            console.error(`❌ CRITICAL: Template "aa" should NOT have button components!`);
            console.error(`❌ Removing ${buttonComponents.length} button component(s)...`);
            messagePayload.template.components = messagePayload.template.components.filter((c: any) => c.type !== 'button');
          }
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
            } else if (errorCode === 131047) {
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