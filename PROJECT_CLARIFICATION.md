# הבהרת הפרויקט - מה הפרויקט הנכון?

## יש שני פרויקטים בתיקייה:

### 1. React Router + Vite (הפרויקט הנכון - rsvp-frontend) ✅
- **Entry point**: `src/main.tsx`
- **HTML**: `index.html`
- **Components**: `src/components/`
- **Store**: `src/store/`
- **App**: `src/App.tsx` (HashRouter)
- **זה הפרויקט שרץ ב-Render!**

### 2. Next.js (לא בשימוש) ❌
- **Entry point**: `app/page.tsx`
- **Components**: `app/`, `components/`
- **לא בשימוש - זה רק קבצים ישנים**

## מה צריך לעבוד עליו:

✅ **רק** `src/components/Dashboard.tsx` - זה הפרויקט הנכון
✅ **רק** `src/store/eventStore.ts` - זה הפרויקט הנכון
✅ **רק** `src/App.tsx` - זה הפרויקט הנכון

❌ **לא** `app/` - זה Next.js, לא בשימוש
❌ **לא** `components/dashboard/` - זה Next.js, לא בשימוש

## מה תוקן:

✅ כפתור "טען מהמאגר" ב-`src/components/Dashboard.tsx` - **זה הפרויקט הנכון!**

## איך להעלות:

```cmd
git add src/components/Dashboard.tsx
git add package.json
git commit -m "feat: הוספת כפתור טען מהמאגר בדשבורד"
git push
```

## סיכום:

הפרויקט הנכון הוא **React Router** (`src/`), לא Next.js (`app/`).
כל השינויים צריכים להיות ב-`src/` בלבד!
