# איך לבדוק כמה אירועים יש במערכת

## דרך 1: דרך Console של הדפדפן

1. פתח את האפליקציה בדפדפן
2. לחץ F12 (או קליק ימני → Inspect → Console)
3. העתק והדבק את הקוד הבא:

```javascript
const stored = localStorage.getItem('rsvp-events-storage');
if (stored) {
  const parsed = JSON.parse(stored);
  const events = parsed.state?.events || [];
  const deletedEvents = parsed.state?.deletedEvents || [];
  
  console.log('📊 סטטיסטיקות אירועים:');
  console.log(`✅ אירועים פעילים: ${events.length}`);
  console.log(`🗑️ אירועים שנמחקו: ${deletedEvents.length}`);
  console.log(`📋 סה"כ אירועים במערכת: ${events.length + deletedEvents.length}`);
  
  if (events.length > 0) {
    console.log('\n📅 רשימת אירועים פעילים:');
    events.forEach((event, index) => {
      console.log(`${index + 1}. ${event.coupleName || 'ללא שם'} (ID: ${event.id})`);
      console.log(`   - אורחים: ${event.guests?.length || 0}`);
      console.log(`   - קמפיינים: ${event.campaigns?.length || 0}`);
      console.log(`   - שולחנות: ${event.tables?.length || 0}`);
    });
  }
} else {
  console.log('📭 אין אירועים במערכת');
}
```

## דרך 2: דרך Dashboard

הדשבורד מציג את כל האירועים שלך אוטומטית.

## דרך 3: דרך API

אם יש לך גישה ל-API, תוכל לבדוק דרך:
```
GET https://whatsapp-backend-enfz.onrender.com/api/events?userId=YOUR_USER_ID
```

