const axios = require('axios');
require('dotenv').config();

const ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN || 'EAAVrBHAipFgBPxRBKui3UpDUZCeoVQT6JdmChD4Psqy5mRSNFLx87wW9wdecYWyXH9OTmZBDZCNTGV1kgSVoeLdiMYY5JkIHYuLLcmc06wPwh9Ytz1whZBETZBMZAwfXdmNnUXUO7cSG13VCQpgnZBFO8G1AGLtK4hNKtCTh2tTiNYZCPNDAvtRJ92ZBispbWu2ZC7vF6HrFjn1FKmcXTJ4S67PwByZAoyuEfgmIwTLNmXroMQeIl3ZA41miLHKn8neBS80UlbxJchTGbawChQXTQ38JgTMh';
const PHONE_NUMBER_ID = '825735800624198';
const MESSAGE_ID = 'wamid.HBgMOTcyNTQ3Mzc3ODgxFQIAERgSMkQ0Q0JBMEQ4REM3RTEwNDUyAA==';

async function checkMessageStatus() {
  console.log('🔍 בודק את סטטוס ההודעה...');
  console.log('📱 Message ID:', MESSAGE_ID);
  console.log('');

  // Note: WhatsApp Business API doesn't provide a direct endpoint to check message status
  // Status updates come via webhooks. But we can check if the phone number is registered
  
  const phoneNumber = '972547377881';
  
  try {
    console.log('📱 בודק אם המספר רשום ב-WhatsApp...');
    
    const response = await axios.post(
      `https://graph.facebook.com/v22.0/${PHONE_NUMBER_ID}/contacts`,
      {
        contacts: [phoneNumber]
      },
      {
        headers: {
          'Authorization': `Bearer ${ACCESS_TOKEN}`,
          'Content-Type': 'application/json'
        }
      }
    );

    console.log('📊 תגובה:');
    console.log(JSON.stringify(response.data, null, 2));
    console.log('');

    if (response.data.contacts && response.data.contacts.length > 0) {
      const contact = response.data.contacts[0];
      
      if (contact.wa_id) {
        console.log('✅ המספר רשום ב-WhatsApp!');
        console.log('📱 WhatsApp ID:', contact.wa_id);
        console.log('');
        console.log('💡 אם לא קיבלת הודעה, יכול להיות:');
        console.log('   1. המספר לא אישר את המספר של WhatsApp Business');
        console.log('   2. יש בעיה עם קוד האימות (ראיתי ש-code_verification_status הוא EXPIRED)');
        console.log('   3. ההודעה נשלחה אבל לא הגיעה (נסה לבדוק את WhatsApp)');
        console.log('   4. המספר חסם את המספר של WhatsApp Business');
      } else {
        console.log('⚠️  המספר לא רשום ב-WhatsApp');
        console.log('💡 המספר צריך להירשם ל-WhatsApp לפני שניתן לשלוח לו הודעות');
      }
    }

  } catch (error) {
    console.error('❌ שגיאה:');
    
    if (error.response) {
      console.error('📊 סטטוס:', error.response.status);
      console.error('📄 תגובה:', JSON.stringify(error.response.data, null, 2));
    } else {
      console.error('❌ שגיאה:', error.message);
    }
  }
  
  console.log('');
  console.log('💡 הערות חשובות:');
  console.log('   1. WhatsApp Business API דורש שהמספר יאשר את המספר של Business לפני שניתן לשלוח הודעות');
  console.log('   2. עבור הודעות ראשונות, צריך להשתמש ב-Templates מאושרים');
  console.log('   3. הודעות טקסט חופשיות אפשר לשלוח רק אחרי שהמספר שלח הודעה ראשונה');
  console.log('   4. ראיתי ש-code_verification_status הוא EXPIRED - זה יכול להיות הבעיה');
}

checkMessageStatus();

