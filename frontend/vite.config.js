import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'icons.svg'],
      manifest: {
        name: 'Blessed Palm Oil',
        short_name: 'Palm Oil',
        description: 'Blessed Palm Oil - Business Manager',
        theme_color: '#16a34a',
        background_color: '#f8fafc',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/',
        start_url: '/',
        icons: [
          {
            src: '/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: '/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png}'],
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.pathname.startsWith('/auth') || url.pathname.startsWith('/inventory') || url.pathname.startsWith('/sales') || url.pathname.startsWith('/receivables') || url.pathname.startsWith('/receipts') || url.pathname.startsWith('/dashboard') || url.pathname.startsWith('/customers') || url.pathname.startsWith('/reminders') || url.pathname.startsWith('/analytics'),
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              networkTimeoutSeconds: 10,
            },
          },
        ],
      },
    }),
  ],
})
