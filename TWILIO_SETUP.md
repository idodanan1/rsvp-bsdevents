# 📞 הגדרת Twilio לשליחת SMS אמיתית

## 🎯 למה Twilio?
- ✅ **חינמי** - $15 קרדיט חינם (300 הודעות SMS)
- ✅ **תומך בישראל** - מספרים ישראליים
- ✅ **קל להגדרה** - API פשוט
- ✅ **אמין** - חברה גדולה ויציבה
- ✅ **מחיר זול** - ~$0.05 להודעה

## 🚀 שלב 1: הרשמה ל-Twilio

1. **לך לאתר**: https://www.twilio.com
2. **לחץ על "Sign up"**
3. **מלא את הפרטים**:
   - שם מלא
   - אימייל
   - מספר טלפון
   - סיסמה
4. **אשר את החשבון** דרך האימייל

## 🔑 שלב 2: קבלת המפתחות

1. **לך ל-Dashboard** של Twilio
2. **מצא את "Account Info"** בצד שמאל
3. **העתק את**:
   - **Account SID** (מתחיל ב-AC...)
   - **Auth Token** (לחץ על העין כדי לראות)

## ⚙️ שלב 3: הגדרת המערכת

1. **צור קובץ `.env`** בתיקיית הפרויקט
2. **הוסף את התוכן הבא**:
```env
# Twilio SMS Configuration
VITE_TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
VITE_TWILIO_AUTH_TOKEN=your_auth_token_here
VITE_SMS_FROM_NUMBER=+972584859770
```

3. **החלף את הערכים**:
   - `ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx` → Account SID שלך
   - `your_auth_token_here` → Auth Token שלך
   - `+972584859770` → המספר שלך (אופציונלי)

## 🔄 שלב 4: הפעלת המערכת

1. **סגור את השרת** (Ctrl+C)
2. **הפעל מחדש**: `npm run dev`
3. **פתח את האפליקציה** ב-http://localhost:3001
4. **לך לניהול קמפיינים**
5. **לחץ על "בדיקה"** ליד קמפיין
6. **הזן מספר טלפון** לבדיקה

## ✅ איך לדעת שזה עובד?

**בקונסול תראה**:
```
📱 SMS Message: {to: "0501234567", message: "שלום..."}
📞 From Number: +972584859770
✅ SMS sent successfully!
```

**במקום**:
```
⚠️ To send real SMS: Get Twilio credentials from https://www.twilio.com
```

## 💰 עלויות

- **קרדיט חינם**: $15 (300 הודעות SMS)
- **SMS בישראל**: ~$0.05 להודעה
- **WhatsApp**: $0.05 להודעה (אופציונלי)

## 🆘 בעיות נפוצות

**בעיה**: "Invalid Account SID"
**פתרון**: בדוק שהעתקת נכון את ה-Account SID

**בעיה**: "Authentication failed"
**פתרון**: בדוק שהעתקת נכון את ה-Auth Token

**בעיה**: "Invalid phone number"
**פתרון**: השתמש בפורמט: +972501234567

## 📞 תמיכה

- **Twilio Support**: https://support.twilio.com
- **תיעוד בעברית**: https://www.twilio.com/docs/sms
- **קהילה**: https://stackoverflow.com/questions/tagged/twilio
