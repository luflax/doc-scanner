import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  base: '/doc-scanner/',
  plugins: [
    react({
      jsxRuntime: 'automatic',
    }),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/*.png', 'icons/*.svg'],
      manifest: {
        name: 'Document Scanner',
        short_name: 'DocScanner',
        description: 'Professional document scanner with OCR capabilities',
        theme_color: '#3b82f6',
        background_color: '#ffffff',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/',
        start_url: '/',
        icons: [
          {
            src: '/icons/icon-72x72.png',
            sizes: '72x72',
            type: 'image/png',
            purpose: 'any maskable'
          },
          {
            src: '/icons/icon-96x96.png',
            sizes: '96x96',
            type: 'image/png',
            purpose: 'any maskable'
          },
          {
            src: '/icons/icon-128x128.png',
            sizes: '128x128',
            type: 'image/png',
            purpose: 'any maskable'
          },
          {
            src: '/icons/icon-144x144.png',
            sizes: '144x144',
            type: 'image/png',
            purpose: 'any maskable'
          },
          {
            src: '/icons/icon-152x152.png',
            sizes: '152x152',
            type: 'image/png',
            purpose: 'any maskable'
          },
          {
            src: '/icons/icon-192x192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any maskable'
          },
          {
            src: '/icons/icon-384x384.png',
            sizes: '384x384',
            type: 'image/png',
            purpose: 'any maskable'
          },
          {
            src: '/icons/icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ],
        screenshots: []
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        // Increase cache size for better offline experience
        maximumFileSizeToCacheInBytes: 10 * 1024 * 1024, // 10MB
        runtimeCaching: [
          // CDN resources (OpenCV, Tesseract)
          {
            urlPattern: /^https:\/\/(cdn\.jsdelivr\.net|docs\.opencv\.org|unpkg\.com)\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'cdn-cache',
              expiration: {
                maxEntries: 20,
                maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          // Tesseract language files
          {
            urlPattern: /^https:\/\/.*\/lang\/.*\.traineddata$/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'tesseract-lang-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          // App shell (HTML, CSS, JS)
          {
            urlPattern: /\.(?:html|css|js)$/,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'app-shell',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 * 24 * 7, // 1 week
              },
            },
          },
          // Images
          {
            urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp)$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'images',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
              },
            },
          },
        ],
      }
    })
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@/modules': path.resolve(__dirname, './src/modules'),
      '@/components': path.resolve(__dirname, './src/components'),
      '@/store': path.resolve(__dirname, './src/store'),
      '@/lib': path.resolve(__dirname, './src/lib'),
      '@/hooks': path.resolve(__dirname, './src/hooks'),
      '@/types': path.resolve(__dirname, './src/types'),
      '@/constants': path.resolve(__dirname, './src/constants'),
      '@/assets': path.resolve(__dirname, './src/assets')
    }
  },
  server: {
    host: true,
    port: 3000
  },
  build: {
    target: 'es2020',
    chunkSizeWarningLimit: 1000,
    // Source maps for production debugging (smaller than inline)
    sourcemap: 'hidden',
    // Minification options
    minify: 'terser',
    terserOptions: {
      compress: {
        //drop_console: true,
        //drop_debugger: true,
      },
    },
  }
});
