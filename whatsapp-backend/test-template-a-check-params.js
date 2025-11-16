const axios = require('axios');

// Configuration
const ACCESS_TOKEN = 'EAAQ16mfCx58BPZCAepGf7EQMznC5dwYUmsun7pZCvzLPqjOjnq778EeJtXGEdemBVXdqTEt9pJ0bm2l5EyL9BZAR9kVS15kjz9rWYAcbKZCZBVOQswHeZAfmkUNv2TZAeX8KGaJ8OZCb4ZCtOaZAEZARqvG2TE7DHCmZBDWRATOKdvfHZA4j8FGluUX8NNGdsqbBEVgFjNgZDZD';
const PHONE_NUMBER_ID = '874204535776090';
const TARGET_PHONE = '972547377881';

async function testTemplateWithParamCount(paramCount, description) {
  try {
    const apiUrl = `https://graph.facebook.com/v22.0/${PHONE_NUMBER_ID}/messages`;

    // Base parameters
    const baseParams = [
      'עידו', // guest_name
      'חתונה', // event_type
      'נאל', // bride_name
      'דור', // groom_name
      '21 באוקטובר 2025', // event_date
      '23:05', // event_time
      'יארה חדרה', // venue
      'http://192.168.1.47:3001/guest-response/test?guest=test', // guest_response_link
      'דור & נאל' // couple_name
    ];

    // Take only the first paramCount parameters
    const params = baseParams.slice(0, paramCount);

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
              text: text || ' '
            }))
          }
        ]
      }
    };

    console.log(`🧪 ${description}`);
    console.log(`📋 מספר פרמטרים: ${params.length}`);
    console.log(`📋 פרמטרים: ${params.map((p, i) => `${i + 1}. "${p}"`).join(', ')}`);
    console.log('');

    const response = await axios.post(apiUrl, messagePayload, {
      headers: {
        'Authorization': `Bearer ${ACCESS_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });

    console.log(`✅ הצלחה עם ${params.length} פרמטרים!`);
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
        const match = errorDetails.match(/expected number of params \((\d+)\)/);
        if (match) {
          const expectedCount = parseInt(match[1]);
          console.log(`   💡 הטמפלט במטה מצפה ל-${expectedCount} פרמטרים, אנחנו שולחים ${paramCount}`);
        }
      }
    } else {
      console.log(`❌ שגיאה: ${error.message}`);
    }
    return false;
  }
}

async function testDifferentParamCounts() {
  console.log('📤 בודק טמפלט "a" עם מספרים שונים של פרמטרים...');
  console.log('');

  // Test with different parameter counts
  const countsToTest = [8, 9, 10];

  for (const count of countsToTest) {
    const success = await testTemplateWithParamCount(count, `בדיקה עם ${count} פרמטרים`);
    if (success) {
      console.log('');
      console.log(`✅ הטמפלט עובד עם ${count} פרמטרים!`);
      return count;
    }
    console.log('');
  }

  console.log('❌ הטמפלט לא עובד עם אף מספר פרמטרים');
  console.log('');
  console.log('💡 זה אומר שהבעיה היא לא במספר הפרמטרים');
  console.log('   הבעיה היא כנראה שהטמפלט לא מאושר במטה או שיש בעיה אחרת');
  
  return null;
}

testDifferentParamCounts();

