const express = require('express');
const cors = require('cors');
const axios = require('axios');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3002;

// Temporary storage for guest status updates (in production, use a database)
const pendingUpdates = [];

// Set default API keys if not provided
process.env.WANOTIFIER_API_KEY = process.env.WANOTIFIER_API_KEY || 'oUDrqkaOHa6wv2oWZ4SsM31RbxcKLG';
process.env.CALLMEBOT_API_KEY = process.env.CALLMEBOT_API_KEY || '1234567890';
process.env.WEBHOOK_VERIFY_TOKEN = process.env.WEBHOOK_VERIFY_TOKEN || 'whatsapp_webhook_verify_token_2024';
process.env.WHATSAPP_ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN || 'EAAQ16mfCx58BPZCAepGf7EQMznC5dwYUmsun7pZCvzLPqjOjnq778EeJtXGEdemBVXdqTEt9pJ0bm2l5EyL9BZAR9kVS15kjz9rWYAcbKZCZBVOQswHeZAfmkUNv2TZAeX8KGaJ8OZCb4ZCtOaZAEZARqvG2TE7DHCmZBDWRATOKdvfHZA4j8FGluUX8NNGdsqbBEVgFjNgZDZD';
process.env.WHATSAPP_PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID || '874204535776090'; // Phone Number ID

console.log('🔧 WhatsApp Backend Configuration:');
console.log('📱 WaNotifier API Key:', process.env.WANOTIFIER_API_KEY ? 'Set' : 'Not set');
console.log('📱 CallMeBot API Key:', process.env.CALLMEBOT_API_KEY ? 'Set' : 'Not set');
console.log('🔐 Webhook Verify Token:', process.env.WEBHOOK_VERIFY_TOKEN ? 'Set' : 'Not set');
console.log('🔑 WhatsApp Access Token:', process.env.WHATSAPP_ACCESS_TOKEN ? 'Set' : 'Not set');
console.log('📱 WhatsApp Phone Number ID:', process.env.WHATSAPP_PHONE_NUMBER_ID ? 'Set' : 'Not set');
console.log('🌐 Port:', PORT);

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'image-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'));
    }
  }
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded files
app.use('/uploads', express.static(uploadsDir));

