# תיקון WhatsApp Access Token

## הבעיה

השגיאה `401 Unauthorized` עם ההודעה `Invalid OAuth access token - Cannot parse access token` מצביעה על כך שה-`WHATSAPP_ACCESS_TOKEN` ב-Render לא תקין או לא מוגדר נכון.

מהלוגים:
- `🔍 DEBUG: Access Token length: 9` - ה-token קצר מדי (אמור להיות 200+ תווים)
- `Authorization: 'Bearer (  -Meta)'` - ה-token לא תקין
- `Token preview: "(הטוקן שלך מ-Meta)"` - ה-token מכיל טקסט placeholder במקום טוקן אמיתי
- `Token seems too short (18 chars)` - ה-token קצר מדי (אמור להיות 200+ תווים)

## פתרון

### אפשרות 1: העתקת Token מהפרונטאנד (הכי פשוט!)

אם ההודעות האחרות עובדות, זה אומר שיש לך טוקן תקין ב-`VITE_WHATSAPP_ACCESS_TOKEN` בפרונטאנד:

1. היכנס ל-[Render Dashboard](https://dashboard.render.com/)
2. בחר את השירות של **הפרונטאנד** (rsvp-frontend או דומה)
3. לחץ על **Environment**
4. מצא את `VITE_WHATSAPP_ACCESS_TOKEN` והעתק את הערך
5. עבור לשירות **הבאקאנד** (whatsapp-backend) → **Environment**
6. עדכן את `WHATSAPP_ACCESS_TOKEN` לערך שהעתקת
7. שמור והפעל מחדש את הבאקאנד

### שלב 1: קבלת Token חדש מ-Meta Business Manager (אם אין לך טוקן תקין)

1. היכנס ל-[Meta Business Manager](https://business.facebook.com/)
2. בחר את ה-App שלך → **WhatsApp** → **API Setup**
3. מצא את **"Temporary access token"** או **"Permanent access token"**
4. העתק את ה-Token (הוא צריך להיות ארוך מאוד, 200+ תווים, ולהתחיל ב-`EAA...`)

### שלב 2: עדכון ה-Token ב-Render (אם יצרת טוקן חדש)

1. היכנס ל-[Render Dashboard](https://dashboard.render.com/)
2. בחר את השירות **whatsapp-backend**
3. לחץ על **Environment** בתפריט השמאלי
4. מצא את המשתנה `WHATSAPP_ACCESS_TOKEN`
5. לחץ על **Edit** או **Update**
6. **הסר את הטקסט הקיים** (אם יש טקסט כמו "(הטוקן שלך מ-Meta)" או placeholder אחר)
7. הדבק את ה-Token החדש (ודא שאין רווחים או תווים מיוחדים בתחילת/סוף)
8. **ודא שהטוקן מתחיל ב-`EAA...`** (לא טקסט אחר)
9. לחץ על **Save Changes**
10. הפעל מחדש את השירות (Render יעשה זאת אוטומטית)

### שלב 3: אימות התיקון

1. בדוק את הלוגים ב-Render אחרי ההפעלה מחדש
2. צריך לראות:
   ```
   🔑 WhatsApp Access Token: Set (XXX chars, preview: "EAA...")
   ```
3. אם ה-Token תקין, אורך ה-Token צריך להיות 200+ תווים
4. נסה ללחוץ על כפתור ב-WhatsApp - ההודעה האוטומטית צריכה להישלח בהצלחה

## בדיקות נוספות

אם עדיין יש בעיה:

1. **ודא שאין רווחים**: ה-Token צריך להיות ללא רווחים בתחילתו או בסופו
2. **ודא שהעתקת את כל ה-Token**: ה-Token ארוך מאוד, ודא שהעתקת את כולו
3. **בדוק את תוקף ה-Token**: אם זה Temporary Token, הוא עלול לפג תוקף. השתמש ב-Permanent Token
4. **בדוק הרשאות**: ודא שה-Token יש לו הרשאות לשלוח הודעות WhatsApp

## הערות

- ה-Token צריך להתחיל ב-`EAA...` (או `EAAG...` לגרסאות חדשות יותר)
- ה-Token צריך להיות ארוך מאוד (200+ תווים)
- אין להשתמש ב-Token ישן או פג תוקף
- אם ה-Token פג תוקף, צריך ליצור אחד חדש מ-Meta Business Manager

