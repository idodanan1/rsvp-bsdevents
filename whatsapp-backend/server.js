const express = require('express');
const cors = require('cors');
const axios = require('axios');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const stripe = require('stripe');
const mongoose = require('mongoose');
require('dotenv').config();

// CRITICAL: Log all environment variables related to WhatsApp (for debugging)
console.log('🔍 ========== ENVIRONMENT VARIABLES DEBUG ==========');
console.log('🔍 WHATSAPP_ACCESS_TOKEN:', process.env.WHATSAPP_ACCESS_TOKEN ? `Set (${process.env.WHATSAPP_ACCESS_TOKEN.length} chars)` : 'NOT SET');
console.log('🔍 VITE_WHATSAPP_ACCESS_TOKEN:', process.env.VITE_WHATSAPP_ACCESS_TOKEN ? `Set (${process.env.VITE_WHATSAPP_ACCESS_TOKEN.length} chars)` : 'NOT SET');
console.log('🔍 WHATSAPP_PHONE_NUMBER_ID:', process.env.WHATSAPP_PHONE_NUMBER_ID || 'NOT SET');
console.log('🔍 ================================================');

const app = express();
const PORT = process.env.PORT || 3002;

// Enable CORS for all routes - MUST be before other middleware
// CRITICAL: Allow ALL origins for public guest response pages
app.use(cors({
  origin: '*', // Allow ALL origins - required for guest response links to work from any device/IP
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
  exposedHeaders: ['Content-Type', 'Authorization'],
  maxAge: 86400 // 24 hours - cache preflight requests
}));

// Handle preflight OPTIONS requests explicitly for ALL routes
app.options('*', (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Max-Age', '86400');
  res.sendStatus(200);
});

// Additional CORS middleware to ensure headers are ALWAYS set (even on errors)
// This is critical for guest response pages to work from any IP/device
app.use((req, res, next) => {
  // CRITICAL: Set CORS headers for EVERY request - allows access from any IP/device
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Max-Age', '86400');
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
    return;
  }
  next();
});

// Temporary storage for guest status updates (in production, use a database)
const pendingUpdates = [];

// Track guests waiting for response (for "thanks" message logic)
// Format: "phoneNumber" -> timestamp when waiting started
const waitingForResponse = new Map();
const RESPONSE_WAIT_TIMEOUT = 24 * 60 * 60 * 1000; // 24 hours timeout

// Track guests who already received "thanks" message
// Format: "phoneNumber" -> timestamp when "thanks" was sent
const receivedThanksMessages = new Map();

// Track recently sent guest count questions to prevent duplicates
const recentlySentGuestCountQuestions = new Map();
const GUEST_COUNT_QUESTION_COOLDOWN = 5 * 60 * 1000; // 5 minutes cooldown


// Helper function to check if guest is waiting for response
function isWaitingForResponse(phoneNumber) {
  const key = phoneNumber.replace(/[^0-9]/g, '');
  const waitStart = waitingForResponse.get(key);
  if (!waitStart) {
    return false;
  }
  const timeSinceWait = Date.now() - waitStart;
  if (timeSinceWait > RESPONSE_WAIT_TIMEOUT) {
    // Remove old entry
    waitingForResponse.delete(key);
    return false;
  }
  return true;
}

// Helper function to mark that guest received "thanks"
function markThanksAsSent(phoneNumber) {
  const key = phoneNumber.replace(/[^0-9]/g, '');
  receivedThanksMessages.set(key, Date.now());
  // Remove from waiting list
  waitingForResponse.delete(key);
  console.log(`✅ Marked "thanks" message as sent for ${phoneNumber} (no more auto-responses)`);
  
  // Clean up old entries (older than 7 days)
  const now = Date.now();
  const sevenDaysAgo = 7 * 24 * 60 * 60 * 1000;
  for (const [phone, timestamp] of receivedThanksMessages.entries()) {
    if (now - timestamp > sevenDaysAgo) {
      receivedThanksMessages.delete(phone);
    }
  }
}

// Helper function to check if guest already received "thanks"
function hasReceivedThanks(phoneNumber) {
  const key = phoneNumber.replace(/[^0-9]/g, '');
  return receivedThanksMessages.has(key);
}

// Helper function to sanitize Access Token (remove invalid characters for HTTP headers)
function sanitizeAccessToken(token) {
  if (!token) {
    console.warn('⚠️ sanitizeAccessToken: Token is empty or undefined');
    return '';
  }
  
  const tokenStr = token.toString().trim();
  
  // Check if token looks valid (should be long, typically 200+ characters for WhatsApp tokens)
  if (tokenStr.length < 50) {
    console.error(`❌ sanitizeAccessToken: Token seems too short (${tokenStr.length} chars). Expected 200+ characters.`);
    console.error(`❌ Token preview: "${tokenStr.substring(0, 50)}"`);
    // Don't return empty - let it fail with a clear error message
  }
  
  // Remove newlines, carriage returns, tabs, and other control characters
  // But keep all printable ASCII characters (including special chars that might be in token)
  let cleaned = tokenStr.replace(/[\r\n\t]/g, '');
  
  // Only remove truly invalid characters for HTTP headers (control chars 0x00-0x1F and DEL 0x7F)
  // Keep all printable ASCII (0x20-0x7E) including special characters
  cleaned = cleaned.replace(/[\x00-\x1F\x7F]/g, '');
  
  // Final trim
  cleaned = cleaned.trim();
  
  if (cleaned.length !== tokenStr.length) {
    console.warn(`⚠️ sanitizeAccessToken: Removed ${tokenStr.length - cleaned.length} invalid character(s) from token`);
  }
  
  return cleaned;
}

// Set default API keys if not provided
process.env.WANOTIFIER_API_KEY = process.env.WANOTIFIER_API_KEY || 'oUDrqkaOHa6wv2oWZ4SsM31RbxcKLG';
process.env.CALLMEBOT_API_KEY = process.env.CALLMEBOT_API_KEY || '1234567890';
process.env.WEBHOOK_VERIFY_TOKEN = process.env.WEBHOOK_VERIFY_TOKEN || 'whatsapp_webhook_verify_token_2024';
// Use the same default token as frontend (from whatsappService.ts line 25)
// This ensures both frontend and backend use the same working token
// If VITE_WHATSAPP_ACCESS_TOKEN is set in frontend, use the same value here
// Otherwise, use the default token that works with template "aa"
const DEFAULT_WHATSAPP_TOKEN = 'EAAQ16mfCx58BPZCAepGf7EQMznC5dwYUmsun7pZCvzLPqjOjnq778EeJtXGEdemBVXdqTEt9pJ0bm2l5EyL9BZAR9kVS15kjz9rWYAcbKZCZBVOQswHeZAfmkUNv2TZAeX8KGaJ8OZCb4ZCtOaZAEZARqvG2TE7DHCmZBDWRATOKdvfHZA4j8FGluUX8NNGdsqbBEVgFjNgZDZD';

// CRITICAL: Debug token loading
console.log('🔍 ========== DEBUGGING TOKEN LOADING ==========');
console.log('🔍 process.env.WHATSAPP_ACCESS_TOKEN exists:', !!process.env.WHATSAPP_ACCESS_TOKEN);
console.log('🔍 process.env.WHATSAPP_ACCESS_TOKEN length:', process.env.WHATSAPP_ACCESS_TOKEN ? process.env.WHATSAPP_ACCESS_TOKEN.length : 0);
console.log('🔍 process.env.WHATSAPP_ACCESS_TOKEN preview:', process.env.WHATSAPP_ACCESS_TOKEN ? process.env.WHATSAPP_ACCESS_TOKEN.substring(0, 50) : 'N/A');
console.log('🔍 process.env.VITE_WHATSAPP_ACCESS_TOKEN exists:', !!process.env.VITE_WHATSAPP_ACCESS_TOKEN);
console.log('🔍 process.env.VITE_WHATSAPP_ACCESS_TOKEN length:', process.env.VITE_WHATSAPP_ACCESS_TOKEN ? process.env.VITE_WHATSAPP_ACCESS_TOKEN.length : 0);
console.log('🔍 process.env.VITE_WHATSAPP_ACCESS_TOKEN preview:', process.env.VITE_WHATSAPP_ACCESS_TOKEN ? process.env.VITE_WHATSAPP_ACCESS_TOKEN.substring(0, 50) : 'N/A');
console.log('🔍 DEFAULT_WHATSAPP_TOKEN length:', DEFAULT_WHATSAPP_TOKEN.length);
console.log('🔍 DEFAULT_WHATSAPP_TOKEN preview:', DEFAULT_WHATSAPP_TOKEN.substring(0, 50));

const tokenFromEnv = process.env.WHATSAPP_ACCESS_TOKEN || process.env.VITE_WHATSAPP_ACCESS_TOKEN || DEFAULT_WHATSAPP_TOKEN;
console.log('🔍 tokenFromEnv length:', tokenFromEnv ? tokenFromEnv.length : 0);
console.log('🔍 tokenFromEnv preview:', tokenFromEnv ? tokenFromEnv.substring(0, 50) : 'N/A');
console.log('🔍 tokenFromEnv source:', process.env.WHATSAPP_ACCESS_TOKEN ? 'WHATSAPP_ACCESS_TOKEN' : (process.env.VITE_WHATSAPP_ACCESS_TOKEN ? 'VITE_WHATSAPP_ACCESS_TOKEN' : 'DEFAULT_WHATSAPP_TOKEN'));

const sanitizedToken = sanitizeAccessToken(tokenFromEnv);
console.log('🔍 sanitizedToken length:', sanitizedToken ? sanitizedToken.length : 0);
console.log('🔍 sanitizedToken preview:', sanitizedToken ? sanitizedToken.substring(0, 50) : 'N/A');
console.log('🔍 ============================================');

process.env.WHATSAPP_ACCESS_TOKEN = sanitizedToken;
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

// User Session Schema - Track active sessions/devices per user
const userSessionSchema = new mongoose.Schema({
  userId: { type: String, required: true, index: true },
  sessionId: { type: String, required: true, unique: true },
  deviceInfo: { type: String }, // Browser/device info
  ipAddress: { type: String },
  lastActivity: { type: Date, default: Date.now, index: true },
  createdAt: { type: Date, default: Date.now },
  expiresAt: { type: Date, default: () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) } // 30 days
});

