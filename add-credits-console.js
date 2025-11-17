// קוד להרצה ב-Console של הדפדפן (F12)
// הוספת 50 רשומות למשתמש עידו דנן

(() => {
  try {
    console.log('🔍 מחפש משתמש עידו דנן...');
    
    // קריאת המשתמשים מ-localStorage
    const stored = localStorage.getItem('rsvp-users-storage');
    if (!stored) {
      console.error('❌ לא נמצאו משתמשים');
      return;
    }

    const parsed = JSON.parse(stored);
    const users = parsed.state?.users || [];
    
    if (users.length === 0) {
      console.error('❌ לא נמצאו משתמשים');
      return;
    }

    console.log(`📋 נמצאו ${users.length} משתמשים:`);
    users.forEach(u => console.log(`  - ${u.name} (${u.email}): ${u.credits || 0} רשומות`));
    
    // חיפוש המשתמש עידו דנן
    const userIndex = users.findIndex(u => 
      u.name?.includes('עידו') || 
      u.name?.includes('דנן') ||
      u.email?.toLowerCase().includes('ido') ||
      u.email?.toLowerCase().includes('danan')
    );

    if (userIndex === -1) {
      console.error('❌ משתמש עידו דנן לא נמצא');
      console.log('💡 נסה לחפש לפי שם או אימייל אחר');
      return;
    }

    const user = users[userIndex];
    const currentCredits = user.credits || 0;
    const newCredits = currentCredits + 50;

    console.log(`✅ נמצא משתמש: ${user.name} (${user.email})`);
    console.log(`📊 רשומות קודמות: ${currentCredits}`);
    console.log(`➕ מוסיף: 50 רשומות`);
    console.log(`📊 רשומות חדשות: ${newCredits}`);

    // עדכון הרשומות
    users[userIndex] = {
      ...user,
      credits: newCredits,
      updatedAt: new Date().toISOString()
    };

    // שמירה ב-localStorage
    localStorage.setItem('rsvp-users-storage', JSON.stringify({ state: { users } }));

    console.log('✅ הוספו 50 רשומות בהצלחה!');
    console.log(`👤 משתמש: ${user.name} (${user.email})`);
    console.log(`📊 רשומות חדשות: ${newCredits}`);
    console.log('💡 רענן את הדף כדי לראות את השינויים');
    
    // אם יש גישה ל-userStore דרך Zustand, ננסה לעדכן גם שם
    try {
      // נסה למצוא את ה-store דרך window
      const stores = window.__ZUSTAND_STORES__ || {};
      const userStore = stores.userStore;
      
      if (userStore && typeof userStore.getState === 'function') {
        const currentUser = userStore.getState().user;
        if (currentUser && currentUser.id === user.id) {
          userStore.getState().updateCredits(newCredits);
          console.log('✅ עודכן גם המשתמש המחובר');
        }
      }
    } catch (e) {
      // זה בסדר אם לא מצאנו את ה-store
      console.log('ℹ️ לא נמצא store - עדכון ב-localStorage בלבד');
    }
    
  } catch (error) {
    console.error('❌ שגיאה:', error);
    console.error('📋 פרטי השגיאה:', error.message);
  }
})();

