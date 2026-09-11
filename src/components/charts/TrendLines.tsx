import { useId } from 'react'
import type { AlignedPoint } from '@/lib/analytics'
import { formatMoneyCompact } from '@/lib/money'

/**
 * Gasto acumulado del mes en curso contra el anterior, alineados por día del
 * mes (no por fecha): comparar el 30 de un mes de 31 días con el 30 de uno de
 * 28 no existe. `alignedCumulative` ya trunca al mes más corto.
 *
 * La línea del mes en curso se corta en el día de hoy en vez de aplanarse:
 * una línea horizontal hasta fin de mes se leería como "he dejado de gastar".
 */
const W = 320
const H = 140
const PAD_Y = 10

export function TrendLines({
  points,
  currentLabel,
  previousLabel,
}: {
  points: AlignedPoint[]
  currentLabel: string
  previousLabel: string
}) {
  const gradientId = useId()
  if (points.length < 2) return null

  const max = Math.max(
    1,
    ...points.map((point) => Math.max(point.currentCents ?? 0, point.previousCents))
  )

  const x = (index: number) => (index / (points.length - 1)) * W
  const y = (cents: number) => H - PAD_Y - (cents / max) * (H - PAD_Y * 2)

  const path = (pick: (point: AlignedPoint) => number | null) => {
    const segments: string[] = []
    points.forEach((point, index) => {
      const value = pick(point)
      if (value === null) return
      segments.push(`${segments.length === 0 ? 'M' : 'L'}${x(index).toFixed(1)},${y(value).toFixed(1)}`)
    })
    return segments.join(' ')
  }

  const currentPath = path((point) => point.currentCents)
  const previousPath = path((point) => point.previousCents)

  const lastCurrent = [...points].reverse().find((point) => point.currentCents !== null)
  const lastIndex = lastCurrent ? points.indexOf(lastCurrent) : -1

  // El área bajo la línea necesita cerrarse contra la base para rellenarse.
  const areaPath =
    lastIndex >= 0
      ? `${currentPath} L${x(lastIndex).toFixed(1)},${H} L0,${H} Z`
      : ''

  return (
    <div className="trend">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        className="trend-svg"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id={`${gradientId}-area`} x1="0" y1="0" x2="0" y2="1">
            <stop stopColor="var(--brand-500)" stopOpacity="0.32" />
            <stop offset="1" stopColor="var(--brand-500)" stopOpacity="0" />
          </linearGradient>
        </defs>

        {areaPath && <path d={areaPath} fill={`url(#${gradientId}-area)`} />}

        {/* vector-effect: sin él, preserveAspectRatio="none" estira el grosor
            del trazo horizontalmente y la línea sale deformada. */}
        <path
          d={previousPath}
          fill="none"
          stroke="var(--text-faint)"
          strokeWidth="2"
          strokeDasharray="4 4"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        />
        <path
          d={currentPath}
          fill="none"
          stroke="var(--brand-400)"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
      </svg>

      <div className="trend-legend">
        <span className="trend-key trend-key--current">
          {currentLabel}
          <strong className="num">
            {formatMoneyCompact(lastCurrent?.currentCents ?? 0)}
          </strong>
        </span>
        <span className="trend-key trend-key--previous">
          {previousLabel}
          <strong className="num">
            {formatMoneyCompact(points[points.length - 1].previousCents)}
          </strong>
        </span>
      </div>
    </div>
  )
}
