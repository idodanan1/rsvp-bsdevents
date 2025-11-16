# 🚀 פריסה לאוויר - הוראות מהירות

## ⚡ פריסה מהירה ב-Render (5 דקות)

### שלב 1: העלה ל-GitHub

```bash
git add .
git commit -m "Ready for deployment"
git push origin main
```

### שלב 2: פרוס ב-Render

1. היכנס ל-[Render](https://render.com/)
2. לחץ **"Sign Up"** (חינמי)
3. חבר את ה-GitHub account
4. לחץ **"New"** → **"Blueprint"**
5. בחר את ה-repository שלך
6. Render יזהה את `render.yaml` ויפרס הכל אוטומטית!

### שלב 3: הוסף Environment Variables

לאחר הפריסה, הוסף ב-Render Dashboard:

**Backend:**
- `WHATSAPP_ACCESS_TOKEN` = ה-token שלך
- `WHATSAPP_PHONE_NUMBER_ID` = 874204535776090

**Frontend:**
- `VITE_BACKEND_URL` = ה-URL של ה-Backend (יתעדכן אוטומטית)

### שלב 4: עדכן Webhook במטה

לאחר הפריסה, תקבל URL קבוע. עדכן במטה:
- Callback URL: `https://your-backend-url.onrender.com/api/whatsapp/webhook`

## ✅ סיימת!

המערכת עכשיו באוויר עם URL קבוע!

## 📋 מה קיבלת:

- ✅ Frontend: `https://rsvp-frontend.onrender.com`
- ✅ Backend: `https://whatsapp-backend.onrender.com`
- ✅ Webhook קבוע (לא צריך ngrok יותר!)

## 🔧 אם יש בעיות:

1. בדוק את ה-logs ב-Render Dashboard
2. ודא שה-Environment Variables מוגדרים נכון
3. בדוק שה-Webhook URL במטה תואם ל-Backend URL

