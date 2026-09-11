import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { fileURLToPath, URL } from 'node:url'

/**
 * `BASE_PATH` existe porque GitHub Pages sirve el proyecto bajo /<repo>/ y
 * entonces TODO (assets, scope del service worker, navigateFallback) tiene que
 * llevar ese prefijo. En Cloudflare Pages o Netlify se queda en '/'.
 */
const base = process.env.BASE_PATH ?? '/'

export default defineConfig({
  base,
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  build: {
    target: 'es2022',
  },
  plugins: [
    react(),
    VitePWA({
      // 'prompt', nunca 'autoUpdate': con autoUpdate el service worker recarga
      // la pestaña al desplegar y se pierde el importe a medio teclear. Además
      // migrar de autoUpdate a prompt más tarde deja instalaciones rotas.
      registerType: 'prompt',
      strategies: 'generateSW',
      includeAssets: ['favicon.svg', 'favicon-64.png', 'apple-touch-icon-180.png'],
      manifest: {
        // `id` fijo: si algún día cambia start_url, el navegador actualiza la
        // app instalada en vez de instalar una segunda.
        id: `${base}?app=caudal`,
        name: 'Caudal · Gastos',
        short_name: 'Caudal',
        description:
          'Control de gastos personales. Apunta en segundos, separa por apartados y mira a dónde va tu dinero.',
        lang: 'es',
        dir: 'ltr',
        start_url: base,
        scope: base,
        display: 'standalone',
        // window-controls-overlay es sólo de escritorio: aquí no pinta nada.
        display_override: ['standalone', 'minimal-ui'],
        orientation: 'portrait',
        theme_color: '#0a0912',
        background_color: '#0a0912',
        categories: ['finance', 'productivity', 'utilities'],
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          // Entrada separada: declarar 'any maskable' en el icono normal hace
          // que Android recorte el dibujo dentro de su máscara circular.
          { src: 'icon-512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
        // Chrome Android sólo enseña el diálogo de instalación completo si hay
        // capturas 'narrow'; las 'wide' las ignora desde Chrome 109.
        screenshots: [
          {
            src: 'screenshots/inicio.png',
            sizes: '1080x1920',
            type: 'image/png',
            form_factor: 'narrow',
            label: 'Resumen del mes',
          },
          {
            src: 'screenshots/apartados.png',
            sizes: '1080x1920',
            type: 'image/png',
            form_factor: 'narrow',
            label: 'Apartados para viajes y proyectos',
          },
          {
            src: 'screenshots/analisis.png',
            sizes: '1080x1920',
            type: 'image/png',
            form_factor: 'narrow',
            label: 'Gráficas y comparativas',
          },
        ],
        /*
         * La app se registra como destino del menú de compartir: así se puede
         * compartir el aviso del banco desde la notificación y que Caudal lo
         * lea. Sólo lo entiende Chromium/Android — Safari ignora share_target
         * por completo, y en iPhone el camino es un atajo con la URL.
         *
         * Se usa GET a propósito: aceptar imágenes exigiría POST con
         * multipart/form-data y un manejador de fetch propio en el service
         * worker, complejidad que aquí no compensa.
         */
        share_target: {
          action: `${base}compartir`,
          method: 'GET',
          params: { title: 'title', text: 'text', url: 'url' },
        },
        shortcuts: [
          {
            name: 'Nuevo gasto',
            short_name: 'Añadir',
            url: `${base}?action=nuevo`,
            icons: [{ src: 'icon-192.png', sizes: '192x192' }],
          },
        ],
      },
      workbox: {
        // Por defecto Workbox sólo precachea css/js/html: sin png/svg/woff2 la
        // app dice "lista sin conexión" y luego aparece sin iconos ni fuentes.
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        navigateFallback: `${base}index.html`,
        cleanupOutdatedCaches: true,
        clientsClaim: false,
        skipWaiting: false,
        runtimeCaching: [
          {
            // Las fuentes de Google: caché al vuelo para que la segunda visita
            // y el modo avión rindan igual.
            urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts',
              expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
      devOptions: {
        enabled: false,
        type: 'module',
      },
    }),
  ],
})
