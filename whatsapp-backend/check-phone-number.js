const axios = require('axios');
require('dotenv').config();

// WhatsApp Business API Configuration
const ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN || 'EAAQ16mfCx58BPZCAepGf7EQMznC5dwYUmsun7pZCvzLPqjOjnq778EeJtXGEdemBVXdqTEt9pJ0bm2l5EyL9BZAR9kVS15kjz9rWYAcbKZCZBVOQswHeZAfmkUNv2TZAeX8KGaJ8OZCb4ZCtOaZAEZARqvG2TE7DHCmZBDWRATOKdvfHZA4j8FGluUX8NNGdsqbBEVgFjNgZDZD';
const PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID || '874204535776090';

async function checkPhoneNumber() {
  console.log('🔍 בודק פרטי מספר WhatsApp Business...');
  console.log('📱 Phone Number ID:', PHONE_NUMBER_ID);
  console.log('🔑 Access Token:', ACCESS_TOKEN ? 'Set' : 'Not set');
  console.log('');

  try {
    // Get phone number details from WhatsApp Business API
    const apiUrl = `https://graph.facebook.com/v22.0/${PHONE_NUMBER_ID}`;
    
    console.log('🌐 API URL:', apiUrl);
    console.log('📤 שולח בקשה...');
    console.log('');

    const response = await axios.get(apiUrl, {
      headers: {
        'Authorization': `Bearer ${ACCESS_TOKEN}`,
        'Content-Type': 'application/json'
      },
      params: {
        fields: 'verified_name,display_phone_number,quality_rating'
      }
    });

    console.log('✅ פרטי המספר:');
    console.log('📊 תגובה:', JSON.stringify(response.data, null, 2));
    console.log('');

    if (response.data.display_phone_number) {
      console.log('📱 מספר הטלפון שממנו נשלחות ההודעות:');
      console.log('   ' + response.data.display_phone_number);
    }
    
    if (response.data.verified_name) {
      console.log('🏢 שם מאומת:', response.data.verified_name);
    }

  } catch (error) {
    console.error('❌ שגיאה בבדיקת המספר:');
    
    if (error.response) {
      console.error('📊 סטטוס:', error.response.status);
      console.error('📄 תגובה:', JSON.stringify(error.response.data, null, 2));
      
      // Try alternative method - get from phone_numbers endpoint
      console.log('');
      console.log('🔄 מנסה דרך אחרת...');
      
      try {
        // Try to get phone number from business account
        const businessAccountUrl = 'https://graph.facebook.com/v22.0/me';
        const businessResponse = await axios.get(businessAccountUrl, {
          headers: {
            'Authorization': `Bearer ${ACCESS_TOKEN}`,
            'Content-Type': 'application/json'
          }
        });
        
        console.log('📊 פרטי חשבון עסקי:', JSON.stringify(businessResponse.data, null, 2));
        
      } catch (altError) {
        console.error('❌ שגיאה גם בדרך החלופית:', altError.message);
      }
    } else {
      console.error('❌ שגיאה:', error.message);
    }
    
    console.log('');
    console.log('💡 הערה:');
    console.log('   Phone Number ID הוא מזהה טכני, לא המספר עצמו');
    console.log('   כדי לראות את המספר האמיתי, לך ל:');
    console.log('   https://developers.facebook.com/apps/');
    console.log('   בחר את האפליקציה שלך → WhatsApp → API Setup');
    console.log('   שם תראה את המספר האמיתי');
  }
}

// Run the script
checkPhoneNumber();

