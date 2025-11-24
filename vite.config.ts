import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

// Plugin to ensure _redirects file is copied to dist
const redirectsPlugin = () => {
  return {
    name: 'copy-redirects',
    closeBundle() {
      // Ensure _redirects is copied to dist root
      try {
        const fs = require('fs');
        const path = require('path');
        const sourcePath = path.join(process.cwd(), 'public', '_redirects');
        const destPath = path.join(process.cwd(), 'dist', '_redirects');
        if (fs.existsSync(sourcePath)) {
          fs.copyFileSync(sourcePath, destPath);
          console.log('✅ _redirects file copied to dist')
        }
      } catch (error) {
        console.warn('⚠️ Could not copy _redirects file:', error)
      }
    }
  }
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), redirectsPlugin()],
  root: '.',
  publicDir: 'public',
  server: {
    port: 5173,
    open: '/',
    strictPort: false
  },
  build: {
    outDir: 'dist',
    sourcemap: false, // Disable sourcemap for faster builds
    copyPublicDir: true,
    chunkSizeWarningLimit: 1000
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src')
    }
  }
})
