# 🔧 תיקונים ב-render.yaml

## מה תיקנתי:

### 1. שינוי `env: node` ל-`runtime: node`
- Render דורש `runtime` במקום `env` עבור web services

### 2. הסרת `fromService` מ-static site
- `fromService` לא נתמך ב-static sites ב-Render
- ה-`VITE_BACKEND_URL` צריך להיות מוגדר ידנית אחרי הפריסה

### 3. ניקוי Comments
- הסרתי comments מיותרים שיכולים לגרום לשגיאות

---

## מה לעשות אחרי הפריסה:

### הגדרת Environment Variables ידנית:

אחרי שהמערכת נפרסה, תצטרך להוסיף את ה-Environment Variables ב-Render Dashboard:

#### Backend (`whatsapp-backend`):
1. היכנס ל-Render Dashboard
2. לחץ על `whatsapp-backend`
3. לחץ על "Environment"
4. הוסף:
   - `WHATSAPP_ACCESS_TOKEN` = (הטוקן שלך)
   - `WHATSAPP_PHONE_NUMBER_ID` = `874204535776090`
   - `GROW_API_KEY` = (המפתח שלך)
   - `GROW_API_SECRET` = (הסוד שלך)
   - `GROW_MERCHANT_ID` = (ה-ID שלך)
   - `GROW_WEBSITE_URL` = (ה-URL של האתר)
   - `MORNING_API_KEY` = (המפתח שלך)
   - `MORNING_API_SECRET` = (הסוד שלך)
   - `MORNING_BUSINESS_ID` = (ה-ID שלך)

#### Frontend (`rsvp-frontend`):
1. היכנס ל-Render Dashboard
2. לחץ על `rsvp-frontend`
3. לחץ על "Environment"
4. הוסף:
   - `VITE_BACKEND_URL` = `https://whatsapp-backend.onrender.com`
     (החלף ב-URL האמיתי של ה-backend אחרי הפריסה)

---

## הקובץ המתוקן:

```yaml
services:
  - type: web
    name: whatsapp-backend
    runtime: node
    plan: free
    buildCommand: cd whatsapp-backend && npm install
    startCommand: cd whatsapp-backend && node server.js
    envVars:
      - key: PORT
        value: "3002"
      - key: NODE_ENV
        value: production
      - key: WEBHOOK_VERIFY_TOKEN
        value: whatsapp_webhook_verify_token_2024

  - type: static
    name: rsvp-frontend
    buildCommand: npm install && npm run build
    staticPublishPath: ./dist
```

---

## עכשיו נסה שוב:

1. חזור ל-Render Dashboard
2. רענן את הדף (F5)
3. הזן שוב את ה-repository: `idodanan1/-rsvp-management-system`
4. המתן 10-30 שניות
5. לחץ "Apply" או "Create Blueprint"

