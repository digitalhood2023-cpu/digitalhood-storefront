import path from "path"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

// https://vite.dev/config/
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined

          if (
            id.includes('/react/') ||
            id.includes('/react-dom/') ||
            id.includes('/scheduler/')
          ) {
            return 'vendor-react'
          }

          if (id.includes('/react-router') || id.includes('/@remix-run/')) {
            return 'vendor-router'
          }

          if (id.includes('/lucide-react/')) {
            return 'vendor-icons'
          }

          if (id.includes('/gsap/')) {
            return 'vendor-animation'
          }

          if (id.includes('/@stripe/') || id.includes('/stripe-js/')) {
            return 'vendor-stripe'
          }

          if (id.includes('/@tanstack/react-query/')) {
            return 'vendor-query'
          }

          return 'vendor'
        },
      },
    },
  },
  base: '/',
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
