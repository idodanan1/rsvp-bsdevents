const axios = require('axios');
require('dotenv').config();

const PHONE_NUMBER = '0547377881';
const ACCESS_TOKEN = 'EAAVrBHAipFgBPxRBKui3UpDUZCeoVQT6JdmChD4Psqy5mRSNFLx87wW9wdecYWyXH9OTmZBDZCNTGV1kgSVoeLdiMYY5JkIHYuLLcmc06wPwh9Ytz1whZBETZBMZAwfXdmNnUXUO7cSG13VCQpgnZBFO8G1AGLtK4hNKtCTh2tTiNYZCPNDAvtRJ92ZBispbWu2ZC7vF6HrFjn1FKmcXTJ4S67PwByZAoyuEfgmIwTLNmXroMQeIl3ZA41miLHKn8neBS80UlbxJchTGbawChQXTQ38JgTMh';
const PHONE_NUMBER_ID = '825735800624198';

async function sendTemplateA() {
  console.log('🧪 שולח הודעת Template "a"...');
  console.log('📱 מספר טלפון:', PHONE_NUMBER);
  console.log('');

  const formattedPhone = PHONE_NUMBER.replace(/^0/, '972').replace(/[^0-9]/g, '');
  console.log('📞 מספר מעוצב:', formattedPhone);
  console.log('');

  try {
    const apiUrl = `https://graph.facebook.com/v22.0/${PHONE_NUMBER_ID}/messages`;
    
    console.log('📤 שולח הודעה עם Template "a"...');
    console.log('');

    // Template "a" uses NAMED parameters
    // According to the template structure, it needs these parameters:
    // first_name, event_type, groom_name, bride_name, event_date, event_time, venue, guest_response_link
    const response = await axios.post(apiUrl, {
      messaging_product: 'whatsapp',
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
              {
                type: 'text',
                text: 'עידו'
              },
              {
                type: 'text',
                text: 'חתונה'
              },
              {
                type: 'text',
                text: 'דור'
              },
              {
                type: 'text',
                text: 'ונאל'
              },
              {
                type: 'text',
                text: '11.12.26'
              },
              {
                type: 'text',
                text: '19:30'
              },
              {
                type: 'text',
                text: 'אולמי הכלה'
              },
              {
                type: 'text',
                text: 'https://example.com/rsvp'
              }
            ]
          }
        ]
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
        
        if (errorData.error_data?.details) {
          console.error('   - פרטים:', errorData.error_data.details);
        }
        console.error('');
        
        if (errorData.code === 131047) {
          console.error('⚠️  המספר לא רשום ב-WhatsApp או חסם את המספר');
        } else if (errorData.code === 131026) {
          console.error('⚠️  המספר לא אישר את המספר של WhatsApp Business');
          console.error('💡 המספר צריך לשלוח הודעה ראשונה למספר +972 58-485-9790');
        } else if (errorData.code === 100 && errorData.error_data?.details?.includes('Parameter name')) {
          console.error('⚠️  בעיה עם פרמטרי ה-Template');
          console.error('💡 Template "a" משתמש ב-NAMED parameters - צריך לבדוק את המבנה');
        }
      }
    } else {
      console.error('❌ שגיאה:', error.message);
    }
  }
}

sendTemplateA();

