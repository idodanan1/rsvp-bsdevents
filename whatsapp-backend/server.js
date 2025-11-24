const express = require('express');
const cors = require('cors');
const axios = require('axios');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const stripe = require('stripe');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3002;

// Enable CORS for all routes - MUST be before other middleware
app.use(cors({
  origin: '*', // Allow all origins (in production, specify exact origins)
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['Content-Type', 'Authorization']
}));

// Handle preflight OPTIONS requests explicitly
app.options('*', cors());

// Additional CORS middleware to ensure headers are always set
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
    return;
  }
  next();
});

// Temporary storage for guest status updates (in production, use a database)
const pendingUpdates = [];

// Set default API keys if not provided
process.env.WANOTIFIER_API_KEY = process.env.WANOTIFIER_API_KEY || 'oUDrqkaOHa6wv2oWZ4SsM31RbxcKLG';
process.env.CALLMEBOT_API_KEY = process.env.CALLMEBOT_API_KEY || '1234567890';
process.env.WEBHOOK_VERIFY_TOKEN = process.env.WEBHOOK_VERIFY_TOKEN || 'whatsapp_webhook_verify_token_2024';
process.env.WHATSAPP_ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN || 'EAAQ16mfCx58BPZCAepGf7EQMznC5dwYUmsun7pZCvzLPqjOjnq778EeJtXGEdemBVXdqTEt9pJ0bm2l5EyL9BZAR9kVS15kjz9rWYAcbKZCZBVOQswHeZAfmkUNv2TZAeX8KGaJ8OZCb4ZCtOaZAEZARqvG2TE7DHCmZBDWRATOKdvfHZA4j8FGluUX8NNGdsqbBEVgFjNgZDZD';
process.env.WHATSAPP_PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID || '874204535776090'; // Phone Number ID
process.env.STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || ''; // Stripe Secret Key
process.env.STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || ''; // Stripe Webhook Secret

// Tranzila Configuration
process.env.TRANZILA_TERMINAL = process.env.TRANZILA_TERMINAL || ''; // Tranzila Terminal Number
process.env.TRANZILA_USERNAME = process.env.TRANZILA_USERNAME || ''; // Tranzila Username
process.env.TRANZILA_PASSWORD = process.env.TRANZILA_PASSWORD || ''; // Tranzila Password/API Key

// Morning Invoice (חשבונית ירוקה) Configuration
process.env.MORNING_API_KEY = process.env.MORNING_API_KEY || ''; // Morning API Key
process.env.MORNING_API_SECRET = process.env.MORNING_API_SECRET || ''; // Morning API Secret
process.env.MORNING_BUSINESS_ID = process.env.MORNING_BUSINESS_ID || ''; // Morning Business ID

// Grow Payment Gateway Configuration
process.env.GROW_API_KEY = process.env.GROW_API_KEY || ''; // Grow API Key
process.env.GROW_API_SECRET = process.env.GROW_API_SECRET || ''; // Grow API Secret
process.env.GROW_MERCHANT_ID = process.env.GROW_MERCHANT_ID || ''; // Grow Merchant ID
process.env.GROW_WEBSITE_URL = process.env.GROW_WEBSITE_URL || ''; // Grow Website URL for clearing

// Initialize Stripe
const stripeClient = process.env.STRIPE_SECRET_KEY ? stripe(process.env.STRIPE_SECRET_KEY) : null;

// Temporary storage for transactions (in production, use a database)
const transactions = [];

// Temporary storage for users (in production, use a database)
// Load users from file if exists
const usersFilePath = path.join(__dirname, 'users.json');
let users = [];
let passwords = {};

// Load users from file on startup
try {
  if (fs.existsSync(usersFilePath)) {
    const usersData = JSON.parse(fs.readFileSync(usersFilePath, 'utf8'));
    users = usersData.users || [];
    passwords = usersData.passwords || {};
    console.log(`✅ Loaded ${users.length} users from file`);
  } else {
    console.log('📝 No users file found - starting with empty users');
  }
} catch (error) {
  console.error('❌ Error loading users file:', error);
  users = [];
  passwords = {};
}

// Save users to file
function saveUsers() {
  try {
    fs.writeFileSync(usersFilePath, JSON.stringify({ users, passwords }, null, 2), 'utf8');
    console.log(`💾 Saved ${users.length} users to file`);
  } catch (error) {
    console.error('❌ Error saving users file:', error);
  }
}

// Temporary storage for events (in production, use a database)
// Load events from file if exists
const eventsFilePath = path.join(__dirname, 'events.json');
let eventsData = {
  events: [],
  deletedEvents: []
};

// Load events from file on startup
try {
  if (fs.existsSync(eventsFilePath)) {
    const fileData = JSON.parse(fs.readFileSync(eventsFilePath, 'utf8'));
    eventsData.events = fileData.events || [];
    eventsData.deletedEvents = fileData.deletedEvents || [];
    console.log(`✅ Loaded ${eventsData.events.length} events from file`);
  } else {
    console.log('📝 No events file found - starting with empty events');
  }
} catch (error) {
  console.error('❌ Error loading events file:', error);
  eventsData = { events: [], deletedEvents: [] };
}

// Save events to file
function saveEvents() {
  try {
    fs.writeFileSync(eventsFilePath, JSON.stringify(eventsData, null, 2), 'utf8');
    console.log(`💾 Saved ${eventsData.events.length} events to file`);
  } catch (error) {
    console.error('❌ Error saving events file:', error);
  }
}

