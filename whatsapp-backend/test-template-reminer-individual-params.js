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
        name: 'reminer',
        language: {
          code: 'he'
        },
        components: [
          {
            type: 'body',
            parameters: params.map((text, index) => {
              const paramValue = text || ' ';
              console.log(`   פרמטר ${index + 1}: "${paramValue}" (אורך: ${paramValue.length})`);
              return {
                type: 'text',
                text: paramValue
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

async function testDifferentParamVariations() {
  console.log('📤 בודק טמפלט "reminer" עם וריאציות שונות של פרמטרים...');
  console.log('');

  // Test 1: Original parameters from the campaign
  console.log('🧪 בדיקה 1: הפרמטרים המקוריים מהקמפיין');
  const params1 = [
    'עידו',
    'חתונה',
    'דור & נאל',
    '21 באוקטובר 2025',
    '23:05',
    'יארה חדרה',
    'לא הוקצה',
    'http://192.168.1.47:3001/guest-response/obubhev8amg6v9syr?guest=gzmysejhbmg6vykgc'
  ];
  await testTemplateWithParams(params1, 'פרמטרים מקוריים');
  console.log('');

  // Test 2: Replace & with ו
  console.log('🧪 בדיקה 2: החלפת & ב-ו');
  const params2 = [
    'עידו',
    'חתונה',
    'דור ונאל', // No & symbol
    '21 באוקטובר 2025',
    '23:05',
    'יארה חדרה',
    'לא הוקצה',
    'http://192.168.1.47:3001/guest-response/obubhev8amg6v9syr?guest=gzmysejhbmg6vykgc'
  ];
  await testTemplateWithParams(params2, 'ללא תו &');
  console.log('');

  // Test 3: Replace "לא הוקצה" with a number
  console.log('🧪 בדיקה 3: החלפת "לא הוקצה" במספר');
  const params3 = [
    'עידו',
    'חתונה',
    'דור ונאל',
    '21 באוקטובר 2025',
    '23:05',
    'יארה חדרה',
    '1', // Simple number instead of "לא הוקצה"
    'http://192.168.1.47:3001/guest-response/obubhev8amg6v9syr?guest=gzmysejhbmg6vykgc'
  ];
  await testTemplateWithParams(params3, 'מספר שולחן פשוט');
  console.log('');

  // Test 4: Replace URL with simple text
  console.log('🧪 בדיקה 4: החלפת URL בטקסט פשוט');
  const params4 = [
    'עידו',
    'חתונה',
    'דור ונאל',
    '21 באוקטובר 2025',
    '23:05',
    'יארה חדרה',
    '1',
    'https://example.com/rsvp' // Simple URL
  ];
  await testTemplateWithParams(params4, 'URL פשוט');
  console.log('');

  // Test 5: All simple values
  console.log('🧪 בדיקה 5: כל הערכים פשוטים');
  const params5 = [
    'Test',
    'Wedding',
    'Couple',
    '2025-10-21',
    '23:05',
    'Venue',
    '1',
    'https://example.com'
  ];
  await testTemplateWithParams(params5, 'ערכים באנגלית');
  console.log('');

  console.log('💡 אם כל הבדיקות נכשלו, ייתכן שהטמפלט במטה לא מאושר');
  console.log('   אנא בדוק במטה Business Manager:');
  console.log('   1. האם הטמפלט "reminer" מאושר?');
  console.log('   2. האם יש 8 פרמטרים בטמפלט?');
  console.log('   3. מה השמות המדויקים של הפרמטרים בטמפלט?');
}

testDifferentParamVariations();

