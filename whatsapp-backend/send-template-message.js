const axios = require('axios');
require('dotenv').config();

const PHONE_NUMBER = '0547377881';
const ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN || 'EAAQ16mfCx58BPZCAepGf7EQMznC5dwYUmsun7pZCvzLPqjOjnq778EeJtXGEdemBVXdqTEt9pJ0bm2l5EyL9BZAR9kVS15kjz9rWYAcbKZCZBVOQswHeZAfmkUNv2TZAeX8KGaJ8OZCb4ZCtOaZAEZARqvG2TE7DHCmZBDWRATOKdvfHZA4j8FGluUX8NNGdsqbBEVgFjNgZDZD';
const PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID || '874204535776090';

async function sendTemplateMessage() {
  console.log('📤 שולח הודעת Template מאושר...');
  console.log('📱 מספר טלפון:', PHONE_NUMBER);
  console.log('');

  const formattedPhone = PHONE_NUMBER.replace(/^0/, '972').replace(/[^0-9]/g, '');
  console.log('📞 מספר מעוצב:', formattedPhone);
  console.log('');

  // Try common templates first
  const templatesToTry = [
    {
      name: 'hello_world',
      language: 'en',
      description: 'Hello World Template (default)'
    },
    {
      name: 'sample_shipping_confirmation',
      language: 'en',
      description: 'Sample Shipping Confirmation'
    },
    {
      name: 'sample_issue_resolution',
      language: 'en',
      description: 'Sample Issue Resolution'
    }
  ];

  for (const template of templatesToTry) {
    try {
      console.log(`🔄 מנסה לשלוח עם Template: ${template.name} (${template.description})...`);
      
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
      console.log('');
      console.log('💡 עכשיו, אחרי שהמספר קיבל את ההודעה הראשונה, אפשר לשלוח הודעות טקסט חופשיות למשך 24 שעות');
      return;

    } catch (error) {
      if (error.response) {
        const errorCode = error.response.data?.error?.code;
        const errorMessage = error.response.data?.error?.message;
        
        if (errorCode === 132000) {
          console.log(`❌ Template "${template.name}" לא קיים או לא מאושר`);
          console.log('   מנסה טמפלט אחר...');
          console.log('');
          continue;
        } else if (errorCode === 131047) {
          console.log('❌ שגיאה 131047: המספר לא אישר את המספר של WhatsApp Business');
          console.log('💡 המספר צריך לאשר את המספר לפני שניתן לשלוח הודעות');
          break;
        } else {
          console.log(`❌ שגיאה עם Template "${template.name}":`, errorMessage);
          console.log('   מנסה טמפלט אחר...');
          console.log('');
          continue;
        }
      }
    }
  }

  console.log('');
  console.log('⚠️ לא הצלחתי לשלוח עם טמפלטים קיימים');
  console.log('');
  console.log('📋 מה לעשות עכשיו:');
  console.log('');
  console.log('1. צור טמפלט חדש ב-Facebook Business Manager:');
  console.log('   → לך ל: https://business.facebook.com/');
  console.log('   → בחר את ה-Account שלך');
  console.log('   → לך ל-WhatsApp → Message Templates');
  console.log('   → לחץ על "Create Template"');
  console.log('   → בחר קטגוריה: UTILITY או MARKETING');
  console.log('   → שם הטמפלט: event_invitation (או שם אחר)');
  console.log('   → שפה: Hebrew (he)');
  console.log('   → תוכן ההודעה:');
  console.log('');
  console.log('     שלום {{1}}!');
  console.log('');
  console.log('     אנחנו שמחים להזמין אותך ל{{2}} של {{3}} ו{{4}}!');
  console.log('');
  console.log('     📅 תאריך: {{5}}');
  console.log('     🕐 שעה: {{6}}');
  console.log('     📍 מיקום: {{7}}');
  console.log('');
  console.log('     אנא אשר/י הגעה בקישור הבא:');
  console.log('     🔗 {{8}}');
  console.log('');
  console.log('     בברכה,');
  console.log('     {{3}} ו{{4}} 💕');
  console.log('');
  console.log('   → שמור וחכה לאישור (יכול לקחת כמה שעות)');
  console.log('');
  console.log('2. אחרי שהטמפלט מאושר, עדכן את הקוד להשתמש בשם הטמפלט החדש');
  console.log('');
  console.log('3. או בקש מהמספר לשלוח לך הודעה ראשונה (זה יותר מהיר!)');
  console.log('   → אחרי זה תוכל לשלוח הודעות טקסט חופשיות למשך 24 שעות');
}

sendTemplateMessage();

