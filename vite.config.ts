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
        // Android: share text từ app khác vào app → tạo thẻ nhanh (REQUIREMENTS A8)
        share_target: {
          action: '/share',
          method: 'GET',
          params: { title: 'title', text: 'text', url: 'url' },
        },
      },
      workbox: {
        // App shell + bundle data mở (DATA.md §3) — precache nền, offline tra được từ/câu.
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}', 'data/**/*.json'],
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api\//],
        runtimeCaching: [
          {
            // MP3 VOA: nghe rồi → offline nghe lại được (Range để seek)
            urlPattern: /\/api\/voa\/audio/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'voa-audio',
              expiration: { maxEntries: 20, purgeOnQuotaError: true },
              rangeRequests: true,
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            // Feed/bài: ưu tiên mạng, offline rơi về cache
            urlPattern: /\/api\/voa\/(feed|page)/,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'voa-text',
              expiration: { maxEntries: 60 },
            },
          },
        ],
      },
    }),
  ],
});
