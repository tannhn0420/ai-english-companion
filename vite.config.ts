import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/icon.svg'],
      manifest: {
        name: 'AI English Companion',
        short_name: 'English',
        description: 'Học tiếng Anh mọi lúc — flashcards SRS, luyện nghe nói, offline-first.',
        lang: 'vi',
        display: 'standalone',
        start_url: '/',
        theme_color: '#0f0f23',
        background_color: '#0f0f23',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
        shortcuts: [
          { name: 'Ôn ngay', url: '/review', icons: [{ src: 'icons/icon-192.png', sizes: '192x192' }] },
          { name: 'Quiz', url: '/quiz', icons: [{ src: 'icons/icon-192.png', sizes: '192x192' }] },
        ],
      },
      workbox: {
        // App shell precache; bundle data (public/data/) sẽ có chiến lược riêng ở Phase 1.
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        navigateFallback: '/index.html',
      },
    }),
  ],
});
