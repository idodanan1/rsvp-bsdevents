import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

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
      }
    }
  },
  // Handle environment variables
  define: {
    'process.env': process.env
  }
})
