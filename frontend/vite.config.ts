import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const BACKEND = 'http://localhost:8080'
const PROXY_PATHS = [
  '/search',
  '/insert',
  '/delete',
  '/items',
  '/benchmark',
  '/hnsw-info',
  '/stats',
  '/status',
  '/doc',
  '/load-synthetic',
  '/reset-vectors',
]

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    proxy: Object.fromEntries(
      PROXY_PATHS.map((p) => [p, { target: BACKEND, changeOrigin: true }])
    ),
  },
})
