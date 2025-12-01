# הגדרת MongoDB למערכת

## למה צריך MongoDB?

המערכת השתמשה בקובץ `users.json` לאחסון משתמשים, אבל בשרתים כמו Render, קבצים נמחקים בכל אתחול. MongoDB הוא בסיס נתונים אמיתי שמשמר את הנתונים גם אחרי אתחולים.

## אפשרויות התקנה

### אפשרות 1: MongoDB Atlas (מומלץ - חינמי)

1. היכנס ל-https://www.mongodb.com/cloud/atlas
2. צור חשבון חינמי
3. צור Cluster חדש (בחינם)
4. קבל את Connection String - זה יראה כך:
   ```
   mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```
5. הוסף את ה-Connection String ל-`.env`:
   ```
   MONGODB_URI=mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/rsvp-system?retryWrites=true&w=majority
   ```

### אפשרות 2: MongoDB מקומי (לפיתוח)

1. התקן MongoDB על המחשב שלך: https://www.mongodb.com/try/download/community
2. הרץ את MongoDB
3. הוסף ל-`.env`:
   ```
   MONGODB_URI=mongodb://localhost:27017/rsvp-system
   ```

### אפשרות 3: Render MongoDB (אם אתה משתמש ב-Render)

1. ב-Render, צור MongoDB Database חדש
2. קבל את ה-Connection String
3. הוסף ל-`.env`:
   ```
   MONGODB_URI=<connection-string-from-render>
   ```

## יצירת המשתמש "בס"ד אירועים"

לאחר שהגדרת את MongoDB:

1. התקן את החבילות:
   ```bash
   cd whatsapp-backend
   npm install
   ```

2. הרץ את הסקריפט ליצירת המשתמש:
   ```bash
   node create-user.js
   ```

3. הסקריפט יציג:
   - Email של המשתמש
   - Password של המשתמש
   - **שמור את הפרטים האלה!**

## הערות חשובות

- אם MongoDB לא זמין, המערכת תחזיר שגיאה 503
- המשתמשים הקיימים יועתקו אוטומטית מ-`users.json` ל-MongoDB בפעם הראשונה
- המנהל (admin) לא נשמר ב-MongoDB - הוא תמיד קיים עם הפרטים הקבועים

## בדיקה שהכל עובד

1. הרץ את השרת:
   ```bash
   npm start
   ```

2. בדוק בלוגים שאתה רואה:
   ```
   ✅ Connected to MongoDB
   ```

3. נסה להתחבר עם המשתמש שיצרת

