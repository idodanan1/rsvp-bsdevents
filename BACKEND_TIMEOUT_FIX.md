# ⚠️ Backend לא מגיב - תיקון מהיר

## הבעיה:

ה-Frontend מנסה להתחבר ל-Backend אבל מקבל `TimeoutError`.

---

## הפתרון:

### שלב 1: בדוק שה-Backend רץ ב-Render

1. **לך ל-Render Dashboard**
2. **לחץ על `whatsapp-backend`**
3. **בדוק את הסטטוס:**
   - ✅ **"Live"** → ה-Backend רץ
   - ❌ **"Stopped"** או **"Failed"** → צריך להפעיל אותו

### שלב 2: אם ה-Backend לא רץ

1. **לחץ על "Manual Deploy"** → **"Deploy latest commit"**
2. **המתן 2-3 דקות** עד שהבנייה מסתיימת
3. **בדוק שהסטטוס הוא "Live"**

### שלב 3: בדוק את ה-Logs

1. **לחץ על "Logs"** ב-Render Dashboard
2. **בדוק שאין שגיאות**
3. **אמור להיות: `🚀 WhatsApp Backend running on port 3002`**

---

## אם ה-Backend רץ אבל עדיין לא מגיב:

1. **בדוק את ה-Webhook URL:**
   - אמור להיות: `https://whatsapp-backend-enfz.onrender.com/api/whatsapp/webhook`

2. **בדוק את ה-Environment Variables:**
   - כל המשתנים מוגדרים נכון?

3. **אם עדיין לא עובד:**
   - שלח לי את ה-Logs מה-Backend

---

**לך ל-Render Dashboard ובדוק את הסטטוס של `whatsapp-backend`!**

