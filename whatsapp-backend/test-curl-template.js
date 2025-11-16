const axios = require('axios');
require('dotenv').config();

const PHONE_NUMBER = '0547377881';
const ACCESS_TOKEN = 'EAAVrBHAipFgBPxRBKui3UpDUZCeoVQT6JdmChD4Psqy5mRSNFLx87wW9wdecYWyXH9OTmZBDZCNTGV1kgSVoeLdiMYY5JkIHYuLLcmc06wPwh9Ytz1whZBETZBMZAwfXdmNnUXUO7cSG13VCQpgnZBFO8G1AGLtK4hNKtCTh2tTiNYZCPNDAvtRJ92ZBispbWu2ZC7vF6HrFjn1FKmcXTJ4S67PwByZAoyuEfgmIwTLNmXroMQeIl3ZA41miLHKn8neBS80UlbxJchTGbawChQXTQ38JgTMh';
const PHONE_NUMBER_ID = '825735800624198';

async function sendTemplateMessage() {
  console.log('🧪 שולח הודעת Template עם המבנה המדויק...');
  console.log('📱 מספר טלפון:', PHONE_NUMBER);
  console.log('');

  const formattedPhone = PHONE_NUMBER.replace(/^0/, '972').replace(/[^0-9]/g, '');
  console.log('📞 מספר מעוצב:', formattedPhone);
  console.log('');

  try {
    const apiUrl = `https://graph.facebook.com/v22.0/${PHONE_NUMBER_ID}/messages`;
    
    console.log('🌐 API URL:', apiUrl);
    console.log('📤 שולח הודעה עם Template "hello_world"...');
    console.log('');

    // Use the exact structure from the curl command
    const response = await axios.post(apiUrl, {
      messaging_product: 'whatsapp',
      to: formattedPhone,
      type: 'template',
      template: {
        name: 'hello_world',
        language: {
          code: 'en_US'
        }
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
    console.log('🎉 ההודעה נשלחה!');
    console.log('📱 Message ID:', response.data.messages?.[0]?.id || 'N/A');
    console.log('');
    console.log('💡 בדוק את WhatsApp שלך - ההודעה אמורה להגיע תוך כמה שניות');

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
        
        if (errorData.code === 131058) {
          console.error('⚠️  Template "hello_world" יכול להישלח רק מ-Public Test Numbers');
          console.error('💡 נסה להשתמש ב-Template "a" במקום');
        } else if (errorData.code === 131047) {
          console.error('⚠️  המספר לא רשום ב-WhatsApp או חסם את המספר');
        } else if (errorData.code === 131026) {
          console.error('⚠️  המספר לא אישר את המספר של WhatsApp Business');
          console.error('💡 המספר צריך לשלוח הודעה ראשונה למספר +972 58-485-9790');
        }
      }
    } else {
      console.error('❌ שגיאה:', error.message);
    }
  }
}

sendTemplateMessage();

