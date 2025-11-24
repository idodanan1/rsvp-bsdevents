# 🔧 תיקון שגיאות WhatsApp ו-SMS

## הבעיות:

### 1. שגיאת WhatsApp (400):
**שגיאה:** `(#132012) Parameter format does not match format in the created template`
**פרטים:** `header: Format mismatch, expected IMAGE, received UNKNOWN`

**הסיבה:** הטמפלט "aa" ב-Meta מוגדר עם header image, אבל הקוד לא שולח header כשאין תמונה.

**מה תיקנתי:**
- הוספתי טיפול בשגיאה 132012
- אם הטמפלט מצפה ל-header image אבל אין תמונה, הקוד ינסה לשלוח בלי header
- אם זה לא עובד, יש הודעה ברורה למשתמש

---

### 2. שגיאת SMS (401):
**שגיאה:** `Authenticate` (401 Unauthorized)

**הסיבה:** ה-Twilio credentials לא נכונים או חסרים.

**מה צריך לעשות:**

#### שלב 1: בדוק את ה-Credentials ב-Twilio

1. **פתח:** https://console.twilio.com/
2. **לחץ על "Account Info"** (בפינה הימנית העליונה)
3. **העתק:**
   - **Account SID**
   - **Auth Token** (לחץ על העין כדי לראות)

#### שלב 2: עדכן את ה-Environment Variables ב-Render

**ב-Render Dashboard → `rsvp-frontend` → Environment:**

1. **מצא או הוסף:**
   - `VITE_TWILIO_ACCOUNT_SID` = [העתק מה-Twilio]
   - `VITE_TWILIO_AUTH_TOKEN` = [העתק מה-Twilio]

2. **לחץ על "Save Changes"**

#### שלב 3: Manual Deploy

1. **לחץ על "Manual Deploy"**
2. **בחר "Deploy latest commit"**
3. **המתן 5-10 דקות**

---

## פתרון לבעיית WhatsApp Header Image:

### אפשרות 1: הוסף תמונה לאירוע

1. **ביצירת/עריכת אירוע**
2. **הוסף תמונת הזמנה**
3. **התמונה תישלח אוטומטית עם ההודעה**

### אפשרות 2: עדכן את הטמפלט ב-Meta

1. **פתח:** https://business.facebook.com/
2. **לך ל:** WhatsApp > Message Templates
3. **מצא את הטמפלט "aa"**
4. **ערוך אותו:**
   - הסר את ה-header image component
   - או שנה אותו ל-TEXT במקום IMAGE

---

## מה תיקנתי בקוד:

✅ הוספתי טיפול בשגיאה 132012 (template expects header image)
✅ הקוד ינסה לשלוח בלי header אם הטמפלט לא מחייב אותו
✅ הודעות שגיאה ברורות יותר

---

**תאריך:** $(Get-Date)

