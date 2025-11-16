# בדיקה ידנית של Webhook

## מה לבדוק:

### 1. בדוק את חלון ה-Backend

לאחר לחיצה על כפתור ב-WhatsApp, **בחלון ה-backend** אמור לראות:

```
📨 Webhook received: {...}
📱 Processing 1 incoming message(s)
📱 Incoming message: {...}
🔘 Button clicked: { buttonId: 'decline_attendance', buttonTitle: 'לא אוכל להגיע', phoneNumber: '972...' }
❌ Guest declined attendance via button!
🔄 Updating guest status:
   Original phone: 972524721147
   Formatted phone: 0524721147
   Status: declined
✅ Guest status update stored: {...}
📊 Total pending updates: 1
```

**אם אתה לא רואה את זה:**
- ה-webhook לא מגיע ל-backend
- הבעיה היא ב-ngrok או בהגדרה במטה

### 2. בדוק את ה-Console בדפדפן (F12)

**פתח את המערכת בדפדפן ולחץ F12**, אמור לראות כל 5 שניות:

```
📡 Backend response at [time]: { success: true, updatesCount: 0, totalPending: 0, updates: [] }
```

**לאחר לחיצה על כפתור**, אמור לראות:

```
📡 Backend response at [time]: { success: true, updatesCount: 1, totalPending: 1, updates: [...] }
📨 Found 1 pending updates
🔍 Searching for guest with phone: 0524721147
🔍 Total events: 1
🔍 Checking event: [שם הזוג] (X guests)
✅ Phone match found! Guest: [שם המוזמן] (0524721147)
✅ Found guest: [שם המוזמן] in event [event-id]
✅ Updating guest [שם המוזמן] status to declined
🔄 updateGuestResponse called: {...}
✅ Guest status updated successfully
```

### 3. בדיקות מהירות

**אם אתה לא רואה `📨 Webhook received` ב-backend:**
1. בדוק ש-ngrok רץ: פתח חלון ngrok ובדוק שהוא מציג URL
2. בדוק שה-webhook מוגדר במטה עם ה-URL הנכון
3. בדוק שה-Webhook Fields כולל "messages"

**אם אתה רואה `📨 Webhook received` אבל לא `✅ Guest status update stored`:**
1. בדוק את ה-logs - מה ה-buttonId וה-buttonTitle?
2. שלח את ה-logs מה-backend

**אם אתה רואה `✅ Guest status update stored` אבל לא `📨 Found X pending updates` ב-frontend:**
1. בדוק שה-frontend רץ
2. בדוק את ה-Console בדפדפן - האם אתה רואה שגיאות?
3. בדוק שה-BACKEND_URL נכון: `http://localhost:3002`

**אם אתה רואה `📨 Found X pending updates` אבל לא `✅ Found guest`:**
1. הבעיה היא בהתאמת מספרי הטלפון
2. בדוק את ה-logs - מה המספר שמגיע מה-WhatsApp ומה המספר במערכת?
3. שלח את ה-logs מה-backend ומה-frontend

## מה לשלוח:

אם עדיין לא עובד, שלח:
1. מה אתה רואה בחלון ה-backend (העתק את כל ה-logs)
2. מה אתה רואה ב-Console בדפדפן (F12) - העתק את כל ה-logs
3. מה המספר טלפון ב-WhatsApp ומה המספר במערכת

