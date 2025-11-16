const axios = require('axios');
require('dotenv').config();

const ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN || 'EAAQ16mfCx58BPZCAepGf7EQMznC5dwYUmsun7pZCvzLPqjOjnq778EeJtXGEdemBVXdqTEt9pJ0bm2l5EyL9BZAR9kVS15kjz9rWYAcbKZCZBVOQswHeZAfmkUNv2TZAeX8KGaJ8OZCb4ZCtOaZAEZARqvG2TE7DHCmZBDWRATOKdvfHZA4j8FGluUX8NNGdsqbBEVgFjNgZDZD';
const PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID || '874204535776090';

async function listAllTemplates() {
  console.log('🔍 בודק את כל הטמפלטים הזמינים...');
  console.log('📱 Phone Number ID:', PHONE_NUMBER_ID);
  console.log('');

  try {
    // First, try to get WABA ID from phone number
    console.log('📋 שלב 1: מנסה לקבל WhatsApp Business Account ID...');
    
    let wabaId = null;
    try {
      const phoneResponse = await axios.get(`https://graph.facebook.com/v22.0/${PHONE_NUMBER_ID}`, {
        headers: {
          'Authorization': `Bearer ${ACCESS_TOKEN}`,
          'Content-Type': 'application/json'
        },
        params: {
          fields: 'whatsapp_business_account'
        }
      });
      
      if (phoneResponse.data.whatsapp_business_account?.id) {
        wabaId = phoneResponse.data.whatsapp_business_account.id;
        console.log('✅ מצאתי WABA ID:', wabaId);
      }
    } catch (error) {
      console.log('⚠️ לא הצלחתי לקבל WABA ID מהמספר');
    }

    // Try to get templates
    if (wabaId) {
      console.log('');
      console.log('📋 שלב 2: מנסה לקבל רשימת טמפלטים...');
      
      try {
        const templatesResponse = await axios.get(
          `https://graph.facebook.com/v22.0/${wabaId}/message_templates`,
          {
            headers: {
              'Authorization': `Bearer ${ACCESS_TOKEN}`,
              'Content-Type': 'application/json'
            }
          }
        );

        console.log('✅ נמצאו טמפלטים!');
        console.log('');
        
        if (templatesResponse.data.data && templatesResponse.data.data.length > 0) {
          console.log('📋 רשימת טמפלטים מאושרים:');
          console.log('');
          
          templatesResponse.data.data.forEach((template, index) => {
            console.log(`${index + 1}. שם: ${template.name}`);
            console.log(`   סטטוס: ${template.status}`);
            console.log(`   קטגוריה: ${template.category}`);
            console.log(`   שפה: ${template.language}`);
            if (template.components) {
              console.log(`   רכיבים: ${template.components.length}`);
            }
            console.log('');
          });
          
          // Find hello_world template
          const helloWorldTemplate = templatesResponse.data.data.find(
            t => t.name.toLowerCase().includes('hello') || t.name.toLowerCase().includes('world')
          );
          
          if (helloWorldTemplate) {
            console.log('🎯 מצאתי טמפלט "Hello World":');
            console.log(`   שם: ${helloWorldTemplate.name}`);
            console.log(`   שפה: ${helloWorldTemplate.language}`);
            console.log(`   סטטוס: ${helloWorldTemplate.status}`);
            console.log('');
            console.log('💡 השתמש בשם הזה לשליחת הודעה:');
            console.log(`   name: "${helloWorldTemplate.name}"`);
            console.log(`   language: "${helloWorldTemplate.language}"`);
          }
        } else {
          console.log('⚠️ לא נמצאו טמפלטים מאושרים');
        }
        
      } catch (error) {
        console.log('❌ שגיאה בקבלת טמפלטים:');
        if (error.response) {
          console.log('   קוד:', error.response.status);
          console.log('   הודעה:', JSON.stringify(error.response.data, null, 2));
        } else {
          console.log('   שגיאה:', error.message);
        }
      }
    } else {
      console.log('');
      console.log('⚠️ לא הצלחתי לקבל WABA ID');
      console.log('');
      console.log('💡 נסה לבדוק ידנית ב-Facebook Business Manager:');
      console.log('   1. לך ל: https://business.facebook.com/');
      console.log('   2. בחר את ה-Account שלך');
      console.log('   3. לך ל-WhatsApp → Message Templates');
      console.log('   4. חפש את הטמפלט "Hello World"');
      console.log('   5. העתק את השם המדויק שלו');
    }

  } catch (error) {
    console.error('❌ שגיאה כללית:', error.message);
    if (error.response) {
      console.error('📊 תגובה:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

listAllTemplates();

