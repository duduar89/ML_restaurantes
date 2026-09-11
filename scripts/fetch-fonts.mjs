/**
 * Descarga las fuentes y las deja dentro del proyecto.
 *
 * Servirlas desde Google tiene tres problemas para esta app: en el primer
 * arranque sin red no hay tipografía, cada apertura manda la IP del usuario a
 * un tercero —en una app de finanzas personales eso no se hace— y el service
 * worker no puede precargar un recurso de otro origen. Alojadas aquí entran en
 * el precacheo (globPatterns incluye woff2) y la app es de verdad offline.
 *
 * Sólo se traen los subconjuntos latin y latin-ext: el cirílico, el griego y
 * el vietnamita pesan y esta app está en español.
 *
 * Uso: npm run fonts
 */
import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const FONT_DIR = resolve(ROOT, 'public', 'fonts')
const CSS_OUT = resolve(ROOT, 'src', 'styles', 'fonts.css')

// Google entrega woff2 variable sólo si el user-agent parece un navegador
// moderno; con el de curl devuelve ttf antiguos y mucho más pesados.
const UA =
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

const FAMILIES = [
  { name: 'Inter', query: 'Inter:wght@400..800', file: 'inter' },
  // Rango variable (500..700) y no dos pesos sueltos: un solo archivo por
  // subconjunto en lugar de dos, con el mismo resultado visual.
  { name: 'Space Grotesk', query: 'Space+Grotesk:wght@500..700', file: 'space-grotesk' },
]

const WANTED_SUBSETS = ['latin', 'latin-ext']

/** Parte la hoja de Google en bloques @font-face con su comentario de subconjunto. */
function parseFaces(css) {
  const faces = []
  const pattern = /\/\*\s*([\w-]+)\s*\*\/\s*@font-face\s*\{([^}]+)\}/g
  let match
  while ((match = pattern.exec(css)) !== null) {
    const [, subset, body] = match
    const url = body.match(/src:\s*url\(([^)]+)\)/)?.[1]
    const weight = body.match(/font-weight:\s*([^;]+);/)?.[1]?.trim()
    const style = body.match(/font-style:\s*([^;]+);/)?.[1]?.trim()
    const range = body.match(/unicode-range:\s*([^;]+);/)?.[1]?.trim()
    if (url && weight) faces.push({ subset, url, weight, style: style ?? 'normal', range })
  }
  return faces
}

async function main() {
  await mkdir(FONT_DIR, { recursive: true })
  const blocks = []

  for (const family of FAMILIES) {
    const response = await fetch(
      `https://fonts.googleapis.com/css2?family=${family.query}&display=swap`,
      { headers: { 'User-Agent': UA } }
    )
    if (!response.ok) throw new Error(`No se pudo leer la hoja de ${family.name}: ${response.status}`)

    const faces = parseFaces(await response.text()).filter((face) =>
      WANTED_SUBSETS.includes(face.subset)
    )
    if (faces.length === 0) throw new Error(`Sin subconjuntos latinos para ${family.name}`)

    for (const face of faces) {
      const fileName = `${family.file}-${face.subset}-${face.weight.replace(/\s+/g, '')}.woff2`
      const bytes = Buffer.from(await (await fetch(face.url, { headers: { 'User-Agent': UA } })).arrayBuffer())
      await writeFile(resolve(FONT_DIR, fileName), bytes)
      console.log(`  fonts/${fileName} (${(bytes.length / 1024).toFixed(1)} KB)`)

      blocks.push(`@font-face {
  font-family: '${family.name}';
  font-style: ${face.style};
  font-weight: ${face.weight};
  /* swap: el texto se ve desde el primer fotograma con la fuente del sistema
     y cambia al cargar, en vez de dejar la pantalla en blanco. */
  font-display: swap;
  src: url('/fonts/${fileName}') format('woff2');${face.range ? `\n  unicode-range: ${face.range};` : ''}
}`)
    }
  }

  await writeFile(
    CSS_OUT,
    `/*
 * Fuentes alojadas en el propio proyecto. Generado por scripts/fetch-fonts.mjs
 * — no editar a mano; para actualizarlas, \`npm run fonts\`.
 *
 * Inter lleva las cifras tabulares y el cero barrado de verdad, que es lo que
 * mantiene alineadas las columnas de dinero. Space Grotesk es sólo la voz de
 * display, de 22 px para arriba.
 */

${blocks.join('\n\n')}
`
  )
  console.log(`  ${CSS_OUT.replace(ROOT + '/', '')}`)
}

main().then(
  () => console.log('Fuentes listas.'),
  (error) => {
    console.error(error)
    process.exitCode = 1
  }
)
