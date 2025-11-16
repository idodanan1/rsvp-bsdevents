const axios = require('axios');

// Configuration
const ACCESS_TOKEN = 'EAAQ16mfCx58BPZCAepGf7EQMznC5dwYUmsun7pZCvzLPqjOjnq778EeJtXGEdemBVXdqTEt9pJ0bm2l5EyL9BZAR9kVS15kjz9rWYAcbKZCZBVOQswHeZAfmkUNv2TZAeX8KGaJ8OZCb4ZCtOaZAEZARqvG2TE7DHCmZBDWRATOKdvfHZA4j8FGluUX8NNGdsqbBEVgFjNgZDZD';
const PHONE_NUMBER_ID = '874204535776090';
const TARGET_PHONE = '972547377881';

async function testTemplateWithDifferentCoupleName(coupleName, description) {
  try {
    const apiUrl = `https://graph.facebook.com/v22.0/${PHONE_NUMBER_ID}/messages`;

    const messagePayload = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: TARGET_PHONE,
      type: 'template',
      template: {
        name: 'a',
        language: {
          code: 'he'
        },
        components: [
          {
            type: 'body',
            parameters: [
              { type: 'text', text: 'עידו' },
              { type: 'text', text: 'חתונה' },
              { type: 'text', text: 'נאל' },
              { type: 'text', text: 'דור' },
              { type: 'text', text: '21 באוקטובר 2025' },
              { type: 'text', text: '23:05' },
              { type: 'text', text: 'יארה חדרה' },
              { type: 'text', text: 'http://192.168.1.47:3001/guest-response/test?guest=test' },
              { type: 'text', text: coupleName } // Parameter 9: couple_name
            ]
          }
        ]
      }
    };

    console.log(`🧪 ${description}`);
    console.log(`📋 couple_name: "${coupleName}"`);
    console.log('');

    const response = await axios.post(apiUrl, messagePayload, {
      headers: {
        'Authorization': `Bearer ${ACCESS_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });

    console.log(`✅ הצלחה!`);
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
    } else {
      console.log(`❌ שגיאה: ${error.message}`);
    }
    return false;
  }
}

async function testDifferentCoupleNames() {
  console.log('📤 בודק טמפלט "a" עם וריאציות שונות של couple_name...');
  console.log('');

  // Test 1: Without & symbol
  const success1 = await testTemplateWithDifferentCoupleName('דור ונאל', 'ללא תו &');
  if (success1) return;
  console.log('');

  // Test 2: With & symbol (original)
  const success2 = await testTemplateWithDifferentCoupleName('דור & נאל', 'עם תו &');
  if (success2) return;
  console.log('');

  // Test 3: Simple text
  const success3 = await testTemplateWithDifferentCoupleName('דור ונאל', 'טקסט פשוט');
  if (success3) return;
  console.log('');

  console.log('❌ כל הבדיקות נכשלו');
  console.log('');
  console.log('💡 הבעיה היא כנראה לא עם התו &');
  console.log('   הבעיה היא כנראה שהטמפלט במטה לא מאושר במלואו או שיש בעיה אחרת');
}

testDifferentCoupleNames();

