# שמירת מצב נוכחי - תיקון עדכון guestCount מ-guest_link

## תאריך: 22 בדצמבר 2025

## תיאור התיקון
תוקנה בעיה שבה עדכוני `guestCount` מדף האורח (`guest_link`) לא התעדכנו בטבלה לאחר טעינה מהשרת.

## קבצים ששונו:

### 1. `src/store/eventStore.ts`
**שינוי עיקרי:** הוספתי בדיקה בטעינת נתונים מהשרת - אם הערך מה-API הוא מ-`guest_link`, הקוד משתמש בערך מה-API במקום לשמור את הערך הישן מ-local state.

**קוד שנוסף:**
```typescript
// CRITICAL: If API has guest_link update, ALWAYS use it (direct user input from guest response page)
if (isApiFromGuestLink && g.guestCount !== undefined) {
  console.log(`✅ Using guest_link guestCount from API: ${g.guestCount} (overriding local: ${existingGuest.guestCount})`);
  return {
    ...g,
    firstName: cleanName(g.firstName),
    lastName: cleanName(g.lastName),
    // CRITICAL: Use API data for guest_link updates
    guestCount: g.guestCount,
    source: g.source,
    responseDate: g.responseDate
  };
}
```

### 2. `whatsapp-backend/server.js`
**שינוי עיקרי:** הוספתי לוגים לבדיקת `guestCount` במהלך המיזוג בשרת.

**קוד שנוסף:**
```javascript
// CRITICAL: Verify guestCount was updated correctly
if (append && guests.length > 0) {
  const updatedGuest = guests[0];
  const savedGuest = finalGuests.find(g => g.id === updatedGuest.id);
  if (savedGuest) {
    console.log(`✅ VERIFIED: Guest ${savedGuest.id} (${savedGuest.firstName} ${savedGuest.lastName}) guestCount saved as: ${savedGuest.guestCount} (incoming was: ${updatedGuest.guestCount})`);
    if (savedGuest.guestCount !== updatedGuest.guestCount) {
      console.error(`❌ GUEST COUNT MISMATCH! Saved: ${savedGuest.guestCount}, Incoming: ${updatedGuest.guestCount}`);
    }
  }
}
```

## תוצאה:
✅ עכשיו כשדף האורח מעלה נתונים לשרת, הטבלה טוענת את הנתונים המעודכנים מהשרת ומציגה אותם נכון.

## איך לחזור למצב זה:
1. אם יש בעיה בעתיד, ניתן לחזור ל-commit זה
2. **Tag:** `guest-count-fix-stable`
3. **Commit hash:** `e40f0e0`
4. **Commit message:** "Fix guestCount update from guest_link - now displays correctly in table after server load"

### פקודות לחזרה למצב זה:
```bash
# לחזור ל-commit זה:
git checkout e40f0e0

# או לחזור ל-tag:
git checkout guest-count-fix-stable

# ליצור branch חדש מהמצב הזה:
git checkout -b restore-guest-count-fix guest-count-fix-stable
```

## הערות:
- התיקון מבטיח שעדכונים מ-`guest_link` (קלט ישיר מהאורח) תמיד יוצגו בטבלה
- התיקון לא משפיע על עדכונים ידניים (`manual_update`) - הם עדיין נשמרים כפי שצריך

