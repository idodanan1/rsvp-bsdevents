# מדריך פשוט להגדרת Webhook לעדכון אוטומטי

## פתרון מהיר ללא הרשמה

### אפשרות 1: שימוש ב-localtunnel (מומלץ)

**יתרונות:**
- ✅ חינמי לחלוטין
- ✅ אין צורך בהרשמה
- ✅ פשוט מאוד לשימוש

**שלבים:**

1. **הפעל את ה-backend עם tunnel:**
   ```bash
   cd whatsapp-backend
   node server.js
   ```
   
   פתח טרמינל נוסף והרץ:
   ```bash
   npx localtunnel --port 3002
   ```

2. **תקבל URL כמו:**
   ```
   https://random-name.loca.lt
   ```

3. **הגדר Webhook במטה:**
   - היכנס ל-[Meta Developers](https://developers.facebook.com/)
   - בחר את ה-App → **WhatsApp** → **Configuration**
   - לחץ **"Edit"** ליד **Webhook**
   - **Callback URL**: `https://random-name.loca.lt/api/whatsapp/webhook`
   - **Verify Token**: `whatsapp_webhook_verify_token_2024`
   - לחץ **"Verify and Save"**
   - לחץ **"Manage"** ליד **Webhook Fields**
   - סמן **"messages"**
   - לחץ **"Save"**

4. **הערה חשובה:**
   - ה-URL משתנה בכל פעם שאתה מפעיל את localtunnel
   - תצטרך לעדכן את ה-Webhook URL במטה בכל פעם

### אפשרות 2: שימוש ב-ngrok (דורש הרשמה)

אם אתה רוצה URL קבוע יותר:

1. הירשם ב-[ngrok.com](https://dashboard.ngrok.com/signup) (חינמי)
2. קבל את ה-authtoken שלך
3. התקן את ה-authtoken:
   ```bash
   ngrok config add-authtoken YOUR_AUTHTOKEN
   ```
4. הפעל:
   ```bash
   ngrok http 3002
   ```
5. השתמש ב-URL ב-Webhook במטה

### אפשרות 3: שימוש ב-Cloudflare Tunnel (מומלץ לפתרון קבוע)

1. הורד מ-[Cloudflare Zero Trust](https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/install-and-setup/installation/)
2. התחבר:
   ```bash
   cloudflared tunnel login
   ```
3. צור tunnel:
   ```bash
   cloudflared tunnel create whatsapp-webhook
   ```
4. הפעל tunnel:
   ```bash
   cloudflared tunnel run whatsapp-webhook
   ```

## בדיקה מהירה

לאחר הגדרת ה-webhook:

1. לחץ על "לא אוכל להגיע" ב-WhatsApp
2. בדוק את ה-logs ב-backend - אמור לראות:
   ```
   📨 Webhook received: ...
   🔘 Button clicked: ...
   ✅ Guest status update stored: ...
   ```
3. בדוק את הטבלה במערכת - הסטטוס אמור להתעדכן אוטומטית תוך כמה שניות

## פתרון קבוע (מומלץ לפרודקשן)

לפתרון קבוע, מומלץ לפרוס את ה-backend ל-cloud service:
- **Heroku** (חינמי עם מגבלות)
- **Railway** (חינמי עם $5 credit)
- **Render** (חינמי)
- **Vercel** (עם serverless functions)

## אם עדיין לא עובד

1. ודא שה-backend רץ על פורט 3002
2. ודא שה-tunnel רץ ומצביע לפורט 3002
3. ודא שה-webhook URL במטה תואם ל-tunnel URL
4. בדוק את ה-logs ב-backend כדי לראות אם ה-webhook מגיע