// Auto-delete expired sessions
userSessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const UserSession = mongoose.model('UserSession', userSessionSchema);

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
// Validate WhatsApp Access Token
const tokenLength = process.env.WHATSAPP_ACCESS_TOKEN ? process.env.WHATSAPP_ACCESS_TOKEN.length : 0;
const tokenPreview = process.env.WHATSAPP_ACCESS_TOKEN ? process.env.WHATSAPP_ACCESS_TOKEN.substring(0, 30) : 'N/A';
console.log('🔑 WhatsApp Access Token:', process.env.WHATSAPP_ACCESS_TOKEN ? `Set (${tokenLength} chars, preview: "${tokenPreview}...")` : 'Not set');
if (process.env.WHATSAPP_ACCESS_TOKEN && tokenLength < 50) {
  console.error('❌ WARNING: WhatsApp Access Token seems too short! Expected 200+ characters.');
  console.error('❌ Please verify WHATSAPP_ACCESS_TOKEN in Render environment variables.');
  console.error('❌ Token should start with "EAA..." and be a long string (200+ characters).');
}
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
      'Authorization': `Bearer ${sanitizeAccessToken(process.env.WHATSAPP_ACCESS_TOKEN)}`,
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
    // Log ALL incoming requests to webhook endpoint
    console.log('🔔 ========== WEBHOOK REQUEST RECEIVED ==========');
    console.log('🔔 Time:', new Date().toISOString());
    console.log('🔔 Method:', req.method);
    console.log('🔔 URL:', req.url);
    console.log('🔔 Headers:', JSON.stringify(req.headers, null, 2));
    console.log('🔔 Query:', JSON.stringify(req.query, null, 2));
    console.log('🔔 Body type:', typeof req.body);
    console.log('🔔 Body keys:', req.body ? Object.keys(req.body) : 'no body');
    
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
  console.log('🔍 DEBUG: Access Token length:', process.env.WHATSAPP_ACCESS_TOKEN?.length || 0);
  console.log('🔍 DEBUG: Access Token preview:', process.env.WHATSAPP_ACCESS_TOKEN?.substring(0, 20) || 'N/A');
  console.log('🔍 DEBUG: Checking message type and button format...');
  console.log('🔍 DEBUG: message.type =', message.type);
  console.log('🔍 DEBUG: message.button =', JSON.stringify(message.button, null, 2));
  console.log('🔍 DEBUG: message.interactive =', JSON.stringify(message.interactive, null, 2));
  console.log('🔍 DEBUG: message.type === "button" =', message.type === 'button');
  console.log('🔍 DEBUG: message.button exists =', !!message.button);
  console.log('🔍 DEBUG: Condition (message.type === "button" && message.button) =', message.type === 'button' && !!message.button);

  // Handle button clicks - support both message.button and message.interactive formats
  // Format 1: message.button (older format)
  if (message.type === 'button' && message.button) {
    console.log('✅ DEBUG: Entering button format handler!');
    const buttonId = message.button.payload || message.button.text;
    const buttonTitle = message.button.text;
    const phoneNumber = message.from;
    
    console.log('🔘 ========== BUTTON CLICKED (button format) ==========');
    console.log('🔘 Button Payload:', message.button.payload);
    console.log('🔘 Button Text:', message.button.text);
    console.log('🔘 Button ID (derived):', buttonId);
    console.log('🔘 Button Title:', buttonTitle);
    console.log('🔘 Phone Number:', phoneNumber);
    console.log('🔘 ====================================================');
    
    // CRITICAL: Check if this is a response from someone who received "yes" message
    // If they already received "thanks", don't send auto-responses
    const normalizedPhone = phoneNumber.replace(/[^0-9]/g, '');
    const isWaiting = isWaitingForResponse(normalizedPhone);
    const hasThanks = hasReceivedThanks(normalizedPhone);
    
    // Handle different button actions
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
      
      // CRITICAL: Send confirmation message after guest confirms
      try {
        await sendConfirmConfirmation(phoneNumber);
        console.log('✅ Confirm confirmation message sent');
      } catch (error) {
        console.error('❌ Error sending confirm confirmation:', error);
      }
      
      // CRITICAL: If guest already received "yes" and is waiting for response, send "thanks" instead
      if (isWaiting && !hasThanks) {
        console.log(`✅ Guest ${phoneNumber} responded after receiving "yes" message - sending "thanks" instead of "yes"`);
        console.log(`📤 Sending "thanks" template message...`);
        try {
          await sendThanksTemplateMessage(phoneNumber);
          console.log('✅ "thanks" template message sent (or attempted)');
        } catch (error) {
          console.error('❌ Error sending "thanks" template message:', error);
        }
      } else if (hasThanks) {
        console.log(`ℹ️ Guest ${phoneNumber} already received "thanks" - no auto-response will be sent`);
      } else {
        // Guest confirmed - no automatic message sent
        console.log(`ℹ️ Guest ${phoneNumber} confirmed`);
      }
    } else if (buttonId === 'decline_attendance' || 
               buttonId === 'לא אוכל להגיע' ||
               buttonId === 'לא מגיע' ||
               buttonIdLower.includes('decline') ||
               buttonIdLower.includes('לא אוכל') ||
               buttonIdLower.includes('לא מגיע') ||
               buttonIdLower.includes('לא אוכל להגיע') ||
               buttonTitle === 'לא אוכל להגיע' ||
               buttonTitle === 'לא מגיע' ||
               buttonTitle?.includes('לא אוכל') ||
               buttonTitle?.includes('לא מגיע') ||
               buttonTitle?.includes('דחה') ||
               buttonTitleLower.includes('לא אוכל') ||
               buttonTitleLower.includes('לא מגיע') ||
               buttonTitleLower.includes('לא אוכל להגיע') ||
               buttonTitleLower.includes('דחה') ||
               (buttonTitleLower.includes('לא') && (buttonTitleLower.includes('אוכל') || buttonTitleLower.includes('מגיע') || buttonTitleLower.includes('אגיע')))) {
      console.log('❌ Guest declined attendance via button!');
      console.log(`   Button ID: "${buttonId}"`);
      console.log(`   Button Title: "${buttonTitle}"`);
      console.log(`   Phone number: ${phoneNumber}`);
      console.log(`   Button ID Lower: "${buttonIdLower}"`);
      console.log(`   Button Title Lower: "${buttonTitleLower}"`);
      console.log(`   Checking conditions:`);
      console.log(`     buttonId === 'decline_attendance': ${buttonId === 'decline_attendance'}`);
      console.log(`     buttonId === 'לא אוכל להגיע': ${buttonId === 'לא אוכל להגיע'}`);
      console.log(`     buttonId === 'לא מגיע': ${buttonId === 'לא מגיע'}`);
      console.log(`     buttonIdLower.includes('decline'): ${buttonIdLower.includes('decline')}`);
      console.log(`     buttonIdLower.includes('לא אוכל'): ${buttonIdLower.includes('לא אוכל')}`);
      console.log(`     buttonIdLower.includes('לא אוכל להגיע'): ${buttonIdLower.includes('לא אוכל להגיע')}`);
      console.log(`     buttonTitle === 'לא אוכל להגיע': ${buttonTitle === 'לא אוכל להגיע'}`);
      console.log(`     buttonTitle === 'לא מגיע': ${buttonTitle === 'לא מגיע'}`);
      console.log(`     buttonTitle?.includes('לא אוכל'): ${buttonTitle?.includes('לא אוכל')}`);
      console.log(`     buttonTitle?.includes('לא מגיע'): ${buttonTitle?.includes('לא מגיע')}`);
      console.log(`     buttonTitleLower.includes('לא אוכל'): ${buttonTitleLower.includes('לא אוכל')}`);
      console.log(`     buttonTitleLower.includes('לא מגיע'): ${buttonTitleLower.includes('לא מגיע')}`);
      console.log(`     buttonTitleLower.includes('לא אוכל להגיע'): ${buttonTitleLower.includes('לא אוכל להגיע')}`);
      console.log(`     Combined check (לא + אוכל/מגיע/אגיע): ${(buttonTitleLower.includes('לא') && (buttonTitleLower.includes('אוכל') || buttonTitleLower.includes('מגיע') || buttonTitleLower.includes('אגיע')))}`);
      // CRITICAL: Update status FIRST, then try to send confirmation message
      // This ensures the status is updated even if sending the message fails
      try {
        await updateGuestStatusByPhone(phoneNumber, 'declined');
        console.log('✅ Guest status updated to declined');
      } catch (error) {
        console.error('❌ Error updating guest status to declined:', error);
        // Don't throw - continue to try sending confirmation
      }
      
      // Try to send confirmation message (but don't fail if it doesn't work)
      try {
        await sendDeclineConfirmation(phoneNumber);
      } catch (error) {
        console.error('❌ Error sending decline confirmation (non-critical):', error.message);
        // Don't throw - status update is more important than confirmation message
      }
      
      // CRITICAL: Send "thanks" message after decline (if not already sent)
      const normalizedPhone = phoneNumber.replace(/[^0-9]/g, '');
      if (!hasReceivedThanks(normalizedPhone)) {
        console.log(`📤 Guest declined, sending "thanks" template message...`);
        try {
          await sendThanksTemplateMessage(phoneNumber);
          console.log('✅ "thanks" template message sent after decline (or attempted)');
        } catch (error) {
          console.error('❌ Error sending "thanks" template message after decline:', error);
        }
      } else {
        console.log(`ℹ️ Guest ${phoneNumber} already received "thanks" - skipping`);
      }
    } else {
      console.warn('⚠️ Unknown button clicked:', { buttonId, buttonTitle });
      console.warn('⚠️ Trying to match anyway...');
      // Try to match anyway based on common patterns
      // CRITICAL: Check if this is a response from someone who received "yes" message
      const normalizedPhone = phoneNumber.replace(/[^0-9]/g, '');
      const isWaiting = isWaitingForResponse(normalizedPhone);
      const hasThanks = hasReceivedThanks(normalizedPhone);
      
      if (buttonTitleLower.includes('כן') || (buttonTitleLower.includes('מגיע') && !buttonTitleLower.includes('לא')) || buttonTitleLower.includes('אגיע')) {
        console.log('✅ Matched as confirmation based on text');
        console.log(`📞 Phone number received: ${phoneNumber}`);
        
        try {
          await updateGuestStatusByPhone(phoneNumber, 'confirmed');
          console.log('✅ Status updated to confirmed');
        } catch (error) {
          console.error('❌ Error updating guest status:', error);
        }
        
        // CRITICAL: If guest already received "yes" and is waiting for response, send "thanks" instead
        if (isWaiting && !hasThanks) {
          console.log(`✅ Guest ${phoneNumber} responded after receiving "yes" message - sending "thanks" instead of "yes"`);
          console.log(`📤 Sending "thanks" template message...`);
          try {
            await sendThanksTemplateMessage(phoneNumber);
            console.log('✅ "thanks" template message sent (or attempted)');
          } catch (error) {
            console.error('❌ Error sending "thanks" template message:', error);
          }
        } else if (hasThanks) {
          console.log(`ℹ️ Guest ${phoneNumber} already received "thanks" - no auto-response will be sent`);
        } else {
          // Guest confirmed - no automatic message sent
          console.log(`ℹ️ Guest ${phoneNumber} confirmed`);
        }
      } else if (buttonTitleLower.includes('לא') || buttonTitleLower.includes('דחה') ||
                 (buttonTitleLower.includes('לא') && (buttonTitleLower.includes('אוכל') || buttonTitleLower.includes('מגיע') || buttonTitleLower.includes('אגיע')))) {
        console.log('❌ Matched as decline based on text');
        console.log(`   Button ID: "${buttonId}"`);
        console.log(`   Button Title: "${buttonTitle}"`);
        console.log(`   Button Title Lower: "${buttonTitleLower}"`);
        // Send confirmation message first, then update status
        await sendDeclineConfirmation(phoneNumber);
        await updateGuestStatusByPhone(phoneNumber, 'declined');
        
        // CRITICAL: Send "thanks" message after decline (if not already sent)
        const normalizedPhone = phoneNumber.replace(/[^0-9]/g, '');
        if (!hasReceivedThanks(normalizedPhone)) {
          console.log(`📤 Guest declined, sending "thanks" template message...`);
          try {
            await sendThanksTemplateMessage(phoneNumber);
            console.log('✅ "thanks" template message sent after decline (or attempted)');
          } catch (error) {
            console.error('❌ Error sending "thanks" template message after decline:', error);
          }
        } else {
          console.log(`ℹ️ Guest ${phoneNumber} already received "thanks" - skipping`);
        }
      }
    }
    
    return;
  }

  // Format 2: message.interactive (newer format)
  console.log('🔍 DEBUG: Checking interactive format...');
  console.log('🔍 DEBUG: message.interactive?.type =', message.interactive?.type);
  console.log('🔍 DEBUG: Condition (message.interactive?.type === "button_reply") =', message.interactive?.type === 'button_reply');
  if (message.interactive?.type === 'button_reply') {
    console.log('✅ DEBUG: Entering interactive format handler!');
    const buttonId = message.interactive.button_reply?.id;
    const buttonTitle = message.interactive.button_reply?.title;
    const phoneNumber = message.from;
    
    console.log('🔘 ========== BUTTON CLICKED ==========');
    console.log('🔘 Button ID:', buttonId);
    console.log('🔘 Button Title:', buttonTitle);
    console.log('🔘 Phone Number:', phoneNumber);
    console.log('🔘 Full interactive object:', JSON.stringify(message.interactive, null, 2));
    console.log('🔘 ====================================');
    
    // CRITICAL: Check if this is a response from someone who received "yes" message
    const normalizedPhone = phoneNumber.replace(/[^0-9]/g, '');
    const isWaiting = isWaitingForResponse(normalizedPhone);
    const hasThanks = hasReceivedThanks(normalizedPhone);
    
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
      
      // CRITICAL: Send confirmation message after guest confirms
      try {
        await sendConfirmConfirmation(phoneNumber);
        console.log('✅ Confirm confirmation message sent');
      } catch (error) {
        console.error('❌ Error sending confirm confirmation:', error);
      }
      
      // CRITICAL: If guest already received "yes" and is waiting for response, send "thanks" instead
      if (isWaiting && !hasThanks) {
        console.log(`✅ Guest ${phoneNumber} responded after receiving "yes" message - sending "thanks" instead of "yes"`);
        console.log(`📤 Sending "thanks" template message...`);
        try {
          await sendThanksTemplateMessage(phoneNumber);
          console.log('✅ "thanks" template message sent (or attempted)');
        } catch (error) {
          console.error('❌ Error sending "thanks" template message:', error);
        }
      } else if (hasThanks) {
        console.log(`ℹ️ Guest ${phoneNumber} already received "thanks" - no auto-response will be sent`);
      } else {
        // Guest confirmed - no automatic message sent
        console.log(`ℹ️ Guest ${phoneNumber} confirmed`);
      }
    } else if (buttonId === 'decline_attendance' || 
               buttonId === 'לא אוכל להגיע' ||
               buttonId === 'לא מגיע' ||
               buttonIdLower.includes('decline') ||
               buttonIdLower.includes('לא אוכל') ||
               buttonIdLower.includes('לא מגיע') ||
               buttonIdLower.includes('לא אוכל להגיע') ||
               buttonTitle === 'לא אוכל להגיע' ||
               buttonTitle === 'לא מגיע' ||
               buttonTitle?.includes('לא אוכל') ||
               buttonTitle?.includes('לא מגיע') ||
               buttonTitle?.includes('דחה') ||
               buttonTitleLower.includes('לא אוכל') ||
               buttonTitleLower.includes('לא מגיע') ||
               buttonTitleLower.includes('לא אוכל להגיע') ||
               buttonTitleLower.includes('דחה') ||
               (buttonTitleLower.includes('לא') && (buttonTitleLower.includes('אוכל') || buttonTitleLower.includes('מגיע') || buttonTitleLower.includes('אגיע')))) {
      console.log('❌ Guest declined attendance via button!');
      console.log(`   Button ID: "${buttonId}"`);
      console.log(`   Button Title: "${buttonTitle}"`);
      console.log(`   Phone number: ${phoneNumber}`);
      console.log(`   Button ID Lower: "${buttonIdLower}"`);
      console.log(`   Button Title Lower: "${buttonTitleLower}"`);
      console.log(`   Checking conditions:`);
      console.log(`     buttonId === 'decline_attendance': ${buttonId === 'decline_attendance'}`);
      console.log(`     buttonId === 'לא אוכל להגיע': ${buttonId === 'לא אוכל להגיע'}`);
      console.log(`     buttonId === 'לא מגיע': ${buttonId === 'לא מגיע'}`);
      console.log(`     buttonIdLower.includes('decline'): ${buttonIdLower.includes('decline')}`);
      console.log(`     buttonIdLower.includes('לא אוכל'): ${buttonIdLower.includes('לא אוכל')}`);
      console.log(`     buttonIdLower.includes('לא אוכל להגיע'): ${buttonIdLower.includes('לא אוכל להגיע')}`);
      console.log(`     buttonTitle === 'לא אוכל להגיע': ${buttonTitle === 'לא אוכל להגיע'}`);
      console.log(`     buttonTitle === 'לא מגיע': ${buttonTitle === 'לא מגיע'}`);
      console.log(`     buttonTitle?.includes('לא אוכל'): ${buttonTitle?.includes('לא אוכל')}`);
      console.log(`     buttonTitle?.includes('לא מגיע'): ${buttonTitle?.includes('לא מגיע')}`);
      console.log(`     buttonTitleLower.includes('לא אוכל'): ${buttonTitleLower.includes('לא אוכל')}`);
      console.log(`     buttonTitleLower.includes('לא מגיע'): ${buttonTitleLower.includes('לא מגיע')}`);
      console.log(`     buttonTitleLower.includes('לא אוכל להגיע'): ${buttonTitleLower.includes('לא אוכל להגיע')}`);
      console.log(`     Combined check (לא + אוכל/מגיע/אגיע): ${(buttonTitleLower.includes('לא') && (buttonTitleLower.includes('אוכל') || buttonTitleLower.includes('מגיע') || buttonTitleLower.includes('אגיע')))}`);
      // CRITICAL: Update status FIRST, then try to send confirmation message
      // This ensures the status is updated even if sending the message fails
      try {
      await updateGuestStatusByPhone(phoneNumber, 'declined');
        console.log('✅ Guest status updated to declined');
      } catch (error) {
        console.error('❌ Error updating guest status to declined:', error);
        // Don't throw - continue to try sending confirmation
      }
      
      // Try to send confirmation message (but don't fail if it doesn't work)
      try {
        await sendDeclineConfirmation(phoneNumber);
      } catch (error) {
        console.error('❌ Error sending decline confirmation (non-critical):', error.message);
        // Don't throw - status update is more important than confirmation message
      }
      
      // CRITICAL: Send "thanks" message after decline (if not already sent)
      const normalizedPhone = phoneNumber.replace(/[^0-9]/g, '');
      if (!hasReceivedThanks(normalizedPhone)) {
        console.log(`📤 Guest declined, sending "thanks" template message...`);
        try {
          await sendThanksTemplateMessage(phoneNumber);
          console.log('✅ "thanks" template message sent after decline (or attempted)');
        } catch (error) {
          console.error('❌ Error sending "thanks" template message after decline:', error);
        }
      } else {
        console.log(`ℹ️ Guest ${phoneNumber} already received "thanks" - skipping`);
      }
    } else if (buttonId === 'attendance_update' || 
               buttonTitle === 'לעדכון סטטוס הגעה' ||
               buttonTitleLower.includes('סטטוס הגעה') ||
               buttonTitleLower.includes('עדכון הגעה')) {
      console.log('📋 Guest clicked "attendance_update" button - sending link to update attendance status');
      console.log(`📞 Phone number: ${phoneNumber}`);
      
      try {
        // Find guest by phone number
        loadEvents(); // Reload events to get latest data
        let foundGuest = null;
        let foundEvent = null;
        
        for (const event of eventsData.events) {
          if (event.guests && event.guests.length > 0) {
            foundGuest = event.guests.find(g => {
              const guestPhone = (g.phoneNumber || '').replace(/[^0-9]/g, '');
              const updatePhone = phoneNumber.replace(/[^0-9]/g, '');
              
              if (!guestPhone || !updatePhone) return false;
              
              const guestPhoneWith972 = guestPhone.startsWith('0') ? '972' + guestPhone.substring(1) : guestPhone;
              const updatePhoneWith972 = updatePhone.startsWith('0') ? '972' + updatePhone.substring(1) : updatePhone;
              const guestPhoneWith0 = guestPhone.startsWith('972') ? '0' + guestPhone.substring(3) : guestPhone;
              const updatePhoneWith0 = updatePhone.startsWith('972') ? '0' + updatePhone.substring(3) : updatePhone;
              
              return guestPhone === updatePhone || 
                     guestPhone === updatePhoneWith0 ||
                     guestPhone === updatePhoneWith972 ||
                     guestPhoneWith972 === updatePhone ||
                     guestPhoneWith972 === updatePhoneWith972 ||
                     guestPhoneWith0 === updatePhone ||
                     guestPhoneWith0 === updatePhoneWith0;
            });
            
            if (foundGuest) {
              foundEvent = event;
              break;
            }
          }
        }
        
        if (foundGuest && foundEvent) {
          // Generate guest response link
          const frontendUrl = process.env.FRONTEND_URL || 'https://rsvp-frontend-wy47.onrender.com';
          const guestLink = `${frontendUrl}/#/guest-response/${foundEvent.id}?guest=${foundGuest.id}`;
          
          console.log(`✅ Found guest: ${foundGuest.firstName} ${foundGuest.lastName}`);
          console.log(`🔗 Guest link: ${guestLink}`);
          
          // Send link via WhatsApp
          const messageText = `שלום ${foundGuest.firstName}!\n\nלעדכון סטטוס ההגעה שלך, לחץ על הקישור הבא:\n\n${guestLink}\n\nבברכה,\n${foundEvent.coupleName}`;
          
          try {
            const response = await axios.post(
              `https://graph.facebook.com/v22.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`,
              {
                messaging_product: 'whatsapp',
                to: phoneNumber,
                type: 'text',
                text: {
                  body: messageText
                }
              },
              {
                headers: {
                  'Authorization': `Bearer ${sanitizeAccessToken(process.env.WHATSAPP_ACCESS_TOKEN)}`,
                  'Content-Type': 'application/json'
                }
              }
            );
            
            console.log('✅ Attendance update link sent successfully');
            console.log('📱 Response:', JSON.stringify(response.data, null, 2));
          } catch (error) {
            console.error('❌ Error sending attendance update link:', error);
            if (error.response) {
              console.error('❌ Error response:', JSON.stringify(error.response.data, null, 2));
            }
          }
        } else {
          console.warn(`⚠️ Guest not found for phone number: ${phoneNumber}`);
          // Send error message to guest
          try {
            const response = await axios.post(
              `https://graph.facebook.com/v22.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`,
              {
                messaging_product: 'whatsapp',
                to: phoneNumber,
                type: 'text',
                text: {
                  body: 'מצטערים, לא מצאנו את הפרטים שלך במערכת. אנא פנה למארגני האירוע.'
                }
              },
              {
                headers: {
                  'Authorization': `Bearer ${sanitizeAccessToken(process.env.WHATSAPP_ACCESS_TOKEN)}`,
                  'Content-Type': 'application/json'
                }
              }
            );
          } catch (error) {
            console.error('❌ Error sending error message:', error);
          }
        }
      } catch (error) {
        console.error('❌ Error handling attendance_update button:', error);
      }
    } else {
      console.warn('⚠️ Unknown button clicked:', { buttonId, buttonTitle });
      console.warn('⚠️ Trying to match anyway...');
      // Try to match anyway based on common patterns
      // CRITICAL: Check if this is a response from someone who received "yes" message
      const normalizedPhone = phoneNumber.replace(/[^0-9]/g, '');
      const isWaiting = isWaitingForResponse(normalizedPhone);
      const hasThanks = hasReceivedThanks(normalizedPhone);
      
      if (buttonTitleLower.includes('כן') || (buttonTitleLower.includes('מגיע') && !buttonTitleLower.includes('לא')) || buttonTitleLower.includes('אגיע')) {
        console.log('✅ Matched as confirmation based on text');
        console.log(`📞 Phone number received: ${phoneNumber}`);
        
        try {
          await updateGuestStatusByPhone(phoneNumber, 'confirmed');
          console.log('✅ Status updated to confirmed');
        } catch (error) {
          console.error('❌ Error updating guest status:', error);
        }
        
        // CRITICAL: If guest already received "yes" and is waiting for response, send "thanks" instead
        if (isWaiting && !hasThanks) {
          console.log(`✅ Guest ${phoneNumber} responded after receiving "yes" message - sending "thanks" instead of "yes"`);
          console.log(`📤 Sending "thanks" template message...`);
          try {
            await sendThanksTemplateMessage(phoneNumber);
            console.log('✅ "thanks" template message sent (or attempted)');
        } catch (error) {
            console.error('❌ Error sending "thanks" template message:', error);
          }
        } else if (hasThanks) {
          console.log(`ℹ️ Guest ${phoneNumber} already received "thanks" - no auto-response will be sent`);
        } else {
          // Guest confirmed - no automatic message sent
          console.log(`ℹ️ Guest ${phoneNumber} confirmed`);
        }
      } else if (buttonTitleLower.includes('לא') || buttonTitleLower.includes('דחה') ||
                 (buttonTitleLower.includes('לא') && (buttonTitleLower.includes('אוכל') || buttonTitleLower.includes('מגיע') || buttonTitleLower.includes('אגיע')))) {
        console.log('❌ Matched as decline based on text');
        console.log(`   Button ID: "${buttonId}"`);
        console.log(`   Button Title: "${buttonTitle}"`);
        console.log(`   Button Title Lower: "${buttonTitleLower}"`);
        // Send confirmation message first, then update status
        await sendDeclineConfirmation(phoneNumber);
        await updateGuestStatusByPhone(phoneNumber, 'declined');
        
        // CRITICAL: Send "thanks" message after decline (if not already sent)
        const normalizedPhone = phoneNumber.replace(/[^0-9]/g, '');
        if (!hasReceivedThanks(normalizedPhone)) {
          console.log(`📤 Guest declined, sending "thanks" template message...`);
          try {
            await sendThanksTemplateMessage(phoneNumber);
            console.log('✅ "thanks" template message sent after decline (or attempted)');
          } catch (error) {
            console.error('❌ Error sending "thanks" template message after decline:', error);
          }
        } else {
          console.log(`ℹ️ Guest ${phoneNumber} already received "thanks" - skipping`);
        }
      }
    }
    
    return;
  }

  // Handle text messages (fallback and guest count responses)
  console.log('🔍 DEBUG: No button format matched, treating as text message');
  console.log('🔍 DEBUG: message.text?.body =', message.text?.body);
  const messageText = message.text?.body?.toLowerCase() || '';
  const originalMessageText = message.text?.body || '';
  
  // CRITICAL: Check FIRST if this is a response from someone who received "yes" message
  // If they received "yes" and haven't received "thanks" yet, send "thanks" for ANY response
  const normalizedPhone = message.from.replace(/[^0-9]/g, '');
  const isWaiting = isWaitingForResponse(normalizedPhone);
  const hasThanks = hasReceivedThanks(normalizedPhone);
  
  // CRITICAL: If guest received "yes" and is waiting for response, send "thanks" for ANY response
  if (isWaiting && !hasThanks) {
    console.log(`✅ Guest ${message.from} responded after receiving "yes" message - sending "thanks"`);
    try {
      await sendThanksTemplateMessage(message.from);
      console.log('✅ "thanks" template message sent successfully');
    } catch (error) {
      console.error('❌ Error sending "thanks" template message:', error.message);
    }
    // Continue processing the message (don't return here - we still want to process guest count, etc.)
  } else if (!isWaiting) {
    console.log(`ℹ️ Guest ${message.from} is NOT waiting for response - "thanks" will not be sent`);
  } else if (hasThanks) {
    console.log(`ℹ️ Guest ${message.from} already received "thanks" - no auto-response will be sent`);
  }
  
  // Check if this is a response to guest count question
  // Look for numbers or common phrases indicating guest count
  const guestCountMatch = extractGuestCount(originalMessageText);
  if (guestCountMatch !== null) {
    console.log(`📊 Guest count response detected: ${guestCountMatch} people`);
    
    console.log(`📤 Guest provided guest count (${guestCountMatch}), processing...`);
    console.log(`   Phone: ${message.from}`);
    console.log(`   Normalized phone: ${normalizedPhone}`);
    console.log(`   isWaiting: ${isWaiting}`);
    console.log(`   hasThanks: ${hasThanks}`);
    
    // CRITICAL: When guest provides count, they are confirming attendance
    // Update status to "confirmed" first (this creates a separate update with status only)
    // Use source 'guest_count' for guest count updates
    console.log(`✅ Guest provided count - updating status to "confirmed"`);
    await updateGuestStatusByPhone(message.from, 'confirmed', 'guest_count');
    
    // Then update guest count (this creates a separate update with guestCount only, NO status)
    // Frontend processes status and guestCount updates separately
    await updateGuestCountByPhone(message.from, guestCountMatch);
    
    // CRITICAL: Send update status message after guest provides count
    try {
      await sendDeclineConfirmation(message.from); // Reuse the same function - it sends the update status message
      console.log('✅ Update status message sent after guest count provided');
    } catch (error) {
      console.error('❌ Error sending update status message after guest count:', error);
    }
    
    // Note: "thanks" was already sent above if isWaiting && !hasThanks
    // If not sent above, it means guest already received "thanks" or didn't receive "yes" yet
    if (!isWaiting || hasThanks) {
      console.log(`ℹ️ "thanks" already handled above or guest didn't receive "yes" yet`);
    }
    
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
      
      // CRITICAL: Send "thanks" message after decline (if not already sent)
      const normalizedPhone = message.from.replace(/[^0-9]/g, '');
      if (!hasReceivedThanks(normalizedPhone)) {
        console.log(`📤 Guest declined via text, sending "thanks" template message...`);
        try {
          await sendThanksTemplateMessage(message.from);
          console.log('✅ "thanks" template message sent after decline (or attempted)');
        } catch (error) {
          console.error('❌ Error sending "thanks" template message after decline:', error);
        }
      } else {
        console.log(`ℹ️ Guest ${message.from} already received "thanks" - skipping`);
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
    
    // CRITICAL: Send confirmation message after guest confirms via text
    try {
      await sendConfirmConfirmation(message.from);
      console.log('✅ Confirm confirmation message sent');
    } catch (error) {
      console.error('❌ Error sending confirm confirmation:', error);
    }
    
    // CRITICAL: Check if this is a response from someone who received "yes" message
    const normalizedPhone = message.from.replace(/[^0-9]/g, '');
    const isWaiting = isWaitingForResponse(normalizedPhone);
    const hasThanks = hasReceivedThanks(normalizedPhone);
    
    // CRITICAL: If guest already received "yes" and is waiting for response, send "thanks" instead
    if (isWaiting && !hasThanks) {
      console.log(`✅ Guest ${message.from} responded after receiving "yes" message - sending "thanks" instead of "yes"`);
      console.log(`📤 Sending "thanks" template message...`);
      try {
        await sendThanksTemplateMessage(message.from);
        console.log('✅ "thanks" template message sent (or attempted)');
      } catch (error) {
        console.error('❌ Error sending "thanks" template message:', error);
      }
    } else if (hasThanks) {
      console.log(`ℹ️ Guest ${message.from} already received "thanks" - no auto-response will be sent`);
    } else {
      // Guest confirmed - no automatic message sent
      console.log(`ℹ️ Guest ${message.from} confirmed`);
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
    
    // CRITICAL: Frontend expects separate updates for status and guestCount
    // Send guestCount update WITHOUT status so frontend can process it correctly
    const guestCountUpdate = {
      phoneNumber: phoneWith0,
      originalPhoneNumber: formattedPhone,
      guestCount: guestCount,
      // NO status here - frontend processes guestCount updates separately
      responseDate: new Date().toISOString(),
      timestamp: Date.now(),
      source: 'guest_count' // Mark as coming from guest count response (not button click)
    };
    
    // Add guest count update (frontend will process this separately from status update)
    pendingUpdates.push(guestCountUpdate);
    console.log('✅ Guest count update stored (separate from status):', guestCountUpdate);
    console.log(`📊 Total pending updates: ${pendingUpdates.length}`);
  } catch (error) {
    console.error('❌ Error updating guest count:', error);
  }
}

// Send confirmation message when guest declines
async function sendDeclineConfirmation(phoneNumber) {
  try {
    const confirmationMessage = 'תודה על התגובה\nבמידה ואתה רוצה לעדכן את סטטוס ההגעה שלך, במקרה של שינוי לחץ על כפתור "לעדכון סטטוס הגעה"';
    
    console.log(`📤 Sending decline confirmation to ${phoneNumber}`);
    
    // CRITICAL: Reload token from environment directly (in case it wasn't set correctly at startup)
    let rawToken = process.env.WHATSAPP_ACCESS_TOKEN || process.env.VITE_WHATSAPP_ACCESS_TOKEN;
    if (!rawToken || rawToken.length < 50) {
      console.warn('⚠️ Token seems invalid, using default token');
      rawToken = 'EAAQ16mfCx58BPZCAepGf7EQMznC5dwYUmsun7pZCvzLPqjOjnq778EeJtXGEdemBVXdqTEt9pJ0bm2l5EyL9BZAR9kVS15kjz9rWYAcbKZCZBVOQswHeZAfmkUNv2TZAeX8KGaJ8OZCb4ZCtOaZAEZARqvG2TE7DHCmZBDWRATOKdvfHZA4j8FGluUX8NNGdsqbBEVgFjNgZDZD';
    }
    
    const accessToken = sanitizeAccessToken(rawToken);
    const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
    
    // Validate token
    if (!accessToken || accessToken.length < 50) {
      console.error('❌ WhatsApp Access Token is invalid or too short!');
      console.error(`❌ Token length: ${accessToken ? accessToken.length : 0} (expected 200+ characters)`);
      console.error(`❌ Please check WHATSAPP_ACCESS_TOKEN in Render environment variables`);
      return;
    }
    
    if (!phoneNumberId) {
      console.error('❌ WhatsApp Phone Number ID is missing!');
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
    // Don't throw - this is a non-critical operation
    // The status update is more important than sending the confirmation message
    console.error('❌ Error sending decline confirmation (non-critical):', error.message);
    if (error.response) {
      console.error('❌ Error response status:', error.response.status);
      console.error('❌ Error response data:', JSON.stringify(error.response.data, null, 2));
    } else if (error.request) {
      console.error('❌ No response received:', error.request);
    } else {
      console.error('❌ Error setting up request:', error.message);
    }
    // Don't rethrow - let the status update succeed even if message sending fails
  }
}

// Send confirmation message when guest confirms attendance
async function sendConfirmConfirmation(phoneNumber) {
  try {
    const confirmationMessage = 'נהדר איזה כיף\nכמה אנשים אתם מתכוונים להגיע?\n(תשיבו בסיפרה ותכללו את עצמכם בתוך הספירה)🙂\nתספרו רק את מי שתופס כיסא';
    
    console.log(`📤 Sending confirm confirmation to ${phoneNumber}`);
    
    // CRITICAL: Reload token from environment directly (in case it wasn't set correctly at startup)
    let rawToken = process.env.WHATSAPP_ACCESS_TOKEN || process.env.VITE_WHATSAPP_ACCESS_TOKEN;
    if (!rawToken || rawToken.length < 50) {
      console.warn('⚠️ Token seems invalid, using default token');
      rawToken = 'EAAQ16mfCx58BPZCAepGf7EQMznC5dwYUmsun7pZCvzLPqjOjnq778EeJtXGEdemBVXdqTEt9pJ0bm2l5EyL9BZAR9kVS15kjz9rWYAcbKZCZBVOQswHeZAfmkUNv2TZAeX8KGaJ8OZCb4ZCtOaZAEZARqvG2TE7DHCmZBDWRATOKdvfHZA4j8FGluUX8NNGdsqbBEVgFjNgZDZD';
    }
    
    const accessToken = sanitizeAccessToken(rawToken);
    const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
    
    // Validate token
    if (!accessToken || accessToken.length < 50) {
      console.error('❌ WhatsApp Access Token is invalid or too short!');
      console.error(`❌ Token length: ${accessToken ? accessToken.length : 0} (expected 200+ characters)`);
      console.error(`❌ Please check WHATSAPP_ACCESS_TOKEN in Render environment variables`);
      return;
    }
    
    if (!phoneNumberId) {
      console.error('❌ WhatsApp Phone Number ID is missing!');
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
      console.log('✅ Confirm confirmation sent successfully');
      console.log('📱 Response:', JSON.stringify(response.data, null, 2));
    } else {
      console.warn('⚠️ Failed to send confirm confirmation:', response.status);
      console.warn('⚠️ Response data:', response.data);
    }
  } catch (error) {
    // Don't throw - this is a non-critical operation
    // The status update is more important than sending the confirmation message
    console.error('❌ Error sending confirm confirmation (non-critical):', error.message);
    if (error.response) {
      console.error('❌ Error response status:', error.response.status);
      console.error('❌ Error response data:', JSON.stringify(error.response.data, null, 2));
    } else if (error.request) {
      console.error('❌ No response received:', error.request);
    } else {
      console.error('❌ Error setting up request:', error.message);
    }
    // Don't rethrow - let the status update succeed even if message sending fails
  }
}


// Send "thanks" template message after guest responds
async function sendThanksTemplateMessage(phoneNumber, forceSend = false) {
  try {
    console.log(`📤 ========== SENDING "thanks" TEMPLATE MESSAGE ==========`);
    console.log(`📤 Original phone number: ${phoneNumber}`);
    console.log(`📤 Force send: ${forceSend}`);
    
    // CRITICAL: Check if guest already received "thanks" to prevent duplicates
    // Normalize phone number for consistent checking
    const normalizedPhone = phoneNumber.replace(/[^0-9]/g, '');
    if (!forceSend && hasReceivedThanks(normalizedPhone)) {
      console.log(`⏭️ Skipping "thanks" template message - already sent to ${phoneNumber} (normalized: ${normalizedPhone})`);
      return; // Don't send duplicate
    }
    
    if (forceSend) {
      console.log(`✅ FORCING "thanks" template message to ${phoneNumber} (normalized: ${normalizedPhone}) - bypassing duplicate check`);
    } else {
      console.log(`✅ Guest ${phoneNumber} (normalized: ${normalizedPhone}) has NOT received "thanks" yet - proceeding to send`);
    }
    
    // CRITICAL: Try to reload token from environment if it seems invalid
    let rawToken = process.env.WHATSAPP_ACCESS_TOKEN;
    
    // If token is too short, try to reload from environment
    if (!rawToken || rawToken.length < 50) {
      console.warn('⚠️ Token seems invalid, trying to reload from environment...');
      rawToken = process.env.WHATSAPP_ACCESS_TOKEN || process.env.VITE_WHATSAPP_ACCESS_TOKEN;
      
      // If still invalid, use the default token
      if (!rawToken || rawToken.length < 50) {
        console.warn('⚠️ Reloaded token still invalid, using default token');
        rawToken = 'EAAQ16mfCx58BPZCAepGf7EQMznC5dwYUmsun7pZCvzLPqjOjnq778EeJtXGEdemBVXdqTEt9pJ0bm2l5EyL9BZAR9kVS15kjz9rWYAcbKZCZBVOQswHeZAfmkUNv2TZAeX8KGaJ8OZCb4ZCtOaZAEZARqvG2TE7DHCmZBDWRATOKdvfHZA4j8FGluUX8NNGdsqbBEVgFjNgZDZD';
      }
    }
    
    const accessToken = sanitizeAccessToken(rawToken);
    const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
    
    if (!accessToken || accessToken.length < 50) {
      console.error('❌ WhatsApp Access Token is invalid or too short!');
      return;
    }
    
    if (!phoneNumberId) {
      console.error('❌ WhatsApp Phone Number ID is missing!');
      return;
    }
    
    // Format phone number
    let formattedPhone = phoneNumber.replace(/[^0-9]/g, '');
    if (formattedPhone.startsWith('0')) {
      formattedPhone = '972' + formattedPhone.substring(1);
    } else if (!formattedPhone.startsWith('972')) {
      formattedPhone = '972' + formattedPhone;
    }
    
    console.log(`📤 Formatted phone number: ${formattedPhone}`);
    
    // Send template message "thanks"
    const messagePayload = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: formattedPhone,
      type: 'template',
      template: {
        name: 'thanks',
        language: {
          code: 'he'
        }
      }
    };
    
    console.log('📤 Sending "thanks" template message...');
    console.log('📤 Full Payload:', JSON.stringify(messagePayload, null, 2));
    
    try {
    const response = await axios.post(
      `https://graph.facebook.com/v22.0/${phoneNumberId}/messages`,
      messagePayload,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
          },
          timeout: 10000
      }
    );
    
    if (response.status === 200) {
        console.log('✅ "thanks" template message sent successfully!');
      console.log('📱 Response:', JSON.stringify(response.data, null, 2));
        // CRITICAL: Mark "thanks" as sent to prevent duplicates and stop auto-responses
        // Only mark if not forceSend - if forceSend, we want to allow sending again
        if (!forceSend) {
          markThanksAsSent(phoneNumber);
          console.log('✅ Marked "thanks" as sent (normal send)');
        } else {
          console.log('ℹ️ Force send mode - NOT marking "thanks" as sent to allow future sends');
        }
      console.log('📤 ==========================================');
    } else {
        console.warn('⚠️ Failed to send "thanks" template message:', response.status);
      console.warn('⚠️ Response data:', response.data);
      console.log('📤 ==========================================');
    }
  } catch (error) {
      console.error('❌ ========== ERROR SENDING "thanks" TEMPLATE MESSAGE ==========');
    console.error('❌ Error:', error.message);
    if (error.response) {
      console.error('❌ Error response status:', error.response.status);
      console.error('❌ Error response data:', JSON.stringify(error.response.data, null, 2));
    }
    console.error('❌ ========================================================');
    }
  } catch (error) {
    console.error('❌ Error in sendThanksTemplateMessage:', error);
  }
}

