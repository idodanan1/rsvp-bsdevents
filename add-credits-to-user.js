// Script to add credits to a specific user
// Run with: node add-credits-to-user.js

// This script reads from localStorage format and adds credits to a user
// Note: This is a Node.js script, but localStorage is browser-only
// So we'll create a browser console script instead

console.log(`
========================================
הוספת רשומות למשתמש עידו דנן
========================================

העתק והדבק את הקוד הבא ב-console של הדפדפן (F12):

(() => {
  try {
    // מציאת המשתמש עידו דנן
    const stored = localStorage.getItem('rsvp-users-storage');
    if (!stored) {
      console.error('❌ לא נמצאו משתמשים');
      return;
    }

    const parsed = JSON.parse(stored);
    const users = parsed.state?.users || [];
    
    // חיפוש המשתמש לפי שם או אימייל
    const userIndex = users.findIndex(u => 
      u.name?.includes('עידו') || 
      u.name?.includes('דנן') ||
      u.email?.includes('ido') ||
      u.email?.includes('danan')
    );

    if (userIndex === -1) {
      console.error('❌ משתמש עידו דנן לא נמצא');
      console.log('📋 המשתמשים הקיימים:');
      users.forEach(u => console.log(`  - ${u.name} (${u.email}): ${u.credits} רשומות`));
      return;
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
    
    // עדכון המשתמש הנוכחי אם הוא מחובר
    const userStore = window.__ZUSTAND_STORES__?.userStore;
    if (userStore && userStore.getState().user?.id === user.id) {
      userStore.getState().updateCredits(newCredits);
      console.log('✅ עודכן גם המשתמש המחובר');
    }
    
    console.log('💡 רענן את הדף כדי לראות את השינויים');
  } catch (error) {
    console.error('❌ שגיאה:', error);
  }
})();

========================================
`);

