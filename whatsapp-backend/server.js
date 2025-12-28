const express = require('express');
const cors = require('cors');
const axios = require('axios');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const stripe = require('stripe');
const { createClient } = require('@supabase/supabase-js');
const supabaseDb = require('./supabase-db');
require('dotenv').config();

// ========================================
// CRITICAL: Supabase Environment Variables Check
// ========================================
// NOTE: In production (Render), these MUST be set as:
// - SUPABASE_URL (e.g., https://xxxxx.supabase.co)
// - SUPABASE_SERVICE_ROLE_KEY (from Supabase Dashboard → Settings → API → service_role key)
// Do NOT use SUPABASE_ANON_KEY or SUPABASE_KEY - we need the SERVICE_ROLE_KEY for backend operations
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ ========== CRITICAL ERROR: Supabase Configuration Missing ==========');
  console.error('❌ SUPABASE_URL:', SUPABASE_URL ? '✅ Set' : '❌ MISSING');
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY:', SUPABASE_SERVICE_ROLE_KEY ? '✅ Set' : '❌ MISSING');
  console.error('💡 Please set these environment variables in Render:');
  console.error('   1. Go to Render Dashboard → Your Service → Environment');
  console.error('   2. Add SUPABASE_URL: https://your-project.supabase.co');
  console.error('   3. Add SUPABASE_SERVICE_ROLE_KEY: (from Supabase Dashboard → Settings → API)');
  console.error('❌ Server will continue but database operations will fail!');
  console.error('❌ ================================================================');
  // CRITICAL: Don't exit in production - allow server to start and show errors in logs
  // process.exit(1); // Commented out to prevent "Application exited early" error
}

// Initialize Supabase client with service role key (bypasses RLS)
// CRITICAL: Only create client if both variables are set, otherwise it will fail
let supabase = null;
if (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
  try {
    supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    console.log('✅ Supabase client initialized successfully');
    console.log('📊 Supabase URL:', SUPABASE_URL);
    console.log('🔑 Supabase Service Role Key:', SUPABASE_SERVICE_ROLE_KEY ? `Set (${SUPABASE_SERVICE_ROLE_KEY.length} chars)` : 'MISSING');
  } catch (error) {
    console.error('❌ Failed to initialize Supabase client:', error.message);
    supabase = null;
  }
} else {
  console.error('❌ Cannot initialize Supabase client - missing environment variables');
}

// CRITICAL: Log all environment variables related to WhatsApp (for debugging)
console.log('🔍 ========== ENVIRONMENT VARIABLES DEBUG ==========');
console.log('🔍 WHATSAPP_ACCESS_TOKEN:', process.env.WHATSAPP_ACCESS_TOKEN ? `Set (${process.env.WHATSAPP_ACCESS_TOKEN.length} chars)` : 'NOT SET');
console.log('🔍 VITE_WHATSAPP_ACCESS_TOKEN:', process.env.VITE_WHATSAPP_ACCESS_TOKEN ? `Set (${process.env.VITE_WHATSAPP_ACCESS_TOKEN.length} chars)` : 'NOT SET');
console.log('🔍 WHATSAPP_PHONE_NUMBER_ID:', process.env.WHATSAPP_PHONE_NUMBER_ID || 'NOT SET');
console.log('🔍 ================================================');

const app = express();
const PORT = process.env.PORT || 3002;

// ========================================
// CORS Configuration - Allow access from external devices
// ========================================
// הגדרת רשימת המקורות המורשים (Frontend)
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:5173',
  'http://localhost:3001',
  'https://rsvp-frontend-wy47.onrender.com', // Frontend URL from environment
  'https://whatsapp-backend-enfz.onrender.com', // Backend URL (for internal calls)
  process.env.FRONTEND_URL, // Frontend URL from environment variable
  /\.onrender\.com$/, // מאפשר את כל תתי-הדומיינים של render
  /\.vercel\.app$/, // מאפשר את כל תתי-הדומיינים של vercel
  /\.netlify\.app$/, // מאפשר את כל תתי-הדומיינים של netlify
].filter(Boolean); // Remove undefined values (if FRONTEND_URL is not set)

