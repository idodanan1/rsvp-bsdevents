const axios = require('axios');

// Configuration
const ACCESS_TOKEN = 'EAAQ16mfCx58BPZCAepGf7EQMznC5dwYUmsun7pZCvzLPqjOjnq778EeJtXGEdemBVXdqTEt9pJ0bm2l5EyL9BZAR9kVS15kjz9rWYAcbKZCZBVOQswHeZAfmkUNv2TZAeX8KGaJ8OZCb4ZCtOaZAEZARqvG2TE7DHCmZBDWRATOKdvfHZA4j8FGluUX8NNGdsqbBEVgFjNgZDZD';
const PHONE_NUMBER_ID = '874204535776090';

async function checkTemplateA() {
  try {
    console.log('🔍 בודק את הטמפלט "a" במטה...');
    console.log('');

    // Try to get template info
    // Note: This endpoint might not be available, but we'll try
    const apiUrl = `https://graph.facebook.com/v22.0/${PHONE_NUMBER_ID}/message_templates`;
    
    try {
      const response = await axios.get(apiUrl, {
        headers: {
          'Authorization': `Bearer ${ACCESS_TOKEN}`,
        },
        params: {
          name: 'a'
        }
      });
      
      console.log('✅ טמפלטים נמצאו:');
      console.log(JSON.stringify(response.data, null, 2));
    } catch (error) {
      console.log('⚠️ לא ניתן לקבל מידע על הטמפלט דרך API');
      console.log('💡 אנא בדוק במטה Business Manager:');
      console.log('   1. לך ל-WhatsApp → Message Templates');
      console.log('   2. בחר את הטמפלט "a"');
      console.log('   3. בדוק כמה פרמטרים יש בטמפלט');
      console.log('   4. בדוק את הסדר המדויק של הפרמטרים');
      console.log('');
      console.log('📋 לפי התוכן שסיפקת, הטמפלט צריך להיות:');
      console.log('   שלום {{guest_name}}!');
      console.log('   אנחנו שמחים להזמין אותך ל{{event_type}} של {{groom_name}} ו{{bride_name}}!');
      console.log('   📅 תאריך: {{event_date}}');
      console.log('   🕐 שעה: {{event_time}}');
      console.log('   📍 מיקום: {{venue}}');
      console.log('   אנא אשר/י הגעה בקישור הבא:');
      console.log('   {{guest_response_link}}');
      console.log('   בברכה,');
      console.log('   {{couple_name}} 💕');
      console.log('');
      console.log('📋 פרמטרים בסדר:');
      console.log('   1. {{guest_name}}');
      console.log('   2. {{event_type}}');
      console.log('   3. {{groom_name}}');
      console.log('   4. {{bride_name}}');
      console.log('   5. {{event_date}}');
      console.log('   6. {{event_time}}');
      console.log('   7. {{venue}}');
      console.log('   8. {{guest_response_link}}');
      console.log('   9. {{couple_name}}');
    }

  } catch (error) {
    console.error('❌ שגיאה:');
    if (error.response) {
      console.error(JSON.stringify(error.response.data, null, 2));
    } else {
      console.error(error.message);
    }
  }
}

checkTemplateA();

