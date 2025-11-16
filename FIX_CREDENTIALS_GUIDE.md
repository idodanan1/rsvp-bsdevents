# 🔧 מדריך תיקון בעיות אימות והרשאות

## 📋 בעיות נפוצות ופתרונות

### ❌ בעיה 1: WhatsApp Business API - Phone Number ID לא קיים

**שגיאה:**
```
Object with ID '874204535776090' does not exist, cannot be loaded due to missing permissions
```

**פתרון:**

#### שלב 1: בדוק את ה-Phone Number ID
1. לך ל: **Facebook Developer Console** → **WhatsApp** → **API Setup**
2. תחת **"From"**, תראה את מספר הטלפון שלך
3. לחץ על **"Show"** ליד **"Phone number ID"**
4. העתק את המספר (זה לא מספר הטלפון עצמו, אלא ID)
5. ודא שהמספר תואם למה שיש בקוד

#### שלב 2: בדוק את ה-Access Token
1. לך ל: **Business Settings** → **System Users**
2. לחץ על ה-System User שלך
3. לחץ על **"Generate New Token"**
4. ודא שיש לך את ההרשאות הבאות:
   - ✅ `whatsapp_business_messaging`
   - ✅ `whatsapp_business_management`
5. העתק את ה-Token החדש

#### שלב 3: עדכן את הקובץ `.env`
צור קובץ `.env` בתיקיית הפרויקט (אם עדיין לא קיים):

```env
# WhatsApp Business API Configuration
VITE_WHATSAPP_ACCESS_TOKEN=your_new_access_token_here
VITE_WHATSAPP_PHONE_NUMBER_ID=your_phone_number_id_here
```

#### שלב 4: הפעל מחדש את השרת
1. סגור את השרת (Ctrl+C)
2. הפעל מחדש: `npm run dev` או `go.bat`

---

### ❌ בעיה 2: Twilio SMS - 401 Unauthorized

**שגיאה:**
```
401 Unauthorized
```

**פתרון:**

#### שלב 1: קבל את המפתחות הנכונים מ-Twilio
1. לך ל: **Twilio Console** → **Account Info**
2. העתק את:
   - **Account SID** (מתחיל ב-`AC...`)
   - **Auth Token** (לחץ על העין כדי לראות)

#### שלב 2: עדכן את הקובץ `.env`
הוסף או עדכן את השורות הבאות:

```env
# Twilio SMS Configuration
VITE_TWILIO_ACCOUNT_SID=your_account_sid_here
VITE_TWILIO_AUTH_TOKEN=your_auth_token_here
VITE_SMS_FROM_NUMBER=+12347040727
```

**⚠️ חשוב:** 
- Account SID מתחיל תמיד ב-`AC`
- Auth Token הוא מחרוזת ארוכה (32 תווים)
- ודא שאין רווחים או תווים נוספים

#### שלב 3: הפעל מחדש את השרת
1. סגור את השרת (Ctrl+C)
2. הפעל מחדש: `npm run dev` או `go.bat`

---

### ❌ בעיה 3: תמונות מקומיות לא נשלחות

**שגיאה:**
```
❌ Local file path detected: file:///C:/Users/...
⚠️ Cannot send local files via WhatsApp Business API
```

**פתרון:**

#### אפשרות 1: העלה תמונה דרך הדשבורד
1. לך ל: **Dashboard** → **Edit Event**
2. לחץ על **"Upload Image File"**
3. בחר תמונה מהמחשב
4. התמונה תועלה אוטומטית ל-Imgur (HTTPS)
5. השתמש בתמונה הזו לשליחת הודעות

#### אפשרות 2: השתמש ב-URL ציבורי
1. העלה את התמונה לשירות אירוח תמונות (Imgur, Cloudinary, וכו')
2. קבל את ה-URL (חייב להיות HTTPS)
3. השתמש ב-URL הזה בהגדרת האירוע

**⚠️ חשוב:**
- WhatsApp Business API דורש HTTPS URLs
- `http://localhost` לא יעבוד
- קבצים מקומיים (`file://`) לא יעבדו

---

## 🔍 איך לבדוק שהכל תקין?

### בדיקת WhatsApp:
1. פתח את הקונסול בדפדפן (F12)
2. חפש הודעות שמתחילות ב-`🔧 WhatsApp Service initialized:`
3. ודא ש:
   - Phone Number ID מוצג
   - Access Token מוצג כ-"Set"
   - אין שגיאות בהתחלה

### בדיקת SMS:
1. פתח את הקונסול בדפדפן (F12)
2. חפש הודעות שמתחילות ב-`🔧 SMS Service initialized:`
3. ודא ש:
   - Account SID מוצג
   - Auth Token מוצג כ-"Set"
   - אין שגיאות בהתחלה

---

## 📝 דוגמה לקובץ `.env` מלא

```env
# WhatsApp Business API Configuration
VITE_WHATSAPP_API_URL=https://graph.facebook.com/v22.0
VITE_WHATSAPP_ACCESS_TOKEN=EAAQ16mfCx58BPZB6vXpBUsqgwrdainMgFfFZBum0sLbjWSTomXsqU5ZBcFVsXeBWyYLIwIWxSj3xayz4jQ3IXZApM8lgFKY57hPSh270XrCVk7oYs1eSFn8mwpDiAM2vwcQuCmupW994qOrZCMu7PBJx3jPCZAWw1DDfE8JDQ3NATVNEelN3ZBQfSlTjxW5QlIvyQZDZD
VITE_WHATSAPP_PHONE_NUMBER_ID=874204535776090

# Twilio SMS Configuration
VITE_SMS_API_URL=https://api.twilio.com/2010-04-01/Accounts
VITE_TWILIO_ACCOUNT_SID=ACb9bdf15ec4c32919f0605df55b4c32e5
VITE_TWILIO_AUTH_TOKEN=your_actual_auth_token_here
VITE_SMS_FROM_NUMBER=+12347040727
```

**⚠️ הערה:** החלף את הערכים בערכים האמיתיים שלך!

---

## 🆘 עדיין לא עובד?

1. **ודא שהקובץ `.env` נמצא בתיקיית הפרויקט הראשית**
2. **ודא שאין שגיאות כתיב בשמות המשתנים** (חייב להיות `VITE_` בהתחלה)
3. **ודא שהשרת הופעל מחדש** אחרי עדכון `.env`
4. **בדוק את הקונסול** - השגיאות החדשות מספקות הוראות מפורטות יותר

---

## 📚 קישורים שימושיים

- [WhatsApp Business API Documentation](https://developers.facebook.com/docs/whatsapp)
- [Twilio Console](https://console.twilio.com/)
- [Facebook Developer Console](https://developers.facebook.com/)

