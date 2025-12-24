# הוראות Git Setup

## ⚠️ בעיה עם הנתיב

יש בעיה עם התווים העבריים בנתיב. הנה הוראות לביצוע ידני:

---

## שלב 1: פתח Git Bash או Terminal

פתח **Git Bash** (אם מותקן) או **PowerShell** בתיקיית הפרויקט.

---

## שלב 2: אתחל Git Repository

```bash
git init
```

---

## שלב 3: הוסף את כל הקבצים

```bash
git add .
```

---

## שלב 4: צור Commit ראשון

```bash
git commit -m "Initial setup"
```

---

## שלב 5: הוסף Remote (אם יש לך GitHub Repository)

### אם יש לך כבר Repository ב-GitHub:

```bash
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
```

### אם צריך ליצור Repository חדש:

1. לך ל-GitHub
2. לחץ **"New repository"**
3. תן שם (למשל: `rsvp-saas`)
4. **אל תסמן** "Initialize with README"
5. העתק את ה-URL
6. הרץ:
   ```bash
   git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
   ```

---

## שלב 6: Push ל-GitHub

```bash
git branch -M main
git push -u origin main
```

---

## ✅ סיימת!

עכשיו Vercel יוכל לעשות Deploy אוטומטי!

---

## 🆘 אם יש שגיאות:

### "fatal: remote origin already exists"
```bash
git remote remove origin
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
```

### "error: failed to push"
- בדוק שיש לך הרשאות ל-Repository
- בדוק שה-URL נכון

---

## 📝 הערות:

- הקבצים ב-`.gitignore` לא יתווספו (זה טוב!)
- `.env.development` ו-`.env.production` לא יתווספו (זה טוב!)
- `node_modules` לא יתווסף (זה טוב!)

