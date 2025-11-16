# פתרון בעיה: לחיצה על כפתור לא מעדכנת

## הבעיה

לחיצה על כפתור ב-WhatsApp לא מעדכנת את הטבלה.

## מה לבדוק:

### 1. האם הכפתורים מוגדרים בטמפלט במטה?

**חשוב מאוד:** הכפתורים צריכים להיות מוגדרים בטמפלט 'aa' במטה, לא בקוד!

1. היכנס ל-[Meta Business Manager](https://business.facebook.com/)
2. עבור ל-**WhatsApp** → **Message Templates**
3. מצא את הטמפלט **'aa'**
4. לחץ **"Edit"**
5. גלול למטה לסעיף **"Buttons"**
6. ודא שיש שני כפתורים:
   - **"אישור הגעה"** (Button ID: `confirm_attendance`)
   - **"לא אוכל להגיע"** (Button ID: `decline_attendance`)

**אם אין כפתורים:**
- הוסף אותם לפי המדריך ב-`WHATSAPP_BUTTONS_GUIDE.md`
- שלח לאישור מחדש
- המתן לאישור (יכול לקחת כמה שעות)

### 2. האם ה-webhook מוגדר נכון במטה?

1. היכנס ל-[Meta Developers](https://developers.facebook.com/)
2. בחר את ה-App → **WhatsApp** → **Configuration**
3. בדוק את ה-**Webhook**:
   - **Callback URL**: `https://appraisive-brittanie-unenjoyably.ngrok-free.dev/api/whatsapp/webhook`
   - **Verify Token**: `whatsapp_webhook_verify_token_2024`
   - **Webhook Fields**: סמן **"messages"**

### 3. בדוק את חלון ה-Backend

לאחר לחיצה על כפתור, **בחלון ה-backend** אמור לראות:

```
📨 Webhook received at [time]
📨 Webhook body: {...}
✅ Valid WhatsApp Business Account webhook
📋 Processing entry: ...
📋 Change field: messages
📱 Processing 1 incoming message(s)
🔘 Button clicked: { buttonId: 'decline_attendance', ... }
✅ Guest status update stored: {...}
```

**אם אתה לא רואה את זה:**
- ה-webhook לא מגיע ל-backend
- בדוק ש-ngrok רץ
- בדוק שה-webhook URL במטה נכון

### 4. בדוק את ה-Console בדפדפן

ב-**Console (F12)**, לאחר לחיצה על כפתור, אמור לראות:

```
📡 Backend response: { success: true, updatesCount: 1, ... }
📨 Found 1 pending updates
🔍 Searching for guest with phone: ...
✅ Found guest: ...
✅ Guest status updated successfully
```

## פתרון מהיר

אם הכפתורים לא מוגדרים בטמפלט במטה:

1. הוסף אותם לפי המדריך
2. שלח לאישור
3. המתן לאישור (יכול לקחת כמה שעות)

בינתיים, תוכל לעדכן ידנית:
1. פתח את הטבלה במערכת
2. מצא את המוזמן
3. שנה את הסטטוס ב-dropdown

## בדיקה מהירה

לחץ על כפתור ב-WhatsApp ובדוק:

1. **בחלון ה-backend** - האם אתה רואה `📨 Webhook received`?
2. **ב-Console בדפדפן** - האם אתה רואה `📨 Found X pending updates`?
3. **בטבלה** - האם הסטטוס השתנה?

אם אחד מהם לא עובד, שלח את ה-logs.

