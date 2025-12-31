import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { readFileSync } from 'fs'
import { resolve } from 'path'

// Read package.json to get version
const packageJson = JSON.parse(readFileSync(resolve(__dirname, 'package.json'), 'utf-8'))
const version = packageJson.version || '1.0.210'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    // Force cache busting - add timestamp to filenames
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
        // Add hash to filenames for cache busting
        entryFileNames: `assets/[name]-[hash].js`,
        chunkFileNames: `assets/[name]-[hash].js`,
        assetFileNames: `assets/[name]-[hash].[ext]`,
        manualChunks: (id) => {
          // Split node_modules into vendor chunks
          if (id.includes('node_modules')) {
            // React core
            if (id.includes('react') || id.includes('react-dom') || id.includes('react-router')) {
              return 'react-vendor';
            }
            // Supabase (only if actually used)
            if (id.includes('@supabase')) {
              return 'supabase-vendor';
            }
            // Zustand
            if (id.includes('zustand')) {
              return 'zustand-vendor';
            }
            // Lucide icons
            if (id.includes('lucide-react')) {
              return 'lucide-vendor';
            }
            // Excel/PDF libraries - split into separate chunks
            if (id.includes('exceljs')) {
              return 'exceljs-vendor';
            }
            if (id.includes('xlsx')) {
              return 'xlsx-vendor';
            }
            if (id.includes('jspdf')) {
              return 'jspdf-vendor';
            }
            // QR code libraries
            if (id.includes('qrcode') || id.includes('html5-qrcode')) {
              return 'qr-vendor';
            }
            // Utility libraries
            if (id.includes('date-fns') || id.includes('clsx') || id.includes('tailwind-merge')) {
              return 'utils-vendor';
            }
            // Other dependencies
            if (id.includes('react-hot-toast') || id.includes('zod')) {
              return 'other-vendor';
            }
            // All other node_modules
            return 'vendor';
          }
        }
      }
    },
    chunkSizeWarningLimit: 1500 // Increase limit to 1.5MB per chunk (for export libraries)
  },
  // Handle environment variables
  define: {
    'process.env': process.env,
    'process.env.npm_package_version': JSON.stringify(version),
    '__APP_VERSION__': JSON.stringify(version),
    'import.meta.env.VITE_APP_VERSION': JSON.stringify(version)
  }
})