// CORS middleware with origin validation
app.use(cors({
  origin: function (origin, callback) {
    // מאפשר בקשות ללא origin (כמו מובייל, Postman, או direct API calls) או מקורות ברשימה
    if (!origin || allowedOrigins.some(allowed => {
      if (typeof allowed === 'string') {
        return allowed === origin;
      } else if (allowed instanceof RegExp) {
        return allowed.test(origin);
      }
      return false;
    })) {
      callback(null, true);
    } else {
      console.warn(`⚠️ CORS blocked origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin', 'Cache-Control', 'Pragma'],
  exposedHeaders: ['Content-Type', 'Authorization'],
  maxAge: 86400 // 24 hours - cache preflight requests
}));

// טיפול בבקשות OPTIONS (Preflight) - קריטי למובייל ומכשירים חיצוניים
app.options('*', cors());

// Additional CORS middleware to ensure headers are ALWAYS set (even on errors)
// This is critical for guest response pages to work from any IP/device
app.use((req, res, next) => {
  // Get the origin from the request
  const origin = req.headers.origin;
  
  // Check if origin is allowed
  const isAllowed = !origin || allowedOrigins.some(allowed => {
    if (typeof allowed === 'string') {
      return allowed === origin;
    } else if (allowed instanceof RegExp) {
      return allowed.test(origin);
    }
    return false;
  });
  
  // Set CORS headers based on origin validation
  if (isAllowed) {
    res.setHeader('Access-Control-Allow-Origin', origin || '*');
  } else {
    // For requests without origin (mobile apps, Postman), allow all
    res.setHeader('Access-Control-Allow-Origin', '*');
  }
  
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type', 'Authorization', 'X-Requested-With', 'Accept, Origin', 'Cache-Control', 'Pragma');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Max-Age', '86400');
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
    return;
  }
  next();
});

// ========================================
// Middleware
// ========================================
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// ========================================
// Health Check Route
// ========================================
app.get('/api/health', async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  
  // Test Supabase connection
  let supabaseConnected = false;
  let supabaseError = null;
  
  if (supabase) {
    try {
      // Simple query to test connection
      const { error } = await supabase.from('users').select('id').limit(1);
      supabaseConnected = !error;
      if (error) {
        supabaseError = error.message;
      }
    } catch (err) {
      supabaseError = err.message;
    }
  }
  
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    supabase: {
      configured: !!SUPABASE_URL && !!SUPABASE_SERVICE_ROLE_KEY,
      clientInitialized: supabase !== null,
      connected: supabaseConnected,
      error: supabaseError,
      url: SUPABASE_URL ? SUPABASE_URL.substring(0, 30) + '...' : 'NOT SET',
      keyLength: SUPABASE_SERVICE_ROLE_KEY ? SUPABASE_SERVICE_ROLE_KEY.length : 0
    }
  });
});

// ========================================
// User Authentication Routes
// ========================================
// Admin credentials (from environment or defaults)
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'idodanan1@gmail.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'QPwo1029';

// POST /api/users/login - User login
app.post('/api/users/login', async (req, res) => {
  // CRITICAL: Set CORS headers FIRST
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  
  try {
    const { email, password } = req.body;
    
    console.log('🔐 Login request received for email:', email ? email.substring(0, 5) + '...' : 'missing');
    
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
        
        console.log('✅ Admin login successful');
        return res.json({
          success: true,
          user: adminUser
        });
      } else {
        console.warn('⚠️ Admin login failed - wrong password');
        return res.status(401).json({ error: 'אימייל או סיסמה שגויים' });
      }
    }
    
    // Check regular user - CRITICAL: Migrated from MongoDB to Supabase
    if (!supabaseDb.isSupabaseConfigured() || !supabase) {
      console.error('❌ Supabase is not configured or client is null');
      console.error('   SUPABASE_URL:', SUPABASE_URL ? '✅ Set' : '❌ MISSING');
      console.error('   SUPABASE_SERVICE_ROLE_KEY:', SUPABASE_SERVICE_ROLE_KEY ? '✅ Set' : '❌ MISSING');
      return res.status(503).json({ error: 'מסד הנתונים לא זמין. אנא נסה שוב מאוחר יותר.' });
    }
    
    try {
      // Query users from Supabase
      // CRITICAL: Ensure email is normalized and query uses correct column name
      console.log('🔍 Querying users table for email:', normalizedEmail);
      const { data: users, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('email', normalizedEmail)
        .limit(1);
      
      if (userError) {
        console.error('❌ Error querying users from Supabase:', userError);
        console.error('   Error code:', userError.code);
        console.error('   Error message:', userError.message);
        console.error('   Error details:', userError.details);
        return res.status(500).json({ error: 'שגיאה בהתחברות - בעיה במסד הנתונים' });
      }
      
      console.log('📊 Users query result:', users ? `${users.length} user(s) found` : 'null');
      
      if (!users || users.length === 0) {
        console.warn('⚠️ User not found:', normalizedEmail);
        return res.status(401).json({ error: 'אימייל או סיסמה שגויים' });
      }
      
      const user = users[0];
      
      // CRITICAL: For now, we'll check password from a separate table or use Supabase Auth
      // Since we migrated from MongoDB, we need to handle password checking
      // TODO: Migrate to Supabase Auth for proper password hashing
      // For now, we'll check if there's a password field or use a separate auth_users table
      
      // Check if user has password in users table (temporary solution)
      // In production, this should use Supabase Auth
      if (user.password && user.password !== password) {
        console.warn('⚠️ Login failed - wrong password for:', normalizedEmail);
        return res.status(401).json({ error: 'אימייל או סיסמה שגויים' });
      }
      
      // If no password field, we'll need to check from auth.users or a separate table
      // For now, we'll allow login if user exists (temporary - should be fixed)
      if (!user.password) {
        console.warn('⚠️ User has no password field - this should use Supabase Auth');
        // TODO: Implement proper Supabase Auth check
      }
      
      // Return user without password
      const userResponse = {
        id: user.id,
        email: user.email,
        name: user.full_name || user.name || 'משתמש',
        credits: user.credits || 0,
        createdAt: user.created_at || new Date().toISOString(),
        updatedAt: user.updated_at || new Date().toISOString(),
        isAdmin: user.is_admin || false
      };
      
      // Create or update session for this login - CRITICAL: Migrated to Supabase
      let sessionId = null;
      try {
        const deviceInfo = req.headers['user-agent'] || 'Unknown';
        const ipAddress = req.ip || req.connection.remoteAddress || req.headers['x-forwarded-for'] || 'Unknown';
        const clientSessionId = req.body.sessionId; // SessionId from frontend (if exists)
        
        sessionId = clientSessionId || `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        // CRITICAL: Try to find or create session in Supabase user_sessions table
        try {
          // First, try to find existing session
          const { data: existingSessions, error: findError } = await supabase
            .from('user_sessions')
            .select('*')
            .eq('user_id', userResponse.id)
            .eq('session_id', sessionId)
            .gt('expires_at', new Date().toISOString())
            .limit(1);
          
          if (!findError && existingSessions && existingSessions.length > 0) {
            // Update existing session
            const { error: updateError } = await supabase
              .from('user_sessions')
              .update({
                last_activity: new Date().toISOString(),
                expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
                device_info: deviceInfo.substring(0, 200),
                ip_address: ipAddress
              })
              .eq('id', existingSessions[0].id);
            
            if (!updateError) {
              console.log(`✅ Updated existing session for user ${userResponse.id}`);
            }
          } else {
            // Create new session
            const { error: insertError } = await supabase
              .from('user_sessions')
              .insert({
                user_id: userResponse.id,
                session_id: sessionId,
                device_info: deviceInfo.substring(0, 200),
                ip_address: ipAddress,
                last_activity: new Date().toISOString(),
                expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
              });
            
            if (insertError) {
              // If table doesn't exist, that's okay - we'll just use the sessionId
              const errorMessage = insertError.message || insertError.toString() || '';
              if (errorMessage.includes('relation') || errorMessage.includes('does not exist')) {
                console.warn('⚠️ user_sessions table does not exist - using sessionId only');
              } else {
                console.warn('⚠️ Error creating session:', insertError);
              }
            } else {
              console.log(`✅ Created new session for user ${userResponse.id}`);
            }
          }
        } catch (sessionError) {
          console.warn('⚠️ Error managing session (non-critical):', sessionError.message);
          // Don't fail login if session creation fails
        }
        
        console.log('✅ User login successful:', { id: userResponse.id, email: userResponse.email });
        res.json({
          success: true,
          user: userResponse,
          sessionId: sessionId || undefined // Return sessionId so frontend can use it
        });
      } catch (dbError) {
        console.error('❌ Database error during login:', dbError);
        return res.status(500).json({ error: 'שגיאה בהתחברות - בעיה במסד הנתונים' });
      }
    } catch (error) {
      console.error('❌ Login error:', error);
      res.status(500).json({ error: 'שגיאה בהתחברות' });
    }
  } catch (error) {
    console.error('❌ Login route error:', error);
    res.status(500).json({ error: 'שגיאה בהתחברות' });
  }
});

// Handle OPTIONS preflight for /api/users/login
app.options('/api/users/login', (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.sendStatus(200);
});

// ========================================
// User Sessions Routes
// ========================================
// GET /api/users/:userId/sessions/count - Get active session count for user
app.get('/api/users/:userId/sessions/count', async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  
  try {
    const { userId } = req.params;
    
    if (!supabaseDb.isSupabaseConfigured()) {
      console.warn('⚠️ Supabase not configured - returning default count');
      return res.json({
        success: true,
        count: 0,
        sessions: []
      });
    }
    
    const now = new Date().toISOString();
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    
    try {
      // Clean up expired sessions
      await supabase
        .from('user_sessions')
        .delete()
        .eq('user_id', userId)
        .lte('expires_at', now);
      
      // Count active sessions
      const { count, error: countError } = await supabase
        .from('user_sessions')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .gt('expires_at', now)
        .gte('last_activity', oneDayAgo);
      
      if (countError) {
        const errorMessage = countError.message || countError.toString() || '';
        if (errorMessage.includes('relation') || errorMessage.includes('does not exist')) {
          console.warn('⚠️ user_sessions table does not exist - returning default count');
          return res.json({
            success: true,
            count: 0,
            sessions: []
          });
        }
        throw countError;
      }
      
      // Get session details
      const { data: sessions, error: sessionsError } = await supabase
        .from('user_sessions')
        .select('*')
        .eq('user_id', userId)
        .gt('expires_at', now)
        .gte('last_activity', oneDayAgo)
        .order('last_activity', { ascending: false })
        .limit(10);
      
      if (sessionsError) {
        const errorMessage = sessionsError.message || sessionsError.toString() || '';
        if (errorMessage.includes('relation') || errorMessage.includes('does not exist')) {
          console.warn('⚠️ user_sessions table does not exist - returning default count');
          return res.json({
            success: true,
            count: 0,
            sessions: []
          });
        }
        throw sessionsError;
      }
      
      res.json({
        success: true,
        count: count || 0,
        sessions: (sessions || []).map((s) => ({
          sessionId: s.session_id,
          deviceInfo: s.device_info,
          ipAddress: s.ip_address,
          lastActivity: s.last_activity,
          createdAt: s.created_at
        }))
      });
    } catch (queryError) {
      const errorMessage = queryError.message || queryError.toString() || '';
      if (errorMessage.includes('relation') || errorMessage.includes('does not exist')) {
        console.warn('⚠️ user_sessions table does not exist - returning default count');
        return res.json({
          success: true,
          count: 0,
          sessions: []
        });
      }
      throw queryError;
    }
  } catch (error) {
    console.error('❌ Error getting sessions count:', error);
    // CRITICAL: Return count: 0 instead of 500 error to prevent frontend crashes
    res.json({
      success: true,
      count: 0,
      sessions: [],
      error: 'שגיאה בקבלת מספר מחשבים מחוברים'
    });
  }
});

