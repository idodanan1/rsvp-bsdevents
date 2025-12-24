# 🚀 Deploy ב-Vercel - מדריך מהיר

## ✅ שלב 1: לך ל-Vercel

1. **פתח דפדפן**
2. **לך ל:** https://vercel.com/new
3. **התחבר** (או הירשם אם אין לך חשבון)

---

## ✅ שלב 2: Import את ה-Repository

1. **לחץ על "Import"** ליד ה-Repository שלך: `idodanan1/rsvp-bsdevents`

   **או:**

2. **לחץ "Import Git Repository"**
3. **הדבק את ה-URL:**
   ```
   https://github.com/idodanan1/rsvp-bsdevents
   ```
4. **לחץ "Continue"**

---

## ✅ שלב 3: הגדר את הפרויקט

**Vercel אמור לזהות אוטומטית:**
- ✅ **Framework Preset:** Next.js
- ✅ **Root Directory:** `./`
- ✅ **Build Command:** `npm run build`
- ✅ **Output Directory:** `.next`

**אם לא - מלא ידנית:**
- **Framework Preset:** Next.js
- **Root Directory:** `./` (השאר ריק)
- **Build Command:** `npm run build`
- **Output Directory:** `.next`

---

## ✅ שלב 4: הוסף Environment Variables

**לפני שאתה לוחץ "Deploy", לחץ על "Environment Variables":**

**הוסף את כל המשתנים הבאים:**

### 1. Database
- **Key:** `DATABASE_URL`
- **Value:** ה-URL של Supabase שלך (מ-`.env.development`)

### 2. Supabase
- **Key:** `NEXT_PUBLIC_SUPABASE_URL`
- **Value:** ה-URL של Supabase שלך
- **Key:** `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- **Value:** ה-Anon Key של Supabase שלך

### 3. Authentication
- **Key:** `NEXTAUTH_SECRET`
- **Value:** הסוד שיצרת קודם (או צור חדש)
- **Key:** `NEXTAUTH_URL`
- **Value:** `https://your-app.vercel.app` (תעדכן אחרי ה-Deploy)

### 4. QR Code
- **Key:** `QR_CODE_SECRET`
- **Value:** הסוד שיצרת קודם

### 5. WhatsApp (אופציונלי)
- **Key:** `WHATSAPP_ACCESS_TOKEN`
- **Value:** ה-Token שלך
- **Key:** `WHATSAPP_PHONE_NUMBER_ID`
- **Value:** ה-Phone Number ID שלך
- **Key:** `WHATSAPP_API_KEY`
- **Value:** ה-API Key שלך
- **Key:** `WHATSAPP_PHONE_NUMBER`
- **Value:** מספר הטלפון שלך
- **Key:** `ENABLE_WHATSAPP_SENDING`
- **Value:** `false` (לפיתוח) או `true` (לפקה)

### 6. Environment
- **Key:** `NODE_ENV`
- **Value:** `production`
- **Key:** `NEXT_PUBLIC_APP_URL`
- **Value:** `https://your-app.vercel.app` (תעדכן אחרי ה-Deploy)

---

## ✅ שלב 5: Deploy!

1. **לחץ "Deploy"**
2. **חכה 2-3 דקות**
3. **תראה את ה-Deployment מתבצע**

---

## ✅ שלב 6: קבל את ה-URL

**אחרי שה-Deployment מסתיים:**
1. **תראה הודעה:** "Congratulations! Your project has been deployed"
2. **תקבל URL** כמו: `https://rsvp-bsdevents.vercel.app`
3. **לחץ על ה-URL** לראות את האפליקציה

---

## ✅ שלב 7: עדכן את ה-URLs

**אחרי שקיבלת את ה-URL:**

1. **לך ל-Vercel → Settings → Environment Variables**
2. **עדכן:**
   - `NEXT_PUBLIC_APP_URL` → ה-URL שקיבלת
   - `NEXTAUTH_URL` → אותו URL
3. **שמור**
4. **Vercel יעשה Redeploy אוטומטי**

---

## ✅ שלב 8: בדוק שהכל עובד

1. **פתח את ה-URL** שקיבלת
2. **נסה:**
   - להירשם/להתחבר
   - ליצור אירוע חדש
   - להוסיף אורחים

---

## 🆘 אם יש שגיאה:

### "Build Failed"

**פתרון:**
1. **לך ל-Vercel → Deployments**
2. **לחץ על ה-Deployment הכושל**
3. **לחץ "Functions" או "Logs"** לראות את השגיאה
4. **תקן את השגיאה** ונסה שוב

---

### "Cannot connect to database"

**פתרון:**
- בדוק שה-`DATABASE_URL` נכון
- בדוק שהסיסמה נכונה
- בדוק שהטבלאות קיימות ב-Supabase

---

### "Invalid API key"

**פתרון:**
- בדוק שה-`NEXT_PUBLIC_SUPABASE_ANON_KEY` נכון
- בדוק שאין רווחים מיותרים

---

## 🎉 סיימת!

**האפליקציה שלך עכשיו באוויר!** 🚀

---

## 📝 הערות:

- **Deploy אוטומטי:** כל `git push` יעשה Deploy אוטומטי!
- **Environment Variables:** Vercel שומר אותם, לא צריך להוסיף שוב
- **Updates:** כל שינוי בקוד = Deploy חדש אוטומטי

---

**בהצלחה!** 🎉

