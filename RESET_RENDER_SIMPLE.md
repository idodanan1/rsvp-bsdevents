# 🔄 איפוס שירות ב-Render - מדריך פשוט

## ⚠️ חשוב מאוד - לפני שתמחק:

**שמור את כל ה-Environment Variables!** אחרת תצטרך להגדיר הכל מחדש.

---

## שלב 1: שמור Environment Variables (5 דקות)

### 1. לך ל-Render Dashboard:
- https://dashboard.render.com
- התחבר לחשבון

### 2. חפש את `rsvp-frontend`:
- לחץ על "Services"
- לחץ על `rsvp-frontend`

### 3. העתק את כל המשתנים:
- לחץ על **"Settings"** בתפריט
- גלול למטה עד **"Environment Variables"**

**רשום את כל הערכים הבאים:**

```
NODE_ENV = production

NEXT_PUBLIC_SUPABASE_URL = [העתק]
NEXT_PUBLIC_SUPABASE_ANON_KEY = [העתק]
VITE_BACKEND_URL = [העתק]
NEXT_PUBLIC_APP_URL = [העתק]
```

**📝 טיפ:** צלם מסך או העתק לקובץ טקסט!

---

## שלב 2: מחק את השירות (1 דקה)

### 1. בתוך `rsvp-frontend` → לחץ **"Settings"**

### 2. גלול למטה עד **"Danger Zone"**

### 3. לחץ **"Delete Service"**
- הקלד: `rsvp-frontend`
- לחץ **"Delete"**

---

## שלב 3: צור שירות חדש (5 דקות)

### 1. ב-Render Dashboard → לחץ **"New"** → **"Web Service"**

### 2. בחר Repository:
- בחר: `idodanan1/-rsvp-management-system`
- או לחץ "Configure account" אם זה לא מחובר

### 3. הגדר את השירות:

**Name:**
```
rsvp-frontend
```

**Root Directory:**
```
.
```
(נקודה אחת)

**Environment:**
```
Node
```

**Branch:**
```
main
```

**Build Command:**
```
npm install --legacy-peer-deps && npm run build
```

**Start Command:**
```
npm start
```

**Plan:**
- בחר את התוכנית שלך

---

## שלב 4: הוסף Environment Variables (3 דקות)

### 1. גלול למטה עד **"Environment Variables"**

### 2. לחץ **"Add Environment Variable"** לכל אחד:

**1. NODE_ENV**
- Key: `NODE_ENV`
- Value: `production`

**2. NEXT_PUBLIC_SUPABASE_URL**
- Key: `NEXT_PUBLIC_SUPABASE_URL`
- Value: [הדבק את הערך ששמרת]

**3. NEXT_PUBLIC_SUPABASE_ANON_KEY**
- Key: `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- Value: [הדבק את הערך ששמרת]

**4. VITE_BACKEND_URL**
- Key: `VITE_BACKEND_URL`
- Value: [הדבק את הערך ששמרת]

**5. NEXT_PUBLIC_APP_URL**
- Key: `NEXT_PUBLIC_APP_URL`
- Value: [הדבק את הערך ששמרת]

---

## שלב 5: צור את השירות (10 דקות)

### 1. לחץ **"Create Web Service"**

### 2. המתן לבנייה:
- זה יקח 5-10 דקות
- תוכל לראות את ה-Logs בזמן אמת

### 3. חכה עד שתראה:
```
Your site is live 🎉
```

---

## שלב 6: בדוק את האתר (2 דקות)

### 1. פתח את האתר:
- לך ל-URL החדש (Render יתן לך)

### 2. נקה Cache:
- לחץ `Ctrl + Shift + Delete`
- בחר "Cached images and files" → "All time"
- לחץ "Clear data"

### 3. רענן את הדף:
- לחץ `Ctrl + Shift + R`

### 4. בדוק את הגרסה:
- גלול למטה בתחתית הדף
- אמור להיות: **גרסה 1.0.211** (או 1.0.212)

---

## ✅ סיכום:

1. ✅ שמור Environment Variables
2. 🗑️ מחק את השירות הישן
3. 🆕 צור שירות חדש
4. ⚙️ הוסף Environment Variables
5. 🚀 צור את השירות והמתן
6. ✅ בדוק את האתר

**זה אמור לעבוד עכשיו!** 🎉

---

## אם יש בעיות:

### Build נכשל?
- בדוק את ה-Logs
- ודא שה-Build Command נכון: `npm install --legacy-peer-deps && npm run build`

### Environment Variables לא עובדים?
- בדוק שכל המשתנים נוספו
- בדוק שהערכים נכונים

### האתר לא נטען?
- בדוק את ה-Logs
- נסה Hard Refresh (`Ctrl + Shift + R`)
