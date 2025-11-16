# 🚀 פריסה לאוויר - הוראות פשוטות

## מה זה אומר "להעלות לאוויר"?

זה אומר שהמערכת שלך תהיה נגישה דרך האינטרנט, עם כתובת קבועה (כמו www.example.com).

## למה צריך את זה?

כרגע המערכת רץ רק על המחשב שלך (localhost). כדי שה-webhook יעבוד, צריך URL קבוע באינטרנט.

## איך עושים את זה? (3 שלבים פשוטים)

### שלב 1: העלה את הקוד ל-GitHub

1. היכנס ל-[GitHub](https://github.com/)
2. לחץ על הכפתור הירוק **"New"** (בפינה הימנית העליונה)
3. שם: `rsvp-system` (או כל שם אחר)
4. בחר **"Private"**
5. לחץ **"Create repository"**

### שלב 2: העלה את הקבצים

פתח PowerShell בתיקייה של הפרויקט והרץ:

```powershell
git add .
git commit -m "Ready for deployment"
git branch -M main
git remote add origin https://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@github.com/YOUR_USERNAME/rsvp-system.git
git push -u origin main
```

**חשוב:** החלף `YOUR_USERNAME` בשם המשתמש שלך ב-GitHub!

### שלב 3: פרוס ב-Render

1. היכנס ל-[Render](https://render.com/)
2. לחץ **"Sign Up"** (חינמי)
3. בחר **"Sign up with GitHub"**
4. הרשא ל-Render לגשת ל-repositories שלך
5. לחץ **"New"** → **"Blueprint"**
6. בחר את ה-repository שיצרת (`rsvp-system`)
7. Render יפרס הכל אוטומטית!

## מה תקבל?

לאחר הפריסה, תקבל 2 כתובות:
- **Frontend**: `https://rsvp-frontend.onrender.com`
- **Backend**: `https://whatsapp-backend.onrender.com`

## מה לעשות אחרי הפריסה?

1. עדכן את ה-Webhook במטה:
   - Callback URL: `https://whatsapp-backend.onrender.com/api/whatsapp/webhook`
2. הוסף Environment Variables ב-Render:
   - `WHATSAPP_ACCESS_TOKEN` = ה-token שלך
   - `WHATSAPP_PHONE_NUMBER_ID` = 874204535776090

## ✅ סיימת!

עכשיו המערכת באוויר עם URL קבוע!

