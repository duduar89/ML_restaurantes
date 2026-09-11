import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * Contraste de la paleta, verificado sobre el archivo de tokens real.
 *
 * Esto no se comprueba una vez al elegir los colores: se comprueba en cada
 * ejecución de las pruebas. Un token que alguien aclare "sólo un poco" dentro
 * de seis meses rompe aquí, no en el móvil de quien lo use.
 *
 * Los mínimos son los de WCAG AA: 4,5:1 para texto y 3:1 para controles,
 * iconos y elementos gráficos.
 */

const CSS = readFileSync(resolve(import.meta.dirname, '../tokens.css'), 'utf8')

/** Extrae los tokens de un bloque `:root` concreto. */
function tokensOf(selector: string): Record<string, string> {
  const index = CSS.indexOf(selector)
  if (index === -1) throw new Error(`No se encuentra el bloque ${selector}`)
  const open = CSS.indexOf('{', index)
  const close = CSS.indexOf('\n}', open)
  const block = CSS.slice(open, close)

  const out: Record<string, string> = {}
  for (const match of block.matchAll(/(--[\w-]+):\s*([^;]+);/g)) {
    out[match[1]] = match[2].trim()
  }
  return out
}

function luminance(hex: string): number {
  const channel = (value: number) => {
    const c = value / 255
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  }
  const n = Number.parseInt(hex.slice(1), 16)
  return (
    0.2126 * channel((n >> 16) & 255) +
    0.7152 * channel((n >> 8) & 255) +
    0.0722 * channel(n & 255)
  )
}

function contrast(a: string, b: string): number {
  const [high, low] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (high + 0.05) / (low + 0.05)
}

/** Tono en grados, para comprobar que dos colores semánticos se distinguen. */
function hue(hex: string): number {
  const n = Number.parseInt(hex.slice(1), 16)
  const r = ((n >> 16) & 255) / 255
  const g = ((n >> 8) & 255) / 255
  const b = (n & 255) / 255
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const delta = max - min
  if (delta === 0) return 0
  const raw =
    max === r ? ((g - b) / delta) % 6 : max === g ? (b - r) / delta + 2 : (r - g) / delta + 4
  return (raw * 60 + 360) % 360
}

function hueDistance(a: string, b: string): number {
  const d = Math.abs(hue(a) - hue(b))
  return Math.min(d, 360 - d)
}

/** Pares que la interfaz pinta de verdad, con su mínimo. */
const PAIRS: Array<[fg: string, bg: string, min: number, label: string]> = [
  ['--text', '--bg', 4.5, 'texto sobre el lienzo'],
  ['--text', '--surface-solid', 4.5, 'texto sobre una tarjeta'],
  ['--text', '--surface-2', 4.5, 'texto sobre un campo'],
  ['--text', '--bg-elevated', 4.5, 'texto dentro de una hoja'],
  ['--text-muted', '--bg', 4.5, 'texto secundario'],
  ['--text-muted', '--surface-solid', 4.5, 'secundario sobre tarjeta'],
  ['--text-faint', '--bg', 4.5, 'texto tenue'],
  ['--text-faint', '--surface-2', 4.5, 'tenue sobre un campo'],
  ['--text-on-brand', '--brand-500', 4.5, 'texto del botón principal'],
  ['--brand-300', '--bg', 4.5, 'acentos de texto'],
  ['--brand-300', '--surface-3', 4.5, 'acento sobre superficie alta'],
  ['--positive', '--bg', 4.5, 'ingresos'],
  ['--positive', '--surface-solid', 4.5, 'ingresos sobre tarjeta'],
  ['--danger', '--bg', 4.5, 'exceso de presupuesto'],
  ['--danger', '--surface-solid', 4.5, 'exceso sobre tarjeta'],
  ['--warning', '--bg', 4.5, 'aviso'],
  ['--accent-500', '--bg', 3, 'acento de datos'],
]

const SPACE_COLORS = Array.from({ length: 8 }, (_, i) => `--space-${i}`)

describe.each([
  ['tema oscuro', ':root {'],
  ['tema claro', ":root[data-theme='light']"],
])('%s', (_name, selector) => {
  const tokens = tokensOf(selector)

  it.each(PAIRS)('%s sobre %s cumple %d:1 (%s)', (fg, bg, min) => {
    expect(tokens[fg], `falta el token ${fg}`).toBeDefined()
    expect(tokens[bg], `falta el token ${bg}`).toBeDefined()
    expect(contrast(tokens[fg], tokens[bg])).toBeGreaterThanOrEqual(min)
  })

  it('los colores semánticos se distinguen del color de marca', () => {
    // Con una marca cálida, un rojo de alarma se le pega y "te has pasado"
    // deja de leerse como alarma. 25° es el mínimo para separarlos de un
    // vistazo. El tema claro sólo comprueba contraste: allí la separación la
    // dan la luminosidad y la saturación, no el tono.
    if (selector !== ':root {') return
    expect(hueDistance(tokens['--danger'], tokens['--brand-500'])).toBeGreaterThanOrEqual(25)
    expect(hueDistance(tokens['--warning'], tokens['--brand-500'])).toBeGreaterThanOrEqual(25)
    expect(hueDistance(tokens['--positive'], tokens['--brand-500'])).toBeGreaterThanOrEqual(25)
  })
})

describe('colores de los apartados', () => {
  const dark = tokensOf(':root {')
  const spaces = tokensOf('/*\n * Paleta de los apartados')

  it.each(SPACE_COLORS)('%s contrasta 3:1 sobre el lienzo', (key) => {
    expect(spaces[key], `falta el token ${key}`).toBeDefined()
    expect(contrast(spaces[key], dark['--bg'])).toBeGreaterThanOrEqual(3)
  })

  it('no hay dos apartados con el mismo color', () => {
    const values = SPACE_COLORS.map((key) => spaces[key])
    expect(new Set(values).size).toBe(values.length)
  })
})

describe('disciplina de la paleta', () => {
  it('ningún componente escribe un color a mano', () => {
    // Todo el color vive en tokens.css. Un hex suelto en un componente se
    // queda fuera del cambio de tema y de esta verificación.
    const files = import.meta.glob('../../**/*.css', {
      eager: true,
      query: '?raw',
      import: 'default',
    })
    const offenders: string[] = []

    for (const [path, source] of Object.entries(files as Record<string, string>)) {
      if (path.includes('tokens.css')) continue
      for (const line of source.split('\n')) {
        // Se ignoran los comentarios, donde citar un hex es legítimo.
        if (line.trimStart().startsWith('*') || line.trimStart().startsWith('/*')) continue
        if (/#[0-9a-fA-F]{3,8}\b/.test(line)) offenders.push(`${path}: ${line.trim()}`)
      }
    }

    expect(offenders).toEqual([])
  })
})
