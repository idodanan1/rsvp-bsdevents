# 🔧 תיקון: Dependencies lock file is not found

## ⚠️ הבעיה:

Vercel לא מוצא את `package-lock.json` ב-repository.

---

## ✅ הפתרון:

### שלב 1: פתח CMD בתיקיית הפרויקט

1. **פתח Windows Explorer**
2. **נווט לתיקייה:**
   ```
   C:\Users\MY PC\OneDrive\Desktop\GIThub פרוייקטים\rsvp new bsd
   ```
3. **לחץ על שורת הכתובת**
4. **הקלד:** `cmd`
5. **לחץ Enter**

---

### שלב 2: צור את package-lock.json

**הקלד:**
```cmd
npm install
```

**לחץ Enter**

**זה ייצור את `package-lock.json`**

---

### שלב 3: עבור לתיקיית Git

**הקלד:**
```cmd
cd "C:\Users\MY PC\OneDrive\Desktop\GIThub פרוייקטים\rsvp-bsdevents"
```

**לחץ Enter**

---

### שלב 4: העתק את package-lock.json

**הקלד:**
```cmd
copy "C:\Users\MY PC\OneDrive\Desktop\GIThub פרוייקטים\rsvp new bsd\package-lock.json" .
```

**לחץ Enter**

---

### שלב 5: הוסף ל-Git

**הקלד:**
```cmd
git add package-lock.json
```

**לחץ Enter**

---

### שלב 6: Commit

**הקלד:**
```cmd
git commit -m "Add package-lock.json"
```

**לחץ Enter**

---

### שלב 7: Push

**הקלד:**
```cmd
git push
```

**לחץ Enter**

---

### שלב 8: חזור ל-Vercel

1. **לך ל-Vercel**
2. **לחץ "Redeploy"** או **"Deploy"** מחדש
3. **זה אמור לעבוד עכשיו!**

---

## 🎯 דרך מהירה יותר:

**אם אתה בתיקיית `rsvp new bsd`:**

```cmd
npm install
cd "C:\Users\MY PC\OneDrive\Desktop\GIThub פרוייקטים\rsvp-bsdevents"
copy "..\rsvp new bsd\package-lock.json" .
git add package-lock.json
git commit -m "Add package-lock.json"
git push
```

---

## ✅ מה צריך לראות:

**אחרי `git push`:**
```
Enumerating objects: X, done.
Writing objects: 100% (X/X), done.
```

**אחרי Redeploy ב-Vercel:**
- ה-Deployment אמור להצליח!

---

**נסה את זה ותגיד לי אם זה עבד!** ✅

