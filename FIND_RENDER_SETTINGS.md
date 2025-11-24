# 🔍 איך למצוא את ה-Settings ב-Render

## שלב אחר שלב - עם תמונות מפורטות:

### שלב 1: היכנס ל-Render Dashboard

1. **פתח דפדפן** (Chrome, Firefox, Edge)
2. **היכנס ל:** https://dashboard.render.com/
3. **התחבר לחשבון שלך** (אם אתה לא מחובר)

---

### שלב 2: מצא את rsvp-frontend

**אפשרות A: דרך Dashboard**
1. **לחץ על "Dashboard"** בתפריט השמאלי העליון
2. **תראה רשימה של כל השירותים:**
   - `whatsapp-backend`
   - `rsvp-frontend` ← לחץ על זה!
3. **לחץ על `rsvp-frontend`**

**אפשרות B: דרך Blueprint**
1. **לחץ על "Blueprints"** בתפריט השמאלי
2. **לחץ על הבלופרינט שלך** (כנראה "אישורי הגעה" או שם אחר)
3. **לחץ על "Resources"** בתפריט השמאלי
4. **תראה רשימה של שירותים:**
   - `whatsapp-backend`
   - `rsvp-frontend` ← לחץ על זה!

**אפשרות C: דרך חיפוש**
1. **לחץ על "Search"** בחלק העליון (או לחץ `Ctrl+K`)
2. **הקלד:** `rsvp-frontend`
3. **לחץ על התוצאה**

---

### שלב 3: מצא את ה-Settings

אחרי שלחצת על `rsvp-frontend`, תראה דף עם תפריט שמאלי:

**בתפריט השמאלי תראה:**
- Overview
- Logs
- Metrics
- **Settings** ← לחץ על זה!
- Environment
- Events
- Manual Deploy

**לחץ על "Settings"**

---

### שלב 4: מצא את ה-Repository

אחרי שלחצת על "Settings", גלול למטה עד שתמצא:

**בחלק "Build & Deploy":**
- Build Command
- Start Command
- **Repository** ← זה מה שאנחנו מחפשים!

**תראה משהו כמו:**
```
Repository: idodanan1/-rsvp-management-system
```
או
```
Repository: idodanant/rsvp-management-system
```

---

## אם אתה לא רואה את "Settings":

### בדוק דרך ה-Logs:

1. **לחץ על "Logs"** בתפריט השמאלי
2. **גלול למעלה** עד שתמצא את ה-commit hash האחרון
3. **תראה משהו כמו:**
   ```
   Commit: a75f381
   ```
   או
   ```
   Commit: 8a3f816
   ```

**השווה:**
- אם אתה רואה: `8a3f816` → זה הפרויקט הנכון! ✅
- אם אתה רואה: `a75f381` או אחר → זה לא הפרויקט הנכון ❌

---

## אם אתה לא מוצא את rsvp-frontend בכלל:

### בדוק את ה-Dashboard:

1. **לחץ על "Dashboard"** בתפריט העליון
2. **תראה רשימה של כל השירותים**
3. **מה אתה רואה?**
   - רק `whatsapp-backend`? → צריך ליצור את `rsvp-frontend`
   - `rsvp-frontend`? → לחץ עליו
   - שירות אחר? → שלח לי את השם

---

## דרך חלופית - דרך URL ישיר:

אם אתה יודע את ה-Service ID:

1. **פתח:** `https://dashboard.render.com/web/[SERVICE_ID]`
2. **או:** `https://dashboard.render.com/static/[SERVICE_ID]`

---

## מה לעשות אם אתה לא מוצא כלום:

**שלח לי:**
1. מה אתה רואה ב-Dashboard?
2. מה אתה רואה כשלוחצים על "Blueprints"?
3. האם אתה רואה את `rsvp-frontend` איפשהו?
4. מה כתוב ב-Logs (אם אתה רואה אותם)?

---

**תאריך:** $(Get-Date)
**גרסה:** 1.0.0

