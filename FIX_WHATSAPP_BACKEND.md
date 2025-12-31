# 🔧 תיקון whatsapp-backend ב-Render

## הבעיה:
Render מנסה להריץ `npm run build` על `whatsapp-backend`, אבל:
- `whatsapp-backend` הוא Node.js Express server
- אין לו build command - הוא רק צריך `node server.js`
- `package.json` של `whatsapp-backend` לא מכיל `build` script

## הפתרון:

### שלב 1: לך ל-Render Dashboard
1. פתח https://dashboard.render.com
2. בחר את השירות **`whatsapp-backend`**

### שלב 2: עדכן את ה-Build Command
1. לחץ על **"Settings"**
2. מצא את **"Build Command"**
3. שנה אותו ל:
   ```
   npm install
   ```
   (או השאר ריק - לא צריך build command)

### שלב 3: בדוק את ה-Start Command
1. מצא את **"Start Command"**
2. ודא שזה:
   ```
   npm start
   ```
   או:
   ```
   node server.js
   ```

### שלב 4: בדוק את ה-Root Directory
1. מצא את **"Root Directory"**
2. ודא שזה:
   ```
   whatsapp-backend
   ```

### שלב 5: שמור והפעל מחדש
1. לחץ **"Save Changes"**
2. לחץ **"Manual Deploy"** → **"Deploy latest commit"**

## ✅ מה צריך להיות:

**Build Command:** `npm install` (או ריק)
**Start Command:** `npm start` (או `node server.js`)
**Root Directory:** `whatsapp-backend`

## ⚠️ חשוב:
`whatsapp-backend` הוא **Node.js server** - לא צריך build, רק `npm install` ואז `npm start`.
