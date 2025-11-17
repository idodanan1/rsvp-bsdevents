# 🚀 איך לעשות Manual Deploy ב-Render

## למה צריך Manual Deploy?

אם אתה רואה שגיאה מ-commit ישן, זה אומר ש-Render עדיין לא רץ build חדש. אתה יכול לעשות Manual Deploy כדי לכפות build חדש.

---

## איך לעשות Manual Deploy:

### שלב 1: היכנס ל-Render Dashboard
1. פתח: https://dashboard.render.com/
2. היכנס לחשבון שלך

### שלב 2: מצא את השירות
1. לחץ על **"Blueprints"** בתפריט השמאלי
2. לחץ על **"אישורי הגעה"** (או שם הבלופרינט שלך)
3. לחץ על **"Resources"** בתפריט השמאלי
4. לחץ על **"rsvp-frontend"**

### שלב 3: לחץ על Manual Deploy
1. בחלק העליון של הדף, תראה כפתור **"Manual Deploy"** עם חץ dropdown
2. לחץ על הכפתור
3. בחר **"Deploy latest commit"** או **"Deploy"**

### שלב 4: המתן
1. Render יתחיל build חדש
2. תראה "Deploy started" ב-Events
3. המתן 5-10 דקות
4. בדוק את הסטטוס

---

## מה לחפש:

### ✅ אם הכל תקין:
- תראה "Deploy started" ב-Events
- אחרי כמה דקות, תראה "Live"
- תקבל URL: `https://rsvp-frontend.onrender.com`

### ❌ אם יש בעיה:
- תראה "Deploy failed" ב-Events
- לחץ על ה-event שנכשל
- לחץ על "Logs"
- העתק את ה-Logs ושלח לי

---

## טיפים:

- **Manual Deploy** כפה build חדש גם אם Render לא עשה את זה אוטומטית
- **אם יש שגיאה** - שלח לי את ה-Logs ואני אתקן
- **ה-build עובד מקומית** - אז הבעיה היא בהגדרות Render

---

## אם Manual Deploy לא עובד:

אם גם Manual Deploy נכשל:
1. לחץ על "Logs"
2. העתק את כל ה-Logs (בעיקר את החלק האחרון)
3. שלח לי את ה-Logs
4. אני אתקן את הבעיה

---

**עכשיו לחץ על "Manual Deploy" והמתן לבנייה! 🚀**

