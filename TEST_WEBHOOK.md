# בדיקת Webhook - מדריך מהיר

## ✅ מה כבר עשינו:

1. ✅ Backend רץ על פורט 3002
2. ✅ ngrok רץ ומחשיף את ה-backend
3. ✅ Webhook URL הוגדר במטה: `https://appraisive-brittanie-unenjoyably.ngrok-free.dev/api/whatsapp/webhook`
4. ✅ Verify Token הוגדר: `whatsapp_webhook_verify_token_2024`

## 🔍 מה לבדוק עכשיו:

### 1. בדוק שה-webhook אומת בהצלחה

**בחלון ה-backend**, אמור לראות:
```
🔐 Webhook verification request received:
   Mode: subscribe
   Received Token: whatsapp_webhook_verify_token_2024
   Expected Token: whatsapp_webhook_verify_token_2024
✅ Webhook verified successfully!
```

אם אתה רואה שגיאה, שלח את ה-logs.

### 2. ודא ש-Webhook Fields מוגדרים

במטה, ב-**WhatsApp** → **Configuration** → **Webhook Fields**:
- סמן **"messages"** (חשוב!)
- לחץ **"Save"**

### 3. בדוק שהעדכון האוטומטי עובד

1. **שלח הודעה עם כפתורים** לעצמך (או למספר אחר):
   - פתח את המערכת
   - שלח קמפיין או הודעה בודדת עם כפתורים
   - לחץ על "לא אוכל להגיע" ב-WhatsApp

2. **בדוק את ה-logs ב-backend**:
   ```
   📨 Webhook received: ...
   🔘 Button clicked: { buttonId: 'decline_attendance', ... }
   ❌ Guest declined attendance via button!
   ✅ Guest status update stored: ...
   ```

3. **בדוק את הטבלה במערכת**:
   - פתח את הטבלה של המוזמנים
   - הסטטוס של המוזמן אמור להתעדכן מ-"לא ענה" ל-"לא מגיע" **אוטומטית**

### 4. בדוק את ה-logs ב-frontend

ב-**Console בדפדפן (F12)**, אמור לראות:
```
📡 Backend response: { success: true, updates: [...] }
📨 Found 1 pending updates
✅ Found guest: [שם המוזמן]
✅ Guest status updated successfully
```

## 🐛 אם משהו לא עובד:

### בעיה: "Webhook verification failed"
- בדוק שה-Verify Token במטה תואם בדיוק: `whatsapp_webhook_verify_token_2024`
- בדוק שה-backend רץ
- בדוק שה-ngrok רץ

### בעיה: "No webhook received"
- בדוק ש-ngrok רץ
- בדוק שה-URL במטה תואם ל-ngrok URL
- בדוק ש-Webhook Fields כולל "messages"

### בעיה: "Button clicked but no update"
- בדוק את ה-logs ב-backend - האם ה-webhook מגיע?
- בדוק את ה-logs ב-frontend - האם העדכונים נקראים?
- בדוק שהמספר טלפון תואם בין WhatsApp למספר במערכת

## 📋 סיכום:

אם הכל עובד:
- ✅ Webhook אומת במטה
- ✅ "messages" מסומן ב-Webhook Fields
- ✅ לחיצה על כפתור ב-WhatsApp מעדכנת את הטבלה אוטומטית

אם משהו לא עובד, שלח את ה-logs מה-backend ומה-frontend.

