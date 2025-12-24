# 🔧 הוראות ידניות: Git Setup

## ⚠️ הבעיה:

ה-Git repository נמצא בתיקיית הבית במקום בתיקיית הפרויקט, והנתיב עם התווים העבריים גורם לבעיות.

---

## ✅ הפתרון - דרך VS Code (הכי קל!):

### שלב 1: פתח את הפרויקט ב-VS Code

1. **פתח VS Code**
2. **File → Open Folder**
3. **נווט לתיקייה:**
   ```
   C:\Users\MY PC\OneDrive\Desktop\GIThub פרוייקטים\rsvp new bsd
   ```

---

### שלב 2: סגור Repository ישן (אם יש)

1. **לחץ על Source Control** (Ctrl+Shift+G)
2. **אם יש repository:**
   - לחץ על **"..."** (שלוש נקודות)
   - לחץ **"Close Repository"**

---

### שלב 3: פתח טרמינל ב-VS Code

1. **לחץ Ctrl+`** (backtick) או **Terminal → New Terminal**
2. **וודא שאתה בתיקיית הפרויקט:**
   ```bash
   pwd
   ```
   אמור לראות: `C:\Users\MY PC\OneDrive\Desktop\GIThub פרוייקטים\rsvp new bsd`

---

### שלב 4: מחק Repository ישן (אם יש)

```bash
rm -rf .git
```

---

### שלב 5: אתחל Repository חדש

```bash
git init
```

---

### שלב 6: הוסף את הקבצים

```bash
git add .
```

---

### שלב 7: בדוק כמה קבצים נוספו

```bash
git status --short | wc -l
```

אמור לראות **~100 קבצים**, לא 300,000!

---

### שלב 8: Commit

```bash
git commit -m "Initial setup"
```

---

### שלב 9: שנה ל-main

```bash
git branch -M main
```

---

### שלב 10: חבר ל-GitHub

```bash
git remote add origin https://github.com/idodanan1/rsvp-bsdevents.git
```

---

### שלב 11: Push

```bash
git push -u origin main
```

---

## ✅ דרך 2: דרך Git Bash

### שלב 1: פתח Git Bash

1. **נווט לתיקיית הפרויקט** ב-Windows Explorer
2. **לחץ ימני → "Git Bash Here"**

---

### שלב 2: הרץ את הפקודות

```bash
# מחק repository ישן
rm -rf .git

# אתחל חדש
git init

# הוסף קבצים
git add .

# בדוק כמה קבצים
git status --short | wc -l

# Commit
git commit -m "Initial setup"

# שנה ל-main
git branch -M main

# חבר ל-GitHub
git remote add origin https://github.com/idodanan1/rsvp-bsdevents.git

# Push
git push -u origin main
```

---

## 🆘 אם עדיין רואה 300,000+ קבצים:

### בדוק את ה-.gitignore

פתח את `.gitignore` וודא שהוא כולל:

```
node_modules/
.next/
.cursor/
.config/
AppData/
Aftershoot Projects/
```

אם לא - הוסף אותם!

---

### נקה את ה-cache

```bash
git rm -r --cached .
git add .
```

---

## ✅ מה צריך לראות:

**רק את הקבצים האלה:**
- ✅ `app/`
- ✅ `components/`
- ✅ `lib/`
- ✅ `docs/`
- ✅ `package.json`
- ✅ וכו'

**לא אמור לראות:**
- ❌ `.cursor/`
- ❌ `.config/`
- ❌ `AppData/`
- ❌ `Aftershoot Projects/`

---

**זה אמור לעבוד!** ✅

