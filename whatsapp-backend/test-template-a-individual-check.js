const axios = require('axios');

// Configuration
const ACCESS_TOKEN = 'EAAQ16mfCx58BPZCAepGf7EQMznC5dwYUmsun7pZCvzLPqjOjnq778EeJtXGEdemBVXdqTEt9pJ0bm2l5EyL9BZAR9kVS15kjz9rWYAcbKZCZBVOQswHeZAfmkUNv2TZAeX8KGaJ8OZCb4ZCtOaZAEZARqvG2TE7DHCmZBDWRATOKdvfHZA4j8FGluUX8NNGdsqbBEVgFjNgZDZD';
const PHONE_NUMBER_ID = '874204535776090';
const TARGET_PHONE = '972547377881';

async function testTemplateWithParams(params, description) {
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
            parameters: params.map((text, index) => {
              const paramValue = text || ' ';
              const isEmpty = !text || text.trim().length === 0;
              
              console.log(`   פרמטר ${index + 1}: "${paramValue}" (אורך: ${paramValue.length}, ריק: ${isEmpty})`);
              
              return {
                type: 'text',
                text: paramValue || ' '
              };
            })
          }
        ]
      }
    };

    console.log(`🧪 ${description}`);
    console.log('📋 פרמטרים:');

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

async function testDifferentScenarios() {
  console.log('📤 בודק טמפלט "a" עם תרחישים שונים...');
  console.log('');

  // Test 1: All parameters with simple values
  console.log('🧪 בדיקה 1: כל הפרמטרים עם ערכים פשוטים');
  const params1 = [
    'Test',
    'Wedding',
    'Bride',
    'Groom',
    '2025-10-21',
    '23:05',
    'Venue',
    'https://example.com/rsvp',
    'Couple'
  ];
  await testTemplateWithParams(params1, 'ערכים באנגלית');
  console.log('');

  // Test 2: Original Hebrew values
  console.log('🧪 בדיקה 2: ערכים בעברית (מקוריים)');
  const params2 = [
    'עידו',
    'חתונה',
    'נאל',
    'דור',
    '21 באוקטובר 2025',
    '23:05',
    'יארה חדרה',
    'http://192.168.1.47:3001/guest-response/test?guest=test',
    'דור & נאל'
  ];
  await testTemplateWithParams(params2, 'ערכים בעברית');
  console.log('');

  // Test 3: Without & symbol
  console.log('🧪 בדיקה 3: ללא תו &');
  const params3 = [
    'עידו',
    'חתונה',
    'נאל',
    'דור',
    '21 באוקטובר 2025',
    '23:05',
    'יארה חדרה',
    'http://192.168.1.47:3001/guest-response/test?guest=test',
    'דור ונאל' // No & symbol
  ];
  await testTemplateWithParams(params3, 'ללא תו &');
  console.log('');

  console.log('💡 אם כל הבדיקות נכשלו, ייתכן שהטמפלט במטה לא מאושר או שיש בעיה אחרת');
}

testDifferentScenarios();

