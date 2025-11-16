# 🔧 פתרון בעיית System User Token - מדריך מפורט

## 🎯 הבעיה:
"No permissions available" - ה-System User לא קיבל תפקיד באפליקציה.

## ✅ פתרון 1: הקצאת תפקיד ל-System User קיים

### שלב 1: לך ל-System Users
1. לך ל: **Business Settings**
2. לחץ על **"System Users"** בתפריט השמאלי
3. לחץ על ה-System User שיצרת

### שלב 2: הקצה תפקיד
**אופציה A: דרך "Assign Assets"**
1. לחץ על **"Assign Assets"** או **"Add Assets"**
2. בחר **"Apps"** או **"Applications"**
3. בחר את האפליקציה שלך
4. בחר תפקיד: **"Admin"** או **"Developer"**
5. לחץ **"Save"** או **"Assign"**

**אופציה B: דרך "App Roles"**
1. בדף ה-System User, חפש **"App Roles"** או **"Roles"**
2. לחץ על **"Add"** או **"Assign"**
3. בחר את האפליקציה שלך
4. בחר תפקיד: **"Admin"**
5. לחץ **"Save"**

**אופציה C: דרך "Assets"**
1. בדף ה-System User, חפש **"Assets"** או **"Assigned Assets"**
2. לחץ על **"Add Assets"**
3. בחר **"Apps"**
4. בחר את האפליקציה שלך
5. בחר תפקיד: **"Admin"**
6. לחץ **"Assign"**

### שלב 3: בדוק שהתפקיד הוקצה
1. בדף ה-System User, תראה את האפליקציה שלך תחת "Assigned Apps" או "App Roles"
2. ודא שהתפקיד הוא "Admin" או "Developer"

### שלב 4: צור Token
1. לחץ על **"Generate New Token"**
2. בחר את האפליקציה שלך
3. עכשיו תראה רשימת הרשאות!
4. בחר:
   - ✅ `whatsapp_business_messaging`
   - ✅ `whatsapp_business_management`
5. לחץ **"Generate Token"**
6. העתק את ה-Token מיד!

---

## ✅ פתרון 2: צור System User חדש עם תפקיד מההתחלה

אם פתרון 1 לא עובד, נסה ליצור System User חדש:

### שלב 1: מחק את הישן
1. לך ל: **Business Settings > System Users**
2. לחץ על ה-System User הישן
3. לחץ על **"Delete"** או **"Remove"**
4. אשר את המחיקה

### שלב 2: צור חדש
1. לחץ על **"Add"** או **"Create System User"**
2. מלא:
   - **Name**: "WhatsApp API User"
   - **System User Role**: בחר **"Admin"**
3. לחץ **"Create System User"**

### שלב 3: הקצה תפקיד מיד
1. אחרי יצירת ה-System User, תראה אפשרות להקצות Assets
2. לחץ על **"Assign Assets"** או **"Add Assets"**
3. בחר **"Apps"**
4. בחר את האפליקציה שלך
5. בחר תפקיד: **"Admin"**
6. לחץ **"Assign"** או **"Save"**

### שלב 4: צור Token
1. לחץ על **"Generate New Token"**
2. בחר את האפליקציה שלך
3. בחר הרשאות:
   - ✅ `whatsapp_business_messaging`
   - ✅ `whatsapp_business_management`
4. לחץ **"Generate Token"**
5. העתק את ה-Token!

---

## ✅ פתרון 3: דרך Users & Roles (אם יש)

אם יש לך תפריט "Users & Roles":

1. לך ל: **Business Settings > Users & Roles**
2. לחץ על **"System Users"**
3. לחץ על ה-System User שלך
4. לחץ על **"Assign Assets"**
5. בחר **"Apps"**
6. בחר את האפליקציה שלך
7. בחר תפקיד: **"Admin"**
8. לחץ **"Save"**

---

## 🔍 איך לבדוק שהכל תקין

לפני יצירת Token, ודא:
1. ✅ יש לך System User
2. ✅ ה-System User קיבל תפקיד באפליקציה (Admin או Developer)
3. ✅ האפליקציה מופיעה תחת "Assigned Apps" או "App Roles" של ה-System User

---

## 💡 טיפים

1. **אם אתה לא רואה "Assign Assets"**:
   - נסה לרענן את הדף (F5)
   - ודא שיש לך הרשאות Admin ב-Business
   - נסה דפדפן אחר

2. **אם עדיין לא עובד**:
   - ודא שהאפליקציה שלך פעילה
   - ודא שיש לך WhatsApp Product באפליקציה
   - נסה ליצור System User חדש לגמרי

3. **אם אתה לא רואה את האפליקציה ברשימה**:
   - ודא שאתה ב-Business הנכון
   - ודא שהאפליקציה שייכת לאותו Business

---

## 🚨 אם כלום לא עובד

נסה דרך אחרת - Temporary Token (זמני):
1. לך ל: **WhatsApp > API Setup**
2. תחת **"Temporary access token"**, לחץ **"Generate Token"**
3. זה יעבוד מיד (אבל יפג תוקף אחרי 24 שעות)
4. אחרי שתקבל את ה-Token הזמני, תוכל לנסות שוב ליצור System User Token

---

## 📞 אחרי שתקבל את ה-Token

שלח לי:
1. את ה-Access Token
2. את ה-Phone Number ID (מ-WhatsApp > API Setup)

ואעדכן את הקוד עבורך!

