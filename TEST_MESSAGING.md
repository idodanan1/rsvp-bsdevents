# 🧪 בדיקת מערכת ההודעות

## ✅ מה צריך לבדוק:

### 1. **הגדרות סביבה (.env)**
```env
VITE_WHATSAPP_API_URL=https://graph.facebook.com/v18.0
VITE_WHATSAPP_ACCESS_TOKEN=YOUR_ACCESS_TOKEN
VITE_WHATSAPP_PHONE_NUMBER_ID=YOUR_PHONE_NUMBER_ID
VITE_WHATSAPP_TEMPLATE_NAME=event_invitation

VITE_SMS_API_URL=https://api.twilio.com/2010-04-01/Accounts
VITE_TWILIO_ACCOUNT_SID=YOUR_ACCOUNT_SID
VITE_TWILIO_AUTH_TOKEN=YOUR_AUTH_TOKEN
VITE_SMS_FROM_NUMBER=+12347040727
```

### 2. **בדיקת התבנית ב-Twilio**
- התבנית `event_invitation` קיימת
- התבנית מאושרת ב-WhatsApp
- התבנית מכילה את המשתנים הנכונים

### 3. **בדיקת המערכת**
1. פתח את הפרויקט: `npm run dev`
2. לך לדף ניהול האירוע
3. לחץ על "שלח הודעה" לאורח
4. בדוק את הקונסול (F12)

## 🔍 מה לחפש בקונסול:

### הודעה מוצלחת:
```
📱 WhatsApp Message: {to: "+972...", templateName: "event_invitation"}
✅ WhatsApp sent successfully!
```

### שגיאה:
```
❌ WhatsApp API error: Template not found
❌ WhatsApp API error: Template not approved
```

## 🚨 בעיות נפוצות:

### 1. **"Template not found"**
- בדוק שהשם ב-`.env` תואם ל-Twilio
- ודא שהתבנית קיימת ב-Twilio Console

### 2. **"Template not approved"**
- התבנית עדיין לא אושרה ב-WhatsApp
- המתן כמה שעות לאישור

### 3. **"Invalid access token"**
- בדוק שה-Access Token נכון
- ודא שהחשבון פעיל

## 🎯 בדיקה מהירה:

### שלב 1: בדיקת הגדרות
```bash
# בדוק שהקובץ .env קיים
ls -la .env

# בדוק את התוכן
cat .env
```

### שלב 2: בדיקת המערכת
1. פתח את הפרויקט
2. לך לדף ניהול האירוע
3. לחץ על "שלח הודעה"
4. בדוק את הקונסול

### שלב 3: בדיקת התוצאה
- האם ההודעה נשלחה?
- האם האורח קיבל את הקישור האישי?
- האם הכפתורים עובדים?

## 📞 אם משהו לא עובד:

1. **בדוק את הלוגים** בקונסול
2. **ודא שההגדרות נכונות** ב-`.env`
3. **בדוק את הסטטוס** ב-Twilio Console
4. **נסה עם מספר טלפון אחר**

## 🎉 אם הכל עובד:

- ההודעות נשלחות בהצלחה
- כל אורח מקבל קישור אישי
- הכפתורים עובדים בוואטסאפ
- המערכת מעדכנת סטטוסים

**המערכת שלכם "בס"ד אירועים" עכשיו מוכנה לשליחת הודעות אמיתיות!** 🚀


