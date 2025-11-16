// Script to find guest link for עידו דנן
// Copy and paste this into browser console on your app page

(function() {
  console.log('🔍 מחפש את המוזמן עידו דנן...');
  
  const stored = localStorage.getItem('rsvp-events-storage');
  if (!stored) {
    console.error('❌ לא נמצאו אירועים ב-localStorage');
    alert('❌ לא נמצאו אירועים ב-localStorage. ודא שהאפליקציה טעונה.');
    return;
  }
  
  try {
    const parsed = JSON.parse(stored);
    const events = parsed.state?.events || [];
    
    console.log(`📋 נמצאו ${events.length} אירועים`);
    
    if (events.length === 0) {
      console.error('❌ לא נמצאו אירועים');
      alert('❌ לא נמצאו אירועים');
      return;
    }
    
    // Find guest עידו דנן
    let foundGuest = null;
    let foundEvent = null;
    
    for (const event of events) {
      const guest = event.guests?.find(g => 
        (g.firstName === 'עידו' && g.lastName === 'דנן') ||
        (g.firstName?.includes('עידו') && g.lastName?.includes('דנן'))
      );
      
      if (guest) {
        foundGuest = guest;
        foundEvent = event;
        break;
      }
    }
    
    if (foundGuest && foundEvent) {
      const baseUrl = window.location.origin || 'http://192.168.1.47:3001';
      const guestLink = `${baseUrl}/guest-response/${foundEvent.id}?guest=${foundGuest.id}`;
      
      console.log('');
      console.log('✅ נמצא המוזמן!');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('📅 אירוע:', foundEvent.coupleName || 'לא צוין');
      console.log('👤 מוזמן:', `${foundGuest.firstName} ${foundGuest.lastName}`);
      console.log('🆔 מזהה אירוע:', foundEvent.id);
      console.log('🆔 מזהה מוזמן:', foundGuest.id);
      console.log('');
      console.log('🔗 קישור עדכון סטטוס הגעה:');
      console.log(guestLink);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('');
      
      // Copy to clipboard
      navigator.clipboard.writeText(guestLink).then(() => {
        console.log('✅ הקישור הועתק ללוח!');
        alert(`✅ נמצא המוזמן!\n\n📅 אירוע: ${foundEvent.coupleName}\n👤 מוזמן: ${foundGuest.firstName} ${foundGuest.lastName}\n\n🔗 הקישור הועתק ללוח:\n${guestLink}`);
      }).catch(() => {
        alert(`✅ נמצא המוזמן!\n\n📅 אירוע: ${foundEvent.coupleName}\n👤 מוזמן: ${foundGuest.firstName} ${foundGuest.lastName}\n\n🔗 הקישור:\n${guestLink}`);
      });
    } else {
      console.error('❌ המוזמן עידו דנן לא נמצא');
      console.log('');
      console.log('📋 מוזמנים זמינים:');
      events.forEach((event, idx) => {
        console.log(`\nאירוע ${idx + 1}: ${event.coupleName || 'לא צוין'}`);
        if (event.guests && event.guests.length > 0) {
          event.guests.forEach(guest => {
            console.log(`  - ${guest.firstName} ${guest.lastName} (ID: ${guest.id})`);
          });
        } else {
          console.log('  (אין מוזמנים)');
        }
      });
      
      alert('❌ המוזמן עידו דנן לא נמצא. בדוק את הקונסול לרשימת המוזמנים הזמינים.');
    }
  } catch (error) {
    console.error('❌ שגיאה:', error);
    alert(`❌ שגיאה: ${error.message}`);
  }
})();

