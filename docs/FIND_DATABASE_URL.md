# איך למצוא את DATABASE_URL ב-Supabase

## שיטה 1: דרך Settings → Database

1. ב-Supabase Dashboard, לחץ על **⚙️ Settings** (בתפריט השמאלי)
2. לחץ על **"Database"** בתפריט
3. גלול למטה עד **"Connection string"**
4. לחץ על הטאב **"URI"**
5. תראה את ה-connection string

---

## שיטה 2: דרך Connection Info

1. ב-Supabase Dashboard, לחץ על **⚙️ Settings**
2. לחץ על **"Database"**
3. חפש את החלק **"Connection info"** או **"Connection parameters"**
4. שם תראה:
   - Host
   - Database name
   - Port
   - User
   - Password

**בנה את ה-URL בעצמך:**
```
postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres
```

---

## שיטה 3: דרך Project Settings → Database

1. לחץ על **⚙️ Settings**
2. לחץ על **"Project Settings"** (אם יש)
3. לחץ על **"Database"**
4. חפש **"Connection string"** או **"Database URL"**

---

## שיטה 4: בנה בעצמך

אם אתה רואה את הפרטים הבאים:

- **Host**: `db.abcdefghijklmnop.supabase.co`
- **Database**: `postgres`
- **Port**: `5432`
- **User**: `postgres`
- **Password**: (הסיסמה שלך)

**בנה את ה-URL כך:**
```
postgresql://postgres:[YOUR-PASSWORD]@db.abcdefghijklmnop.supabase.co:5432/postgres
```

**דוגמה:**
אם הסיסמה שלך היא `MyPassword123`, ה-URL יהיה:
```
postgresql://postgres:MyPassword123@db.abcdefghijklmnop.supabase.co:5432/postgres
```

---

## שיטה 5: דרך API Settings

1. לחץ על **⚙️ Settings** → **"API"**
2. תחת **"Project URL"** תראה משהו כמו:
   ```
   https://abcdefghijklmnop.supabase.co
   ```
3. ה-URL של המסד נתונים הוא:
   ```
   db.abcdefghijklmnop.supabase.co
   ```
4. בנה את ה-URL:
   ```
   postgresql://postgres:[YOUR-PASSWORD]@db.abcdefghijklmnop.supabase.co:5432/postgres
   ```

---

## איפה הסיסמה?

אם שכחת את הסיסמה:

1. ב-Supabase Dashboard → **⚙️ Settings** → **"Database"**
2. לחץ על **"Reset database password"**
3. בחר סיסמה חדשה ושמור אותה!

---

## דוגמה מלאה:

אם:
- Project URL: `https://abcdefghijklmnop.supabase.co`
- Password: `MySecurePassword123`

אז DATABASE_URL יהיה:
```
postgresql://postgres:MySecurePassword123@db.abcdefghijklmnop.supabase.co:5432/postgres
```

---

## טיפ:

אם אתה עדיין לא מוצא, שלח לי:
1. מה אתה רואה ב-Settings → Database?
2. איזה אפשרויות יש לך בתפריט?

ואני אעזור לך למצוא את זה!