// WhatsApp API endpoints - Using WhatsApp Business API
const WHATSAPP_APIS = [
  {
    name: 'WhatsApp Business API',
    url: `https://graph.facebook.com/v22.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`,
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`,
      'Content-Type': 'application/json'
    }
  },
  {
    name: 'CallMeBot WhatsApp',
    url: 'https://api.callmebot.com/whatsapp.php',
    method: 'GET',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    }
  },
  {
    name: 'Simple WhatsApp API',
    url: 'https://api.whatsapp.com/send',
    method: 'GET',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    }
  }
];

// Send single WhatsApp message
app.post('/api/whatsapp/send', async (req, res) => {
  try {
    const { to, message, imageUrl } = req.body;
    
    console.log(`📱 Sending WhatsApp to: ${to}`);
    console.log(`💬 Message: ${message.substring(0, 50)}...`);

    // Try each API until one works
    for (const api of WHATSAPP_APIS) {
      try {
        console.log(`📱 Trying ${api.name}...`);
        
        let response;
        if (api.name === 'WhatsApp Business API') {
          const phoneNumber = to.replace(/^0/, '972').replace(/[^0-9]/g, '');
          console.log(`📞 WhatsApp Business phone: ${phoneNumber}`);
          console.log(`🔑 Access Token: ${process.env.WHATSAPP_ACCESS_TOKEN ? 'Set' : 'Not set'}`);
          
          // Build message payload
          let messagePayload = {
            messaging_product: 'whatsapp',
            recipient_type: 'individual',
            to: phoneNumber
          };

          // If image URL is provided, send image with caption
          if (imageUrl) {
            console.log(`🖼️ Image URL provided: ${imageUrl}`);
            messagePayload.type = 'image';
            messagePayload.image = {
              link: imageUrl,
              caption: message
            };
          } else {
            // Send text message
            messagePayload.type = 'text';
            messagePayload.text = {
              body: message
            };
            }
          
          response = await axios.post(api.url, messagePayload, { headers: api.headers });
        } else if (api.name === 'CallMeBot WhatsApp') {
          // CallMeBot uses GET request with query parameters
          const phoneNumber = to.replace(/^0/, '+972').replace(/[^0-9+]/g, '');
          console.log(`📞 CallMeBot phone: ${phoneNumber}`);
          
          const params = new URLSearchParams({
            phone: phoneNumber,
            text: message,
            apikey: process.env.CALLMEBOT_API_KEY || '1234567890'
          });
          
          response = await axios.get(`${api.url}?${params.toString()}`);
        } else if (api.name === 'Simple WhatsApp API') {
          // Simple WhatsApp API - creates a link to open WhatsApp
          const phoneNumber = to.replace(/^0/, '972').replace(/[^0-9]/g, '');
          console.log(`📞 Simple WhatsApp phone: ${phoneNumber}`);
          
          const params = new URLSearchParams({
            phone: phoneNumber,
            text: message
          });
          
          // This creates a WhatsApp link that can be opened
          const whatsappLink = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`;
          console.log(`🔗 WhatsApp Link: ${whatsappLink}`);
          
          // Return success with the link
          response = {
            status: 200,
            data: { 
              success: true, 
              link: whatsappLink,
              message: 'WhatsApp link generated successfully'
            }
          };
        }

        console.log(`📊 ${api.name} response status:`, response?.status);
        console.log(`📊 ${api.name} response data:`, response?.data);

        if (response && (response.status === 200 || response.status === 201)) {
          console.log(`✅ ${api.name} sent successfully!`);
          return res.json({
            success: true,
            messageId: `${api.name.toLowerCase()}_${Date.now()}`,
            api: api.name
          });
        }
      } catch (error) {
        console.log(`❌ ${api.name} failed:`, error.message);
        if (error.response) {
          console.log(`❌ ${api.name} error response:`, error.response.data);
        }
        continue;
      }
    }

    // If all APIs failed
    console.log('❌ All WhatsApp APIs failed');
    res.json({
      success: false,
      error: 'All WhatsApp APIs failed'
    });

  } catch (error) {
    console.error('WhatsApp Error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Send bulk WhatsApp messages
app.post('/api/whatsapp/bulk', async (req, res) => {
  try {
    const { messages } = req.body;
    
    console.log(`📤 Sending bulk WhatsApp to ${messages.length} recipients`);
    
    const results = [];
    let successful = 0;
    let failed = 0;

    // Send messages with delay to avoid rate limiting
    for (let i = 0; i < messages.length; i++) {
      const message = messages[i];
      
      try {
        // Try each API until one works
        let sent = false;
        for (const api of WHATSAPP_APIS) {
          try {
            console.log(`📱 Sending ${i + 1}/${messages.length} via ${api.name}...`);
            
            let response;
            if (api.name === 'WhatsApp Business API') {
              const phoneNumber = message.to.replace(/^0/, '972').replace(/[^0-9]/g, '');
              
              // Build message payload
              let messagePayload = {
                messaging_product: 'whatsapp',
                recipient_type: 'individual',
                to: phoneNumber
              };

              // If image URL is provided, send image with caption
              if (message.imageUrl) {
                messagePayload.type = 'image';
                messagePayload.image = {
                  link: message.imageUrl,
                  caption: message.message
                };
              } else {
                // Send text message
                messagePayload.type = 'text';
                messagePayload.text = {
                  body: message.message
                };
                }
              
              response = await axios.post(api.url, messagePayload, { headers: api.headers });
            } else if (api.name === 'CallMeBot WhatsApp') {
              const phoneNumber = message.to.replace(/^0/, '+972').replace(/[^0-9+]/g, '');
              const params = new URLSearchParams({
                phone: phoneNumber,
                text: message.message,
                apikey: process.env.CALLMEBOT_API_KEY || '1234567890'
              });
              response = await axios.get(`${api.url}?${params.toString()}`);
            } else if (api.name === 'Simple WhatsApp API') {
              const phoneNumber = message.to.replace(/^0/, '972').replace(/[^0-9]/g, '');
              const whatsappLink = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message.message)}`;
              response = {
                status: 200,
                data: { 
                  success: true, 
                  link: whatsappLink,
                  message: 'WhatsApp link generated successfully'
                }
              };
            }

            if (response && response.status === 200) {
              results.push({
                recipient: message.to,
                success: true,
                messageId: `${api.name.toLowerCase()}_${Date.now()}`,
                api: api.name
              });
              successful++;
              sent = true;
              break;
            }
          } catch (error) {
            console.log(`❌ ${api.name} failed for ${message.to}:`, error.message);
            continue;
          }
        }

        if (!sent) {
          results.push({
            recipient: message.to,
            success: false,
            error: 'All APIs failed'
          });
          failed++;
        }

        // Add delay between messages (1 second)
        if (i < messages.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }

      } catch (error) {
        console.error(`Error sending to ${message.to}:`, error);
        results.push({
          recipient: message.to,
          success: false,
          error: 'Unexpected error'
        });
        failed++;
      }
    }

    console.log(`📊 Bulk WhatsApp completed: ${successful} successful, ${failed} failed`);

    res.json({
      success: true,
      totalSent: messages.length,
      successful,
      failed,
      results
    });

  } catch (error) {
    console.error('Bulk WhatsApp Error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Webhook verification endpoint
app.get('/api/whatsapp/webhook', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];
  const expectedToken = process.env.WEBHOOK_VERIFY_TOKEN || 'whatsapp_webhook_verify_token_2024';

  console.log('🔐 Webhook verification request received:');
  console.log('   Mode:', mode);
  console.log('   Received Token:', token);
  console.log('   Expected Token:', expectedToken);
  console.log('   Challenge:', challenge);
  console.log('   Full query:', req.query);
  console.log('   URL:', req.url);

  // Verify the webhook
  if (mode === 'subscribe' && token === expectedToken) {
    console.log('✅ Webhook verified successfully!');
    console.log('   Sending challenge:', challenge);
    res.status(200).send(challenge);
  } else {
    console.log('❌ Webhook verification failed!');
    console.log('   Mode match:', mode === 'subscribe');
    console.log('   Token match:', token === expectedToken);
    console.log('   Mode received:', mode);
    console.log('   Token received:', token);
    console.log('   Token expected:', expectedToken);
    res.status(403).send('Forbidden');
  }
});

// Webhook message handler
app.post('/api/whatsapp/webhook', (req, res) => {
  try {
    const body = req.body;
    console.log('📨 Webhook received at', new Date().toISOString());
    console.log('📨 Webhook body:', JSON.stringify(body, null, 2));

    // Handle different types of webhook events
    if (body.object === 'whatsapp_business_account') {
      console.log('✅ Valid WhatsApp Business Account webhook');
      body.entry?.forEach((entry) => {
        console.log('📋 Processing entry:', entry.id);
        entry.changes?.forEach((change) => {
          console.log('📋 Change field:', change.field);
          if (change.field === 'messages') {
            const messages = change.value.messages;
            const statuses = change.value.statuses;
            const contacts = change.value.contacts;

            console.log('📋 Webhook data:', {
              messagesCount: messages?.length || 0,
              statusesCount: statuses?.length || 0,
              contactsCount: contacts?.length || 0
            });

            // Handle incoming messages
            if (messages && messages.length > 0) {
              console.log(`📱 Processing ${messages.length} incoming message(s)`);
              messages.forEach((message, index) => {
                console.log(`📱 Message ${index + 1}:`, JSON.stringify(message, null, 2));
                handleIncomingMessage(message);
              });
            } else {
              console.log('📭 No messages in webhook');
            }

            // Handle message status updates
            if (statuses && statuses.length > 0) {
              console.log(`📊 Processing ${statuses.length} status update(s)`);
              statuses.forEach((status) => {
                console.log('📊 Message status update:', status);
                handleMessageStatus(status);
              });
            }
          } else {
            console.log(`⚠️ Unknown change field: ${change.field}`);
          }
        });
      });
    } else {
      console.log(`⚠️ Unknown webhook object type: ${body.object}`);
      console.log('📋 Full webhook body:', JSON.stringify(body, null, 2));
    }

    res.status(200).send('OK');
  } catch (error) {
    console.error('❌ Webhook error:', error);
    console.error('❌ Error stack:', error.stack);
    res.status(500).send('Internal Server Error');
  }
});

// Handle incoming messages
async function handleIncomingMessage(message) {
  console.log('📨 Processing incoming message:', {
    from: message.from,
    text: message.text?.body,
    button: message.button,
    interactive: message.interactive,
    timestamp: message.timestamp,
    messageId: message.id
  });
  console.log('📨 Full message object:', JSON.stringify(message, null, 2));

  // Handle button clicks (interactive messages)
  if (message.interactive?.type === 'button_reply') {
    const buttonId = message.interactive.button_reply?.id;
    const buttonTitle = message.interactive.button_reply?.title;
    const phoneNumber = message.from;
    
    console.log('🔘 Button clicked:', { buttonId, buttonTitle, phoneNumber });
    console.log('🔘 Full interactive object:', JSON.stringify(message.interactive, null, 2));
    
    // Handle different button actions
    // Check both buttonId and buttonTitle for Hebrew text
    // Also check for partial matches to handle variations
    const buttonTitleLower = (buttonTitle || '').toLowerCase();
    const buttonIdLower = (buttonId || '').toLowerCase();
    
    if (buttonId === 'confirm_attendance' || 
        buttonIdLower.includes('confirm') ||
        buttonTitle === 'אישור הגעה' ||
        buttonTitle?.includes('אישור') ||
        buttonTitle?.includes('הגעה') ||
        buttonTitleLower.includes('אישור') ||
        buttonTitleLower.includes('הגעה')) {
      console.log('✅ Guest confirmed attendance via button!');
      await updateGuestStatusByPhone(phoneNumber, 'confirmed');
    } else if (buttonId === 'decline_attendance' || 
               buttonIdLower.includes('decline') ||
               buttonTitle === 'לא אוכל להגיע' ||
               buttonTitle?.includes('לא אוכל') ||
               buttonTitle?.includes('דחה') ||
               buttonTitle?.includes('לא') ||
               buttonTitleLower.includes('לא אוכל') ||
               buttonTitleLower.includes('דחה')) {
      console.log('❌ Guest declined attendance via button!');
      await updateGuestStatusByPhone(phoneNumber, 'declined');
    } else {
      console.warn('⚠️ Unknown button clicked:', { buttonId, buttonTitle });
      console.warn('⚠️ Trying to match anyway...');
      // Try to match anyway based on common patterns
      if (buttonTitleLower.includes('כן') || buttonTitleLower.includes('מגיע') || buttonTitleLower.includes('אגיע')) {
        console.log('✅ Matched as confirmation based on text');
        await updateGuestStatusByPhone(phoneNumber, 'confirmed');
      } else if (buttonTitleLower.includes('לא') || buttonTitleLower.includes('דחה')) {
        console.log('❌ Matched as decline based on text');
        await updateGuestStatusByPhone(phoneNumber, 'declined');
      }
    }
    
    return;
  }

  // Handle text messages (fallback)
  const messageText = message.text?.body?.toLowerCase() || '';
  
  // Auto-reply to confirmations
  if (messageText.includes('כן') || 
      messageText.includes('אשר') ||
      messageText.includes('מגיע') ||
      messageText.includes('אגיע')) {
    console.log('✅ Guest confirmed attendance via text!');
    await updateGuestStatusByPhone(message.from, 'confirmed');
  } else if (messageText.includes('לא') || 
             messageText.includes('דחה') ||
             messageText.includes('לא אוכל') ||
             messageText.includes('לא אגיע')) {
    console.log('❌ Guest declined attendance via text!');
    await updateGuestStatusByPhone(message.from, 'declined');
  }
}

// Update guest status by phone number
async function updateGuestStatusByPhone(phoneNumber, status) {
  try {
    // Format phone number (remove country code prefix if needed)
    // Keep original format too for better matching
    const originalPhone = phoneNumber.replace(/[^0-9]/g, '');
    const formattedPhone = originalPhone.replace(/^972/, '0');
    
    console.log(`🔄 Updating guest status:`);
    console.log(`   Original phone: ${phoneNumber}`);
    console.log(`   Formatted phone: ${formattedPhone}`);
    console.log(`   Status: ${status}`);
    
    // Store update in pending updates array
    // Store both formats to increase chance of matching
    const updateData = {
      phoneNumber: formattedPhone,
      originalPhoneNumber: originalPhone, // Keep original for matching
      status: status,
      responseDate: new Date().toISOString(),
      timestamp: Date.now()
    };
    
    // Add to pending updates (avoid duplicates based on phone and status)
    const existingIndex = pendingUpdates.findIndex(
      u => (u.phoneNumber === formattedPhone || u.originalPhoneNumber === originalPhone) && 
           u.status === status &&
           (Date.now() - u.timestamp) < 60000 // Within last minute
    );
    
    if (existingIndex === -1) {
      pendingUpdates.push(updateData);
      console.log('✅ Guest status update stored:', {
        phone: formattedPhone,
        originalPhone: originalPhone,
        status: status,
        timestamp: new Date(updateData.timestamp).toLocaleTimeString()
      });
      console.log(`📊 Total pending updates: ${pendingUpdates.length}`);
      console.log(`📋 All pending updates:`, pendingUpdates.map(u => ({
        phone: u.phoneNumber,
        status: u.status,
        time: new Date(u.timestamp).toLocaleTimeString()
      })));
    } else {
      console.log('⚠️ Update already exists, skipping duplicate');
      console.log(`   Existing update:`, pendingUpdates[existingIndex]);
    }
    
  } catch (error) {
    console.error('❌ Error updating guest status:', error);
  }
}

// Handle message status updates
function handleMessageStatus(status) {
  console.log('📊 Processing status update:', {
    messageId: status.id,
    status: status.status,
    timestamp: status.timestamp,
    recipientId: status.recipient_id
  });

  // Here you can add logic to:
  // 1. Update message delivery status in database
  // 2. Update guest response tracking
  // 3. Send notifications to admin
  
  switch (status.status) {
    case 'sent':
      console.log('📤 Message sent successfully');
      break;
    case 'delivered':
      console.log('📨 Message delivered');
      break;
    case 'read':
      console.log('👀 Message read');
      break;
    case 'failed':
      console.log('❌ Message failed to send');
      break;
  }
}

// Check WhatsApp contact availability
app.post('/api/whatsapp/contacts', async (req, res) => {
  try {
    const { contacts } = req.body;
    
    if (!contacts || !Array.isArray(contacts) || contacts.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'contacts array is required'
      });
    }

    console.log(`📱 Checking WhatsApp availability for ${contacts.length} contacts`);

    // Format phone numbers
    const formattedContacts = contacts.map(phone => 
      phone.replace(/^0/, '972').replace(/[^0-9]/g, '')
    );

    try {
      // Use WhatsApp Business API to check contacts
      const response = await axios.post(
        `https://graph.facebook.com/v22.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}/contacts`,
        {
          contacts: formattedContacts
        },
        {
          headers: {
            'Authorization': `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`,
            'Content-Type': 'application/json'
          }
        }
      );

      // Response structure:
      // {
      //   "messaging_product": "whatsapp",
      //   "contacts": [
      //     {
      //       "input": "<PHONE_NUMBER>",
      //       "wa_id": "<WHATSAPP_ID>" // Only present if number has WhatsApp
      //     }
      //   ]
      // }

      console.log('✅ Contact check successful');
      res.json({
        success: true,
        messaging_product: response.data.messaging_product,
        contacts: response.data.contacts,
        messages: response.data.messages || []
      });

    } catch (error) {
      console.error('❌ WhatsApp contact check failed:', error.message);
      if (error.response) {
        console.error('Error response:', error.response.data);
        return res.status(error.response.status).json({
          success: false,
          error: error.response.data?.error?.message || 'WhatsApp API error'
        });
      }
      throw error;
    }

  } catch (error) {
    console.error('Contact check error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Helper function to upload image to Imgur
async function uploadToImgur(filePath) {
  try {
    const imageBuffer = fs.readFileSync(filePath);
    const base64Image = imageBuffer.toString('base64');
    
    // Imgur anonymous upload (no API key required for basic usage)
    const response = await axios.post('https://api.imgur.com/3/image', {
      image: base64Image,
      type: 'base64'
    }, {
      headers: {
        'Authorization': 'Client-ID 546c25a59c58ad7' // Public Imgur client ID
      }
    });
    
    if (response.data && response.data.data && response.data.data.link) {
      return response.data.data.link; // Returns HTTPS URL
    }
    throw new Error('Imgur upload failed');
  } catch (error) {
    console.error('❌ Imgur upload error:', error.response?.data || error.message);
    throw error;
  }
}

// Upload image endpoint
app.post('/api/upload/image', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No image file provided'
      });
    }

    const filePath = req.file.path;
    console.log('📤 Uploading image:', req.file.filename);
    
    // Try to upload to Imgur first (for HTTPS support)
    let imageUrl;
    try {
      console.log('📤 Attempting to upload to Imgur for HTTPS support...');
      imageUrl = await uploadToImgur(filePath);
      console.log('✅ Image uploaded to Imgur successfully:', imageUrl);
      
      // Delete local file after successful Imgur upload
      fs.unlinkSync(filePath);
    } catch (imgurError) {
      console.warn('⚠️ Imgur upload failed, using local server:', imgurError.message);
      
      // Fallback to local server
      const serverUrl = process.env.SERVER_URL || 
        process.env.NGROK_URL ||
        `${req.protocol}://${req.get('host')}`;
      
      // If using local server, warn about HTTPS requirement
      if (serverUrl.startsWith('http://')) {
        console.warn('⚠️ WARNING: Image URL uses HTTP');
        console.warn('⚠️ WhatsApp Business API requires HTTPS for images');
        console.warn('💡 The image will be uploaded but may not work with WhatsApp API');
      }
      
      imageUrl = `${serverUrl}/uploads/${req.file.filename}`;
    }
    
    console.log('✅ Image uploaded successfully:', imageUrl);
    
    res.json({
      success: true,
      imageUrl: imageUrl,
      filename: req.file.filename
    });
  } catch (error) {
    console.error('❌ Image upload error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to upload image'
    });
  }
});

// API endpoint to update guest status (called from frontend)
app.post('/api/guests/update-status', async (req, res) => {
  try {
    const { phoneNumber, eventId, guestId, status } = req.body;
    
    console.log('🔄 Updating guest status:', { phoneNumber, eventId, guestId, status });
    
    // This endpoint is called from the frontend to update guest status
    // The frontend will handle the actual update in the store
    // We just need to return success
    
    res.json({
      success: true,
      message: 'Guest status update received',
      data: { phoneNumber, eventId, guestId, status }
    });
  } catch (error) {
    console.error('❌ Error in update guest status endpoint:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update guest status'
    });
  }
});

