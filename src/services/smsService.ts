// SMS Service
export interface SMSMessage {
  to: string;
  message: string;
}

export interface SMSResponse {
  success: boolean;
  messageId?: string;
  error?: string;
}

class SMSService {
  private apiUrl = import.meta.env.VITE_SMS_API_URL || 'https://api.twilio.com/2010-04-01/Accounts';
  private accountSid = import.meta.env.VITE_TWILIO_ACCOUNT_SID || 'ACb9bdf15ec4c32919f0605df55b4c32e5';
  private authToken = import.meta.env.VITE_TWILIO_AUTH_TOKEN || '17073428e45b4285c68a01bfdbd3daa1';
  
  constructor() {
    try {
      console.log('🔧 SMS Service initialized:');
      console.log('📱 Account SID:', this.accountSid);
      console.log('🔑 Auth Token:', this.authToken ? 'Set' : 'Not set');
      console.log('🌐 API URL:', this.apiUrl);
    } catch (error) {
      console.error('❌ Error initializing SMS Service:', error);
      // Don't throw - allow app to continue loading
    }
  }

  async sendMessage(messageData: SMSMessage): Promise<SMSResponse> {
    try {
      console.log('📱 SMS Message:', messageData);
      console.log('📞 To:', messageData.to);
      console.log('💬 Message:', messageData.message.substring(0, 100) + '...');

      // Production API call
      const fromNumber = import.meta.env.VITE_SMS_FROM_NUMBER || '+12347040727';
      const toNumber = messageData.to.startsWith('+') ? messageData.to : `+972${messageData.to.replace(/^0/, '')}`;
      
      console.log('📞 Twilio API Call:');
      console.log('From:', fromNumber);
      console.log('To:', toNumber);
      console.log('Original number:', messageData.to);
      console.log('Formatted number:', toNumber);
      
      // Validate credentials
      if (!this.accountSid || !this.authToken) {
        throw new Error('Twilio credentials are missing. Please set VITE_TWILIO_ACCOUNT_SID and VITE_TWILIO_AUTH_TOKEN');
      }

      const response = await fetch(`${this.apiUrl}/${this.accountSid}/Messages.json`, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${btoa(`${this.accountSid}:${this.authToken}`)}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams({
          To: toNumber,
          From: fromNumber,
          Body: messageData.message
        })
      });

      const data = await response.json();

      if (response.ok) {
        console.log('✅ SMS sent successfully!', data);
        console.log('📱 Message SID:', data.sid);
        console.log('📱 Message Status:', data.status);
        return {
          success: true,
          messageId: data.messageId || data.sid
        };
      } else {
        console.error('❌ SMS failed:', data);
        console.error('❌ Error details:', data.error);
        console.error('❌ Response status:', response.status);
        
        let errorMessage = data.error?.message || `SMS sending failed (${response.status})`;
        
        // Provide detailed error diagnostics
        if (response.status === 401) {
          errorMessage += '\n\n🔧 Authentication Failed (401 Unauthorized):';
          errorMessage += '\n1. Verify Account SID is correct:';
          errorMessage += `\n   Current SID: ${this.accountSid}`;
          errorMessage += '\n   Go to: Twilio Console > Account Info';
          errorMessage += '\n2. Verify Auth Token is correct:';
          errorMessage += '\n   Current Token: ' + (this.authToken ? 'Set (hidden)' : 'Not set');
          errorMessage += '\n   Go to: Twilio Console > Account Info > Auth Token';
          errorMessage += '\n   Click the eye icon to reveal the token';
          errorMessage += '\n3. Update credentials in .env file:';
          errorMessage += '\n   VITE_TWILIO_ACCOUNT_SID=your_account_sid';
          errorMessage += '\n   VITE_TWILIO_AUTH_TOKEN=your_auth_token';
          errorMessage += '\n4. Restart the development server after updating .env';
        } else if (response.status === 400) {
          errorMessage += '\n\n🔧 Bad Request (400):';
          errorMessage += '\n1. Check phone number format (must include country code)';
          errorMessage += `\n   From: ${fromNumber}`;
          errorMessage += `\n   To: ${toNumber}`;
          errorMessage += '\n2. Verify the "From" number is valid in your Twilio account';
          errorMessage += '\n   Go to: Twilio Console > Phone Numbers > Manage > Active numbers';
        } else if (response.status === 403) {
          errorMessage += '\n\n🔧 Forbidden (403):';
          errorMessage += '\n1. Check your Twilio account balance';
          errorMessage += '\n2. Verify your account is not suspended';
          errorMessage += '\n3. Check if the destination country is supported';
        }
        
        console.error('📋 Full Error Response:', JSON.stringify(data, null, 2));
        
        return {
          success: false,
          error: errorMessage
        };
      }
    } catch (error) {
      console.error('SMS API Error:', error);
      return {
        success: false,
        error: 'Network error or SMS service unavailable'
      };
    }
  }

  async sendBulkMessages(messages: SMSMessage[]): Promise<SMSResponse[]> {
    const results: SMSResponse[] = [];
    
    // Send messages with delay to avoid rate limiting
    for (const message of messages) {
      const result = await this.sendMessage(message);
      results.push(result);
      
      // Add delay between messages (500ms)
      if (messages.indexOf(message) < messages.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
    
    return results;
  }

  // Validate phone number format
  validatePhoneNumber(phoneNumber: string): boolean {
    // Remove all non-digit characters
    const cleaned = phoneNumber.replace(/\D/g, '');
    
    // Check if it's a valid Israeli phone number
    const israeliPattern = /^(0[2-9]|972[2-9])\d{8}$/;
    
    return israeliPattern.test(cleaned);
  }

  // Format phone number for SMS
  formatPhoneNumber(phoneNumber: string): string {
    const cleaned = phoneNumber.replace(/\D/g, '');
    
    // If starts with 0, replace with +972
    if (cleaned.startsWith('0')) {
      return '+972' + cleaned.substring(1);
    }
    
    // If starts with 972, add +
    if (cleaned.startsWith('972')) {
      return '+' + cleaned;
    }
    
    // If doesn't start with country code, assume Israeli
    return '+972' + cleaned;
  }
}

export const smsService = new SMSService();