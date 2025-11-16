const axios = require('axios');
require('dotenv').config();

// Configuration
const PHONE_NUMBER = '0547377881';
const TEST_MESSAGE = '🧪 זהו בדיקת מערכת - הודעת WhatsApp נשלחה בהצלחה! ✅';

// WhatsApp Business API Configuration
const ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN || 'EAAVrBHAipFgBPxRBKui3UpDUZCeoVQT6JdmChD4Psqy5mRSNFLx87wW9wdecYWyXH9OTmZBDZCNTGV1kgSVoeLdiMYY5JkIHYuLLcmc06wPwh9Ytz1whZBETZBMZAwfXdmNnUXUO7cSG13VCQpgnZBFO8G1AGLtK4hNKtCTh2tTiNYZCPNDAvtRJ92ZBispbWu2ZC7vF6HrFjn1FKmcXTJ4S67PwByZAoyuEfgmIwTLNmXroMQeIl3ZA41miLHKn8neBS80UlbxJchTGbawChQXTQ38JgTMh';
const PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID || '825735800624198';

async function testWhatsAppDirect() {
  console.log('🧪 מתחיל בדיקת שליחת WhatsApp ישירות...');
  console.log('📱 מספר טלפון:', PHONE_NUMBER);
  console.log('💬 הודעה:', TEST_MESSAGE);
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

    const response = await axios.post(apiUrl, {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: formattedPhone,
      type: 'text',
      text: {
        body: TEST_MESSAGE
      }
    }, {
      headers: {
        'Authorization': `Bearer ${ACCESS_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });

    console.log('✅ הודעה נשלחה בהצלחה!');
    console.log('📊 תגובה:', JSON.stringify(response.data, null, 2));
    console.log('');
    console.log('🎉 הבדיקה הצליחה!');
    console.log('📱 Message ID:', response.data.messages?.[0]?.id || 'N/A');
    console.log('');

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
        console.error('   - תת-קוד:', errorData.error_subcode || 'N/A');
        console.error('');
        
        if (errorData.error_user_title) {
          console.error('📋 כותרת:', errorData.error_user_title);
          console.error('📋 תיאור:', errorData.error_user_msg);
        }
        
        // Check for expired token
        if (errorData.code === 190 || errorData.message?.includes('expired')) {
          console.error('');
          console.error('⚠️  Access Token פג תוקף!');
          console.error('');
          console.error('💡 כדי לרענן את ה-Token:');
          console.error('   1. לך ל-Facebook Developers: https://developers.facebook.com/');
          console.error('   2. בחר את האפליקציה שלך');
          console.error('   3. לך ל-Tools > Graph API Explorer');
          console.error('   4. צור Access Token חדש');
          console.error('   5. עדכן את הקובץ .env או את המשתנה WHATSAPP_ACCESS_TOKEN');
          console.error('');
        }
      }
    } else if (error.request) {
      console.error('❌ לא התקבלה תגובה מהשרת');
      console.error('💡 בדוק את החיבור לאינטרנט');
    } else {
      console.error('❌ שגיאה:', error.message);
    }
    
    process.exit(1);
  }
}

// Run the test
testWhatsAppDirect();

