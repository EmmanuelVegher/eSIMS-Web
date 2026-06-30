import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // 'spa' makes the dev server and preview fall back to index.html
  // for any path that doesn't match a static file — required for
  // client-side routing with react-router-dom
  appType: 'spa',
})
