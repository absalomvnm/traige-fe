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
        target: 'https://d1wcu2a5qc2e6g.cloudfront.net',//'http://localhost:8083',
        changeOrigin: true,
      },
      // Patient management service
      '/patient-api': {
        target: 'https://d3jfk6d9o8wsur.cloudfront.net',//'http://localhost:8081',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/patient-api/, ''),
      },
    },
  },
})
