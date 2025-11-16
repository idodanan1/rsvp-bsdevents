const axios = require('axios');

// Configuration
const ACCESS_TOKEN = 'EAAQ16mfCx58BPZCAepGf7EQMznC5dwYUmsun7pZCvzLPqjOjnq778EeJtXGEdemBVXdqTEt9pJ0bm2l5EyL9BZAR9kVS15kjz9rWYAcbKZCZBVOQswHeZAfmkUNv2TZAeX8KGaJ8OZCb4ZCtOaZAEZARqvG2TE7DHCmZBDWRATOKdvfHZA4j8FGluUX8NNGdsqbBEVgFjNgZDZD';
const PHONE_NUMBER_ID = '874204535776090';
const TARGET_PHONE = '972547377881'; // עידו

async function testTemplateReminer() {
  try {
    console.log('📤 בודק שליחת טמפלט "reminer"...');
    console.log('');

    const apiUrl = `https://graph.facebook.com/v22.0/${PHONE_NUMBER_ID}/messages`;

    // Template "reminer" with 8 parameters in order:
    // 1. first_name
    // 2. event_type
    // 3. couple_name
    // 4. event_date
    // 5. event_time
    // 6. venue
    // 7. table_number
    // 8. guest_response_link
    const messagePayload = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: TARGET_PHONE,
      type: 'template',
      template: {
        name: 'reminer',
        language: {
          code: 'he' // Hebrew
        },
        components: [
          {
            type: 'body',
            parameters: [
              {
                type: 'text',
                text: 'עידו' // Parameter 1: first_name
              },
              {
                type: 'text',
                text: 'חתונה' // Parameter 2: event_type
              },
              {
                type: 'text',
                text: 'דור & נאל' // Parameter 3: couple_name
              },
              {
                type: 'text',
                text: '21 באוקטובר 2025' // Parameter 4: event_date
              },
              {
                type: 'text',
                text: '23:05' // Parameter 5: event_time
              },
              {
                type: 'text',
                text: 'יארה חדרה' // Parameter 6: venue
              },
              {
                type: 'text',
                text: 'לא הוקצה' // Parameter 7: table_number
              },
              {
                type: 'text',
                text: 'http://192.168.1.47:3001/guest-response/test?guest=test' // Parameter 8: guest_response_link
              }
            ]
          }
        ]
      }
    };

    console.log('📋 Payload:');
    console.log(JSON.stringify(messagePayload, null, 2));
    console.log('');
    console.log('📋 Number of parameters:', messagePayload.template.components[0].parameters.length);
    console.log('📋 Expected: 8 parameters');
    console.log('');

    const response = await axios.post(apiUrl, messagePayload, {
      headers: {
        'Authorization': `Bearer ${ACCESS_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });

    console.log('✅ הודעה נשלחה בהצלחה!');
    console.log('📊 תגובה:', JSON.stringify(response.data, null, 2));
    console.log('');
    console.log('📱 Message ID:', response.data.messages?.[0]?.id || 'N/A');
    console.log('📱 Template בשימוש: reminer (עברית)');

  } catch (error) {
    console.error('❌ שגיאה בשליחת הטמפלט:');
    if (error.response) {
      console.error('📋 Status:', error.response.status);
      console.error('📋 Error:', JSON.stringify(error.response.data, null, 2));
      
      const errorCode = error.response.data?.error?.code;
      const errorMessage = error.response.data?.error?.message;
      const errorDetails = error.response.data?.error?.error_data?.details || '';
      
      if (errorCode === 132000) {
        console.error('');
        console.error('🔧 מספר הפרמטרים לא תואם לטמפלט');
        console.error('💡 פרטים:', errorDetails);
      } else if (errorCode === 132001) {
        console.error('');
        console.error('🔧 הטמפלט "reminer" לא קיים עם שפה "he"');
        console.error('💡 ודא שהטמפלט "reminer" מוגדר במטה עם שפה "he" (עברית)');
      } else if (errorCode === 100) {
        console.error('');
        console.error('🔧 פרמטר לא תקין');
        console.error('💡 פרטים:', errorDetails);
        console.error('💡 בדוק שהפרמטרים תואמים לטמפלט במטה');
      }
    } else {
      console.error('❌ Error:', error.message);
    }
  }
}

testTemplateReminer();

