import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'
import { copyFileSync } from 'fs'
import { join } from 'path'

// Plugin to ensure _redirects file is copied to dist
const redirectsPlugin = () => {
  return {
    name: 'copy-redirects',
    closeBundle() {
      // Ensure _redirects is copied to dist root
      try {
        copyFileSync(
          join(__dirname, 'public', '_redirects'),
          join(__dirname, 'dist', '_redirects')
        )
        console.log('✅ _redirects file copied to dist')
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
