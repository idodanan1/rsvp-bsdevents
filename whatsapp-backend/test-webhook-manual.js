// Manual test script to simulate webhook button click
// This can be used to test if the update logic works

const axios = require('axios');

const WEBHOOK_URL = 'http://localhost:3002/api/whatsapp/webhook';

// Simulate a button click webhook payload
const simulateButtonClick = async (phoneNumber, buttonId, buttonTitle) => {
  const webhookPayload = {
    object: 'whatsapp_business_account',
    entry: [
      {
        id: 'WHATSAPP_BUSINESS_ACCOUNT_ID',
        changes: [
          {
            value: {
              messaging_product: 'whatsapp',
              metadata: {
                display_phone_number: '1234567890',
                phone_number_id: '874204535776090'
              },
              contacts: [
                {
                  profile: {
                    name: 'Test User'
                  },
                  wa_id: phoneNumber
                }
              ],
              messages: [
                {
                  from: phoneNumber,
                  id: 'wamid.test_' + Date.now(),
                  timestamp: Math.floor(Date.now() / 1000),
                  type: 'interactive',
                  interactive: {
                    type: 'button_reply',
                    button_reply: {
                      id: buttonId,
                      title: buttonTitle
                    }
                  }
                }
              ]
            },
            field: 'messages'
          }
        ]
      }
    ]
  };

  console.log('📤 Sending test webhook:', JSON.stringify(webhookPayload, null, 2));

  try {
    const response = await axios.post(WEBHOOK_URL, webhookPayload, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    console.log('✅ Webhook sent successfully:', response.status);
    console.log('📋 Response:', response.data);
  } catch (error) {
    console.error('❌ Error sending webhook:', error.message);
    if (error.response) {
      console.error('📋 Error response:', error.response.data);
    }
  }
};

// Test with decline button
const phoneNumber = process.argv[2] || '972524721147';
const buttonId = process.argv[3] || 'decline_attendance';
const buttonTitle = process.argv[4] || 'לא אוכל להגיע';

console.log('🧪 Testing webhook with:');
console.log('   Phone:', phoneNumber);
console.log('   Button ID:', buttonId);
console.log('   Button Title:', buttonTitle);
console.log('');

simulateButtonClick(phoneNumber, buttonId, buttonTitle);

