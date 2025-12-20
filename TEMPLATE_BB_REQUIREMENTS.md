# 📋 דרישות לשליחת תבנית "aaa"

## ✅ מה נדרש לשליחת תבנית "aaa" בהצלחה:

### 1. **תמונת כותרת (Header Image)** - סטטית! ⚠️
   - התבנית כוללת תמונת כותרת **סטטית** ב-Meta Business Manager
   - **אין לשלוח** פרמטר header image - Meta ישתמש בתמונה הסטטית מהתבנית
   - **מה לבדוק:**
     - האם התבנית "aaa" ב-Meta Business Manager כוללת תמונת כותרת סטטית?
     - הקוד **לא** ישלח header component עבור תבנית זו

### 2. **6 פרמטרים בגוף ההודעה** - חובה! ⚠️
   - `guest_name` - שם המוזמן (firstName)
   - `event_type` - סוג האירוע (חתונה, בר מצווה, וכו')
   - `couple_name` - שם הזוג
   - `event_date` - תאריך האירוע (מפורמט)
   - `event_time` - שעת האירוע
   - `venue` - מיקום האירוע
   
   **סדר חשוב מאוד!** הפרמטרים חייבים להיות בסדר הזה.

### 3. **כפתורים** - סטטיים! ⚠️
   - הכפתורים מוגדרים **סטטית** בתבנית ב-Meta Business Manager
   - **אין לשלוח** פרמטרים של כפתורים - Meta ישתמש בכפתורים הסטטיים מהתבנית
   - הקוד **לא** ישלח button components עבור תבנית זו

### 4. **פרמטרים טכניים:**
   - `templateName: 'aaa'` - שם התבנית
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
📋 Template "aaa" - Sending 6 body parameters
📋 Parameter guest_name: "..."
📋 Parameter event_type: "..."
📋 Parameter couple_name: "..."
// וכו'
```

### בדיקה 3: האם אין header/button components?
```javascript
// בקונסול, חפש:
ℹ️ Template "aaa" - header image is STATIC (not a variable) in Meta Business Manager
ℹ️ Skipping header component (Meta will use the static image from the template)
ℹ️ Template "aaa" - skipping all button parameters (template has static buttons in Meta)
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
**פתרון:** בדוק שהפרמטרים מועברים בסדר: guest_name, event_type, couple_name, event_date, event_time, venue

### שגיאה 2: "(#100) Invalid parameter" או "(#132012) Header image mismatch"
**סיבה:** נשלח header component אבל התבנית "aaa" כוללת תמונת כותרת סטטית
**פתרון:** הקוד לא אמור לשלוח header component עבור תבנית "aaa". בדוק שהלוגים מראים "Skipping header component"

### שגיאה 3: "Template not found"
**סיבה:** התבנית "aaa" לא קיימת או לא מאושרת ב-Meta
**פתרון:** בדוק ב-Meta Business Manager שהתבנית קיימת ומוגדרת כ-"Approved"

### שגיאה 4: "Access Token invalid"
**סיבה:** ה-Access Token לא תקין או פג תוקף
**פתרון:** עדכן את ה-Access Token ב-Meta Business Manager

## 📝 רשימת בדיקה לפני שליחה:

- [ ] כל 6 הפרמטרים קיימים ולא ריקים (guest_name, event_type, couple_name, event_date, event_time, venue)
- [ ] `templateName` מוגדר ל-'aaa'
- [ ] `language` מוגדר ל-'he'
- [ ] Access Token תקין
- [ ] Phone Number ID תקין
- [ ] התבנית "aaa" מאושרת ב-Meta Business Manager
- [ ] התבנית "aaa" כוללת תמונת כותרת סטטית (לא משתנה)
- [ ] התבנית "aaa" כוללת כפתורים סטטיים (לא דינמיים)

## 🚀 איך לבדוק:

1. פתח את הקונסול (F12)
2. נסה לשלוח הודעה
3. בדוק את הלוגים:
   - האם רואים "📋 Template "aaa" - Sending 6 body parameters"?
   - האם רואים "ℹ️ Template "aaa" - header image is STATIC"?
   - האם רואים "ℹ️ Skipping header component"?
   - האם רואים "ℹ️ Template "aaa" - skipping all button parameters"?
   - האם יש שגיאות?

אם כל הלוגים מופיעים ולא רואים שגיאות, ההודעה אמורה להישלח בהצלחה!

