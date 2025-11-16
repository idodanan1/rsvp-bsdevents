# בדיקת Webhook Verification

## הבעיה
Meta לא יכול לאמת את ה-webhook. בואו נבדוק מה הבעיה.

## שלבים לבדיקה

### 1. ודא שה-backend רץ

פתח טרמינל והרץ:
```bash
cd whatsapp-backend
node server.js
```

אמור לראות:
```
🚀 WhatsApp Backend running on port 3002
🔐 Webhook Verify Token: Set
```

### 2. ודא ש-ngrok רץ

פתח טרמינל נוסף והרץ:
```bash
ngrok http 3002
```

תקבל URL כמו:
```
Forwarding   https://abc123.ngrok-free.app -> http://localhost:3002
```

### 3. בדוק שה-webhook endpoint נגיש

פתח דפדפן או השתמש ב-curl:
```bash
curl "https://abc123.ngrok-free.app/api/whatsapp/webhook?hub.mode=subscribe&hub.verify_token=whatsapp_webhook_verify_token_2024&hub.challenge=test123"
```

אמור לקבל תשובה: `test123`

אם אתה מקבל `Forbidden`, הבעיה היא ב-token.

### 4. הגדר Webhook במטה

1. היכנס ל-[Meta Developers](https://developers.facebook.com/)
2. בחר את ה-App → **WhatsApp** → **Configuration**
3. לחץ **"Edit"** ליד **Webhook**
4. **Callback URL**: `https://abc123.ngrok-free.app/api/whatsapp/webhook` (השתמש ב-URL מה-ngrok)
5. **Verify Token**: `whatsapp_webhook_verify_token_2024` (חשוב: בדיוק כמו שזה!)
6. לחץ **"Verify and Save"**

### 5. בדוק את ה-logs

ב-backend, אמור לראות:
```
🔐 Webhook verification request received:
   Mode: subscribe
   Received Token: whatsapp_webhook_verify_token_2024
   Expected Token: whatsapp_webhook_verify_token_2024
   Challenge: [מספר]
✅ Webhook verified successfully!
```

אם אתה רואה:
```
❌ Webhook verification failed!
   Mode match: false
   Token match: false
```

הבעיה היא:
- **Mode match: false** → Meta לא שולח `mode=subscribe`
- **Token match: false** → ה-token לא תואם

## פתרון בעיות נפוצות

### בעיה: "Token match: false"

**פתרון:**
1. ודא שה-Verify Token במטה הוא בדיוק: `whatsapp_webhook_verify_token_2024`
2. אין רווחים לפני או אחרי
3. אותיות קטנות/גדולות חשובות

### בעיה: "Mode match: false"

**פתרון:**
1. ודא שה-webhook URL נכון: `https://abc123.ngrok-free.app/api/whatsapp/webhook`
2. ודא שה-ngrok רץ ומצביע לפורט 3002
3. ודא שה-backend רץ על פורט 3002

### בעיה: "Connection refused" או "Cannot reach server"

**פתרון:**
1. ודא שה-backend רץ: `node server.js`
2. ודא ש-ngrok רץ: `ngrok http 3002`
3. ודא שה-ngrok URL נכון במטה

## בדיקה ידנית

לפני הגדרת ה-webhook במטה, תוכל לבדוק ידנית:

```bash
# בדוק שה-endpoint עובד
curl "https://YOUR_NGROK_URL.ngrok-free.app/api/whatsapp/webhook?hub.mode=subscribe&hub.verify_token=whatsapp_webhook_verify_token_2024&hub.challenge=test123"
```

אמור לקבל: `test123`

אם אתה מקבל `Forbidden`, הבעיה היא ב-token או ב-mode.

