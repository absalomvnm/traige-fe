import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5174,
    strictPort: true,
    proxy: {
      // Auth service
      '/api': {
        target: 'http://localhost:8083',//'https://d2h3z5kegnj368.cloudfront.net',
        changeOrigin: true,
      },
      // Patient management service
      '/patient-api': {
        target: 'http://localhost:8081',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/patient-api/, ''),
      },
    },
  },
})
