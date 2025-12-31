# הוראות להעלאת הפרויקט ל-Git

## אופציה 1: שימוש ב-Script (מומלץ)

הרץ את הקובץ:
```cmd
git-commit-full.bat
```

ה-script יבצע:
1. ✅ בדיקת סטטוס Git
2. ✅ הוספת כל הקבצים
3. ✅ יצירת commit עם ההודעה מ-COMMIT_MESSAGE.txt
4. ✅ אפשרות להעלות ל-GitHub

## אופציה 2: פקודות ידניות

### שלב 1: בדוק סטטוס
```cmd
git status
```

### שלב 2: הוסף את כל הקבצים
```cmd
git add .
```

### שלב 3: צור commit
```cmd
git commit -F COMMIT_MESSAGE.txt
```

או עם הודעה ישירה:
```cmd
git commit -m "feat: עדכון מלא של הפרויקט - העלאה מחדש של כל הקבצים"
```

### שלב 4: העלה ל-GitHub
```cmd
git push
```

או אם יש branch ספציפי:
```cmd
git push origin main
```

או:
```cmd
git push origin master
```

## מה יקרה אחרי ה-Push:

1. ✅ השרת (Render/Vercel/אחר) יזהה את השינויים
2. ✅ השרת יבנה מחדש את האפליקציה (`npm run build`)
3. ✅ האפליקציה תעלה עם כל השינויים החדשים

## בדיקה אחרי ה-Push:

1. פתח את האפליקציה בשרת
2. בדוק שהכל עובד כראוי
3. בדוק את ה-build logs בשרת לוודא שהכל עבר בהצלחה

## אם יש בעיות:

1. בדוק את ה-build logs בשרת
2. בדוק שה-`package.json` תקין
3. בדוק שאין שגיאות ב-Console
4. בדוק שה-`.env` variables מוגדרים נכון בשרת
