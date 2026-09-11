/**
 * Verificación de extremo a extremo sobre la app COMPILADA.
 *
 * Las pruebas unitarias cubren el núcleo, pero no dicen si el gasto llega de
 * verdad a IndexedDB al pulsar el teclado, si el enlace de las automatizaciones
 * aterriza donde debe o si el tema claro es legible. Eso sólo lo dice un
 * navegador de verdad contra el paquete de producción.
 *
 * Uso: npm run build && node scripts/verify.mjs
 */
import { chromium, devices } from 'playwright'
import { existsSync } from 'node:fs'
import { createServer } from 'node:http'
import { readFile, mkdir } from 'node:fs/promises'
import { extname, join, resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const DIST = join(ROOT, 'dist')
const SHOTS = join(ROOT, 'public', 'screenshots')
const PORT = 4180

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
    const file = join(DIST, url.pathname === '/' ? 'index.html' : url.pathname)
    try {
      const body = await readFile(file)
      res.writeHead(200, { 'content-type': MIME[extname(file)] ?? 'application/octet-stream' })
      res.end(body)
    } catch {
      const body = await readFile(join(DIST, 'index.html'))
      res.writeHead(200, { 'content-type': 'text/html' })
      res.end(body)
    }
  })
  return new Promise((ok) => server.listen(PORT, () => ok(server)))
}

let failures = 0
function check(label, condition, detail = '') {
  console.log(`${condition ? '  ✓' : '  ✗'} ${label}${detail && !condition ? ` — ${detail}` : ''}`)
  if (!condition) failures += 1
}

/** Lee los gastos vivos directamente de IndexedDB. */
const readExpenses = (page) =>
  page.evaluate(
    () =>
      new Promise((ok) => {
        const request = indexedDB.open('caudal-db')
        request.onsuccess = () => {
          const get = request.result.transaction('expenses').objectStore('expenses').getAll()
          get.onsuccess = () => ok(get.result.filter((row) => row.deletedAt === 0))
        }
      })
  )

