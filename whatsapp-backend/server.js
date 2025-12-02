const express = require('express');
const cors = require('cors');
const axios = require('axios');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const stripe = require('stripe');
const mongoose = require('mongoose');
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

// MongoDB Connection and User Model
// MongoDB connection string - use environment variable or default to local MongoDB
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/rsvp-system';

// Log MongoDB URI status (without exposing credentials)
console.log('🔍 Checking MongoDB configuration...');
if (process.env.MONGODB_URI) {
  const uriParts = MONGODB_URI.split('@');
  if (uriParts.length > 1) {
    console.log('✅ MONGODB_URI is set in environment variables');
    console.log('📊 MongoDB URI configured:', uriParts[1]); // Show only the host part
    // Check if it contains the database name
    if (MONGODB_URI.includes('/rsvp-system') || MONGODB_URI.includes('/?') || MONGODB_URI.includes('?retryWrites')) {
      console.log('✅ Database name appears to be configured in URI');
    } else {
      console.warn('⚠️  Database name might be missing from URI. Expected format: mongodb+srv://.../rsvp-system?...');
    }
  } else {
    console.log('✅ MONGODB_URI is set in environment variables');
    console.log('📊 MongoDB URI configured:', MONGODB_URI);
  }
} else {
  console.error('❌ MONGODB_URI NOT SET in environment variables!');
  console.log('💡 Using default local MongoDB: mongodb://localhost:27017/rsvp-system');
  console.log('💡 To use MongoDB Atlas, set MONGODB_URI in your .env file or Render Environment Variables');
}

// User Schema
const userSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  name: { type: String, required: true, trim: true },
  password: { type: String, required: true }, // In production, hash this with bcrypt
  phoneNumber: { type: String, required: true, trim: true }, // Phone number for verification
  phoneVerified: { type: Boolean, default: false }, // Whether phone is verified
  credits: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  isAdmin: { type: Boolean, default: false }
});

// Create indexes (unique already creates index, so we only add non-unique indexes)
userSchema.index({ phoneNumber: 1 });

const User = mongoose.model('User', userSchema);

// Phone Verification Code Schema
const verificationCodeSchema = new mongoose.Schema({
  phoneNumber: { type: String, required: true, index: true },
  code: { type: String, required: true },
  purpose: { type: String, required: true, enum: ['signup', 'reset-password', 'login'] },
  expiresAt: { type: Date, required: true, index: { expireAfterSeconds: 0 } },
  attempts: { type: Number, default: 0 },
  maxAttempts: { type: Number, default: 5 },
  createdAt: { type: Date, default: Date.now }
});

const VerificationCode = mongoose.model('VerificationCode', verificationCodeSchema);

// Connect to MongoDB
let isMongoConnected = false;
let mongoConnectionAttempts = 0;
const MAX_CONNECTION_ATTEMPTS = 10; // Increased attempts for Render

async function connectMongoDB() {
  try {
    if (isMongoConnected || mongoose.connection.readyState === 1) {
      isMongoConnected = true;
      return;
    }
    
    // Check if MONGODB_URI is set
    if (!MONGODB_URI || MONGODB_URI === 'mongodb://localhost:27017/rsvp-system') {
      console.log('⚠️  MONGODB_URI not configured. Using default local MongoDB.');
      console.log('💡 To use MongoDB Atlas, set MONGODB_URI in Render Environment Variables');
      // Don't try to connect if URI is not set
      return;
    }
    
    // Validate URI format
    if (!MONGODB_URI.includes('mongodb+srv://') && !MONGODB_URI.includes('mongodb://')) {
      console.error('❌ Invalid MONGODB_URI format. Must start with mongodb:// or mongodb+srv://');
      return;
    }
    
    // Check if URI contains placeholder values
    if (MONGODB_URI.includes('<db_username>') || MONGODB_URI.includes('<db_password>')) {
      console.error('❌ MONGODB_URI contains placeholder values (<db_username> or <db_password>)');
      console.error('💡 Please replace <db_username> and <db_password> with your actual MongoDB Atlas credentials');
      return;
    }
    
    mongoConnectionAttempts++;
    console.log(`🔌 Attempting to connect to MongoDB (attempt ${mongoConnectionAttempts}/${MAX_CONNECTION_ATTEMPTS})...`);
    
    // Show URI preview (without password)
    const uriPreview = MONGODB_URI.replace(/\/\/([^:]+):([^@]+)@/, '//$1:***@');
    console.log(`📊 MONGODB_URI preview: ${uriPreview.split('@')[1] || 'configured'}`);
    
    // Ensure database name is in URI
    let connectionUri = MONGODB_URI;
    if (!connectionUri.includes('/rsvp-system') && !connectionUri.includes('/?') && !connectionUri.includes('?retryWrites')) {
      // Add database name if not present
      const separator = connectionUri.includes('?') ? '&' : '?';
      connectionUri = connectionUri.replace(/\/$/, '') + '/rsvp-system' + (connectionUri.includes('?') ? '' : separator + 'retryWrites=true&w=majority');
      console.log('📝 Added database name to connection URI');
    }
    
    await mongoose.connect(connectionUri, {
      serverSelectionTimeoutMS: 30000, // Increased timeout for Render
      socketTimeoutMS: 45000,
      connectTimeoutMS: 30000,
    });
    
    isMongoConnected = true;
    mongoConnectionAttempts = 0;
    console.log('✅ Connected to MongoDB successfully!');
    
    // Set up connection event handlers
    mongoose.connection.on('error', (err) => {
      console.error('❌ MongoDB connection error:', err.message);
      isMongoConnected = false;
    });
    
    mongoose.connection.on('disconnected', () => {
      console.warn('⚠️  MongoDB disconnected. Attempting to reconnect...');
      isMongoConnected = false;
      // Try to reconnect after 5 seconds
      setTimeout(() => {
        if (!isMongoConnected && mongoConnectionAttempts < MAX_CONNECTION_ATTEMPTS) {
          connectMongoDB();
        }
      }, 5000);
    });
    
    // Migrate users from file to MongoDB if file exists
    await migrateUsersFromFile();
  } catch (error) {
    console.error('❌ MongoDB connection error:', error.message);
    console.error('❌ Error details:', {
      name: error.name,
      code: error.code,
      message: error.message
    });
    isMongoConnected = false;
    
    // Provide specific help for authentication errors
    if (error.message && error.message.includes('bad auth') || error.message.includes('Authentication failed')) {
      console.error('');
      console.error('🔐 AUTHENTICATION ERROR - How to fix:');
      console.error('');
      console.error('1. Go to MongoDB Atlas → Database Access');
      console.error('2. Find your database user and check the username');
      console.error('3. Click "Edit" on the user and reset the password if needed');
      console.error('4. Copy the NEW password');
      console.error('5. Go to Render → Environment Variables');
      console.error('6. Update MONGODB_URI with the correct password');
      console.error('');
      console.error('📝 MONGODB_URI format should be:');
      console.error('   mongodb+srv://USERNAME:PASSWORD@cluster0.rywfr9c.mongodb.net/rsvp-system?retryWrites=true&w=majority');
      console.error('');
      console.error('⚠️  IMPORTANT: If password contains special characters, encode them:');
      console.error('   @ → %40, # → %23, % → %25, ! → %21, : → %3A, / → %2F');
      console.error('');
      console.error('💡 TIP: Get connection string from MongoDB Atlas:');
      console.error('   Database → Connect → Connect your application → Copy connection string');
      console.error('   Replace <password> with your actual password');
      console.error('');
    }
    
    if (mongoConnectionAttempts < MAX_CONNECTION_ATTEMPTS) {
      const retryDelay = Math.min(5000 * mongoConnectionAttempts, 30000); // Exponential backoff, max 30s
      console.log(`🔄 Retrying connection in ${retryDelay/1000} seconds... (${mongoConnectionAttempts}/${MAX_CONNECTION_ATTEMPTS})`);
      setTimeout(() => {
        connectMongoDB();
      }, retryDelay);
    } else {
      console.error('❌ Failed to connect to MongoDB after multiple attempts');
      console.log('⚠️  The server will continue running, but user management features will be unavailable');
      console.log('💡 Please check:');
      console.log('   1. MONGODB_URI is set correctly in Render Environment Variables');
      console.log('   2. MongoDB Atlas Network Access allows 0.0.0.0/0 (all IPs)');
      console.log('   3. MongoDB Atlas Database User credentials are correct');
      console.log('   4. MongoDB Atlas cluster is running');
      // Reset attempts after a while to allow retry
      setTimeout(() => {
        mongoConnectionAttempts = 0;
        console.log('🔄 Resetting connection attempts counter. Will try again...');
      }, 60000); // Reset after 1 minute
    }
  }
}

