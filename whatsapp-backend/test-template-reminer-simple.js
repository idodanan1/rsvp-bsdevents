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
            parameters: params.map(text => ({
              type: 'text',
              text: text || ' '
            }))
          }
        ]
      }
    };

    console.log(`🧪 ${description}`);
    console.log(`📋 פרמטרים (${params.length}):`, params.map((p, i) => `${i + 1}. "${p}"`).join(', '));
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

async function testDifferentScenarios() {
  console.log('📤 בודק טמפלט "reminer" עם תרחישים שונים...');
  console.log('');

  // Test 1: All parameters with simple values (no special characters)
  console.log('🧪 בדיקה 1: כל הפרמטרים עם ערכים פשוטים (ללא תווים מיוחדים)');
  const success1 = await testTemplateWithParams([
    'עידו',
    'חתונה',
    'דור ונאל', // No & symbol
    '21 באוקטובר 2025',
    '23:05',
    'יארה חדרה',
    '1', // Simple table number
    'https://example.com/rsvp'
  ], 'ערכים פשוטים ללא תווים מיוחדים');
  console.log('');

  if (!success1) {
    // Test 2: Try with fewer parameters
    console.log('🧪 בדיקה 2: פחות פרמטרים (7 במקום 8)');
    await testTemplateWithParams([
      'עידו',
      'חתונה',
      'דור ונאל',
      '21 באוקטובר 2025',
      '23:05',
      'יארה חדרה',
      'https://example.com/rsvp'
    ], '7 פרמטרים (ללא table_number)');
    console.log('');

    // Test 3: Try with more parameters
    console.log('🧪 בדיקה 3: יותר פרמטרים (9 במקום 8)');
    await testTemplateWithParams([
      'עידו',
      'חתונה',
      'דור ונאל',
      '21 באוקטובר 2025',
      '23:05',
      'יארה חדרה',
      '1',
      'https://example.com/rsvp',
      'תוספת'
    ], '9 פרמטרים');
    console.log('');

    // Test 4: Try without table_number (maybe it's optional?)
    console.log('🧪 בדיקה 4: ללא table_number (אולי זה אופציונלי?)');
    await testTemplateWithParams([
      'עידו',
      'חתונה',
      'דור ונאל',
      '21 באוקטובר 2025',
      '23:05',
      'יארה חדרה',
      'https://example.com/rsvp'
    ], '7 פרמטרים (ללא table_number)');
    console.log('');
  }

  console.log('💡 אם כל הבדיקות נכשלו, ייתכן שהטמפלט במטה לא מאושר או לא מוגדר נכון');
  console.log('   אנא בדוק במטה Business Manager את הטמפלט "reminer"');
}

testDifferentScenarios();

