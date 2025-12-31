# 🆕 יצירת שירות חדש ב-Render

## הגדרות שירות:

### שם השירות:
```
rsvp-frontend
```

### Root Directory:
```
.
```
(נקודה אחת - התיקייה הראשית)

### Environment:
```
Node
```

### Branch:
```
main
```

### Build Command:
```
npm install --legacy-peer-deps && npm run build
```

### Start Command:
```
npm start
```

### Plan:
בחר את התוכנית שלך (Starter / Standard / Pro)

---

## Environment Variables להוספה:

### 1. NODE_ENV
```
Key: NODE_ENV
Value: production
```

### 2. NEXT_PUBLIC_SUPABASE_URL
```
Key: NEXT_PUBLIC_SUPABASE_URL
Value: [הדבק את הערך ששמרת]
```

### 3. NEXT_PUBLIC_SUPABASE_ANON_KEY
```
Key: NEXT_PUBLIC_SUPABASE_ANON_KEY
Value: [הדבק את הערך ששמרת]
```

### 4. VITE_BACKEND_URL
```
Key: VITE_BACKEND_URL
Value: [הדבק את הערך ששמרת]
```

### 5. NEXT_PUBLIC_APP_URL
```
Key: NEXT_PUBLIC_APP_URL
Value: [הדבק את הערך ששמרת]
```

---

## שלבים:

1. **לך ל-Render Dashboard:**
   - https://dashboard.render.com
   - לחץ "New" → "Web Service"

2. **בחר Repository:**
   - `idodanan1/-rsvp-management-system`

3. **הזן את ההגדרות למעלה**

4. **הוסף את כל ה-Environment Variables**

5. **לחץ "Create Web Service"**

6. **המתן לבנייה (5-10 דקות)**

7. **בדוק את האתר**

---

## ⚠️ חשוב:

- **שמור את כל ה-Environment Variables לפני שתמחק את השירות הישן!**
- **ודא שה-Build Command נכון: `npm install --legacy-peer-deps && npm run build`**
- **ודא שה-Start Command נכון: `npm start`**

---

**ראה `RESET_RENDER_STEP_BY_STEP.md` למדריך מפורט יותר!**
