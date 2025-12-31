# 🚀 התקנה מהירה - פתרון לבעיית EPERM

## הבעיה:

npm מנסה ליצור `package-lock.json` ב-`C:\Windows\System32` במקום בתיקיית הפרויקט.

## הפתרון המהיר:

### שלב 1: פתח Command Prompt

1. לחץ `Win + R`
2. הקלד `cmd`
3. לחץ `Enter`

### שלב 2: נווט לתיקיית הפרויקט

```cmd
cd /d "C:\Users\MY PC\OneDrive\Desktop\GIThub פרוייקטים\-rsvp-management-system"
```

### שלב 3: הרץ את הפקודות

```cmd
npm install --legacy-peer-deps
```

## אם עדיין יש בעיה:

### אפשרות 1: הרץ כמנהל

1. לחץ `Win + X`
2. בחר "Windows PowerShell (Admin)" או "Command Prompt (Admin)"
3. נווט לתיקיית הפרויקט:
   ```cmd
   cd /d "C:\Users\MY PC\OneDrive\Desktop\GIThub פרוייקטים\-rsvp-management-system"
   ```
4. הרץ:
   ```cmd
   npm install --legacy-peer-deps
   ```

### אפשרות 2: השתמש ב-PowerShell

1. לחץ `Win + X`
2. בחר "Windows PowerShell"
3. נווט לתיקיית הפרויקט:
   ```powershell
   cd "C:\Users\MY PC\OneDrive\Desktop\GIThub פרוייקטים\-rsvp-management-system"
   ```
4. הרץ:
   ```powershell
   npm install --legacy-peer-deps
   ```

### אפשרות 3: השתמש ב-VSCode Terminal

1. פתח את הפרויקט ב-VSCode
2. לחץ `Ctrl + ~` (פתח Terminal)
3. הרץ:
   ```cmd
   npm install --legacy-peer-deps
   ```

## בדיקה:

אחרי ההתקנה, בדוק:

```cmd
dir package-lock.json
dir node_modules
```

אמור לראות את הקבצים בתיקיית הפרויקט.

## אם עדיין לא עובד:

1. **בדוק את התיקייה:**
   ```cmd
   cd
   dir package.json
   ```

2. **אם package.json לא קיים, נווט לתיקייה הנכונה:**
   ```cmd
   cd "C:\Users\MY PC\OneDrive\Desktop\GIThub פרוייקטים\-rsvp-management-system"
   ```

3. **הרץ שוב:**
   ```cmd
   npm install --legacy-peer-deps
   ```

## הערה חשובה:

**אתה לא צריך להריץ את הסקריפט CLEAN_AND_REINSTALL.bat!**

פשוט:
1. פתח Command Prompt
2. נווט לתיקיית הפרויקט
3. הרץ: `npm install --legacy-peer-deps`

זה הכל! 🎉
