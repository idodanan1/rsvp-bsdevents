# 🧪 איך לבדוק את החיבור ל-WhatsApp Business API

## 📋 שיטות לבדיקת החיבור

### שיטה 1: סקריפט אוטומטי (מומלץ) ⭐

1. **פתח טרמינל** בתיקיית הפרויקט
2. **הרץ את הסקריפט:**
   ```bash
   node test-whatsapp-connection.js
   ```

הסקריפט יבדוק:
- ✅ Phone Number ID תקין
- ✅ Access Token תקין
- ✅ שליחת הודעה עם תבנית `hello_world`
- ✅ שליחת הודעה עם תבנית `aa` (אם קיימת)

### שיטה 2: בדיקה דרך הדפדפן

1. **פתח את האפליקציה** (`npm run dev`)
2. **פתח את הקונסול** (F12)
3. **לך לדף ניהול אירוע**
4. **נסה לשלוח הודעה** לאורח
5. **בדוק את הלוגים** בקונסול

**מה לחפש:**
- ✅ `✅ WhatsApp sent successfully!` - הכל תקין
- ❌ `❌ WhatsApp API error: ...` - יש בעיה

### שיטה 3: בדיקה ישירה דרך Meta Business Manager

1. **לך ל:** https://developers.facebook.com/
2. **בחר את האפליקציה שלך**
3. **לך ל:** WhatsApp > API Setup
4. **בדוק:**
   - ✅ Phone Number ID מוצג
   - ✅ Access Token פעיל
   - ✅ התבניות מאושרות

## 🔍 איפה למצוא את ההגדרות

### Access Token
1. **לך ל:** https://developers.facebook.com/
2. **בחר את האפליקציה שלך**
3. **לך ל:** WhatsApp > API Setup
4. **העתק את ה-Temporary access token** (או System User Token)

### Phone Number ID
1. **לך ל:** https://developers.facebook.com/
2. **בחר את האפליקציה שלך**
3. **לך ל:** WhatsApp > API Setup
4. **העתק את ה-Phone number ID**

או:

1. **לך ל:** https://business.facebook.com/
2. **לך ל:** Settings > Business assets > WhatsApp accounts
3. **בחר את החשבון שלך**
4. **העתק את ה-Phone number ID**

## 🚨 פתרון בעיות נפוצות

### שגיאה 100: Invalid parameter
**פתרון:**
- בדוק שה-Phone Number ID נכון
- בדוק שה-Access Token תקין
- ודא שהמספר מחובר ל-WhatsApp Business Account

### שגיאה 190: Invalid access token
**פתרון:**
- בדוק שה-Access Token נכון
- אם זה Temporary Token, הוא פג אחרי 24 שעות - צור חדש
- ודא שהטוקן יש לו הרשאות לשלוח הודעות

### שגיאה 131047: Cannot send message
**פתרון:**
- זה נורמלי למספרים חדשים
- המשתמש צריך לשלוח לך הודעה קודם
- או להשתמש בתבנית מאושרת (Template)

### שגיאה 132001: Template not found
**פתרון:**
- התבנית לא קיימת או לא מאושרת
- בדוק ב-Meta Business Manager שהתבנית קיימת
- המתן לאישור התבנית (יכול לקחת כמה שעות)

## 📝 עדכון ההגדרות

אם צריך לעדכן את ההגדרות:

1. **עדכן את קובץ `.env`** (אם קיים):
   ```env
   VITE_WHATSAPP_ACCESS_TOKEN=YOUR_NEW_TOKEN
   VITE_WHATSAPP_PHONE_NUMBER_ID=YOUR_NEW_ID
   ```

2. **או עדכן ישירות בקוד** (`src/services/whatsappService.ts`):
   ```typescript
   private accessToken = 'YOUR_NEW_TOKEN';
   private phoneNumberId = 'YOUR_NEW_ID';
   ```

3. **הפעל מחדש** את האפליקציה (`npm run dev`)

## ✅ בדיקה מהירה

לבדיקה מהירה, הרץ:
```bash
node test-whatsapp-connection.js
```

אם הכל תקין, תראה:
```
✅ Phone Number ID תקין!
✅ הודעה נשלחה בהצלחה!
🎉 כל הבדיקות הושלמו!
```

אם יש שגיאה, תראה הודעת שגיאה מפורטת עם פתרון.

