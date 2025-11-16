const axios = require('axios');

// Configuration
const ACCESS_TOKEN = 'EAAQ16mfCx58BPZCAepGf7EQMznC5dwYUmsun7pZCvzLPqjOjnq778EeJtXGEdemBVXdqTEt9pJ0bm2l5EyL9BZAR9kVS15kjz9rWYAcbKZCZBVOQswHeZAfmkUNv2TZAeX8KGaJ8OZCb4ZCtOaZAEZARqvG2TE7DHCmZBDWRATOKdvfHZA4j8FGluUX8NNGdsqbBEVgFjNgZDZD';
const PHONE_NUMBER_ID = '874204535776090';

async function checkTemplateStatus() {
  try {
    // First, we need to get the WhatsApp Business Account ID (WABA ID)
    // Let's try to get it from the phone number
    console.log('🔍 Checking template status...\n');
    
    // Try to get templates for this phone number
    // We need the WABA ID, but we can try to get templates directly
    const apiUrl = `https://graph.facebook.com/v22.0/${PHONE_NUMBER_ID}`;
    
    // Get phone number info to find WABA ID
    const phoneInfo = await axios.get(apiUrl, {
      params: {
        fields: 'whatsapp_business_account'
      },
      headers: {
        'Authorization': `Bearer ${ACCESS_TOKEN}`
      }
    });
    
    console.log('📱 Phone Number Info:', JSON.stringify(phoneInfo.data, null, 2));
    
    const wabaId = phoneInfo.data?.whatsapp_business_account?.id;
    
    if (!wabaId) {
      console.log('❌ Could not find WABA ID. Trying alternative method...');
      // Try to list templates directly
      const templatesUrl = `https://graph.facebook.com/v22.0/${PHONE_NUMBER_ID}/message_templates`;
      const templates = await axios.get(templatesUrl, {
        headers: {
          'Authorization': `Bearer ${ACCESS_TOKEN}`
        }
      });
      
      console.log('\n📋 Templates:', JSON.stringify(templates.data, null, 2));
      return;
    }
    
    console.log(`\n✅ Found WABA ID: ${wabaId}`);
    
    // Get templates for this WABA
    const templatesUrl = `https://graph.facebook.com/v22.0/${wabaId}/message_templates`;
    const templates = await axios.get(templatesUrl, {
      params: {
        name: 'a'
      },
      headers: {
        'Authorization': `Bearer ${ACCESS_TOKEN}`
      }
    });
    
    console.log('\n📋 Template "a" details:');
    console.log(JSON.stringify(templates.data, null, 2));
    
    // Check each component
    if (templates.data?.data && templates.data.data.length > 0) {
      const template = templates.data.data[0];
      console.log('\n📋 Template Status:', template.status);
      console.log('📋 Template Components:');
      
      if (template.components) {
        template.components.forEach((comp, idx) => {
          console.log(`\n  Component ${idx + 1}:`, comp.type);
          if (comp.type === 'BODY') {
            console.log('  Text:', comp.text);
            console.log('  Variables:', comp.variables || 'None');
          }
        });
      }
    }
    
  } catch (error) {
    if (error.response) {
      console.error('❌ Error:', error.response.data);
    } else {
      console.error('❌ Error:', error.message);
    }
  }
}

checkTemplateStatus();

