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
        
        // CRITICAL: Declare templateName at outer scope so it's accessible throughout all blocks
        const templateName = (messageData.templateName || '').toLowerCase();
        
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
            // Template "bb" requires 6 parameters in order: guest_name, event_type, couple_name, event_date, event_time, venue
            // Template "aa" requires 8 parameters in order: guest_name, event_type, groom_name, bride_name, event_date, event_time, venue, couple_name
            // Template "a" requires 7 parameters: guest_name, event_type, event_date, event_time, venue, guest_response_link, couple_name
            // NOTE: For template "bb" and "aa", guest_response_link is NOT in body parameters - it's only used for the button
            let paramsOrder: string[] = (Array.isArray(messageData.templateParams.paramsOrder) 
              ? messageData.templateParams.paramsOrder 
              : templateName === 'bb' || templateName === 'BB'
                ? ['guest_name', 'event_type', 'couple_name', 
                   'event_date', 'event_time', 'venue']
                : templateName === 'aa' || templateName === 'AA'
                  ? ['guest_name', 'event_type', 'groom_name', 'bride_name', 
                     'event_date', 'event_time', 'venue', 'couple_name']
                  : ['guest_name', 'event_type', 'event_date', 'event_time', 'venue', 'guest_response_link', 'couple_name']) as string[];
            
            // CRITICAL FIX: Remove guest_response_link from body params for template "bb" and "aa" if it exists
            // Template "bb" and "aa" do NOT include guest_response_link in body parameters - it's only used for the button
            if (templateName === 'bb' || templateName === 'BB' || templateName === 'aa' || templateName === 'AA') {
              paramsOrder = paramsOrder.filter(key => key !== 'guest_response_link');
            }
            
            // IMPORTANT: Meta requires ALL parameters to be sent in the exact order
            // Even if a parameter is empty, we must send it (as empty string)
            // The filter only removes 'language' and 'paramsOrder' keys, but keeps all actual template parameters
            // CRITICAL: Also filter out 'guest_response_link' for template "bb" and "aa" body params (it's only for button)
            
            // CRITICAL: Validate that all required parameters exist in templateParams
            const missingParams: string[] = [];
            filteredParamsOrder = paramsOrder.filter((key: string) => 
              key !== 'language' && 
              key !== 'paramsOrder' && 
              !((templateName === 'bb' || templateName === 'BB' || templateName === 'aa' || templateName === 'AA') && key === 'guest_response_link')
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
            
            bodyParams = filteredParamsOrder.map((key: string) => {
                // CRITICAL: Check if parameter exists, if not use empty string (will be replaced with space)
                const paramValue = messageData.templateParams![key];
                
                // Handle undefined, null, or empty values
                let textValue: string;
                if (paramValue === undefined || paramValue === null) {
                  console.warn(`⚠️ Parameter "${key}" is undefined or null, using default value`);
                  textValue = '';
                } else {
                  textValue = String(paramValue).trim();
                }
                
                // Log if parameter is empty to help debug
                if (!textValue || textValue.length === 0) {
                  console.warn(`⚠️ Empty parameter detected: ${key}`);
                  textValue = ' '; // Use space for empty parameters (Meta requires non-empty)
                }
                
                // Ensure parameter is not empty - Meta requires non-empty parameters
                if (textValue.length === 0) {
                  console.warn(`⚠️ Parameter ${key} is empty after trim, using space`);
                  textValue = ' ';
                }
                
                // Log each parameter for debugging
                console.log(`📋 Parameter ${key}: "${textValue}" (length: ${textValue.length}, isEmpty: ${textValue.length === 0})`);
                
                // Ensure parameter is valid - Meta doesn't accept empty strings
                // Use a single space if parameter is empty
                const finalValue = textValue.length > 0 ? textValue : ' ';
                
                // Additional validation: Check if parameter contains only whitespace
                if (textValue.trim().length === 0 && textValue.length > 0) {
                  console.warn(`⚠️ Parameter ${key} contains only whitespace, using space instead`);
                }
                
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
              
              components.push({
                type: 'body',
                parameters: bodyParams
              });
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
          // For template "bb", try sending without header first - only add if we get an error
          const DEFAULT_PLACEHOLDER_IMAGE = 'https://images.unsplash.com/photo-1519167758481-83f550bb49b3?w=800&h=600&fit=crop';
          
          // Check if we have a valid HTTPS image URL for header
          // CRITICAL: Accept both http:// and https:// URLs (some image services use http)
          const isValidImageUrl = headerImageUrl && (
            headerImageUrl.startsWith('https://') || 
            headerImageUrl.startsWith('http://')
          );
          
          // CRITICAL: Template "bb" REQUIRES header image - always add it
          // Based on the template image provided, template "bb" has a header image section
          // Meta expects a header parameter, so we MUST always send one
          if (templateName === 'bb' || templateName === 'BB') {
            let imageUrlForMeta: string;
            
            if (isValidImageUrl && headerImageUrl) {
              // We have a valid image URL - use it
              imageUrlForMeta = headerImageUrl.trim();
              
              // CRITICAL: Validate URL format more strictly
              if (!imageUrlForMeta || imageUrlForMeta.length === 0) {
                console.warn('⚠️ Header image URL is empty after trim, using placeholder');
                imageUrlForMeta = DEFAULT_PLACEHOLDER_IMAGE;
              } else {
                if (imageUrlForMeta.startsWith('http://')) {
                  imageUrlForMeta = imageUrlForMeta.replace('http://', 'https://');
                  console.log('🖼️ ⚠️ Converting HTTP to HTTPS for Meta:', imageUrlForMeta);
                }
                
                // CRITICAL: Ensure URL is valid HTTPS URL
                if (!imageUrlForMeta.startsWith('https://')) {
                  console.warn('⚠️ Header image URL is not HTTPS after conversion, using placeholder');
                  imageUrlForMeta = DEFAULT_PLACEHOLDER_IMAGE;
                }
              }
            } else {
              // No valid image URL for template "bb" - use placeholder
              // Template "bb" REQUIRES a header image, so we must send one
              console.log('ℹ️ Template "bb" - no valid header image URL provided, using placeholder');
              console.log('ℹ️ headerImageUrl value:', headerImageUrl);
              console.log('ℹ️ isValidImageUrl:', isValidImageUrl);
              imageUrlForMeta = DEFAULT_PLACEHOLDER_IMAGE;
            }
            
            // ALWAYS add header image for template "bb" (required by Meta)
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
            console.log('🖼️ ✅ Adding header image to template "bb":', imageUrlForMeta);
            console.log('🖼️ ✅ Header image parameter structure:', JSON.stringify({
              type: 'header',
              parameters: [{
                type: 'image',
                image: { link: imageUrlForMeta }
              }]
            }, null, 2));
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
          // For templates "bb", "aa" and "a", buttons are already defined in Meta, but URL buttons need parameters
          const templatesWithPredefinedButtons = ['bb', 'aa', 'a', 'reminer', 'reminder'];
          const shouldSkipReplyButtons = templatesWithPredefinedButtons.includes((messageData.templateName || '').toLowerCase());
          const templateNameLower = (messageData.templateName || '').toLowerCase();
          
          // CRITICAL: Template "bb" does NOT require any button parameters - skip all button processing
          // The template "bb" in Meta Business Manager has static buttons that don't need dynamic parameters
          if (templateNameLower !== 'bb') {
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
            // Template "bb" - skip all button processing
            console.log('ℹ️ Template "bb" - skipping all button parameters (template has static buttons in Meta that don\'t require parameters)');
          }
          
          // Only add components if we have parameters (Meta requirement)
          // Empty components array is not allowed
          if (components.length > 0) {
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
            const bodyComponent = components.find((c: any) => c.type === 'body');
            const headerComponent = components.find((c: any) => c.type === 'header');
            const buttonComponents = components.filter((c: any) => c.type === 'button');
            
            console.log('📊 COMPONENT SUMMARY:');
            console.log(`  - Body parameters: ${bodyComponent?.parameters?.length || 0}`);
            console.log(`  - Header components: ${headerComponent ? 1 : 0}`);
            console.log(`  - Button components: ${buttonComponents.length}`);
            console.log(`  - Total components: ${components.length}`);
            
            if (templateName === 'bb' || templateName === 'BB') {
              console.log('📋 Template "bb" expects:');
              console.log('  - 1 header image component');
              console.log('  - 6 body parameters: guest_name, event_type, couple_name, event_date, event_time, venue');
              console.log('  - 0 button components (static buttons in Meta)');
              console.log(`📊 ACTUAL: ${headerComponent ? '1' : '0'} header, ${bodyComponent?.parameters?.length || 0} body params, ${buttonComponents.length} buttons`);
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
        console.log(`  Body parameters count: ${bodyParams.length}`);
        console.log(`  Header component: ${headerComponent ? 'YES' : 'NO'}`);
        console.log(`  Button components count: ${buttonComponents.length}`);
        console.log(`  Total components: ${messagePayload.template?.components?.length || 0}`);
        
        if (messagePayload.template?.name?.toLowerCase() === 'bb') {
          console.log('📋 Template "bb" requirements:');
          console.log('  - MUST have 1 header image component');
          console.log('  - MUST have 6 body parameters');
          console.log('  - MUST have 0 button components (static buttons in Meta)');
          console.log(`📊 ACTUAL PAYLOAD: ${headerComponent ? '✅' : '❌'} header, ${bodyParams.length === 6 ? '✅' : '❌'} ${bodyParams.length} body params, ${buttonComponents.length === 0 ? '✅' : '❌'} ${buttonComponents.length} buttons`);
          
          if (bodyParams.length !== 6) {
            console.error(`❌ ERROR: Template "bb" expects 6 body parameters, but ${bodyParams.length} are being sent!`);
            console.error('❌ This will cause Meta API error 100 or 132000');
          }
          
          if (!headerComponent) {
            console.error(`❌ ERROR: Template "bb" requires a header image component, but none is being sent!`);
            console.error('❌ This will cause Meta API error 100 or 132012');
          }
          
          if (buttonComponents.length > 0) {
            console.warn(`⚠️ WARNING: Template "bb" has static buttons in Meta, but ${buttonComponents.length} button components are being sent!`);
            console.warn('⚠️ This may cause Meta API error 132018');
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
                
                if (messageData.templateName?.toLowerCase() === 'bb') {
                  diagnosticMessage += '\n\n   📋 SPECIFIC FIXES for template "bb":';
                  diagnosticMessage += '\n      Template "bb" has a header image and 6 body parameters.';
                  diagnosticMessage += '\n\n   🔴 MOST COMMON ISSUE: Header Image Variable Name';
                  diagnosticMessage += '\n      1. In Meta Business Manager, edit template "bb"';
                  diagnosticMessage += '\n      2. Go to "Header" section';
                  diagnosticMessage += '\n      3. If header type is "Image", find "Variable Samples"';
                  diagnosticMessage += '\n      4. Look for the image variable';
                  diagnosticMessage += '\n      5. The "Name" field MUST have a value (e.g., "header_image")';
                  diagnosticMessage += '\n      6. If the name is empty, enter a name and save';
                  diagnosticMessage += '\n\n   📋 Body Parameters (6 total - check each one):';
                  diagnosticMessage += '\n      1. guest_name - MUST have a name in Variable Samples';
                  diagnosticMessage += '\n      2. event_type - MUST have a name in Variable Samples';
                  diagnosticMessage += '\n      3. couple_name - MUST have a name in Variable Samples';
                  diagnosticMessage += '\n      4. event_date - MUST have a name in Variable Samples';
                  diagnosticMessage += '\n      5. event_time - MUST have a name in Variable Samples';
                  diagnosticMessage += '\n      6. venue - MUST have a name in Variable Samples';
                  diagnosticMessage += '\n\n   ✅ HOW TO CHECK:';
                  diagnosticMessage += '\n      - In Meta Business Manager → Edit template "bb"';
                  diagnosticMessage += '\n      - Go to "Body" section → "Variable Samples"';
                  diagnosticMessage += '\n      - For EACH of the 6 variables, check the "Name" column';
                  diagnosticMessage += '\n      - If ANY name is empty, enter a name (e.g., "guest_name", "event_type", etc.)';
                  diagnosticMessage += '\n      - Save the template and wait a few minutes';
                  diagnosticMessage += '\n      - Try sending again';
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
              if (messageData.templateName?.toLowerCase() === 'bb') {
                diagnosticMessage += '\n   2. Template "bb" expects 6 body parameters: guest_name, event_type, couple_name, event_date, event_time, venue';
                diagnosticMessage += '\n   3. Template "bb" does NOT require header image - check if header was added incorrectly';
                diagnosticMessage += '\n   4. Template "bb" may not have buttons - check if button parameters were added incorrectly';
                diagnosticMessage += '\n   5. Verify in Meta Business Manager that template "bb" has exactly 6 variable samples in the Body section';
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