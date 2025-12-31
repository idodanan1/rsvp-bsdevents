# 🚀 הפעלה מהירה של שרת מקומי

## הבעיה:

השרת לא רץ - אתה רואה `ERR_CONNECTION_REFUSED`.

## הפתרון:

### שלב 1: פתח Command Prompt חדש

1. לחץ `Win + R`
2. הקלד `cmd`
3. לחץ `Enter`

### שלב 2: נווט לתיקיית הפרויקט

```cmd
cd /d "C:\Users\MY PC\OneDrive\Desktop\GIThub פרוייקטים\-rsvp-management-system"
```

### שלב 3: הרץ את השרת

```cmd
npm run dev
```

**המתן 10-15 שניות** עד שהשרת יעלה.

אמור לראות:
```
VITE v5.4.21  ready in XXX ms

➜  Local:   http://localhost:5173/
➜  Network: use --host to expose
```

### שלב 4: פתח את הדפדפן

1. **פתח דפדפן חדש** (Chrome, Edge, Firefox)
2. **נווט ל:**
   ```
   http://localhost:5173
   ```

### שלב 5: בדוק את השינויים

1. **בדוק את הגרסה:**
   - גלול למטה בתחתית הדף
   - אמור לראות: **גרסה 1.0.205**

2. **בדוק את Code Splitting:**
   - פתח DevTools (F12)
   - לך ל-Network tab
   - רענן את הדף (F5)
   - בדוק שרק chunks נדרשים נטענים

3. **בדוק את Icons:**
   - בדוק שכל ה-icons מופיעים
   - בדוק שאין שגיאות בקונסול

## אם השרת לא עולה:

### בעיה 1: Port 5173 תפוס

```cmd
netstat -ano | findstr :5173
```

אם יש תהליך, סגור אותו או שנה את הפורט ב-`vite.config.ts`.

### בעיה 2: שגיאות בטרמינל

שלח לי את השגיאות ואני אעזור לך לתקן.

### בעיה 3: node_modules לא קיים

```cmd
npm install --legacy-peer-deps
```

## טיפים:

- **השאר את הטרמינל פתוח** - השרת צריך לרוץ ברקע
- **אל תסגור את הטרמינל** - זה יעצור את השרת
- **אם השרת נעצר** - הרץ `npm run dev` שוב

## אם הכל עובד מקומית:

אז הבעיה היא ב-Render. בדוק:
1. האם ה-commits הגיעו ל-GitHub?
2. האם Render בונה מה-commit הנכון?
3. האם ה-Build Command נכון ב-Render?
