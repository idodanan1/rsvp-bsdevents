# 🔧 שינוי Repository ב-Render - הוראות מפורטות

## המטרה:
לשנות את ה-Repository ב-Render מ-`idodanant/rsvp-management-system` ל-`idodanan1/-rsvp-management-system`

---

## שלב אחר שלב:

### שלב 1: היכנס ל-Render Dashboard

1. **פתח דפדפן** (Chrome, Firefox, Edge)
2. **היכנס ל:** https://dashboard.render.com/
3. **התחבר לחשבון שלך** (אם אתה לא מחובר)

---

### שלב 2: מצא את rsvp-frontend

**אפשרות A: דרך Dashboard (הכי קל)**
1. **לחץ על "Dashboard"** בתפריט העליון (בחלק העליון של הדף)
2. **תראה רשימה של כל השירותים:**
   ```
   whatsapp-backend
   rsvp-frontend  ← לחץ על זה!
   ```
3. **לחץ על `rsvp-frontend`**

**אפשרות B: דרך Blueprint**
1. **לחץ על "Blueprints"** בתפריט השמאלי
2. **לחץ על הבלופרינט שלך** (כנראה "אישורי הגעה" או שם אחר)
3. **לחץ על "Resources"** בתפריט השמאלי
4. **לחץ על `rsvp-frontend`**

**אפשרות C: דרך חיפוש**
1. **לחץ על "Search"** בחלק העליון (או לחץ `Ctrl+K`)
2. **הקלד:** `rsvp-frontend`
3. **לחץ על התוצאה**

---

### שלב 3: פתח את ה-Settings

**אחרי שלחצת על `rsvp-frontend`, תראה דף עם תפריט שמאלי:**

```
Overview
Logs
Metrics
Settings  ← לחץ על זה!
Environment
Events
Manual Deploy
```

**לחץ על "Settings"**

---

### שלב 4: מצא את ה-Repository

**אחרי שלחצת על "Settings", גלול למטה עד שתמצא:**

**בחלק "Build & Deploy":**
```
Repository: idodanant/rsvp-management-system  ← זה מה שצריך לשנות!
```

**או אם אתה רואה:**
```
Repository: idodanan1/-rsvp-management-system  ← זה כבר נכון!
```

---

### שלב 5: שנה את ה-Repository

1. **מצא את השדה "Repository"**
2. **לחץ על "Change Repository"** או **"Edit"** (ליד ה-Repository)
3. **תראה רשימה של repositories:**
   ```
   idodanant/rsvp-management-system  ← זה לא נכון
   idodanan1/-rsvp-management-system  ← בחר את זה!
   ```
4. **בחר:** `idodanan1/-rsvp-management-system`
   - ⚠️ **חשוב:** יש מקף לפני `rsvp` ו-`1` בסוף `idodanan`
5. **לחץ על "Save Changes"** או **"Update"**

---

### שלב 6: Manual Deploy

**אחרי שמירת השינויים:**

1. **חזור לדף הראשי של `rsvp-frontend`** (לחץ על "Overview")
2. **לחץ על "Manual Deploy"** בחלק העליון של הדף
3. **בחר "Deploy latest commit"**
4. **לחץ על "Deploy"**

---

### שלב 7: המתן לבנייה

**Render יתחיל לבנות מחדש:**

1. **תראה הודעות כמו:**
   - "Building..." (בונה)
   - "Deploying..." (מפרס)
   - "Live" ✅ (פעיל)

2. **זה יקח 5-10 דקות**

3. **אחרי שהבנייה מסתיימת:**
   - ✅ **"Live"** → הבנייה הצליחה!
   - ❌ **"Build Failed"** → שלח לי את ה-Logs

---

### שלב 8: בדוק שהכל עובד

**אחרי שהבנייה מסתיימת:**

1. **פתח:** https://rsvp-frontend-wy47.onrender.com
2. **התחבר למערכת**
3. **בדוק את הדשבורד:**
   - אמור להיות: `✅ מעודכן: [תאריך ושעה]`
4. **אם אתה רואה את התאריך** → ✅ הכל תקין!

---

## אם אתה לא מוצא את "Settings":

### נסה דרך Events:

1. **לחץ על "Events"** בתפריט השמאלי
2. **תראה רשימה של Deploys**
3. **לחץ על ה-Deploy האחרון**
4. **תראה שם את ה-Repository**

---

## אם אתה לא מוצא את rsvp-frontend בכלל:

**שלח לי:**
1. מה אתה רואה ב-Dashboard? (רשימה של שירותים)
2. האם אתה רואה את `whatsapp-backend`?
3. האם אתה רואה שירות אחר?

---

## סיכום:

**לפני:**
- Repository: `idodanant/rsvp-management-system` ❌

**אחרי:**
- Repository: `idodanan1/-rsvp-management-system` ✅

**זה יפתור את הבעיה!** אחרי השינוי, Render יבנה מהפרויקט הנכון עם כל התיקונים.

---

**תאריך:** $(Get-Date)
**גרסה:** 1.0.0



