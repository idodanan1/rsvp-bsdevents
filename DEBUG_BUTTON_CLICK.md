# פתרון בעיה: לחיצה על כפתור לא מעדכנת את הטבלה

## מה לבדוק:

### 1. בדוק שה-webhook מגיע ל-backend

**בחלון ה-backend**, לאחר לחיצה על כפתור, אמור לראות:
```
📨 Webhook received: {...}
📱 Processing 1 incoming message(s)
🔘 Button clicked: { buttonId: 'decline_attendance', ... }
❌ Guest declined attendance via button!
✅ Guest status update stored: {...}
```

**אם אתה לא רואה את זה:**
- ה-webhook לא מגיע ל-backend
- בדוק ש-ngrok רץ: `ngrok http 3002`
- בדוק שה-webhook מוגדר במטה עם ה-URL הנכון

### 2. בדוק את ה-logs ב-frontend

**ב-Console בדפדפן (F12)**, אמור לראות כל 5 שניות:
```
📡 Backend response at [time]: { success: true, updatesCount: 0, ... }
```

**אם אתה רואה עדכונים:**
```
📨 Found 1 pending updates
🔍 Searching for guest with phone: ...
✅ Found guest: [שם]
✅ Guest status updated successfully
```

### 3. בדוק התאמת מספרי טלפון

הבעיה הנפוצה ביותר היא שהמספר טלפון ב-WhatsApp לא תואם למספר במערכת.

**בדוק:**
- מספר ב-WhatsApp: `972524721147` (עם 972)
- מספר במערכת: `0524721147` (עם 0)

הקוד מטפל בזה, אבל אם יש הבדלים נוספים (רווחים, מקפים), זה יכול לגרום לבעיה.

### 4. פתרון מהיר - עדכון ידני

אם ה-webhook לא עובד, תוכל לעדכן ידנית:
1. פתח את הטבלה במערכת
2. מצא את המוזמן
3. שנה את הסטטוס ב-dropdown

## בדיקה מהירה:

לאחר לחיצה על כפתור:

1. **בדוק את חלון ה-backend** - האם אתה רואה `📨 Webhook received`?
2. **בדוק את ה-Console בדפדפן** - האם אתה רואה `📨 Found X pending updates`?
3. **בדוק את הטבלה** - האם הסטטוס השתנה?

אם אחד מהם לא עובד, שלח את ה-logs כדי שנוכל לזהות את הבעיה.