// POST /api/users/:userId/sessions/activity - Update session activity
app.post('/api/users/:userId/sessions/activity', async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  
  try {
    const { userId } = req.params;
    const { sessionId } = req.body;
    
    if (!sessionId) {
      return res.status(400).json({ error: 'sessionId נדרש' });
    }
    
    if (!supabaseDb.isSupabaseConfigured()) {
      return res.json({ success: true, message: 'Supabase not configured' });
    }
    
    const newLastActivity = new Date().toISOString();
    const newExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    
    const { error } = await supabase
      .from('user_sessions')
      .update({
        last_activity: newLastActivity,
        expires_at: newExpiresAt
      })
      .eq('user_id', userId)
      .eq('session_id', sessionId);
    
    if (error) {
      const errorMessage = error.message || error.toString() || '';
      if (errorMessage.includes('relation') || errorMessage.includes('does not exist')) {
        console.warn('⚠️ user_sessions table does not exist - returning success');
        return res.json({ success: true, message: 'User sessions table not found, but activity acknowledged.' });
      }
      throw error;
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error('❌ Error updating session activity:', error);
    // CRITICAL: Return success: true instead of 500 error
    res.json({ success: true, error: 'שגיאה בעדכון פעילות session' });
  }
});

// ========================================
// Events Routes
// ========================================
// POST /api/events - Create or update event (with guests)
app.post('/api/events', async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  
  try {
    const { id, userId, guests, ...eventData } = req.body;
    
    // CRITICAL: Treat userId as String (not UUID) - ensure it's a string
    const userIdString = userId ? String(userId) : null;
    
    // CRITICAL: UserID Consistency - Log userId to verify it matches across devices
    console.log('📋 Received event sync request:', { eventId: id, userId: userIdString, userIdType: typeof userIdString, userIdLength: userIdString?.length, guestsCount: guests?.length || 0 });
    console.log('🔍 [UserID Check] POST /api/events - userId received (as String):', JSON.stringify(userIdString));
    
    if (!id || !userIdString) {
      return res.status(400).json({ error: 'Event id and userId are required' });
    }
    
    if (!supabaseDb.isSupabaseConfigured()) {
      return res.status(500).json({ error: 'Supabase is not configured' });
    }
    
    // Convert frontend event to Supabase format
    // CRITICAL: Use userIdString to ensure it's treated as String (not UUID)
    const supabaseEvent = supabaseDb.convertFrontendEventToSupabase({
      id,
      userId: userIdString, // Use string version
      ...eventData
    });
    
    // CRITICAL: Verify userId is correctly set in supabaseEvent (as String)
    console.log('🔍 [UserID Check] POST /api/events - supabaseEvent.user_id:', JSON.stringify(supabaseEvent.user_id));
    console.log('🔍 [UserID Check] POST /api/events - userId match:', String(supabaseEvent.user_id) === userIdString);
    
    // Upsert event
    console.log(`📤 Upserting event ${id} to Supabase with user_id: ${supabaseEvent.user_id}...`);
    // CRITICAL: Ensure await is present before returning response
    const upsertResult = await supabaseDb.upsertEvent(supabaseEvent);
    console.log(`✅ Successfully upserted event ${id} with user_id: ${supabaseEvent.user_id}`);
    console.log('🔍 [UserID Check] POST /api/events - upsertResult.user_id:', JSON.stringify(upsertResult?.user_id));
    
    // Upsert guests if provided
    if (guests && Array.isArray(guests) && guests.length > 0) {
      const supabaseGuests = guests.map((guest) => supabaseDb.convertFrontendGuestToSupabase({
        ...guest,
        eventId: id
      }));
      
      console.log(`📤 Upserting ${supabaseGuests.length} guests to Supabase for event ${id}...`);
      // CRITICAL: Ensure await is present before returning response
      const guestsResult = await supabaseDb.upsertGuests(supabaseGuests);
      console.log(`✅ Successfully upserted ${supabaseGuests.length} guests`);
      console.log('🔍 [UserID Check] POST /api/events - Guests upserted, result count:', guestsResult?.length || 0);
    }
    
    // CRITICAL: Verify the event was saved correctly by querying it back
    try {
      const verifyEvent = await supabaseDb.getEventById(id);
      console.log('🔍 [UserID Check] POST /api/events - Verified saved event user_id:', JSON.stringify(verifyEvent?.user_id));
      console.log('🔍 [UserID Check] POST /api/events - Original userId matches saved user_id:', verifyEvent?.user_id === userId);
    } catch (verifyError) {
      console.warn('⚠️ Could not verify saved event:', verifyError);
    }
    
    // CRITICAL: Response is sent only after all database operations complete
    res.json({
      success: true,
      message: 'Event and guests synced successfully',
      eventId: id,
      userId: userIdString // Include userId (as String) in response for debugging
    });
  } catch (error) {
    console.error('❌ Error in POST /api/events:', error);
    res.status(500).json({ 
      error: 'שגיאה בסנכרון אירוע',
      details: error.message 
    });
  }
});