async function run(browser, base) {
  const newPage = async () => {
    const context = await browser.newContext({
      ...devices['Pixel 5'],
      viewport: { width: 360, height: 720 },
      deviceScaleFactor: 3,
      locale: 'es-ES',
      timezoneId: 'Europe/Madrid',
    })
    const page = await context.newPage()
    const errors = []
    page.on('pageerror', (error) => errors.push(error.message))
    page.on('console', (message) => {
      if (message.type() !== 'error') return
      // Los fallos de red de recursos externos no son de la app: en este
      // entorno el navegador no sale a internet. La app, de hecho, ya no pide
      // nada a otro origen; este filtro sólo evita falsos negativos si algún
      // día se añade algo.
      if (/Failed to load resource/.test(message.text())) return
      errors.push(message.text())
    })
    return { context, page, errors }
  }

  /* --- 1. Alta de un gasto con el teclado propio ------------------------- */
  console.log('\nAlta de un gasto desde el teclado')
  {
    const { context, page, errors } = await newPage()
    await page.goto(base, { waitUntil: 'networkidle' })
    await page.getByRole('button', { name: 'Añadir gasto' }).click()
    await page.waitForTimeout(400)

    for (const key of ['4', ',', '2', '0']) {
      await page.getByRole('button', { name: key === ',' ? 'Coma decimal' : key, exact: true }).click()
    }
    await page.getByPlaceholder('¿En qué?').fill('Café de prueba')
    await page.waitForTimeout(250)
    await page.getByRole('button', { name: 'Guardar', exact: true }).click()
    await page.waitForTimeout(600)

    const rows = await readExpenses(page)
    const saved = rows.find((row) => row.concept === 'Café de prueba')
    check('el gasto llega a IndexedDB', Boolean(saved))
    check('el importe se guarda en céntimos', saved?.amountCents === 420, `fue ${saved?.amountCents}`)
    check('la fecha se pone sola', /^\d{4}-\d{2}-\d{2}$/.test(saved?.day ?? ''))
    check('la categoría se adivina del concepto', Boolean(saved?.categoryId))
    check('se marca como apuntado a mano', saved?.source === 'manual')

    const visible = await page.getByText('Café de prueba').first().isVisible()
    check('aparece en la lista al instante', visible)
    check('sin errores en consola', errors.length === 0, errors[0])
    await context.close()
  }

  /* --- 2. El enlace de las automatizaciones ------------------------------ */
  console.log('\nEnlace profundo de las automatizaciones')
  {
    const { context, page, errors } = await newPage()
    await page.goto(base, { waitUntil: 'networkidle' })
    await page.goto(`${base}/add?importe=23,45&concepto=Mercadona&auto=1`, {
      waitUntil: 'networkidle',
    })
    await page.waitForTimeout(900)

    const rows = await readExpenses(page)
    const imported = rows.find((row) => row.concept === 'Mercadona')
    check('guarda solo con auto=1', Boolean(imported))
    check('lee la coma decimal', imported?.amountCents === 2345, `fue ${imported?.amountCents}`)
    check('se marca como automatización', imported?.source === 'automation')
    check('guarda la huella para no duplicar', Boolean(imported?.externalId))
    check('confirma en pantalla', await page.getByText('Apuntado').isVisible())

    // Segundo intento con los mismos datos: no debe duplicar.
    await page.goto(`${base}/add?importe=23,45&concepto=Mercadona&auto=1`, {
      waitUntil: 'networkidle',
    })
    await page.waitForTimeout(900)
    const after = await readExpenses(page)
    check(
      'no duplica el mismo movimiento',
      after.filter((row) => row.concept === 'Mercadona').length === 1
    )
    check('avisa de que ya estaba', await page.getByText('Esto ya lo tienes apuntado').isVisible())

    // Un aviso con '&' dentro: URLSearchParams lo cortaría por la mitad.
    await page.goto(
      `${base}/add?auto=1&texto=Compra%20de%2030,00%20EUR%20en%20H&M%20GRAN%20VIA`,
      { waitUntil: 'networkidle' }
    )
    await page.waitForTimeout(900)
    const conAmpersand = (await readExpenses(page)).find((row) => row.amountCents === 3000)
    check('no pierde el comercio cuando el aviso lleva un &', Boolean(conAmpersand))
    check('conserva el nombre entero', conAmpersand?.concept?.includes('H&M'), conAmpersand?.concept)

    // Un pago rechazado no puede crear un gasto.
    const antes = (await readExpenses(page)).length
    await page.goto(
      `${base}/add?auto=1&texto=Compra%20RECHAZADA%20de%2099,00%20EUR%20en%20ZARA`,
      { waitUntil: 'networkidle' }
    )
    await page.waitForTimeout(900)
    check('un pago rechazado no crea ningún gasto', (await readExpenses(page)).length === antes)

    check('sin errores en consola', errors.length === 0, errors[0])
    await context.close()
  }

  /* --- 2b. Lectura del importe en avisos reales -------------------------- */
  console.log('\nImportes tal y como los escribe cada banco')
  {
    // Esta comprobación existe por un fallo que llegó a producción: "€2.50" se
    // apuntaba como 2,00 €. No daba error, no avisaba de nada, y el importe
    // equivocado quedaba guardado. Las pruebas unitarias ya lo cubren, pero
    // esto lo mide sobre lo que de verdad se sube al servidor.
    const CASOS = [
      ['Pago de €2.50 en CAFE CENTRAL', 250, 'expense'],
      ['Pago de €9.99 en SPOTIFY', 999, 'expense'],
      ['Compra de 1.056,42 EUR en MEDIAMARKT', 105642, 'expense'],
      ['Compra de 1.234 EUR en EL CORTE INGLES', 123400, 'expense'],
      ['Has recibido 40,00 EUR de Ana', 4000, 'income'],
      ['Ana te ha enviado 20,00 EUR', 2000, 'income'],
      ['Devolucion de 15,00 EUR de ZARA', 1500, 'income'],
      ['Pago programado de 55,00 EUR para el dia 5', null, null],
    ]

    const { context, page, errors } = await newPage()
    await page.goto(base, { waitUntil: 'networkidle' })

    for (const [texto, centimos, tipo] of CASOS) {
      const antes = await readExpenses(page)
      await page.goto(`${base}/add?auto=1&texto=${encodeURIComponent(texto)}`, {
        waitUntil: 'networkidle',
      })
      await page.waitForTimeout(700)
      const nuevo = (await readExpenses(page)).find(
        (fila) => !antes.some((previa) => previa.id === fila.id)
      )
      const visto = nuevo ? nuevo.amountCents : null
      const muestra = (c, k) =>
        c === null ? 'nada apuntado' : `${(c / 100).toFixed(2)} € ${k === 'income' ? 'ingreso' : 'gasto'}`
      check(
        `«${texto}» → ${muestra(centimos, tipo)}`,
        visto === centimos && (nuevo?.kind ?? null) === tipo,
        `fue ${muestra(visto, nuevo?.kind ?? null)}`
      )
    }

    // Y ahora tal cual lo manda una macro: pegado al final SIN codificar. Un
    // '%' suelto ("EL CORTE INGLES 100%") invalida la cadena entera para
    // decodeURIComponent y antes se perdía el gasto sin decir nada.
    for (const [texto, centimos] of [
      ['Compra de 12,34 EUR en H&M GRAN VIA', 1234],
      ['Compra 45,00 EUR en EL CORTE INGLES 100%', 4500],
      ['Compra 9,90 EUR en CAFÉ AZUL 50% dto', 990],
    ]) {
      const antes = await readExpenses(page)
      await page.goto(`${base}/add?auto=1&texto=${texto}`, { waitUntil: 'networkidle' })
      await page.waitForTimeout(700)
      const nuevo = (await readExpenses(page)).find(
        (fila) => !antes.some((previa) => previa.id === fila.id)
      )
      check(
        `sin codificar: «${texto}»`,
        nuevo?.amountCents === centimos,
        `fue ${nuevo ? (nuevo.amountCents / 100).toFixed(2) : 'nada apuntado'}`
      )
    }

    check('sin errores en consola', errors.length === 0, errors[0])
    await context.close()
  }

  /* --- 2c. Registro de lo que llega ------------------------------------- */
  console.log('\nRegistro de avisos en Ajustes')
  {
    // El modo de fallo de toda la cadena es mudo: la macro dispara, Caudal no
    // entiende el aviso, y la pantalla que lo explica sale con el móvil en el
    // bolsillo. Este registro es lo único que lo delata, así que tiene que
    // anotar TAMBIÉN lo que no salió bien.
    const { context, page, errors } = await newPage()
    await page.goto(base, { waitUntil: 'networkidle' })

    const ENTRADAS = [
      ['auto=1&texto=Compra de 31,10 EUR en LIBRERIA', 'Apuntado'],
      ['auto=1&texto=Compra de 31,10 EUR en LIBRERIA', 'Ya estaba'],
      ['auto=1&texto=Compra RECHAZADA de 77,00 EUR en ZARA', 'Descartado a propósito'],
      ['auto=1&texto=Tu saldo se ha actualizado', 'No se pudo leer'],
      ['texto=Compra de 4,20 EUR en PANADERIA', 'Esperando confirmación'],
    ]
    for (const [query] of ENTRADAS) {
      await page.goto(`${base}/add?${query}`, { waitUntil: 'networkidle' })
      await page.waitForTimeout(600)
    }

    await page.goto(`${base}/ajustes`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(500)
    const registro = await page.locator('.capturelog').innerText()

    for (const [, etiqueta] of ENTRADAS) {
      check(`anota «${etiqueta}»`, registro.includes(etiqueta))
    }
    check(
      'guarda el texto literal para poder arreglarlo',
      registro.includes('Tu saldo se ha actualizado')
    )
    check(
      'avisa de cuántos no ha sabido leer',
      /1 de los últimos \d+ no se han podido leer/.test(registro)
    )

    await page.getByRole('button', { name: 'Borrar el registro' }).click()
    await page.waitForTimeout(400)
    check(
      'se puede borrar',
      (await page.locator('.capturelog').innerText()).includes('Todavía no ha llegado ningún aviso')
    )

    check('sin errores en consola', errors.length === 0, errors[0])
    await context.close()
  }

  /* --- 3. Apartado nuevo ------------------------------------------------- */
  console.log('\nCrear un apartado')
  {
    const { context, page, errors } = await newPage()
    await page.goto(`${base}/apartados`, { waitUntil: 'networkidle' })
    await page.getByRole('button', { name: '+ Nuevo' }).click()
    await page.waitForTimeout(400)
    await page.getByPlaceholder('Viaje a Japón').fill('Reforma baño')
    await page.getByPlaceholder('0,00').fill('3500')
    await page.getByRole('button', { name: 'Crear apartado' }).click()
    await page.waitForTimeout(600)

    check(
      'el apartado aparece en la lista',
      await page.locator('.spacecard-name', { hasText: 'Reforma baño' }).isVisible()
    )
    check(
      'con su presupuesto',
      await page.locator('.spacecard', { hasText: 'Reforma baño' }).getByText(/Quedan/).isVisible()
    )
    check('sin errores en consola', errors.length === 0, errors[0])
    await context.close()
  }

  /* --- 4. Tema claro ----------------------------------------------------- */
  console.log('\nTema claro')
  {
    const { context, page, errors } = await newPage()
    await page.goto(`${base}/ajustes`, { waitUntil: 'networkidle' })
    await page.getByRole('button', { name: 'Claro' }).click()
    await page.waitForTimeout(500)

    const theme = await page.evaluate(() => document.documentElement.dataset.theme)
    check('se activa el atributo del tema', theme === 'light')

    const bg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor)
    check('el lienzo se aclara', bg === 'rgb(247, 240, 231)', bg)

    await page.goto(base, { waitUntil: 'networkidle' })
    await page.waitForTimeout(500)
    await page.screenshot({ path: join(SHOTS, 'tema-claro.png') })
    console.log('    (captura en screenshots/tema-claro.png)')

    // El tema tiene que sobrevivir a una recarga sin fogonazo del otro tema.
    await page.reload({ waitUntil: 'domcontentloaded' })
    const persisted = await page.evaluate(() => document.documentElement.dataset.theme)
    check('el tema sobrevive a la recarga', persisted === 'light')
    check('sin errores en consola', errors.length === 0, errors[0])
    await context.close()
  }

  /* --- 5. Versión y actualización ---------------------------------------- */
  console.log('\nSaber en qué versión estás')
  {
    // "No me va el botón de actualizar" no se puede diagnosticar sin esto: el
    // aviso de nueva versión es efímero y, si se descarta o la app se abre sin
    // recargar, no queda nada en pantalla que diga en qué versión estás.
    const { context, page, errors } = await newPage()
    await page.goto(`${base}/ajustes`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(600)
    await page.locator('.version').scrollIntoViewIfNeeded()

    const sello = await page.locator('.version-id').innerText()
    check('enseña la fecha de la versión', /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(sello), sello)

    await page.getByRole('button', { name: 'Buscar actualización' }).click()
    await page.waitForTimeout(3000)
    const texto = await page.locator('.version').innerText()
    check('dice que ya estás al día cuando no hay nada nuevo', texto.includes('Ya tienes la última'))

    check('sin errores en consola', errors.length === 0, errors[0])
    await context.close()
  }

  await checkPackaging()
}

/** Revisa el paquete generado: manifiesto, iconos y service worker. */
async function checkPackaging() {
  console.log('\nEmpaquetado como PWA')
  {
    const manifest = JSON.parse(await readFile(join(DIST, 'manifest.webmanifest'), 'utf8'))
    check('tiene id estable', typeof manifest.id === 'string')
    check('short_name cabe en el icono', (manifest.short_name?.length ?? 99) <= 12)
    check(
      'icono maskable en entrada propia',
      manifest.icons?.some((icon) => icon.purpose === 'maskable') &&
        manifest.icons?.some((icon) => icon.purpose === 'any')
    )
    check(
      'capturas narrow para el diálogo de instalación',
      manifest.screenshots?.every((shot) => shot.form_factor === 'narrow')
    )
    check('destino del menú de compartir', manifest.share_target?.action?.includes('compartir'))
    check('color de tema igual al lienzo', manifest.theme_color === '#16110e')

    for (const shot of manifest.screenshots ?? []) {
      check(`la captura ${shot.src} existe`, existsSync(join(DIST, shot.src)))
    }
    for (const icon of manifest.icons ?? []) {
      check(`el icono ${icon.src} existe`, existsSync(join(DIST, icon.src)))
    }

    const sw = await readFile(join(DIST, 'sw.js'), 'utf8')
    // En modo 'prompt' skipWaiting sólo puede correr dentro del manejador del
    // mensaje SKIP_WAITING, que dispara el botón "Actualizar". Si estuviese
    // suelto, la app se recargaría sola y se perdería el importe a medio
    // teclear.
    check(
      'la actualización la decide el usuario, no el service worker',
      /SKIP_WAITING/.test(sw) && !/^\s*self\.skipWaiting\(\)/m.test(sw)
    )
    const precache = sw.match(/revision:/g)?.length ?? 0
    check('precachea la app entera', precache >= 10, `${precache} entradas`)
    check(
      'precachea también iconos y fuentes',
      /icon-512\.png/.test(sw) && /plex-sans-latin-400700\.woff2/.test(sw)
    )
  }

}

async function main() {
  await mkdir(SHOTS, { recursive: true })
  const server = await serve()
  const preinstalled = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome'
  const browser = await chromium.launch(
    existsSync(preinstalled) ? { executablePath: preinstalled } : {}
  )

  try {
    await run(browser, `http://localhost:${PORT}`)
  } catch (error) {
    console.error('\nLa verificación se ha roto:', error.message)
    failures += 1
  } finally {
    await browser.close()
    server.close()
  }

  console.log(failures === 0 ? '\nTodo correcto.' : `\n${failures} comprobaciones fallidas.`)
  process.exitCode = failures === 0 ? 0 : 1
}

void main()
