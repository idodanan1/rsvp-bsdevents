# מדריך שלב אחר שלב - הוספת Environment Variables

## שלב 1: קבלת הערכים מ-Supabase

### פתח את Supabase Dashboard:

1. היכנס ל-[app.supabase.com](https://app.supabase.com)
2. בחר את הפרויקט שלך (rsvp-dev או rsvp-prod)
3. לחץ על **⚙️ Settings** (בתפריט השמאלי)
4. לחץ על **"API"** בתפריט

### מה תראה:

```
Project URL: https://abcdefghijklmnop.supabase.co
anon public: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFiY2RlZmdoaWprbG1ub3AiLCJyb2xlIjoiYW5vbiIsImlhdCI6MTYzODk2NzI5MCwiZXhwIjoxOTU0NTQzMjkwfQ.xxxxx
service_role: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFiY2RlZmdoaWprbG1ub3AiLCJyb2xlIjoic2VydmljZV9yb2xlIiwiaWF0IjoxNjM4OTY3MjkwLCJleHAiOjE5NTQ1NDMyOTB9.yyyyy
```

### העתק את הערכים:

1. **Project URL** - העתק את כל ה-URL (מתחיל ב-https://)
2. **anon public** - העתק את כל המחרוזת הארוכה (מתחילה ב-eyJ...)
3. **service_role** - העתק את כל המחרוזת הארוכה (מתחילה ב-eyJ...)

---

## שלב 2: קבלת DATABASE_URL

1. ב-Supabase Dashboard → **⚙️ Settings** → **"Database"**
2. גלול למטה עד **"Connection string"**
3. לחץ על הטאב **"URI"**
4. תראה משהו כמו:
   ```
   postgresql://postgres:[YOUR-PASSWORD]@db.abcdefghijklmnop.supabase.co:5432/postgres
   ```
5. **החלף את `[YOUR-PASSWORD]`** בסיסמה שבחרת כשנוצר הפרויקט
6. העתק את כל ה-URL (עם הסיסמה)

**דוגמה:**
```
postgresql://postgres:MyPassword123@db.abcdefghijklmnop.supabase.co:5432/postgres
```

---

## שלב 3: יצירת Secrets

### NEXTAUTH_SECRET ו-QR_CODE_SECRET:

פתח Terminal (PowerShell) והרץ:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

תקבל משהו כמו:
```
a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6
```

**הרץ את הפקודה פעמיים** - פעם אחת ל-NEXTAUTH_SECRET ופעם אחת ל-QR_CODE_SECRET.

---

## שלב 4: הוספה ב-Vercel

### בדף Environment Variables ב-Vercel:

#### משתנה 1: NEXT_PUBLIC_SUPABASE_URL

1. בשדה **"Key"** (משמאל):
   ```
   NEXT_PUBLIC_SUPABASE_URL
   ```

2. בשדה **"Value"** (מימין):
   ```
   https://abcdefghijklmnop.supabase.co
   ```
   (העתק מה-Supabase → API → Project URL)

3. לחץ **"Add Another"**

---

#### משתנה 2: NEXT_PUBLIC_SUPABASE_ANON_KEY

1. **Key:**
   ```
   NEXT_PUBLIC_SUPABASE_ANON_KEY
   ```

2. **Value:**
   ```
   eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFiY2RlZmdoaWprbG1ub3AiLCJyb2xlIjoiYW5vbiIsImlhdCI6MTYzODk2NzI5MCwiZXhwIjoxOTU0NTQzMjkwfQ.xxxxx
   ```
   (העתק מה-Supabase → API → anon public - כל המחרוזת הארוכה)

3. לחץ **"Add Another"**

---

#### משתנה 3: SUPABASE_SERVICE_ROLE_KEY

1. **Key:**
   ```
   SUPABASE_SERVICE_ROLE_KEY
   ```

2. **Value:**
   ```
   eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFiY2RlZmdoaWprbG1ub3AiLCJyb2xlIjoic2VydmljZV9yb2xlIiwiaWF0IjoxNjM4OTY3MjkwLCJleHAiOjE5NTQ1NDMyOTB9.yyyyy
   ```
   (העתק מה-Supabase → API → service_role - כל המחרוזת הארוכה)

3. לחץ **"Add Another"**

---

#### משתנה 4: DATABASE_URL

1. **Key:**
   ```
   DATABASE_URL
   ```

2. **Value:**
   ```
   postgresql://postgres:MyPassword123@db.abcdefghijklmnop.supabase.co:5432/postgres
   ```
   (העתק מה-Supabase → Database → Connection string → URI, עם הסיסמה)

3. לחץ **"Add Another"**

---

#### משתנה 5: NODE_ENV

1. **Key:**
   ```
   NODE_ENV
   ```

2. **Value:**
   ```
   production
   ```
   (פשוט המילה "production")

3. לחץ **"Add Another"**

---

#### משתנה 6: NEXT_PUBLIC_APP_URL

1. **Key:**
   ```
   NEXT_PUBLIC_APP_URL
   ```

2. **Value:**
   ```
   https://your-app-name.vercel.app
   ```
   (הדומיין של האפליקציה שלך ב-Vercel - תראה אותו אחרי ה-deployment הראשון)

**או אם יש לך דומיין מותאם:**
   ```
   https://yourdomain.com
   ```

3. לחץ **"Add Another"**

---

#### משתנה 7: NEXTAUTH_SECRET

1. **Key:**
   ```
   NEXTAUTH_SECRET
   ```

2. **Value:**
   ```
   a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6
   ```
   (המחרוזת שיצרת בשלב 3)

3. לחץ **"Add Another"**

---

#### משתנה 8: NEXTAUTH_URL

1. **Key:**
   ```
   NEXTAUTH_URL
   ```

2. **Value:**
   ```
   https://your-app-name.vercel.app
   ```
   (אותו URL כמו NEXT_PUBLIC_APP_URL)

3. לחץ **"Add Another"**

---

#### משתנה 9: QR_CODE_SECRET

1. **Key:**
   ```
   QR_CODE_SECRET
   ```

2. **Value:**
   ```
   z9y8x7w6v5u4t3s2r1q0p9o8n7m6l5k4j3i2h1g0f9e8d7c6b5a4
   ```
   (מחרוזת שונה מזו של NEXTAUTH_SECRET - הרץ את הפקודה שוב)

---

#### משתנה 10: WHATSAPP_API_KEY (אופציונלי)

1. **Key:**
   ```
   WHATSAPP_API_KEY
   ```

2. **Value:**
   ```
   your_whatsapp_api_key_here
   ```
   (אם יש לך מפתח WhatsApp API)

---

#### משתנה 11: WHATSAPP_PHONE_NUMBER (אופציונלי)

1. **Key:**
   ```
   WHATSAPP_PHONE_NUMBER
   ```

2. **Value:**
   ```
   0500000000
   ```
   (מספר הטלפון שלך ב-WhatsApp Business)

---

#### משתנה 12: ENABLE_WHATSAPP_SENDING

1. **Key:**
   ```
   ENABLE_WHATSAPP_SENDING
   ```

2. **Value:**
   ```
   true
   ```
   (או `false` אם אתה לא רוצה לשלוח הודעות)

---

## שלב 5: שמירה

1. בדוק שכל המשתנים נוספו
2. וודא ש-**"Environments"** מוגדר ל-**"Production, Preview, and Development"**
3. לחץ **"Save"** (כפתור כחול למטה)

---

## שלב 6: Redeploy

אחרי שמירה, Vercel צריך לעשות Redeploy:

1. לחץ על **"Deployments"** בתפריט העליון
2. לחץ על ה-Deployment האחרון
3. לחץ על **"Redeploy"** (או Vercel יעשה את זה אוטומטית)

---

## סיכום - רשימת כל המשתנים:

```
✅ NEXT_PUBLIC_SUPABASE_URL
✅ NEXT_PUBLIC_SUPABASE_ANON_KEY
✅ SUPABASE_SERVICE_ROLE_KEY
✅ DATABASE_URL
✅ NODE_ENV
✅ NEXT_PUBLIC_APP_URL
✅ NEXTAUTH_SECRET
✅ NEXTAUTH_URL
✅ QR_CODE_SECRET
✅ WHATSAPP_API_KEY (אופציונלי)
✅ WHATSAPP_PHONE_NUMBER (אופציונלי)
✅ ENABLE_WHATSAPP_SENDING
```

---

## טיפים:

- **אל תדאג אם אתה לא יודע את NEXT_PUBLIC_APP_URL עכשיו** - תוכל לעדכן אחרי ה-deployment הראשון
- **שמור את כל הערכים במקום בטוח** - תצטרך אותם שוב
- **אם יש שגיאה** - בדוק שאין רווחים מיותרים בערכים

---

**זה הכל!** אחרי שתשמור, האפליקציה תוכל להתחבר ל-Supabase.

