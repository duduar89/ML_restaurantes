/**
 * Genera los iconos de Caudal a partir de una única definición SVG.
 *
 * Hay cuatro variantes y cada una existe por una razón concreta:
 *  - `any`: la marca a sangre sobre el lienzo, para el icono estándar.
 *  - `maskable`: la misma marca al 40% del lienzo. Android recorta el icono
 *    con una máscara (círculo, squircle...) y sin esa zona de seguridad se
 *    come el aro.
 *  - `apple-touch-icon`: 180x180 y OPACO. iOS ignora `maskable` y compone
 *    cualquier transparencia sobre negro, dejando esquinas negras.
 *  - favicon de 32/64 px: color plano y aro más grueso. Un degradado de dos
 *    paradas se emborrona por debajo de 24 px.
 *
 * Uso: node scripts/generate-icons.mjs
 */
import sharp from 'sharp'
import { writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const PUBLIC = resolve(ROOT, 'public')

const FROM = '#35e0f5'
const TO = '#7b5cff'
const BG = '#0a0912'

/** Nivel 0-1 -> Y de la superficie, repartiendo el ÁREA del círculo. */
const LEVEL_ANCHORS = [
  [0, 41], [0.15, 33.9], [0.25, 30.9], [0.5, 24],
  [0.61, 21], [0.75, 17.1], [0.9, 12.3], [1, 7],
]

function levelToY(level) {
  for (let i = 1; i < LEVEL_ANCHORS.length; i += 1) {
    const [hi, hiY] = LEVEL_ANCHORS[i]
    if (level > hi) continue
    const [lo, loY] = LEVEL_ANCHORS[i - 1]
    const t = hi === lo ? 0 : (level - lo) / (hi - lo)
    return loY + (hiY - loY) * t
  }
  return 7
}

const wave = (y) => `M4 ${y.toFixed(1)}q5-5 10 0t10 0t10 0t10 0V48H4Z`

/**
 * @param {{ level?: number, stroke?: number, flat?: string|null, scale?: number,
 *           background?: string|null, radius?: number }} options
 */
function iconSvg({
  level = 0.61,
  stroke = 4,
  flat = null,
  scale = 1,
  background = BG,
  radius = 0,
} = {}) {
  const paint = flat ?? 'url(#cg)'
  const offset = (48 * (1 - scale)) / 2

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="48" height="48">
  <defs>
    ${flat ? '' : `<linearGradient id="cg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${FROM}"/><stop offset="1" stop-color="${TO}"/>
    </linearGradient>`}
    <clipPath id="cc"><circle cx="24" cy="24" r="17"/></clipPath>
  </defs>
  ${background ? `<rect width="48" height="48" rx="${radius}" fill="${background}"/>` : ''}
  <g transform="translate(${offset} ${offset}) scale(${scale})">
    <g clip-path="url(#cc)">
      <path d="${wave(levelToY(level))}" fill="${paint}" opacity="0.92"/>
    </g>
    <circle cx="24" cy="24" r="17" fill="none" stroke="${paint}" stroke-width="${stroke}"/>
  </g>
</svg>`
}

async function png(svg, size, file, { opaque = false } = {}) {
  let pipeline = sharp(Buffer.from(svg), { density: 384 }).resize(size, size)
  if (opaque) pipeline = pipeline.flatten({ background: BG })
  await pipeline.png({ compressionLevel: 9 }).toFile(resolve(PUBLIC, file))
  console.log(`  ${file} (${size}x${size})`)
}

async function main() {
  // Icono estándar: la marca a sangre con esquinas redondeadas propias.
  const standard = iconSvg({ radius: 11 })
  await png(standard, 192, 'icon-192.png')
  await png(standard, 512, 'icon-512.png')

  // Maskable: la marca al 40%, holgadamente dentro del 80% que respeta
  // cualquier máscara de Android.
  await png(iconSvg({ scale: 0.72, radius: 0 }), 512, 'icon-512-maskable.png')

  // iOS: opaco, sin redondeo propio (lo pone el sistema).
  await png(iconSvg({ radius: 0 }), 180, 'apple-touch-icon-180.png', { opaque: true })

  // Favicon: color plano y aro más grueso para que aguante a 32 px.
  const favicon = iconSvg({ stroke: 5, flat: TO, background: null })
  await writeFile(resolve(PUBLIC, 'favicon.svg'), favicon)
  console.log('  favicon.svg')
  await png(iconSvg({ stroke: 5, flat: TO, radius: 10 }), 64, 'favicon-64.png')
}

main().then(
  () => console.log('Iconos de Caudal generados.'),
  (error) => {
    console.error(error)
    process.exitCode = 1
  }
)
