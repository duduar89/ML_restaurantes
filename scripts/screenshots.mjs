/**
 * Arranca la app compilada, la llena con datos de ejemplo y captura las
 * pantallas que exige el manifiesto.
 *
 * Chrome en Android sólo enseña el diálogo de instalación completo —la tarjeta
 * grande con capturas— si el manifiesto trae al menos una captura
 * `form_factor: "narrow"`; sin ellas se queda en la hoja pequeña, y lo hace
 * en silencio, sin avisar por consola.
 *
 * Uso: npm run build && node scripts/screenshots.mjs
 */
import { chromium, devices } from 'playwright'
import { existsSync } from 'node:fs'
import { createServer } from 'node:http'
import { readFile, mkdir } from 'node:fs/promises'
import { extname, join, resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const DIST = join(ROOT, 'dist')
const OUT = join(ROOT, 'public', 'screenshots')
const PORT = 4178

const MIME = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.webmanifest': 'application/manifest+json',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
}

function serve() {
  const server = createServer(async (req, res) => {
    const url = new URL(req.url, `http://localhost:${PORT}`)
    let path = join(DIST, url.pathname === '/' ? 'index.html' : url.pathname)
    try {
      const body = await readFile(path)
      res.writeHead(200, { 'content-type': MIME[extname(path)] ?? 'application/octet-stream' })
      res.end(body)
    } catch {
      // Reserva de SPA: cualquier ruta desconocida devuelve el index.
      const body = await readFile(join(DIST, 'index.html'))
      res.writeHead(200, { 'content-type': 'text/html' })
      res.end(body)
    }
  })
  return new Promise((ok) => server.listen(PORT, () => ok(server)))
}

/**
 * Escribe gastos de ejemplo directamente en IndexedDB. Se leen primero los
 * identificadores que la app ha sembrado, para que los datos de ejemplo
 * apunten a los apartados y categorías de verdad.
 */
const seed = async (page) =>
  page.evaluate(async () => {
    const open = () =>
      new Promise((ok, fail) => {
        const request = indexedDB.open('caudal-db')
        request.onsuccess = () => ok(request.result)
        request.onerror = () => fail(request.error)
      })

    const all = (db, store) =>
      new Promise((ok) => {
        const request = db.transaction(store).objectStore(store).getAll()
        request.onsuccess = () => ok(request.result)
      })

    const db = await open()
    const spaces = await all(db, 'spaces')
    const methods = await all(db, 'methods')
    const categories = await all(db, 'categories')

    const byName = (list, name) => list.find((item) => item.name === name) ?? list[0]
    const life = spaces.find((space) => space.isDefault === 1)

    const stamp = Date.now()
    const uid = () => `demo-${Math.random().toString(36).slice(2, 12)}`
    const day = (offset) => {
      const date = new Date()
      date.setDate(date.getDate() - offset)
      const pad = (value) => String(value).padStart(2, '0')
      return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
    }

    // Un viaje en curso, para que se vea el apartado con presupuesto y ritmo.
    const trip = {
      id: uid(),
      name: 'Lisboa',
      emoji: '✈️',
      colorIndex: 1,
      kind: 'trip',
      budgetCents: 70000,
      startDay: day(3),
      endDay: day(-3),
      isDefault: 0,
      archived: 0,
      sortOrder: 1,
      createdAt: stamp,
      updatedAt: stamp,
      deletedAt: 0,
    }

    const rows = [
      [12, 'Mercadona', 4380, 'Súper', 'Tarjeta', life, 0],
      [12, 'Café', 180, 'Restaurantes', 'Efectivo', life, 1],
      [10, 'Metro', 250, 'Transporte', 'Tarjeta', life, 2],
      [9, 'Alquiler', 78000, 'Casa', 'Transferencia', life, 5],
      [8, 'Cine', 1900, 'Ocio', 'Tarjeta', life, 6],
      [7, 'Farmacia', 1240, 'Salud', 'Tarjeta', life, 8],
      [6, 'Spotify', 1099, 'Suscripciones', 'Tarjeta', life, 10],
      [5, 'Cena con Marta', 5240, 'Restaurantes', 'Bizum', life, 11],
      [4, 'Zara', 3995, 'Compras', 'Tarjeta', life, 13],
      [3, 'Vuelo Lisboa', 14800, 'Viaje', 'Tarjeta', trip, 3],
      [3, 'Hotel', 21000, 'Viaje', 'Tarjeta', trip, 3],
      [2, 'Pastéis de Belém', 860, 'Restaurantes', 'Efectivo', trip, 2],
      [2, 'Tranvía 28', 600, 'Transporte', 'Efectivo', trip, 2],
      [1, 'Cena en Alfama', 4200, 'Restaurantes', 'Tarjeta', trip, 1],
      [1, 'Súper', 1670, 'Súper', 'Tarjeta', life, 1],
      [0, 'Café', 190, 'Restaurantes', 'Efectivo', life, 0],
      [0, 'Panadería', 320, 'Súper', 'Efectivo', life, 0],
    ]

    const expenses = rows.map(([offset, concept, amountCents, category, method, space]) => ({
      id: uid(),
      spaceId: space.id,
      amountCents,
      kind: 'expense',
      concept,
      methodId: byName(methods, method).id,
      categoryId: byName(categories, category).id,
      day: day(offset),
      note: '',
      source: 'manual',
      externalId: null,
      createdAt: stamp - offset * 86400000,
      updatedAt: stamp,
      deletedAt: 0,
    }))

    // Un mes anterior con algo de gasto, para que la comparativa tenga contra qué comparar.
    for (let i = 0; i < 14; i += 1) {
      expenses.push({
        id: uid(),
        spaceId: life.id,
        amountCents: 1500 + i * 640,
        kind: 'expense',
        concept: ['Súper', 'Café', 'Metro', 'Cena'][i % 4],
        methodId: methods[0].id,
        categoryId: categories[i % categories.length].id,
        day: day(32 + i),
        note: '',
        source: 'manual',
        externalId: null,
        createdAt: stamp - (32 + i) * 86400000,
        updatedAt: stamp,
        deletedAt: 0,
      })
    }

    const write = (store, items) =>
      new Promise((ok) => {
        const tx = db.transaction(store, 'readwrite')
        items.forEach((item) => tx.objectStore(store).put(item))
        tx.oncomplete = () => ok()
      })

    await write('spaces', [trip])
    await write('expenses', expenses)

    const settings = (await all(db, 'settings'))[0]
    await write('settings', [{ ...settings, monthlyBudgetCents: 150000 }])
  })

