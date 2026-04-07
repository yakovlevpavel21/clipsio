import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:5000', // Заменили localhost на 127.0.0.1
        changeOrigin: true,
        secure: false,
      },
      '/socket.io': {
        target: 'http://127.0.0.1:5000',
        ws: true,
      },
      '/originals': 'http://127.0.0.1:5000',
      '/uploads': 'http://127.0.0.1:5000',
      '/thumbnails': 'http://127.0.0.1:5000',
    }
  }
})