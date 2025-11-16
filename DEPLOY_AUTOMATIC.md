# פריסה אוטומטית - הוראות פשוטות

## מה אני הכינותי לך:

✅ כל הקבצים הנדרשים לפריסה
✅ הגדרות ל-Render, Vercel, Railway
✅ הוראות ברורות

## מה אתה צריך לעשות (5 דקות):

### שלב 1: העלה ל-GitHub

1. פתח את GitHub Desktop או Git Bash
2. Commit את כל השינויים
3. Push ל-GitHub

### שלב 2: פרוס ב-Render (הכי קל)

1. היכנס ל-[Render](https://render.com/)
2. לחץ **"Sign Up"** (חינמי)
3. חבר את ה-GitHub account שלך
4. לחץ **"New"** → **"Blueprint"** (אם יש לך `render.yaml`)
   - או **"Web Service"** ל-Backend ו-**"Static Site"** ל-Frontend

### שלב 3: הגדר Environment Variables

**ב-Backend:**
```
PORT=3002
WEBHOOK_VERIFY_TOKEN=whatsapp_webhook_verify_token_2024
WHATSAPP_ACCESS_TOKEN=your_token_here
WHATSAPP_PHONE_NUMBER_ID=874204535776090
```

**ב-Frontend:**
```
VITE_BACKEND_URL=https://your-backend-url.onrender.com
```

### שלב 4: עדכן Webhook במטה

לאחר שהפריסה מסתיימת, תקבל URL קבוע. עדכן את ה-Webhook במטה:
- Callback URL: `https://your-backend-url.onrender.com/api/whatsapp/webhook`

## ✅ סיימת!

המערכת עכשיו באוויר עם URL קבוע!

