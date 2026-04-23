import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    chunkSizeWarningLimit: 600,       // Suppress warning for our 434 kB bundle
    sourcemap: false,                  // No sourcemaps in production
    rollupOptions: {
      output: {
        // Code-split vendor libs for better caching
        manualChunks: {
          react: ['react', 'react-dom', 'react-router-dom'],
          charts: ['chart.js', 'react-chartjs-2'],
        }
      }
    }
  },
  server: {
    port: 3000,
    proxy: {
      // Dev-only proxy — ignored in production builds
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      }
    }
  }
})
