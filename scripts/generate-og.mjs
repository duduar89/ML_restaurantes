/**
 * Genera la imagen de previsualización que sale al compartir el enlace por
 * WhatsApp, Telegram o donde sea.
 *
 * Se renderiza con el navegador y no con una librería de imágenes porque así
 * usa las fuentes y los colores reales del proyecto: la tarjeta se parece a la
 * app en lugar de ser una aproximación que envejece por su cuenta.
 *
 * 1200x630 es la proporción que esperan casi todos los servicios; por debajo de
 * 300px de ancho, WhatsApp la descarta y enseña sólo texto.
 *
 * Uso: node scripts/generate-og.mjs
 */
import { chromium } from 'playwright'
import { existsSync } from 'node:fs'
import { createServer } from 'node:http'
import { readFile } from 'node:fs/promises'
import { dirname, extname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const PUBLIC = resolve(ROOT, 'public')
const PORT = 4187

const VESSEL = '#e0763f'
const WATER = '#4fb3a4'
const BG = '#16110e'
const TEXT = '#f6eee6'
const MUTED = '#c4b2a3'

const logo = `<svg width="176" height="176" viewBox="0 0 48 48" fill="none">
  <defs><clipPath id="c"><circle cx="24" cy="24" r="17"/></clipPath></defs>
  <g clip-path="url(#c)"><path d="M4 21q5-5 10 0t10 0t10 0t10 0V48H4Z" fill="${WATER}"/></g>
  <circle cx="24" cy="24" r="17" fill="none" stroke="${VESSEL}" stroke-width="4"/>
</svg>`

const html = `<!doctype html><html><head><meta charset="utf-8"><style>
  @font-face { font-family: 'IBM Plex Sans'; src: url('/fonts/plex-sans-latin-400700.woff2') format('woff2'); font-weight: 100 900; font-display: block; }
  @font-face { font-family: 'Bricolage Grotesque'; src: url('/fonts/bricolage-latin-500800.woff2') format('woff2'); font-weight: 100 900; font-display: block; }
  * { margin: 0; box-sizing: border-box; }
  /* Centrado: WhatsApp recorta la imagen a un cuadrado en algunos contextos,
     y con el contenido pegado a la izquierda se perdería medio nombre. */
  body {
    width: 1200px; height: 630px; background: ${BG}; color: ${TEXT};
    font-family: 'IBM Plex Sans', sans-serif; display: flex; align-items: center;
    justify-content: center; padding: 0 80px; gap: 64px; position: relative;
    overflow: hidden;
  }
  /* El mismo halo cálido que preside la pantalla de inicio de la app. */
  body::before {
    content: ''; position: absolute; top: -35%; right: -8%; width: 62%;
    aspect-ratio: 1; background: radial-gradient(circle, rgba(224,118,63,.30) 0%, transparent 68%);
  }
  .mark { position: relative; flex-shrink: 0; }
  .copy { position: relative; }
  h1 {
    font-family: 'Bricolage Grotesque', sans-serif; font-size: 104px; font-weight: 700;
    letter-spacing: -.035em; line-height: 1;
  }
  p.tag { font-size: 38px; color: ${MUTED}; margin-top: 16px; letter-spacing: -.01em; }
  p.what {
    font-size: 26px; color: ${MUTED}; margin-top: 36px; padding-top: 28px;
    border-top: 1px solid rgba(246,238,230,.13); max-width: 34ch; line-height: 1.5;
  }
</style></head><body>
  <div class="mark">${logo}</div>
  <div class="copy">
    <h1>Caudal</h1>
    <p class="tag">Tu dinero, en movimiento</p>
    <p class="what">Control de gastos desde el móvil. Sin cuentas, sin servidor y sin conexión.</p>
  </div>
</body></html>`

const server = createServer(async (req, res) => {
  if (req.url === '/') {
    res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' })
    res.end(html)
    return
  }
  try {
    const body = await readFile(join(PUBLIC, req.url.slice(1)))
    res.writeHead(200, { 'content-type': extname(req.url) === '.woff2' ? 'font/woff2' : 'application/octet-stream' })
    res.end(body)
  } catch {
    res.writeHead(404).end()
  }
})
await new Promise((ok) => server.listen(PORT, ok))

const preinstalled = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome'
const browser = await chromium.launch(existsSync(preinstalled) ? { executablePath: preinstalled } : {})
const page = await browser.newPage({ viewport: { width: 1200, height: 630 } })
await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle' })
await page.waitForTimeout(800)
await page.screenshot({ path: resolve(PUBLIC, 'og.png') })
console.log('  og.png (1200x630)')

await browser.close()
server.close()
