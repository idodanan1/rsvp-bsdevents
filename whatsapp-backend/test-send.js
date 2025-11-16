const axios = require('axios');
require('dotenv').config();

// Configuration
const PHONE_NUMBER = '0547377881';
const TEST_MESSAGE = '🧪 זהו בדיקת מערכת - הודעת WhatsApp נשלחה בהצלחה! ✅';
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3002';

async function testWhatsAppSend() {
  console.log('🧪 מתחיל בדיקת שליחת WhatsApp...');
  console.log('📱 מספר טלפון:', PHONE_NUMBER);
  console.log('💬 הודעה:', TEST_MESSAGE);
  console.log('🌐 Backend URL:', BACKEND_URL);
  console.log('');

  try {
    const response = await axios.post(`${BACKEND_URL}/api/whatsapp/send`, {
      to: PHONE_NUMBER,
      message: TEST_MESSAGE
    }, {
      headers: {
        'Content-Type': 'application/json'
      }
    });

    console.log('✅ הודעה נשלחה בהצלחה!');
    console.log('📊 תגובה:', JSON.stringify(response.data, null, 2));
    
    if (response.data.success) {
      console.log('');
      console.log('🎉 הבדיקה הצליחה!');
      console.log('📱 Message ID:', response.data.messageId);
      console.log('🔧 API בשימוש:', response.data.api);
    } else {
      console.log('');
      console.log('⚠️ הבדיקה הושלמה אבל יש שגיאה:', response.data.error);
    }

  } catch (error) {
    console.error('❌ שגיאה בשליחת ההודעה:');
    
    if (error.response) {
      console.error('📊 סטטוס:', error.response.status);
      console.error('📄 תגובה:', JSON.stringify(error.response.data, null, 2));
    } else if (error.request) {
      console.error('❌ לא התקבלה תגובה מהשרת');
      console.error('💡 ודא שהשרת רץ: node server.js');
    } else {
      console.error('❌ שגיאה:', error.message);
    }
    
    process.exit(1);
  }
}

// Run the test
testWhatsAppSend();

