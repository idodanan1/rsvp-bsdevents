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
      }
    }
  },
  // Handle environment variables
  define: {
    'process.env': process.env,
    'process.env.npm_package_version': JSON.stringify(version),
    '__APP_VERSION__': JSON.stringify(version)
  }
})
