# 🔍 שלב 2 - פריסת המערכת ב-Render (הסבר מפורט)

## אחרי שהתחברת ל-Render, אתה צריך לפרוס את המערכת

---

## 📋 מה לעשות בדיוק:

### 1. מצא את הכפתור "New"
- **איפה:** בפינה הימנית העליונה של המסך
- **איך זה נראה:** כפתור כחול עם המילה "New" או "New +" או "+" או "Create"
- **מה לעשות:** לחץ עליו

### 2. בחר "Blueprint"
- **אחרי שלוחצים על "New":** יפתח תפריט עם אפשרויות
- **חפש:** את המילה "Blueprint" או "Blueprint from Repo" או "New Blueprint"
- **מה לעשות:** לחץ על זה

### 3. בחר את ה-Repository
- **אחרי שלוחצים על "Blueprint":** תראה מסך שבו צריך לבחור repository
- **אם אתה רואה רשימה של repositories:**
  - חפש: `idodanan1/-rsvp-management-system`
  - לחץ עליו
- **אם אתה לא רואה את ה-repository:**
  - לחץ על "Connect GitHub" או "Refresh" או "Select Repository"
  - הרשא ל-Render לגשת ל-repositories שלך
  - נסה שוב

### 4. לחץ "Apply" או "Deploy"
- **אחרי שבחרת את ה-repository:** תראה כפתור "Apply" או "Deploy"
- **מה לעשות:** לחץ עליו
- **Render יתחיל להריץ את המערכת**

---

## 🖼️ איך זה אמור להיראות:

```
┌─────────────────────────────────────┐
│  Render Dashboard                   │
│                                     │
│  [Dashboard] [Services] [New +]   │ ← לחץ כאן
│                                     │
└─────────────────────────────────────┘

אחרי שלוחצים על "New +":

┌─────────────────────────────────────┐
│  Create New                         │
│                                     │
│  ☐ Web Service                     │
│  ☐ Background Worker               │
│  ☑ Blueprint                       │ ← בחר את זה
│  ☐ Static Site                     │
│  ☐ PostgreSQL                      │
│                                     │
└─────────────────────────────────────┘

אחרי שלוחצים על "Blueprint":

┌─────────────────────────────────────┐
│  Select Repository                  │
│                                     │
│  🔍 Search repositories...         │
│                                     │
│  ☐ idodanan1/-rsvp-management-... │ ← בחר את זה
│  ☐ idodanan1/other-repo            │
│                                     │
│  [Apply] [Cancel]                  │ ← לחץ Apply
└─────────────────────────────────────┘
```

---

## ❓ בעיות נפוצות:

### "I don't see the 'New' button"
- ודא שהתחברת ל-Render (לא רק פתחת את האתר)
- נסה לרענן את הדף (F5)
- ודא שאתה בדף Dashboard

### "I don't see 'Blueprint' in the menu"
- חפש "Blueprint from Repo" או "New Blueprint"
- אם אתה רואה "Web Service", זה גם בסדר - בחר את זה

### "I don't see my repository"
- לחץ על "Connect GitHub" או "Refresh"
- הרשא ל-Render לגשת ל-repositories שלך
- ודא שהקוד ב-GitHub: https://github.com/idodanan1/-rsvp-management-system

### "Repository not found"
- ודא שהקוד ב-GitHub
- ודא שהתחברת עם אותו GitHub שבו הקוד שלך
- נסה לרענן את רשימת ה-repositories

---

## 💡 טיפים:

- אם אתה לא רואה משהו, נסה לרענן את הדף (F5)
- אם משהו לא עובד, נסה להתחבר מחדש
- ודא שאתה בדף Dashboard (לא Settings או Account)

---

## 📞 צריך עזרה?

אם אתה עדיין תקוע, תגיד לי:
- מה אתה רואה במסך?
- מה השגיאה שאתה מקבל (אם יש)?
- איפה בדיוק אתה תקוע?

ואני אעזור!

