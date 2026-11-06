import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
export default defineConfig({
  plugins: [react()],
  // host: true exposes the dev server on your LAN (e.g. http://192.168.x.x:5173), not just
  // http://localhost:5173 — localhost on your laptop is not reachable from your phone at all.
  server: { host: true, port: 5173 },
})
