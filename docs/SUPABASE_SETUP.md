# מדריך הגדרת Supabase - RSVP SaaS Platform

## שלב 1: יצירת פרויקטים ב-Supabase

### Development Project

1. היכנס ל-[Supabase Dashboard](https://app.supabase.com)
2. לחץ על **"New Project"**
3. מלא את הפרטים:
   - **Name**: `rsvp-dev` (או שם אחר)
   - **Database Password**: בחר סיסמה חזקה ושמור אותה!
   - **Region**: בחר **Europe West** (הכי קרוב לישראל)
   - **Pricing Plan**: Free (להתחלה)
4. לחץ **"Create new project"**
5. חכה 2-3 דקות עד שהפרויקט ייווצר

### Production Project

1. חזור על אותו תהליך
2. **Name**: `rsvp-prod`
3. **Database Password**: סיסמה שונה וחזקה!
4. **Region**: אותו אזור (Europe West)
5. **Pricing Plan**: Pro (אם אתה מוכן לשלם) או Free להתחלה

---

## שלב 2: קבלת ה-Credentials

לאחר שהפרויקט נוצר:

1. לחץ על **"Project Settings"** (⚙️ בצד שמאל)
2. לחץ על **"API"** בתפריט
3. העתק את הערכים הבאים:

### Development:
```
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...
```

### Production:
```
NEXT_PUBLIC_SUPABASE_URL=https://yyyyy.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...
```

**⚠️ חשוב:** שמור את ה-Service Role Key במקום בטוח! הוא נותן גישה מלאה למסד הנתונים.

---

## שלב 3: הרצת הסכמה (Schema)

### שיטה 1: דרך SQL Editor (הכי פשוט) ⭐

#### Development Project:

1. פתח את פרויקט **rsvp-dev** ב-Supabase Dashboard
2. לחץ על **"SQL Editor"** בתפריט השמאלי
3. לחץ על **"New query"**
4. פתח את הקובץ `supabase/schema.sql` מהפרויקט שלך
5. העתק את **כל התוכן** של הקובץ (Ctrl+A, Ctrl+C)
6. הדבק ב-SQL Editor (Ctrl+V)
7. לחץ על **"Run"** (או F5)
8. חכה שהמיגרציה תסתיים (30-60 שניות)
9. בדוק שאין שגיאות - אמור לראות "Success. No rows returned"

#### Production Project:

1. חזור על אותו תהליך בפרויקט **rsvp-prod**
2. העתק את אותו `supabase/schema.sql`
3. הרץ ב-SQL Editor

---

### שיטה 2: דרך Supabase CLI (למתקדמים)

אם יש לך Supabase CLI מותקן:

```bash
# התקן Supabase CLI (אם עדיין לא)
npm install -g supabase

# התחבר ל-Supabase
supabase login

# קשר את הפרויקט המקומי לפרויקט ב-Supabase
supabase link --project-ref your-project-ref

# דחוף את הסכמה
supabase db push
```

---

## שלב 4: בדיקת ההתקנה

### בדוק שהטבלאות נוצרו:

1. ב-Supabase Dashboard, לחץ על **"Table Editor"**
2. אמור לראות את הטבלאות הבאות:
   - ✅ `users`
   - ✅ `events`
   - ✅ `guests`
   - ✅ `tables`
   - ✅ `table_assignments`
   - ✅ `message_templates`
   - ✅ `whatsapp_messages`
   - ✅ `whatsapp_campaigns`
   - ✅ `qr_codes`
   - ✅ `check_ins`

### בדוק את ה-RLS Policies:

1. לחץ על **"Authentication"** → **"Policies"**
2. אמור לראות policies לכל הטבלאות

---

## שלב 5: הגדרת Environment Variables

### Development (`.env.development`):

```env
# Supabase Development
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...

# Database URL (לשימוש עם Prisma)
DATABASE_URL=postgresql://postgres:[YOUR-PASSWORD]@db.xxxxx.supabase.co:5432/postgres

# Environment
NODE_ENV=development
NEXT_PUBLIC_APP_URL=http://localhost:3000

# WhatsApp (Development)
WHATSAPP_API_KEY=test_key
WHATSAPP_PHONE_NUMBER=0500000000
ENABLE_WHATSAPP_SENDING=false

# Security
NEXTAUTH_SECRET=dev_secret_change_in_production
NEXTAUTH_URL=http://localhost:3000
QR_CODE_SECRET=dev_secret_key
```

### Production (`.env.production`):

```env
# Supabase Production
NEXT_PUBLIC_SUPABASE_URL=https://yyyyy.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...

# Database URL
DATABASE_URL=postgresql://postgres:[YOUR-PASSWORD]@db.yyyyy.supabase.co:5432/postgres

# Environment
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://your-domain.com

# WhatsApp (Production)
WHATSAPP_API_KEY=your_real_api_key
WHATSAPP_PHONE_NUMBER=your_real_number
ENABLE_WHATSAPP_SENDING=true

# Security (use strong, random values!)
NEXTAUTH_SECRET=generate_strong_random_secret_here
NEXTAUTH_URL=https://your-domain.com
QR_CODE_SECRET=generate_strong_random_secret_here
```

**איך למצוא את DATABASE_URL:**

1. ב-Supabase Dashboard → **"Project Settings"** → **"Database"**
2. תחת **"Connection string"** → בחר **"URI"**
3. העתק את ה-connection string
4. החלף את `[YOUR-PASSWORD]` בסיסמה שבחרת

---

## שלב 6: בדיקת החיבור

### בדוק שהכל עובד:

1. הרץ את השרת:
   ```bash
   npm run dev
   ```

2. פתח את `http://localhost:3000`

3. נסה להירשם/להתחבר

4. אם יש שגיאות, בדוק:
   - שה-Environment Variables נכונים
   - שהסכמה רצה בהצלחה
   - שה-RLS Policies מופעלים

---

## פתרון בעיות נפוצות

### שגיאה: "relation does not exist"

**פתרון:** הסכמה לא רצה. חזור לשלב 3 והרץ את `schema.sql` שוב.

### שגיאה: "permission denied"

**פתרון:** בדוק שה-RLS Policies מופעלים. ב-Supabase Dashboard → Table Editor → לחץ על טבלה → Settings → ודא ש-"Enable RLS" מסומן.

### שגיאה: "invalid API key"

**פתרון:** בדוק שהעתקת את ה-keys נכון. ודא שאין רווחים או תווים נוספים.

### שגיאה: "connection refused"

**פתרון:** 
- בדוק שה-DATABASE_URL נכון
- ודא שהסיסמה נכונה
- בדוק שה-Region נכון

---

## טיפים חשובים

1. **שמור את ה-Service Role Key במקום בטוח** - הוא נותן גישה מלאה!
2. **אל תעלה את ה-.env files ל-Git** - הם כבר ב-.gitignore
3. **השתמש ב-Anon Key ב-client-side** - Service Role רק ב-server
4. **הפרד dev/prod** - אל תשתמש באותו פרויקט לשניהם
5. **גבה את הנתונים** - השתמש ב-`scripts/backup-prod.js` לפני שינויים גדולים

---

## שלבים הבאים

לאחר שהגדרת את Supabase:

1. ✅ הגדר את Vercel (או שרת אחר)
2. ✅ הוסף את ה-Environment Variables ב-Vercel
3. ✅ Deploy את האפליקציה
4. ✅ בדוק שהכל עובד ב-production

---

## קישורים שימושיים

- [Supabase Dashboard](https://app.supabase.com)
- [Supabase Documentation](https://supabase.com/docs)
- [Supabase SQL Editor Guide](https://supabase.com/docs/guides/database/tables)

---

**הערה:** אם יש בעיות, בדוק את ה-logs ב-Supabase Dashboard → Logs → Postgres Logs

