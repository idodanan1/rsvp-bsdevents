# 📍 מדריך צעד אחר צעד - קבלת Access Token

## 🎯 מה שאתה רואה עכשיו:

אתה בדף הראשי של Meta Developers. עכשיו בואו נגיע ל-Access Token:

### שלב 1: לחץ על "WhatsApp Business Platform"
1. בתחתית הדף, תחת העמודה **"Business Messaging"**
2. לחץ על **"WhatsApp Business Platform"**

### שלב 2: התחבר לאפליקציה שלך
1. אם אתה כבר מחובר - תעבור ישר לדשבורד
2. אם לא - התחבר עם החשבון שלך

### שלב 3: בחר את האפליקציה שלך
1. בדשבורד, תראה רשימה של אפליקציות
2. לחץ על האפליקציה שלך (או צור חדשה אם אין)

### שלב 4: קבל את ה-Access Token

#### דרך A: Temporary Token (זמני)
1. בתפריט השמאלי, לחץ על **"WhatsApp"**
2. לחץ על **"API Setup"**
3. תחת **"Temporary access token"**, לחץ **"Generate Token"**
4. העתק את ה-Token

#### דרך B: System User Token (קבוע - מומלץ!) ⭐
1. בתפריט העליון, לחץ על **"Business Settings"** (או סמל גלגל השיניים)
2. בתפריט השמאלי, לחץ על **"System Users"**
3. לחץ על **"Add"** (כפתור כחול)
4. מלא:
   - **Name**: "WhatsApp API User" (או כל שם שתרצה)
   - **System User Role**: בחר **"Admin"** או **"Developer"**
5. לחץ **"Create System User"**
6. לחץ על ה-System User שיצרת
7. לחץ על **"Generate New Token"**
8. בחר:
   - **App**: בחר את האפליקציה שלך
   - **Permissions**: בחר:
     - ✅ `whatsapp_business_messaging`
     - ✅ `whatsapp_business_management`
9. לחץ **"Generate Token"**
10. **⚠️ חשוב מאוד!** העתק את ה-Token מיד - הוא יופיע רק פעם אחת!

### שלב 5: קבל את Phone Number ID
1. חזור ל: **WhatsApp > API Setup**
2. תחת **"From"**, תראה את מספר הטלפון שלך
3. לחץ על **"Show"** ליד **"Phone number ID"**
4. העתק את המספר (לדוגמה: `825735800624198`)

### שלב 6: עדכן את הקוד
אחרי שקיבלת את ה-Token וה-Phone Number ID, שלח לי אותם ואעדכן את הקוד עבורך!

## 🔍 אם אתה לא מוצא משהו:

### לא רואה "WhatsApp Business Platform"?
- ודא שאתה מחובר לחשבון הנכון
- ודא שיש לך אפליקציה עם WhatsApp Product

### לא רואה "System Users"?
- ודא שיש לך הרשאות Admin או Developer
- נסה דרך: **Business Settings > Users > System Users**

### לא רואה "API Setup"?
- ודא שהוספת את WhatsApp Product לאפליקציה
- נסה: **WhatsApp > Getting Started**

## 💡 טיפ:
אם אתה לא בטוח איפה משהו, חפש בתפריט העליון:
- **"My Apps"** - לרשימת האפליקציות שלך
- **"Business Settings"** - להגדרות העסק
- **"Tools"** - לכלים נוספים

