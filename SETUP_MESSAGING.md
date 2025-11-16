# הגדרת שירותי הודעות

## WhatsApp Business API

1. **צור חשבון WhatsApp Business API:**
   - לך ל: https://business.whatsapp.com/
   - צור חשבון עסקי
   - קבל את ה-Access Token וה-Phone Number ID

2. **הוסף את ההגדרות לקובץ .env:**
```env
VITE_WHATSAPP_API_URL=https://graph.facebook.com/v18.0
VITE_WHATSAPP_ACCESS_TOKEN=YOUR_ACCESS_TOKEN_HERE
VITE_WHATSAPP_PHONE_NUMBER_ID=YOUR_PHONE_NUMBER_ID_HERE
```

## Twilio SMS

1. **צור חשבון Twilio:**
   - לך ל: https://www.twilio.com/
   - צור חשבון חינמי
   - קבל את ה-Account SID וה-Auth Token

2. **הוסף את ההגדרות לקובץ .env:**
```env
VITE_SMS_API_URL=https://api.twilio.com/2010-04-01/Accounts
VITE_TWILIO_ACCOUNT_SID=YOUR_ACCOUNT_SID_HERE
VITE_TWILIO_AUTH_TOKEN=YOUR_AUTH_TOKEN_HERE
VITE_SMS_FROM_NUMBER=+12347040727
```

## יצירת קובץ .env

צור קובץ `.env` בתיקיית הפרויקט עם ההגדרות שלך:

```env
# WhatsApp Business API Configuration
VITE_WHATSAPP_API_URL=https://graph.facebook.com/v18.0
VITE_WHATSAPP_ACCESS_TOKEN=YOUR_WHATSAPP_ACCESS_TOKEN
VITE_WHATSAPP_PHONE_NUMBER_ID=YOUR_WHATSAPP_PHONE_NUMBER_ID

# Twilio SMS Configuration
VITE_SMS_API_URL=https://api.twilio.com/2010-04-01/Accounts
VITE_TWILIO_ACCOUNT_SID=YOUR_TWILIO_ACCOUNT_SID
VITE_TWILIO_AUTH_TOKEN=YOUR_TWILIO_AUTH_TOKEN
VITE_SMS_FROM_NUMBER=+12347040727
```

## הערות חשובות

- **WhatsApp**: דורש אישור עסקי ו-verification
- **SMS**: Twilio מספק מספר טלפון חינמי לבדיקות
- **בדיקה**: השתמש במספר הטלפון שלך לבדיקות ראשוניות
- **ייצור**: ודא שיש לך תקציב מספיק ב-Twilio לשליחת הודעות

## בדיקת ההגדרה

1. הפעל את הפרויקט: `npm run dev`
2. לך לדף ניהול האירוע
3. לחץ על "שלח הודעה" לאורח
4. בדוק את הקונסול לראות אם ההודעה נשלחה


