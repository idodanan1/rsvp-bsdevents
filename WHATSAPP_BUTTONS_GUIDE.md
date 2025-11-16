# מדריך להוספת כפתורים לטמפלט WhatsApp במטה

## סקירה כללית

המערכת תומכת בכפתורים בהודעות WhatsApp. כאשר מוזמן לוחץ על כפתור, המערכת מעדכנת אוטומטית את סטטוס ההגעה שלו.

## שני סוגי כפתורים

1. **"אישור הגעה"** - מעדכן את הסטטוס ל-"confirmed" (אישר הגעה)
2. **"לא אוכל להגיע"** - מעדכן את הסטטוס ל-"declined" (דחה הזמנה)

## איך להוסיף כפתורים לטמפלט במטה

### שלב 1: פתח את Meta Business Manager

1. היכנס ל-[Meta Business Manager](https://business.facebook.com/)
2. בחר את ה-Business Account שלך
3. עבור ל-**WhatsApp** → **Message Templates**

### שלב 2: ערוך את הטמפלט 'aa'

1. מצא את הטמפלט **'aa'** ברשימה
2. לחץ על **"Edit"** (עריכה)

### שלב 3: הוסף כפתורים

1. גלול למטה עד שתגיע לסעיף **"Buttons"** (כפתורים)
2. לחץ על **"Add Button"** (הוסף כפתור)

#### כפתור 1: "אישור הגעה"

1. בחר סוג כפתור: **"Quick Reply"** (תשובה מהירה)
2. **Button Text** (טקסט הכפתור): `אישור הגעה`
3. **Button ID** (מזהה הכפתור): `confirm_attendance`
4. לחץ **"Save"** (שמור)

#### כפתור 2: "לא אוכל להגיע"

1. לחץ על **"Add Button"** שוב
2. בחר סוג כפתור: **"Quick Reply"** (תשובה מהירה)
3. **Button Text** (טקסט הכפתור): `לא אוכל להגיע`
4. **Button ID** (מזהה הכפתור): `decline_attendance`
5. לחץ **"Save"** (שמור)

### שלב 4: שמור את הטמפלט

1. לחץ על **"Submit"** (שלח לאישור)
2. המתן לאישור המטה (יכול לקחת כמה שעות)

## איך זה עובד

1. **שליחת הודעה**: כאשר אתה שולח קמפיין, ההודעה נשלחת עם הכפתורים
2. **לחיצה על כפתור**: כאשר מוזמן לוחץ על כפתור, WhatsApp שולח webhook למערכת
3. **עדכון אוטומטי**: המערכת מזהה את הלחיצה ומעדכנת את סטטוס המוזמן אוטומטית
4. **תצוגה במערכת**: הסטטוס מתעדכן בטבלת המוזמנים במערכת

## הגדרת Webhook (אם עדיין לא הוגדר)

### שלב 1: פתח את Meta Developers

1. היכנס ל-[Meta Developers](https://developers.facebook.com/)
2. בחר את ה-App שלך
3. עבור ל-**WhatsApp** → **Configuration**

### שלב 2: הגדר Webhook

1. לחץ על **"Edit"** ליד **"Webhook"**
2. **Callback URL**: `https://your-domain.com/api/whatsapp/webhook`
   - אם אתה משתמש ב-localhost, השתמש ב-[ngrok](https://ngrok.com/) או שירות דומה
   - לדוגמה: `https://abc123.ngrok.io/api/whatsapp/webhook`
3. **Verify Token**: `whatsapp_webhook_verify_token_2024` (או מה שמוגדר ב-`.env`)
4. לחץ **"Verify and Save"**

### שלב 3: הוסף Webhook Fields

1. לחץ על **"Manage"** ליד **"Webhook Fields"**
2. סמן את **"messages"** (הודעות)
3. לחץ **"Save"**

## בדיקת הכפתורים

### בדיקה ידנית

1. שלח הודעה לעצמך דרך המערכת
2. לחץ על אחד מהכפתורים בהודעה
3. בדוק במערכת שהסטטוס התעדכן

### בדיקה דרך Console

פתח את ה-Console בדפדפן ותחפש הודעות כמו:
- `🔘 Button clicked: { buttonId: 'confirm_attendance', ... }`
- `✅ Updating guest status...`
- `✅ Guest status updated successfully`

## פתרון בעיות

### הכפתורים לא מופיעים בהודעה

- ודא שהטמפלט אושר במטה (Status = "Approved")
- ודא שהוספת את הכפתורים לפני שליחת ההודעה
- בדוק שהטמפלט נשלח כ-template message (לא regular message)

### הלחיצה לא מעדכנת את הסטטוס

- ודא שה-webhook מוגדר נכון במטה
- בדוק שה-backend רץ על הפורט הנכון (3002)
- בדוק את ה-logs ב-backend לראות אם ה-webhook מגיע
- ודא שהמספר טלפון של המוזמן תואם במערכת

### שגיאת "Guest not found"

- ודא שהמספר טלפון של המוזמן במערכת תואם למספר שממנו נשלחה הלחיצה
- בדוק שהפורמט של המספר נכון (עם או בלי קידומת 972)

## הערות חשובות

1. **Quick Reply Buttons**: הכפתורים מסוג "Quick Reply" מוגבלים ל-3 כפתורים לכל הודעה
2. **אישור מטה**: לאחר הוספת כפתורים, הטמפלט צריך לקבל אישור מחדש במטה
3. **Webhook URL**: ה-webhook URL חייב להיות HTTPS (לא HTTP)
4. **Polling**: המערכת בודקת עדכונים כל 5 שניות (ניתן לשנות ב-`webhookService.startPolling()`)

## תמיכה

אם יש בעיות, בדוק את:
- ה-logs ב-backend (`whatsapp-backend/server.js`)
- ה-logs ב-frontend (Console בדפדפן)
- ה-Webhook Logs במטה (Meta Business Manager → WhatsApp → Webhook)

