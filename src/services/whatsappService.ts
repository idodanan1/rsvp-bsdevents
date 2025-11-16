// WhatsApp Business API Service
export interface WhatsAppMessage {
  to: string;
  message: string;
  imageUrl?: string;
  templateName?: string;
  templateParams?: Record<string, string>;
  buttons?: Array<{
    type: 'url';
    url: string;
    title: string;
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
      console.log('🔧 WhatsApp Service initialized:');
      console.log('📱 Phone Number ID:', this.phoneNumberId);
      console.log('🔑 Access Token:', this.accessToken ? 'Set' : 'Not set');
      console.log('🌐 Using WhatsApp Business API directly');
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
      
      console.log('📞 WhatsApp Business phone:', phoneNumber);
      console.log('🔑 Access Token:', accessToken ? 'Set' : 'Not set');
      console.log('📱 Phone Number ID:', phoneNumberId);

      // Build message payload - exactly as Meta requires
      // Reference: https://developers.facebook.com/docs/whatsapp/cloud-api/reference/messages
      let messagePayload: any = {
        messaging_product: 'whatsapp',
        recipient_type: 'individual', // Optional but recommended by Meta
        to: phoneNumber
      };

      // If template is provided, send template message (for first messages)
      if (messageData.templateName) {
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
          
          if (Array.isArray(messageData.templateParams)) {
            // If it's already an array, use it directly
            bodyParams = messageData.templateParams.map((param: any) => ({
              type: 'text',
              text: typeof param === 'string' ? param : param.text || param.value || String(param)
            }));
          } else {
            // Convert object to array - parameters must be in order (1, 2, 3...)
            // Check if there's a paramsOrder array to specify the order
            // Default parameter order matching Meta template "a" format
            // Template "a" requires 9 parameters in order: guest_name, event_type, bride_name, groom_name, event_date, event_time, venue, guest_response_link, couple_name
            // NOTE: Based on error message, the parameter name in Meta is "guest_response_link"
            const paramsOrder: string[] = (Array.isArray(messageData.templateParams.paramsOrder) 
              ? messageData.templateParams.paramsOrder 
              : ['guest_name', 'event_type', 'bride_name', 'groom_name', 
                 'event_date', 'event_time', 'venue', 'guest_response_link', 'couple_name']) as string[];
            
            // IMPORTANT: Meta requires ALL parameters to be sent in the exact order
            // Even if a parameter is empty, we must send it (as empty string)
            // The filter only removes 'language' and 'paramsOrder' keys, but keeps all actual template parameters
            bodyParams = paramsOrder
              .filter((key: string) => key !== 'language' && key !== 'paramsOrder')
              .map((key: string) => {
                const paramValue = messageData.templateParams![key];
                let textValue = paramValue ? String(paramValue).trim() : '';
                
                // Log if parameter is empty to help debug
                if (!textValue) {
                  console.warn(`⚠️ Empty parameter detected: ${key}`);
                  textValue = ' '; // Use space for empty parameters
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
                // For named parameters ({{param_name}}), MUST include parameter_name field
                // For positional parameters ({{1}}, {{2}}), don't include parameter_name
                // Since the template uses named parameters ({{guest_name}}, {{event_type}}, etc.),
                // we MUST include parameter_name
                return {
                  type: 'text',
                  parameter_name: key, // REQUIRED for named parameter templates!
                  text: finalValue
                };
              });
          }
          
          // Add body component with parameters - Meta requires this exact structure
          // Reference: https://developers.facebook.com/docs/whatsapp/cloud-api/guides/send-message-templates
          if (bodyParams.length > 0) {
            components.push({
              type: 'body',
              parameters: bodyParams
            });
          }
          
          // Some templates may have a header component (e.g., with image)
          // If template has header but we don't send it, Meta will return error 132012
          // We can send image as header if:
          // 1. Template requires header image (defined in Meta)
          // 2. We have an imageUrl to send
          // Priority: headerImageUrl from templateParams > imageUrl from messageData
          const headerImageUrl = (messageData.templateParams as any)?.headerImageUrl || finalImageUrl;
          
          // Check if we have a valid HTTPS image URL for header
          if (headerImageUrl && headerImageUrl.startsWith('https://')) {
            components.unshift({
              type: 'header',
              parameters: [
                {
                  type: 'image',
                  image: {
                    link: headerImageUrl
                  }
                }
              ]
            });
            console.log('🖼️ Adding header image to template:', headerImageUrl);
          } else if (messageData.imageUrl && !messageData.imageUrl.startsWith('https://')) {
            // Local file path detected - cannot send as header image
            // If template requires header image, this will cause error 132012
            console.warn('⚠️ Template may require header image, but image URL is local file path');
            console.warn('⚠️ Please upload image to a public URL (HTTPS) or remove header image from template in Meta');
          }
          
          // Note: If template in Meta has header image but we don't send header component,
          // Meta will return error 132012: "Format mismatch, expected IMAGE, received UNKNOWN"
          // Solution: Either remove header image from template in Meta, or upload image to HTTPS URL
          
          // Only add components if we have parameters (Meta requirement)
          // Empty components array is not allowed
          if (components.length > 0) {
            messagePayload.template.components = components;
          } else {
            // If no parameters, don't send components at all (for templates without parameters)
            console.log('📋 No parameters to send - template will be sent without components');
          }
          
          console.log('📋 Template parameters:', JSON.stringify(bodyParams, null, 2));
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
      console.log('📤 Sending via WhatsApp Business API...');
      const response = await fetch(`https://graph.facebook.com/v22.0/${phoneNumberId}/messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(messagePayload)
      });

      console.log('📊 WhatsApp Business API response status:', response.status);
      
      if (response.ok) {
        const responseData = await response.json();
        console.log('📱 Full Response:', JSON.stringify(responseData, null, 2));
        
        // Check if message was actually accepted - both messageId and contact.wa_id are required
        const messageId = responseData.messages?.[0]?.id;
        const contact = responseData.contacts?.[0];
        const waId = contact?.wa_id;
        
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
                diagnosticMessage += '\n\n⚠️ IMPORTANT: Template Issue (Error Code 100)';
                diagnosticMessage += `\n   Template "${messageData.templateName}" has an issue with parameters.`;
                diagnosticMessage += '\n   According to Meta documentation (Error Code 100):';
                diagnosticMessage += '\n   "The request included one or more unsupported or misspelled parameters."';
                diagnosticMessage += '\n\n   Possible causes:';
                diagnosticMessage += '\n   1. Parameter name mismatch (case-sensitive, exact spelling required)';
                diagnosticMessage += '\n   2. Parameter not defined in template\'s Variable Samples';
                diagnosticMessage += '\n   3. Parameter exceeds length limit';
                diagnosticMessage += '\n   4. Template not fully approved (must be "Approved", not "Pending Quality Review")';
                diagnosticMessage += '\n   5. Parameter order mismatch';
                diagnosticMessage += '\n\n   🔍 CRITICAL CHECKS in Meta Business Manager → WhatsApp → Message Templates:';
                diagnosticMessage += `\n   1. Find template "${messageData.templateName}"`;
                diagnosticMessage += '\n   2. Status MUST be "Approved" (NOT "Pending Quality Review")';
                diagnosticMessage += '\n   3. Click "Edit" → Go to "Body" section';
                diagnosticMessage += '\n   4. Check "Variable Samples" section:';
                diagnosticMessage += '\n      - EVERY parameter MUST have a NAME defined (not empty!)';
                diagnosticMessage += '\n      - Parameter names must match EXACTLY (case-sensitive)';
                diagnosticMessage += '\n      - No typos or extra spaces in parameter names';
                diagnosticMessage += `\n   5. Parameters sent: ${messageData.templateParams ? Object.keys(messageData.templateParams).filter(k => k !== 'language' && k !== 'paramsOrder').length : 0}`;
                diagnosticMessage += '\n   6. Check Error Messages section in Meta for specific parameter causing issue';
                diagnosticMessage += '\n\n   For template "a" (9 parameters):';
                         diagnosticMessage += '\n      guest_name, event_type, bride_name, groom_name, event_date, event_time, venue, guest_response_link, couple_name';
                diagnosticMessage += '\n\n   For template "reminer" (7 parameters):';
                diagnosticMessage += '\n      first_name, event_type, couple_name, event_date, event_time, venue, table_number';
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