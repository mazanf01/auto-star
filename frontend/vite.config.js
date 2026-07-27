import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    host: true,        // listen di 0.0.0.0 (semua interface, IPv4 + IPv6)
    port: 5173,
    proxy: {
      '/api': 'http://localhost:3001',
    },
  },
})
