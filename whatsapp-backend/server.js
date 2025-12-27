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
  process.exit(1);
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
// Pending Updates - Now using Supabase pending_guest_updates table
// ========================================
