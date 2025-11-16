const axios = require('axios');
require('dotenv').config();

const PHONE_NUMBER = '0547377881';
const ACCESS_TOKEN = 'EAAVrBHAipFgBPxRBKui3UpDUZCeoVQT6JdmChD4Psqy5mRSNFLx87wW9wdecYWyXH9OTmZBDZCNTGV1kgSVoeLdiMYY5JkIHYuLLcmc06wPwh9Ytz1whZBETZBMZAwfXdmNnUXUO7cSG13VCQpgnZBFO8G1AGLtK4hNKtCTh2tTiNYZCPNDAvtRJ92ZBispbWu2ZC7vF6HrFjn1FKmcXTJ4S67PwByZAoyuEfgmIwTLNmXroMQeIl3ZA41miLHKn8neBS80UlbxJchTGbawChQXTQ38JgTMh';
const PHONE_NUMBER_ID = '825735800624198';

async function sendMessage() {
  console.log('🔄 מנסה לשלוח הודעה שוב...');
  console.log('📱 מספר טלפון:', PHONE_NUMBER);
  console.log('');

  const formattedPhone = PHONE_NUMBER.replace(/^0/, '972').replace(/[^0-9]/g, '');
  console.log('📞 מספר מעוצב:', formattedPhone);
  console.log('');

  // Try 1: Simple text message (if number already sent a message)
  console.log('📤 ניסיון 1: הודעת טקסט רגילה...');
  try {
    const textResponse = await axios.post(
      `https://graph.facebook.com/v22.0/${PHONE_NUMBER_ID}/messages`,
      {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: formattedPhone,
        type: 'text',
        text: {
          body: '🧪 זהו בדיקת מערכת - הודעת WhatsApp נשלחה בהצלחה! ✅'
        }
      },
      {
        headers: {
          'Authorization': `Bearer ${ACCESS_TOKEN}`,
          'Content-Type': 'application/json'
        }
      }
    );

    console.log('✅ הודעת טקסט נשלחה בהצלחה!');
    console.log('📊 תגובה:', JSON.stringify(textResponse.data, null, 2));
    console.log('📱 Message ID:', textResponse.data.messages?.[0]?.id || 'N/A');
    console.log('');
    console.log('🎉 ההודעה נשלחה! בדוק את WhatsApp שלך');
    return;

  } catch (textError) {
    if (textError.response?.data?.error?.code === 131026) {
      console.log('⚠️  הודעת טקסט לא עובדת - צריך Template להודעות ראשונות');
      console.log('');
    } else {
      console.log('❌ שגיאה בהודעת טקסט:', textError.response?.data?.error?.message || textError.message);
      console.log('');
    }
  }

  // Try 2: Template "a" without parameters (if template allows it)
  console.log('📤 ניסיון 2: Template "a" בלי פרמטרים...');
  try {
    const templateResponse = await axios.post(
      `https://graph.facebook.com/v22.0/${PHONE_NUMBER_ID}/messages`,
      {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: formattedPhone,
        type: 'template',
        template: {
          name: 'a',
          language: {
            code: 'he'
          }
        }
      },
      {
        headers: {
          'Authorization': `Bearer ${ACCESS_TOKEN}`,
          'Content-Type': 'application/json'
        }
      }
    );

    console.log('✅ Template נשלח בהצלחה!');
    console.log('📊 תגובה:', JSON.stringify(templateResponse.data, null, 2));
    console.log('📱 Message ID:', templateResponse.data.messages?.[0]?.id || 'N/A');
    console.log('');
    console.log('🎉 ההודעה נשלחה! בדוק את WhatsApp שלך');
    return;

  } catch (templateError) {
    console.log('❌ שגיאה ב-Template:', templateError.response?.data?.error?.message || templateError.message);
    console.log('');
  }

  // Try 3: Template "a" with minimal required parameters
  console.log('📤 ניסיון 3: Template "a" עם פרמטרים מינימליים...');
  try {
    const templateMinResponse = await axios.post(
      `https://graph.facebook.com/v22.0/${PHONE_NUMBER_ID}/messages`,
      {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: formattedPhone,
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
                { type: 'text', text: 'עידו' },
                { type: 'text', text: 'חתונה' },
                { type: 'text', text: 'דור' },
                { type: 'text', text: 'ונאל' },
                { type: 'text', text: '11.12.26' },
                { type: 'text', text: '19:30' },
                { type: 'text', text: 'אולמי הכלה' },
                { type: 'text', text: 'https://example.com' }
              ]
            }
          ]
        }
      },
      {
        headers: {
          'Authorization': `Bearer ${ACCESS_TOKEN}`,
          'Content-Type': 'application/json'
        }
      }
    );

    console.log('✅ Template עם פרמטרים נשלח בהצלחה!');
    console.log('📊 תגובה:', JSON.stringify(templateMinResponse.data, null, 2));
    console.log('📱 Message ID:', templateMinResponse.data.messages?.[0]?.id || 'N/A');
    console.log('');
    console.log('🎉 ההודעה נשלחה! בדוק את WhatsApp שלך');
    return;

  } catch (templateMinError) {
    console.log('❌ שגיאה ב-Template עם פרמטרים:', templateMinError.response?.data?.error?.message || templateMinError.message);
    if (templateMinError.response?.data) {
      console.log('📄 פרטי השגיאה:', JSON.stringify(templateMinError.response.data, null, 2));
    }
    console.log('');
  }

  console.log('❌ כל הניסיונות נכשלו');
  console.log('');
  console.log('💡 סיבות אפשריות:');
  console.log('   1. המספר לא אישר את המספר של WhatsApp Business');
  console.log('   2. Template "a" דורש מבנה מורכב יותר');
  console.log('   3. צריך ליצור Template פשוט יותר');
  console.log('');
  console.log('💡 נסה:');
  console.log('   - לשלוח הודעה ראשונה למספר +972 58-485-9790');
  console.log('   - ליצור Template פשוט יותר ב-Facebook Business Manager');
}

sendMessage();

