import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { albumPhotosPlugin } from './scripts/build/album-photos.mjs'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), albumPhotosPlugin()],
  build: { rollupOptions: { input: { scene: 'index.html', albums: 'albums/index.html' } } },
  server: {
    proxy: Object.fromEntries(['/posts', '/tags', '/categories', '/archives', '/blog-assets'].map(route =>
      [route, { target: 'http://127.0.0.1:1313', changeOrigin: false }])),
  },
})
