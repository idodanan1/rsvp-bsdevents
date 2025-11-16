const axios = require('axios');
require('dotenv').config();

// WhatsApp Business API Configuration
const ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN || 'EAAVrBHAipFgBPxRBKui3UpDUZCeoVQT6JdmChD4Psqy5mRSNFLx87wW9wdecYWyXH9OTmZBDZCNTGV1kgSVoeLdiMYY5JkIHYuLLcmc06wPwh9Ytz1whZBETZBMZAwfXdmNnUXUO7cSG13VCQpgnZBFO8G1AGLtK4hNKtCTh2tTiNYZCPNDAvtRJ92ZBispbWu2ZC7vF6HrFjn1FKmcXTJ4S67PwByZAoyuEfgmIwTLNmXroMQeIl3ZA41miLHKn8neBS80UlbxJchTGbawChQXTQ38JgTMh';

async function findPhoneNumberId() {
  console.log('🔍 מחפש את Phone Number ID...');
  console.log('🔑 Access Token:', ACCESS_TOKEN ? 'Set' : 'Not set');
  console.log('');

  try {
    // Try to get the WhatsApp Business Account ID first
    console.log('📱 מנסה לקבל את פרטי WhatsApp Business Account...');
    
    const response = await axios.get('https://graph.facebook.com/v22.0/me', {
      params: {
        fields: 'id,name',
        access_token: ACCESS_TOKEN
      }
    });

    console.log('✅ התחברות הצליחה!');
    console.log('👤 Account ID:', response.data.id);
    console.log('👤 Account Name:', response.data.name);
    console.log('');

    // Try to get WhatsApp Business Account
    console.log('📱 מנסה לקבל את פרטי WhatsApp Business Account...');
    
    try {
      // First, try to get the WhatsApp Business Account ID
      const wabaResponse = await axios.get('https://graph.facebook.com/v22.0/me', {
        params: {
          fields: 'whatsapp_business_accounts',
          access_token: ACCESS_TOKEN
        }
      });

      if (wabaResponse.data.whatsapp_business_accounts) {
        const wabaId = wabaResponse.data.whatsapp_business_accounts.data[0]?.id;
        
        if (wabaId) {
          console.log('✅ נמצא WhatsApp Business Account ID:', wabaId);
          console.log('');
          
          // Try to get phone numbers from WABA
          try {
            const phoneNumbersResponse = await axios.get(`https://graph.facebook.com/v22.0/${wabaId}/phone_numbers`, {
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
                console.log(`   ${index + 1}. ID: ${phone.id}`);
                console.log(`      Display Number: ${phone.display_phone_number || 'N/A'}`);
                console.log(`      Verified Name: ${phone.verified_name || 'N/A'}`);
                console.log('');
              });
              
              // Use the first phone number ID
              const firstPhoneId = phoneNumbersResponse.data.data[0].id;
              console.log('💡 השתמש ב-Phone Number ID הזה:');
              console.log(`   ${firstPhoneId}`);
            }
            
          } catch (phoneError) {
            console.log('⚠️  לא ניתן לקבל מספרי טלפון');
            if (phoneError.response) {
              console.log('📊 שגיאה:', phoneError.response.data);
            }
          }
        } else {
          console.log('⚠️  לא נמצא WhatsApp Business Account');
        }
      } else {
        console.log('⚠️  לא נמצא WhatsApp Business Account');
      }
      
    } catch (phoneError) {
      console.log('⚠️  לא ניתן לקבל מספרי טלפון ישירות');
      console.log('💡 נסה את אחת מהדרכים הבאות:');
      console.log('');
      console.log('   1. לך ל-Facebook Business Manager: https://business.facebook.com/');
      console.log('   2. בחר את ה-WhatsApp Business Account שלך');
      console.log('   3. לך ל-Settings > Phone Numbers');
      console.log('   4. מצא את ה-Phone Number ID (מספר ארוך)');
      console.log('');
      console.log('   או:');
      console.log('');
      console.log('   1. לך ל-Facebook Developers: https://developers.facebook.com/');
      console.log('   2. בחר את האפליקציה שלך');
      console.log('   3. לך ל-WhatsApp > API Setup');
      console.log('   4. מצא את ה-Phone Number ID שם');
      console.log('');
      
      if (phoneError.response) {
        console.log('📊 שגיאה:', phoneError.response.data);
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
}

// Run
findPhoneNumberId();

