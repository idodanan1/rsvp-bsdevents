/**
 * 🧪 סקריפט לבדיקת חיבור ל-WhatsApp Business API
 * 
 * איך להריץ:
 * 1. פתח טרמינל בתיקיית הפרויקט
 * 2. הרץ: node test-whatsapp-connection.js
 */

import axios from 'axios';

// ⚠️ עדכן את הערכים האלה עם ההגדרות שלך מ-.env או מ-Meta Business Manager
const ACCESS_TOKEN = process.env.VITE_WHATSAPP_ACCESS_TOKEN || 'YOUR_ACCESS_TOKEN_HERE';
const PHONE_NUMBER_ID = process.env.VITE_WHATSAPP_PHONE_NUMBER_ID || 'YOUR_PHONE_NUMBER_ID_HERE';
const TEST_PHONE = '972547377881'; // מספר לבדיקה (בפורמט 972...)

console.log('🧪 בודק חיבור ל-WhatsApp Business API...\n');
console.log('📱 Phone Number ID:', PHONE_NUMBER_ID);
console.log('🔑 Access Token:', ACCESS_TOKEN.substring(0, 20) + '...');
console.log('');

async function testConnection() {
  try {
    // שלב 1: בדיקת Phone Number ID
    console.log('📋 שלב 1: בודק Phone Number ID...');
    const phoneCheck = await axios.get(`https://graph.facebook.com/v22.0/${PHONE_NUMBER_ID}`, {
      params: {
        fields: 'id,name,display_phone_number,verified_name',
        access_token: ACCESS_TOKEN
      }
    });

    console.log('✅ Phone Number ID תקין!');
    console.log('📊 פרטים:', JSON.stringify(phoneCheck.data, null, 2));
    console.log('');

    // שלב 2: בדיקת שליחת הודעה (תבנית hello_world)
    console.log('📋 שלב 2: בודק שליחת הודעה עם תבנית hello_world...');
    const messagePayload = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: TEST_PHONE,
      type: 'template',
      template: {
        name: 'hello_world',
        language: {
          code: 'en_US'
        }
      }
    };

    const sendResponse = await axios.post(
      `https://graph.facebook.com/v22.0/${PHONE_NUMBER_ID}/messages`,
      messagePayload,
      {
        headers: {
          'Authorization': `Bearer ${ACCESS_TOKEN}`,
          'Content-Type': 'application/json'
        }
      }
    );

    console.log('✅ הודעה נשלחה בהצלחה!');
    console.log('📱 Message ID:', sendResponse.data.messages?.[0]?.id || 'N/A');
    console.log('📊 תגובה מלאה:', JSON.stringify(sendResponse.data, null, 2));
    console.log('');

    // שלב 3: בדיקת תבנית "aa" (אם קיימת)
    console.log('📋 שלב 3: בודק תבנית "aa"...');
    try {
      const templatePayload = {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: TEST_PHONE,
        type: 'template',
        template: {
          name: 'aa',
          language: {
            code: 'he'
          },
          components: [{
            type: 'body',
            parameters: [
              { type: 'text', text: 'אורח' },
              { type: 'text', text: 'חתונה' },
              { type: 'text', text: 'חתן' },
              { type: 'text', text: 'כלה' },
              { type: 'text', text: '01/01/2025' },
              { type: 'text', text: '18:00' },
              { type: 'text', text: 'אולם' },
              { type: 'text', text: 'הזוג' }
            ]
          }]
        }
      };

      const templateResponse = await axios.post(
        `https://graph.facebook.com/v22.0/${PHONE_NUMBER_ID}/messages`,
        templatePayload,
        {
          headers: {
            'Authorization': `Bearer ${ACCESS_TOKEN}`,
            'Content-Type': 'application/json'
          }
        }
      );

      console.log('✅ תבנית "aa" נשלחה בהצלחה!');
      console.log('📱 Message ID:', templateResponse.data.messages?.[0]?.id || 'N/A');
    } catch (templateError) {
      if (templateError.response) {
        console.log('⚠️  תבנית "aa" נכשלה:', templateError.response.data?.error?.message || 'Unknown error');
        console.log('📊 שגיאה:', JSON.stringify(templateError.response.data, null, 2));
      } else {
        console.log('⚠️  שגיאה:', templateError.message);
      }
    }

    console.log('');
    console.log('🎉 כל הבדיקות הושלמו!');
    console.log('');
    console.log('💡 אם הכל עובד:');
    console.log('   - Phone Number ID תקין ✅');
    console.log('   - Access Token תקין ✅');
    console.log('   - שליחת הודעות עובדת ✅');
    console.log('');
    console.log('💡 אם יש שגיאות:');
    console.log('   1. בדוק את ה-Access Token ב-Meta Business Manager');
    console.log('   2. בדוק את ה-Phone Number ID ב-WhatsApp > API Setup');
    console.log('   3. ודא שהתבניות מאושרות ב-Meta Business Manager');

  } catch (error) {
    console.error('❌ שגיאה בבדיקת החיבור:');
    console.error('');

    if (error.response) {
      console.error('📊 סטטוס:', error.response.status);
      console.error('📄 תגובה:', JSON.stringify(error.response.data, null, 2));
      console.error('');

      const errorData = error.response.data?.error || {};
      
      if (errorData.code === 100) {
        console.error('⚠️  שגיאה 100: Invalid parameter');
        console.error('💡 בדוק:');
        console.error('   - שה-Phone Number ID נכון');
        console.error('   - שה-Access Token תקין ולא פג תוקף');
        console.error('   - שהמספר מחובר ל-WhatsApp Business Account');
      } else if (errorData.code === 190) {
        console.error('⚠️  שגיאה 190: Invalid access token');
        console.error('💡 בדוק:');
        console.error('   - שה-Access Token נכון');
        console.error('   - שהטוקן לא פג תוקף (אם זה Temporary Token)');
        console.error('   - שהטוקן יש לו הרשאות לשלוח הודעות');
      } else if (errorData.code === 131047) {
        console.error('⚠️  שגיאה 131047: Cannot send message to this number');
        console.error('💡 זה אומר שהמספר לא אישר לקבל הודעות ממך');
        console.error('   - זה נורמלי למספרים חדשים');
        console.error('   - המשתמש צריך לשלוח לך הודעה קודם');
      }
    } else if (error.request) {
      console.error('❌ לא התקבלה תגובה מהשרת');
      console.error('💡 בדוק:');
      console.error('   - שיש חיבור לאינטרנט');
      console.error('   - שה-API URL נכון');
    } else {
      console.error('❌ שגיאה:', error.message);
    }

    process.exit(1);
  }
}

// הרץ את הבדיקה
testConnection();

