import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: Object.fromEntries(['/posts', '/tags', '/categories', '/archives', '/blog-assets'].map(route =>
      [route, { target: 'http://127.0.0.1:1313', changeOrigin: false }])),
  },
})
