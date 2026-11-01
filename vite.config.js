import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // Local development only: when the frontend runs on :5173 with
  // `npm run dev`, /api calls are sent to a Vercel dev server on
  // :3000 (run `npx vercel dev` in a second terminal). In production
  // Vercel serves the frontend and the api/ functions together, so
  // this proxy is not used there.
  server: {
    proxy: {
      '/api': 'http://localhost:3000',
    },
  },
})
