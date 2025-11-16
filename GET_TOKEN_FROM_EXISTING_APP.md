# 🔑 איך לקבל Access Token מאפליקציה קיימת

## 📍 שלבים:

### שלב 1: פתח את האפליקציה שלך
1. לך ל: **https://developers.facebook.com/apps/**
2. לחץ על האפליקציה שלך ברשימה

### שלב 2: ודא שיש לך WhatsApp Product
1. בדשבורד של האפליקציה, בדוק בתפריט השמאלי
2. אם אתה **לא רואה "WhatsApp"** בתפריט:
   - לחץ על **"Add Product"** או **"+"**
   - מצא את **"WhatsApp"** ברשימה
   - לחץ על **"Set Up"**

### שלב 3: קבל Access Token

#### דרך A: Temporary Token (זמני - 24 שעות)
1. בתפריט השמאלי, לחץ על **"WhatsApp"**
2. לחץ על **"API Setup"**
3. תחת **"Temporary access token"**, לחץ **"Generate Token"**
4. העתק את ה-Token

#### דרך B: System User Token (קבוע - מומלץ!) ⭐
1. בתפריט העליון, לחץ על **"Business Settings"** (או סמל גלגל השיניים)
2. בתפריט השמאלי, לחץ על **"System Users"**
3. אם אין לך System User:
   - לחץ על **"Add"**
   - מלא שם: "WhatsApp API User"
   - בחר Role: **"Admin"**
   - לחץ **"Create System User"**
4. לחץ על ה-System User שלך
5. לחץ על **"Generate New Token"**
6. בחר:
   - **App**: בחר את האפליקציה שלך
   - **Permissions**: בחר:
     - ✅ `whatsapp_business_messaging`
     - ✅ `whatsapp_business_management`
7. לחץ **"Generate Token"**
8. **⚠️ חשוב!** העתק את ה-Token מיד - הוא יופיע רק פעם אחת!

### שלב 4: קבל Phone Number ID
1. חזור ל: **WhatsApp > API Setup**
2. תחת **"From"**, תראה את מספר הטלפון שלך
3. לחץ על **"Show"** ליד **"Phone number ID"**
4. העתק את המספר (לדוגמה: `825735800624198`)

### שלב 5: שלח לי את הנתונים
אחרי שקיבלת את ה-Token וה-Phone Number ID, שלח לי אותם ואעדכן את הקוד עבורך!

