import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { fileURLToPath, URL } from 'node:url'

/**
 * `BASE_PATH` existe porque GitHub Pages sirve el proyecto bajo /<repo>/ y
 * entonces TODO (assets, scope del service worker, navigateFallback) tiene que
 * llevar ese prefijo. En Cloudflare Pages o Netlify se queda en '/'.
 */
const base = process.env.BASE_PATH ?? '/'

/**
 * Dirección pública del sitio, para las etiquetas de previsualización.
 *
 * WhatsApp, Telegram y compañía NO resuelven rutas relativas en `og:image`: o
 * la URL es absoluta o el enlace se comparte sin imagen. Como la dirección
 * depende de dónde se publique, se inyecta al compilar.
 */
const siteUrl = (process.env.SITE_URL ?? '').replace(/\/$/, '')

function openGraph(): Plugin {
  return {
    name: 'caudal-open-graph',
    transformIndexHtml: {
      order: 'pre',
      handler(html) {
        if (siteUrl) return html.replace(/%SITE_URL%/g, siteUrl)

        // Sin SITE_URL se retiran las etiquetas enteras. Dejarlas con una ruta
        // relativa daría una previsualización rota, que se ve peor que no
        // tener previsualización.
        console.warn(
          '[caudal] SITE_URL no definida: se omiten las etiquetas de previsualización.\n' +
            '         Para incluirlas: SITE_URL=https://tu-dominio npm run build'
        )
        return html.replace(/[ \t]*<!-- og:start -->[\s\S]*?<!-- og:end -->\n?/g, '')
      },
    },
  }
}

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
    openGraph(),
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
        theme_color: '#16110e',
        background_color: '#16110e',
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
        // Las capturas sólo las lee el diálogo de instalación de Android, una
        // vez y con red: precachearlas serían cientos de kB muertos en el
        // almacenamiento de cada usuario.
        globIgnores: ['**/screenshots/**'],
        navigateFallback: `${base}index.html`,
        cleanupOutdatedCaches: true,
        clientsClaim: false,
        skipWaiting: false,
        // Sin runtimeCaching: la app no pide NADA a otro origen. Todo lo que
        // necesita —código, estilos, iconos y fuentes— está precacheado.
      },
      devOptions: {
        enabled: false,
        type: 'module',
      },
    }),
  ],
})
