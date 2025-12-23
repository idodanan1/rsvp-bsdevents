# הוספת Environment Variables - מדריך מהיר

## מה זה Environment Variables?

זה משתנים שמכילים מידע רגיש (סיסמאות, מפתחות API) שהאפליקציה צריכה, אבל לא רוצים להעלות ל-Git.

---

## איפה להוסיף?

### 1. **במקומי (Development)** - קובץ `.env.development`

צור קובץ `.env.development` בתיקיית הפרויקט:

```env
# Supabase Development
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...

# Database
DATABASE_URL=postgresql://postgres:password@db.xxxxx.supabase.co:5432/postgres

# App
NODE_ENV=development
NEXT_PUBLIC_APP_URL=http://localhost:3000

# WhatsApp
WHATSAPP_API_KEY=test_key
WHATSAPP_PHONE_NUMBER=0500000000
ENABLE_WHATSAPP_SENDING=false

# Security
NEXTAUTH_SECRET=dev_secret
NEXTAUTH_URL=http://localhost:3000
QR_CODE_SECRET=dev_secret
```

---

### 2. **ב-Vercel (Production)** - דרך Dashboard

1. היכנס ל-[vercel.com](https://vercel.com)
2. בחר את הפרויקט שלך
3. לחץ על **"Settings"** → **"Environment Variables"**
4. לחץ **"Add New"**
5. הוסף כל משתנה:
   - **Name**: `NEXT_PUBLIC_SUPABASE_URL`
   - **Value**: `https://xxxxx.supabase.co`
   - **Environment**: בחר `Production`, `Preview`, `Development`
6. לחץ **"Save"**
7. חזור על זה לכל משתנה

---

## איפה למצוא את הערכים?

### מ-Supabase:

1. היכנס ל-[Supabase Dashboard](https://app.supabase.com)
2. בחר את הפרויקט שלך
3. לחץ **"Settings"** (⚙️) → **"API"**
4. העתק:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role** → `SUPABASE_SERVICE_ROLE_KEY`

### DATABASE_URL:

1. ב-Supabase → **"Settings"** → **"Database"**
2. תחת **"Connection string"** → בחר **"URI"**
3. העתק את ה-connection string
4. החלף את `[YOUR-PASSWORD]` בסיסמה שלך

---

## רשימה מלאה של משתנים נדרשים:

```env
# Supabase (חובה)
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
DATABASE_URL=

# App (חובה)
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://your-domain.com

# Auth (חובה)
NEXTAUTH_SECRET=generate_random_secret_here
NEXTAUTH_URL=https://your-domain.com

# WhatsApp (אופציונלי)
WHATSAPP_API_KEY=
WHATSAPP_PHONE_NUMBER=
ENABLE_WHATSAPP_SENDING=true

# Security (חובה)
QR_CODE_SECRET=generate_random_secret_here
```

---

## טיפים:

1. **אל תעלה `.env` files ל-Git** - הם כבר ב-.gitignore
2. **השתמש בערכים שונים** ל-dev ו-prod
3. **שמור את ה-Service Role Key** במקום בטוח
4. **אחרי הוספה ב-Vercel** - צריך לעשות Redeploy

---

## איך ליצור Secrets חזקים?

```bash
# ב-Terminal:
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

או השתמש ב-[randomkeygen.com](https://randomkeygen.com)

---

**זה הכל!** אחרי שהוספת את כל המשתנים, האפליקציה תוכל להתחבר ל-Supabase.

