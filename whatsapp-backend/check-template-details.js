const axios = require('axios');

// Configuration
const ACCESS_TOKEN = 'EAAQ16mfCx58BPZCAepGf7EQMznC5dwYUmsun7pZCvzLPqjOjnq778EeJtXGEdemBVXdqTEt9pJ0bm2l5EyL9BZAR9kVS15kjz9rWYAcbKZCZBVOQswHeZAfmkUNv2TZAeX8KGaJ8OZCb4ZCtOaZAEZARqvG2TE7DHCmZBDWRATOKdvfHZA4j8FGluUX8NNGdsqbBEVgFjNgZDZD';
const PHONE_NUMBER_ID = '874204535776090';

async function checkTemplateDetails(templateName) {
  try {
    console.log(`\n🔍 Checking template "${templateName}" details...\n`);
    
    // Try to get template details using the phone number ID
    // Note: This might not work directly, but let's try
    const apiUrl = `https://graph.facebook.com/v22.0/${PHONE_NUMBER_ID}`;
    
    // First, try to get WABA ID from phone number
    try {
      const phoneInfo = await axios.get(apiUrl, {
        params: {
          fields: 'id,name'
        },
        headers: {
          'Authorization': `Bearer ${ACCESS_TOKEN}`
        }
      });
      
      console.log('📱 Phone Number Info:', JSON.stringify(phoneInfo.data, null, 2));
    } catch (error) {
      console.log('⚠️ Could not get phone number info:', error.response?.data?.error?.message || error.message);
    }
    
    // Try alternative: List all templates and find ours
    // We need to use a different endpoint - try listing templates
    console.log('\n📋 Attempting to list templates...');
    console.log('💡 Note: You may need to find your WABA ID manually from Meta Business Manager');
    console.log('💡 Go to: Meta Business Manager → WhatsApp → API Setup');
    console.log('💡 Look for "WhatsApp Business Account ID" (WABA ID)');
    console.log('\n📋 To check template details manually:');
    console.log('1. Go to: https://business.facebook.com/');
    console.log('2. Navigate to: WhatsApp → Message Templates');
    console.log(`3. Find template "${templateName}"`);
    console.log('4. Click on it to see full details');
    console.log('5. Check:');
    console.log('   - Status (must be "Approved")');
    console.log('   - Language (must match what we send: "he")');
    console.log('   - Number of parameters in Body section');
    console.log('   - Variable Samples - every parameter must have a name');
    
  } catch (error) {
    if (error.response) {
      console.error('❌ Error:', error.response.data);
    } else {
      console.error('❌ Error:', error.message);
    }
  }
}

// Check both templates
async function checkAllTemplates() {
  await checkTemplateDetails('a');
  await checkTemplateDetails('reminer');
  
  console.log('\n\n💡 IMPORTANT: Since we cannot directly query template details via API,');
  console.log('   you need to check them manually in Meta Business Manager.');
  console.log('\n📋 What to check for template "a":');
  console.log('   - Must have exactly 9 parameters');
  console.log('   - Parameter names: guest_name, event_type, bride_name, groom_name,');
  console.log('     event_date, event_time, venue, est_response_link, couple_name');
  console.log('   - All parameters must be defined in Variable Samples');
  console.log('   - Status must be "Approved"');
  console.log('\n📋 What to check for template "reminer":');
  console.log('   - Must have exactly 7 parameters');
  console.log('   - Parameter names: first_name, event_type, couple_name,');
  console.log('     event_date, event_time, venue, table_number');
  console.log('   - All parameters must be defined in Variable Samples');
  console.log('   - Status must be "Approved"');
}

checkAllTemplates();