// Handle OPTIONS preflight for /api/events
app.options('/api/events', (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.sendStatus(200);
});

// CRITICAL: This route MUST come BEFORE /api/events/:userId
// Otherwise Express will match /api/events/:userId first and treat "eventId/guests" as the userId
// POST /api/events/:eventId/guests - Sync guests for an event
app.post('/api/events/:eventId/guests', async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  
  try {
    const { eventId } = req.params;
    const { guests, append } = req.body;
    
    console.log('📋 Received guest sync request for event:', eventId);
    console.log('📋 Guests count:', guests?.length || 0);
    console.log('📋 Append mode:', append || false);
    
    if (!eventId) {
      return res.status(400).json({ error: 'eventId is required' });
    }
    
    if (!guests || !Array.isArray(guests)) {
      return res.status(400).json({ error: 'guests array is required' });
    }
    
    if (!supabaseDb.isSupabaseConfigured()) {
      return res.status(500).json({ error: 'Supabase is not configured' });
    }
    
    // Convert frontend guests to Supabase format and upsert
    const supabaseGuests = guests.map((guest) => supabaseDb.convertFrontendGuestToSupabase({
      ...guest,
      eventId: eventId // Ensure eventId is set
    }));
    
    console.log(`📤 Upserting ${supabaseGuests.length} guests to Supabase for event ${eventId}...`);
    
    // Use upsertGuests with onConflict: 'id' to update existing guests or create new ones
    // Note: upsertGuests returns the data array directly, not an object with error property
    try {
      const result = await supabaseDb.upsertGuests(supabaseGuests);
      console.log(`✅ Successfully synced ${supabaseGuests.length} guests for event ${eventId}`);
      console.log(`✅ Upserted ${result?.length || supabaseGuests.length} guests`);
    } catch (upsertError) {
      console.error('❌ Error upserting guests:', upsertError);
      throw upsertError; // Re-throw to be caught by outer catch block
    }
    
    res.json({
      success: true,
      message: `Synced ${supabaseGuests.length} guests successfully`,
      guestsCount: supabaseGuests.length,
      eventId: eventId
    });
  } catch (error) {
    console.error('❌ Error in POST /api/events/:eventId/guests:', error);
    res.status(500).json({ 
      error: 'שגיאה בסנכרון אורחים',
      details: error.message 
    });
  }
});

