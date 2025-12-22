# תבנית "1" - תיעוד השינויים

## 📋 סיכום התבנית

**שם התבנית ב-Meta:** `1`  
**שפה:** `he` (Hebrew)  
**מספר פרמטרים:** 8  
**כפתור:** כן - URL button עם קישור ייחודי לכל אורח

---

## 📝 מבנה התבנית

### Header
- **סוג:** Image
- **פרמטר:** תמונת האירוע (נשלחת דינמית)
- **הערה:** אין `parameter_name` - תמונות הן positional

### Body - 8 פרמטרים (positional, ללא `parameter_name`):
1. `{{1}}` - שם האורח
2. `{{2}}` - סוג האירוע (חתונה, בר מצווה, וכו')
3. `{{3}}` - שם החתן
4. `{{4}}` - שם הכלה
5. `{{5}}` - תאריך האירוע
6. `{{6}}` - שעת האירוע
7. `{{7}}` - מקום האירוע
8. `{{8}}` - **שם הזוג** (לחתימה) - **לא הקישור!**

### Button
- **סוג:** URL button (index 0)
- **פרמטר:** קישור ייחודי של כל אורח לאישור ההגעה
- **הערה:** הקישור נשלח בכפתור, לא ב-{{8}}

---

## 🔧 מיקום הקוד

### קובץ ראשי: `src/services/whatsappService.ts`

**שורות 116-220:** לוגיקה ספציפית לתבנית "1"

```typescript
} else if (templateName === 'simple_invitation' || templateName === '1') {
  // Template "1" implementation
  // 8 body parameters + header image + URL button
}
```

### נקודות חשובות:

1. **שורה 129-135:** איתור `guest_response_link` לכפתור
2. **שורה 144-151:** בניית 8 פרמטרי body ({{1}} עד {{8}})
3. **שורה 201-220:** הוספת כפתור URL (תמיד - התבנית דורשת אותו)

---

## ⚠️ כללים חשובים - אל לשנות!

### 1. {{8}} הוא שם הזוג, לא הקישור
- **{{8}} = `coupleName`** (אליאור עובד & ליטל גולן)
- **הקישור = `guest_response_link`** (נשלח בכפתור)

### 2. הכפתור תמיד נדרש
- התבנית ב-Meta כוללת כפתור URL
- הקוד **תמיד** מוסיף כפתור, גם אם אין קישור (משתמש ב-placeholder)

### 3. אין `parameter_name` בפרמטרים
- כל 8 הפרמטרים הם **positional** ({{1}}, {{2}}, וכו')
- **אין** `parameter_name` בפרמטרי body
- **אין** `parameter_name` בפרמטרי header image
- **אין** `parameter_name` בפרמטרי button

### 4. סדר הפרמטרים חייב להיות מדויק
```
1. guest_name
2. event_type
3. groom_name
4. bride_name
5. event_date
6. event_time
7. venue
8. couple_name (NOT guest_response_link!)
```

---

## 🔄 איך לחזור לגרסה זו

### אם צריך לחזור לגרסה זו:

```bash
# אפשרות 1: לחזור ל-tag
git checkout template-1-stable

# אפשרות 2: לחזור ל-branch
git checkout template-1-working-version

# אפשרות 3: לחזור ל-commit ספציפי
git checkout e8ae132
```

### אם צריך לראות מה השתנה:

```bash
# השוואה עם main
git diff main template-1-working-version

# היסטוריית שינויים
git log template-1-working-version --oneline
```

---

## 📊 מבנה ה-Payload הסופי

```json
{
  "messaging_product": "whatsapp",
  "recipient_type": "individual",
  "to": "972XXXXXXXXX",
  "type": "template",
  "template": {
    "name": "1",
    "language": {
      "code": "he"
    },
    "components": [
      {
        "type": "header",
        "parameters": [
          {
            "type": "image",
            "image": {
              "link": "https://..."
            }
          }
        ]
      },
      {
        "type": "body",
        "parameters": [
          { "type": "text", "text": "שם האורח" },        // {{1}}
          { "type": "text", "text": "חתונה" },           // {{2}}
          { "type": "text", "text": "שם החתן" },         // {{3}}
          { "type": "text", "text": "שם הכלה" },         // {{4}}
          { "type": "text", "text": "תאריך" },           // {{5}}
          { "type": "text", "text": "שעה" },             // {{6}}
          { "type": "text", "text": "מקום" },            // {{7}}
          { "type": "text", "text": "שם הזוג" }          // {{8}} - NOT link!
        ]
      },
      {
        "type": "button",
        "sub_type": "url",
        "index": "0",
        "parameters": [
          {
            "type": "text",
            "text": "https://...guest-response-link..."   // Link for button
          }
        ]
      }
    ]
  }
}
```

---

## 🛡️ הגנה מפני שינויים

### אם צריך לשנות משהו בתבנית "1":

1. **בדוק את הקובץ הזה** - `TEMPLATE_1_IMPLEMENTATION.md`
2. **ודא שאתה מבין** את המבנה הנוכחי
3. **אל תשנה:**
   - את סדר הפרמטרים
   - את {{8}} (זה שם הזוג, לא הקישור!)
   - את הלוגיקה של הכפתור (תמיד נדרש)

### אם צריך להוסיף תכונה חדשה:

1. **צור branch חדש** מהגרסה הנוכחית
2. **תעד את השינויים** בקובץ זה
3. **בדוק היטב** לפני merge

---

## 📅 תאריך יצירה

**תאריך:** 22 בדצמבר 2025  
**Commit:** `e8ae132`  
**Tag:** `template-1-stable`  
**Branch:** `template-1-working-version`

---

## ✅ סטטוס

- ✅ תבנית אושרה ב-Meta
- ✅ הקוד תומך בתבנית
- ✅ 8 פרמטרים נשלחים נכון
- ✅ כפתור URL נשלח נכון
- ✅ תמונת header נשלחת נכון

**הכל עובד! 🎉**

