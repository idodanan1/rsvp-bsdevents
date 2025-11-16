const axios = require('axios');

// Configuration
const ACCESS_TOKEN = 'EAAQ16mfCx58BPZCAepGf7EQMznC5dwYUmsun7pZCvzLPqjOjnq778EeJtXGEdemBVXdqTEt9pJ0bm2l5EyL9BZAR9kVS15kjz9rWYAcbKZCZBVOQswHeZAfmkUNv2TZAeX8KGaJ8OZCb4ZCtOaZAEZARqvG2TE7DHCmZBDWRATOKdvfHZA4j8FGluUX8NNGdsqbBEVgFjNgZDZD';
const PHONE_NUMBER_ID = '874204535776090';
const TARGET_PHONE = '972547377881'; // עידו

async function testTemplateA() {
  try {
    console.log('📤 בודק שליחת טמפלט "a"...');
    console.log('');

    const apiUrl = `https://graph.facebook.com/v22.0/${PHONE_NUMBER_ID}/messages`;

    // Template "a" with 9 parameters in order:
    // 1. guest_name (first_name)
    // 2. event_type
    // 3. groom_name
    // 4. bride_name
    // 5. event_date
    // 6. event_time
    // 7. venue
    // 8. guest_response_link
    // 9. couple_name
    const messagePayload = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: TARGET_PHONE,
      type: 'template',
      template: {
        name: 'a',
        language: {
          code: 'he' // Hebrew
        },
        components: [
          {
            type: 'body',
            parameters: [
              {
                type: 'text',
                text: 'עידו' // Parameter 1: guest_name
              },
              {
                type: 'text',
                text: 'חתונה' // Parameter 2: event_type
              },
              {
                type: 'text',
                text: 'דור' // Parameter 3: groom_name
              },
              {
                type: 'text',
                text: 'ונאל' // Parameter 4: bride_name
              },
              {
                type: 'text',
                text: '21 באוקטובר 2025' // Parameter 5: event_date
              },
              {
                type: 'text',
                text: '23:05' // Parameter 6: event_time
              },
              {
                type: 'text',
                text: 'יארה חדרה' // Parameter 7: venue
              },
              {
                type: 'text',
                text: 'http://localhost:5173/guest-response/test?guest=test' // Parameter 8: guest_response_link
              },
              {
                type: 'text',
                text: 'דור & נאל' // Parameter 9: couple_name
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
    console.log('📋 Expected: 9 parameters');
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
    console.log('📱 Template בשימוש: a (עברית)');

  } catch (error) {
    console.error('❌ שגיאה בשליחת הטמפלט:');
    if (error.response) {
      console.error('📋 Status:', error.response.status);
      console.error('📋 Error:', JSON.stringify(error.response.data, null, 2));
      
      const errorCode = error.response.data?.error?.code;
      const errorMessage = error.response.data?.error?.message;
      
      if (errorCode === 132000) {
        console.error('');
        console.error('🔧 הטמפלט "a" לא קיים או לא מאושר במטה');
        console.error('💡 ודא שהטמפלט "a" קיים ומוגדר במטה עם שפה "he" (עברית)');
      } else if (errorCode === 132001) {
        console.error('');
        console.error('🔧 הטמפלט "a" לא קיים עם שפה "he"');
        console.error('💡 ודא שהטמפלט "a" מוגדר במטה עם שפה "he" (עברית)');
      } else if (errorCode === 132005) {
        console.error('');
        console.error('🔧 מספר הפרמטרים לא תואם לטמפלט');
        console.error('💡 ודא שהטמפלט "a" במטה מוגדר עם 8 פרמטרים בדיוק');
      }
    } else {
      console.error('❌ Error:', error.message);
    }
  }
}

testTemplateA();

