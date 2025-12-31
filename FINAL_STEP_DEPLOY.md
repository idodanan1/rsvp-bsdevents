# ✅ שלב אחרון - יצירת השירות

## מה שאתה רואה:

זה מסך **Advanced Settings** - אפשרויות מתקדמות. **אתה לא צריך לשנות כלום כאן!**

---

## מה שצריך לעשות:

### 1. בדוק שהכל נכון:

**Health Check Path:**
- כבר מוגדר ל-`/healthz` - זה בסדר, השאר ככה

**Pre-Deploy Command:**
- יש שם `./$` - זה לא משנה, אפשר להשאיר

**Auto-Deploy:**
- מוגדר ל-"On Commit" - זה מושלם! זה אומר ש-Render יעדכן אוטומטית כל פעם שתדחוף ל-GitHub

**Build Filters:**
- לא צריך לשנות כלום

---

### 2. גלול למטה:

**גלול עד הסוף של הדף**

---

### 3. לחץ "Deploy Web Service":

**לחץ על הכפתור הכחול הגדול בתחתית:**
```
Deploy Web Service
```

---

## מה יקרה אחרי:

1. **Render יתחיל לבנות את השירות**
   - זה יקח 5-10 דקות
   - תוכל לראות את ה-Logs בזמן אמת

2. **Render יתן לך URL חדש**
   - משהו כמו: `https://rsvp-frontend-new-xxxx.onrender.com`
   - שמור את ה-URL הזה!

3. **אחרי שהבנייה מסתיימת:**
   - תראה: "Your site is live 🎉"
   - השירות יהיה פעיל!

---

## מה לעשות אחרי שהשירות נוצר:

### 1. בדוק שהשירות עובד:
- פתח את ה-URL החדש
- נקה cache (`Ctrl + Shift + Delete`)
- רענן את הדף (`Ctrl + Shift + R`)
- בדוק את הגרסה - אמור להיות **1.0.211** (או 1.0.212)

### 2. עדכן את NEXT_PUBLIC_APP_URL:
- לך ל-Settings → Environment Variables
- עדכן את `NEXT_PUBLIC_APP_URL` ל-URL החדש
- לחץ "Save Changes"

### 3. אחרי שבדקת שהכל עובד:
- מחק את השירות הישן (`rsvp-frontend`)
- שנה את השם של החדש ל-`rsvp-frontend`
- עדכן את `NEXT_PUBLIC_APP_URL` שוב ל-URL החדש

---

## ✅ סיכום:

1. ✅ **גלול למטה** עד הסוף
2. ✅ **לחץ "Deploy Web Service"**
3. ⏳ **המתן 5-10 דקות** לבנייה
4. ✅ **בדוק את האתר** ב-URL החדש
5. ✅ **עדכן את NEXT_PUBLIC_APP_URL** ל-URL החדש

**זה הכל! פשוט לחץ על "Deploy Web Service"!** 🚀

---

## אם יש בעיות:

### Build נכשל?
- בדוק את ה-Logs
- ודא שה-Build Command נכון: `npm install --legacy-peer-deps && npm run build`

### השירות לא נטען?
- בדוק את ה-Logs
- נסה Hard Refresh (`Ctrl + Shift + R`)

**הכל אמור לעבוד!** 🎉