// Admin user (fixed)
const ADMIN_EMAIL = 'idodanan1@gmail.com';
const ADMIN_PASSWORD = 'QPwo1029';

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
app.use(express.json()); // Parse JSON bodies

// Stripe webhook handler (must be before express.json() to get raw body)
app.post('/api/payments/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];

  try {
    if (!process.env.STRIPE_WEBHOOK_SECRET || !stripeClient) {
      console.warn('⚠️ STRIPE_WEBHOOK_SECRET או stripeClient לא מוגדר - לא ניתן לאמת webhook');
      return res.status(400).json({ error: 'Webhook secret לא מוגדר' });
    }

    const event = stripeClient.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);

    // Handle the event
    if (event.type === 'payment_intent.succeeded') {
      const paymentIntent = event.data.object;
      const { userId, credits } = paymentIntent.metadata;

      // Find transaction (in production, use database)
      let transaction = transactions.find(t => t.id === paymentIntent.id);
      if (!transaction) {
        // Create new transaction if not found
        transaction = {
          id: paymentIntent.id,
          userId,
          amount: paymentIntent.amount / 100, // Convert from cents
          credits: parseInt(credits) || 0,
          status: 'pending',
          stripePaymentId: paymentIntent.id,
          createdAt: new Date(),
        };
        transactions.push(transaction);
      }
      
      transaction.status = 'success';
      transaction.stripePaymentId = paymentIntent.id;

      // Create invoice via Morning after successful payment
      try {
        await createMorningInvoice(transaction);
      } catch (invoiceError) {
        console.error('❌ Error creating invoice:', invoiceError);
        // Don't fail the webhook if invoice creation fails
      }

      console.log(`✅ Payment succeeded: ${paymentIntent.id} for user ${userId}, credits: ${credits}`);
      
      // Here you would update the user's credits in the database
      // For now, we'll just log it
      // In production: await updateUserCredits(userId, parseInt(credits));
    } else if (event.type === 'payment_intent.payment_failed') {
      const paymentIntent = event.data.object;
      
      // Find transaction
      const transaction = transactions.find(t => t.id === paymentIntent.id);
      if (transaction) {
        transaction.status = 'failed';
      }

      console.log(`❌ Payment failed: ${paymentIntent.id}`);
    }

    res.json({ received: true });
  } catch (err) {
    console.error('❌ Webhook error:', err.message);
    res.status(400).json({ error: `Webhook Error: ${err.message}` });
  }
});

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
        buttonId === 'מגיע' ||
        buttonIdLower.includes('confirm') ||
        buttonTitle === 'אישור הגעה' ||
        buttonTitle === 'מגיע' ||
        buttonTitle?.includes('אישור') ||
        buttonTitle?.includes('הגעה') ||
        buttonTitle?.includes('מגיע') ||
        buttonTitleLower.includes('אישור') ||
        buttonTitleLower.includes('הגעה') ||
        buttonTitleLower.includes('מגיע')) {
      console.log('✅ Guest confirmed attendance via button!');
      await updateGuestStatusByPhone(phoneNumber, 'confirmed');
      
      // Send automatic follow-up message asking for guest count
      await sendGuestCountQuestion(phoneNumber);
    } else if (buttonId === 'decline_attendance' || 
               buttonIdLower.includes('decline') ||
               buttonTitle === 'לא אוכל להגיע' ||
               buttonTitle?.includes('לא אוכל') ||
               buttonTitle?.includes('דחה') ||
               buttonTitle?.includes('לא') ||
               buttonTitleLower.includes('לא אוכל') ||
               buttonTitleLower.includes('דחה')) {
      console.log('❌ Guest declined attendance via button!');
      // Send confirmation message first, then update status
      await sendDeclineConfirmation(phoneNumber);
      await updateGuestStatusByPhone(phoneNumber, 'declined');
    } else {
      console.warn('⚠️ Unknown button clicked:', { buttonId, buttonTitle });
      console.warn('⚠️ Trying to match anyway...');
      // Try to match anyway based on common patterns
      if (buttonTitleLower.includes('כן') || buttonTitleLower.includes('מגיע') || buttonTitleLower.includes('אגיע')) {
        console.log('✅ Matched as confirmation based on text');
        await updateGuestStatusByPhone(phoneNumber, 'confirmed');
        
        // Send automatic follow-up message asking for guest count
        await sendGuestCountQuestion(phoneNumber);
      } else if (buttonTitleLower.includes('לא') || buttonTitleLower.includes('דחה')) {
        console.log('❌ Matched as decline based on text');
        // Send confirmation message first, then update status
        await sendDeclineConfirmation(phoneNumber);
        await updateGuestStatusByPhone(phoneNumber, 'declined');
      }
    }
    
    return;
  }

  // Handle text messages (fallback and guest count responses)
  const messageText = message.text?.body?.toLowerCase() || '';
  const originalMessageText = message.text?.body || '';
  
  // Check if this is a response to guest count question
  // Look for numbers or common phrases indicating guest count
  const guestCountMatch = extractGuestCount(originalMessageText);
  if (guestCountMatch !== null) {
    console.log(`📊 Guest count response detected: ${guestCountMatch} people`);
    await updateGuestCountByPhone(message.from, guestCountMatch);
    return; // Don't process as confirmation/decline
  }
  
  // IMPORTANT: Check for decline FIRST (before checking for confirmation)
  // This prevents "לא מגיע" from being matched as "מגיע"
  const isDecline = messageText.includes('לא אוכל להגיע') ||
      messageText.includes('לא מגיע') ||
      messageText.includes('לא מגיעים') ||
      messageText.includes('לא אוכל') ||
      messageText.includes('לא אגיע') ||
      messageText.includes('דחה') ||
      (messageText.includes('לא') && (messageText.includes('מגיע') || messageText.includes('אוכל')));
  
  const isConfirmation = (messageText.includes('כן') || 
                         messageText.includes('אשר') ||
                         messageText.includes('מגיע') ||
                         messageText.includes('אגיע')) &&
                         !messageText.includes('לא'); // Make sure it's not "לא מגיע"
  
  if (isDecline) {
    console.log('❌ Guest declined attendance via text!');
    console.log(`   Message text: "${originalMessageText}"`);
    console.log(`   Lowercase message: "${messageText}"`);
    console.log(`   Phone number: ${message.from}`);
    console.log(`   isDecline check result: ${isDecline}`);
    
    // Send confirmation message first, then update status
    try {
      await sendDeclineConfirmation(message.from);
      console.log('✅ Decline confirmation message sent');
    } catch (error) {
      console.error('❌ Error sending decline confirmation:', error);
    }
    
    try {
      await updateGuestStatusByPhone(message.from, 'declined');
      console.log('✅ Decline status update sent to pendingUpdates');
      
      // Verify it was added
      const verifyUpdate = pendingUpdates.find(u => 
        (u.phoneNumber === message.from.replace(/^0/, '972').replace(/[^0-9]/g, '').replace(/^972/, '0') || 
         u.originalPhoneNumber === message.from.replace(/[^0-9]/g, '')) &&
        u.status === 'declined'
      );
      if (verifyUpdate) {
        console.log('✅ Verified: Decline update is in pendingUpdates array');
      } else {
        console.error('❌ ERROR: Decline update NOT found in pendingUpdates!');
        console.log('📋 Current pendingUpdates:', pendingUpdates.map(u => ({
          phone: u.phoneNumber,
          status: u.status
        })));
      }
    } catch (error) {
      console.error('❌ Error updating guest status to declined:', error);
    }
  } else if (isConfirmation) {
    console.log('✅ Guest confirmed attendance via text!');
    console.log(`   Original message: "${originalMessageText}"`);
    console.log(`   Phone number: ${message.from}`);
    await updateGuestStatusByPhone(message.from, 'confirmed');
    console.log('✅ Confirmation status update sent to pendingUpdates');
    
    // Send automatic follow-up message asking for guest count
    console.log('📤 About to send guest count question...');
    try {
      await sendGuestCountQuestion(message.from);
      console.log('✅ Guest count question sent (or attempted)');
    } catch (error) {
      console.error('❌ Error sending guest count question:', error);
      if (error.response) {
        console.error('❌ Error response:', error.response.data);
      }
    }
  } else {
    console.log('ℹ️ Message did not match confirmation/decline patterns:', originalMessageText);
    console.log(`   isDecline: ${isDecline}, isConfirmation: ${isConfirmation}`);
  }
}

