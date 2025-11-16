# 🚀 הגדרה מהירה - שליחת הודעות

## 📋 מה צריך לעשות עכשיו:

### 1. **עדכן את קובץ .env**
```env
# WhatsApp Business API
VITE_WHATSAPP_API_URL=https://graph.facebook.com/v18.0
VITE_WHATSAPP_ACCESS_TOKEN=YOUR_REAL_ACCESS_TOKEN_HERE
VITE_WHATSAPP_PHONE_NUMBER_ID=YOUR_REAL_PHONE_NUMBER_ID_HERE
VITE_WHATSAPP_TEMPLATE_NAME=copy_notifications_appointment_reminde

# Twilio SMS
VITE_SMS_API_URL=https://api.twilio.com/2010-04-01/Accounts
VITE_TWILIO_ACCOUNT_SID=YOUR_REAL_ACCOUNT_SID_HERE
VITE_TWILIO_AUTH_TOKEN=YOUR_REAL_AUTH_TOKEN_HERE
VITE_SMS_FROM_NUMBER=+12347040727
```

### 2. **איפה למצוא את ההגדרות:**

**WhatsApp Business API:**
- לך ל: https://developers.facebook.com/
- בחר את האפליקציה שלך
- WhatsApp > API Setup
- העתק את Access Token ו-Phone Number ID

**Twilio:**
- לך ל: https://console.twilio.com/
- Account Info
- העתק את Account SID ו-Auth Token

### 3. **הפעל מחדש:**
```bash
npm run dev
```

### 4. **בדוק שהכל עובד:**
- לך לדף ניהול האירוע
- לחץ על "שלח הודעה" לאורח
- בדוק את הקונסול (F12)

## 🔍 מה לחפש בקונסול:

**✅ הצלחה:**
```
📱 Using WhatsApp template: copy_notifications_appointment_reminde
✅ WhatsApp sent successfully!
```

**❌ שגיאה:**
```
⚠️ WhatsApp: Invalid or missing access token
❌ SMS failed: 401 Unauthorized
```

## 🎯 אם הכל עובד:

- ההודעות נשלחות דרך WhatsApp עם התבנית שלך
- כל אורח מקבל קישור אישי
- הכפתורים עובדים בוואטסאפ
- המערכת מעדכנת סטטוסים

## 🚨 אם משהו לא עובד:

1. **בדוק את ההגדרות** ב-`.env`
2. **ודא שהתבנית קיימת** ב-Twilio
3. **בדוק את הלוגים** בקונסול
4. **נסה עם מספר טלפון אחר**

**המערכת שלכם "בס"ד אירועים" עכשיו מוכנה לשליחת הודעות אמיתיות!** 🎉


