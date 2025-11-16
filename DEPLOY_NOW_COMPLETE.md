# 🚀 העלאת המערכת לאינטרנט - מדריך מלא

## המטרה
לעלות את המערכת לאינטרנט כדי שתוכל לגשת אליה מכל מקום ומכל מכשיר.

---

## שלב 1: ודא שהקוד ב-GitHub

### בדוק שהקוד ב-GitHub:
1. פתח דפדפן
2. היכנס ל: **https://github.com/idodanan1/-rsvp-management-system**
3. ודא שאתה רואה את כל הקבצים

### אם הקוד לא ב-GitHub:
1. פתח PowerShell או Command Prompt
2. הרץ:
   ```bash
   cd "C:\Users\MY PC\OneDrive\Desktop\GIThub פרוייקטים\--------------------"
   git add .
   git commit -m "Update: Added Grow payment and Morning invoice integration"
   git push origin main
   ```

---

## שלב 2: היכנס ל-Render

1. פתח דפדפן
2. היכנס ל: **https://dashboard.render.com/**
3. לחץ **"Sign Up"** (אם עדיין לא נרשמת)
4. בחר **"Sign up with GitHub"**
5. הרשא ל-Render לגשת ל-repositories שלך

---

## שלב 3: פרוס את המערכת

### אפשרות 1: Blueprint (מומלץ - הכי קל)

1. לחץ **"New"** → **"Blueprint"**
2. בחר את ה-repository: **idodanan1/-rsvp-management-system**
3. Render יזהה את `render.yaml` אוטומטית
4. לחץ **"Apply"**

### אפשרות 2: ידנית

אם Blueprint לא עובד, צור 2 שירותים:

#### Backend:
1. לחץ **"New"** → **"Web Service"**
2. בחר את ה-repository: **idodanan1/-rsvp-management-system**
3. הגדר:
   - **Name**: `whatsapp-backend`
   - **Root Directory**: `whatsapp-backend`
   - **Build Command**: `npm install`
   - **Start Command**: `node server.js`
   - **Environment**: `Node`

#### Frontend:
1. לחץ **"New"** → **"Static Site"**
2. בחר את ה-repository: **idodanan1/-rsvp-management-system**
3. הגדר:
   - **Name**: `rsvp-frontend`
   - **Build Command**: `npm install && npm run build`
   - **Publish Directory**: `dist`

---

## שלב 4: המתן לבנייה

- Render יתחיל לבנות ולהריץ את המערכת
- זה יקח **5-10 דקות**
- תראה הודעות התקדמות במסך

---

## שלב 5: הוסף Environment Variables

### ב-Render Dashboard:

1. לחץ על **"whatsapp-backend"**
2. לחץ **"Environment"**
3. לחץ **"Add Environment Variable"** והוסף:

#### חובה (WhatsApp):
- **Key**: `WHATSAPP_ACCESS_TOKEN`
- **Value**: [הדבק את ה-token שלך]

- **Key**: `WHATSAPP_PHONE_NUMBER_ID`
- **Value**: `874204535776090`

#### אופציונלי (Grow):
- **Key**: `GROW_API_KEY`
- **Value**: [הדבק את ה-API key של Grow]

- **Key**: `GROW_API_SECRET`
- **Value**: [הדבק את ה-API secret של Grow]

- **Key**: `GROW_MERCHANT_ID`
- **Value**: [הדבק את ה-Merchant ID של Grow]

- **Key**: `GROW_WEBSITE_URL`
- **Value**: `https://rsvp-frontend.onrender.com` (או ה-URL של ה-frontend)

#### אופציונלי (Morning Invoice):
- **Key**: `MORNING_API_KEY`
- **Value**: [הדבק את ה-API key של Morning]

- **Key**: `MORNING_API_SECRET`
- **Value**: [הדבק את ה-API secret של Morning]

- **Key**: `MORNING_BUSINESS_ID`
- **Value**: [הדבק את ה-Business ID של Morning]

4. Render יאתחל את השרת אוטומטית אחרי כל שינוי

---

## שלב 6: עדכן את ה-Frontend URL

1. ב-Render Dashboard, לחץ על **"rsvp-frontend"**
2. לחץ **"Environment"**
3. הוסף או עדכן:
   - **Key**: `VITE_BACKEND_URL`
   - **Value**: `https://whatsapp-backend.onrender.com` (ה-URL של ה-backend)

---

## שלב 7: עדכן Webhook במטה

1. היכנס ל-**Meta Developers**: https://developers.facebook.com/
2. עבור ל-**WhatsApp** → **Configuration** → **Webhooks**
3. עדכן את ה-**Callback URL** ל:
   ```
   https://whatsapp-backend.onrender.com/api/whatsapp/webhook
   ```
4. שמור את ה-**Verify Token**: `whatsapp_webhook_verify_token_2024`
5. לחץ **"Verify and Save"**

---

## שלב 8: עדכן Webhook ב-Grow (אם מוגדר)

1. היכנס ל-**Grow Dashboard**
2. עבור ל-**Settings** → **Webhooks**
3. הוסף webhook URL:
   ```
   https://whatsapp-backend.onrender.com/api/payments/grow/webhook
   ```
4. בחר Events:
   - ✅ Payment Success
   - ✅ Payment Failed

---

## ✅ סיימת!

עכשיו תוכל לגשת למערכת מכל מקום דרך:
**https://rsvp-frontend.onrender.com**

---

## 📋 מה קיבלת:

- **Frontend URL**: `https://rsvp-frontend.onrender.com`
- **Backend URL**: `https://whatsapp-backend.onrender.com`
- **Webhook URL**: `https://whatsapp-backend.onrender.com/api/whatsapp/webhook`

---

## 💡 טיפים חשובים:

1. **השרת חינמי אבל עם מגבלות:**
   - אם אין שימוש, השרת "נרדם" אחרי 15 דקות
   - בפעם הראשונה שיגשו אליו, זה יקח 30-60 שניות להתעורר
   - זה תקין!

2. **עדכונים:**
   - כל פעם שתדחוף קוד ל-GitHub, Render יעדכן אוטומטית
   - זה יקח 5-10 דקות

3. **לוגים:**
   - ב-Render Dashboard → **"whatsapp-backend"** → **"Logs"**
   - תראה את כל הלוגים של השרת

4. **Environment Variables:**
   - כל שינוי ב-Environment Variables יאתחל את השרת מחדש
   - זה תקין!

---

## 🆘 בעיות נפוצות:

### השרת לא עולה:
- בדוק את ה-Logs ב-Render
- ודא שה-Environment Variables נכונים
- ודא שה-GitHub repository נכון

### Frontend לא מתחבר ל-Backend:
- ודא ש-`VITE_BACKEND_URL` נכון ב-Frontend Environment
- ודא שה-Backend רץ (בדוק ב-Logs)

### Webhook לא עובד:
- ודא שה-URL נכון במטה
- ודא שה-Verify Token נכון
- בדוק את ה-Logs של ה-Backend

---

## 📞 תמיכה:

אם יש בעיה, בדוק:
1. ה-Logs ב-Render Dashboard
2. ה-Environment Variables
3. ה-GitHub repository

