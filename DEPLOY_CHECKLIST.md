# רשימת בדיקה לפני העלאה לשרת

## ✅ מה צריך לעשות:

### 1. בדוק שהשינויים בקוד
```cmd
git status
```
צריך לראות:
- `src/components/Dashboard.tsx` - modified

### 2. הוסף את השינויים
```cmd
git add src/components/Dashboard.tsx
```

### 3. צור commit
```cmd
git commit -m "feat: הוספת כפתור טען מהמאגר בדשבורד"
```

### 4. העלה ל-GitHub
```cmd
git push
```

### 5. בדוק שהשרת בנה מחדש
- פתח את https://rsvp-frontend-wy47.onrender.com
- בדוק את ה-build logs ב-Render dashboard
- חכה שהבנייה תסתיים (יכול לקחת 2-5 דקות)

### 6. רענן את הדפדפן
- לחץ Ctrl+Shift+R (Hard Refresh)
- או נקה את ה-cache

## 🔍 איך לבדוק שהשינויים עלו:

1. פתח את https://rsvp-frontend-wy47.onrender.com
2. לחץ F12 (Developer Tools)
3. לחץ על Console
4. חפש את הכפתור "טען מהמאגר" בדשבורד
5. אם לא מופיע, בדוק את ה-build logs ב-Render

## ⚠️ אם השינויים לא מופיעים:

1. בדוק את ה-build logs ב-Render - יש שגיאות?
2. בדוק שהקוד ב-GitHub מעודכן (פתח את GitHub repository)
3. בדוק שהשרת בנה מחדש (Render dashboard → Deploys)
4. נסה Hard Refresh (Ctrl+Shift+R)
