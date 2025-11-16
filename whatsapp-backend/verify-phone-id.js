const axios = require('axios');
require('dotenv').config();

const ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN || 'EAAVrBHAipFgBPxRBKui3UpDUZCeoVQT6JdmChD4Psqy5mRSNFLx87wW9wdecYWyXH9OTmZBDZCNTGV1kgSVoeLdiMYY5JkIHYuLLcmc06wPwh9Ytz1whZBETZBMZAwfXdmNnUXUO7cSG13VCQpgnZBFO8G1AGLtK4hNKtCTh2tTiNYZCPNDAvtRJ92ZBispbWu2ZC7vF6HrFjn1FKmcXTJ4S67PwByZAoyuEfgmIwTLNmXroMQeIl3ZA41miLHKn8neBS80UlbxJchTGbawChQXTQ38JgTMh';
const PHONE_NUMBER_ID = '1514447039756290';

async function verifyPhoneId() {
  console.log('🔍 בודק את ה-ID...');
  console.log('📱 ID:', PHONE_NUMBER_ID);
  console.log('');

  try {
    // First, check if it's a WhatsApp Business Account
    console.log('📱 בודק אם זה WhatsApp Business Account...');
    const wabaResponse = await axios.get(`https://graph.facebook.com/v22.0/${PHONE_NUMBER_ID}`, {
      params: {
        fields: 'id,name',
        access_token: ACCESS_TOKEN
      }
    });

    console.log('✅ זה WhatsApp Business Account!');
    console.log('📊 פרטים:', JSON.stringify(wabaResponse.data, null, 2));
    console.log('');

    // Now try to get phone numbers from this account
    console.log('📱 מנסה לקבל מספרי טלפון...');
    try {
      const phoneNumbersResponse = await axios.get(`https://graph.facebook.com/v22.0/${PHONE_NUMBER_ID}/phone_numbers`, {
        params: {
          access_token: ACCESS_TOKEN
        }
      });

      console.log('✅ נמצאו מספרי טלפון:');
      console.log(JSON.stringify(phoneNumbersResponse.data, null, 2));
      
      if (phoneNumbersResponse.data.data && phoneNumbersResponse.data.data.length > 0) {
        console.log('');
        console.log('📱 Phone Number IDs:');
        phoneNumbersResponse.data.data.forEach((phone, index) => {
          console.log(`   ${index + 1}. Phone Number ID: ${phone.id}`);
          console.log(`      Display Number: ${phone.display_phone_number || 'N/A'}`);
          console.log(`      Verified Name: ${phone.verified_name || 'N/A'}`);
          console.log('');
        });
        
        const firstPhoneId = phoneNumbersResponse.data.data[0].id;
        console.log('💡 השתמש ב-Phone Number ID הזה לשליחת הודעות:');
        console.log(`   ${firstPhoneId}`);
      }
      
    } catch (phoneError) {
      console.log('⚠️  לא ניתן לקבל מספרי טלפון');
      if (phoneError.response) {
        console.log('📊 שגיאה:', JSON.stringify(phoneError.response.data, null, 2));
      }
    }

  } catch (error) {
    console.error('❌ שגיאה בבדיקת Phone Number ID:');
    
    if (error.response) {
      console.error('📊 סטטוס:', error.response.status);
      console.error('📄 תגובה:', JSON.stringify(error.response.data, null, 2));
      console.error('');
      
      if (error.response.data?.error?.code === 100) {
        console.error('⚠️  ה-Phone Number ID לא קיים או אין הרשאות');
        console.error('');
        console.error('💡 בדוק:');
        console.error('   1. שהמספר נכון');
        console.error('   2. שה-Access Token יש לו הרשאות לשלוח הודעות');
        console.error('   3. שהמספר מחובר ל-WhatsApp Business Account שלך');
        console.error('');
        console.error('💡 נסה למצוא את ה-Phone Number ID ב:');
        console.error('   - Facebook Developers > WhatsApp > API Setup');
        console.error('   - Facebook Business Manager > Settings > Phone Numbers');
      }
    } else {
      console.error('❌ שגיאה:', error.message);
    }
  }
}

verifyPhoneId();

