# 🔧 תיקון: Repository בתיקייה הלא נכונה

## ⚠️ הבעיה:

ה-Git repository נמצא בתיקיית הבית (`C:/Users/MY PC`) במקום בתיקיית הפרויקט!

זה אומר שהעלית קבצים לא נכונים ל-GitHub.

---

## ✅ הפתרון:

### שלב 1: פתח CMD

1. **לחץ Windows + R**
2. **הקלד:** `cmd`
3. **לחץ Enter**

---

### שלב 2: עבור לתיקיית הפרויקט

**הקלד:**
```cmd
cd "C:\Users\MY PC\OneDrive\Desktop\GIThub פרוייקטים\rsvp new bsd"
```

**לחץ Enter**

**וודא שאתה בתיקייה הנכונה:**
- תראה: `C:\Users\MY PC\OneDrive\Desktop\GIThub פרוייקטים\rsvp new bsd>`

---

### שלב 3: מחק Repository ישן (אם יש)

**הקלד:**
```cmd
rmdir /s /q .git
```

**לחץ Enter**

---

### שלב 4: אתחל Repository חדש

**הקלד:**
```cmd
git init
```

**לחץ Enter**

---

### שלב 5: הוסף את הקבצים

**הקלד:**
```cmd
git add .
```

**לחץ Enter**

---

### שלב 6: בדוק מה נוסף

**הקלד:**
```cmd
git status
```

**לחץ Enter**

**מה צריך לראות:**
- רשימה של קבצים מתיקיית הפרויקט
- קבצים כמו: `app/`, `components/`, `lib/`, `package.json`, וכו'
- **לא** אמור לראות קבצים מתיקיית הבית!

---

### שלב 7: Commit

**הקלד:**
```cmd
git commit -m "Initial setup - correct files"
```

**לחץ Enter**

---

### שלב 8: שנה ל-main

**הקלד:**
```cmd
git branch -M main
```

**לחץ Enter**

---

### שלב 9: חבר ל-GitHub

**הקלד:**
```cmd
git remote add origin https://github.com/idodanan1/rsvp-bsdevents.git
```

**לחץ Enter**

**אם תראה "fatal: remote origin already exists":**
- **הקלד:**
  ```cmd
  git remote remove origin
  git remote add origin https://github.com/idodanan1/rsvp-bsdevents.git
  ```

---

### שלב 10: Push (עם force)

**הקלד:**
```cmd
git push -u origin main --force
```

**לחץ Enter**

**⚠️ זה יחליף את כל הקבצים ב-GitHub עם הקבצים הנכונים!**

---

## ✅ מה צריך לראות בסוף:

```
Enumerating objects: X, done.
Writing objects: 100% (X/X), done.
To https://github.com/idodanan1/rsvp-bsdevents.git
 + [new branch]      main -> main (forced update)
```

---

## 🎉 סיימת!

עכשיו הקבצים הנכונים ב-GitHub!

**בדוק:**
1. לך ל: https://github.com/idodanan1/rsvp-bsdevents
2. תראה את כל הקבצים מתיקיית הפרויקט!

---

**בהצלחה!** 🚀

