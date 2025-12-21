const https = require('https');
const fs = require('fs');

const BACKEND_URL = 'https://whatsapp-backend-enfz.onrender.com';

console.log('📥 Fetching events from backend...');

https.get(`${BACKEND_URL}/api/events/all`, (res) => {
  let data = '';
  
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    try {
      const response = JSON.parse(data);
      const events = response.events || [];
      
      console.log(`✅ Found ${events.length} events in the system`);
      
      if (events.length > 0) {
        console.log('\n📋 Events list:');
        events.forEach((event, index) => {
          const eventName = event.coupleName || `${event.groomName || ''} & ${event.brideName || ''}`;
          console.log(`  ${index + 1}. ${eventName} - ${event.eventDate} (ID: ${event.id})`);
        });
        
        // Save to backup file
        fs.writeFileSync('events_backup.json', JSON.stringify(response, null, 2), 'utf8');
        console.log('\n✅ Events saved to events_backup.json');
      } else {
        console.log('⚠️ No events found in the system');
      }
    } catch (error) {
      console.error('❌ Error parsing response:', error.message);
      console.log('Raw response:', data.substring(0, 500));
    }
  });
}).on('error', (err) => {
  console.error('❌ Error fetching events:', err.message);
});