// Helper function to check if guest count question was recently sent
function wasGuestCountQuestionRecentlySent(phoneNumber) {
  const key = phoneNumber.replace(/[^0-9]/g, '');
  const lastSent = recentlySentGuestCountQuestions.get(key);
  if (!lastSent) {
    return false;
  }
  const timeSinceLastSent = Date.now() - lastSent;
  if (timeSinceLastSent > GUEST_COUNT_QUESTION_COOLDOWN) {
    recentlySentGuestCountQuestions.delete(key);
    return false;
  }
  return true;
}

// Helper function to mark guest count question as sent
function markGuestCountQuestionAsSent(phoneNumber) {
  const key = phoneNumber.replace(/[^0-9]/g, '');
  recentlySentGuestCountQuestions.set(key, Date.now());
  console.log(`✅ Marked guest count question as sent for ${phoneNumber}`);
  
  // Clean up old entries
  const now = Date.now();
  for (const [phone, timestamp] of recentlySentGuestCountQuestions.entries()) {
    if (now - timestamp > GUEST_COUNT_QUESTION_COOLDOWN) {
      recentlySentGuestCountQuestions.delete(phone);
    }
  }
}

// Send follow-up message asking for guest count
async function sendGuestCountQuestion(phoneNumber) {
  try {
    // CRITICAL: Check if guest count question was recently sent to prevent duplicates
    if (wasGuestCountQuestionRecentlySent(phoneNumber)) {
      console.log(`⏭️ Skipping guest count question - recently sent to ${phoneNumber} (within ${GUEST_COUNT_QUESTION_COOLDOWN / 1000 / 60} minutes)`);
      return; // Exit early - don't send duplicate
    }
    
    console.log(`📤 Sending guest count question to ${phoneNumber}`);
    
    // Use WhatsApp Business API to send the message
    const rawToken = process.env.WHATSAPP_ACCESS_TOKEN;
    const accessToken = sanitizeAccessToken(rawToken);
    const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
    
    // Validate token
    if (!accessToken || accessToken.length < 50) {
      console.error('❌ WhatsApp Access Token is invalid or too short!');
      console.error(`❌ Token length: ${accessToken ? accessToken.length : 0} (expected 200+ characters)`);
      console.error(`❌ Please check WHATSAPP_ACCESS_TOKEN in Render environment variables`);
      return;
    }
    
    if (!phoneNumberId) {
      console.error('❌ WhatsApp Phone Number ID is missing!');
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
      // Mark as sent to prevent duplicates
      markGuestCountQuestionAsSent(phoneNumber);
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
async function updateGuestStatusByPhone(phoneNumber, status, source = 'whatsapp') {
  try {
    // Format phone number (remove country code prefix if needed)
    // Keep original format too for better matching
    const originalPhone = phoneNumber.replace(/[^0-9]/g, '');
    const formattedPhone = originalPhone.replace(/^972/, '0');
    
    console.log(`🔄 ========== UPDATING GUEST STATUS ==========`);
    console.log(`🔄 Original phone: ${phoneNumber}`);
    console.log(`🔄 Formatted phone: ${formattedPhone}`);
    console.log(`🔄 Status: ${status}`);
    console.log(`🔄 Source: ${source}`);
    console.log(`🔄 Timestamp: ${new Date().toISOString()}`);
    
    // CRITICAL: Find guest by phone number to get guestId and eventId
    // This ensures the correct guest is updated, even if multiple guests share the same phone number
    loadEvents(); // Reload events to get latest data
    let foundGuest = null;
    let foundEvent = null;
    
    // CRITICAL: Find ALL guests with matching phone number, then select the most relevant one
    // This ensures we update the correct guest even if multiple guests share the same phone number
    const matchingGuests = [];
    
    for (const event of eventsData.events) {
      if (event.guests && event.guests.length > 0) {
        const eventGuests = event.guests.filter(g => {
          if (!g.phoneNumber) return false;
          const guestPhone = (g.phoneNumber || '').replace(/[^0-9]/g, '');
          const updatePhone = phoneNumber.replace(/[^0-9]/g, '');
          
          if (!guestPhone || !updatePhone) return false;
          
          const guestPhoneWith972 = guestPhone.startsWith('0') ? '972' + guestPhone.substring(1) : guestPhone;
          const updatePhoneWith972 = updatePhone.startsWith('0') ? '972' + updatePhone.substring(1) : updatePhone;
          const guestPhoneWith0 = guestPhone.startsWith('972') ? '0' + guestPhone.substring(3) : guestPhone;
          const updatePhoneWith0 = updatePhone.startsWith('972') ? '0' + updatePhone.substring(3) : updatePhone;
          
          return guestPhone === updatePhone || 
                 guestPhone === updatePhoneWith0 ||
                 guestPhone === updatePhoneWith972 ||
                 guestPhoneWith972 === updatePhone ||
                 guestPhoneWith972 === updatePhoneWith972 ||
                 guestPhoneWith0 === updatePhone ||
                 guestPhoneWith0 === updatePhoneWith0;
        });
        
        // Add matching guests with their event
        eventGuests.forEach(guest => {
          matchingGuests.push({ guest, event });
        });
      }
    }
    
    // CRITICAL: Select the most relevant guest from matching guests
    // Priority: 1) Guest with most recent messageSentDate, 2) Guest with most recent responseDate, 3) First guest found
    if (matchingGuests.length > 0) {
      // Sort by: messageSentDate (most recent first), then responseDate (most recent first)
      matchingGuests.sort((a, b) => {
        const aMessageDate = a.guest.messageSentDate ? new Date(a.guest.messageSentDate).getTime() : 0;
        const bMessageDate = b.guest.messageSentDate ? new Date(b.guest.messageSentDate).getTime() : 0;
        const aResponseDate = a.guest.responseDate ? new Date(a.guest.responseDate).getTime() : 0;
        const bResponseDate = b.guest.responseDate ? new Date(b.guest.responseDate).getTime() : 0;
        
        // First priority: messageSentDate (most recent first)
        if (aMessageDate !== bMessageDate) {
          return bMessageDate - aMessageDate;
        }
        
        // Second priority: responseDate (most recent first)
        if (aResponseDate !== bResponseDate) {
          return bResponseDate - aResponseDate;
        }
        
        // If all else equal, keep original order
        return 0;
      });
      
      foundGuest = matchingGuests[0].guest;
      foundEvent = matchingGuests[0].event;
      
      if (matchingGuests.length > 1) {
        console.log(`⚠️ Found ${matchingGuests.length} guests with phone ${phoneNumber}, selecting most recent: ${foundGuest.firstName} ${foundGuest.lastName} (${foundGuest.id})`);
        console.log(`📊 All matching guests:`, matchingGuests.map(m => ({
          name: `${m.guest.firstName} ${m.guest.lastName}`,
          id: m.guest.id,
          eventId: m.event.id,
          messageSentDate: m.guest.messageSentDate ? new Date(m.guest.messageSentDate).toISOString() : 'none',
          responseDate: m.guest.responseDate ? new Date(m.guest.responseDate).toISOString() : 'none'
        })));
      } else {
        console.log(`✅ Found guest: ${foundGuest.firstName} ${foundGuest.lastName} (${foundGuest.id}) in event ${foundEvent.id}`);
      }
    }
    
    // Store update in pending updates array
    // Store both formats to increase chance of matching
    const updateData = {
      phoneNumber: formattedPhone,
      originalPhoneNumber: originalPhone, // Keep original for matching
      guestId: foundGuest?.id, // CRITICAL: Include guestId to ensure correct guest is updated
      eventId: foundEvent?.id, // CRITICAL: Include eventId to ensure correct event is used
      status: status,
      responseDate: new Date().toISOString(),
      timestamp: Date.now(),
      source: source // Use provided source or default to 'whatsapp'
    };
    
    // CRITICAL: Remove ALL existing updates for this guest (by guestId if available, otherwise by phone number) to prevent conflicts
    // Keep only the latest update - delete all previous updates for this guest
    const updatesToRemove = [];
    for (let i = pendingUpdates.length - 1; i >= 0; i--) {
      const existingUpdate = pendingUpdates[i];
      // CRITICAL: Match by guestId first (most precise), then by phone number
      const isSameGuest = (foundGuest?.id && existingUpdate.guestId && existingUpdate.guestId === foundGuest.id) ||
                          (foundGuest?.id && existingUpdate.guestId && existingUpdate.guestId === foundGuest.id && existingUpdate.eventId === foundEvent?.id);
      const isSamePhone = (existingUpdate.phoneNumber === formattedPhone || existingUpdate.originalPhoneNumber === originalPhone) ||
                          (existingUpdate.phoneNumber === originalPhone || existingUpdate.originalPhoneNumber === formattedPhone);
      // Remove if same guest (by ID) OR same phone number (fallback)
      if (isSameGuest || isSamePhone) {
        updatesToRemove.push(i);
      }
    }
    
    // Remove all previous updates for this guest
    if (updatesToRemove.length > 0) {
      for (const index of updatesToRemove) {
        pendingUpdates.splice(index, 1);
      }
      console.log(`🗑️ Removed ${updatesToRemove.length} previous update(s) for guest ${foundGuest?.id || formattedPhone} to prevent conflicts`);
    }
    
    // Add the new update (always add, since we removed all previous ones)
      pendingUpdates.push(updateData);
      console.log('✅ ========== GUEST STATUS UPDATE STORED ==========');
      console.log('✅ Phone (formatted):', formattedPhone);
      console.log('✅ Phone (original):', originalPhone);
    console.log('✅ Guest ID:', foundGuest?.id || 'not found');
    console.log('✅ Event ID:', foundEvent?.id || 'not found');
      console.log('✅ Status:', status);
      console.log('✅ Timestamp:', new Date(updateData.timestamp).toLocaleTimeString());
      console.log(`📊 Total pending updates: ${pendingUpdates.length}`);
      console.log(`📋 All pending updates:`, pendingUpdates.map(u => ({
        phone: u.phoneNumber,
      guestId: u.guestId,
      eventId: u.eventId,
        status: u.status,
      source: u.source,
        time: new Date(u.timestamp).toLocaleTimeString()
      })));
      console.log('✅ ===============================================');
    
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

  // CRITICAL: Update messageStatus in events based on WhatsApp status
  // Find guest by phone number and update their messageStatus
  const phoneNumber = status.recipient_id || status.to;
  if (!phoneNumber) {
    console.warn('⚠️ No phone number in status update:', status);
    return;
  }

  // Normalize phone number
  const normalizedPhone = phoneNumber.replace(/[^0-9]/g, '');
  const formattedPhone = normalizedPhone.replace(/^972/, '0');
  const phoneWith972 = normalizedPhone.startsWith('0') ? '972' + normalizedPhone.substring(1) : normalizedPhone;

  // Load events to find guest
  loadEvents();
  
  // Find guest by phone number across all events
  for (const event of eventsData.events) {
    if (!event.guests || event.guests.length === 0) continue;
    
    const guest = event.guests.find(g => {
      if (!g.phoneNumber) return false;
      const guestPhone = g.phoneNumber.replace(/[^0-9]/g, '');
      const guestPhoneWith0 = guestPhone.replace(/^972/, '0');
      const guestPhoneWith972 = guestPhone.startsWith('0') ? '972' + guestPhone.substring(1) : guestPhone;
      
      return guestPhone === normalizedPhone || 
             guestPhone === formattedPhone ||
             guestPhone === phoneWith972 ||
             guestPhoneWith0 === normalizedPhone ||
             guestPhoneWith0 === formattedPhone ||
             guestPhoneWith0 === phoneWith972 ||
             guestPhoneWith972 === normalizedPhone ||
             guestPhoneWith972 === formattedPhone ||
             guestPhoneWith972 === phoneWith972;
    });

    if (guest) {
      // Map WhatsApp status to our messageStatus
      let messageStatus = guest.messageStatus;
  switch (status.status) {
    case 'sent':
          messageStatus = 'sent';
          console.log(`📤 Message sent successfully to ${guest.firstName} ${guest.lastName}`);
      break;
    case 'delivered':
          messageStatus = 'delivered';
          console.log(`📨 Message delivered to ${guest.firstName} ${guest.lastName}`);
      break;
    case 'read':
          // Keep delivered status (read is just a notification)
          console.log(`👀 Message read by ${guest.firstName} ${guest.lastName}`);
      break;
    case 'failed':
          messageStatus = 'failed';
          console.log(`❌ Message failed to send to ${guest.firstName} ${guest.lastName}`);
      break;
      }

      // Update guest messageStatus
      if (messageStatus !== guest.messageStatus) {
        const oldStatus = guest.messageStatus;
        guest.messageStatus = messageStatus;
        if (status.status === 'delivered' || status.status === 'read') {
          guest.messageDeliveredDate = new Date(status.timestamp * 1000);
        } else if (status.status === 'failed') {
          guest.messageFailedDate = new Date(status.timestamp * 1000);
        }
        
        // Save events to file
        saveEvents();
        console.log(`✅ Updated messageStatus for ${guest.firstName} ${guest.lastName} from "${oldStatus}" to "${messageStatus}"`);
        
        // CRITICAL: Sync updated event to frontend via API
        // This ensures the frontend sees the status update in real-time
        // Note: The event is already saved to file, and frontend will sync via polling
        // But we can also trigger an immediate update by calling the API endpoint
        // The frontend polls /api/events/all every few seconds, so it will see the update
        console.log(`📡 MessageStatus update will be visible to frontend on next poll`);
      }
      break; // Found guest, no need to continue searching
    }
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
            'Authorization': `Bearer ${sanitizeAccessToken(process.env.WHATSAPP_ACCESS_TOKEN)}`,
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

// Upload image endpoint with multer error handling
app.post('/api/upload/image', (req, res, next) => {
  upload.single('image')(req, res, (err) => {
    if (err) {
      // Handle multer errors
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({
            success: false,
            error: 'הקובץ גדול מדי. מקסימום 5MB'
          });
        }
        if (err.code === 'LIMIT_UNEXPECTED_FILE') {
          return res.status(400).json({
            success: false,
            error: 'שדה הקובץ לא תקין. אנא השתמש בשדה "image"'
          });
        }
        return res.status(400).json({
          success: false,
          error: `שגיאת העלאה: ${err.message}`
        });
      }
      // Handle file filter errors
      if (err.message === 'Only image files are allowed!') {
        return res.status(400).json({
          success: false,
          error: 'רק קבצי תמונה מותרים (JPG, PNG, GIF, WEBP)'
        });
      }
      // Other errors
      console.error('❌ Multer error:', err);
      return res.status(500).json({
        success: false,
        error: `שגיאה בהעלאת הקובץ: ${err.message}`
      });
    }
    next();
  });
}, async (req, res) => {
  try {
    if (!req.file) {
      console.error('❌ No file received in upload request');
      return res.status(400).json({
        success: false,
        error: 'No image file provided. Please select an image file.'
      });
    }

    const filePath = req.file.path;
    console.log('📤 Uploading image:', req.file.filename, 'Size:', req.file.size, 'bytes');
    
    // Verify file exists
    if (!fs.existsSync(filePath)) {
      console.error('❌ Uploaded file does not exist at path:', filePath);
      return res.status(500).json({
        success: false,
        error: 'File was not saved correctly on server'
      });
    }
    
    // Try to upload to Imgur first (for HTTPS support)
    let imageUrl;
    try {
      console.log('📤 Attempting to upload to Imgur for HTTPS support...');
      imageUrl = await uploadToImgur(filePath);
      console.log('✅ Image uploaded to Imgur successfully:', imageUrl);
      
      // Delete local file after successful Imgur upload
      try {
        fs.unlinkSync(filePath);
      } catch (unlinkError) {
        console.warn('⚠️ Could not delete local file:', unlinkError.message);
      }
    } catch (imgurError) {
      console.warn('⚠️ Imgur upload failed, using local server:', imgurError.message);
      console.warn('⚠️ Imgur error details:', imgurError);
      
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
      
      // Verify the file is accessible
      if (!fs.existsSync(filePath)) {
        throw new Error('Local file was not saved correctly');
      }
    }
    
    console.log('✅ Image uploaded successfully:', imageUrl);
    
    res.json({
      success: true,
      imageUrl: imageUrl,
      filename: req.file.filename
    });
  } catch (error) {
    console.error('❌ Image upload error:', error);
    console.error('❌ Error stack:', error.stack);
    
    // Provide more detailed error message
    const errorMessage = error.message || 'Unknown error occurred';
    res.status(500).json({
      success: false,
      error: `Failed to upload image: ${errorMessage}`,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
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
    guestId: u.guestId, // CRITICAL: Include guestId to ensure correct guest is updated
    eventId: u.eventId, // CRITICAL: Include eventId to ensure correct event is used
    status: u.status, // May be undefined for guest count updates
    responseDate: u.responseDate || new Date(u.timestamp).toISOString(),
    guestCount: u.guestCount, // Include guest count if present
    actualAttendance: u.actualAttendance, // Include actual attendance if present
    source: u.source // Include source - 'whatsapp' for button clicks, 'guest_link' for link responses, undefined if not set (will NOT send yes message)
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

// Handle OPTIONS preflight for add-pending-update endpoint
app.options('/api/guests/add-pending-update', (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type', 'Authorization', 'X-Requested-With');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Max-Age', '86400'); // 24 hours
  res.sendStatus(200);
});

// New endpoint to directly add a pending update (used by frontend for guest_link)
app.post('/api/guests/add-pending-update', (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type', 'Authorization', 'X-Requested-With');
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  const { phoneNumber, guestId, eventId, status, guestCount, responseDate, source } = req.body;
  console.log('📥 POST /api/guests/add-pending-update received:', { phoneNumber, guestId, eventId, status, guestCount, responseDate, source });

  if (!phoneNumber || !guestId || !eventId || !status) {
    return res.status(400).json({ error: 'Missing required fields for pending update' });
  }

  const formattedPhone = phoneNumber.replace(/[^0-9]/g, '').replace(/^972/, '0');
  const originalPhone = phoneNumber.replace(/[^0-9]/g, '');

  const updateData = {
    phoneNumber: formattedPhone,
    originalPhoneNumber: originalPhone,
    guestId: guestId,
    eventId: eventId,
    status: status,
    guestCount: guestCount,
    responseDate: responseDate,
    timestamp: Date.now(),
    source: source || 'manual_add'
  };

  // CRITICAL: Remove ALL existing updates for this guest (by guestId if available, otherwise by phone number) to prevent conflicts
  const updatesToRemove = [];
  for (let i = pendingUpdates.length - 1; i >= 0; i--) {
    const existingUpdate = pendingUpdates[i];
    const isSameGuest = (guestId && existingUpdate.guestId && existingUpdate.guestId === guestId) ||
                        (guestId && existingUpdate.guestId && existingUpdate.guestId === guestId && existingUpdate.eventId === eventId);
    const isSamePhone = (existingUpdate.phoneNumber === formattedPhone || existingUpdate.originalPhoneNumber === originalPhone) ||
                        (existingUpdate.phoneNumber === originalPhone || existingUpdate.originalPhoneNumber === formattedPhone);
    if (isSameGuest || isSamePhone) {
      updatesToRemove.push(i);
    }
  }

  if (updatesToRemove.length > 0) {
    for (const index of updatesToRemove) {
      pendingUpdates.splice(index, 1);
    }
    console.log(`🗑️ Removed ${updatesToRemove.length} previous update(s) for guest ${guestId || formattedPhone} to prevent conflicts`);
  }

  pendingUpdates.push(updateData);
  console.log('✅ Added new update to pendingUpdates via direct endpoint:', updateData);
  res.json({ success: true, message: 'Update added to pendingUpdates', totalPending: pendingUpdates.length });
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
      
      // Create or update session for this login
      let sessionId = null;
      try {
        const deviceInfo = req.headers['user-agent'] || 'Unknown';
        const ipAddress = req.ip || req.connection.remoteAddress || req.headers['x-forwarded-for'] || 'Unknown';
        const clientSessionId = req.body.sessionId; // SessionId from frontend (if exists)
        
        sessionId = clientSessionId;
        let existingSession = null;
        
        // First, try to find existing session by sessionId (if provided)
        if (clientSessionId) {
          console.log(`🔍 Looking for existing session by sessionId: ${clientSessionId}`);
          existingSession = await UserSession.findOne({ 
            userId: user.id, 
            sessionId: clientSessionId,
            expiresAt: { $gt: new Date() } // Not expired
          });
          
          if (existingSession) {
            // Update existing session
            existingSession.lastActivity = new Date();
            existingSession.expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // Extend expiry
            existingSession.deviceInfo = deviceInfo.substring(0, 200);
            existingSession.ipAddress = ipAddress;
            await existingSession.save();
            console.log(`✅ Updated existing session for user ${user.id} (${user.email}) - same sessionId`);
            sessionId = existingSession.sessionId;
          } else {
            console.log(`⚠️ No existing session found with sessionId: ${clientSessionId}`);
          }
        }
        
        // If no session found by sessionId, try to find by device fingerprint (deviceInfo only, IP can change)
        if (!existingSession) {
          console.log(`🔍 Looking for existing session by device fingerprint (deviceInfo: ${deviceInfo.substring(0, 50)}...)`);
          // Use deviceInfo only (IP can change with VPN, mobile networks, etc.)
          existingSession = await UserSession.findOne({ 
            userId: user.id,
            deviceInfo: deviceInfo.substring(0, 200),
            expiresAt: { $gt: new Date() }, // Not expired
            lastActivity: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } // Active in last 7 days
          });
          
          if (existingSession) {
            // Update existing session with same device fingerprint
            existingSession.lastActivity = new Date();
            existingSession.expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // Extend expiry
            existingSession.ipAddress = ipAddress; // Update IP in case it changed
            if (clientSessionId && existingSession.sessionId !== clientSessionId) {
              // Update sessionId if client provided a different one
              console.log(`🔄 Updating sessionId from ${existingSession.sessionId} to ${clientSessionId}`);
              existingSession.sessionId = clientSessionId;
            }
            await existingSession.save();
            console.log(`✅ Updated existing session for user ${user.id} (${user.email}) - same device fingerprint`);
            sessionId = existingSession.sessionId;
          } else {
            console.log(`⚠️ No existing session found with device fingerprint`);
          }
        }
        
        // If still no session found, create new one
        if (!existingSession) {
          sessionId = clientSessionId || `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          
          // Clean up old inactive sessions (not active in last 7 days)
          const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
          await UserSession.deleteMany({
            userId: user.id,
            $or: [
              { expiresAt: { $lte: new Date() } }, // Expired
              { lastActivity: { $lt: sevenDaysAgo } } // Inactive for 7+ days
            ]
          });
          
          // Delete old sessions for this user (keep only last 10 active sessions)
          const userSessions = await UserSession.find({ 
            userId: user.id,
            expiresAt: { $gt: new Date() },
            lastActivity: { $gte: sevenDaysAgo }
          }).sort({ lastActivity: -1 });
          
        if (userSessions.length >= 10) {
          const sessionsToDelete = userSessions.slice(9); // Keep only 10 most recent
          await UserSession.deleteMany({ 
            _id: { $in: sessionsToDelete.map(s => s._id) } 
          });
            console.log(`🧹 Cleaned up ${sessionsToDelete.length} old sessions for user ${user.id}`);
        }
        
        // Create new session
        const newSession = new UserSession({
          userId: user.id,
          sessionId: sessionId,
          deviceInfo: deviceInfo.substring(0, 200), // Limit length
          ipAddress: ipAddress,
          lastActivity: new Date(),
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
        });
        await newSession.save();
        
          console.log(`✅ Created new session for user ${user.id} (${user.email})`);
        }
      } catch (sessionError) {
        console.error('⚠️ Error managing session (non-critical):', sessionError.message);
        // Don't fail login if session creation fails
        // Generate fallback sessionId if session management failed
        if (!sessionId) {
          sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        }
      }
      
      res.json({
        success: true,
        user: userResponse,
        sessionId: sessionId || undefined // Return sessionId so frontend can use it
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
// User Sessions API Endpoints
// ========================================

// Get active sessions count for current user
app.get('/api/users/:userId/sessions/count', async (req, res) => {
  try {
    const { userId } = req.params;
    
    if (!isMongoConnected) {
      return res.status(503).json({ error: 'מסד הנתונים לא זמין' });
    }
    
    // First, clean up expired sessions for this user
    const now = new Date();
    await UserSession.deleteMany({
      userId: userId,
      expiresAt: { $lte: now }
    });
    
    // Count active sessions (not expired and active in last 24 hours)
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const activeSessions = await UserSession.countDocuments({
      userId: userId,
      expiresAt: { $gt: now },
      lastActivity: { $gte: oneDayAgo } // Only count sessions active in last 24 hours
    });
    
    // Get session details
    const sessions = await UserSession.find({
      userId: userId,
      expiresAt: { $gt: now },
      lastActivity: { $gte: oneDayAgo }
    }).sort({ lastActivity: -1 }).limit(10);
    
    res.json({
      success: true,
      count: activeSessions,
      sessions: sessions.map(s => ({
        sessionId: s.sessionId,
        deviceInfo: s.deviceInfo,
        ipAddress: s.ipAddress,
        lastActivity: s.lastActivity,
        createdAt: s.createdAt
      }))
    });
  } catch (error) {
    console.error('❌ Error getting sessions count:', error);
    res.status(500).json({ error: 'שגיאה בקבלת מספר מחשבים מחוברים' });
  }
});

// Update session activity (called periodically from frontend)
app.post('/api/users/:userId/sessions/activity', async (req, res) => {
  try {
    const { userId } = req.params;
    const { sessionId } = req.body;
    
    if (!sessionId) {
      return res.status(400).json({ error: 'sessionId נדרש' });
    }
    
    if (!isMongoConnected) {
      return res.status(503).json({ error: 'מסד הנתונים לא זמין' });
    }
    
    // Update session last activity
    await UserSession.updateOne(
      { userId: userId, sessionId: sessionId },
      { 
        lastActivity: new Date(),
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // Extend expiry
      }
    );
    
    res.json({ success: true });
  } catch (error) {
    console.error('❌ Error updating session activity:', error);
    res.status(500).json({ error: 'שגיאה בעדכון פעילות session' });
  }
});

// ========================================
// Events API Endpoints (for syncing between computers)
// ========================================

// Get all events for a user
// Public endpoint to get all events (for guest response links - works on all devices)
// CRITICAL: This endpoint must return ALL events from memory, not filtered by userId
// This allows guest response links to work on any device without authentication
// CRITICAL: This endpoint is PUBLIC and accessible from ANY IP/device
app.get('/api/events/all', async (req, res) => {
  // CRITICAL: Set CORS headers FIRST - before any other operations
  // This allows access from ANY IP address or device
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Max-Age', '86400'); // 24 hours
  
  // Log request origin for debugging
  const origin = req.headers.origin || req.headers.referer || 'unknown';
  const clientIP = req.ip || req.connection.remoteAddress || 'unknown';
  console.log(`📋 GET /api/events/all - Request received (public endpoint)`);
  console.log(`📋 Request origin: ${origin}`);
  console.log(`📋 Client IP: ${clientIP}`);
  console.log(`📋 User-Agent: ${req.headers['user-agent'] || 'unknown'}`);
  
  try {
    
    // CRITICAL: Reload events from file first to ensure we have latest data
    // This ensures sync between multiple server instances
    loadEvents();
    
    // CRITICAL: Use eventsData.events from memory (not from file directly)
    // This ensures we return the most up-to-date events that may have been updated in memory
    const events = eventsData.events || [];
    
    console.log(`📋 Events in memory: ${events.length}`);
    console.log(`📋 Events file path: ${eventsFilePath}`);
    console.log(`📋 Events file exists: ${fs.existsSync(eventsFilePath)}`);
    
    // Log event IDs for debugging
    if (events.length > 0) {
      console.log(`📋 Event IDs in response:`, events.map(e => ({ 
        id: e.id, 
        name: e.coupleName,
        userId: e.userId 
      })));
    } else {
      console.warn(`⚠️ No events found in memory!`);
      // Try to reload from file as fallback
      const fileEvents = loadEvents();
      if (fileEvents.length > 0) {
        console.log(`📋 Reloaded ${fileEvents.length} events from file as fallback`);
        events.push(...fileEvents);
      }
    }
    
    console.log(`📋 GET /api/events/all - Returning ${events.length} events (public endpoint, no userId filter)`);
    
    // CRITICAL: Return ALL events without filtering by userId
    // This allows guest response links to work on any device
    res.json({
      success: true,
      events: events,
      total: events.length
    });
  } catch (error) {
    console.error('❌ Error loading all events:', error);
    console.error('❌ Error stack:', error.stack);
    // CRITICAL: Set CORS headers even on error
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.status(500).json({
      success: false,
      error: 'Failed to load events',
      details: error.message
    });
  }
});

// Handle OPTIONS preflight for /api/events/all
app.options('/api/events/all', (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Max-Age', '86400'); // 24 hours
  res.sendStatus(200);
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
        // Use for...of instead of forEach to support await
        for (const newGuest of event.guests) {
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
          const actualAttendanceChanged = existingGuest ? (newGuest.actualAttendance && newGuest.actualAttendance !== existingGuest.actualAttendance) : false;
          
          // For new guests or guests not found in existing event:
          // Check if they have a valid status or guestCount (indicates a response from guest)
          // CRITICAL: Also check if existing guest has valid status (for guest_link updates)
          const hasValidStatus = (!existingGuest && newGuest.rsvpStatus && (newGuest.rsvpStatus === 'confirmed' || newGuest.rsvpStatus === 'declined' || newGuest.rsvpStatus === 'maybe')) ||
                                 (existingGuest && newGuest.rsvpStatus && (newGuest.rsvpStatus === 'confirmed' || newGuest.rsvpStatus === 'declined' || newGuest.rsvpStatus === 'maybe'));
          const hasValidGuestCount = !existingGuest && newGuest.guestCount !== undefined && newGuest.guestCount > 0;
          const hasValidActualAttendance = !existingGuest && newGuest.actualAttendance && newGuest.actualAttendance !== 'not_marked';
          
          // CRITICAL: Check if responseDate is new or different (indicates guest updated via link)
          // Compare responseDate as strings or timestamps to detect changes
          const oldResponseDate = existingGuest?.responseDate ? (typeof existingGuest.responseDate === 'string' ? existingGuest.responseDate : new Date(existingGuest.responseDate).toISOString()) : null;
          const newResponseDate = newGuest.responseDate ? (typeof newGuest.responseDate === 'string' ? newGuest.responseDate : new Date(newGuest.responseDate).toISOString()) : null;
          // CRITICAL: If newResponseDate exists and is recent (within last 5 minutes), consider it as a valid update
          // This ensures updates from guest_link are always detected, even if responseDate didn't "change"
          const newResponseDateTimestamp = newResponseDate ? new Date(newResponseDate).getTime() : 0;
          const isRecentResponseDate = newResponseDateTimestamp > Date.now() - (5 * 60 * 1000); // Within last 5 minutes
          const hasResponseDate = newResponseDate && (!oldResponseDate || newResponseDate !== oldResponseDate || isRecentResponseDate);
          
          // Also check if guest has a valid status (even if not changed) but has a new responseDate
          // This handles cases where guest updates to the same status but at a different time
          const hasStatusWithNewResponse = existingGuest && newGuest.rsvpStatus && 
                                           (newGuest.rsvpStatus === 'confirmed' || newGuest.rsvpStatus === 'declined' || newGuest.rsvpStatus === 'maybe') &&
                                           hasResponseDate;
          
          // DEBUG: Log all conditions for this guest
          console.log(`🔍 ========== CHECKING GUEST FOR PENDING UPDATES ==========`);
          console.log(`🔍 Guest: ${newGuest.firstName} ${newGuest.lastName} (${newGuest.id})`);
          console.log(`🔍 Phone: ${newGuest.phoneNumber ? newGuest.phoneNumber : 'MISSING ⚠️'}`);
          console.log(`🔍 Existing guest: ${existingGuest ? 'found' : 'not found'}`);
          console.log(`🔍 Status changed: ${statusChanged} (${existingGuest?.rsvpStatus} → ${newGuest.rsvpStatus})`);
          console.log(`🔍 Guest count changed: ${guestCountChanged} (${existingGuest?.guestCount} → ${newGuest.guestCount})`);
          console.log(`🔍 Actual attendance changed: ${actualAttendanceChanged} (${existingGuest?.actualAttendance} → ${newGuest.actualAttendance})`);
          console.log(`🔍 Has valid status: ${hasValidStatus}`);
          console.log(`🔍 Has valid guest count: ${hasValidGuestCount}`);
          console.log(`🔍 Has valid actual attendance: ${hasValidActualAttendance}`);
          console.log(`🔍 Has response date: ${hasResponseDate} (old: ${oldResponseDate}, new: ${newResponseDate})`);
          console.log(`🔍 Has status with new response: ${hasStatusWithNewResponse}`);
          console.log(`🔍 ========================================================`);
          
          // CRITICAL: Check if guest has a valid status (confirmed/declined/maybe) even if it didn't change
          // This ensures updates from guest response link are always synced, even if status is the same
          const hasValidRsvpStatus = newGuest.rsvpStatus && 
                                    (newGuest.rsvpStatus === 'confirmed' || 
                                     newGuest.rsvpStatus === 'declined' || 
                                     newGuest.rsvpStatus === 'maybe');
          
          // CRITICAL: Also add if guestCount or actualAttendance changed, even if status didn't change
          // This ensures all updates are synced across devices
          const hasGuestCountOrAttendanceChange = guestCountChanged || actualAttendanceChanged;
          
          // CRITICAL: Always add to pendingUpdates if:
          // 1. Any field changed (status, guestCount, actualAttendance)
          // 2. Has valid status with new responseDate (even if status didn't change)
          // 3. Has guestCount or actualAttendance change
          // 4. CRITICAL: If guest has a valid rsvpStatus (confirmed/declined/maybe) and phone number, ALWAYS add
          //    This ensures ALL updates from guest_link are synced, even if nothing "changed" according to the logic
          //    The presence of a valid status with phone number indicates a guest response that must be synced
          // 5. CRITICAL: If responseDate is recent (within last 5 minutes), always add - this indicates a fresh update from guest_link
          const shouldAlwaysAdd = newGuest.phoneNumber && 
                                 newGuest.rsvpStatus && 
                                 (newGuest.rsvpStatus === 'confirmed' || newGuest.rsvpStatus === 'declined' || newGuest.rsvpStatus === 'maybe');
          
          // CRITICAL: If guest has valid status and phone number, ALWAYS add to pendingUpdates
          // OR if responseDate is recent (indicates fresh update from guest_link)
          // This ensures updates from guest_link are always synced across devices
          // CRITICAL: Always add if shouldAlwaysAdd is true (has valid status + phone) OR isRecentResponseDate is true
          const shouldAddToPending = (statusChanged || guestCountChanged || actualAttendanceChanged || hasValidStatus || hasValidGuestCount || hasValidActualAttendance || hasResponseDate || hasStatusWithNewResponse || shouldAlwaysAdd || isRecentResponseDate) && newGuest.phoneNumber;
          
          if (shouldAddToPending) {
            // Format phone number (same logic as updateGuestStatusByPhone)
            const originalPhone = newGuest.phoneNumber.replace(/[^0-9]/g, '');
            const formattedPhone = originalPhone.replace(/^972/, '0');
            
            // Create update data similar to WhatsApp webhook updates
            // Include 'maybe' status as well (not just 'confirmed' and 'declined')
            // Also include actualAttendance if it changed
            const updateData = {
              phoneNumber: formattedPhone,
              originalPhoneNumber: originalPhone,
              guestId: newGuest.id, // CRITICAL: Include guestId to ensure correct guest is updated
              eventId: event.id, // CRITICAL: Include eventId to ensure correct event is used
              status: newGuest.rsvpStatus === 'confirmed' ? 'confirmed' : 
                     newGuest.rsvpStatus === 'declined' ? 'declined' :
                     newGuest.rsvpStatus === 'maybe' ? 'maybe' : undefined,
              guestCount: (guestCountChanged || (newGuest.guestCount !== undefined && newGuest.guestCount > 0)) ? newGuest.guestCount : undefined,
              actualAttendance: (actualAttendanceChanged || (hasValidActualAttendance && newGuest.actualAttendance && newGuest.actualAttendance !== 'not_marked')) ? newGuest.actualAttendance : undefined,
              responseDate: newGuest.responseDate || new Date().toISOString(),
              timestamp: Date.now(),
              source: 'guest_link' // Mark as coming from guest response link
            };
            
            // CRITICAL: Remove ALL existing updates for this guest (by guestId if available, otherwise by phone number) to prevent conflicts
            // Keep only the latest update - delete all previous updates for this guest
            const updatesToRemove = [];
            for (let i = pendingUpdates.length - 1; i >= 0; i--) {
              const existingUpdate = pendingUpdates[i];
              // CRITICAL: Match by guestId first (most precise), then by phone number
              const isSameGuest = (newGuest.id && existingUpdate.guestId && existingUpdate.guestId === newGuest.id) ||
                                  (newGuest.id && existingUpdate.guestId && existingUpdate.guestId === newGuest.id && existingUpdate.eventId === event.id);
              const isSamePhone = (existingUpdate.phoneNumber === formattedPhone || existingUpdate.originalPhoneNumber === originalPhone) ||
                                  (existingUpdate.phoneNumber === originalPhone || existingUpdate.originalPhoneNumber === formattedPhone);
              // Remove if same guest (by ID) OR same phone number (fallback)
              if (isSameGuest || isSamePhone) {
                updatesToRemove.push(i);
              }
            }
            
            // Remove all previous updates for this phone number
            if (updatesToRemove.length > 0) {
              for (const index of updatesToRemove) {
                pendingUpdates.splice(index, 1);
              }
              console.log(`🗑️ Removed ${updatesToRemove.length} previous update(s) for guest ${newGuest.id || formattedPhone} to prevent conflicts`);
            }
            
            // Add the new update (always add, since we removed all previous ones)
              pendingUpdates.push(updateData);
            console.log(`✅ Added new guest link update to pendingUpdates (replaced ${updatesToRemove.length} previous update(s)):`, {
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
              
              // Guest link updates are processed normally
              console.log(`ℹ️ Guest update from guest link (source: ${updateData.source})`);
              console.log(`   Guest name: ${newGuest.firstName} ${newGuest.lastName}`);
              console.log(`   Guest ID: ${newGuest.id}`);
              console.log(`   Status: ${updateData.status}`);
              console.log(`   Phone: ${formattedPhone}`);
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
            } else if (newGuest.rsvpStatus && (newGuest.rsvpStatus === 'confirmed' || newGuest.rsvpStatus === 'declined' || newGuest.rsvpStatus === 'maybe')) {
              // CRITICAL: If guest has valid status and phone number but wasn't added, this is a bug
              // Force add it to ensure sync - this should not happen but is a safety net
              console.warn(`⚠️ WARNING: Guest has valid status (${newGuest.rsvpStatus}) and phone number but wasn't added to pendingUpdates. Forcing add...`);
              
              const originalPhone = newGuest.phoneNumber.replace(/[^0-9]/g, '');
              const formattedPhone = originalPhone.replace(/^972/, '0');
              
              const updateData = {
                phoneNumber: formattedPhone,
                originalPhoneNumber: originalPhone,
                guestId: newGuest.id,
                eventId: event.id,
                status: newGuest.rsvpStatus === 'confirmed' ? 'confirmed' : 
                       newGuest.rsvpStatus === 'declined' ? 'declined' :
                       newGuest.rsvpStatus === 'maybe' ? 'maybe' : undefined,
                guestCount: newGuest.guestCount !== undefined && newGuest.guestCount > 0 ? newGuest.guestCount : undefined,
                actualAttendance: newGuest.actualAttendance && newGuest.actualAttendance !== 'not_marked' ? newGuest.actualAttendance : undefined,
                responseDate: newGuest.responseDate || new Date().toISOString(),
                timestamp: Date.now(),
                source: 'guest_link'
              };
              
              // Remove old updates for this guest
              const updatesToRemove = [];
              for (let i = pendingUpdates.length - 1; i >= 0; i--) {
                const existingUpdate = pendingUpdates[i];
                const isSameGuest = (newGuest.id && existingUpdate.guestId && existingUpdate.guestId === newGuest.id) ||
                                    (newGuest.id && existingUpdate.guestId && existingUpdate.guestId === newGuest.id && existingUpdate.eventId === event.id);
                const isSamePhone = (existingUpdate.phoneNumber === formattedPhone || existingUpdate.originalPhoneNumber === originalPhone) ||
                                    (existingUpdate.phoneNumber === originalPhone || existingUpdate.originalPhoneNumber === formattedPhone);
                if (isSameGuest || isSamePhone) {
                  updatesToRemove.push(i);
                }
              }
              
              if (updatesToRemove.length > 0) {
                for (const index of updatesToRemove) {
                  pendingUpdates.splice(index, 1);
                }
              }
              
              pendingUpdates.push(updateData);
              console.log(`✅ FORCED ADD: Added guest update to pendingUpdates (was skipped but has valid status):`, updateData);
            }
          }
        }
      }
      
      // Update existing event - CRITICAL: Merge guests properly to preserve all fields
      // Merge guests array: update existing guests, add new ones, keep all others
      let mergedGuests = [...(existingEvent.guests || [])];
      
      if (event.guests && event.guests.length > 0) {
        // For each incoming guest, update existing or add new
        for (const incomingGuest of event.guests) {
          const existingGuestIndex = mergedGuests.findIndex(g => g.id === incomingGuest.id);
          
          if (existingGuestIndex >= 0) {
            // Update existing guest - merge all fields, but prioritize incoming data for updated fields
            const existingGuest = mergedGuests[existingGuestIndex];
            mergedGuests[existingGuestIndex] = {
              ...existingGuest,
              ...incomingGuest,
              // CRITICAL: Preserve important fields that might not be in incoming guest
              id: existingGuest.id, // Always keep original ID
              phoneNumber: incomingGuest.phoneNumber || existingGuest.phoneNumber, // Keep phone if provided
              // Update fields that are explicitly provided in incoming guest
              rsvpStatus: incomingGuest.rsvpStatus !== undefined ? incomingGuest.rsvpStatus : existingGuest.rsvpStatus,
              guestCount: incomingGuest.guestCount !== undefined ? incomingGuest.guestCount : existingGuest.guestCount,
              notes: incomingGuest.notes !== undefined ? incomingGuest.notes : (existingGuest.notes || ''), // CRITICAL: Preserve notes from guest link updates
              actualAttendance: incomingGuest.actualAttendance !== undefined ? incomingGuest.actualAttendance : existingGuest.actualAttendance,
              responseDate: incomingGuest.responseDate ? new Date(incomingGuest.responseDate) : existingGuest.responseDate,
              // Use newer responseDate if provided
              ...(incomingGuest.responseDate && (!existingGuest.responseDate || new Date(incomingGuest.responseDate) > new Date(existingGuest.responseDate)) 
                ? { responseDate: new Date(incomingGuest.responseDate) } 
                : {})
            };
            console.log(`🔄 Updated existing guest ${incomingGuest.id} (${incomingGuest.firstName} ${incomingGuest.lastName})`);
          } else {
            // Add new guest
            mergedGuests.push(incomingGuest);
            console.log(`➕ Added new guest ${incomingGuest.id} (${incomingGuest.firstName} ${incomingGuest.lastName})`);
          }
        }
      }
      
      const mergedEvent = {
        ...existingEvent,
        ...event,
        // CRITICAL: Use merged guests array that preserves all guests
        guests: mergedGuests,
        updatedAt: new Date().toISOString()
      };
      
      eventsData.events[existingIndex] = mergedEvent;
      console.log(`✅ Updated event ${event.id} with ${mergedEvent.guests?.length || 0} guests (merged from ${existingEvent.guests?.length || 0} existing + ${event.guests?.length || 0} incoming)`);
      
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

// Restore a deleted event
app.post('/api/events/:eventId/restore', async (req, res) => {
  try {
    const { eventId } = req.params;
    
    // Find event in deletedEvents
    const deletedIndex = eventsData.deletedEvents.findIndex(e => e.id === eventId);
    
    if (deletedIndex === -1) {
      return res.status(404).json({ 
        success: false,
        error: 'Event not found in deleted events' 
      });
    }
    
    const deletedEvent = eventsData.deletedEvents[deletedIndex];
    
    // Check if event already exists in active events
    const existingIndex = eventsData.events.findIndex(e => e.id === eventId);
    if (existingIndex >= 0) {
      return res.status(400).json({ 
        success: false,
        error: 'Event already exists in active events' 
      });
    }
    
    // Remove deletedAt field and restore to events
    const { deletedAt, ...eventToRestore } = deletedEvent;
    eventsData.events.push({
      ...eventToRestore,
      updatedAt: new Date().toISOString()
    });
    
    // Remove from deletedEvents
    eventsData.deletedEvents.splice(deletedIndex, 1);
    
    // Save to file
    saveEvents();
    
    console.log(`✅ Restored event ${eventId} (${deletedEvent.coupleName || 'unnamed'})`);
    
    res.json({
      success: true,
      message: 'Event restored successfully',
      event: eventToRestore
    });
  } catch (error) {
    console.error('❌ Error restoring event:', error);
    res.status(500).json({ 
      success: false,
      error: 'שגיאה בשחזור אירוע' 
    });
  }
});

// Get deleted events for a user
app.get('/api/events/:userId/deleted', async (req, res) => {
  try {
    const { userId } = req.params;
    
    const deletedUserEvents = eventsData.deletedEvents.filter(e => e.userId === userId);
    
    console.log(`📋 Found ${deletedUserEvents.length} deleted events for user ${userId}`);
    
    res.json({
      success: true,
      deletedEvents: deletedUserEvents
    });
  } catch (error) {
    console.error('❌ Error fetching deleted events:', error);
    res.status(500).json({ error: 'שגיאה בקבלת אירועים שנמחקו' });
  }
});

// Global error handler - MUST be before app.listen
// This catches any unhandled errors and returns JSON instead of HTML
app.use((err, req, res, next) => {
  // Don't send response if headers already sent
  if (res.headersSent) {
    return next(err);
  }
  
  console.error('❌ Unhandled error:', err);
  console.error('❌ Error stack:', err.stack);
  
  // Set CORS headers even on errors
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin');
  
  // Return JSON error response
  const statusCode = err.status || err.statusCode || 500;
  res.status(statusCode).json({
    success: false,
    error: err.message || 'Internal server error',
    details: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
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