# 💳 הגדרת Tranzila לתשלומים

## שלב 1: הירשם ל-Tranzila

1. היכנס ל: **https://www.tranzila.com/**
2. לחץ **"הרשמה"** או **"צור חשבון"**
3. מלא פרטים:
   - שם חברה
   - מספר עוסק מורשה
   - פרטי קשר
   - פרטי בנק

## שלב 2: קבל API Credentials

לאחר ההרשמה והאישור, תקבל:
- **Terminal Number** (מספר טרמינל)
- **Username** (שם משתמש)
- **Password/API Key** (סיסמה/מפתח API)

## שלב 3: הוסף את המפתחות ל-.env

פתח את הקובץ: **`whatsapp-backend/.env`**

הוסף:
```env
TRANZILA_TERMINAL=your_terminal_number
TRANZILA_USERNAME=your_username
TRANZILA_PASSWORD=your_password_or_api_key
```

## שלב 4: רענן את השרת

1. עצור את השרת (Ctrl+C)
2. הרץ שוב: **`START_BACKEND.bat`**

## שלב 5: בדיקה

1. היכנס לדף **"רכוש רשומות"**
2. בחר חבילה
3. לחץ **"רכוש"**
4. תועבר לדף תשלום של Tranzila
5. השלם תשלום בדיקה

## 📋 פרטי קשר Tranzila

- **טלפון:** 073-222-4444
- **פקס:** 073-222-4440
- **כתובת:** רחוב יד חרוצים 19, פולג, נתניה
- **אתר:** https://www.tranzila.com/

## 🔗 תיעוד API

- **API Documentation:** https://secure5.tranzila.com/api/
- **Developer Portal:** https://www.tranzila.com/developers (אם קיים)

## ⚠️ הערות חשובות

1. **אישור:** Tranzila דורש אישור עסק/בנק לפני שימוש ב-production
2. **Test Mode:** בדוק אם יש מצב בדיקה לפני production
3. **Webhook:** ודא שה-webhook URL נכון ב-Tranzila dashboard
4. **עמלות:** בדוק את העמלות לפני תחילת השימוש

## 🆘 בעיות נפוצות

### "Tranzila לא מוגדר"
- ודא שהוספת את כל המפתחות ל-`.env`
- ודא שהשרת רץ מחדש אחרי הוספת המפתחות

### "Payment URL לא עובד"
- ודא שה-Terminal Number נכון
- בדוק את התיעוד של Tranzila API

### "Webhook לא מתקבל"
- ודא שה-webhook URL נכון ב-Tranzila dashboard
- ודא שה-backend חשוף ב-HTTPS (ב-production)

