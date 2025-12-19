# 📋 דרישות לשליחת תבנית "bb"

## ✅ מה נדרש לשליחת תבנית "bb" בהצלחה:

### 1. **תמונת כותרת (Header Image)** - חובה! ⚠️
   - התבנית דורשת תמונת כותרת
   - אם אין תמונה, הקוד יוסיף placeholder אוטומטית
   - **מה לבדוק:**
     - האם יש `invitationImageUrl` באירוע?
     - האם התמונה היא HTTPS URL תקין?
     - אם אין תמונה, הקוד יוסיף placeholder

### 2. **6 פרמטרים בגוף ההודעה** - חובה! ⚠️
   - `guest_name` - שם המוזמן (firstName)
   - `groom_name` - שם החתן
   - `bride_name` - שם הכלה
   - `event_date` - תאריך האירוע (מפורמט)
   - `event_time` - שעת האירוע
   - `venue` - מיקום האירוע
   
   **סדר חשוב מאוד!** הפרמטרים חייבים להיות בסדר הזה.

### 3. **כפתור URL דינמי** - חובה! ⚠️
   - `guest_response_link` - הקישור המלא למוזמן
   - הכפתור מוגדר בתבנית ב-Meta, אבל צריך לשלוח את הפרמטר
   - **פורמט:** `https://your-domain.com/#/guest-response/{eventId}?guest={guestId}`

### 4. **פרמטרים טכניים:**
   - `templateName: 'bb'` - שם התבנית
   - `language: 'he'` - שפה עברית
   - `paramsOrder` - מערך עם סדר הפרמטרים

### 5. **API Credentials:**
   - `VITE_WHATSAPP_ACCESS_TOKEN` - Access Token מ-Meta
   - `VITE_WHATSAPP_PHONE_NUMBER_ID` - Phone Number ID מ-Meta

## 🔍 בדיקות לזיהוי בעיות:

### בדיקה 1: האם התמונה קיימת?
```javascript
// בקונסול, חפש:
🖼️ Image URL priority check
🖼️ ✅ Adding header image to template
```

### בדיקה 2: האם הפרמטרים מועברים?
```javascript
// בקונסול, חפש:
📋 Template "bb" - Sending 6 body parameters
📋 Parameter guest_name: "..."
📋 Parameter groom_name: "..."
// וכו'
```

### בדיקה 3: האם הכפתור מועבר?
```javascript
// בקונסול, חפש:
🔘 CRITICAL: Template has predefined URL button - adding parameter from templateParams
🔘 URL parameter: https://...
```

### בדיקה 4: האם ה-API credentials תקינים?
```javascript
// בקונסול, חפש:
📤 Access Token: EAAQ... (אם רואים את זה, זה תקין)
📤 Phone Number ID: 874204535776090
```

## ❌ שגיאות נפוצות:

### שגיאה 1: "Parameter format does not match"
**סיבה:** הפרמטרים לא בסדר הנכון או חסר פרמטר
**פתרון:** בדוק שהפרמטרים מועברים בסדר: guest_name, groom_name, bride_name, event_date, event_time, venue

### שגיאה 2: "Header image required"
**סיבה:** התבנית דורשת תמונת כותרת אבל לא נשלחה
**פתרון:** הוסף תמונת אירוע או הקוד יוסיף placeholder אוטומטית

### שגיאה 3: "Template not found"
**סיבה:** התבנית "bb" לא קיימת או לא מאושרת ב-Meta
**פתרון:** בדוק ב-Meta Business Manager שהתבנית קיימת ומוגדרת כ-"Approved"

### שגיאה 4: "Access Token invalid"
**סיבה:** ה-Access Token לא תקין או פג תוקף
**פתרון:** עדכן את ה-Access Token ב-Meta Business Manager

## 📝 רשימת בדיקה לפני שליחה:

- [ ] יש תמונת אירוע (`invitationImageUrl`) או הקוד יוסיף placeholder
- [ ] כל 6 הפרמטרים קיימים ולא ריקים
- [ ] `guest_response_link` מועבר נכון
- [ ] `templateName` מוגדר ל-'bb'
- [ ] `language` מוגדר ל-'he'
- [ ] Access Token תקין
- [ ] Phone Number ID תקין
- [ ] התבנית "bb" מאושרת ב-Meta Business Manager

## 🚀 איך לבדוק:

1. פתח את הקונסול (F12)
2. נסה לשלוח הודעה
3. בדוק את הלוגים:
   - האם רואים "📋 Template "bb" - Sending 6 body parameters"?
   - האם רואים "🖼️ ✅ Adding header image"?
   - האם רואים "🔘 Added URL button parameter"?
   - האם יש שגיאות?

אם כל הלוגים מופיעים ולא רואים שגיאות, ההודעה אמורה להישלח בהצלחה!

