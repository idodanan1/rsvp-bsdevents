# מדריך לבדיקת Webhook וכפתורים

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
📱 Ready to send WhatsApp messages!
🔗 Webhook endpoint: http://localhost:3002/api/whatsapp/webhook
```

### 2. בדוק שה-webhook מוגדר במטה

1. היכנס ל-[Meta Developers](https://developers.facebook.com/)
2. בחר את ה-App שלך
3. עבור ל-**WhatsApp** → **Configuration**
4. בדוק שה-**Webhook** מוגדר:
   - **Callback URL**: `https://your-domain.com/api/whatsapp/webhook` (או ngrok URL)
   - **Verify Token**: `whatsapp_webhook_verify_token_2024`
   - **Webhook Fields**: סמן `messages`

### 3. בדוק שהכפתורים נוספו לטמפלט

1. היכנס ל-[Meta Business Manager](https://business.facebook.com/)
2. עבור ל-**WhatsApp** → **Message Templates**
3. מצא את הטמפלט **'aa'**
4. לחץ **"Edit"**
5. בדוק שיש שני כפתורים:
   - **"אישור הגעה"** (Button ID: `confirm_attendance`)
   - **"לא אוכל להגיע"** (Button ID: `decline_attendance`)

### 4. בדוק את ה-logs

לאחר לחיצה על כפתור:

**ב-backend (טרמינל):**
```
📨 Webhook received: {...}
🔘 Button clicked: { buttonId: 'decline_attendance', ... }
❌ Guest declined attendance via button!
🔄 Updating guest status for phone: 0524721147 to: declined
✅ Guest status update stored: {...}
📊 Total pending updates: 1
```

**ב-frontend (Console - F12):**
```
📡 Backend response: { success: true, updates: [...] }
📨 Found 1 pending updates
🔍 Searching for guest with phone: 0524721147
✅ Found guest: דורון שושני in event obubhev8amg6v9syr
✅ Updating guest דורון שושני status to declined
🔄 updateGuestResponse called: {...}
✅ Guest status updated successfully
```

### 5. אם הסטטוס לא מתעדכן

**בדוק את ה-logs:**

1. האם ה-webhook מגיע ל-backend?
   - אם לא → ה-webhook לא מוגדר נכון במטה

2. האם ה-backend שומר את העדכון?
   - בדוק את ה-log: `✅ Guest status update stored`
   - אם לא → יש בעיה בעיבוד הלחיצה

3. האם ה-frontend קורא את העדכונים?
   - בדוק את ה-log: `📨 Found X pending updates`
   - אם לא → ה-backend לא רץ או יש בעיה בחיבור

4. האם יש התאמה בין מספרי הטלפון?
   - בדוק את ה-log: `🔍 Comparing phones: ...`
   - אם לא מוצא → יש בעיה בהתאמת המספרים

### 6. פתרון בעיות נפוצות

**בעיה: "ERR_CONNECTION_REFUSED"**
- **פתרון**: הפעל את ה-backend (`node whatsapp-backend/server.js`)

**בעיה: "Guest not found for phone number"**
- **פתרון**: בדוק שהמספר טלפון במערכת תואם למספר שממנו נשלחה הלחיצה
- בדוק את ה-log: `⚠️ Available guests:` כדי לראות את המספרים במערכת

**בעיה: "Webhook not received"**
- **פתרון**: ודא שה-webhook מוגדר במטה עם ה-URL הנכון
- אם אתה משתמש ב-localhost, השתמש ב-[ngrok](https://ngrok.com/) או שירות דומה

**בעיה: "Button clicked but no update stored"**
- **פתרון**: בדוק שה-buttonId או buttonTitle תואמים לקוד:
  - `confirm_attendance` או `אישור הגעה`
  - `decline_attendance` או `לא אוכל להגיע`

### 7. בדיקה ידנית

אם ה-webhook לא עובד, תוכל לעדכן את הסטטוס ידנית:
1. פתח את הטבלה במערכת
2. מצא את המוזמן
3. שנה את הסטטוס ב-dropdown מ-"לא ענה" ל-"לא מגיע"

### 8. בדיקת Webhook במטה

1. היכנס ל-[Meta Developers](https://developers.facebook.com/)
2. בחר את ה-App שלך
3. עבור ל-**WhatsApp** → **Configuration**
4. לחץ על **"Test"** ליד ה-Webhook
5. שלח הודעה לעצמך ובדוק אם ה-webhook מגיע

## תמיכה

אם עדיין יש בעיות, שלח:
1. ה-logs מה-backend (טרמינל)
2. ה-logs מה-frontend (Console - F12)
3. צילום מסך מה-Webhook Configuration במטה
4. צילום מסך מה-Template עם הכפתורים במטה

