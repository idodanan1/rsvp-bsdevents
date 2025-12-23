# 🔧 תיקון שגיאת Font - Build Failed

## ❌ הבעיה:
```
Unknown subset `hebrew` for font `Inter`.
Available subsets: `cyrillic`, `cyrillic-ext`, `greek`, `greek-ext`, `latin`, `latin-ext`, `vietnamese`
```

## ✅ התיקון:
הקובץ `app/layout.tsx` כבר תוקן! השינוי:
- **לפני:** `Inter({ subsets: ['latin', 'hebrew'] })`
- **אחרי:** `Inter({ subsets: ['latin'] })`

---

## 🚀 איך לדחוף את התיקון ל-GitHub:

### דרך 1: דרך Visual Studio Code (הכי קל!)

1. **פתח את הפרויקט ב-VS Code:**
   - פתח את התיקייה: `C:\Users\MY PC\OneDrive\Desktop\GIThub פרוייקטים\rsvp-bsdevents`

2. **לחץ על Source Control** (Ctrl+Shift+G) או האייקון בצד שמאל

3. **תראה את השינוי:**
   - `app/layout.tsx` עם סימן `M` (Modified)

4. **הוסף את השינוי:**
   - לחץ על הכפתור `+` ליד `app/layout.tsx`
   - או לחץ על "Stage All Changes"

5. **צור Commit:**
   - כתוב הודעה: `Fix: Remove unsupported Hebrew subset from Inter font`
   - לחץ על הכפתור "✓ Commit"

6. **Push ל-GitHub:**
   - לחץ על "Sync Changes" או "Push"
   - או לחץ על "..." → "Push"

✅ **סיימת! Vercel יעשה Deploy אוטומטי!**

---

### דרך 2: דרך PowerShell/CMD

1. **פתח PowerShell או CMD**

2. **עבור לתיקיית הפרויקט:**
   ```powershell
   cd "C:\Users\MY PC\OneDrive\Desktop\GIThub פרוייקטים\rsvp-bsdevents"
   ```

3. **בדוק את השינויים:**
   ```powershell
   git status
   ```
   תראה: `app/layout.tsx` עם `modified`

4. **הוסף את השינוי:**
   ```powershell
   git add app/layout.tsx
   ```

5. **צור Commit:**
   ```powershell
   git commit -m "Fix: Remove unsupported Hebrew subset from Inter font"
   ```

6. **Push ל-GitHub:**
   ```powershell
   git push
   ```

✅ **סיימת! Vercel יעשה Deploy אוטומטי!**

---

### דרך 3: דרך הסקריפט sync-to-git.ps1

אם אתה משתמש בסקריפט להעתקה מתיקייה אחרת:

1. **פתח PowerShell**

2. **הרץ את הסקריפט:**
   ```powershell
   cd "C:\Users\MY PC\OneDrive\Desktop\GIThub פרוייקטים\rsvp-bsdevents"
   .\sync-to-git.ps1
   ```

✅ **הסקריפט יעשה הכל אוטומטית!**

---

## ✅ אחרי ה-Push:

1. **Vercel יזהה את השינוי אוטומטית**
2. **יתחיל Build חדש**
3. **ה-Build אמור לעבור בהצלחה!** ✅

---

## 🔍 איך לבדוק שהכל עבד:

1. **לך ל-Vercel Dashboard:**
   - https://vercel.com
   - בחר את הפרויקט

2. **בדוק את ה-Deployments:**
   - תראה Deployment חדש
   - לחץ עליו לראות את ה-Logs

3. **אם ה-Build הצליח:**
   - תראה ✅ "Build Successful"
   - האפליקציה תהיה זמינה!

---

## 📝 הערות:

- **הפונט Inter לא תומך בעברית** - זה מוגבלות של Google Fonts
- **הטקסט בעברית יוצג בפונט ברירת המחדל** של הדפדפן (שתומך בעברית)
- **אם תרצה פונט עברי ספציפי** - אפשר להחליף ל-`Noto Sans Hebrew` או `Rubik`

---

**בהצלחה! 🚀**