// Extract guest count from text message
function extractGuestCount(text) {
  if (!text) return null;
  
  // Try to find numbers first
  const numberMatch = text.match(/\d+/);
  if (numberMatch) {
    const count = parseInt(numberMatch[0], 10);
    if (count > 0 && count <= 100) { // Reasonable range
      return count;
    }
  }
  
  // Try Hebrew number words
  const hebrewNumbers = {
    'אחד': 1, 'אחת': 1, 'שניים': 2, 'שתיים': 2, 'שלושה': 3, 'שלוש': 3,
    'ארבעה': 4, 'ארבע': 4, 'חמישה': 5, 'חמש': 5, 'שישה': 6, 'שש': 6,
    'שבעה': 7, 'שבע': 7, 'שמונה': 8, 'תשעה': 9, 'תשע': 9, 'עשרה': 10, 'עשר': 10
  };
  
  const textLower = text.toLowerCase();
  for (const [word, num] of Object.entries(hebrewNumbers)) {
    if (textLower.includes(word)) {
      return num;
    }
  }
  
  // Try common phrases
  if (textLower.includes('רק אני') || textLower.includes('אני לבד')) {
    return 1;
  }
  if (textLower.includes('אני ו') || textLower.includes('אני +')) {
    // Try to extract number after "אני ו" or "אני +"
    const afterMatch = text.match(/אני\s*[ו+]\s*(\d+)/);
    if (afterMatch) {
      return parseInt(afterMatch[1], 10) + 1; // +1 for the person themselves
    }
    return 2; // Default to 2 if "אני ו" without number
  }
  
  return null;
}

// Update guest count by phone number
async function updateGuestCountByPhone(phoneNumber, guestCount) {
  try {
    const formattedPhone = phoneNumber.replace(/[^0-9]/g, '');
    const phoneWith0 = formattedPhone.replace(/^972/, '0');
    
    console.log(`🔄 Updating guest count for ${phoneNumber} to ${guestCount}`);
    
    // Store update in pending updates array
    const updateData = {
      phoneNumber: phoneWith0,
      originalPhoneNumber: formattedPhone,
      guestCount: guestCount,
      timestamp: Date.now()
    };
    
    // Add to pending updates
    pendingUpdates.push(updateData);
    console.log('✅ Guest count update stored:', updateData);
  } catch (error) {
    console.error('❌ Error updating guest count:', error);
  }
}

