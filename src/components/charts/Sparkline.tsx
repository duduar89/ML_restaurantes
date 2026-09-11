import type { Bucket } from '@/lib/analytics'

/**
 * Línea diminuta para incrustar en una fila de lista. Sin ejes ni etiquetas:
 * sólo la forma del gasto, que es toda la información que cabe a este tamaño.
 */
const W = 64
const H = 20

export function Sparkline({ data, color = 'var(--brand-400)' }: { data: Bucket[]; color?: string }) {
  if (data.length < 2) return null

  const max = Math.max(1, ...data.map((bucket) => bucket.cents))
  const points = data
    .map((bucket, index) => {
      const x = (index / (data.length - 1)) * W
      const y = H - (bucket.cents / max) * (H - 2) - 1
      return `${x.toFixed(1)},${y.toFixed(1)}`
    })
    .join(' ')

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="sparkline" aria-hidden="true">
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  )
}
