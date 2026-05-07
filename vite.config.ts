import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from "path"

import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    outDir: "./dist",
    emptyOutDir: true,
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: "./src/test/setup.ts",
    testTimeout: 20000,
  },
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://183.91.69.74',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, '/AGTOSNUS_Prod/api'),
        secure: false,
        configure: (proxy, options) => {
          proxy.on('proxyReq', (proxyReq, req) => {
            console.log('Proxying:', req.method, req.url, '->', options.target + proxyReq.path);
          });
        },
      },
    },
  },
})
