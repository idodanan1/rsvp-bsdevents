import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'
import { copyFileSync, existsSync } from 'fs'
import { join } from 'path'

// Plugin to ensure _redirects file is copied to dist
const redirectsPlugin = () => {
  return {
    name: 'copy-redirects',
    closeBundle() {
      // Ensure _redirects is copied to dist root
      try {
        const sourcePath = join(process.cwd(), 'public', '_redirects');
        const destPath = join(process.cwd(), 'dist', '_redirects');
        if (existsSync(sourcePath)) {
          copyFileSync(sourcePath, destPath);
          console.log('✅ _redirects file copied to dist')
        }
      } catch (error) {
        // Silently fail - _redirects will be copied by copyPublicDir anyway
      }
    }
  }
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), redirectsPlugin()],
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
