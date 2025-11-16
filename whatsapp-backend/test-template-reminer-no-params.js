const axios = require('axios');

// Configuration
const ACCESS_TOKEN = 'EAAQ16mfCx58BPZCAepGf7EQMznC5dwYUmsun7pZCvzLPqjOjnq778EeJtXGEdemBVXdqTEt9pJ0bm2l5EyL9BZAR9kVS15kjz9rWYAcbKZCZBVOQswHeZAfmkUNv2TZAeX8KGaJ8OZCb4ZCtOaZAEZARqvG2TE7DHCmZBDWRATOKdvfHZA4j8FGluUX8NNGdsqbBEVgFjNgZDZD';
const PHONE_NUMBER_ID = '874204535776090';
const TARGET_PHONE = '972547377881';

async function testTemplateWithoutParams() {
  try {
    const apiUrl = `https://graph.facebook.com/v22.0/${PHONE_NUMBER_ID}/messages`;

    // Try without parameters first - to see if template exists
    const messagePayload = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: TARGET_PHONE,
      type: 'template',
      template: {
        name: 'reminer',
        language: {
          code: 'he'
        }
        // No components - to check if template exists
      }
    };

    console.log('🧪 בודק אם הטמפלט קיים (ללא פרמטרים)...');
    console.log('📋 Payload:', JSON.stringify(messagePayload, null, 2));
    console.log('');

    const response = await axios.post(apiUrl, messagePayload, {
      headers: {
        'Authorization': `Bearer ${ACCESS_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });

    console.log('✅ הטמפלט קיים!');
    console.log('📱 Message ID:', response.data.messages?.[0]?.id || 'N/A');
    return true;

  } catch (error) {
    if (error.response) {
      const errorCode = error.response.data?.error?.code;
      const errorMessage = error.response.data?.error?.message;
      const errorDetails = error.response.data?.error?.error_data?.details || '';
      
      console.log(`❌ שגיאה: ${errorCode} - ${errorMessage}`);
      if (errorDetails) {
        console.log(`   פרטים: ${errorDetails}`);
      }
      
      if (errorCode === 132000) {
        console.log('');
        console.log('💡 הטמפלט דורש פרמטרים - זה טוב!');
        console.log('   אבל יש בעיה עם הפרמטרים שאנחנו שולחים');
      } else if (errorCode === 132001) {
        console.log('');
        console.log('💡 הטמפלט לא קיים עם שפה "he"');
      } else if (errorCode === 100) {
        console.log('');
        console.log('💡 יש בעיה עם הפרמטרים או שהטמפלט לא מאושר');
      }
    } else {
      console.log(`❌ שגיאה: ${error.message}`);
    }
    return false;
  }
}

testTemplateWithoutParams();

