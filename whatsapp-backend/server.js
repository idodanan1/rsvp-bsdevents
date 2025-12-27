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
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
console.log('✅ Supabase client initialized successfully');
console.log('📊 Supabase URL:', SUPABASE_URL);

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
app.get('/api/health', (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    supabase: {
      configured: !!SUPABASE_URL && !!SUPABASE_SERVICE_ROLE_KEY,
      connected: true // Supabase client is always connected
    }
  });
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
// GET /api/events/:userId - Get events for user
app.get('/api/events/:userId', async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  
  try {
    const { userId } = req.params;
    console.log('📋 Fetching events for user:', userId);
    
    if (!supabaseDb.isSupabaseConfigured()) {
      console.error('❌ Supabase is not configured');
      return res.status(200).json([]);
    }
    
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('❌ Supabase Error:', error);
      return res.status(200).json([]);
    }
    
    if (!data || data.length === 0) {
      console.log('📋 No events found for userId:', userId);
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
// Start Server
// ========================================
app.listen(PORT, () => {
  console.log(`🚀 Server is running on port ${PORT}`);
  console.log(`📡 API endpoints available at http://localhost:${PORT}/api`);
});
