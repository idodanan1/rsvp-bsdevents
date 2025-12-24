# 🖥️ איך לעשות Git Setup בלי VS Code

## 🎯 דרך 1: דרך Windows Explorer + PowerShell (הכי פשוט!)

### שלב 1: פתח את תיקיית הפרויקט

1. **פתח Windows Explorer** (התיקייה)
2. **נווט לתיקייה:**
   ```
   C:\Users\MY PC\OneDrive\Desktop\GIThub פרוייקטים\rsvp new bsd
   ```

---

### שלב 2: פתח PowerShell בתיקייה

1. **לחץ על שורת הכתובת** (Address Bar) למעלה
2. **הקלד:** `powershell`
3. **לחץ Enter**

**או:**
1. **לחץ ימני על ריק בתיקייה**
2. **לחץ "Open in Terminal"** או **"Open PowerShell window here"**

---

### שלב 3: הרץ את הפקודות

**העתק והדבק כל פקודה, אחת בכל פעם:**

**פקודה 1:**
```powershell
Remove-Item -Path ".git" -Recurse -Force -ErrorAction SilentlyContinue
```
לחץ Enter

**פקודה 2:**
```powershell
git init
```
לחץ Enter

**פקודה 3:**
```powershell
git add .
```
לחץ Enter

**פקודה 4:**
```powershell
git commit -m "Initial setup"
```
לחץ Enter

**פקודה 5:**
```powershell
git branch -M main
```
לחץ Enter

**פקודה 6:**
```powershell
git remote add origin https://github.com/idodanan1/rsvp-bsdevents.git
```
לחץ Enter

**פקודה 7:**
```powershell
git push -u origin main
```
לחץ Enter

---

## 🎯 דרך 2: הורד VS Code (אם תרצה)

### שלב 1: הורד VS Code

1. **לך ל:** https://code.visualstudio.com/
2. **לחץ "Download for Windows"**
3. **התקן** (Next, Next, Install)

### שלב 2: פתח את הפרויקט

1. **פתח VS Code**
2. **File → Open Folder**
3. **בחר את התיקייה**

---

## 🎯 דרך 3: דרך Command Prompt (CMD)

### שלב 1: פתח CMD

1. **לחץ Windows + R**
2. **הקלד:** `cmd`
3. **לחץ Enter**

### שלב 2: עבור לתיקיית הפרויקט

```cmd
cd "C:\Users\MY PC\OneDrive\Desktop\GIThub פרוייקטים\rsvp new bsd"
```

לחץ Enter

### שלב 3: הרץ את הפקודות

**השתמש באותן פקודות כמו ב-PowerShell, אבל ב-CMD:**

```cmd
rmdir /s /q .git
git init
git add .
git commit -m "Initial setup"
git branch -M main
git remote add origin https://github.com/idodanan1/rsvp-bsdevents.git
git push -u origin main
```

---

## ✅ מה זה VS Code?

**Visual Studio Code** הוא עורך קוד חינמי של Microsoft.

**למה זה שימושי:**
- ✅ עורך קוד נוח
- ✅ טרמינל מובנה
- ✅ תמיכה ב-Git
- ✅ חינמי

**אבל אתה לא חייב אותו!** אתה יכול לעשות הכל דרך PowerShell או CMD.

---

## 🎯 המלצה שלי:

**השתמש בדרך 1** (Windows Explorer + PowerShell) - זה הכי פשוט!

---

**בהצלחה!** 🚀

