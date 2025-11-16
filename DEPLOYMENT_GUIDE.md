# מדריך פריסה לאוויר (Production Deployment)

## סקירה כללית

המערכת כוללת שני חלקים:
1. **Frontend** (React + Vite) - פורט 5173
2. **Backend** (Node.js) - פורט 3002

שניהם צריכים להיות נגישים מה-אינטרנט.

## אפשרויות פריסה

### אפשרות 1: Vercel (מומלץ ל-Frontend) + Railway/Render (ל-Backend)

**יתרונות:**
- ✅ חינמי עם מגבלות סבירות
- ✅ קל מאוד לפריסה
- ✅ תמיכה ב-React ו-Node.js
- ✅ HTTPS אוטומטי

### אפשרות 2: Netlify (ל-Frontend) + Heroku (ל-Backend)

**יתרונות:**
- ✅ חינמי עם מגבלות
- ✅ קל לפריסה
- ✅ תמיכה טובה

### אפשרות 3: Render (מומלץ - הכל במקום אחד)

**יתרונות:**
- ✅ חינמי
- ✅ יכול להריץ גם Frontend וגם Backend
- ✅ HTTPS אוטומטי
- ✅ Webhook URL קבוע

## פריסה ב-Render (מומלץ)

### שלב 1: הכנה

1. הירשם ב-[Render](https://render.com/) (חינמי)
2. חבר את ה-GitHub repository שלך

### שלב 2: פריסת Backend

1. ב-Render, לחץ **"New"** → **"Web Service"**
2. בחר את ה-repository שלך
3. הגדרות:
   - **Name**: `whatsapp-backend`
   - **Environment**: `Node`
   - **Build Command**: `cd whatsapp-backend && npm install`
   - **Start Command**: `cd whatsapp-backend && node server.js`
   - **Port**: `3002`
4. הוסף Environment Variables:
   - `PORT=3002`
   - `WEBHOOK_VERIFY_TOKEN=whatsapp_webhook_verify_token_2024`
   - `WHATSAPP_ACCESS_TOKEN=your_token`
   - `WHATSAPP_PHONE_NUMBER_ID=874204535776090`
5. לחץ **"Create Web Service"**
6. תקבל URL כמו: `https://whatsapp-backend.onrender.com`

### שלב 3: פריסת Frontend

1. ב-Render, לחץ **"New"** → **"Static Site"**
2. בחר את ה-repository שלך
3. הגדרות:
   - **Name**: `rsvp-frontend`
   - **Build Command**: `npm run build`
   - **Publish Directory**: `dist`
4. הוסף Environment Variables:
   - `VITE_BACKEND_URL=https://whatsapp-backend.onrender.com`
5. לחץ **"Create Static Site"**
6. תקבל URL כמו: `https://rsvp-frontend.onrender.com`

### שלב 4: הגדרת Webhook במטה

1. היכנס ל-[Meta Developers](https://developers.facebook.com/)
2. בחר את ה-App → **WhatsApp** → **Configuration**
3. עדכן את ה-**Webhook**:
   - **Callback URL**: `https://whatsapp-backend.onrender.com/api/whatsapp/webhook`
   - **Verify Token**: `whatsapp_webhook_verify_token_2024`
   - **Webhook Fields**: סמן **"messages"**

## פריסה ב-Vercel (Frontend) + Railway (Backend)

### Frontend ב-Vercel:

1. הירשם ב-[Vercel](https://vercel.com/) (חינמי)
2. חבר את ה-GitHub repository
3. לחץ **"Import Project"**
4. הגדרות:
   - **Framework Preset**: `Vite`
   - **Root Directory**: `.` (root)
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
5. הוסף Environment Variable:
   - `VITE_BACKEND_URL=https://your-backend-url.railway.app`
6. לחץ **"Deploy"**

### Backend ב-Railway:

1. הירשם ב-[Railway](https://railway.app/) (חינמי עם $5 credit)
2. לחץ **"New Project"** → **"Deploy from GitHub repo"**
3. בחר את ה-repository
4. הגדרות:
   - **Root Directory**: `whatsapp-backend`
   - **Start Command**: `node server.js`
5. הוסף Environment Variables:
   - `PORT=3002`
   - `WEBHOOK_VERIFY_TOKEN=whatsapp_webhook_verify_token_2024`
   - `WHATSAPP_ACCESS_TOKEN=your_token`
   - `WHATSAPP_PHONE_NUMBER_ID=874204535776090`
6. לחץ **"Deploy"**
7. תקבל URL כמו: `https://your-app.railway.app`

## Environment Variables שצריך להגדיר

### Backend:
- `PORT=3002`
- `WEBHOOK_VERIFY_TOKEN=whatsapp_webhook_verify_token_2024`
- `WHATSAPP_ACCESS_TOKEN=your_access_token`
- `WHATSAPP_PHONE_NUMBER_ID=874204535776090`

### Frontend:
- `VITE_BACKEND_URL=https://your-backend-url.com`

## הערות חשובות

1. **Webhook URL קבוע**: לאחר הפריסה, תקבל URL קבוע (לא משתנה כמו ngrok)
2. **HTTPS אוטומטי**: כל השירותים מספקים HTTPS אוטומטי
3. **Environment Variables**: חשוב להגדיר אותם נכון
4. **Database**: ב-production, כדאי להשתמש ב-database אמיתי במקום localStorage

## בדיקה לאחר פריסה

1. פתח את ה-URL של ה-Frontend
2. בדוק שהכל עובד
3. שלח הודעה ובדוק שהיא מגיעה
4. לחץ על כפתור ובדוק שהסטטוס מתעדכן

## תמיכה

אם יש בעיות בפריסה, בדוק:
1. ה-logs ב-Render/Vercel/Railway
2. ה-Environment Variables מוגדרים נכון
3. ה-Webhook URL במטה תואם ל-Backend URL

