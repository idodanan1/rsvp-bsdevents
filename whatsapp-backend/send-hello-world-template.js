const axios = require('axios');
require('dotenv').config();

const PHONE_NUMBER = '0547377881';
const ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN || 'EAAQ16mfCx58BPZCAepGf7EQMznC5dwYUmsun7pZCvzLPqjOjnq778EeJtXGEdemBVXdqTEt9pJ0bm2l5EyL9BZAR9kVS15kjz9rWYAcbKZCZBVOQswHeZAfmkUNv2TZAeX8KGaJ8OZCb4ZCtOaZAEZARqvG2TE7DHCmZBDWRATOKdvfHZA4j8FGluUX8NNGdsqbBEVgFjNgZDZD';
const PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID || '874204535776090';

async function sendHelloWorldTemplate() {
  console.log('📤 שולח הודעת Template "Hello World" מאושר...');
  console.log('📱 מספר טלפון:', PHONE_NUMBER);
  console.log('');

  const formattedPhone = PHONE_NUMBER.replace(/^0/, '972').replace(/[^0-9]/g, '');
  console.log('📞 מספר מעוצב:', formattedPhone);
  console.log('');

  // Try different variations of hello_world template name
  const templateVariations = [
    { name: 'hello_world', language: 'en' },
    { name: 'hello_world', language: 'he' },
    { name: 'Hello World', language: 'en' },
    { name: 'hello_world_template', language: 'en' }
  ];

  for (const template of templateVariations) {
    try {
      console.log(`🔄 מנסה לשלוח עם Template: "${template.name}" (${template.language})...`);
      
      const apiUrl = `https://graph.facebook.com/v22.0/${PHONE_NUMBER_ID}/messages`;
      
      const messagePayload = {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: formattedPhone,
        type: 'template',
        template: {
          name: template.name,
          language: {
            code: template.language
          }
        }
      };

      console.log('📤 Payload:', JSON.stringify(messagePayload, null, 2));
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
      console.log('🎉 ההודעה נשלחה!');
      console.log('📱 Message ID:', response.data.messages?.[0]?.id || 'N/A');
      console.log('📱 Template בשימוש:', template.name);
      console.log('📱 שפה:', template.language);
      console.log('');
      console.log('💡 עכשיו, אחרי שהמספר קיבל את ההודעה הראשונה, אפשר לשלוח הודעות טקסט חופשיות למשך 24 שעות');
      return;

    } catch (error) {
      if (error.response) {
        const errorCode = error.response.data?.error?.code;
        const errorMessage = error.response.data?.error?.message;
        
        console.log(`❌ שגיאה עם Template "${template.name}":`);
        console.log(`   קוד: ${errorCode}`);
        console.log(`   הודעה: ${errorMessage}`);
        
        if (errorCode === 132000 || errorCode === 132001) {
          console.log('   → Template לא קיים או לא מאושר בשפה הזו');
          console.log('   מנסה וריאציה אחרת...');
          console.log('');
          continue;
        } else if (errorCode === 131047) {
          console.log('');
          console.log('❌ שגיאה 131047: המספר לא אישר את המספר של WhatsApp Business');
          console.log('💡 המספר צריך לאשר את המספר לפני שניתן לשלוח הודעות');
          break;
        } else {
          console.log('   מנסה וריאציה אחרת...');
          console.log('');
          continue;
        }
      } else {
        console.log(`❌ שגיאת רשת עם Template "${template.name}"`);
        console.log('   מנסה וריאציה אחרת...');
        console.log('');
        continue;
      }
    }
  }

  console.log('');
  console.log('⚠️ לא הצלחתי לשלוח עם הטמפלט "Hello World"');
  console.log('');
  console.log('📋 מה לעשות:');
  console.log('');
  console.log('1. בדוק ב-Facebook Business Manager מה השם המדויק של הטמפלט:');
  console.log('   → לך ל: https://business.facebook.com/');
  console.log('   → WhatsApp → Message Templates');
  console.log('   → חפש את הטמפלט "Hello World"');
  console.log('   → העתק את השם המדויק שלו');
  console.log('');
  console.log('2. בדוק את השפה של הטמפלט (אנגלית או עברית)');
  console.log('');
  console.log('3. עדכן את הקוד עם השם והשפה המדויקים');
  console.log('');
  console.log('4. או בקש מהמספר לשלוח לך הודעה ראשונה (זה יותר מהיר!)');
}

sendHelloWorldTemplate();

