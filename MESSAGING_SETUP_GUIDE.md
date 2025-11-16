# 🚀 מדריך הגדרת שירותי הודעות

## 📱 WhatsApp Business API

### שלב 1: יצירת חשבון WhatsApp Business
1. לך ל: https://business.whatsapp.com/
2. לחץ על "Get Started"
3. בחר "Business Account"
4. מלא את פרטי העסק שלך

### שלב 2: קבלת אישורים
1. לך ל: https://developers.facebook.com/
2. צור אפליקציה חדשה
3. הוסף את WhatsApp Business API
4. קבל את ה-Access Token וה-Phone Number ID

### שלב 3: הגדרת המשתנים
צור קובץ `.env` בתיקיית הפרויקט:

```env
VITE_WHATSAPP_API_URL=https://graph.facebook.com/v18.0
VITE_WHATSAPP_ACCESS_TOKEN=YOUR_ACCESS_TOKEN_HERE
VITE_WHATSAPP_PHONE_NUMBER_ID=YOUR_PHONE_NUMBER_ID_HERE
```

## 📞 Twilio SMS

### שלב 1: יצירת חשבון Twilio
1. לך ל: https://www.twilio.com/
2. לחץ על "Sign up for free"
3. מלא את הפרטים שלך
4. אמת את מספר הטלפון שלך

### שלב 2: קבלת אישורים
1. לך ל: https://console.twilio.com/
2. העתק את ה-Account SID
3. העתק את ה-Auth Token
4. קבל מספר טלפון לבדיקות

### שלב 3: הגדרת המשתנים
הוסף לקובץ `.env`:

```env
VITE_SMS_API_URL=https://api.twilio.com/2010-04-01/Accounts
VITE_TWILIO_ACCOUNT_SID=YOUR_ACCOUNT_SID_HERE
VITE_TWILIO_AUTH_TOKEN=YOUR_AUTH_TOKEN_HERE
VITE_SMS_FROM_NUMBER=+12347040727
```

## 🔧 הגדרת הפרויקט

### שלב 1: יצירת קובץ .env
```bash
# בתיקיית הפרויקט
touch .env
```

### שלב 2: הוספת ההגדרות
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

### שלב 3: הפעלת הפרויקט
```bash
npm run dev
```

## 🧪 בדיקת ההגדרה

### בדיקה ראשונית
1. פתח את הקונסול בדפדפן (F12)
2. לך לדף ניהול האירוע
3. לחץ על "שלח הודעה" לאורח
4. בדוק את הלוגים בקונסול

### מה לחפש בקונסול
```
📱 WhatsApp Message: {to: "+972...", message: "..."}
📞 Twilio API Call: From: +12347040727, To: +972...
✅ SMS sent successfully!
```

## ⚠️ בעיות נפוצות

### WhatsApp לא עובד
- ודא שה-Access Token תקין
- בדוק שה-Phone Number ID נכון
- ודא שהחשבון מאושר

### SMS לא עובד
- בדוק שה-Account SID וה-Auth Token נכונים
- ודא שיש תקציב בחשבון Twilio
- בדוק שמספר הטלפון תקין

### שגיאות CORS
- ודא שהשירותים מוגדרים נכון
- בדוק את הלוגים בקונסול

## 💰 עלויות

### WhatsApp Business API
- **חינמי**: עד 1,000 הודעות בחודש
- **בתשלום**: $0.005 להודעה

### Twilio SMS
- **חינמי**: $15 קרדיט לבדיקות
- **בתשלום**: $0.0075 להודעה

## 🎯 טיפים

1. **התחל עם Twilio** - קל יותר להגדיר
2. **בדוק עם מספר שלך** - לפני שליחה למוזמנים
3. **שמור על תקציב** - עקוב אחר ההוצאות
4. **בדוק את הלוגים** - תמיד יש מידע שימושי

## 📞 תמיכה

אם נתקלת בבעיות:
1. בדוק את הלוגים בקונסול
2. ודא שההגדרות נכונות
3. בדוק את התקציב בחשבונות
4. נסה עם מספר טלפון אחר


