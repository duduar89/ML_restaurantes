import { useId } from 'react'
import { BRAND } from './brand'

/**
 * La marca de Caudal: una moneda (el aro) llena de caudal hasta un nivel.
 *
 * No es sólo un distintivo: el NIVEL es un dato. Pasándole `level` (0-1) el
 * logo muestra cuánto llevas gastado del presupuesto, así que la misma pieza
 * sirve de icono de la app y de indicador dentro de ella.
 *
 * Se dibuja en línea, con un aro y una ruta: nítido a cualquier tamaño, sin
 * una petición de red y con el color tomado de los tokens.
 */

/**
 * Nivel (0-1) a la coordenada Y de la superficie del líquido.
 *
 * No es una regla de tres: la moneda es un círculo, y en un círculo un mismo
 * escalón de altura tapa mucha más área por el centro que por los extremos.
 * Estos anclajes son las alturas que reparten el ÁREA de forma proporcional,
 * que es lo que el ojo percibe como "medio lleno".
 */
const LEVEL_ANCHORS: Array<[level: number, y: number]> = [
  [0, 41],
  [0.15, 33.9],
  [0.25, 30.9],
  [0.5, 24],
  [0.61, 21],
  [0.75, 17.1],
  [0.9, 12.3],
  [1, 7],
]

export function levelToY(level: number): number {
  const clamped = Math.min(1, Math.max(0, level))
  for (let i = 1; i < LEVEL_ANCHORS.length; i += 1) {
    const [highLevel, highY] = LEVEL_ANCHORS[i]
    if (clamped > highLevel) continue
    const [lowLevel, lowY] = LEVEL_ANCHORS[i - 1]
    const span = highLevel - lowLevel
    const t = span === 0 ? 0 : (clamped - lowLevel) / span
    return lowY + (highY - lowY) * t
  }
  return 7
}

/**
 * La onda: una cuadrática con el comando `t` (cuadrática suave), que refleja
 * solo cada punto de control y produce una onda alternante de verdad en una
 * cadena cortísima. Abarca de x=4 a x=44 y el aro sólo ocupa de 7 a 41, así
 * que siempre cubre de lado a lado.
 */
function wavePath(y: number): string {
  return `M4 ${y.toFixed(1)}q5-5 10 0t10 0t10 0t10 0V48H4Z`
}

export function LogoMark({
  size = 40,
  /** 0-1. Cuánto caudal queda dentro de la moneda. */
  level = 0.61,
  /** Color plano en vez del degradado: para favicon pequeño o marca monocroma. */
  flat = false,
}: {
  size?: number
  level?: number
  flat?: boolean
}) {
  const uid = useId().replace(/:/g, '')
  const gradientId = `caudal-g-${uid}`
  const clipId = `caudal-c-${uid}`
  const paint = flat ? 'currentColor' : `url(#${gradientId})`

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      role="img"
      aria-label={BRAND.name}
    >
      <defs>
        {!flat && (
          <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor={BRAND.gradientFrom} />
            <stop offset="1" stopColor={BRAND.gradientTo} />
          </linearGradient>
        )}
        <clipPath id={clipId}>
          <circle cx="24" cy="24" r="17" />
        </clipPath>
      </defs>

      {/* El caudal primero y el aro encima: así el trazo del aro queda
          limpio en los costados en vez de verse a través del relleno. */}
      <g clipPath={`url(#${clipId})`}>
        <path d={wavePath(levelToY(level))} fill={paint} opacity="0.92" />
      </g>
      <circle cx="24" cy="24" r="17" fill="none" stroke={paint} strokeWidth="4" />
    </svg>
  )
}

/** Logo completo: marca + nombre. Para cabeceras y la pantalla de bienvenida. */
export function LogoLockup({ size = 30, level }: { size?: number; level?: number }) {
  return (
    <span className="lockup">
      <LogoMark size={size} level={level} />
      <span className="lockup-name" style={{ fontSize: size * 0.66 }}>
        {BRAND.name}
      </span>
    </span>
  )
}
