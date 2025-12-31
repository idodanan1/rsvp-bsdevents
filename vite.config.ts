import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { readFileSync } from 'fs'
import { resolve } from 'path'

// Read package.json to get version
const packageJson = JSON.parse(readFileSync(resolve(__dirname, 'package.json'), 'utf-8'))
const version = packageJson.version || '1.0.199'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    // Suppress "use client" directive warnings from node_modules
    rollupOptions: {
      onwarn(warning, warn) {
        // Ignore "use client" directive warnings from node_modules
        if (warning.code === 'MODULE_LEVEL_DIRECTIVE' && warning.message?.includes('use client')) {
          return
        }
        // Use default warning handler for other warnings
        warn(warning)
      },
      output: {
        manualChunks: {
          // Split React and React DOM into separate chunk
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          // Split Supabase into separate chunk
          'supabase-vendor': ['@supabase/supabase-js', '@supabase/ssr'],
          // Split Zustand (state management) into separate chunk
          'zustand-vendor': ['zustand'],
          // Split Lucide icons into separate chunk
          'lucide-vendor': ['lucide-react'],
          // Split heavy utility libraries
          'utils-vendor': ['date-fns', 'clsx', 'tailwind-merge'],
          // Split Excel/PDF libraries
          'export-vendor': ['exceljs', 'xlsx', 'jspdf'],
          // Split QR code libraries
          'qr-vendor': ['qrcode', 'html5-qrcode'],
          // Split other heavy dependencies
          'other-vendor': ['react-hot-toast', 'zod']
        }
      }
    },
    chunkSizeWarningLimit: 1000 // Increase limit to 1MB per chunk
  },
  // Handle environment variables
  define: {
    'process.env': process.env,
    'process.env.npm_package_version': JSON.stringify(version),
    '__APP_VERSION__': JSON.stringify(version)
  }
})
