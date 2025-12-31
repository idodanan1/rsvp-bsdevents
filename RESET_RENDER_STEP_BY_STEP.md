# 🔄 איפוס שירות ב-Render - שלב אחר שלב

## ⚠️ חשוב מאוד - לפני שתמחק:

**שמור את כל ה-Environment Variables!** אחרת תצטרך להגדיר הכל מחדש.

---

## שלב 1: שמור את ה-Environment Variables

### 1.1 לך ל-Render Dashboard:
- https://dashboard.render.com
- התחבר לחשבון שלך

### 1.2 חפש את השירות:
- לחץ על "Services" בתפריט
- חפש את `rsvp-frontend`
- לחץ עליו

### 1.3 העתק את כל ה-Environment Variables:

לך ל-**Settings** → גלול למטה עד **"Environment Variables"**

**רשום את כל המשתנים הבאים:**

```
NODE_ENV = production

NEXT_PUBLIC_SUPABASE_URL = [העתק את הערך]
NEXT_PUBLIC_SUPABASE_ANON_KEY = [העתק את הערך]
VITE_BACKEND_URL = [העתק את הערך]
NEXT_PUBLIC_APP_URL = [העתק את הערך]
```

**📝 טיפ:** צלם מסך או העתק לכל קובץ טקסט!

---

## שלב 2: מחק את השירות

### 2.1 לך ל-Settings:
- בתוך `rsvp-frontend` → לחץ על **"Settings"** בתפריט

### 2.2 גלול למטה:
- גלול עד הסוף עד **"Danger Zone"**

### 2.3 מחק את השירות:
- לחץ על **"Delete Service"**
- הקלד את שם השירות: `rsvp-frontend`
- לחץ **"Delete"**
- **⚠️ זה ימחק את השירות לצמיתות!**

---

## שלב 3: צור שירות חדש

### 3.1 לחץ "New":
- ב-Render Dashboard → לחץ על **"New"** (בצד ימין למעלה)
- בחר **"Web Service"**

### 3.2 בחר את ה-Repository:
- **Connect a repository:**
  - בחר את `idodanan1/-rsvp-management-system`
  - או לחץ "Configure account" אם זה לא מחובר

### 3.3 הגדר את השירות:

**Name:**
```
rsvp-frontend
```

**Root Directory:**
```
.
```
(נקודה אחת - זה אומר שהשורש הוא התיקייה הראשית)

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
- בחר את התוכנית שלך (Starter / Standard / Pro)

---

## שלב 4: הוסף Environment Variables

### 4.1 גלול למטה:
- עד **"Environment Variables"**

### 4.2 הוסף כל משתנה:

לחץ **"Add Environment Variable"** לכל אחד:

1. **NODE_ENV**
   - Key: `NODE_ENV`
   - Value: `production`

2. **NEXT_PUBLIC_SUPABASE_URL**
   - Key: `NEXT_PUBLIC_SUPABASE_URL`
   - Value: [הדבק את הערך ששמרת]

3. **NEXT_PUBLIC_SUPABASE_ANON_KEY**
   - Key: `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - Value: [הדבק את הערך ששמרת]

4. **VITE_BACKEND_URL**
   - Key: `VITE_BACKEND_URL`
   - Value: [הדבק את הערך ששמרת]

5. **NEXT_PUBLIC_APP_URL**
   - Key: `NEXT_PUBLIC_APP_URL`
   - Value: [הדבק את הערך ששמרת]

### 4.3 ודא שהכל נכון:
- בדוק שכל המשתנים נוספו
- בדוק שהערכים נכונים

---

## שלב 5: צור את השירות

### 5.1 לחץ "Create Web Service":
- אחרי שבדקת שהכל נכון
- לחץ על **"Create Web Service"**

### 5.2 המתן לבנייה:
- Render יתחיל build חדש
- זה יקח 5-10 דקות
- תוכל לראות את ה-Logs בזמן אמת

### 5.3 בדוק את ה-Logs:
- לחץ על **"Logs"** tab
- בדוק שאין שגיאות
- חכה עד שתראה: **"Your site is live 🎉"**

---

## שלב 6: בדוק את האתר

### 6.1 פתח את האתר:
- לך ל-URL החדש (Render יתן לך URL חדש)

### 6.2 נקה Cache:
- לחץ `Ctrl + Shift + Delete`
- בחר "Cached images and files"
- בחר "All time"
- לחץ "Clear data"

### 6.3 בדוק את הגרסה:
- גלול למטה בתחתית הדף
- בדוק את הגרסה - אמור להיות **1.0.211** (או 1.0.212)

---

## אם יש בעיות:

### בעיה: Build נכשל
- בדוק את ה-Logs
- ודא שה-Build Command נכון: `npm install --legacy-peer-deps && npm run build`
- ודא שה-Start Command נכון: `npm start`

### בעיה: Environment Variables לא עובדים
- בדוק שכל המשתנים נוספו
- בדוק שהערכים נכונים (ללא רווחים מיותרים)

### בעיה: האתר לא נטען
- בדוק את ה-Logs
- בדוק שה-URL נכון
- נסה Hard Refresh (`Ctrl + Shift + R`)

---

## סיכום:

✅ **שלב 1:** שמור Environment Variables  
🗑️ **שלב 2:** מחק את השירות הישן  
🆕 **שלב 3:** צור שירות חדש  
⚙️ **שלב 4:** הוסף Environment Variables  
🚀 **שלב 5:** צור את השירות והמתן לבנייה  
✅ **שלב 6:** בדוק את האתר

**זה אמור לעבוד עכשיו!** 🎉
