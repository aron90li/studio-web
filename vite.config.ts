import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  optimizeDeps: {
    exclude: ['monaco-editor']
  },
  plugins: [
    react(),

  ],
  server: {
    port: 3000,
    open: true,
    host: 'localhost'
  },
  preview: {
    port: 5000,
    host: 'localhost'
  }
})