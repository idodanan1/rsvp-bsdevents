# 🚨 העלאה דחופה לשרת - הוראות

## הבעיה:
השינויים עדיין לא מופיעים באתר כי הם לא הועלו ל-GitHub.

## פתרון מיידי:

### שלב 1: בדוק את הסטטוס
```cmd
git status
```

### שלב 2: הוסף את השינויים
```cmd
git add src/components/Dashboard.tsx
```

אם יש עוד קבצים ששונו:
```cmd
git add .
```

### שלב 3: צור commit
```cmd
git commit -m "feat: הוספת כפתור טען מהמאגר בדשבורד"
```

### שלב 4: העלה ל-GitHub
```cmd
git push
```

אם יש שגיאה, נסה:
```cmd
git push origin main
```

או:
```cmd
git push origin master
```

### שלב 5: בדוק ב-Render
1. פתח את https://dashboard.render.com
2. בחר את הפרויקט `rsvp-frontend-wy47`
3. בדוק את ה-"Deploys" tab
4. חכה שהבנייה תסתיים (2-5 דקות)

### שלב 6: בדוק באתר
1. פתח https://rsvp-frontend-wy47.onrender.com
2. לחץ Ctrl+Shift+R (Hard Refresh)
3. בדוק שהכפתור "טען מהמאגר" מופיע

## אם עדיין לא עובד:

1. **בדוק את ה-build logs ב-Render** - יש שגיאות?
2. **בדוק שהקוד ב-GitHub מעודכן** - פתח את ה-repository ב-GitHub
3. **נסה Manual Deploy ב-Render** - לחץ על "Manual Deploy" → "Deploy latest commit"

## מה צריך להופיע אחרי ה-Push:

✅ Render יתחיל build אוטומטית
✅ ה-build יסתיים בהצלחה
✅ הכפתור "טען מהמאגר" יופיע בדשבורד
