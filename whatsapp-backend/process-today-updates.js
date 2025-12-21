// Script to process all WhatsApp updates from today
// Run this script manually to sync all today's WhatsApp responses to events

const axios = require('axios');
require('dotenv').config();

const BACKEND_URL = process.env.BACKEND_URL || process.env.VITE_BACKEND_URL || 'https://whatsapp-backend-enfz.onrender.com';

async function processTodayUpdates() {
  try {
    console.log('🔄 Processing all WhatsApp updates from today...');
    console.log(`📡 Backend URL: ${BACKEND_URL}`);
    
    // Call the process-all-updates endpoint
    const response = await axios.post(`${BACKEND_URL}/api/guests/process-all-updates?today=true`, {}, {
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 60000 // 60 seconds timeout
    });
    
    if (response.data.success) {
      console.log('\n✅ SUCCESS!');
      console.log(`📊 Processed: ${response.data.processed} updates`);
      console.log(`❌ Failed: ${response.data.failed} updates`);
      console.log(`📋 Remaining: ${response.data.remaining} updates`);
      
      if (response.data.processedUpdates && response.data.processedUpdates.length > 0) {
        console.log('\n📝 Processed updates:');
        response.data.processedUpdates.forEach((update, index) => {
          console.log(`  ${index + 1}. ${update.guestName} (${update.phoneNumber})`);
          console.log(`     Status: ${update.updates.status || 'N/A'}`);
          console.log(`     Guest Count: ${update.updates.guestCount || 'N/A'}`);
          console.log(`     Event ID: ${update.eventId}`);
        });
      }
      
      if (response.data.remaining > 0) {
        console.log(`\n⚠️ Warning: ${response.data.remaining} updates could not be processed (guests not found)`);
      }
    } else {
      console.error('❌ Processing failed:', response.data.error);
    }
  } catch (error) {
    console.error('❌ Error processing updates:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
  }
}

// Run the script
processTodayUpdates();

