# מדריך מהיר לפריסה לאוויר

## אפשרות מהירה: Render (מומלץ)

### שלב 1: הכנה

1. הירשם ב-[Render](https://render.com/) (חינמי)
2. חבר את ה-GitHub repository שלך

### שלב 2: פריסת Backend

1. לחץ **"New"** → **"Web Service"**
2. בחר את ה-repository
3. הגדרות:
   - **Name**: `whatsapp-backend`
   - **Environment**: `Node`
   - **Root Directory**: `whatsapp-backend`
   - **Build Command**: `npm install`
   - **Start Command**: `node server.js`
4. הוסף Environment Variables:
   ```
   PORT=3002
   WEBHOOK_VERIFY_TOKEN=whatsapp_webhook_verify_token_2024
   WHATSAPP_ACCESS_TOKEN=your_token_here
   WHATSAPP_PHONE_NUMBER_ID=874204535776090
   ```
5. לחץ **"Create Web Service"**
6. העתק את ה-URL (כמו `https://whatsapp-backend.onrender.com`)

### שלב 3: פריסת Frontend

1. לחץ **"New"** → **"Static Site"**
2. בחר את ה-repository
3. הגדרות:
   - **Name**: `rsvp-frontend`
   - **Build Command**: `npm run build`
   - **Publish Directory**: `dist`
4. הוסף Environment Variable:
   ```
   VITE_BACKEND_URL=https://whatsapp-backend.onrender.com
   ```
   (השתמש ב-URL שקיבלת בשלב 2)
5. לחץ **"Create Static Site"**

### שלב 4: הגדרת Webhook במטה

1. היכנס ל-[Meta Developers](https://developers.facebook.com/)
2. בחר את ה-App → **WhatsApp** → **Configuration**
3. עדכן את ה-**Webhook**:
   - **Callback URL**: `https://whatsapp-backend.onrender.com/api/whatsapp/webhook`
   - **Verify Token**: `whatsapp_webhook_verify_token_2024`
   - **Webhook Fields**: סמן **"messages"**

## ✅ סיימת!

עכשיו המערכת באוויר:
- Frontend: `https://rsvp-frontend.onrender.com`
- Backend: `https://whatsapp-backend.onrender.com`
- Webhook: `https://whatsapp-backend.onrender.com/api/whatsapp/webhook`

## הערות

- ה-URLs קבועים (לא משתנים כמו ngrok)
- HTTPS אוטומטי
- אין צורך ב-ngrok יותר!

