# 🔧 הגדרת whatsapp-backend ב-Render

## ✅ מה זה whatsapp-backend?

זה ה-Backend API שלך - Node.js Express server שמטפל ב:
- ניהול אירועים ואורחים
- שליחת הודעות WhatsApp
- חיבור ל-Supabase
- Webhooks מ-Meta

## 📋 איך לבדוק שהכל מוגדר נכון:

### שלב 1: לך ל-Render Dashboard

1. פתח https://dashboard.render.com
2. חפש את השירות **`whatsapp-backend`**
3. לחץ עליו

### שלב 2: בדוק את ההגדרות

לך ל-**Settings** ובדוק:

#### Build Command:
```
npm install
```
(או השאר ריק - לא צריך build)

#### Start Command:
```
npm start
```
(או `node server.js`)

#### Root Directory:
```
whatsapp-backend
```

### שלב 3: בדוק את ה-Environment Variables

לך ל-**Environment** ובדוק שיש:

#### חובה (חייבים להיות):
```
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=xxxxx
```

#### אופציונלי (אם יש לך):
```
WHATSAPP_ACCESS_TOKEN=xxxxx
WHATSAPP_PHONE_NUMBER_ID=xxxxx
WHATSAPP_BUSINESS_ACCOUNT_ID=xxxxx
WHATSAPP_APP_ID=xxxxx
WHATSAPP_APP_SECRET=xxxxx
WHATSAPP_VERIFY_TOKEN=xxxxx
WHATSAPP_WEBHOOK_URL=xxxxx
```

### שלב 4: בדוק את ה-Logs

1. לך ל-**Logs** tab
2. בדוק אם יש שגיאות
3. אמור לראות:
   ```
   ✅ Supabase client initialized successfully
   Server running on port 3002
   ```

## 🔧 אם יש בעיות:

### בעיה: "Application exited early"
**פתרון:** בדוק שה-Environment Variables מוגדרים נכון

### בעיה: "Cannot find module"
**פתרון:** ודא ש-Root Directory הוא `whatsapp-backend`

### בעיה: "Port already in use"
**פתרון:** Render מטפל בזה אוטומטית - זה בסדר

## ✅ מה צריך להיות:

**Build Command:** `npm install` (או ריק)
**Start Command:** `npm start`
**Root Directory:** `whatsapp-backend`
**Environment Variables:** כל המשתנים שצריך

## 🎯 למה זה חשוב:

ה-Backend הוא זה שמחבר את ה-Frontend ל:
- Supabase (המאגר)
- WhatsApp API
- כל הנתונים

אם ה-Backend לא עובד, ה-Frontend לא יכול לטעון נתונים!
