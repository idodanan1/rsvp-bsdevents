# 🚀 איך לעלות את המערכת לאינטרנט

## המטרה
לעלות את המערכת לאינטרנט כדי שתוכל לגשת אליה מכל מקום ומכל מכשיר.

---

## שלבים פשוטים (5 דקות)

### שלב 1: היכנס ל-Render
1. פתח דפדפן
2. היכנס ל: **https://dashboard.render.com/**
3. לחץ **"Sign Up"** (אם עדיין לא נרשמת)
4. בחר **"Sign up with GitHub"**
5. הרשא ל-Render לגשת ל-repositories שלך

### שלב 2: פרוס את המערכת
1. לחץ **"New"** → **"Blueprint"**
2. בחר את ה-repository: **idodanan1/-rsvp-management-system**
3. לחץ **"Apply"**

### שלב 3: המתן
- Render יתחיל לבנות ולהריץ את המערכת
- זה יקח **5-10 דקות**
- תראה הודעות התקדמות במסך

### שלב 4: קבל את ה-URL
- אחרי שהפריסה מסתיימת, תקבל 2 כתובות:
  - **Frontend**: `https://rsvp-frontend.onrender.com` (זה הממשק שלך!)
  - **Backend**: `https://whatsapp-backend.onrender.com` (זה השרת)

### שלב 5: הוסף את ה-Tokens (חשוב!)
1. ב-Render Dashboard, לחץ על **"whatsapp-backend"**
2. לחץ **"Environment"**
3. לחץ **"Add Environment Variable"**
4. הוסף:
   - **Key**: `WHATSAPP_ACCESS_TOKEN`
   - **Value**: [הדבק את ה-token שלך]
5. לחץ **"Add Environment Variable"** שוב
6. הוסף:
   - **Key**: `WHATSAPP_PHONE_NUMBER_ID`
   - **Value**: `874204535776090`
7. Render יאתחל את השרת אוטומטית

### שלב 6: עדכן Webhook במטה
1. היכנס ל-Meta Developers
2. עבור ל-WhatsApp → Configuration → Webhooks
3. עדכן את ה-Callback URL ל:
   ```
   https://whatsapp-backend.onrender.com/api/whatsapp/webhook
   ```
4. שמור

---

## ✅ סיימת!
עכשיו תוכל לגשת למערכת מכל מקום דרך:
**https://rsvp-frontend.onrender.com**

---

## 💡 טיפים
- ה-URL יהיה זמין 24/7
- אם השרת לא פעיל, Render יאתחל אותו אוטומטית
- זה חינמי אבל עם מגבלות (אם יש הרבה שימוש, ייתכן שיהיה איטי)

