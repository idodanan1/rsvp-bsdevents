# 🔧 תיקון שגיאת npm - EPERM

## הבעיה:

npm מנסה ליצור `package-lock.json` ב-`C:\Windows\System32` במקום בתיקיית הפרויקט.

**סיבה:** הסקריפט לא רץ מהתיקייה הנכונה.

## הפתרון:

### אפשרות 1: הרץ את הסקריפט מהתיקייה הנכונה

1. **פתח Command Prompt או PowerShell**
2. **נווט לתיקיית הפרויקט:**
   ```cmd
   cd "C:\Users\MY PC\OneDrive\Desktop\GIThub פרוייקטים\-rsvp-management-system"
   ```
3. **הרץ את הסקריפט:**
   ```cmd
   CLEAN_AND_REINSTALL.bat
   ```

### אפשרות 2: הרץ את הפקודות ידנית

1. **פתח Command Prompt או PowerShell**
2. **נווט לתיקיית הפרויקט:**
   ```cmd
   cd "C:\Users\MY PC\OneDrive\Desktop\GIThub פרוייקטים\-rsvp-management-system"
   ```
3. **הרץ את הפקודות:**
   ```cmd
   rmdir /s /q node_modules
   del package-lock.json
   npm install --legacy-peer-deps
   ```

### אפשרות 3: השתמש ב-PowerShell

1. **פתח PowerShell**
2. **נווט לתיקיית הפרויקט:**
   ```powershell
   cd "C:\Users\MY PC\OneDrive\Desktop\GIThub פרוייקטים\-rsvp-management-system"
   ```
3. **הרץ את הפקודות:**
   ```powershell
   Remove-Item -Recurse -Force node_modules -ErrorAction SilentlyContinue
   Remove-Item -Force package-lock.json -ErrorAction SilentlyContinue
   npm install --legacy-peer-deps
   ```

## למה זה קורה?

- Windows מנסה לרוץ את הסקריפט מ-`C:\Windows\System32`
- צריך לוודא שהסקריפט רץ מהתיקייה הנכונה
- הסקריפט עודכן עם `cd /d "%~dp0"` כדי לעבור לתיקייה שבה הסקריפט נמצא

## בדיקה:

אחרי שהרצת את הפקודות, בדוק:

```cmd
dir package.json
dir package-lock.json
dir node_modules
```

אמור לראות את הקבצים בתיקיית הפרויקט, לא ב-System32.

## אם עדיין יש בעיה:

1. **בדוק שהתיקייה נכונה:**
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
