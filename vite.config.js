import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// Настройки сборки. PWA: приложение ставится на экран телефона и работает без интернета.
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'Планер красоты и здоровья',
        short_name: 'Планер',
        description: 'Спокойный органайзер: цикл, здоровье, уход, деньги и встречи с подругами',
        lang: 'ru',
        start_url: '/',
        display: 'standalone',
        background_color: '#FBF0F2',
        theme_color: '#FBF0F2',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
        ]
      }
    })
  ]
});
