const axios = require('axios');

// Configuration
const ACCESS_TOKEN = 'EAAQ16mfCx58BPZCAepGf7EQMznC5dwYUmsun7pZCvzLPqjOjnq778EeJtXGEdemBVXdqTEt9pJ0bm2l5EyL9BZAR9kVS15kjz9rWYAcbKZCZBVOQswHeZAfmkUNv2TZAeX8KGaJ8OZCb4ZCtOaZAEZARqvG2TE7DHCmZBDWRATOKdvfHZA4j8FGluUX8NNGdsqbBEVgFjNgZDZD';
const PHONE_NUMBER_ID = '874204535776090';
const TARGET_PHONE = '972547377881';

async function testHelloWorld() {
  try {
    console.log('🧪 Testing hello_world template (should work)...\n');
    
    const apiUrl = `https://graph.facebook.com/v22.0/${PHONE_NUMBER_ID}/messages`;
    const messagePayload = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: TARGET_PHONE,
      type: 'template',
      template: {
        name: 'hello_world',
        language: {
          code: 'en_US'
        }
      }
    };

    const response = await axios.post(apiUrl, messagePayload, {
      headers: {
        'Authorization': `Bearer ${ACCESS_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });

    console.log('✅ hello_world SUCCESS!');
    console.log('📱 Message ID:', response.data.messages?.[0]?.id || 'N/A');
    return true;

  } catch (error) {
    if (error.response) {
      console.error('❌ hello_world FAILED:', error.response.data?.error?.message);
    } else {
      console.error('❌ Network Error:', error.message);
    }
    return false;
  }
}

async function testTemplateA() {
  try {
    console.log('\n🧪 Testing template "a" with minimal parameters...\n');
    
    const apiUrl = `https://graph.facebook.com/v22.0/${PHONE_NUMBER_ID}/messages`;
    
    // Try with just 1 parameter to see if it's a parameter count issue
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
            parameters: [
              { type: 'text', text: 'עידו' }
            ]
          }
        ]
      }
    };

    const response = await axios.post(apiUrl, messagePayload, {
      headers: {
        'Authorization': `Bearer ${ACCESS_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });

    console.log('✅ Template "a" with 1 parameter SUCCESS!');
    console.log('📱 Message ID:', response.data.messages?.[0]?.id || 'N/A');
    return true;

  } catch (error) {
    if (error.response) {
      const errorData = error.response.data;
      console.error('❌ Template "a" FAILED');
      console.error('   Error:', errorData?.error?.message);
      console.error('   Code:', errorData?.error?.code);
      console.error('   Details:', errorData?.error?.error_data?.details);
      
      if (errorData?.error?.code === 132000) {
        console.error('\n   → This confirms the template expects 9 parameters, not 1');
      }
    }
    return false;
  }
}

async function runTests() {
  // First test hello_world to make sure API is working
  await testHelloWorld();
  
  // Wait a bit
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Then test template "a" with minimal parameters
  await testTemplateA();
}

runTests();
