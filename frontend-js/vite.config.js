import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'

const backend = 'http://backend-api:3000'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      '/signup': { target: backend, changeOrigin: true },
      '/login': { target: backend, changeOrigin: true },
      '/logout': { target: backend, changeOrigin: true },
      '/profile': { target: backend, changeOrigin: true },
      '/predictions': { target: backend, changeOrigin: true },
      '/cable': { target: backend, changeOrigin: true, ws: true },
    },
  },
})