// Send confirmation message when guest declines
async function sendDeclineConfirmation(phoneNumber) {
  try {
    const confirmationMessage = 'הבנתי, אתה לא מגיע. תודה על העדכון! 🙏';
    
    console.log(`📤 Sending decline confirmation to ${phoneNumber}`);
    
    // Use WhatsApp Business API to send the message
    const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
    const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
    
    if (!accessToken || !phoneNumberId) {
      console.warn('⚠️ WhatsApp credentials not configured - cannot send decline confirmation');
      return;
    }
    
    // Format phone number
    const formattedPhone = phoneNumber.replace(/^0/, '972').replace(/[^0-9]/g, '');
    
    // Send as regular text message (follow-up after first message)
    const messagePayload = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: formattedPhone,
      type: 'text',
      text: {
        body: confirmationMessage
      }
    };
    
    const response = await axios.post(
      `https://graph.facebook.com/v22.0/${phoneNumberId}/messages`,
      messagePayload,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    if (response.status === 200) {
      console.log('✅ Decline confirmation sent successfully');
      console.log('📱 Response:', JSON.stringify(response.data, null, 2));
    } else {
      console.warn('⚠️ Failed to send decline confirmation:', response.status);
      console.warn('⚠️ Response data:', response.data);
    }
  } catch (error) {
    console.error('❌ Error sending guest count question:', error);
    if (error.response) {
      console.error('❌ Error response status:', error.response.status);
      console.error('❌ Error response data:', JSON.stringify(error.response.data, null, 2));
    } else if (error.request) {
      console.error('❌ No response received:', error.request);
    } else {
      console.error('❌ Error setting up request:', error.message);
    }
    // Don't throw - try fallback
    throw error; // Re-throw to trigger fallback in caller
  }
}

