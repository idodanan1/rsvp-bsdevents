# 🔑 איך להשיג Access Token קבוע ל-WhatsApp Business API

## 📋 שלבים לקבלת Access Token קבוע

### שלב 1: התחבר ל-Facebook Developer Console
1. לך ל: **https://developers.facebook.com/**
2. התחבר עם החשבון שלך (אותו חשבון שמחובר ל-WhatsApp Business)
3. לחץ על **"My Apps"** בתפריט העליון

### שלב 2: בחר את האפליקציה שלך
1. מצא את האפליקציה שלך ברשימה (או צור חדשה)
2. לחץ על האפליקציה כדי לפתוח את הדשבורד

### שלב 3: הוסף WhatsApp Product (אם עדיין לא)
1. בדשבורד, לחץ על **"Add Product"** או **"+"**
2. מצא את **"WhatsApp"** ברשימה
3. לחץ על **"Set Up"**

### שלב 4: קבל Access Token

#### אופציה A: Temporary Token (זמני - 24 שעות)
1. לך ל: **WhatsApp > API Setup** בתפריט השמאלי
2. תחת **"Temporary access token"**, לחץ על **"Generate Token"**
3. העתק את ה-Token (זה token זמני שפוג אחרי 24 שעות)

#### אופציה B: System User Token (קבוע - מומלץ!) ⭐
זה ה-Token הקבוע שאתה צריך:

1. לך ל: **Business Settings** (בתפריט העליון)
2. לחץ על **"System Users"** בתפריט השמאלי
3. לחץ על **"Add"** ליצירת System User חדש
4. תן שם (למשל: "WhatsApp API User")
5. בחר **"Admin"** או **"Developer"** כ-Role
6. לחץ **"Create System User"**
7. לחץ על ה-System User שיצרת
8. לחץ על **"Generate New Token"**
9. בחר את האפליקציה שלך
10. בחר את ה-Permissions הבאים:
    - `whatsapp_business_messaging`
    - `whatsapp_business_management`
    - `whatsapp_business_analytics` (אופציונלי)
11. לחץ **"Generate Token"**
12. **⚠️ חשוב!** העתק את ה-Token מיד - הוא יופיע רק פעם אחת!
13. ה-Token הזה יהיה תקף עד שתמחק אותו או עד שתשנה את ההרשאות

### שלב 5: קבל Phone Number ID
1. לך חזרה ל: **WhatsApp > API Setup**
2. תחת **"From"**, תראה את מספר הטלפון שלך
3. לחץ על **"Show"** ליד **"Phone number ID"**
4. העתק את ה-Phone Number ID (זה המספר: `825735800624198`)

### שלב 6: עדכן את הקוד

#### אופציה 1: קובץ .env (מומלץ - לא נשמר ב-Git)
1. צור קובץ `.env` בתיקיית הפרויקט (אם עדיין לא קיים)
2. הוסף את השורות הבאות:
```env
# WhatsApp Business API Configuration
VITE_WHATSAPP_API_URL=http://localhost:3002/api/whatsapp
VITE_WHATSAPP_ACCESS_TOKEN=YOUR_NEW_ACCESS_TOKEN_HERE
VITE_WHATSAPP_PHONE_NUMBER_ID=825735800624198
```

3. החלף את `YOUR_NEW_ACCESS_TOKEN_HERE` ב-Token שקיבלת

#### אופציה 2: עדכון ישיר בקוד (לא מומלץ - רק לבדיקות)
אם אתה רוצה לעדכן ישירות בקוד (לא מומלץ לפרודקשן):

1. פתח את הקובץ: `src/services/whatsappService.ts`
2. מצא את השורה:
```typescript
private accessToken = import.meta.env.VITE_WHATSAPP_ACCESS_TOKEN || 'YOUR_OLD_TOKEN';
```
3. החלף את `YOUR_OLD_TOKEN` ב-Token החדש

4. פתח את הקובץ: `whatsapp-backend/server.js`
5. מצא את השורה:
```javascript
process.env.WHATSAPP_ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN || 'YOUR_OLD_TOKEN';
```
6. החלף את `YOUR_OLD_TOKEN` ב-Token החדש

### שלב 7: הפעל מחדש את השרתים
1. עצור את השרתים (Ctrl+C)
2. הפעל מחדש:
   - Frontend: `npx vite --host 0.0.0.0 --port 5173`
   - Backend: `cd whatsapp-backend && node server.js`

## ✅ איך לבדוק שהכל עובד

1. פתח את הדפדפן
2. פתח את הקונסול (F12)
3. שלח הודעה לאורח
4. חפש בקונסול:
   - ✅ `✅ WhatsApp Business API sent successfully!` - הכל עובד!
   - ❌ `401 Unauthorized` - ה-Token לא תקין או פג תוקף

## 🔄 איך לחדש Token שפג תוקף

אם ה-Token פג תוקף:

1. לך ל: **Business Settings > System Users**
2. לחץ על ה-System User שלך
3. לחץ על **"Generate New Token"**
4. בחר את האפליקציה וההרשאות
5. העתק את ה-Token החדש
6. עדכן את הקוד או את קובץ `.env`
7. הפעל מחדש את השרתים

## 💡 טיפים חשובים

1. **System User Token** הוא הקבוע ביותר - השתמש בו!
2. **Temporary Token** פוג אחרי 24 שעות - לא מומלץ לפרודקשן
3. **שמור את ה-Token במקום בטוח** - הוא יופיע רק פעם אחת!
4. **אל תעלה את ה-Token ל-Git** - השתמש בקובץ `.env` (שנמצא ב-.gitignore)
5. **אם ה-Token נחשף** - מחק אותו מיד ויצור חדש

## 🚨 בעיות נפוצות

### "Session has expired"
- ה-Token פג תוקף
- פתרון: קבל Token חדש (System User Token)

### "Invalid access token"
- ה-Token שגוי או לא הועתק נכון
- פתרון: בדוק שהעתקת את כל ה-Token (הוא ארוך מאוד!)

### "Insufficient permissions"
- ה-System User לא קיבל את ההרשאות הנכונות
- פתרון: עדכן את ההרשאות ב-System User

## 📞 עזרה נוספת

- **תיעוד רשמי**: https://developers.facebook.com/docs/whatsapp/cloud-api/get-started
- **מדריך System Users**: https://developers.facebook.com/docs/marketing-api/system-users

