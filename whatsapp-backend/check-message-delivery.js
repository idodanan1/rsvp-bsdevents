const axios = require('axios');
require('dotenv').config();

// Configuration
const PHONE_NUMBER = '0547377881';
const MESSAGE_ID = 'wamid.HBgMOTcyNTQ3Mzc3ODgxFQIAERgSRENCMTREMzlDODNFRjZEMzBGAA=='; // Message ID מהשליחה האחרונה

// WhatsApp Business API Configuration
const ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN || 'EAAQ16mfCx58BPZCAepGf7EQMznC5dwYUmsun7pZCvzLPqjOjnq778EeJtXGEdemBVXdqTEt9pJ0bm2l5EyL9BZAR9kVS15kjz9rWYAcbKZCZBVOQswHeZAfmkUNv2TZAeX8KGaJ8OZCb4ZCtOaZAEZARqvG2TE7DHCmZBDWRATOKdvfHZA4j8FGluUX8NNGdsqbBEVgFjNgZDZD';
const PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID || '874204535776090';

async function checkMessageDelivery() {
  console.log('🔍 בודק למה ההודעה לא הגיעה...');
  console.log('📱 מספר טלפון:', PHONE_NUMBER);
  console.log('📨 Message ID:', MESSAGE_ID);
  console.log('');

  // Step 1: Check if phone number has WhatsApp
  console.log('📋 שלב 1: בודק אם המספר רשום ב-WhatsApp...');
  try {
    const formattedPhone = PHONE_NUMBER.replace(/^0/, '972').replace(/[^0-9]/g, '');
    const contactCheckUrl = `https://graph.facebook.com/v22.0/${PHONE_NUMBER_ID}/contacts`;
    
    const contactResponse = await axios.post(contactCheckUrl, {
      contacts: [formattedPhone]
    }, {
      headers: {
        'Authorization': `Bearer ${ACCESS_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });

    console.log('✅ תגובה:', JSON.stringify(contactResponse.data, null, 2));
    
    const contact = contactResponse.data.contacts?.[0];
    if (contact?.wa_id) {
      console.log('✅ המספר רשום ב-WhatsApp:', contact.wa_id);
    } else {
      console.log('❌ המספר לא רשום ב-WhatsApp או לא פעיל');
      console.log('💡 זה יכול להיות הסיבה שההודעה לא הגיעה');
    }
    
  } catch (error) {
    console.error('❌ שגיאה בבדיקת המספר:', error.response?.data || error.message);
  }

  console.log('');
  console.log('📋 שלב 2: בדיקת אפשרויות נוספות...');
  console.log('');
  
  console.log('💡 סיבות אפשריות למה ההודעה לא הגיעה:');
  console.log('');
  console.log('1. ⚠️ זו הודעה ראשונה - WhatsApp Business API דורש טמפלט מאושר');
  console.log('   ✅ פתרון: צור טמפלט ב-WhatsApp Business Manager ושלח אותו');
  console.log('');
  console.log('2. ⚠️ המספר לא שמר את המספר שלך במועדפים');
  console.log('   ✅ פתרון: בקש מהמקבל לשמור את המספר +972 58-485-9770 במועדפים');
  console.log('');
  console.log('3. ⚠️ המספר חסם את המספר שלך');
  console.log('   ✅ פתרון: בדוק אם המספר חסם אותך ב-WhatsApp');
  console.log('');
  console.log('4. ⚠️ המספר לא אישר את המספר שלך');
  console.log('   ✅ פתרון: המספר צריך לשלוח הודעה ראשונה אליך או לאשר את המספר');
  console.log('');
  console.log('5. ⚠️ בעיית רשת או עיכוב');
  console.log('   ✅ פתרון: נסה שוב בעוד כמה דקות');
  console.log('');
  
  console.log('📊 הערות חשובות:');
  console.log('');
  console.log('• WhatsApp Business API לא מאפשר לבדוק את סטטוס ההודעה ישירות');
  console.log('• הסטטוסים (sent, delivered, read) מגיעים דרך webhooks');
  console.log('• אם ההודעה נשלחה בהצלחה (200 OK + Message ID), זה אומר שה-API קיבל אותה');
  console.log('• אבל זה לא אומר שההודעה הגיעה למקבל');
  console.log('');
  
  console.log('🔧 מה לעשות עכשיו:');
  console.log('');
  console.log('1. בדוק אם המספר קיבל את ההודעה ב-WhatsApp');
  console.log('2. אם זו הודעה ראשונה, צור טמפלט מאושר ושלח אותו');
  console.log('3. בקש מהמקבל לשמור את המספר במועדפים');
  console.log('4. בדוק שהמספר לא חסם אותך');
  console.log('5. נסה לשלוח הודעה שוב (אולי עם טמפלט אם זו הודעה ראשונה)');
}

// Run the script
checkMessageDelivery();