// Migrate users from file to MongoDB (one-time migration)
async function migrateUsersFromFile() {
  try {
    const usersFilePath = path.join(__dirname, 'users.json');
    if (!fs.existsSync(usersFilePath)) {
      return;
    }
    
    const usersData = JSON.parse(fs.readFileSync(usersFilePath, 'utf8'));
    const fileUsers = usersData.users || [];
    const filePasswords = usersData.passwords || {};
    
    if (fileUsers.length === 0) {
      return;
    }
    
    // Check if users already exist in MongoDB
    const existingCount = await User.countDocuments();
    if (existingCount > 0) {
      console.log('📋 Users already exist in MongoDB, skipping migration');
      return;
    }
    
    // Migrate users
    for (const user of fileUsers) {
      const normalizedEmail = user.email.toLowerCase().trim();
      const password = filePasswords[normalizedEmail];
      
      if (password) {
        const userDoc = new User({
          id: user.id,
          email: normalizedEmail,
          name: user.name,
          password: password,
          credits: user.credits || 0,
          createdAt: user.createdAt ? new Date(user.createdAt) : new Date(),
          updatedAt: user.updatedAt ? new Date(user.updatedAt) : new Date(),
          isAdmin: user.isAdmin || false
        });
        
        try {
          await userDoc.save();
          console.log(`✅ Migrated user: ${user.email}`);
        } catch (error) {
          if (error.code !== 11000) { // Skip duplicate key errors
            console.error(`❌ Error migrating user ${user.email}:`, error.message);
          }
        }
      }
    }
    
    console.log(`✅ Migration complete: ${fileUsers.length} users migrated to MongoDB`);
  } catch (error) {
    console.error('❌ Error during migration:', error);
  }
}

// Initialize MongoDB connection (non-blocking)
connectMongoDB().catch(err => {
  console.error('❌ Failed to initialize MongoDB connection:', err);
});

// Also try to reconnect periodically if not connected
setInterval(() => {
  if (!isMongoConnected && mongoose.connection.readyState !== 1) {
    console.log('🔄 Attempting to reconnect to MongoDB...');
    connectMongoDB();
  }
}, 30000); // Try every 30 seconds

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

