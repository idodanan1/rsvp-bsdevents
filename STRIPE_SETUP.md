# 💳 הגדרת Stripe לתשלומים

## שלב 1: יצירת חשבון Stripe

1. היכנס ל-[Stripe Dashboard](https://dashboard.stripe.com/)
2. צור חשבון חדש (או התחבר)
3. עבור ל-**Developers** → **API keys**

## שלב 2: קבלת API Keys

### Publishable Key (לשימוש ב-Frontend):
1. העתק את ה-**Publishable key** (מתחיל ב-`pk_test_` או `pk_live_`)
2. הוסף ל-`.env`:
   ```
   VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...
   ```

### Secret Key (לשימוש ב-Backend):
1. לחץ על **"Reveal test key"** או **"Reveal live key"**
2. העתק את ה-**Secret key** (מתחיל ב-`sk_test_` או `sk_live_`)
3. הוסף ל-`whatsapp-backend/.env`:
   ```
   STRIPE_SECRET_KEY=sk_test_...
   ```

## שלב 3: הגדרת Webhook

### ב-Stripe Dashboard:
1. עבור ל-**Developers** → **Webhooks**
2. לחץ **"Add endpoint"**
3. הוסף URL:
   ```
   https://your-backend-url.onrender.com/api/payments/webhook
   ```
   (החלף `your-backend-url` עם ה-URL האמיתי של ה-backend שלך)
4. בחר Events:
   - ✅ `payment_intent.succeeded`
   - ✅ `payment_intent.payment_failed`
5. לחץ **"Add endpoint"**
6. העתק את ה-**Signing secret** (מתחיל ב-`whsec_`)
7. הוסף ל-`whatsapp-backend/.env`:
   ```
   STRIPE_WEBHOOK_SECRET=whsec_...
   ```

## שלב 4: עדכון Environment Variables

### Frontend (.env):
```env
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...
VITE_BACKEND_URL=http://localhost:3002
```

### Backend (whatsapp-backend/.env):
```env
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

## שלב 5: בדיקה

1. הפעל את ה-backend
2. הפעל את ה-frontend
3. נסה לרכוש חבילת רשומות
4. השתמש בכרטיס בדיקה של Stripe:
   - מספר: `4242 4242 4242 4242`
   - תאריך: כל תאריך עתידי
   - CVC: כל 3 ספרות
   - ZIP: כל 5 ספרות

## הערות חשובות:

- **Test Mode**: ב-Stripe Dashboard, ודא שאתה ב-**Test mode** (לא Live mode) לפיתוח
- **Webhook URL**: צריך להיות HTTPS (לא HTTP) ב-production
- **ngrok**: לפיתוח מקומי, השתמש ב-ngrok לחשיפת ה-backend:
  ```bash
  ngrok http 3002
  ```
  ואז השתמש ב-ngrok URL ל-webhook

## בעיות נפוצות:

### "Stripe לא מוגדר"
- ודא שהוספת `STRIPE_SECRET_KEY` ל-backend `.env`
- ודא שה-backend רץ מחדש אחרי הוספת ה-key

### "Webhook Error"
- ודא שה-URL נכון
- ודא שה-`STRIPE_WEBHOOK_SECRET` נכון
- ודא שה-backend חשוף ב-HTTPS (ב-production)

### "Payment Element לא מופיע"
- ודא שהוספת `VITE_STRIPE_PUBLISHABLE_KEY` ל-frontend `.env`
- ודא שה-frontend רץ מחדש אחרי הוספת ה-key

