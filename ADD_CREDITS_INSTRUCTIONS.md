# 🎁 הוספת רשומות למשתמש עידו דנן

## שיטה 1: דרך Console (מומלץ)

1. **פתח את האפליקציה בדפדפן**
2. **התחבר כמנהל** (idodanan1@gmail.com / QPwo1029)
3. **פתח את Developer Console** (F12)
4. **העתק והדבק את הקוד הבא:**

```javascript
// הוספת 50 רשומות למשתמש עידו דנן
const userStore = window.__ZUSTAND_STORES__?.userStore || 
  (() => {
    // אם לא נמצא, ננסה דרך localStorage ישירות
    const stored = localStorage.getItem('rsvp-users-storage');
    if (!stored) {
      console.error('❌ לא נמצאו משתמשים');
      return null;
    }

    const parsed = JSON.parse(stored);
    const users = parsed.state?.users || [];
    
    // חיפוש המשתמש עידו דנן
    const userIndex = users.findIndex(u => 
      u.name?.includes('עידו') || 
      u.name?.includes('דנן') ||
      u.email?.toLowerCase().includes('ido') ||
      u.email?.toLowerCase().includes('danan')
    );

    if (userIndex === -1) {
      console.error('❌ משתמש עידו דנן לא נמצא');
      console.log('📋 המשתמשים הקיימים:');
      users.forEach(u => console.log(`  - ${u.name} (${u.email}): ${u.credits} רשומות`));
      return null;
    }

    const user = users[userIndex];
    const currentCredits = user.credits || 0;
    const newCredits = currentCredits + 50;

    // עדכון הרשומות
    users[userIndex] = {
      ...user,
      credits: newCredits,
      updatedAt: new Date().toISOString()
    };

    // שמירה ב-localStorage
    localStorage.setItem('rsvp-users-storage', JSON.stringify({ state: { users } }));

    console.log('✅ הוספו 50 רשומות למשתמש עידו דנן');
    console.log(`📊 רשומות קודמות: ${currentCredits}`);
    console.log(`📊 רשומות חדשות: ${newCredits}`);
    console.log(`👤 משתמש: ${user.name} (${user.email})`);
    
    return { success: true };
  })();

// אם יש גישה ל-userStore דרך Zustand
if (userStore && typeof userStore.getState === 'function') {
  try {
    const result = userStore.getState().addCreditsToUser('עידו דנן', 50);
    console.log('✅ הוספו 50 רשומות:', result);
  } catch (error) {
    console.error('❌ שגיאה:', error.message);
    console.log('💡 מנסה דרך localStorage ישירות...');
    // הקוד למעלה כבר רץ
  }
}
```

5. **לחץ Enter** - הרשומות יתווספו אוטומטית
6. **רענן את הדף** כדי לראות את השינויים

---

## שיטה 2: דרך הקוד (למנהל מחובר)

אם אתה מחובר כמנהל, תוכל להשתמש בפונקציה החדשה:

```javascript
// בדפדפן console (F12)
const userStore = window.__ZUSTAND_STORES__?.userStore;
if (userStore) {
  const result = userStore.getState().addCreditsToUser('עידו דנן', 50);
  console.log('✅ הוספו רשומות:', result);
}
```

---

## שיטה 3: עדכון ידני ב-localStorage

אם השיטות הקודמות לא עובדות:

1. **פתח Developer Console** (F12)
2. **העתק והדבק:**

```javascript
// קריאת המשתמשים
const stored = localStorage.getItem('rsvp-users-storage');
const parsed = JSON.parse(stored);
const users = parsed.state.users;

// מציאת המשתמש עידו דנן
const user = users.find(u => 
  u.name?.includes('עידו') || 
  u.name?.includes('דנן')
);

if (user) {
  user.credits = (user.credits || 0) + 50;
  user.updatedAt = new Date().toISOString();
  
  // שמירה
  localStorage.setItem('rsvp-users-storage', JSON.stringify({ state: { users } }));
  
  console.log('✅ עודכן! רשומות חדשות:', user.credits);
} else {
  console.error('❌ משתמש לא נמצא');
  console.log('📋 המשתמשים הקיימים:', users.map(u => `${u.name} (${u.email})`));
}
```

3. **רענן את הדף**

---

## בדיקה שהרשומות נוספו

לאחר הוספת הרשומות:

1. **התחבר כמשתמש עידו דנן**
2. **בדוק את מספר הרשומות** ב-Dashboard
3. **אמור לראות 50 רשומות נוספות**

---

## הערות

- הרשומות נשמרות ב-localStorage
- אם המשתמש לא קיים, תראה רשימת כל המשתמשים הקיימים
- רק מנהל יכול להוסיף רשומות למשתמש אחר דרך הפונקציה `addCreditsToUser`
- עדכון ידני ב-localStorage יעבוד תמיד, אבל לא מומלץ

