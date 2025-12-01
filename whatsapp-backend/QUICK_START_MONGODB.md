# הוראות מהירות - MongoDB

## שלב 1: הגדרת MongoDB

**אפשרות מומלצת - MongoDB Atlas (חינמי):**
1. היכנס ל: https://www.mongodb.com/cloud/atlas/register
2. צור חשבון חינמי
3. צור Cluster חדש (בחינם - Free Tier)
4. לחץ על "Connect" → "Connect your application"
5. העתק את ה-Connection String (נראה כך):
   ```
   mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```
6. הוסף את ה-Connection String לקובץ `.env` בתיקיית `whatsapp-backend`:
   ```
   MONGODB_URI=mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/rsvp-system?retryWrites=true&w=majority
   ```
   **חשוב:** החלף `<username>` ו-`<password>` עם הפרטים שלך, והוסף `/rsvp-system` לפני ה-`?`

## שלב 2: יצירת המשתמש "בס"ד אירועים"

1. פתח טרמינל בתיקיית `whatsapp-backend`
2. הרץ:
   ```bash
   node create-user.js
   ```
3. שמור את הפרטים שיוצגו:
   - Email
   - Password

## שלב 3: הרצת השרת

```bash
npm start
```

בדוק בלוגים שאתה רואה:
```
✅ Connected to MongoDB
```

## הערות

- אם MongoDB לא מוגדר, השרת יעבוד אבל לא יוכל לשמור משתמשים
- המשתמשים הקיימים יועתקו אוטומטית מ-`users.json` ל-MongoDB בפעם הראשונה
- המנהל (admin) לא נשמר ב-MongoDB - הוא תמיד קיים

## בעיות?

אם אתה רואה שגיאות:
1. ודא שה-MONGODB_URI נכון ב-`.env`
2. ודא שה-Cluster ב-MongoDB Atlas פעיל
3. ודא שה-IP שלך מורשה ב-MongoDB Atlas (Network Access)

