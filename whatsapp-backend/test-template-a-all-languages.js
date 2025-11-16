const axios = require('axios');

// Configuration
const ACCESS_TOKEN = 'EAAQ16mfCx58BPZCAepGf7EQMznC5dwYUmsun7pZCvzLPqjOjnq778EeJtXGEdemBVXdqTEt9pJ0bm2l5EyL9BZAR9kVS15kjz9rWYAcbKZCZBVOQswHeZAfmkUNv2TZAeX8KGaJ8OZCb4ZCtOaZAEZARqvG2TE7DHCmZBDWRATOKdvfHZA4j8FGluUX8NNGdsqbBEVgFjNgZDZD';
const PHONE_NUMBER_ID = '874204535776090';
const TARGET_PHONE = '972547377881';

const languagesToTry = ['he', 'he_IL', 'iw', 'iw_IL', 'en_US', 'en', 'default'];

async function testTemplateWithLanguage(language) {
  try {
    const apiUrl = `https://graph.facebook.com/v22.0/${PHONE_NUMBER_ID}/messages`;

    const messagePayload = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: TARGET_PHONE,
      type: 'template',
      template: {
        name: 'a',
        language: language === 'default' ? {} : { code: language },
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
              { type: 'text', text: 'דור & נאל' }
            ]
          }
        ]
      }
    };

    console.log(`\n🔄 Testing with language: ${language === 'default' ? 'default (empty)' : language}...`);
    
    const response = await axios.post(apiUrl, messagePayload, {
      headers: {
        'Authorization': `Bearer ${ACCESS_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });

    console.log(`✅ SUCCESS with language: ${language}!`);
    console.log('📱 Message ID:', response.data.messages?.[0]?.id || 'N/A');
    return language;

  } catch (error) {
    if (error.response) {
      const errorData = error.response.data;
      const errorCode = errorData?.error?.code;
      const errorDetails = errorData?.error?.error_data?.details || '';
      
      console.log(`❌ Failed with language: ${language}`);
      console.log(`   Error Code: ${errorCode}`);
      console.log(`   Error: ${errorData?.error?.message || 'Unknown'}`);
      console.log(`   Details: ${errorDetails}`);
      
      if (errorCode === 132001) {
        console.log(`   → Template doesn't exist in this language`);
      } else if (errorCode === 100) {
        console.log(`   → Invalid parameter (same error as before)`);
      }
    } else {
      console.log(`❌ Network error: ${error.message}`);
    }
    return null;
  }
}

async function testAllLanguages() {
  console.log('🧪 Testing template "a" with different languages...\n');
  
  for (const lang of languagesToTry) {
    const result = await testTemplateWithLanguage(lang);
    if (result) {
      console.log(`\n✅ Found working language: ${result}`);
      break;
    }
    // Wait a bit between requests
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
}

testAllLanguages();