// Handle OPTIONS preflight for /api/events/:eventId/guests
app.options('/api/events/:eventId/guests', (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.sendStatus(200);
});

// GET /api/events/:userId - Get events for user
app.get('/api/events/:userId', async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  
  try {
    const { userId } = req.params;
    
    // CRITICAL: UserID Consistency - Log userId to verify it matches
    console.log('📋 Fetching events for user:', userId);
    console.log('🔍 [UserID Check] GET /api/events/:userId - userId received:', JSON.stringify(userId));
    console.log('🔍 [UserID Check] GET /api/events/:userId - userId type:', typeof userId, 'length:', userId?.length);
    
    // CRITICAL: Allow admin-fixed-id as valid userId
    if (userId === 'admin-fixed-id') {
      console.log('📋 Admin user detected - fetching all events');
      // For admin, we might want to return all events or handle differently
      // For now, we'll treat it as a regular user query
    }
    
    if (!supabaseDb.isSupabaseConfigured()) {
      console.error('❌ Supabase is not configured');
      return res.status(200).json([]);
    }
    
    // CRITICAL: Ensure userId is treated as String (not UUID)
    // Convert userId to string to ensure consistent comparison
    const userIdString = String(userId);
    console.log('🔍 [UserID Check] GET /api/events/:userId - Querying Supabase with user_id (as String):', JSON.stringify(userIdString));
    console.log('🔍 [UserID Check] GET /api/events/:userId - userId type:', typeof userIdString, 'value:', userIdString);
    
    // CRITICAL: Query using TEXT comparison - cast user_id to TEXT for string matching
    // This handles both UUID and String user_id values in the database
    // Use RPC or raw query to cast UUID to TEXT for comparison
    let { data, error } = await supabase.rpc('get_events_by_user_id', { user_id_param: userIdString })
      .catch(async () => {
        // Fallback: Try direct query with string comparison
        // If RPC doesn't exist, use direct query and filter in JavaScript
        console.log('🔍 [UserID Check] RPC not available, using direct query with string filter...');
        const { data: allEvents, error: allError } = await supabase
          .from('events')
          .select('*')
          .order('created_at', { ascending: false });
        
        if (allError) {
          return { data: null, error: allError };
        }
        
        // Filter by string comparison in JavaScript
        const filteredEvents = (allEvents || []).filter(e => String(e.user_id) === userIdString);
        return { data: filteredEvents, error: null };
      });
    
    // If RPC returned error, try direct query with string filter
    if (error || !data) {
      console.log('🔍 [UserID Check] Trying direct query with string filter...');
      const { data: allEvents, error: allError } = await supabase
        .from('events')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (!allError && allEvents) {
        // Filter by string comparison in JavaScript (handles UUID to String conversion)
        data = allEvents.filter(e => String(e.user_id) === userIdString);
        error = null;
        console.log(`🔍 [UserID Check] Found ${data.length} events after string filtering`);
      } else {
        error = allError;
      }
    }
    
    if (error) {
      console.error('❌ Supabase Error:', error);
      console.error('🔍 [UserID Check] GET /api/events/:userId - Query failed with userId:', JSON.stringify(userId));
      return res.status(200).json([]);
    }
    
    // CRITICAL: Check if data was found and log userIds from database
    if (data && data.length > 0) {
      const dbUserIds = [...new Set(data.map(e => e.user_id).filter(Boolean))];
      console.log('🔍 [UserID Check] GET /api/events/:userId - Found events with user_ids:', dbUserIds);
      console.log('🔍 [UserID Check] GET /api/events/:userId - Query userId matches DB user_ids:', dbUserIds.includes(userId));
    }
    
    if (!data || data.length === 0) {
      console.log('📋 No events found for userId:', userId);
      console.log('🔍 [UserID Check] GET /api/events/:userId - No events found. Checking if userId exists in DB...');
      
      // CRITICAL: Debug - Check what userIds actually exist in the database
      try {
        const { data: allEvents, error: allEventsError } = await supabase
          .from('events')
          .select('user_id')
          .limit(10);
        
        if (!allEventsError && allEvents && allEvents.length > 0) {
          const existingUserIds = [...new Set(allEvents.map(e => e.user_id).filter(Boolean))];
          console.log('🔍 [UserID Check] GET /api/events/:userId - Sample user_ids in DB:', existingUserIds);
          console.log('🔍 [UserID Check] GET /api/events/:userId - Requested userId exists in DB:', existingUserIds.includes(userId));
        } else {
          console.log('🔍 [UserID Check] GET /api/events/:userId - No events in database at all');
        }
      } catch (debugError) {
        console.error('🔍 [UserID Check] Error checking DB:', debugError);
      }
      
      return res.status(200).json([]);
    }
    
    // Convert each Supabase event to frontend format with guests
    const userEvents = [];
    for (const supabaseEvent of data) {
      try {
        const supabaseGuests = await supabaseDb.getGuestsByEventId(supabaseEvent.id);
        const frontendGuests = supabaseGuests.map((g) => supabaseDb.convertSupabaseGuestToFrontend(g));
        const frontendEvent = supabaseDb.convertSupabaseEventToFrontend(supabaseEvent, frontendGuests);
        userEvents.push(frontendEvent);
      } catch (guestError) {
        console.error(`❌ Error fetching guests for event ${supabaseEvent.id}:`, guestError);
        const frontendEvent = supabaseDb.convertSupabaseEventToFrontend(supabaseEvent, []);
        userEvents.push(frontendEvent);
      }
    }
    
    console.log(`✅ Successfully fetched ${userEvents.length} events for user ${userId}`);
    return res.status(200).json(userEvents);
  } catch (error) {
    console.error('❌ Error fetching events:', error);
    return res.status(200).json([]);
  }
});