async function main() {
  await mkdir(OUT, { recursive: true })
  const server = await serve()
  // El contenedor trae Chromium preinstalado en una revisión que puede no
  // coincidir con la que espera esta versión de Playwright. Si está, se usa
  // directamente en vez de descargar otra.
  const preinstalled = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome'
  const browser = await chromium.launch(
    existsSync(preinstalled) ? { executablePath: preinstalled } : {}
  )
  // 1080x1920 a escala 3 = 360x640 CSS: un móvil real y el tamaño que pide el
  // manifiesto.
  const context = await browser.newContext({
    ...devices['Pixel 5'],
    viewport: { width: 360, height: 640 },
    deviceScaleFactor: 3,
    locale: 'es-ES',
    timezoneId: 'Europe/Madrid',
  })
  const page = await context.newPage()
  page.on('pageerror', (error) => console.error('ERROR EN PÁGINA:', error.message))

  const base = `http://localhost:${PORT}`
  await page.goto(base, { waitUntil: 'networkidle' })
  await seed(page)

  const shots = [
    ['inicio', '/'],
    ['apartados', '/apartados'],
    ['analisis', '/analisis'],
    ['ajustes', '/ajustes'],
  ]

  for (const [name, path] of shots) {
    await page.goto(base + path, { waitUntil: 'networkidle' })
    await page.waitForTimeout(600)
    await page.screenshot({ path: join(OUT, `${name}.png`) })
    console.log(`  screenshots/${name}.png`)
  }

  // Una segunda captura de Análisis, ya desplazada, para que se vean las
  // gráficas de la mitad inferior.
  await page.goto(base + '/analisis', { waitUntil: 'networkidle' })
  await page.waitForTimeout(500)
  await page.locator('.screen-body').evaluate((node) => node.scrollTo(0, 1250))
  await page.waitForTimeout(500)
  await page.screenshot({ path: join(OUT, 'analisis-2.png') })
  console.log('  screenshots/analisis-2.png')

  // La hoja de alta, que es la pantalla más importante de la app.
  await page.goto(base, { waitUntil: 'networkidle' })
  await page.getByRole('button', { name: 'Añadir gasto' }).click()
  await page.waitForTimeout(420)
  for (const key of ['1', '2', ',', '5', '0']) {
    await page.getByRole('button', { name: key === ',' ? 'Coma decimal' : key, exact: true }).click()
  }
  await page.waitForTimeout(300)
  await page.screenshot({ path: join(OUT, 'anadir.png') })
  console.log('  screenshots/anadir.png')

  // El apartado por dentro.
  await page.goto(base + '/apartados', { waitUntil: 'networkidle' })
  await page.getByText('Lisboa').first().click()
  await page.waitForTimeout(600)
  await page.screenshot({ path: join(OUT, 'apartado.png') })
  console.log('  screenshots/apartado.png')

  await browser.close()
  server.close()
}

main().then(
  () => console.log('Capturas listas.'),
  (error) => {
    console.error(error)
    process.exitCode = 1
  }
)
