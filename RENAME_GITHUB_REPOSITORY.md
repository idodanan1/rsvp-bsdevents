# 🔧 איך לשנות שם של Repository ב-GitHub

## שלב אחר שלב:

### שלב 1: היכנס ל-GitHub

1. **פתח:** https://github.com/idodanan1
2. **התחבר לחשבון שלך**

---

### שלב 2: מצא את הפרויקט שברצונך לשנות

**תראה רשימה של Repositories:**
- `-rsvp-management-system` (עם מקף)
- `rsvp-management-system` (בלי מקף)
- או שמות דומים אחרים

**בחר את הפרויקט שברצונך לשנות** (לחץ עליו)

---

### שלב 3: פתח את ה-Settings

**אחרי שלחצת על הפרויקט:**

1. **לחץ על "Settings"** (בתפריט העליון של הפרויקט)
2. **גלול למטה** עד שתמצא "Danger Zone"
3. **מצא "Rename this repository"**

---

### שלב 4: שנה את השם

1. **לחץ על "Rename this repository"**
2. **תראה שדה עם השם הנוכחי**
3. **שנה את השם למשהו ברור, למשל:**
   - `rsvp-management-system-OLD` (אם זה הפרויקט הישן)
   - `rsvp-management-system-NEW` (אם זה הפרויקט החדש)
   - או כל שם אחר שיעזור לך להבדיל

4. **לחץ על "I understand, rename my repository"**

---

### שלב 5: עדכן את ה-Remote המקומי

**אחרי ששינית את השם ב-GitHub:**

1. **פתח Terminal ב-Cursor** (`Ctrl + ~`)
2. **הרץ את הפקודות הבאות:**

```bash
# בדוק את ה-remote הנוכחי
git remote -v

# עדכן את ה-URL (החלף NEW_NAME בשם החדש)
git remote set-url origin https://github.com/idodanan1/NEW_NAME.git

# בדוק שהשינוי עבד
git remote -v
```

---

## המלצה: איזה פרויקט לשנות?

### הפרויקט הנכון (שצריך להישאר):
- **Repository:** `idodanan1/-rsvp-management-system`
- **Commit אחרון:** `8a3f816` - "Test: Add timestamp to dashboard"
- **זה הפרויקט שמחובר ל-Render**

### הפרויקט הישן (שצריך לשנות):
- **Repository:** `idodanan1/rsvp-management-system` (בלי מקף)
- **או:** `idodanan1/rsvp-management-system-OLD`
- **זה הפרויקט שלא בשימוש**

---

## איך להבדיל בין הפרויקטים:

### בדוק את ה-commits:

1. **פתח כל פרויקט ב-GitHub**
2. **בדוק את ה-commits האחרונים:**
   - **הפרויקט הנכון:** אמור להיות commit `8a3f816` - "Test: Add timestamp to dashboard"
   - **הפרויקט הישן:** לא יהיה לו את ה-commit הזה

### בדוק מה מחובר ל-Render:

1. **ב-Render Dashboard → `rsvp-frontend` → Settings**
2. **בדוק מה כתוב ב-"Repository"**
3. **זה הפרויקט הנכון!**

---

## אחרי השינוי:

1. **הפרויקט הנכון יישאר:** `-rsvp-management-system` (עם מקף)
2. **הפרויקט הישן יקבל שם חדש:** `rsvp-management-system-OLD` (או שם אחר)
3. **זה יעזור לך להבדיל ביניהם!**

---

**תאריך:** $(Get-Date)

