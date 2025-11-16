const axios = require('axios');
require('dotenv').config();

const ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN || 'EAAQ16mfCx58BPZCAepGf7EQMznC5dwYUmsun7pZCvzLPqjOjnq778EeJtXGEdemBVXdqTEt9pJ0bm2l5EyL9BZAR9kVS15kjz9rWYAcbKZCZBVOQswHeZAfmkUNv2TZAeX8KGaJ8OZCb4ZCtOaZAEZARqvG2TE7DHCmZBDWRATOKdvfHZA4j8FGluUX8NNGdsqbBEVgFjNgZDZD';
const PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID || '874204535776090';

// Try to get WABA ID from phone number
async function getWABAId() {
  try {
    const response = await axios.get(`https://graph.facebook.com/v22.0/${PHONE_NUMBER_ID}`, {
      headers: {
        'Authorization': `Bearer ${ACCESS_TOKEN}`,
        'Content-Type': 'application/json'
      },
      params: {
        fields: 'whatsapp_business_account'
      }
    });
    
    if (response.data.whatsapp_business_account?.id) {
      return response.data.whatsapp_business_account.id;
    }
  } catch (error) {
    console.log('⚠️ לא הצלחתי לקבל WABA ID, מנסה דרך אחרת...');
  }
  
  // Try common WABA IDs or return null
  return null;
}

async function checkTemplates() {
  console.log('🔍 בודק Templates זמינים...');
  console.log('📱 Phone Number ID:', PHONE_NUMBER_ID);
  console.log('');

  // Try to get WABA ID
  const WABA_ID = await getWABAId();
  
  if (!WABA_ID) {
    console.log('⚠️ לא הצלחתי לקבל WhatsApp Business Account ID');
    console.log('💡 נסה לבדוק ידנית ב-Facebook Business Manager');
    console.log('   https://business.facebook.com/');
    console.log('');
    console.log('📋 מה לעשות:');
    console.log('1. לך ל-Facebook Business Manager');
    console.log('2. בחר את ה-Account שלך');
    console.log('3. לך ל-WhatsApp → Message Templates');
    console.log('4. בדוק אם יש Templates מאושרים');
    console.log('');
    console.log('⚠️ חשוב: אם זו הודעה ראשונה, אתה חייב להשתמש ב-Template מאושר!');
    return;
  }

  console.log('📱 WhatsApp Business Account ID:', WABA_ID);
  console.log('');

  try {
    // Get templates from WhatsApp Business Account
    const response = await axios.get(
      `https://graph.facebook.com/v22.0/${WABA_ID}/message_templates`,
      {
        headers: {
          'Authorization': `Bearer ${ACCESS_TOKEN}`,
          'Content-Type': 'application/json'
        }
      }
    );

    console.log('✅ נמצאו Templates:');
    console.log(JSON.stringify(response.data, null, 2));
    
    if (response.data.data && response.data.data.length > 0) {
      console.log('');
      console.log('📋 Templates זמינים:');
      response.data.data.forEach((template, index) => {
        console.log(`   ${index + 1}. שם: ${template.name}`);
        console.log(`      סטטוס: ${template.status}`);
        console.log(`      קטגוריה: ${template.category}`);
        console.log(`      שפה: ${template.language}`);
        console.log('');
      });
    } else {
      console.log('⚠️  לא נמצאו Templates');
      console.log('');
      console.log('💡 כדי לשלוח הודעות ראשונות, צריך:');
      console.log('   1. ליצור Template ב-Facebook Business Manager');
      console.log('   2. לחכות לאישור (יכול לקחת כמה שעות)');
      console.log('   3. להשתמש ב-Template לשליחת הודעות');
    }

  } catch (error) {
    console.error('❌ שגיאה:');
    
    if (error.response) {
      console.error('📊 סטטוס:', error.response.status);
      console.error('📄 תגובה:', JSON.stringify(error.response.data, null, 2));
    } else {
      console.error('❌ שגיאה:', error.message);
    }
    
    console.log('');
    console.log('💡 הערות:');
    console.log('   - WhatsApp Business API דורש Templates להודעות ראשונות');
    console.log('   - הודעות טקסט חופשיות אפשר לשלוח רק אחרי שהמספר שלח הודעה ראשונה');
    console.log('   - צריך ליצור Template ב-Facebook Business Manager');
  }
}

checkTemplates();

