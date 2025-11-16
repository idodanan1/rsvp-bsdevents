const axios = require('axios');

// Configuration
const ACCESS_TOKEN = 'EAAQ16mfCx58BPZCAepGf7EQMznC5dwYUmsun7pZCvzLPqjOjnq778EeJtXGEdemBVXdqTEt9pJ0bm2l5EyL9BZAR9kVS15kjz9rWYAcbKZCZBVOQswHeZAfmkUNv2TZAeX8KGaJ8OZCb4ZCtOaZAEZARqvG2TE7DHCmZBDWRATOKdvfHZA4j8FGluUX8NNGdsqbBEVgFjNgZDZD';
const PHONE_NUMBER_ID = '874204535776090';
const TARGET_PHONE = '972547377881';

async function testTemplateWithParams(numParams) {
  try {
    const apiUrl = `https://graph.facebook.com/v22.0/${PHONE_NUMBER_ID}/messages`;

    // Create parameters array with the specified number
    const params = [];
    const paramValues = [
      'עידו',           // 1. guest_name
      'חתונה',          // 2. event_type
      'דור',            // 3. groom_name
      'ונאל',           // 4. bride_name
      '21 באוקטובר 2025', // 5. event_date
      '23:05',          // 6. event_time
      'יארה חדרה',      // 7. venue
      'http://localhost:5173/guest-response/test?guest=test', // 8. guest_response_link
      'דור & נאל'       // 9. couple_name
    ];

    for (let i = 0; i < numParams; i++) {
      params.push({
        type: 'text',
        text: paramValues[i] || `test${i + 1}`
      });
    }

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
            parameters: params
          }
        ]
      }
    };

    console.log(`🔄 מנסה עם ${numParams} פרמטרים...`);
    
    const response = await axios.post(apiUrl, messagePayload, {
      headers: {
        'Authorization': `Bearer ${ACCESS_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });

    console.log(`✅ הצלחה עם ${numParams} פרמטרים!`);
    console.log('📱 Message ID:', response.data.messages?.[0]?.id || 'N/A');
    return true;

  } catch (error) {
    if (error.response) {
      const errorCode = error.response.data?.error?.code;
      const errorMessage = error.response.data?.error?.message;
      const errorDetails = error.response.data?.error?.error_data?.details || '';
      
      console.log(`❌ ${numParams} פרמטרים: ${errorCode} - ${errorMessage}`);
      if (errorDetails) {
        console.log(`   פרטים: ${errorDetails}`);
      }
    } else {
      console.log(`❌ ${numParams} פרמטרים: ${error.message}`);
    }
    return false;
  }
}

async function testDifferentParamCounts() {
  console.log('📤 בודק טמפלט "a" עם מספרים שונים של פרמטרים...');
  console.log('');

  // Try different numbers of parameters
  const countsToTry = [8, 9, 10];
  
  for (const count of countsToTry) {
    const success = await testTemplateWithParams(count);
    if (success) {
      console.log('');
      console.log(`✅ הטמפלט עובד עם ${count} פרמטרים!`);
      return count;
    }
    console.log('');
  }

  console.log('❌ הטמפלט לא עובד עם אף מספר פרמטרים');
  console.log('');
  console.log('💡 אנא בדוק במטה:');
  console.log('   1. כמה פרמטרים יש בטמפלט "a"?');
  console.log('   2. מה הסדר המדויק של הפרמטרים?');
  console.log('   3. האם הטמפלט מאושר?');
  
  return null;
}

testDifferentParamCounts();

