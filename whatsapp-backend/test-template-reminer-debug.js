const axios = require('axios');

// Configuration
const ACCESS_TOKEN = 'EAAQ16mfCx58BPZCAepGf7EQMznC5dwYUmsun7pZCvzLPqjOjnq778EeJtXGEdemBVXdqTEt9pJ0bm2l5EyL9BZAR9kVS15kjz9rWYAcbKZCZBVOQswHeZAfmkUNv2TZAeX8KGaJ8OZCb4ZCtOaZAEZARqvG2TE7DHCmZBDWRATOKdvfHZA4j8FGluUX8NNGdsqbBEVgFjNgZDZD';
const PHONE_NUMBER_ID = '874204535776090';
const TARGET_PHONE = '972547377881';

async function testTemplateReminer() {
  try {
    const apiUrl = `https://graph.facebook.com/v22.0/${PHONE_NUMBER_ID}/messages`;

    // Template "reminer" requires 7 parameters:
    // 1. first_name
    // 2. event_type
    // 3. couple_name
    // 4. event_date
    // 5. event_time
    // 6. venue
    // 7. table_number
    // NOTE: guest_response_link is NOT included in this template
    const messagePayload = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: TARGET_PHONE,
      type: 'template',
      template: {
        name: 'reminer',
        language: {
          code: 'he'
        },
        components: [
          // If template has header image in Meta, we need to send header component
          // Try without header first - if it fails, the template in Meta needs to be updated
          {
            type: 'body',
            parameters: [
              { type: 'text', parameter_name: 'first_name', text: 'עידו' },           // 1. first_name
              { type: 'text', parameter_name: 'event_type', text: 'חתונה' },          // 2. event_type
              { type: 'text', parameter_name: 'couple_name', text: 'דור & נאל' },      // 3. couple_name
              { type: 'text', parameter_name: 'event_date', text: '21 באוקטובר 2025' }, // 4. event_date
              { type: 'text', parameter_name: 'event_time', text: '23:05' },           // 5. event_time
              { type: 'text', parameter_name: 'venue', text: 'יארה חדרה' },      // 6. venue
              { type: 'text', parameter_name: 'table_number', text: 'לא הוקצה' }       // 7. table_number
            ]
          }
        ]
      }
    };

    console.log('📤 Sending template "reminer" with exact payload:');
    console.log(JSON.stringify(messagePayload, null, 2));
    console.log('\n📋 Parameters being sent:');
    messagePayload.template.components[0].parameters.forEach((param, index) => {
      console.log(`  ${index + 1}. "${param.text}" (length: ${param.text.length})`);
    });

    const response = await axios.post(apiUrl, messagePayload, {
      headers: {
        'Authorization': `Bearer ${ACCESS_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });

    console.log('\n✅ SUCCESS!');
    console.log('📱 Message ID:', response.data.messages?.[0]?.id || 'N/A');
    console.log('📞 Contact:', JSON.stringify(response.data.contacts?.[0], null, 2));
    return true;

  } catch (error) {
    if (error.response) {
      const errorData = error.response.data;
      console.error('\n❌ ERROR:', errorData.error?.message || 'Unknown error');
      console.error('📋 Error Code:', errorData.error?.code);
      console.error('📋 Error Details:', errorData.error?.error_data?.details || 'No details');
      console.error('\n📋 Full Error Response:');
      console.error(JSON.stringify(errorData, null, 2));
      
      if (errorData.error?.code === 100) {
        console.error('\n⚠️ Error Code 100: Invalid parameter');
        console.error('This usually means:');
        console.error('1. Template is not fully approved (check status in Meta)');
        console.error('2. Parameter name mismatch in template');
        console.error('3. Parameter is empty or missing in template definition');
        console.error('4. Wrong number of parameters');
      } else if (errorData.error?.code === 132000) {
        console.error('\n⚠️ Error Code 132000: Parameter count mismatch');
        console.error('Check the number of parameters in the template vs what we send');
      } else if (errorData.error?.code === 132001) {
        console.error('\n⚠️ Error Code 132001: Template does not exist');
        console.error('Template name or language code is incorrect');
      }
    } else {
      console.error('❌ Network Error:', error.message);
    }
    return false;
  }
}

testTemplateReminer();
