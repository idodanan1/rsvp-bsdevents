# ⚡ בדיקה מהירה - מה מחובר ל-Render?

## דרך מהירה לבדוק:

### דרך 1: בדוק את ה-Logs (הכי קל!)

1. **פתח:** https://dashboard.render.com/
2. **לחץ על "Dashboard"** בתפריט העליון
3. **מצא את `rsvp-frontend`** ברשימה
4. **לחץ עליו**
5. **לחץ על "Logs"** בתפריט השמאלי
6. **גלול למעלה** עד שתמצא את ה-commit hash

**מה אתה רואה?**
- `8a3f816` → זה הפרויקט הנכון! ✅
- `a75f381` או אחר → זה לא הפרויקט הנכון ❌

---

### דרך 2: בדוק את ה-URL של האפליקציה

**פתח:** https://rsvp-frontend-wy47.onrender.com

**לחץ F12 → Console**

**חפש הודעות כמו:**
- `📡 Backend URL: ...`
- שגיאות

**אם אתה רואה שגיאות** → כנראה Render מחובר ל-repository אחר

---

### דרך 3: בדוק ב-GitHub

1. **פתח:** https://github.com/idodanan1
2. **בדוק את ה-Repositories:**
   - האם יש `-rsvp-management-system`? ✅
   - מה ה-commit האחרון? (אמור להיות `8a3f816`)

---

## מה לעשות אם זה לא הפרויקט הנכון:

### פתרון מהיר:

1. **ב-Render Dashboard → `rsvp-frontend`**
2. **לחץ על "Settings"** (אם אתה מוצא)
3. **מצא "Repository"**
4. **לחץ על "Change Repository"**
5. **בחר:** `idodanan1/-rsvp-management-system`
6. **שמור**
7. **לחץ "Manual Deploy" → "Deploy latest commit"**

---

**תאריך:** $(Get-Date)