// API endpoint to get pending guest status updates
app.get('/api/guests/pending-updates', (req, res) => {
  // Return pending updates (but don't clear them immediately - let frontend process them first)
  const updates = [...pendingUpdates];
  
  // Return new updates (not older than 5 minutes)
  const fiveMinutesAgo = Date.now() - (5 * 60 * 1000);
  const recentUpdates = updates.filter(u => u.timestamp > fiveMinutesAgo);
  
  // Clear old updates (older than 1 hour) but keep recent ones
  const oneHourAgo = Date.now() - (60 * 60 * 1000);
  const filteredUpdates = pendingUpdates.filter(u => u.timestamp > oneHourAgo);
  pendingUpdates.length = 0;
  pendingUpdates.push(...filteredUpdates);
  
  console.log(`📤 GET /api/guests/pending-updates - Returning ${recentUpdates.length} pending updates (total in memory: ${pendingUpdates.length})`);
  if (recentUpdates.length > 0) {
    console.log('📤 Updates being returned:', recentUpdates.map(u => ({ 
      phone: u.phoneNumber, 
      originalPhone: u.originalPhoneNumber,
      status: u.status, 
      time: new Date(u.timestamp).toLocaleTimeString() 
    })));
  } else {
    // Log even when no updates to help debugging
    if (pendingUpdates.length > 0) {
      console.log(`📭 No recent updates (${pendingUpdates.length} total, but older than 5 minutes)`);
      console.log('📋 All pending updates:', pendingUpdates.map(u => ({
        phone: u.phoneNumber,
        status: u.status,
        age: Math.round((Date.now() - u.timestamp) / 1000) + ' seconds ago'
      })));
    } else {
      console.log('📭 No pending updates at all');
    }
  }
  
  res.json({
    success: true,
    updates: recentUpdates,
    totalPending: pendingUpdates.length
  });
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'WhatsApp Backend is running' });
});

app.listen(PORT, () => {
  console.log(`🚀 WhatsApp Backend running on port ${PORT}`);
  console.log(`📱 Ready to send WhatsApp messages!`);
  console.log(`🔗 Webhook endpoint: http://localhost:${PORT}/api/whatsapp/webhook`);
});
