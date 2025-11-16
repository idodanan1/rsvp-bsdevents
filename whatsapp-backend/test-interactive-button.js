const axios = require('axios');
require('dotenv').config();

const PHONE_NUMBER = '0547377881';
const ACCESS_TOKEN = 'EAAVrBHAipFgBPxRBKui3UpDUZCeoVQT6JdmChD4Psqy5mRSNFLx87wW9wdecYWyXH9OTmZBDZCNTGV1kgSVoeLdiMYY5JkIHYuLLcmc06wPwh9Ytz1whZBETZBMZAwfXdmNnUXUO7cSG13VCQpgnZBFO8G1AGLtK4hNKtCTh2tTiNYZCPNDAvtRJ92ZBispbWu2ZC7vF6HrFjn1FKmcXTJ4S67PwByZAoyuEfgmIwTLNmXroMQeIl3ZA41miLHKn8neBS80UlbxJchTGbawChQXTQ38JgTMh';
const PHONE_NUMBER_ID = '825735800624198';

async function testInteractiveButton() {
  console.log('🧪 בודק שליחת הודעה אינטראקטיבית עם כפתור...');
  console.log('📱 מספר טלפון:', PHONE_NUMBER);
  console.log('');

  const formattedPhone = PHONE_NUMBER.replace(/^0/, '972').replace(/[^0-9]/g, '');
  const buttonUrl = 'http://192.168.1.47:3001/guest-response/test?guest=test';
  
  console.log('📞 מספר מעוצב:', formattedPhone);
  console.log('🔗 URL כפתור:', buttonUrl);
  console.log('');

  // Try different button structures
  const structures = [
    {
      name: 'Structure 1: Using list message (not button)',
      payload: {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: formattedPhone,
        type: 'interactive',
        interactive: {
          type: 'list',
          body: {
            text: 'לחץ על הכפתור כדי לאשר הגעה:'
          },
          action: {
            button: 'לאשר הגעה',
            sections: [
              {
                title: 'אפשרויות',
                rows: [
                  {
                    id: '1',
                    title: 'לאשר הגעה',
                    description: 'לחץ כאן לאשר הגעה'
                  }
                ]
              }
            ]
          }
        }
      }
    },
    {
      name: 'Structure 2: Simple text with URL in message',
      payload: {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: formattedPhone,
        type: 'text',
        text: {
          body: `לחץ על הקישור כדי לאשר הגעה:\n\n${buttonUrl}`
        }
      }
    }
  ];

  for (const structure of structures) {
    try {
      console.log(`\n📤 מנסה: ${structure.name}`);
      console.log('📄 Payload:', JSON.stringify(structure.payload, null, 2));
      
      const response = await axios.post(
        `https://graph.facebook.com/v22.0/${PHONE_NUMBER_ID}/messages`,
        structure.payload,
        {
          headers: {
            'Authorization': `Bearer ${ACCESS_TOKEN}`,
            'Content-Type': 'application/json'
          }
        }
      );

      console.log('✅ הצליח!');
      console.log('📊 תגובה:', JSON.stringify(response.data, null, 2));
      return;

    } catch (error) {
      console.log('❌ נכשל');
      if (error.response) {
        console.log('📊 סטטוס:', error.response.status);
        console.log('📄 תגובה:', JSON.stringify(error.response.data, null, 2));
      } else {
        console.log('❌ שגיאה:', error.message);
      }
    }
  }
}

testInteractiveButton();

