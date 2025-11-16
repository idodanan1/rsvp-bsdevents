const axios = require('axios');

// Configuration
const ACCESS_TOKEN = 'EAAQ16mfCx58BPZCAepGf7EQMznC5dwYUmsun7pZCvzLPqjOjnq778EeJtXGEdemBVXdqTEt9pJ0bm2l5EyL9BZAR9kVS15kjz9rWYAcbKZCZBVOQswHeZAfmkUNv2TZAeX8KGaJ8OZCb4ZCtOaZAEZARqvG2TE7DHCmZBDWRATOKdvfHZA4j8FGluUX8NNGdsqbBEVgFjNgZDZD';
const PHONE_NUMBER_ID = '874204535776090';
const TARGET_PHONE = '972547377881';

const languagesToTry = ['he', 'he_IL', 'iw', 'iw_IL', 'en_US', 'en'];

async function testTemplateWithLanguage(language) {
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
          code: language
        },
        components: [
          {
            type: 'body',
            parameters: [
              { type: 'text', text: 'עידו' },
              { type: 'text', text: 'חתונה' },
              { type: 'text', text: 'דור & נאל' },
              { type: 'text', text: '21 באוקטובר 2025' },
              { type: 'text', text: '23:05' },
              { type: 'text', text: 'יארה חדרה' },
              { type: 'text', text: 'לא הוקצה' },
              { type: 'text', text: 'http://192.168.1.47:3001/guest-response/test?guest=test' }
            ]
          }
        ]
      }
    };

    console.log(`🔄 מנסה שפה: ${language}...`);
    
    const response = await axios.post(apiUrl, messagePayload, {
      headers: {
        'Authorization': `Bearer ${ACCESS_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });

    console.log(`✅ הצלחה עם שפה: ${language}`);
    console.log('📱 Message ID:', response.data.messages?.[0]?.id || 'N/A');
    return true;

  } catch (error) {
    if (error.response) {
      const errorCode = error.response.data?.error?.code;
      const errorMessage = error.response.data?.error?.message;
      const errorDetails = error.response.data?.error?.error_data?.details || '';
      
      console.log(`❌ שפה ${language}: ${errorCode} - ${errorMessage}`);
      if (errorDetails) {
        console.log(`   פרטים: ${errorDetails}`);
      }
    } else {
      console.log(`❌ שפה ${language}: ${error.message}`);
    }
    return false;
  }
}

async function testAllLanguages() {
  console.log('📤 בודק טמפלט "reminer" עם שפות שונות...');
  console.log('');

  for (const language of languagesToTry) {
    const success = await testTemplateWithLanguage(language);
    if (success) {
      console.log('');
      console.log(`✅ הטמפלט עובד עם שפה: ${language}`);
      return language;
    }
    console.log('');
  }

  console.log('❌ הטמפלט לא עובד עם אף שפה');
  console.log('');
  console.log('💡 אפשרויות:');
  console.log('   1. הטמפלט "reminer" לא מאושר במטה');
  console.log('   2. הטמפלט לא קיים');
  console.log('   3. מספר הפרמטרים לא תואם');
  console.log('   4. שם הטמפלט שונה');
  
  return null;
}

testAllLanguages();