// Send follow-up message asking for guest count
async function sendGuestCountQuestion(phoneNumber) {
  try {
    console.log(`📤 Sending guest count question to ${phoneNumber}`);
    
    // Use WhatsApp Business API to send the message
    const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
    const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
    
    if (!accessToken || !phoneNumberId) {
      console.warn('⚠️ WhatsApp credentials not configured - cannot send guest count question');
      return;
    }
    
    // Format phone number
    const formattedPhone = phoneNumber.replace(/^0/, '972').replace(/[^0-9]/g, '');
    
    // Send as regular text message (follow-up after first message)
    // This works because the user already received the first message (template)
    const questionMessage = 'כמה אנשים אתם מתכוונים להגיע?';
    
    console.log('📋 Sending regular text message (follow-up)');
    const messagePayload = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: formattedPhone,
      type: 'text',
      text: {
        body: questionMessage
      }
    };
    
    console.log('📤 Sending request to WhatsApp API...');
    console.log('📤 Payload:', JSON.stringify(messagePayload, null, 2));
    
    const response = await axios.post(
      `https://graph.facebook.com/v22.0/${phoneNumberId}/messages`,
      messagePayload,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    if (response.status === 200) {
      console.log('✅ Guest count question sent successfully');
      console.log('📱 Response:', JSON.stringify(response.data, null, 2));
    } else {
      console.warn('⚠️ Failed to send guest count question:', response.status);
      console.warn('⚠️ Response data:', response.data);
    }
  } catch (error) {
    console.error('❌ Error sending guest count question:', error);
    // Don't throw - this is not critical
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
// Handle OPTIONS preflight for pending-updates endpoint
app.options('/api/guests/pending-updates', (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Max-Age', '86400'); // 24 hours
  res.sendStatus(200);
});

app.get('/api/guests/pending-updates', (req, res) => {
  // CRITICAL: Set CORS headers FIRST, before any other operations
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  
  // Return pending updates (but don't clear them immediately - let frontend process them first)
  const updates = [...pendingUpdates];
  
  // Return new updates (not older than 5 minutes)
  const fiveMinutesAgo = Date.now() - (5 * 60 * 1000);
  
  // Filter recent updates first
  const recentUpdates = updates.filter(u => u.timestamp > fiveMinutesAgo);
  
  // Format updates for frontend
  const formattedUpdates = recentUpdates.map(u => ({
    phoneNumber: u.phoneNumber || u.originalPhoneNumber,
    status: u.status, // May be undefined for guest count updates
    responseDate: u.responseDate || new Date(u.timestamp).toISOString(),
    guestCount: u.guestCount // Include guest count if present
  }));
  
  // Clear old updates (older than 1 hour) but keep recent ones
  const oneHourAgo = Date.now() - (60 * 60 * 1000);
  const filteredUpdates = pendingUpdates.filter(u => u.timestamp > oneHourAgo);
  pendingUpdates.length = 0;
  pendingUpdates.push(...filteredUpdates);
  
  console.log(`📤 GET /api/guests/pending-updates - Returning ${formattedUpdates.length} pending updates (total in memory: ${pendingUpdates.length})`);
  if (formattedUpdates.length > 0) {
    console.log('📤 Updates being returned:', formattedUpdates.map(u => ({ 
      phone: u.phoneNumber, 
      status: u.status, 
      responseDate: u.responseDate
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
    updates: formattedUpdates, // Return formatted updates, not raw
    updatesCount: formattedUpdates.length,
    totalPending: pendingUpdates.length
  });
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'WhatsApp Backend is running' });
});

// ========================================
// Stripe Payment Endpoints
// ========================================

// Create payment intent
app.post('/api/payments/create-intent', async (req, res) => {
  try {
    if (!stripeClient) {
      return res.status(500).json({ error: 'Stripe לא מוגדר. אנא הוסף STRIPE_SECRET_KEY ל-environment variables.' });
    }

    const { amount, credits, userId, currency = 'ils' } = req.body;

    if (!amount || !credits || !userId) {
      return res.status(400).json({ error: 'חסרים פרמטרים: amount, credits, userId' });
    }

    // Create payment intent in Stripe
    const paymentIntent = await stripeClient.paymentIntents.create({
      amount: Math.round(amount * 100), // Convert to agorot (cents)
      currency: currency,
      metadata: {
        userId,
        credits: credits.toString(),
      },
    });

    // Store transaction
    const transaction = {
      id: paymentIntent.id,
      userId,
      amount,
      credits,
      status: 'pending',
      createdAt: new Date(),
    };
    transactions.push(transaction);

    res.json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
    });
  } catch (error) {
    console.error('❌ Error creating payment intent:', error);
    res.status(500).json({ error: error.message || 'שגיאה ביצירת תשלום' });
  }
});


// Get transaction history
app.get('/api/payments/transactions/:userId', (req, res) => {
  const { userId } = req.params;
  const userTransactions = transactions.filter(t => t.userId === userId);
  res.json({ transactions: userTransactions });
});

// Get all transactions (admin only)
app.get('/api/payments/transactions', (req, res) => {
  res.json({ transactions });
});

// ========================================
// Tranzila Payment Endpoints
// ========================================

// Create Tranzila payment
app.post('/api/payments/tranzila/create', async (req, res) => {
  try {
    const { amount, credits, userId, currency = 'ILS' } = req.body;

    if (!amount || !credits || !userId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Check if Tranzila is configured
    if (!process.env.TRANZILA_TERMINAL || !process.env.TRANZILA_USERNAME || !process.env.TRANZILA_PASSWORD) {
      return res.status(500).json({ 
        error: 'Tranzila לא מוגדר. אנא הוסף TRANZILA_TERMINAL, TRANZILA_USERNAME, TRANZILA_PASSWORD ל-.env' 
      });
    }

    // Generate transaction ID
    const transactionId = `tranzila_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Create transaction record
    const transaction = {
      id: transactionId,
      userId,
      amount,
      credits,
      status: 'pending',
      tranzilaTransactionId: null,
      createdAt: new Date(),
    };

    transactions.push(transaction);

    // TODO: Integrate with Tranzila API
    // For now, return payment URL (will be implemented after getting API credentials)
    const paymentUrl = `https://secure5.tranzila.com/api/payment?terminal=${process.env.TRANZILA_TERMINAL}&sum=${amount}&currency=${currency}&TranzilaTK=${transactionId}`;

    res.json({
      success: true,
      paymentUrl,
      transactionId,
    });
  } catch (error) {
    console.error('❌ Error creating Tranzila payment:', error);
    res.status(500).json({ error: 'שגיאה ביצירת תשלום' });
  }
});

// Check Tranzila payment status
app.get('/api/payments/tranzila/status/:transactionId', (req, res) => {
  try {
    const { transactionId } = req.params;
    const transaction = transactions.find(t => t.id === transactionId);

    if (!transaction) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    res.json({ transaction });
  } catch (error) {
    console.error('❌ Error checking payment status:', error);
    res.status(500).json({ error: 'שגיאה בבדיקת סטטוס תשלום' });
  }
});

// Get Tranzila transactions for user
app.get('/api/payments/tranzila/transactions/:userId', (req, res) => {
  try {
    const { userId } = req.params;
    const userTransactions = transactions.filter(t => t.userId === userId);
    res.json({ transactions: userTransactions });
  } catch (error) {
    console.error('❌ Error fetching transactions:', error);
    res.status(500).json({ error: 'שגיאה בקבלת תשלומים' });
  }
});

// Get all Tranzila transactions (admin only)
app.get('/api/payments/tranzila/transactions', (req, res) => {
  try {
    res.json({ transactions });
  } catch (error) {
    console.error('❌ Error fetching all transactions:', error);
    res.status(500).json({ error: 'שגיאה בקבלת תשלומים' });
  }
});

// Tranzila webhook callback (for payment confirmation)
app.post('/api/payments/tranzila/webhook', async (req, res) => {
  try {
    // TODO: Implement Tranzila webhook handler
    // This will be called by Tranzila after payment is processed
    const { transactionId, status, amount } = req.body;

    const transaction = transactions.find(t => t.id === transactionId || t.tranzilaTransactionId === transactionId);
    if (transaction) {
      transaction.status = status === 'success' || status === 'approved' ? 'success' : 'failed';
      transaction.tranzilaTransactionId = transactionId;

      // Create invoice if payment succeeded
      if (transaction.status === 'success') {
        try {
          await createMorningInvoice(transaction);
        } catch (invoiceError) {
          console.error('❌ Error creating invoice:', invoiceError);
          // Don't fail the webhook if invoice creation fails
        }
      }
    }

    res.json({ success: true });
  } catch (error) {
    console.error('❌ Error processing Tranzila webhook:', error);
    res.status(500).json({ error: 'שגיאה בעיבוד webhook' });
  }
});

// ========================================
// Morning Invoice (חשבונית ירוקה) Functions
// ========================================

/**
 * יוצר חשבונית במורנינג אחרי תשלום מוצלח
 */
async function createMorningInvoice(transaction) {
  // Check if Morning is configured
  if (!process.env.MORNING_API_KEY || !process.env.MORNING_API_SECRET) {
    console.log('⚠️ Morning Invoice לא מוגדר - מדלג על יצירת חשבונית');
    return null;
  }

  try {
    // TODO: Implement Morning API call
    // This will be implemented after getting API credentials
    // For now, just log
    console.log('📄 Creating Morning invoice for transaction:', transaction.id);
    
    // Example API call structure (will be updated with actual API):
    /*
    const invoiceData = {
      customer: {
        name: transaction.userName || 'לקוח',
        email: transaction.userEmail,
        phone: transaction.userPhone,
      },
      items: [{
        description: `רכישת ${transaction.credits} רשומות`,
        quantity: 1,
        price: transaction.amount,
      }],
      payment: {
        method: 'credit_card',
        transactionId: transaction.tranzilaTransactionId || transaction.id,
      },
    };

    const response = await axios.post('https://api.morning.co.il/v1/invoices', invoiceData, {
      headers: {
        'Authorization': `Bearer ${process.env.MORNING_API_KEY}`,
        'Content-Type': 'application/json',
      },
    });

    return response.data;
    */

    // For now, return success (will be implemented with actual API)
    console.log('✅ Morning invoice creation logged (API implementation pending)');
    return { success: true, invoiceId: 'pending', message: 'API implementation pending' };
  } catch (error) {
    console.error('❌ Error creating Morning invoice:', error);
    throw error;
  }
}

// ========================================
// Morning Invoice Endpoints
// ========================================

// Create Morning invoice
app.post('/api/invoices/morning/create', async (req, res) => {
  try {
    const { customerName, customerEmail, customerPhone, customerId, amount, description, transactionId, userId } = req.body;

    if (!customerName || !amount || !transactionId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Check if Morning is configured
    if (!process.env.MORNING_API_KEY || !process.env.MORNING_API_SECRET) {
      return res.status(500).json({ 
        error: 'Morning Invoice לא מוגדר. אנא הוסף MORNING_API_KEY ו-MORNING_API_SECRET ל-.env' 
      });
    }

    // Create invoice via Morning API
    const invoiceResult = await createMorningInvoice({
      id: transactionId,
      userId,
      amount,
      credits: 0, // Will be filled from transaction
      customerName,
      customerEmail,
      customerPhone,
      customerId,
      description,
    });

    res.json({
      success: true,
      invoiceId: invoiceResult?.invoiceId,
      invoiceUrl: invoiceResult?.invoiceUrl,
    });
  } catch (error) {
    console.error('❌ Error creating Morning invoice:', error);
    res.status(500).json({ error: 'שגיאה ביצירת חשבונית' });
  }
});

// Get Morning invoice
app.get('/api/invoices/morning/:invoiceId', async (req, res) => {
  try {
    const { invoiceId } = req.params;

    // TODO: Implement Morning API call to get invoice
    // For now, return placeholder
    res.json({
      success: true,
      invoiceId,
      message: 'Invoice retrieval will be implemented with Morning API credentials',
    });
  } catch (error) {
    console.error('❌ Error fetching invoice:', error);
    res.status(500).json({ error: 'שגיאה בקבלת חשבונית' });
  }
});

// ========================================
// Grow Payment Gateway Endpoints
// ========================================

// Create Grow payment
app.post('/api/payments/grow/create', async (req, res) => {
  try {
    const { amount, credits, userId, currency = 'ILS', customerName, customerEmail, customerPhone } = req.body;

    if (!amount || !credits || !userId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Check if Grow is configured
    if (!process.env.GROW_API_KEY || !process.env.GROW_API_SECRET || !process.env.GROW_MERCHANT_ID) {
      return res.status(500).json({ 
        error: 'Grow לא מוגדר. אנא הוסף GROW_API_KEY, GROW_API_SECRET, GROW_MERCHANT_ID ל-.env' 
      });
    }

    // Generate transaction ID
    const transactionId = `grow_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Create transaction record
    const transaction = {
      id: transactionId,
      userId,
      amount,
      credits,
      status: 'pending',
      growTransactionId: null,
      createdAt: new Date(),
    };

    transactions.push(transaction);

    // TODO: Integrate with Grow API
    // This will be implemented after getting API credentials
    // For now, return payment URL structure
    const paymentUrl = `${process.env.GROW_WEBSITE_URL || 'https://secure.grow.co.il'}/payment?transaction=${transactionId}&amount=${amount}&currency=${currency}`;

    res.json({
      success: true,
      paymentUrl,
      transactionId,
    });
  } catch (error) {
    console.error('❌ Error creating Grow payment:', error);
    res.status(500).json({ error: 'שגיאה ביצירת תשלום' });
  }
});

// Check Grow payment status
app.get('/api/payments/grow/status/:transactionId', (req, res) => {
  try {
    const { transactionId } = req.params;
    const transaction = transactions.find(t => t.id === transactionId || t.growTransactionId === transactionId);

    if (!transaction) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    res.json({ transaction });
  } catch (error) {
    console.error('❌ Error checking payment status:', error);
    res.status(500).json({ error: 'שגיאה בבדיקת סטטוס תשלום' });
  }
});

// Get Grow transactions for user
app.get('/api/payments/grow/transactions/:userId', (req, res) => {
  try {
    const { userId } = req.params;
    const userTransactions = transactions.filter(t => t.userId === userId);
    res.json({ transactions: userTransactions });
  } catch (error) {
    console.error('❌ Error fetching transactions:', error);
    res.status(500).json({ error: 'שגיאה בקבלת תשלומים' });
  }
});

// Get all Grow transactions (admin only)
app.get('/api/payments/grow/transactions', (req, res) => {
  try {
    res.json({ transactions });
  } catch (error) {
    console.error('❌ Error fetching all transactions:', error);
    res.status(500).json({ error: 'שגיאה בקבלת תשלומים' });
  }
});

// Grow webhook callback (for payment confirmation)
app.post('/api/payments/grow/webhook', async (req, res) => {
  try {
    // TODO: Implement Grow webhook handler
    // This will be called by Grow after payment is processed
    const { transactionId, status, amount } = req.body;

    const transaction = transactions.find(t => t.id === transactionId || t.growTransactionId === transactionId);
    if (transaction) {
      transaction.status = status === 'success' || status === 'approved' || status === 'completed' ? 'success' : 'failed';
      transaction.growTransactionId = transactionId;

      // Create invoice if payment succeeded
      if (transaction.status === 'success') {
        try {
          await createMorningInvoice(transaction);
        } catch (invoiceError) {
          console.error('❌ Error creating invoice:', invoiceError);
          // Don't fail the webhook if invoice creation fails
        }
      }
    }

    res.json({ success: true });
  } catch (error) {
    console.error('❌ Error processing Grow webhook:', error);
    res.status(500).json({ error: 'שגיאה בעיבוד webhook' });
  }
});

// ============================================
// USER MANAGEMENT API ENDPOINTS
// ============================================

// Sign up (create new user)
app.post('/api/users/signup', async (req, res) => {
  try {
    const { email, password, name } = req.body;
    
    if (!email || !password || !name) {
      return res.status(400).json({ error: 'כל השדות נדרשים' });
    }
    
    const normalizedEmail = email.toLowerCase().trim();
    
    // Check if admin email
    if (normalizedEmail === ADMIN_EMAIL.toLowerCase()) {
      return res.status(400).json({ error: 'לא ניתן להירשם עם אימייל זה. אנא השתמש בדף ההתחברות למנהל.' });
    }
    
    // Check if user already exists
    const existingUser = users.find(u => u.email.toLowerCase().trim() === normalizedEmail);
    if (existingUser) {
      return res.status(400).json({ error: 'משתמש עם אימייל זה כבר קיים' });
    }
    
    // Create new user
    const newUser = {
      id: `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      email: normalizedEmail,
      name: name.trim(),
      credits: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isAdmin: false
    };
    
    users.push(newUser);
    passwords[normalizedEmail] = password; // In production, hash this with bcrypt
    
    saveUsers();
    
    console.log(`✅ New user created: ${newUser.email} (${newUser.name})`);
    
    // Return user without password
    res.status(201).json({
      success: true,
      user: newUser
    });
  } catch (error) {
    console.error('❌ Signup error:', error);
    res.status(500).json({ error: 'שגיאה ביצירת משתמש' });
  }
});

// Login
app.post('/api/users/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ error: 'אימייל וסיסמה נדרשים' });
    }
    
    const normalizedEmail = email.toLowerCase().trim();
    
    // Check if admin
    if (normalizedEmail === ADMIN_EMAIL.toLowerCase()) {
      if (password === ADMIN_PASSWORD) {
        const adminUser = {
          id: 'admin-fixed-id',
          email: ADMIN_EMAIL,
          name: 'מנהל המערכת',
          credits: 999999,
          createdAt: '2024-01-01T00:00:00.000Z',
          updatedAt: new Date().toISOString(),
          isAdmin: true
        };
        
        return res.json({
          success: true,
          user: adminUser
        });
      } else {
        return res.status(401).json({ error: 'אימייל או סיסמה שגויים' });
      }
    }
    
    // Check regular user
    const storedPassword = passwords[normalizedEmail];
    if (!storedPassword || storedPassword !== password) {
      return res.status(401).json({ error: 'אימייל או סיסמה שגויים' });
    }
    
    const user = users.find(u => u.email.toLowerCase().trim() === normalizedEmail);
    if (!user) {
      return res.status(404).json({ error: 'משתמש לא נמצא' });
    }
    
    // Return user without password
    res.json({
      success: true,
      user: user
    });
  } catch (error) {
    console.error('❌ Login error:', error);
    res.status(500).json({ error: 'שגיאה בהתחברות' });
  }
});