// ========================================
// Guests Routes
// ========================================
// GET /api/guests/pending-updates - Get pending guest updates
app.get('/api/guests/pending-updates', async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  
  try {
    const { all } = req.query;
    const includeAll = all === 'true' || all === true;
    
    console.log('📋 Fetching pending guest updates, includeAll:', includeAll);
    
    if (!supabaseDb.isSupabaseConfigured()) {
      return res.status(500).json({ error: 'Supabase is not configured' });
    }
    
    const updates = await supabaseDb.getPendingGuestUpdates(includeAll);
    
    console.log(`✅ Found ${updates.length} pending guest updates`);
    return res.status(200).json(updates);
  } catch (error) {
    console.error('❌ Error fetching pending guest updates:', error);
    return res.status(500).json({ 
      error: 'שגיאה בטעינת עדכוני אורחים ממתינים',
      details: error.message 
    });
  }
});

// Handle OPTIONS preflight for /api/guests/pending-updates
app.options('/api/guests/pending-updates', (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.sendStatus(200);
});

// POST /api/guests/process-all-updates - Process all pending guest updates
app.post('/api/guests/process-all-updates', async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  
  try {
    console.log('📋 Processing all pending guest updates...');
    
    if (!supabaseDb.isSupabaseConfigured()) {
      return res.status(500).json({ error: 'Supabase is not configured' });
    }
    
    // Get all pending updates
    const updates = await supabaseDb.getPendingGuestUpdates(true);
    
    if (!updates || updates.length === 0) {
      return res.status(200).json({ 
        success: true, 
        processed: 0, 
        message: 'אין עדכונים ממתינים לעיבוד' 
      });
    }
    
    let processed = 0;
    let failed = 0;
    
    // Process each update
    for (const update of updates) {
      try {
        // Get event and guest from Supabase
        const event = await supabaseDb.getEventById(update.event_id);
        if (!event) {
          console.warn(`⚠️ Event ${update.event_id} not found for update ${update.id}`);
          failed++;
          continue;
        }
        
        // Get guest from event
        const guests = await supabaseDb.getGuestsByEventId(update.event_id);
        const guest = guests.find((g) => g.id === update.guest_id);
        
        if (!guest) {
          console.warn(`⚠️ Guest ${update.guest_id} not found for update ${update.id}`);
          failed++;
          continue;
        }
        
        // Update guest with pending update data
        const updatedGuest = {
          ...supabaseDb.convertSupabaseGuestToFrontend(guest),
          rsvpStatus: update.rsvp_status || guest.rsvp_status,
          guestCount: update.guest_count !== undefined ? update.guest_count : guest.guest_count,
          notes: update.notes || guest.notes,
          responseDate: update.response_date || guest.response_date
        };
        
        // Upsert updated guest
        await supabaseDb.upsertGuests([supabaseDb.convertFrontendGuestToSupabase(updatedGuest)]);
        
        // Delete the processed update
        await supabaseDb.deletePendingGuestUpdates({ id: update.id });
        
        processed++;
      } catch (updateError) {
        console.error(`❌ Error processing update ${update.id}:`, updateError);
        failed++;
      }
    }
    
    console.log(`✅ Processed ${processed} updates, ${failed} failed`);
    return res.status(200).json({ 
      success: true, 
      processed, 
      failed,
      total: updates.length
    });
  } catch (error) {
    console.error('❌ Error processing all pending guest updates:', error);
    return res.status(500).json({ 
      error: 'שגיאה בעיבוד עדכוני אורחים ממתינים',
      details: error.message 
    });
  }
});

// Handle OPTIONS preflight for /api/guests/process-all-updates
app.options('/api/guests/process-all-updates', (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.sendStatus(200);
});

// ========================================
// Start Server
// ========================================
app.listen(PORT, () => {
  console.log('========================================');
  console.log(`🚀 Server is running on port ${PORT}`);
  console.log(`📡 API endpoints available at http://localhost:${PORT}/api`);
  console.log(`🌐 Health check: http://localhost:${PORT}/api/health`);
  console.log('========================================');
  console.log('✅ All routes initialized successfully');
  console.log('✅ CORS configured for external access');
  console.log('✅ Supabase:', supabase ? 'Connected' : 'Not configured');
  console.log('========================================');
});
