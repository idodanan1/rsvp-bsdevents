# הגדרת GitHub לפריסה

## שלב 1: יצירת Repository ב-GitHub

1. היכנס ל-[GitHub](https://github.com/)
2. לחץ על **"+"** → **"New repository"**
3. שם: `rsvp-management-system` (או כל שם אחר)
4. בחר **"Private"** (מומלץ)
5. לחץ **"Create repository"**

## שלב 2: חיבור ל-Repository המקומי

פתח טרמינל בתיקייה הראשית והרץ:

```bash
git init
git add .
git commit -m "Initial commit - ready for deployment"
git branch -M main
git remote add origin https://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@github.com/YOUR_USERNAME/YOUR_REPO.git
git push -u origin main
```

**חשוב:** החלף:
- `YOUR_USERNAME` = שם המשתמש שלך ב-GitHub
- `YOUR_REPO` = שם ה-repository שיצרת

## שלב 3: פריסה ב-Render

1. היכנס ל-[Render](https://render.com/)
2. לחץ **"Sign Up"** (חינמי)
3. בחר **"Sign up with GitHub"**
4. הרשא ל-Render לגשת ל-repositories שלך
5. לחץ **"New"** → **"Blueprint"**
6. בחר את ה-repository שיצרת
7. Render יזהה את `render.yaml` ויפרס הכל אוטומטית!

## שלב 4: הוסף Environment Variables

ב-Render Dashboard, עבור ל-Backend service והוסף:

```
WHATSAPP_ACCESS_TOKEN=your_token_here
WHATSAPP_PHONE_NUMBER_ID=874204535776090
```

## ✅ סיימת!

המערכת עכשיו באוויר!

