# שמירת מצב נוכחי - תיקון עדכון ידני של guestCount מהטבלה

## תאריך: 22 בדצמבר 2025

## תיאור התיקון
תוקנה בעיה שבה עדכון ידני של `guestCount` דרך הטבלה לא עבד (שגיאה "לא נמצא אירוע פעיל") ולא נשמר אחרי רענון.

## קבצים ששונו:

### 1. `src/components/EventManagement.tsx`
**שינוי עיקרי:** תיקון `handleUpdateGuestField` כך שהוא מחפש את האירוע גם ב-`events` array אם `currentEvent` הוא `null`.

**קוד שנוסף:**
```typescript
const state = useEventStore.getState();
// CRITICAL: Try to get event from currentEvent first, then from events array
let event = state.currentEvent;
if (!event || !event.id) {
  // If currentEvent is not set, try to find event from events array using the URL
  const eventId = id; // Get eventId from URL params
  if (eventId) {
    event = state.events.find(e => e.id === eventId);
  }
}
```

### 2. `src/store/eventStore.ts`
**שינוי עיקרי 1:** הוספתי שליחה ישירה ל-`/api/events/:eventId/guests` כדי שהעדכון הידני יישמר בקבצים, בנוסף לשליחה ל-`/api/guests/add-pending-update`.

**קוד שנוסף:**
```typescript
// CRITICAL: Also update directly via /api/events/:eventId/guests to ensure persistence
// This is especially important for manual_update to ensure it's saved in files
if (updates.guestCount !== undefined || updates.source === 'manual_update') {
  // ... שליחה ישירה לשרת ...
}
```

**שינוי עיקרי 2:** שיפרתי את הלוגיקה בטעינת נתונים מהשרת כך שאם הערך מה-API הוא מ-`manual_update`, הקוד משתמש בו (מייצג את המצב השמור בשרת).

**קוד שנוסף:**
```typescript
// CRITICAL: If API has manual_update, use it if it's newer or equal (manual update from table was saved to server)
if (isApiFromManual && g.guestCount !== undefined) {
  const existingDate = existingGuest.responseDate ? new Date(existingGuest.responseDate).getTime() : 0;
  const apiDate = g.responseDate ? new Date(g.responseDate).getTime() : 0;
  
  // If API manual update is newer or equal, use it (it was saved to server from table edit)
  // CRITICAL: Always prefer API manual_update if it exists, as it represents the saved state
  if (apiDate >= existingDate || !isExistingFromManual) {
    console.log(`✅ Using manual_update guestCount from API: ${g.guestCount} (overriding local: ${existingGuest.guestCount}, API is ${apiDate >= existingDate ? 'newer or equal' : 'from server'})`);
    return {
      ...g,
      firstName: cleanName(g.firstName),
      lastName: cleanName(g.lastName),
      // CRITICAL: Use API data for manual_update (represents saved state from server)
      guestCount: g.guestCount,
      source: g.source,
      responseDate: g.responseDate
    };
  }
}
```

## תוצאה:
✅ עכשיו עדכון ידני של `guestCount` דרך הטבלה עובד גם אם `currentEvent` הוא `null`
✅ העדכון הידני נשמר בשרת בקבצים
✅ אחרי רענון, העדכון הידני נטען מהשרת ומוצג בטבלה

## איך לחזור למצב זה:
1. אם יש בעיה בעתיד, ניתן לחזור ל-commit זה
2. **Tag:** `manual-guestcount-fix-stable`
3. **Commit hash:** `9a52f3b` (תיעוד) + `33cdb3d` (תיקון)

### פקודות לחזרה למצב זה:
```bash
# לחזור ל-commit זה:
git checkout 9a52f3b

# או לחזור ל-tag:
git checkout manual-guestcount-fix-stable

# ליצור branch חדש מהמצב הזה:
git checkout -b restore-manual-guestcount-fix manual-guestcount-fix-stable
```

## הערות:
- התיקון מבטיח שעדכונים ידניים מהטבלה תמיד נשמרים בשרת
- התיקון מבטיח שכשטוענים מהשרת, עדכונים ידניים נטענים נכון
- התיקון לא משפיע על עדכונים מ-`guest_link` - הם עדיין עובדים כפי שצריך

