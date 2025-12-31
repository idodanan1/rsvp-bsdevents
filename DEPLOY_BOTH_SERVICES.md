# 🚀 פריסת שני השירותים ב-Render

## ✅ יש לך שני שירותים:

### 1. **rsvp-frontend** (Frontend)
- **סוג:** Web Service או Static Site
- **URL:** `https://rsvp-frontend.onrender.com`
- **תפקיד:** הממשק של המשתמש (React Router)

### 2. **whatsapp-backend** (Backend)
- **סוג:** Web Service
- **URL:** `https://whatsapp-backend.onrender.com` (או עם סיומת אחרת)
- **תפקיד:** API לניהול אירועים, אורחים, WhatsApp

---

## 🔗 חיבור בין השירותים:

### Frontend צריך לדעת את ה-URL של Backend:

1. **ב-Render Dashboard:**
   - בחר את `rsvp-frontend`
   - לך ל-**Environment** tab
   - הוסף/עדכן את המשתנה:
     ```
     VITE_BACKEND_URL=https://whatsapp-backend.onrender.com
     ```
     (החלף ב-URL האמיתי של `whatsapp-backend` שלך)

2. **או ב-`render.yaml`:**
   - עדכן את `render.yaml` עם ה-URL הנכון

---

## 📋 מה לעשות עכשיו:

### שלב 1: תיקון package.json
```cmd
fix-package-json.bat
```

### שלב 2: בדוק את ה-URL של whatsapp-backend
1. פתח https://dashboard.render.com
2. בחר את `whatsapp-backend`
3. העתק את ה-URL (כמו `https://whatsapp-backend-xxxx.onrender.com`)

### שלב 3: עדכן את rsvp-frontend
1. בחר את `rsvp-frontend`
2. לך ל-**Environment** tab
3. הוסף/עדכן:
   ```
   VITE_BACKEND_URL=<העתק את ה-URL של whatsapp-backend>
   ```
4. לחץ **Save Changes**
5. Render יבנה מחדש אוטומטית

---

## ✅ סיכום:

- **rsvp-frontend** - Frontend (React Router)
- **whatsapp-backend** - Backend (API)
- **חיבור:** דרך `VITE_BACKEND_URL` environment variable

הכל מוכן! רק צריך להעלות את הקוד ולוודא שה-URLs נכונים.
