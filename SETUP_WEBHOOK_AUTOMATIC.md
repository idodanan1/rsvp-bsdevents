# מדריך להגדרת Webhook לעדכון אוטומטי

## הבעיה

כדי שהעדכון יעבוד אוטומטית כאשר מישהו לוחץ על כפתור ב-WhatsApp, צריך:
1. **Backend רץ** - השרת צריך להיות פעיל
2. **Webhook נגיש מה-אינטרנט** - WhatsApp צריך להיות מסוגל לשלוח webhook לשרת שלך

## פתרון: שימוש ב-ngrok

אם אתה משתמש ב-localhost, צריך להשתמש ב-ngrok כדי לחשוף את ה-backend לאינטרנט.

### שלב 1: התקן ngrok

1. הורד מ-[https://ngrok.com/download](https://ngrok.com/download)
2. פתח טרמינל והרץ:
```bash
ngrok http 3002
```

3. תקבל URL כמו: `https://abc123.ngrok.io`

### שלב 2: הפעל את ה-backend

פתח טרמינל נוסף והרץ:
```bash
cd whatsapp-backend
node server.js
```

### שלב 3: הגדר Webhook במטה

1. היכנס ל-[Meta Developers](https://developers.facebook.com/)
2. בחר את ה-App שלך
3. עבור ל-**WhatsApp** → **Configuration**
4. לחץ על **"Edit"** ליד **Webhook**
5. **Callback URL**: `https://abc123.ngrok.io/api/whatsapp/webhook` (השתמש ב-URL מה-ngrok)
6. **Verify Token**: `whatsapp_webhook_verify_token_2024`
7. לחץ **"Verify and Save"**
8. לחץ על **"Manage"** ליד **Webhook Fields**
9. סמן **"messages"**
10. לחץ **"Save"**

### שלב 4: בדוק שהכל עובד

1. לחץ על הכפתור "לא אוכל להגיע" ב-WhatsApp
2. בדוק את ה-logs ב-backend - אמור לראות:
   - `📨 Webhook received: ...`
   - `🔘 Button clicked: ...`
   - `✅ Guest status update stored: ...`
3. בדוק את ה-console ב-frontend - אמור לראות:
   - `📨 Found 1 pending updates`
   - `✅ Guest status updated successfully`

## פתרון חלופי: שימוש ב-Cloud Service

אם אתה לא רוצה להשתמש ב-ngrok, תוכל לפרוס את ה-backend ל-cloud service כמו:
- Heroku
- Railway
- Render
- Vercel (עם serverless functions)

## הערות חשובות

1. **ngrok חינמי מוגבל** - ה-URL משתנה בכל פעם שאתה מפעיל את ngrok
2. **לפתרון קבוע** - צריך לפרוס את ה-backend ל-cloud service
3. **Webhook חייב להיות HTTPS** - לא HTTP

## בדיקה מהירה

לאחר הגדרת ה-webhook, תוכל לבדוק אם הוא עובד:
1. לחץ על **"Test"** ליד ה-Webhook במטה
2. שלח הודעה לעצמך
3. בדוק אם ה-webhook מגיע ל-backend

## אם עדיין לא עובד

1. ודא שה-backend רץ על פורט 3002
2. ודא שה-ngrok רץ ומצביע לפורט 3002
3. ודא שה-webhook URL במטה תואם ל-ngrok URL
4. בדוק את ה-logs ב-backend כדי לראות אם ה-webhook מגיע

