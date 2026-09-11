import type { Bucket } from '@/lib/analytics'
import { formatMoney } from '@/lib/money'

/**
 * Donut por segmentos con `stroke-dasharray` sobre círculos concéntricos: diez
 * líneas de SVG en lugar de importar d3-shape (2,7 kB) para calcular arcos que
 * aquí son una simple regla de tres.
 *
 * Como máximo cinco porciones — el resto va a "Otros". Más porciones en una
 * pantalla de móvil son ilegibles.
 */
const SIZE = 120
const STROKE = 16
const RADIUS = (SIZE - STROKE) / 2
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

export function Donut({
  data,
  total,
  centerLabel,
  colorIndex,
}: {
  data: Bucket[]
  total: number
  centerLabel?: string
  colorIndex?: (key: string) => number
}) {
  let offset = 0

  return (
    <div className="donut">
      <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="donut-svg" aria-hidden="true">
        {/* Pista de fondo: sin ella, un mes con poco gasto deja el anillo roto. */}
        <circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={RADIUS}
          fill="none"
          stroke="var(--surface-2)"
          strokeWidth={STROKE}
        />
        {/* -90deg: el primer segmento arranca arriba, no a las 3 en punto. */}
        <g transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}>
          {data.map((bucket) => {
            const fraction = total > 0 ? bucket.cents / total : 0
            const length = fraction * CIRCUMFERENCE
            const dash = `${Math.max(0, length - 2)} ${CIRCUMFERENCE}`
            const element = (
              <circle
                key={bucket.key}
                cx={SIZE / 2}
                cy={SIZE / 2}
                r={RADIUS}
                fill="none"
                stroke={
                  colorIndex ? `var(--space-${colorIndex(bucket.key)})` : 'var(--brand-500)'
                }
                strokeWidth={STROKE}
                strokeDasharray={dash}
                strokeDashoffset={-offset}
                strokeLinecap="butt"
              />
            )
            offset += length
            return element
          })}
        </g>
      </svg>

      <div className="donut-center">
        <span className="donut-total num">{formatMoney(total)}</span>
        {centerLabel && <span className="donut-label">{centerLabel}</span>}
      </div>
    </div>
  )
}