// Get all users (admin only)
app.get('/api/users', async (req, res) => {
  try {
    // In production, add authentication check here
    const usersWithPasswords = users.map(u => ({
      ...u,
      password: passwords[u.email.toLowerCase().trim()] || '(לא נמצאה סיסמה)'
    }));
    
    // Add admin user
    const adminUser = {
      id: 'admin-fixed-id',
      email: ADMIN_EMAIL,
      name: 'מנהל המערכת',
      credits: 999999,
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: new Date().toISOString(),
      isAdmin: true,
      password: ADMIN_PASSWORD
    };
    
    res.json({
      success: true,
      users: [adminUser, ...usersWithPasswords]
    });
  } catch (error) {
    console.error('❌ Get users error:', error);
    res.status(500).json({ error: 'שגיאה בטעינת משתמשים' });
  }
});

// Update user credits (admin only)
app.post('/api/users/:userId/credits', async (req, res) => {
  try {
    const { userId } = req.params;
    const { creditsToAdd } = req.body;
    
    if (!creditsToAdd || creditsToAdd <= 0) {
      return res.status(400).json({ error: 'כמות רשומות לא תקינה' });
    }
    
    // Find user
    const userIndex = users.findIndex(u => u.id === userId);
    if (userIndex === -1) {
      return res.status(404).json({ error: 'משתמש לא נמצא' });
    }
    
    const user = users[userIndex];
    const currentCredits = user.credits || 0;
    const newCredits = currentCredits + creditsToAdd;
    
    users[userIndex] = {
      ...user,
      credits: newCredits,
      updatedAt: new Date().toISOString()
    };
    
    saveUsers();
    
    res.json({
      success: true,
      user: users[userIndex],
      previousCredits: currentCredits,
      newCredits: newCredits
    });
  } catch (error) {
    console.error('❌ Update credits error:', error);
    res.status(500).json({ error: 'שגיאה בעדכון רשומות' });
  }
});

