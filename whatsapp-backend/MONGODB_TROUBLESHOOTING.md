# פתרון בעיות MongoDB

## שגיאה: "מסד הנתונים לא זמין" (503)

אם אתה רואה שגיאה זו, זה אומר שהשרת לא מצליח להתחבר ל-MongoDB.

### שלב 1: בדוק את ה-MONGODB_URI

1. פתח את קובץ `.env` בתיקיית `whatsapp-backend`
2. ודא שיש שורה:
   ```
   MONGODB_URI=mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/rsvp-system?retryWrites=true&w=majority
   ```
3. החלף `username`, `password`, ו-`cluster0.xxxxx` עם הפרטים שלך מ-MongoDB Atlas

### שלב 2: אם אתה משתמש ב-MongoDB Atlas

1. **בדוק שה-Cluster פעיל:**
   - היכנס ל-https://cloud.mongodb.com
   - ודא שה-Cluster שלך פעיל (לא paused)

2. **בדוק שה-IP שלך מורשה:**
   - ב-MongoDB Atlas, לחץ על "Network Access"
   - ודא שה-IP של השרת (או 0.0.0.0/0 לכל ה-IPs) מורשה

3. **בדוק את ה-Connection String:**
   - ב-MongoDB Atlas, לחץ על "Connect" → "Connect your application"
   - העתק את ה-Connection String
   - ודא שהוא כולל את הסיסמה הנכונה

### שלב 3: אם אתה משתמש ב-MongoDB מקומי

1. **ודא ש-MongoDB רץ:**
   ```bash
   # Windows
   net start MongoDB
   
   # Linux/Mac
   sudo systemctl start mongod
   ```

2. **בדוק את ה-PORT:**
   - MongoDB ברירת מחדל רץ על פורט 27017
   - ודא שהפורט לא חסום

### שלב 4: בדוק את הלוגים

בדוק את הלוגים של השרת. אתה אמור לראות:
- `📊 MongoDB URI configured: ...` - אם ה-URI מוגדר
- `⚠️  MONGODB_URI not set` - אם ה-URI לא מוגדר
- `✅ Connected to MongoDB` - אם החיבור הצליח
- `❌ MongoDB connection error: ...` - אם יש שגיאה

### שלב 5: נסה להתחבר ידנית

אם עדיין לא עובד, נסה להתחבר ידנית:

```bash
cd whatsapp-backend
node create-user.js
```

אם זה עובד, הבעיה היא בשרת. אם זה לא עובד, הבעיה היא ב-MongoDB עצמו.

### שלב 6: בדוק את הרשת

אם אתה משתמש ב-MongoDB Atlas:
- ודא שיש לך חיבור אינטרנט
- בדוק אם יש firewall שחוסם את החיבור
- נסה מ-IP אחר

## פתרונות מהירים

### פתרון 1: הגדר MongoDB Atlas (מומלץ)

1. היכנס ל-https://www.mongodb.com/cloud/atlas/register
2. צור Cluster חינמי
3. קבל את ה-Connection String
4. הוסף אותו ל-`.env`:
   ```
   MONGODB_URI=mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/rsvp-system?retryWrites=true&w=majority
   ```
5. הפעל מחדש את השרת

### פתרון 2: השתמש ב-MongoDB מקומי

אם אתה מפתח מקומי:
1. התקן MongoDB: https://www.mongodb.com/try/download/community
2. הרץ את MongoDB
3. ה-`.env` כבר מוגדר ל-localhost (אין צורך לשנות)

### פתרון 3: בדוק את ה-Environment Variables

אם אתה משתמש ב-Render או שירות דומה:
1. ודא שה-MONGODB_URI מוגדר ב-Environment Variables
2. הפעל מחדש את השרת אחרי הוספת המשתנה

## עדיין לא עובד?

אם עדיין יש בעיה:
1. בדוק את הלוגים של השרת
2. נסה להתחבר ידנית עם `create-user.js`
3. בדוק את ה-MongoDB Atlas dashboard
4. ודא שה-Connection String נכון

## הערות חשובות

- השרת מנסה להתחבר אוטומטית כל 30 שניות אם החיבור נכשל
- אם החיבור נכשל 3 פעמים, השרת ימשיך לרוץ אבל ניהול משתמשים לא יעבוד
- המנהל (admin) תמיד יעבוד, גם בלי MongoDB