// Load events from file (reload from disk)
function loadEvents() {
  try {
    if (fs.existsSync(eventsFilePath)) {
      const fileData = JSON.parse(fs.readFileSync(eventsFilePath, 'utf8'));
      eventsData.events = fileData.events || [];
      eventsData.deletedEvents = fileData.deletedEvents || [];
      console.log(`✅ Reloaded ${eventsData.events.length} events from file`);
    }
    return eventsData.events;
  } catch (error) {
    console.error('❌ Error loading events file:', error);
    return eventsData.events || [];
  }
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
    
    console.log('🔘 ========== BUTTON CLICKED ==========');
    console.log('🔘 Button ID:', buttonId);
    console.log('🔘 Button Title:', buttonTitle);
    console.log('🔘 Phone Number:', phoneNumber);
    console.log('🔘 Full interactive object:', JSON.stringify(message.interactive, null, 2));
    console.log('🔘 ====================================');
    
    // Handle different button actions
    // Check both buttonId and buttonTitle for Hebrew text
    // Also check for partial matches to handle variations
    const buttonTitleLower = (buttonTitle || '').toLowerCase();
    const buttonIdLower = (buttonId || '').toLowerCase();
    
    if (buttonId === 'confirm_attendance' || 
        buttonId === 'מגיע' ||
        buttonIdLower.includes('confirm') ||
        buttonTitle === 'מגיע' ||
        (buttonTitle?.includes('מגיע') && !buttonTitle?.includes('לא'))) {
      console.log('✅ Guest confirmed attendance via button!');
      console.log(`📞 Phone number received: ${phoneNumber}`);
      
      try {
        await updateGuestStatusByPhone(phoneNumber, 'confirmed');
        console.log('✅ Status updated to confirmed');
      } catch (error) {
        console.error('❌ Error updating guest status:', error);
      }
      
      // Send message with template "yes" to the guest
      console.log('📤 About to send "yes" template message...');
      try {
        await sendYesTemplateMessage(phoneNumber);
        console.log('✅ "yes" template message sent successfully (or attempted)');
      } catch (error) {
        console.error('❌ Error sending "yes" template message:', error);
        if (error.response) {
          console.error('❌ Error response status:', error.response.status);
          console.error('❌ Error response data:', JSON.stringify(error.response.data, null, 2));
        }
      }
    } else if (buttonId === 'decline_attendance' || 
               buttonId === 'לא אוכל להגיע' ||
               buttonId === 'לא מגיע' ||
               buttonIdLower.includes('decline') ||
               buttonTitle === 'לא אוכל להגיע' ||
               buttonTitle === 'לא מגיע' ||
               buttonTitle?.includes('לא אוכל') ||
               buttonTitle?.includes('לא מגיע') ||
               buttonTitle?.includes('דחה') ||
               buttonTitleLower.includes('לא אוכל') ||
               buttonTitleLower.includes('לא מגיע') ||
               buttonTitleLower.includes('דחה')) {
      console.log('❌ Guest declined attendance via button!');
      console.log(`   Button ID: "${buttonId}"`);
      console.log(`   Button Title: "${buttonTitle}"`);
      console.log(`   Phone number: ${phoneNumber}`);
      // Send confirmation message first, then update status
      await sendDeclineConfirmation(phoneNumber);
      await updateGuestStatusByPhone(phoneNumber, 'declined');
    } else {
      console.warn('⚠️ Unknown button clicked:', { buttonId, buttonTitle });
      console.warn('⚠️ Trying to match anyway...');
      // Try to match anyway based on common patterns
      if (buttonTitleLower.includes('כן') || (buttonTitleLower.includes('מגיע') && !buttonTitleLower.includes('לא')) || buttonTitleLower.includes('אגיע')) {
        console.log('✅ Matched as confirmation based on text');
        console.log(`📞 Phone number received: ${phoneNumber}`);
        
        try {
          await updateGuestStatusByPhone(phoneNumber, 'confirmed');
          console.log('✅ Status updated to confirmed');
        } catch (error) {
          console.error('❌ Error updating guest status:', error);
        }
        
        // Send message with template "yes" to the guest
        console.log('📤 About to send "yes" template message...');
        try {
          await sendYesTemplateMessage(phoneNumber);
          console.log('✅ "yes" template message sent successfully (or attempted)');
        } catch (error) {
          console.error('❌ Error sending "yes" template message:', error);
          if (error.response) {
            console.error('❌ Error response status:', error.response.status);
            console.error('❌ Error response data:', JSON.stringify(error.response.data, null, 2));
          }
        }
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
    
    // Send message with template "yes" to the guest
    console.log('📤 About to send "yes" template message...');
    try {
      await sendYesTemplateMessage(message.from);
      console.log('✅ "yes" template message sent (or attempted)');
    } catch (error) {
      console.error('❌ Error sending "yes" template message:', error);
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

// Send message with template "yes" to guest who confirmed attendance
async function sendYesTemplateMessage(phoneNumber) {
  try {
    console.log(`📤 ========== SENDING "yes" TEMPLATE MESSAGE ==========`);
    console.log(`📤 Original phone number: ${phoneNumber}`);
    
    // Use WhatsApp Business API to send the message
    const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
    const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
    
    if (!accessToken || !phoneNumberId) {
      console.warn('⚠️ WhatsApp credentials not configured - cannot send yes template message');
      console.warn(`⚠️ Access Token: ${accessToken ? 'Set' : 'Missing'}`);
      console.warn(`⚠️ Phone Number ID: ${phoneNumberId || 'Missing'}`);
      return;
    }
    
    // Format phone number - handle different formats
    let formattedPhone = phoneNumber.replace(/[^0-9]/g, ''); // Remove all non-digits first
    if (formattedPhone.startsWith('0')) {
      formattedPhone = '972' + formattedPhone.substring(1);
    } else if (!formattedPhone.startsWith('972')) {
      formattedPhone = '972' + formattedPhone;
    }
    
    console.log(`📤 Formatted phone number: ${formattedPhone}`);
    
    // Find guest by phone number to get their name
    const events = loadEvents();
    let guestName = 'אורח'; // Default name
    let guestFirstName = 'אורח';
    
    for (const event of events) {
      if (event.guests && Array.isArray(event.guests)) {
        const guest = event.guests.find(g => {
          const guestPhone = (g.phoneNumber || '').replace(/[^0-9]/g, '');
          const formattedGuestPhone = guestPhone.replace(/^972/, '0');
          const searchPhone = phoneNumber.replace(/[^0-9]/g, '');
          const formattedSearchPhone = searchPhone.replace(/^972/, '0');
          return guestPhone === searchPhone || 
                 formattedGuestPhone === formattedSearchPhone ||
                 guestPhone === formattedPhone.replace(/^972/, '0') ||
                 formattedGuestPhone === formattedPhone.replace(/^972/, '0');
        });
        
        if (guest) {
          guestName = `${guest.firstName || ''} ${guest.lastName || ''}`.trim() || 'אורח';
          guestFirstName = guest.firstName || 'אורח';
          break;
        }
      }
    }
    
    // Send template message "yes"
    const messagePayload = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: formattedPhone,
      type: 'template',
      template: {
        name: 'yes',
        language: {
          code: 'he'
        },
        components: [
          {
            type: 'body',
            parameters: [
              {
                type: 'text',
                text: guestFirstName
              }
            ]
          }
        ]
      }
    };
    
    console.log('📤 Sending "yes" template message...');
    console.log('📤 Full Payload:', JSON.stringify(messagePayload, null, 2));
    console.log('📤 API URL:', `https://graph.facebook.com/v22.0/${phoneNumberId}/messages`);
    
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
      console.log('✅ "yes" template message sent successfully!');
      console.log('📱 Response:', JSON.stringify(response.data, null, 2));
      console.log('📤 ==========================================');
    } else {
      console.warn('⚠️ Failed to send "yes" template message:', response.status);
      console.warn('⚠️ Response data:', response.data);
      console.log('📤 ==========================================');
    }
  } catch (error) {
    console.error('❌ ========== ERROR SENDING "yes" TEMPLATE MESSAGE ==========');
    console.error('❌ Error:', error.message);
    console.error('❌ Stack:', error.stack);
    if (error.response) {
      console.error('❌ Error response status:', error.response.status);
      console.error('❌ Error response headers:', error.response.headers);
      console.error('❌ Error response data:', JSON.stringify(error.response.data, null, 2));
    } else if (error.request) {
      console.error('❌ No response received from API');
      console.error('❌ Request:', error.request);
    }
    console.error('❌ ========================================================');
    // Don't throw - this is not critical, but log extensively for debugging
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
    
    console.log(`🔄 ========== UPDATING GUEST STATUS ==========`);
    console.log(`🔄 Original phone: ${phoneNumber}`);
    console.log(`🔄 Formatted phone: ${formattedPhone}`);
    console.log(`🔄 Status: ${status}`);
    console.log(`🔄 Timestamp: ${new Date().toISOString()}`);
    
    // Store update in pending updates array
    // Store both formats to increase chance of matching
    const updateData = {
      phoneNumber: formattedPhone,
      originalPhoneNumber: originalPhone, // Keep original for matching
      status: status,
      responseDate: new Date().toISOString(),
      timestamp: Date.now()
    };
    
    // Remove any existing updates for this phone number with the same status (to prevent duplicates)
    // But keep updates with different statuses (to allow status changes)
    const existingSameStatusIndex = pendingUpdates.findIndex(
      u => (u.phoneNumber === formattedPhone || u.originalPhoneNumber === originalPhone) && 
           u.status === status &&
           (Date.now() - u.timestamp) < 60000 // Within last minute
    );
    
    if (existingSameStatusIndex === -1) {
      // CRITICAL: Remove ALL old updates for this phone number (regardless of status)
      // This prevents old "confirmed" updates from overwriting new "declined" updates
      const otherUpdates = pendingUpdates.filter(u => 
        !(u.phoneNumber === formattedPhone || u.originalPhoneNumber === originalPhone)
      );
      pendingUpdates.length = 0;
      pendingUpdates.push(...otherUpdates);
      
      // Add the new update
      pendingUpdates.push(updateData);
      console.log('✅ ========== GUEST STATUS UPDATE STORED ==========');
      console.log('✅ Phone (formatted):', formattedPhone);
      console.log('✅ Phone (original):', originalPhone);
      console.log('✅ Status:', status);
      console.log('✅ Timestamp:', new Date(updateData.timestamp).toLocaleTimeString());
      console.log(`📊 Total pending updates: ${pendingUpdates.length}`);
      console.log(`📋 All pending updates:`, pendingUpdates.map(u => ({
        phone: u.phoneNumber,
        originalPhone: u.originalPhoneNumber,
        status: u.status,
        time: new Date(u.timestamp).toLocaleTimeString()
      })));
      console.log('✅ ===============================================');
    } else {
      console.log('⚠️ Update already exists, skipping duplicate');
      console.log(`   Existing update:`, pendingUpdates[existingSameStatusIndex]);
    }
    
  } catch (error) {
    console.error('❌ ========== ERROR UPDATING GUEST STATUS ==========');
    console.error('❌ Error:', error);
    console.error('❌ Phone:', phoneNumber);
    console.error('❌ Status:', status);
    console.error('❌ ==================================================');
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
  
  // IMPORTANT: Don't remove updates here - let the DELETE endpoint handle it
  // This ensures updates are available for webhookService to process
  // Only remove very old updates (older than 1 hour) to prevent memory leaks
  
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

// DELETE endpoint to remove a specific pending update
app.delete('/api/guests/pending-updates', (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  
  const { phoneNumber, status, responseDate, guestCount, removeAllForPhone } = req.body;
  console.log('🗑️ DELETE /api/guests/pending-updates received:', { phoneNumber, status, responseDate, guestCount, removeAllForPhone });
  
  const initialLength = pendingUpdates.length;
  
  let filtered;
  
  // If removeAllForPhone is true, remove ALL updates for this phone number (regardless of status)
  // This is useful when we want to clear all old updates for a phone number
  if (removeAllForPhone && phoneNumber) {
    const formattedPhone = phoneNumber.replace(/[^0-9]/g, '').replace(/^972/, '0');
    const originalPhone = phoneNumber.replace(/[^0-9]/g, '');
    
    filtered = pendingUpdates.filter(u => 
      !(u.phoneNumber === formattedPhone || u.phoneNumber === phoneNumber || 
        u.originalPhoneNumber === originalPhone || u.originalPhoneNumber === phoneNumber)
    );
    console.log(`🗑️ Removing ALL updates for phone ${phoneNumber} (${initialLength - filtered.length} updates)`);
  } else {
    // Filter out the specific update that was processed
    // Match by phone number, status, and responseDate (and guestCount if provided)
    filtered = pendingUpdates.filter(u => {
      const phoneMatch = (u.phoneNumber === phoneNumber || u.originalPhoneNumber === phoneNumber);
      const statusMatch = !status || u.status === status;
      const dateMatch = !responseDate || u.responseDate === responseDate || 
                        new Date(u.responseDate || u.timestamp).toISOString() === responseDate;
      const guestCountMatch = guestCount === undefined || u.guestCount === guestCount;
      
      // Keep if it doesn't match all criteria
      return !(phoneMatch && statusMatch && dateMatch && guestCountMatch);
    });
  }
  
  pendingUpdates.length = 0;
  pendingUpdates.push(...filtered);
  
  const removedCount = initialLength - pendingUpdates.length;
  console.log(`🗑️ Removed ${removedCount} update(s). Total pending: ${pendingUpdates.length}`);
  
  res.json({ 
    success: true, 
    removed: removedCount,
    totalPending: pendingUpdates.length 
  });
});

// Health check
app.get('/api/health', (req, res) => {
  const mongoReady = mongoose.connection.readyState === 1;
  const mongoStatus = ['disconnected', 'connected', 'connecting', 'disconnecting'][mongoose.connection.readyState] || 'unknown';
  
  res.json({ 
    status: 'OK', 
    message: 'WhatsApp Backend is running',
    mongodb: {
      connected: isMongoConnected && mongoReady,
      readyState: mongoose.connection.readyState,
      status: mongoStatus,
      hasUri: !!process.env.MONGODB_URI,
      connectionAttempts: mongoConnectionAttempts
    },
    timestamp: new Date().toISOString()
  });
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
    const { email, password, name, phoneNumber, verificationCode } = req.body;
    
    // Log what we received (for debugging)
    console.log('📝 Signup request received:', {
      email: email ? 'provided' : 'missing',
      password: password ? 'provided' : 'missing',
      name: name ? 'provided' : 'missing',
      phoneNumber: phoneNumber ? 'provided' : 'missing',
      verificationCode: verificationCode ? 'provided (should NOT be required)' : 'not provided (correct)'
    });
    
    // Explicitly reject if verificationCode is provided (old behavior)
    if (verificationCode) {
      console.warn('⚠️ Signup received verificationCode - this should not be required anymore');
      return res.status(400).json({ error: 'אימות טלפון לא נדרש בהרשמה. אנא הירשם ללא קוד אימות.' });
    }
    
    if (!email || !password || !name || !phoneNumber) {
      return res.status(400).json({ error: 'כל השדות נדרשים, כולל מספר טלפון (ללא אימות)' });
    }
    
    const normalizedEmail = email.toLowerCase().trim();
    const normalizedPhone = phoneNumber.replace(/[\s\-\(\)]/g, '');
    
    // Validate phone number format
    if (!/^0?5[0-9]{8}$/.test(normalizedPhone)) {
      return res.status(400).json({ error: 'מספר טלפון לא תקין. אנא הכנס מספר טלפון ישראלי (05X-XXX-XXXX)' });
    }
    
    // Check if admin email
    if (normalizedEmail === ADMIN_EMAIL.toLowerCase()) {
      return res.status(400).json({ error: 'לא ניתן להירשם עם אימייל זה. אנא השתמש בדף ההתחברות למנהל.' });
    }
    
    // Check MongoDB connection
    const mongoReady = mongoose.connection.readyState === 1;
    if (!isMongoConnected || !mongoReady) {
      console.error('❌ MongoDB not connected during signup:', {
        isMongoConnected,
        readyState: mongoose.connection.readyState,
        readyStateText: ['disconnected', 'connected', 'connecting', 'disconnecting'][mongoose.connection.readyState] || 'unknown',
        mongoConnectionAttempts,
        maxAttempts: MAX_CONNECTION_ATTEMPTS,
        hasMongoUri: !!process.env.MONGODB_URI,
        mongoUriPreview: process.env.MONGODB_URI ? (process.env.MONGODB_URI.split('@')[1] || 'configured') : 'NOT SET'
      });
      
      // Try to reconnect
      if (mongoConnectionAttempts < MAX_CONNECTION_ATTEMPTS) {
        console.log('🔄 Attempting to reconnect to MongoDB...');
        connectMongoDB();
      } else {
        console.error('❌ Max connection attempts reached. MongoDB connection failed.');
        console.error('💡 Please check:');
        console.error('   1. MONGODB_URI is set correctly in Render Environment Variables');
        console.error('   2. MongoDB Atlas Network Access allows 0.0.0.0/0 (all IPs)');
        console.error('   3. MongoDB Atlas Database User credentials are correct');
        console.error('   4. MongoDB Atlas cluster is running');
      }
      
      return res.status(503).json({ 
        error: 'מסד הנתונים לא זמין. אנא נסה שוב מאוחר יותר.',
        details: 'MongoDB connection is not available. Please check your MONGODB_URI configuration in Render.',
        readyState: mongoose.connection.readyState,
        connectionAttempts: mongoConnectionAttempts,
        hasMongoUri: !!process.env.MONGODB_URI
      });
    }
    
    // Check if user already exists
    try {
      const existingUserByEmail = await User.findOne({ email: normalizedEmail });
      if (existingUserByEmail) {
        return res.status(400).json({ error: 'משתמש עם אימייל זה כבר קיים' });
      }
      
      const existingUserByPhone = await User.findOne({ phoneNumber: normalizedPhone });
      if (existingUserByPhone) {
        return res.status(400).json({ error: 'משתמש עם מספר טלפון זה כבר קיים' });
      }
    } catch (dbError) {
      console.error('❌ Error checking existing users:', dbError);
      if (dbError.name === 'MongoNetworkError' || dbError.name === 'MongoServerSelectionError') {
        isMongoConnected = false;
        if (mongoConnectionAttempts < MAX_CONNECTION_ATTEMPTS) {
          connectMongoDB();
        }
        return res.status(503).json({ error: 'מסד הנתונים לא זמין. אנא נסה שוב מאוחר יותר.' });
      }
      throw dbError;
    }
      
      // Create new user (phone not verified during signup)
      console.log('📝 Creating new user:', {
        email: normalizedEmail,
        name: name.trim(),
        phoneNumber: normalizedPhone,
        phoneVerified: false
      });
      
      const newUser = new User({
        id: `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        email: normalizedEmail,
        name: name.trim(),
        password: password, // In production, hash this with bcrypt
        phoneNumber: normalizedPhone,
        phoneVerified: false, // Phone not verified during signup
        credits: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
        isAdmin: false
      });
      
      console.log('📝 User object created, attempting to save...');
      
      try {
        await newUser.save();
        console.log('✅ User saved successfully');
        
        console.log(`✅ New user created: ${newUser.email} (${newUser.name}) - Phone: ${normalizedPhone} (not verified)`);
        
        // Return user without password
        const userResponse = {
          id: newUser.id,
          email: newUser.email,
          name: newUser.name,
          phoneNumber: newUser.phoneNumber,
          phoneVerified: newUser.phoneVerified,
          credits: newUser.credits,
          createdAt: newUser.createdAt,
          updatedAt: newUser.updatedAt,
          isAdmin: newUser.isAdmin
        };
        
        res.status(201).json({
          success: true,
          user: userResponse
        });
      } catch (saveError) {
        console.error('❌ Error saving user to MongoDB:', saveError);
        console.error('❌ Save error details:', {
          name: saveError.name,
          message: saveError.message,
          code: saveError.code,
          errors: saveError.errors,
          stack: saveError.stack
        });
        
        if (saveError.name === 'ValidationError') {
          const errors = Object.values(saveError.errors || {}).map((e) => e.message).join(', ');
          console.error('❌ Validation errors:', errors);
          return res.status(400).json({ 
            error: `שגיאת אימות: ${errors}`,
            details: saveError.message
          });
        }
        
        if (saveError.name === 'MongoNetworkError' || saveError.name === 'MongoServerSelectionError' || saveError.name === 'MongoTimeoutError') {
          console.error('❌ MongoDB connection error during save');
          isMongoConnected = false;
          if (mongoConnectionAttempts < MAX_CONNECTION_ATTEMPTS) {
            connectMongoDB();
          }
          return res.status(503).json({ 
            error: 'מסד הנתונים לא זמין. אנא נסה שוב מאוחר יותר.',
            details: saveError.message
          });
        }
        
        // For other errors, return detailed error
        console.error('❌ Unknown error during save, re-throwing...');
        throw saveError; // Re-throw to be caught by outer catch
      }
  } catch (error) {
    console.error('❌ Signup error (outer catch):', error);
    console.error('❌ Signup error details:', {
      name: error.name,
      message: error.message,
      code: error.code,
      errors: error.errors,
      stack: error.stack?.substring(0, 500) // First 500 chars of stack
    });
    
    // Make sure we haven't already sent a response
    if (res.headersSent) {
      console.error('⚠️ Response already sent, cannot send error response');
      return;
    }
    
    if (error.code === 11000) {
      // Duplicate key error
      const field = error.keyPattern ? Object.keys(error.keyPattern)[0] : 'field';
      return res.status(400).json({ 
        error: `משתמש עם ${field === 'email' ? 'אימייל' : 'מספר טלפון'} זה כבר קיים`,
        details: error.message
      });
    }
    
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors || {}).map((e) => e.message).join(', ');
      return res.status(400).json({ 
        error: `שגיאת אימות: ${errors}`,
        details: error.message
      });
    }
    
    if (error.name === 'MongoNetworkError' || error.name === 'MongoServerSelectionError' || error.name === 'MongoTimeoutError') {
      isMongoConnected = false;
      if (mongoConnectionAttempts < MAX_CONNECTION_ATTEMPTS) {
        connectMongoDB();
      }
      return res.status(503).json({ 
        error: 'מסד הנתונים לא זמין. אנא נסה שוב מאוחר יותר.',
        details: error.message
      });
    }
    
    // Return more detailed error message
    res.status(500).json({ 
      error: 'שגיאה ביצירת משתמש',
      details: error.message || 'Unknown error',
      type: error.name || 'Error',
      code: error.code || 'NO_CODE'
    });
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
    if (isMongoConnected) {
      const user = await User.findOne({ email: normalizedEmail });
      if (!user) {
        return res.status(401).json({ error: 'אימייל או סיסמה שגויים' });
      }
      
      if (user.password !== password) {
        return res.status(401).json({ error: 'אימייל או סיסמה שגויים' });
      }
      
      // Return user without password
      const userResponse = {
        id: user.id,
        email: user.email,
        name: user.name,
        credits: user.credits,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        isAdmin: user.isAdmin
      };
      
      res.json({
        success: true,
        user: userResponse
      });
    } else {
      return res.status(503).json({ error: 'מסד הנתונים לא זמין. אנא נסה שוב מאוחר יותר.' });
    }
  } catch (error) {
    console.error('❌ Login error:', error);
    res.status(500).json({ error: 'שגיאה בהתחברות' });
  }
});

// Get all users (admin only)
app.get('/api/users', async (req, res) => {
  try {
    // In production, add authentication check here
    // Check connection status
    if (mongoose.connection.readyState === 1) {
      isMongoConnected = true;
    }
    
    if (isMongoConnected && mongoose.connection.readyState === 1) {
      const dbUsers = await User.find({}).sort({ createdAt: -1 });
      const usersWithPasswords = dbUsers.map(u => ({
        id: u.id,
        email: u.email,
        name: u.name,
        phoneNumber: u.phoneNumber || '',
        phoneVerified: u.phoneVerified || false,
        credits: u.credits,
        createdAt: u.createdAt,
        updatedAt: u.updatedAt,
        isAdmin: u.isAdmin,
        password: u.password || '(לא נמצאה סיסמה)'
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
    } else {
      // Try to reconnect
      if (mongoConnectionAttempts < MAX_CONNECTION_ATTEMPTS) {
        connectMongoDB();
      }
      
      // Return at least the admin user even if MongoDB is not available
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
      
      // Return admin user with warning
      res.json({
        success: true,
        users: [adminUser],
        warning: 'MongoDB לא זמין. רק המנהל מוצג. אנא הגדר MONGODB_URI כדי לראות את כל המשתמשים.',
        mongoDbAvailable: false
      });
    }
  } catch (error) {
    console.error('❌ Get users error:', error);
    // Try to reconnect on error
    if (error.name === 'MongoNetworkError' || error.name === 'MongoServerSelectionError') {
      isMongoConnected = false;
      if (mongoConnectionAttempts < MAX_CONNECTION_ATTEMPTS) {
        connectMongoDB();
      }
    }
    res.status(500).json({ error: 'שגיאה בטעינת משתמשים', details: error.message });
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
    
    if (isMongoConnected) {
      // Find user
      const user = await User.findOne({ id: userId });
      if (!user) {
        return res.status(404).json({ error: 'משתמש לא נמצא' });
      }
      
      const currentCredits = user.credits || 0;
      const newCredits = currentCredits + creditsToAdd;
      
      user.credits = newCredits;
      user.updatedAt = new Date();
      await user.save();
      
      const userResponse = {
        id: user.id,
        email: user.email,
        name: user.name,
        credits: user.credits,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        isAdmin: user.isAdmin
      };
      
      res.json({
        success: true,
        user: userResponse,
        previousCredits: currentCredits,
        newCredits: newCredits
      });
    } else {
      return res.status(503).json({ error: 'מסד הנתונים לא זמין. אנא נסה שוב מאוחר יותר.' });
    }
  } catch (error) {
    console.error('❌ Update credits error:', error);
    res.status(500).json({ error: 'שגיאה בעדכון רשומות' });
  }
});

// Check if email exists (for password reset)
app.post('/api/users/check-email', async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ error: 'אימייל נדרש' });
    }
    
    const normalizedEmail = email.toLowerCase().trim();
    
    // Check if admin email
    if (normalizedEmail === ADMIN_EMAIL.toLowerCase()) {
      return res.status(400).json({ error: 'לא ניתן לאפס את סיסמת המנהל דרך דף זה' });
    }
    
    if (isMongoConnected) {
      const user = await User.findOne({ email: normalizedEmail });
      
      if (user) {
        res.json({
          success: true,
          exists: true,
          phoneNumber: user.phoneNumber ? user.phoneNumber.substring(0, 3) + '***' + user.phoneNumber.substring(7) : null // Masked phone
        });
      } else {
        res.json({
          success: true,
          exists: false
        });
      }
    } else {
      return res.status(503).json({ error: 'מסד הנתונים לא זמין. אנא נסה שוב מאוחר יותר.' });
    }
  } catch (error) {
    console.error('❌ Check email error:', error);
    res.status(500).json({ error: 'שגיאה בבדיקת אימייל' });
  }
});

// Reset password
app.post('/api/users/reset-password', async (req, res) => {
  try {
    const { email, newPassword, verificationCode } = req.body;
    
    if (!email || !newPassword) {
      return res.status(400).json({ error: 'אימייל וסיסמה חדשה נדרשים' });
    }
    
    if (!verificationCode) {
      return res.status(400).json({ error: 'קוד אימות נדרש' });
    }
    
    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'סיסמה חייבת להכיל לפחות 6 תווים' });
    }
    
    const normalizedEmail = email.toLowerCase().trim();
    
    // Check if admin email
    if (normalizedEmail === ADMIN_EMAIL.toLowerCase()) {
      return res.status(400).json({ error: 'לא ניתן לאפס את סיסמת המנהל דרך דף זה' });
    }
    
    if (isMongoConnected) {
      const user = await User.findOne({ email: normalizedEmail });
      
      if (!user) {
        return res.status(404).json({ error: 'משתמש לא נמצא' });
      }
      
      // Verify code
      const verification = await VerificationCode.findOne({
        phoneNumber: user.phoneNumber,
        purpose: 'reset-password',
        code: verificationCode
      });
      
      if (!verification) {
        return res.status(400).json({ error: 'קוד אימות שגוי או פג תוקף' });
      }
      
      if (verification.expiresAt < new Date()) {
        return res.status(400).json({ error: 'קוד אימות פג תוקף' });
      }
      
      if (verification.attempts >= verification.maxAttempts) {
        return res.status(400).json({ error: 'יותר מדי ניסיונות. אנא בקש קוד חדש' });
      }
      
      // Update password
      user.password = newPassword.trim(); // In production, hash this with bcrypt
      user.updatedAt = new Date();
      await user.save();
      
      // Delete verification code
      await VerificationCode.deleteOne({ _id: verification._id });
      
      console.log(`✅ Password reset for user: ${user.email} (${user.name})`);
      
      res.json({
        success: true,
        message: 'סיסמה עודכנה בהצלחה'
      });
    } else {
      return res.status(503).json({ error: 'מסד הנתונים לא זמין. אנא נסה שוב מאוחר יותר.' });
    }
  } catch (error) {
    console.error('❌ Reset password error:', error);
    res.status(500).json({ error: 'שגיאה באיפוס סיסמה' });
  }
});

// Send phone verification code
app.post('/api/users/send-verification-code', async (req, res) => {
  try {
    const { phoneNumber, purpose } = req.body;
    
    if (!phoneNumber || !purpose) {
      return res.status(400).json({ error: 'מספר טלפון ומטרה נדרשים' });
    }
    
    if (!['signup', 'reset-password', 'login'].includes(purpose)) {
      return res.status(400).json({ error: 'מטרה לא תקינה' });
    }
    
    // Normalize phone number (remove spaces, dashes, etc.)
    const normalizedPhone = phoneNumber.replace(/[\s\-\(\)]/g, '');
    
    // Validate Israeli phone number format
    if (!/^0?5[0-9]{8}$/.test(normalizedPhone)) {
      return res.status(400).json({ error: 'מספר טלפון לא תקין. אנא הכנס מספר טלפון ישראלי (05X-XXX-XXXX)' });
    }
    
    if (isMongoConnected) {
      // Check if phone number already exists for signup
      if (purpose === 'signup') {
        const existingUser = await User.findOne({ phoneNumber: normalizedPhone });
        if (existingUser) {
          return res.status(400).json({ error: 'מספר טלפון זה כבר רשום במערכת' });
        }
      }
      
      // Check if phone number exists for reset-password
      if (purpose === 'reset-password') {
        const user = await User.findOne({ phoneNumber: normalizedPhone });
        if (!user) {
          return res.status(404).json({ error: 'מספר טלפון זה לא רשום במערכת' });
        }
      }
      
      // Generate 6-digit code
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      
      // Delete old codes for this phone and purpose
      await VerificationCode.deleteMany({
        phoneNumber: normalizedPhone,
        purpose: purpose
      });
      
      // Create new verification code (expires in 10 minutes)
      const verificationCode = new VerificationCode({
        phoneNumber: normalizedPhone,
        code: code,
        purpose: purpose,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
        attempts: 0,
        maxAttempts: 5
      });
      
      await verificationCode.save();
      
      // Send code via WhatsApp
      const message = `קוד האימות שלך הוא: ${code}\n\nקוד זה תקף ל-10 דקות.\n\nאם לא ביקשת קוד זה, אנא התעלם מהודעה זו.`;
      
      try {
        const backendUrl = process.env.BACKEND_URL || 'http://localhost:3002';
        await axios.post(`${backendUrl}/api/whatsapp/send`, {
          to: normalizedPhone,
          message: message
        });
        
        console.log(`✅ Verification code sent to ${normalizedPhone} for ${purpose}`);
        
        res.json({
          success: true,
          message: 'קוד אימות נשלח בהצלחה',
          expiresIn: 600 // seconds
        });
      } catch (whatsappError) {
        console.error('❌ Error sending WhatsApp:', whatsappError);
        // Still return success - code is saved, user can request again
        res.json({
          success: true,
          message: 'קוד אימות נוצר. אם לא קיבלת הודעה, אנא נסה שוב',
          code: code, // For testing - remove in production
          expiresIn: 600
        });
      }
    } else {
      return res.status(503).json({ error: 'מסד הנתונים לא זמין. אנא נסה שוב מאוחר יותר.' });
    }
  } catch (error) {
    console.error('❌ Send verification code error:', error);
    res.status(500).json({ error: 'שגיאה בשליחת קוד אימות' });
  }
});

// Verify phone code
app.post('/api/users/verify-code', async (req, res) => {
  try {
    const { phoneNumber, code, purpose } = req.body;
    
    if (!phoneNumber || !code || !purpose) {
      return res.status(400).json({ error: 'מספר טלפון, קוד ומטרה נדרשים' });
    }
    
    const normalizedPhone = phoneNumber.replace(/[\s\-\(\)]/g, '');
    
    if (isMongoConnected) {
      const verification = await VerificationCode.findOne({
        phoneNumber: normalizedPhone,
        purpose: purpose,
        code: code
      });
      
      if (!verification) {
        // Increment attempts if code exists but wrong
        const anyVerification = await VerificationCode.findOne({
          phoneNumber: normalizedPhone,
          purpose: purpose
        });
        
        if (anyVerification) {
          anyVerification.attempts += 1;
          await anyVerification.save();
          
          if (anyVerification.attempts >= anyVerification.maxAttempts) {
            await VerificationCode.deleteOne({ _id: anyVerification._id });
            return res.status(400).json({ error: 'יותר מדי ניסיונות. אנא בקש קוד חדש' });
          }
        }
        
        return res.status(400).json({ error: 'קוד אימות שגוי' });
      }
      
      if (verification.expiresAt < new Date()) {
        await VerificationCode.deleteOne({ _id: verification._id });
        return res.status(400).json({ error: 'קוד אימות פג תוקף' });
      }
      
      if (verification.attempts >= verification.maxAttempts) {
        await VerificationCode.deleteOne({ _id: verification._id });
        return res.status(400).json({ error: 'יותר מדי ניסיונות. אנא בקש קוד חדש' });
      }
      
      // Mark as verified for signup
      if (purpose === 'signup') {
        // Code is valid, but don't delete it yet - will be used during signup
        res.json({
          success: true,
          verified: true,
          message: 'קוד אימות תקין'
        });
      } else {
        // For other purposes, delete the code after verification
        await VerificationCode.deleteOne({ _id: verification._id });
        res.json({
          success: true,
          verified: true,
          message: 'קוד אימות תקין'
        });
      }
    } else {
      return res.status(503).json({ error: 'מסד הנתונים לא זמין. אנא נסה שוב מאוחר יותר.' });
    }
  } catch (error) {
    console.error('❌ Verify code error:', error);
    res.status(500).json({ error: 'שגיאה באימות קוד' });
  }
});

// ========================================
// Events API Endpoints (for syncing between computers)
// ========================================

// Get all events for a user
// Public endpoint to get all events (for guest response links - works on all devices)
app.get('/api/events/all', async (req, res) => {
  // CRITICAL: Set CORS headers FIRST
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  
  try {
    const events = loadEvents();
    console.log(`📋 GET /api/events/all - Returning ${events.length} events`);
    res.json({
      success: true,
      events: events,
      total: events.length
    });
  } catch (error) {
    console.error('❌ Error loading all events:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to load events'
    });
  }
});

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
      // Log what we're updating
      const existingEvent = eventsData.events[existingIndex];
      console.log(`🔄 Updating event ${event.id}`);
      console.log(`📤 Incoming event has ${event.guests?.length || 0} guests`);
      
      // Check for actualAttendance updates and add to pendingUpdates if rsvpStatus or guestCount changed
      if (event.guests && event.guests.length > 0) {
        console.log(`🔍 Processing ${event.guests.length} guests for pendingUpdates check...`);
        event.guests.forEach((newGuest, idx) => {
          const existingGuest = existingEvent.guests?.find(g => g.id === newGuest.id);
          
          if (existingGuest) {
            if (newGuest.actualAttendance !== existingGuest.actualAttendance) {
              console.log(`📊 Guest ${newGuest.firstName} ${newGuest.lastName} (${newGuest.id}): actualAttendance changed from "${existingGuest.actualAttendance}" to "${newGuest.actualAttendance}"`);
            }
            if (newGuest.guestCount !== existingGuest.guestCount) {
              console.log(`📊 Guest ${newGuest.firstName} ${newGuest.lastName} (${newGuest.id}): guestCount changed from ${existingGuest.guestCount} to ${newGuest.guestCount}`);
            }
            if (newGuest.rsvpStatus !== existingGuest.rsvpStatus) {
              console.log(`📊 Guest ${newGuest.firstName} ${newGuest.lastName} (${newGuest.id}): rsvpStatus changed from "${existingGuest.rsvpStatus}" to "${newGuest.rsvpStatus}"`);
            }
          } else {
            // Guest not found in existing event - might be new or might have been updated
            console.log(`📊 Guest ${newGuest.firstName} ${newGuest.lastName} (${newGuest.id}): not found in existing event, treating as new/updated`);
          }
          
          // CRITICAL: If rsvpStatus or guestCount is set (and phone number exists), add to pendingUpdates
          // This allows updates from the guest response link to be synced across devices
          // Check both: if guest exists and status changed, OR if guest is new with status/guestCount
          const statusChanged = existingGuest ? (newGuest.rsvpStatus && newGuest.rsvpStatus !== existingGuest.rsvpStatus) : false;
          const guestCountChanged = existingGuest ? (newGuest.guestCount !== undefined && newGuest.guestCount !== existingGuest.guestCount) : false;
          
          // For new guests or guests not found in existing event:
          // Check if they have a valid status or guestCount (indicates a response from guest)
          const hasValidStatus = !existingGuest && newGuest.rsvpStatus && (newGuest.rsvpStatus === 'confirmed' || newGuest.rsvpStatus === 'declined' || newGuest.rsvpStatus === 'maybe');
          const hasValidGuestCount = !existingGuest && newGuest.guestCount !== undefined && newGuest.guestCount > 0;
          
          // CRITICAL: Check if responseDate is new or different (indicates guest updated via link)
          // Compare responseDate as strings or timestamps to detect changes
          const oldResponseDate = existingGuest?.responseDate ? (typeof existingGuest.responseDate === 'string' ? existingGuest.responseDate : new Date(existingGuest.responseDate).toISOString()) : null;
          const newResponseDate = newGuest.responseDate ? (typeof newGuest.responseDate === 'string' ? newGuest.responseDate : new Date(newGuest.responseDate).toISOString()) : null;
          const hasResponseDate = newResponseDate && (!oldResponseDate || newResponseDate !== oldResponseDate);
          
          // Also check if guest has a valid status (even if not changed) but has a new responseDate
          // This handles cases where guest updates to the same status but at a different time
          const hasStatusWithNewResponse = existingGuest && newGuest.rsvpStatus && 
                                           (newGuest.rsvpStatus === 'confirmed' || newGuest.rsvpStatus === 'declined' || newGuest.rsvpStatus === 'maybe') &&
                                           hasResponseDate;
          
          // DEBUG: Log all conditions for this guest
          console.log(`🔍 Checking guest ${newGuest.firstName} ${newGuest.lastName} (${newGuest.id}):`, {
            phoneNumber: newGuest.phoneNumber ? 'present' : 'MISSING',
            existingGuest: existingGuest ? 'found' : 'not found',
            statusChanged,
            guestCountChanged,
            hasValidStatus,
            hasValidGuestCount,
            hasResponseDate,
            hasStatusWithNewResponse,
            oldResponseDate,
            newResponseDate,
            newRsvpStatus: newGuest.rsvpStatus,
            oldRsvpStatus: existingGuest?.rsvpStatus,
            newGuestCount: newGuest.guestCount,
            oldGuestCount: existingGuest?.guestCount
          });
          
          // Add to pendingUpdates if:
          // 1. Status changed (existing guest)
          // 2. Guest count changed (existing guest)
          // 3. New guest with valid status
          // 4. New guest with valid guest count
          // 5. Has response date (indicates this is a response from guest)
          // 6. Has status with new response date (handles same status but new update time)
          if ((statusChanged || guestCountChanged || hasValidStatus || hasValidGuestCount || hasResponseDate || hasStatusWithNewResponse) && newGuest.phoneNumber) {
            // Format phone number (same logic as updateGuestStatusByPhone)
            const originalPhone = newGuest.phoneNumber.replace(/[^0-9]/g, '');
            const formattedPhone = originalPhone.replace(/^972/, '0');
            
            // Create update data similar to WhatsApp webhook updates
            // Include 'maybe' status as well (not just 'confirmed' and 'declined')
            const updateData = {
              phoneNumber: formattedPhone,
              originalPhoneNumber: originalPhone,
              status: newGuest.rsvpStatus === 'confirmed' ? 'confirmed' : 
                     newGuest.rsvpStatus === 'declined' ? 'declined' :
                     newGuest.rsvpStatus === 'maybe' ? 'maybe' : undefined,
              guestCount: guestCountChanged || (newGuest.guestCount !== undefined && newGuest.guestCount > 0) ? newGuest.guestCount : undefined,
              responseDate: newGuest.responseDate || new Date().toISOString(),
              timestamp: Date.now(),
              source: 'guest_link' // Mark as coming from guest response link
            };
            
            // Remove any existing updates for this phone number with the same status/guestCount
            const existingSameIndex = pendingUpdates.findIndex(
              u => (u.phoneNumber === formattedPhone || u.originalPhoneNumber === originalPhone) && 
                   u.status === updateData.status &&
                   u.guestCount === updateData.guestCount &&
                   (Date.now() - u.timestamp) < 60000 // Within last minute
            );
            
            if (existingSameIndex === -1) {
              pendingUpdates.push(updateData);
              console.log(`✅ Added guest link update to pendingUpdates:`, {
                phone: formattedPhone,
                originalPhone: originalPhone,
                status: updateData.status,
                guestCount: updateData.guestCount,
                responseDate: updateData.responseDate,
                source: 'guest_link',
                guestName: `${newGuest.firstName} ${newGuest.lastName}`,
                guestId: newGuest.id,
                statusChanged: statusChanged,
                guestCountChanged: guestCountChanged,
                hasValidStatus: hasValidStatus,
                hasValidGuestCount: hasValidGuestCount,
                hasResponseDate: hasResponseDate,
                hasStatusWithNewResponse: hasStatusWithNewResponse,
                oldResponseDate: oldResponseDate,
                newResponseDate: newResponseDate
              });
              console.log(`📊 Total pending updates now: ${pendingUpdates.length}`);
              console.log(`📋 All pending updates:`, pendingUpdates.map(u => ({
                phone: u.phoneNumber,
                status: u.status,
                guestCount: u.guestCount,
                source: u.source,
                age: Math.round((Date.now() - u.timestamp) / 1000) + ' seconds ago'
              })));
            } else {
              // Update existing update with newer data
              pendingUpdates[existingSameIndex] = updateData;
              console.log(`🔄 Updated existing pending update for phone ${formattedPhone} (guest: ${newGuest.firstName} ${newGuest.lastName})`);
            }
          } else {
            // Log why update was not added
            console.log(`⏭️ Skipping guest link update for ${newGuest.firstName} ${newGuest.lastName}:`, {
              phoneNumber: newGuest.phoneNumber ? `present (${newGuest.phoneNumber})` : 'MISSING - THIS IS THE PROBLEM!',
              statusChanged: statusChanged,
              guestCountChanged: guestCountChanged,
              hasValidStatus: hasValidStatus,
              hasValidGuestCount: hasValidGuestCount,
              hasResponseDate: hasResponseDate,
              hasStatusWithNewResponse: hasStatusWithNewResponse,
              existingGuest: existingGuest ? 'found' : 'not found',
              rsvpStatus: newGuest.rsvpStatus,
              responseDate: newResponseDate,
              oldResponseDate: oldResponseDate,
              conditionMet: (statusChanged || guestCountChanged || hasValidStatus || hasValidGuestCount || hasResponseDate || hasStatusWithNewResponse),
              hasPhoneNumber: !!newGuest.phoneNumber
            });
            
            // CRITICAL: If phone number is missing, this is a critical issue
            if (!newGuest.phoneNumber) {
              console.error(`❌ CRITICAL: Guest ${newGuest.firstName} ${newGuest.lastName} (${newGuest.id}) has NO phone number! Cannot add to pendingUpdates.`);
            }
          }
        });
      }
      
      // Update existing event - CRITICAL: Merge guests properly to preserve all fields
      const mergedEvent = {
        ...existingEvent,
        ...event,
        // CRITICAL: Merge guests array properly - use incoming guests as source of truth
        guests: event.guests || existingEvent.guests,
        updatedAt: new Date().toISOString()
      };
      
      eventsData.events[existingIndex] = mergedEvent;
      console.log(`✅ Updated event ${event.id} with ${mergedEvent.guests?.length || 0} guests`);
      
      // Verify actualAttendance was saved
      const savedEvent = eventsData.events[existingIndex];
      if (savedEvent.guests && savedEvent.guests.length > 0) {
        const guestsWithAttendance = savedEvent.guests.filter(g => g.actualAttendance && g.actualAttendance !== 'not_marked');
        if (guestsWithAttendance.length > 0) {
          console.log(`✅ Verified: ${guestsWithAttendance.length} guests have actualAttendance set:`, 
            guestsWithAttendance.map(g => `${g.firstName} ${g.lastName}: ${g.actualAttendance}`));
        }
      }
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
    
    const savedEvent = existingIndex >= 0 ? eventsData.events[existingIndex] : eventsData.events[eventsData.events.length - 1];
    
    res.json({
      success: true,
      event: savedEvent
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
