const axios = require('axios');

// Configuration
const ACCESS_TOKEN = 'EAAQ16mfCx58BPZCAepGf7EQMznC5dwYUmsun7pZCvzLPqjOjnq778EeJtXGEdemBVXdqTEt9pJ0bm2l5EyL9BZAR9kVS15kjz9rWYAcbKZCZBVOQswHeZAfmkUNv2TZAeX8KGaJ8OZCb4ZCtOaZAEZARqvG2TE7DHCmZBDWRATOKdvfHZA4j8FGluUX8NNGdsqbBEVgFjNgZDZD';
const PHONE_NUMBER_ID = '874204535776090';
const TARGET_PHONE = '972547377881';

async function testTemplateWithSpecificParams(params) {
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
            parameters: params.map(text => ({
              type: 'text',
              text: text || '' // Ensure no undefined/null
            }))
          }
        ]
      }
    };

    console.log('📋 פרמטרים:');
    params.forEach((p, i) => {
      console.log(`   ${i + 1}. "${p}" (אורך: ${p ? p.length : 0})`);
    });
    console.log('');

    const response = await axios.post(apiUrl, messagePayload, {
      headers: {
        'Authorization': `Bearer ${ACCESS_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });

    console.log('✅ הצלחה!');
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
  const success1 = await testTemplateWithSpecificParams([
    'עידו',
    'חתונה',
    'דור',
    'ונאל',
    '21 באוקטובר 2025',
    '23:05',
    'יארה חדרה',
    'https://example.com/rsvp',
    'דור ונאל'
  ]);
  console.log('');

  if (!success1) {
    // Test 2: Try without emojis in venue
    console.log('🧪 בדיקה 2: ללא אימוג\'ים במיקום');
    await testTemplateWithSpecificParams([
      'עידו',
      'חתונה',
      'דור',
      'ונאל',
      '21 באוקטובר 2025',
      '23:05',
      'יארה חדרה',
      'https://example.com/rsvp',
      'דור ונאל'
    ]);
    console.log('');

    // Test 3: Try with shorter values
    console.log('🧪 בדיקה 3: ערכים קצרים יותר');
    await testTemplateWithSpecificParams([
      'עידו',
      'חתונה',
      'דור',
      'נאל',
      '21.10.2025',
      '23:05',
      'חדרה',
      'https://test.com',
      'דור ונאל'
    ]);
    console.log('');

    // Test 4: Try without special characters
    console.log('🧪 בדיקה 4: ללא תווים מיוחדים');
    await testTemplateWithSpecificParams([
      'עידו',
      'חתונה',
      'דור',
      'נאל',
      '21 באוקטובר 2025',
      '23:05',
      'יארה חדרה',
      'http://localhost:5173/guest-response/test?guest=test',
      'דור ונאל'
    ]);
    console.log('');
  }

  console.log('💡 אם כל הבדיקות נכשלו, ייתכן שהטמפלט במטה לא מוגדר נכון');
  console.log('   אנא בדוק במטה Business Manager את הטמפלט "a"');
}

testDifferentScenarios();

