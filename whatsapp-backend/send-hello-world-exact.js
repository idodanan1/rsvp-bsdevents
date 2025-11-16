const axios = require('axios');
require('dotenv').config();

const PHONE_NUMBER = '0547377881';
const ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN || 'EAAQ16mfCx58BPZCAepGf7EQMznC5dwYUmsun7pZCvzLPqjOjnq778EeJtXGEdemBVXdqTEt9pJ0bm2l5EyL9BZAR9kVS15kjz9rWYAcbKZCZBVOQswHeZAfmkUNv2TZAeX8KGaJ8OZCb4ZCtOaZAEZARqvG2TE7DHCmZBDWRATOKdvfHZA4j8FGluUX8NNGdsqbBEVgFjNgZDZD';
const PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID || '874204535776090';

async function sendHelloWorldExact() {
  console.log('📤 שולח הודעת Template "hello_world" עם הפרמטרים המדויקים...');
  console.log('📱 מספר טלפון:', PHONE_NUMBER);
  console.log('');

  const formattedPhone = PHONE_NUMBER.replace(/^0/, '972').replace(/[^0-9]/g, '');
  console.log('📞 מספר מעוצב:', formattedPhone);
  console.log('');

  try {
    const apiUrl = `https://graph.facebook.com/v22.0/${PHONE_NUMBER_ID}/messages`;
    
    console.log('🌐 API URL:', apiUrl);
    console.log('📤 שולח הודעה עם Template "hello_world" (en_US)...');
    console.log('');

    // Exact payload as provided by user
    const messagePayload = {
      messaging_product: 'whatsapp',
      to: formattedPhone,
      type: 'template',
      template: {
        name: 'hello_world',
        language: {
          code: 'en_US'
        }
      }
    };

    console.log('📋 Payload:', JSON.stringify(messagePayload, null, 2));
    console.log('');

    const response = await axios.post(apiUrl, messagePayload, {
      headers: {
        'Authorization': `Bearer ${ACCESS_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });

    console.log('✅ הודעה נשלחה בהצלחה עם Template!');
    console.log('📊 תגובה:', JSON.stringify(response.data, null, 2));
    console.log('');
    
    const messageId = response.data.messages?.[0]?.id;
    const contact = response.data.contacts?.[0];
    
    if (messageId) {
      console.log('🎉 ההודעה נשלחה בהצלחה!');
      console.log('📱 Message ID:', messageId);
      if (contact?.wa_id) {
        console.log('📱 WhatsApp ID:', contact.wa_id);
      }
      console.log('');
      console.log('💡 עכשיו, אחרי שהמספר קיבל את ההודעה הראשונה, אפשר לשלוח הודעות טקסט חופשיות למשך 24 שעות');
    } else {
      console.log('⚠️ הודעה נשלחה אבל אין Message ID');
    }

  } catch (error) {
    console.error('❌ שגיאה בשליחת ההודעה:');
    console.error('');
    
    if (error.response) {
      console.error('📊 סטטוס:', error.response.status);
      console.error('📄 תגובה:', JSON.stringify(error.response.data, null, 2));
      console.error('');
      
      if (error.response.data?.error) {
        const errorData = error.response.data.error;
        console.error('🔴 פרטי השגיאה:');
        console.error('   - סוג:', errorData.type);
        console.error('   - קוד:', errorData.code);
        console.error('   - הודעה:', errorData.message);
        console.error('');
        
        if (errorData.code === 131047) {
          console.error('⚠️ שגיאה 131047: המספר לא אישר את המספר של WhatsApp Business');
          console.error('💡 המספר צריך לאשר את המספר לפני שניתן לשלוח הודעות');
        } else if (errorData.code === 131026) {
          console.error('⚠️ שגיאה 131026: המספר לא רשום ב-WhatsApp');
        } else if (errorData.code === 132000 || errorData.code === 132001) {
          console.error('⚠️ שגיאה 132000/132001: הטמפלט לא קיים או לא מאושר');
          console.error('💡 ודא שהטמפלט "hello_world" מאושר ב-Facebook Business Manager');
        }
      }
    } else if (error.request) {
      console.error('❌ לא התקבלה תגובה מהשרת');
      console.error('💡 ודא שיש חיבור לאינטרנט');
    } else {
      console.error('❌ שגיאה:', error.message);
    }
  }
}

sendHelloWorldExact();

