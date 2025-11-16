# 📋 הוראות לפריסת Blueprint ב-Render

## אתה ב: https://dashboard.render.com/blueprint/new

זה המסך לפריסת Blueprint מ-render.yaml

---

## מה לעשות:

### 1. Blueprint Name (שדה חובה)
- **לחץ על השדה הריק** (מסומן באדום)
- **כתוב:** `rsvp-system`
- (או כל שם אחר שאתה רוצה, למשל: `my-rsvp-app`)

### 2. Repository (חשוב!)
- **לחץ על "Select Repository"** או **"Connect GitHub"**
- **בחר:** `idodanan1/-rsvp-management-system`
- **אם אתה לא רואה אותו:**
  - לחץ על **"Connect GitHub"** או **"Authorize Render"**
  - הרשא ל-Render לגשת ל-repositories שלך
  - נסה שוב לבחור את ה-repository

### 3. Branch
- **כבר מוגדר ל-`main`**
- **זה בסדר - אל תשנה את זה!**

### 4. Review Configurations
- תראה 2 שירותים שייווצרו:
  - ✅ **whatsapp-backend** (השרת)
  - ✅ **rsvp-frontend** (הממשק)
- **זה בסדר - זה מה שאנחנו רוצים!**

### 5. Deploy Blueprint
- **גלול למטה** למסך
- **לחץ על הכפתור הכחול "Deploy Blueprint"**
- **המתן 5-10 דקות** - Render יתחיל לבנות ולהריץ את המערכת

---

## ⏱️ מה קורה אחרי שלוחצים "Deploy Blueprint":

1. **Render יתחיל לבנות** את המערכת
   - זה יקח 5-10 דקות
   - תראה הודעות התקדמות

2. **תראה הודעות כמו:**
   - "Building..." (בונה)
   - "Deploying..." (מפרס)
   - "Live" ✅ (פעיל)

3. **אחרי שהפריסה מסתיימת:**
   - תקבל 2 כתובות:
     - **Frontend:** `https://rsvp-frontend.onrender.com` (הממשק שלך!)
     - **Backend:** `https://whatsapp-backend.onrender.com` (השרת)

---

## ❓ בעיות נפוצות:

### "I don't see my repository"
- לחץ על **"Connect GitHub"** או **"Authorize Render"**
- הרשא ל-Render לגשת ל-repositories שלך
- ודא שהקוד ב-GitHub: https://github.com/idodanan1/-rsvp-management-system

### "Blueprint Name is required"
- ודא שמילאת את השדה "Blueprint Name"
- כתוב: `rsvp-system` (או כל שם אחר)

### "I don't see 'Deploy Blueprint' button"
- גלול למטה - הכפתור בתחתית המסך
- ודא שמילאת את כל השדות הנדרשים

---

## 💡 טיפים:

- **אל תסגור את הדף** בזמן שהפריסה רצה
- **זה יקח 5-10 דקות** - זה נורמלי
- **אם יש שגיאה**, תראה אותה במסך - תגיד לי ואני אעזור

---

## 📞 אחרי שהפריסה מסתיימת:

תגיד לי:
- האם הפריסה הצליחה?
- מה הכתובות שקיבלת?
- או אם יש בעיה כלשהי

ואני אעזור לך עם השלבים הבאים (הוספת Tokens ועדכון Webhook)!

