# 🖥️ מדריך פשוט: Git Setup דרך CMD

## ✅ שלב 1: פתח CMD

1. **לחץ Windows + R** (כפתור Windows + כפתור R יחד)
2. **הקלד:** `cmd`
3. **לחץ Enter**

**או:**
1. **לחץ על כפתור התחל** (Windows)
2. **הקלד:** `cmd`
3. **לחץ Enter**

---

## ✅ שלב 2: עבור לתיקיית הפרויקט

**הקלד את הפקודה הזו (העתק-הדבק):**

```cmd
cd "C:\Users\MY PC\OneDrive\Desktop\GIThub פרוייקטים\rsvp new bsd"
```

**לחץ Enter**

**מה תראה:**
```
C:\Users\MY PC\OneDrive\Desktop\GIThub פרוייקטים\rsvp new bsd>
```

**זה אומר שאתה בתיקייה הנכונה!** ✅

---

## ✅ שלב 3: מחק Repository ישן (אם יש)

**הקלד:**
```cmd
rmdir /s /q .git
```

**לחץ Enter**

**אם תראה "The system cannot find the file specified" - זה בסדר!** זה אומר שאין repository ישן.

---

## ✅ שלב 4: אתחל Repository חדש

**הקלד:**
```cmd
git init
```

**לחץ Enter**

**מה תראה:**
```
Initialized empty Git repository in C:/Users/MY PC/...
```

---

## ✅ שלב 5: הוסף את כל הקבצים

**הקלד:**
```cmd
git add .
```

**לחץ Enter**

**זה יכול לקחת כמה שניות...**

---

## ✅ שלב 6: בדוק כמה קבצים נוספו

**הקלד:**
```cmd
git status
```

**לחץ Enter**

**מה צריך לראות:**
- רשימה של קבצים
- **לא** אמור לראות 300,000+ קבצים!

---

## ✅ שלב 7: צור Commit

**הקלד:**
```cmd
git commit -m "Initial setup"
```

**לחץ Enter**

**מה תראה:**
```
[main (root-commit) xxxxx] Initial setup
 X files changed, XXXX insertions(+)
```

**זה אומר שהכל עבד!** ✅

---

## ✅ שלב 8: שנה את השם ל-main

**הקלד:**
```cmd
git branch -M main
```

**לחץ Enter**

---

## ✅ שלב 9: חבר ל-GitHub

**הקלד:**
```cmd
git remote add origin https://github.com/idodanan1/rsvp-bsdevents.git
```

**לחץ Enter**

---

## ✅ שלב 10: העלה ל-GitHub

**הקלד:**
```cmd
git push -u origin main
```

**לחץ Enter**

**זה יכול לקחת כמה שניות...**

**מה תראה:**
```
Enumerating objects: X, done.
Writing objects: 100% (X/X), done.
To https://github.com/idodanan1/rsvp-bsdevents.git
 * [new branch]      main -> main
```

**זה אומר שהכל עבד!** ✅

---

## 🎉 סיימת!

עכשיו כל הקבצים שלך ב-GitHub!

**אתה יכול לבדוק:**
1. לך ל: https://github.com/idodanan1/rsvp-bsdevents
2. תראה את כל הקבצים שלך!

---

## 🆘 אם יש שגיאה:

### שגיאה: "git is not recognized"

**פתרון:**
- Git לא מותקן במחשב שלך
- הורד מ: https://git-scm.com/download/win
- התקן
- פתח CMD מחדש

---

### שגיאה: "fatal: Unable to create index.lock"

**פתרון:**
1. **הקלד:**
   ```cmd
   del .git\index.lock
   ```
2. **לחץ Enter**
3. **נסה שוב את הפקודה שהכשילה**

---

### שגיאה: "error: src refspec main does not match any"

**פתרון:**
- זה אומר שאין commit
- חזור לשלב 7 ועשה commit

---

### שגיאה: "error: failed to push"

**פתרון:**
- זה יכול להיות בגלל שאין הרשאות
- או שה-URL לא נכון
- שלח לי את השגיאה המדויקת ואני אעזור

---

## 📝 סיכום - כל הפקודות ברצף:

```cmd
cd "C:\Users\MY PC\OneDrive\Desktop\GIThub פרוייקטים\rsvp new bsd"
rmdir /s /q .git
git init
git add .
git status
git commit -m "Initial setup"
git branch -M main
git remote add origin https://github.com/idodanan1/rsvp-bsdevents.git
git push -u origin main
```

**פשוט העתק כל פקודה, הדבק ב-CMD, לחץ Enter, וחכה שתסיים לפני שאתה עובר לפקודה הבאה!**

---

**בהצלחה!** 🚀

