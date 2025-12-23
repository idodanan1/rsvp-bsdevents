# 🚀 דרך פשוטה: Git Setup דרך VS Code

## ✅ שלב 1: פתח VS Code

1. **פתח Visual Studio Code**
2. **File → Open Folder**
3. **בחר את התיקייה:**
   ```
   C:\Users\MY PC\OneDrive\Desktop\GIThub פרוייקטים\rsvp new bsd
   ```

---

## ✅ שלב 2: פתח Terminal ב-VS Code

1. **לחץ Ctrl+`** (backtick) או **Terminal → New Terminal**
2. **וודא שאתה בתיקיית הפרויקט:**
   - בטרמינל תראה משהו כמו:
   ```
   PS C:\Users\MY PC\OneDrive\Desktop\GIThub פרוייקטים\rsvp new bsd>
   ```

---

## ✅ שלב 3: מחק Repository ישן (אם יש)

**הרץ בטרמינל:**
```powershell
Remove-Item -Path ".git" -Recurse -Force -ErrorAction SilentlyContinue
```

---

## ✅ שלב 4: אתחל Repository חדש

```powershell
git init
```

---

## ✅ שלב 5: הוסף קבצים

```powershell
git add .
```

---

## ✅ שלב 6: בדוק כמה קבצים נוספו

```powershell
git status --short | Measure-Object -Line
```

**אמור לראות ~100 קבצים, לא 300,000!**

אם אתה רואה 300,000+:
- **עצור!**
- המשך לשלב 7

---

## ✅ שלב 7: אם יש יותר מדי קבצים - נקה

```powershell
git rm -r --cached .
git add .
```

---

## ✅ שלב 8: Commit

```powershell
git commit -m "Initial setup"
```

---

## ✅ שלב 9: שנה ל-main

```powershell
git branch -M main
```

---

## ✅ שלב 10: חבר ל-GitHub

```powershell
git remote add origin https://github.com/idodanan1/rsvp-bsdevents.git
```

---

## ✅ שלב 11: Push

```powershell
git push -u origin main
```

---

## 🆘 אם יש שגיאה:

### "fatal: Unable to create index.lock"

**פתרון:**
```powershell
Remove-Item -Path ".git\index.lock" -Force -ErrorAction SilentlyContinue
```

ואז נסה שוב.

---

### "error: src refspec main does not match any"

**פתרון:**
- זה אומר שאין commit
- חזור לשלב 8 ועשה commit

---

### "error: failed to push"

**פתרון:**
- בדוק שיש לך הרשאות ל-Repository
- בדוק שה-URL נכון

---

## ✅ מה צריך לראות:

**אחרי `git add .`:**
- אמור לראות רק קבצי הפרויקט
- לא אמור לראות `.cursor/`, `.config/`, `AppData/`

**אחרי `git commit`:**
- תראה: `[main (root-commit) xxxxx] Initial setup`
- `X files changed, XXXX insertions(+)`

**אחרי `git push`:**
- תראה: `Enumerating objects...`
- `Writing objects...`
- `To https://github.com/idodanan1/rsvp-bsdevents.git`

---

**זה אמור לעבוד!** ✅

