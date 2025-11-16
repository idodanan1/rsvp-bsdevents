// Script to find guest link for עידו דנן
// Run this in browser console on your app page

const stored = localStorage.getItem('rsvp-events-storage');
if (!stored) {
  console.log('❌ No events found in localStorage');
} else {
  const parsed = JSON.parse(stored);
  const events = parsed.state?.events || [];
  
  console.log(`📋 Found ${events.length} events`);
  
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
    
    console.log('✅ Found guest:');
    console.log('📅 Event:', foundEvent.coupleName);
    console.log('👤 Guest:', `${foundGuest.firstName} ${foundGuest.lastName}`);
    console.log('🆔 Guest ID:', foundGuest.id);
    console.log('🆔 Event ID:', foundEvent.id);
    console.log('');
    console.log('🔗 Guest Response Link:');
    console.log(guestLink);
    console.log('');
    console.log('📋 Copy this link:');
    console.log(guestLink);
  } else {
    console.log('❌ Guest עידו דנן not found');
    console.log('📋 Available guests:');
    events.forEach(event => {
      event.guests?.forEach(guest => {
        console.log(`  - ${guest.firstName} ${guest.lastName} (Event: ${event.coupleName})`);
      });
    });
  }
}

