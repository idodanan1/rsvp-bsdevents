# 🔄 איפוס שירות ב-Render

## ⚠️ אזהרה:

**לפני שתמחק את השירות, בואו ננסה פתרונות פשוטים יותר!**

## פתרונות פשוטים יותר (נסה קודם):

### פתרון 1: נקה Cache בדפדפן

1. **פתח DevTools** (F12)
2. **לך ל-Network tab**
3. **סמן "Disable cache"**
4. **לחץ `Ctrl + Shift + R`** (Hard Refresh)

### פתרון 2: Manual Deploy ב-Render

1. **לך ל-Render Dashboard:**
   - https://dashboard.render.com
   - חפש את `rsvp-frontend`

2. **לחץ "Manual Deploy":**
   - בחר "Deploy latest commit"
   - המתן 5-10 דקות

### פתרון 3: בדוק את ה-Build Command

1. **לך ל-Settings:**
   - Render Dashboard → rsvp-frontend → Settings

2. **בדוק את ה-Build Command:**
   ```
   npm install --legacy-peer-deps && npm run build
   ```

3. **אם זה לא נכון, שנה ל:**
   ```
   npm install --legacy-peer-deps && npm run build
   ```

4. **לחץ "Save Changes"**
5. **לחץ "Manual Deploy"**

---

## אם כלום לא עובד - איפוס השירות:

### שלב 1: שמור את ה-Environment Variables

**חשוב מאוד!** לפני שתמחק:

1. **לך ל-Settings:**
   - Render Dashboard → rsvp-frontend → Settings
   - גלול למטה עד "Environment Variables"

2. **כתוב את כל ה-Environment Variables:**
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `VITE_BACKEND_URL`
   - `NEXT_PUBLIC_APP_URL`
   - וכל האחרים

### שלב 2: מחק את השירות

1. **לך ל-Settings:**
   - Render Dashboard → rsvp-frontend → Settings
   - גלול למטה עד "Danger Zone"

2. **לחץ "Delete Service"**
   - הקלד את שם השירות לאימות
   - לחץ "Delete"

### שלב 3: צור שירות חדש

1. **לחץ "New" → "Web Service"**

2. **בחר את ה-Repository:**
   - `idodanan1/-rsvp-management-system`

3. **הגדר את השירות:**
   - **Name:** `rsvp-frontend`
   - **Root Directory:** `.` (ריק)
   - **Build Command:** `npm install --legacy-peer-deps && npm run build`
   - **Start Command:** `npm start`
   - **Environment:** `Node`

4. **הוסף את ה-Environment Variables:**
   - כל המשתנים ששמרת בשלב 1

5. **לחץ "Create Web Service"**

### שלב 4: המתן לבנייה

- Render יתחיל build חדש
- המתן 5-10 דקות
- בדוק את ה-Logs

---

## המלצה:

**לפני שתמחק, נסה:**
1. נקה cache בדפדפן
2. Manual Deploy
3. בדוק את ה-Build Command

**רק אם כלום לא עובד, מחק את השירות.**

---

## אם תמחק:

**ודא שיש לך:**
- ✅ כל ה-Environment Variables
- ✅ ה-Repository מחובר נכון
- ✅ ה-Build Command נכון

**אחרת תצטרך להגדיר הכל מחדש!**
