const axios = require('axios');

// Configuration
const ACCESS_TOKEN = 'EAAQ16mfCx58BPZCAepGf7EQMznC5dwYUmsun7pZCvzLPqjOjnq778EeJtXGEdemBVXdqTEt9pJ0bm2l5EyL9BZAR9kVS15kjz9rWYAcbKZCZBVOQswHeZAfmkUNv2TZAeX8KGaJ8OZCb4ZCtOaZAEZARqvG2TE7DHCmZBDWRATOKdvfHZA4j8FGluUX8NNGdsqbBEVgFjNgZDZD';
const PHONE_NUMBER_ID = '874204535776090';
const TARGET_PHONE = '972547377881';

async function testTemplateWithoutAmpersand() {
  try {
    const apiUrl = `https://graph.facebook.com/v22.0/${PHONE_NUMBER_ID}/messages`;

    // Test 1: Replace & with ו
    console.log('🧪 בדיקה 1: החלפת & ב-ו');
    const params1 = [
      'עידו',
      'חתונה',
      'דור ונאל', // No & symbol
      '21 באוקטובר 2025',
      '23:05',
      'יארה חדרה',
      'לא הוקצה',
      'http://192.168.1.47:3001/guest-response/test?guest=test'
    ];

    const messagePayload1 = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: TARGET_PHONE,
      type: 'template',
      template: {
        name: 'reminer',
        language: { code: 'he' },
        components: [{
          type: 'body',
          parameters: params1.map(text => ({ type: 'text', text: text || ' ' }))
        }]
      }
    };

    console.log('📤 שולח...');
    const response1 = await axios.post(apiUrl, messagePayload1, {
      headers: {
        'Authorization': `Bearer ${ACCESS_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });

    console.log('✅ הצלחה! Message ID:', response1.data.messages?.[0]?.id);
    return true;

  } catch (error) {
    if (error.response) {
      const errorCode = error.response.data?.error?.code;
      const errorMessage = error.response.data?.error?.message;
      const errorDetails = error.response.data?.error?.error_data?.details || '';
      
      console.error(`❌ שגיאה: ${errorCode} - ${errorMessage}`);
      console.error(`   פרטים: ${errorDetails}`);
      
      // Try with URL encoding
      if (errorCode === 100) {
        console.log('');
        console.log('🧪 בדיקה 2: ניסיון עם URL encoding');
        
        const params2 = [
          'עידו',
          'חתונה',
          encodeURIComponent('דור & נאל'), // URL encoded
          '21 באוקטובר 2025',
          '23:05',
          'יארה חדרה',
          'לא הוקצה',
          'http://192.168.1.47:3001/guest-response/test?guest=test'
        ];

        try {
          const messagePayload2 = {
            messaging_product: 'whatsapp',
            recipient_type: 'individual',
            to: TARGET_PHONE,
            type: 'template',
            template: {
              name: 'reminer',
              language: { code: 'he' },
              components: [{
                type: 'body',
                parameters: params2.map(text => ({ type: 'text', text: text || ' ' }))
              }]
            }
          };

          const response2 = await axios.post(apiUrl, messagePayload2, {
            headers: {
              'Authorization': `Bearer ${ACCESS_TOKEN}`,
              'Content-Type': 'application/json'
            }
          });

          console.log('✅ הצלחה עם URL encoding! Message ID:', response2.data.messages?.[0]?.id);
          return true;
        } catch (error2) {
          console.error(`❌ גם URL encoding נכשל: ${error2.response?.data?.error?.message || error2.message}`);
        }
      }
    } else {
      console.error('❌ שגיאה:', error.message);
    }
    return false;
  }
}

testTemplateWithoutAmpersand();

