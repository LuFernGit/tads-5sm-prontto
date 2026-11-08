import { fileURLToPath, URL } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    // Permite importar com "@/..." apontando para a pasta src.
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    // Em desenvolvimento, /api/* é repassado ao Spring Boot (evita configurar CORS).
    proxy: { '/api': { target: 'http://localhost:8080', changeOrigin: true } },
  },
})
