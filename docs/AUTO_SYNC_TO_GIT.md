# 🔄 סקריפט אוטומטי: העלאה ל-Git

## 🎯 מה זה?

יצרתי סקריפט שיעלה את כל השינויים ל-GitHub אוטומטית!

---

## ✅ איך להשתמש:

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

### שלב 2: הרץ את הסקריפט

**הקלד:**
```cmd
powershell -ExecutionPolicy Bypass -File sync-to-git.ps1
```

**לחץ Enter**

---

## 🎉 זה הכל!

**הסקריפט יעשה:**
1. ✅ העתק את כל הקבצים לתיקיית Git
2. ✅ הוסף את השינויים ל-Git
3. ✅ Commit
4. ✅ Push ל-GitHub

**Vercel יעשה Deploy אוטומטי!**

---

## 📝 דרך מהירה יותר:

**אם אתה רוצה לעשות את זה ידנית:**

```cmd
cd "C:\Users\MY PC\OneDrive\Desktop\GIThub פרוייקטים\rsvp-bsdevents"
xcopy "..\rsvp new bsd\*" "." /E /I /Y /EXCLUDE:exclude.txt
git add .
git commit -m "Update: Sync changes"
git push
```

---

## 🎯 פתרון טוב יותר: עבוד ישירות מתוך תיקיית Git

**אם אתה רוצה שזה יהיה עוד יותר קל:**

1. **עבוד ישירות מתוך:** `rsvp-bsdevents`
2. **כל שינוי = פשוט:**
   ```cmd
   git add .
   git commit -m "Update"
   git push
   ```

**זה הכי פשוט!**

---

**עכשיו תוכל לעלות שינויים בקלות!** 🚀