// ========================================
// Events API Endpoints (for syncing between computers)
// ========================================

// Get all events for a user
app.get('/api/events/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Filter events by userId
    const userEvents = eventsData.events.filter(e => e.userId === userId);
    
    console.log(`📋 Fetched ${userEvents.length} events for user ${userId}`);
    
    res.json({
      success: true,
      events: userEvents,
      deletedEvents: eventsData.deletedEvents.filter(e => e.userId === userId)
    });
  } catch (error) {
    console.error('❌ Error fetching events:', error);
    res.status(500).json({ error: 'שגיאה בקבלת אירועים' });
  }
});

// Get all events (for admin or public access)
app.get('/api/events', async (req, res) => {
  try {
    res.json({
      success: true,
      events: eventsData.events,
      deletedEvents: eventsData.deletedEvents
    });
  } catch (error) {
    console.error('❌ Error fetching all events:', error);
    res.status(500).json({ error: 'שגיאה בקבלת אירועים' });
  }
});

// Save/Update events (sync from client)
app.post('/api/events/sync', async (req, res) => {
  try {
    const { events, userId } = req.body;
    
    if (!events || !Array.isArray(events)) {
      return res.status(400).json({ error: 'events must be an array' });
    }
    
    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }
    
    console.log(`💾 Syncing ${events.length} events for user ${userId}`);
    
    // Remove old events for this user
    eventsData.events = eventsData.events.filter(e => e.userId !== userId);
    
    // Add new events
    eventsData.events.push(...events);
    
    // Save to file
    saveEvents();
    
    console.log(`✅ Synced ${events.length} events for user ${userId}`);
    
    res.json({
      success: true,
      message: `Synced ${events.length} events`,
      totalEvents: eventsData.events.length
    });
  } catch (error) {
    console.error('❌ Error syncing events:', error);
    res.status(500).json({ error: 'שגיאה בסנכרון אירועים' });
  }
});

