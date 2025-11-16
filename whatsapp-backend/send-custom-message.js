const axios = require('axios');
require('dotenv').config();

// Configuration
const PHONE_NUMBER = '0547377881';
const MESSAGE = `🎉 שלום עידו!

אנחנו שמחים להזמין אותך לחתונה של דור ונאל!

📅 תאריך: 21 באוקטובר 2025
🕐 שעה: 23:00
📍 מיקום: [מיקום האירוע]

אנא אשר/י הגעה בקישור הבא:
🔗 [קישור אישור הגעה]

בברכה,
דור ונאל 💕

אנא השב בכנות על כוונתך להגיע כי לא לגרום נזק כלכלי לזוג`;

// WhatsApp Business API Configuration
const ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN || 'EAAQ16mfCx58BPZCAepGf7EQMznC5dwYUmsun7pZCvzLPqjOjnq778EeJtXGEdemBVXdqTEt9pJ0bm2l5EyL9BZAR9kVS15kjz9rWYAcbKZCZBVOQswHeZAfmkUNv2TZAeX8KGaJ8OZCb4ZCtOaZAEZARqvG2TE7DHCmZBDWRATOKdvfHZA4j8FGluUX8NNGdsqbBEVgFjNgZDZD';
const PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID || '874204535776090';

async function sendCustomMessage() {
  console.log('📤 שולח הודעת WhatsApp מותאמת אישית...');
  console.log('📱 מספר טלפון:', PHONE_NUMBER);
  console.log('💬 הודעה:', MESSAGE.substring(0, 100) + '...');
  console.log('🔑 Access Token:', ACCESS_TOKEN ? 'Set' : 'Not set');
  console.log('📱 Phone Number ID:', PHONE_NUMBER_ID);
  console.log('');

  // Format phone number
  const formattedPhone = PHONE_NUMBER.replace(/^0/, '972').replace(/[^0-9]/g, '');
  console.log('📞 מספר מעוצב:', formattedPhone);
  console.log('');

  try {
    const apiUrl = `https://graph.facebook.com/v22.0/${PHONE_NUMBER_ID}/messages`;
    
    console.log('🌐 API URL:', apiUrl);
    console.log('📤 שולח הודעה...');
    console.log('');

    const messagePayload = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: formattedPhone,
      type: 'text',
      text: {
        body: MESSAGE
      }
    };

    const response = await axios.post(apiUrl, messagePayload, {
      headers: {
        'Authorization': `Bearer ${ACCESS_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });

    console.log('✅ הודעה נשלחה בהצלחה!');
    console.log('📊 תגובה:', JSON.stringify(response.data, null, 2));
    console.log('');
    
    const messageId = response.data.messages?.[0]?.id;
    const contact = response.data.contacts?.[0];
    
    if (messageId) {
      console.log('🎉 השליחה הצליחה!');
      console.log('📱 Message ID:', messageId);
      if (contact?.wa_id) {
        console.log('📱 WhatsApp ID:', contact.wa_id);
        console.log('💡 ההודעה אמורה להגיע בקרוב');
      }
    } else {
      console.log('⚠️ הודעה נשלחה אבל אין Message ID - ייתכן שההודעה לא הגיעה');
    }
    
    console.log('');
    console.log('⚠️ הערות חשובות:');
    console.log('1. אם זו הודעה ראשונה למספר, היא חייבת להיות טמפלט מאושר');
    console.log('2. המקבל צריך לשמור את המספר שלך במועדפים');
    console.log('3. אם ההודעה לא מגיעה, בדוק שהמספר לא חסם אותך');

  } catch (error) {
    console.error('❌ שגיאה בשליחת ההודעה:');
    
    if (error.response) {
      console.error('📊 סטטוס:', error.response.status);
      console.error('📄 תגובה:', JSON.stringify(error.response.data, null, 2));
      
      const errorCode = error.response.data?.error?.code;
      const errorMessage = error.response.data?.error?.message;
      
      if (errorCode === 131047) {
        console.error('');
        console.error('⚠️ שגיאה 131047: הודעה ראשונה חייבת להיות טמפלט מאושר');
        console.error('💡 פתרון: צור טמפלט ב-WhatsApp Business Manager ושלח אותו');
      } else if (errorCode === 131026) {
        console.error('');
        console.error('⚠️ שגיאה 131026: המספר לא רשום ב-WhatsApp');
        console.error('💡 פתרון: ודא שהמספר רשום ב-WhatsApp');
      }
    } else if (error.request) {
      console.error('❌ לא התקבלה תגובה מהשרת');
      console.error('💡 ודא שיש חיבור לאינטרנט');
    } else {
      console.error('❌ שגיאה:', error.message);
    }
    
    process.exit(1);
  }
}

// Run the script
sendCustomMessage();

