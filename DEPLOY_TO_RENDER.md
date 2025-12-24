# 🚀 פריסה ל-Render - הוראות מהירות

## ✅ מה כבר עשיתי:

1. ✅ העליתי את כל הקוד ל-GitHub
2. ✅ Repository: https://github.com/idodanan1/rsvp-management-system
3. ✅ הכינותי את `render.yaml` לפריסה אוטומטית

## 🎯 מה אתה צריך לעשות (2 דקות):

### שלב 1: היכנס ל-Render

1. פתח: https://dashboard.render.com/
2. לחץ **"Sign Up"** (אם עדיין לא נרשמת)
3. בחר **"Sign up with GitHub"**
4. הרשא ל-Render לגשת ל-repositories שלך

### שלב 2: פרוס את המערכת

1. לחץ **"New"** (כפתור כחול בפינה הימנית העליונה)
2. בחר **"Blueprint"**
3. Render יבקש לבחור repository:
   - בחר: **idodanan1/rsvp-management-system**
4. Render יזהה את `render.yaml` ויפרס הכל אוטומטית!

### שלב 3: הוסף Environment Variables

לאחר שהפריסה מתחילה (תראה 2 services: Backend ו-Frontend):

**ב-Backend Service:**
1. לחץ על **"whatsapp-backend"**
2. לחץ על **"Environment"** בתפריט
3. לחץ **"Add Environment Variable"**
4. הוסף:
   - **Key**: `WHATSAPP_ACCESS_TOKEN`
   - **Value**: ה-token שלך מ-Meta
5. לחץ **"Add"** שוב והוסף:
   - **Key**: `WHATSAPP_PHONE_NUMBER_ID`
   - **Value**: `874204535776090`

### שלב 4: חכה שהפריסה תסתיים

- Backend: יקח 2-3 דקות
- Frontend: יקח 1-2 דקות

תראה הודעות "Live" כשהוא מוכן.

### שלב 5: עדכן Webhook במטה

לאחר שהפריסה מסתיימת:

1. ב-Render, לחץ על **"whatsapp-backend"**
2. העתק את ה-URL (כמו `https://whatsapp-backend.onrender.com`)
3. היכנס ל-[Meta Developers](https://developers.facebook.com/)
4. בחר את ה-App → **WhatsApp** → **Configuration**
5. עדכן את ה-**Webhook**:
   - **Callback URL**: `https://whatsapp-backend.onrender.com/api/whatsapp/webhook`
   - **Verify Token**: `whatsapp_webhook_verify_token_2024`
6. לחץ **"Verify and Save"**

## ✅ סיימת!

עכשיו המערכת באוויר:
- Frontend: `https://rsvp-frontend.onrender.com`
- Backend: `https://whatsapp-backend.onrender.com`
- Webhook: `https://whatsapp-backend.onrender.com/api/whatsapp/webhook`

## 🎉 מה קיבלת:

- ✅ URL קבוע (לא משתנה כמו ngrok)
- ✅ HTTPS אוטומטי
- ✅ המערכת עובדת 24/7
- ✅ Webhook יעבוד אוטומטית!