// Create or update a single event
app.post('/api/events', async (req, res) => {
  try {
    const event = req.body;
    
    if (!event.id || !event.userId) {
      return res.status(400).json({ error: 'Event id and userId are required' });
    }
    
    // Check if event exists
    const existingIndex = eventsData.events.findIndex(e => e.id === event.id);
    
    if (existingIndex >= 0) {
      // Update existing event
      eventsData.events[existingIndex] = {
        ...eventsData.events[existingIndex],
        ...event,
        updatedAt: new Date().toISOString()
      };
      console.log(`🔄 Updated event ${event.id}`);
    } else {
      // Create new event
      eventsData.events.push({
        ...event,
        createdAt: event.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
      console.log(`✨ Created event ${event.id}`);
    }
    
    // Save to file
    saveEvents();
    
    res.json({
      success: true,
      event: existingIndex >= 0 ? eventsData.events[existingIndex] : eventsData.events[eventsData.events.length - 1]
    });
  } catch (error) {
    console.error('❌ Error saving event:', error);
    res.status(500).json({ error: 'שגיאה בשמירת אירוע' });
  }
});

// Delete an event
app.delete('/api/events/:eventId', async (req, res) => {
  try {
    const { eventId } = req.params;
    
    const eventIndex = eventsData.events.findIndex(e => e.id === eventId);
    
    if (eventIndex === -1) {
      return res.status(404).json({ error: 'Event not found' });
    }
    
    const event = eventsData.events[eventIndex];
    
    // Move to deletedEvents
    eventsData.deletedEvents.push({
      ...event,
      deletedAt: new Date().toISOString()
    });
    
    // Remove from events
    eventsData.events.splice(eventIndex, 1);
    
    // Save to file
    saveEvents();
    
    console.log(`🗑️ Deleted event ${eventId}`);
    
    res.json({
      success: true,
      message: 'Event deleted'
    });
  } catch (error) {
    console.error('❌ Error deleting event:', error);
    res.status(500).json({ error: 'שגיאה במחיקת אירוע' });
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 WhatsApp Backend running on port ${PORT}`);
  console.log(`📱 Ready to send WhatsApp messages!`);
  console.log(`👥 User Management API: Ready`);
  const webhookUrl = process.env.RENDER_EXTERNAL_URL 
    ? `${process.env.RENDER_EXTERNAL_URL}/api/whatsapp/webhook`
    : `http://localhost:${PORT}/api/whatsapp/webhook`;
  console.log(`🔗 Webhook endpoint: ${webhookUrl}`);
  if (stripeClient) {
    console.log(`💳 Stripe payment endpoints ready`);
  } else {
    console.log(`⚠️ Stripe not configured - add STRIPE_SECRET_KEY to enable payments`);
  }
  
  if (process.env.TRANZILA_TERMINAL && process.env.TRANZILA_USERNAME && process.env.TRANZILA_PASSWORD) {
    console.log(`💳 Tranzila payment endpoints ready`);
  } else {
    console.log(`⚠️ Tranzila not configured - add TRANZILA_TERMINAL, TRANZILA_USERNAME, TRANZILA_PASSWORD to enable payments`);
  }
  
  if (process.env.GROW_API_KEY && process.env.GROW_API_SECRET && process.env.GROW_MERCHANT_ID) {
    console.log(`💳 Grow payment endpoints ready`);
  } else {
    console.log(`⚠️ Grow not configured - add GROW_API_KEY, GROW_API_SECRET, GROW_MERCHANT_ID to enable payments`);
  }
});
