# מדריך התקנה בעברית

## הגדרת סביבת פיתוח

### 1. התקנת תלויות

```bash
npm install
```

### 2. הגדרת משתני סביבה

צור קובץ `.env.development` עם הערכים הבאים:

```env
# Database - Development (Sandbox)
DATABASE_URL="postgresql://user:password@localhost:5432/rsvp_dev"

# Authentication
NEXTAUTH_SECRET="dev_secret_only_for_local_testing"
NEXTAUTH_URL="http://localhost:3000"

# WhatsApp API - Development
WHATSAPP_API_KEY="test_key_abc123"
WHATSAPP_PHONE_NUMBER="0500000000"

# Environment Name
NODE_ENV="development"
NEXT_PUBLIC_APP_URL="http://localhost:3000"

# Features Toggle
ENABLE_WHATSAPP_SENDING=false
```

### 3. הגדרת מסד נתונים

#### אופציה א': PostgreSQL מקומי
1. התקן PostgreSQL
2. צור מסד נתונים: `createdb rsvp_dev`
3. עדכן את `DATABASE_URL` בקובץ `.env.development`

#### אופציה ב': Supabase
1. צור פרויקט חדש ב-Supabase
2. העתק את ה-URL וה-Keys
3. עדכן את המשתנים:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`

### 4. הרצת מיגרציות

אם אתה משתמש ב-Supabase:
1. פתח את SQL Editor ב-Supabase Dashboard
2. העתק והרץ את התוכן של `supabase/schema.sql`

אם אתה משתמש ב-PostgreSQL מקומי:
```bash
psql -d rsvp_dev -f supabase/schema.sql
```

### 5. הרצת השרת

```bash
npm run dev
```

האפליקציה תהיה זמינה ב-`http://localhost:3000`

## הגדרות חשובות

### WhatsApp
- `ENABLE_WHATSAPP_SENDING=false` - משבית שליחת הודעות WhatsApp בפיתוח
- בעת מעבר לייצור, שנה ל-`ENABLE_WHATSAPP_SENDING=true`
- עדכן את `WHATSAPP_API_KEY` ו-`WHATSAPP_PHONE_NUMBER` עם ערכים אמיתיים

### אבטחה
- `NEXTAUTH_SECRET` - יש ליצור מפתח אקראי חזק בייצור
- `QR_CODE_SECRET` - יש ליצור מפתח אקראי חזק בייצור

## פתרון בעיות

### שגיאת חיבור למסד נתונים
- ודא ש-PostgreSQL/Supabase פועל
- בדוק את `DATABASE_URL` או משתני Supabase

### WhatsApp לא עובד
- ודא ש-`ENABLE_WHATSAPP_SENDING=true` (אם אתה רוצה לבדוק)
- בדוק את `WHATSAPP_API_KEY` ו-`WHATSAPP_PHONE_NUMBER`

### שגיאות TypeScript
```bash
npm run type-check
```

## מבנה הפרויקט

```
rsvp-saas/
├── app/                    # דפי Next.js
│   ├── (auth)/            # דפי התחברות/הרשמה
│   ├── (dashboard)/       # לוח בקרה
│   ├── (scanner)/         # סורק QR
│   └── (public)/          # תצוגה ציבורית
├── components/            # רכיבי React
├── lib/                   # ספריות ושירותים
├── supabase/             # סכמת מסד נתונים
└── scripts/              # סקריפטים שימושיים
```

## תמיכה

לשאלות ובעיות, בדוק את:
- `docs/ENVIRONMENT_SETUP.md` - מדריך מפורט באנגלית
- `README.md` - תיעוד כללי

