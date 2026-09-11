import { formatMoneyCompact } from '@/lib/money'
import type { Bucket } from '@/lib/analytics'

/**
 * Barras verticales en CSS puro, no en SVG: una barra es un rectángulo con
 * alto porcentual, y así el texto de los ejes se pinta con la tipografía real
 * a tamaño real. Escalar un <text> dentro de un viewBox lo deja borroso o
 * diminuto según el ancho del móvil.
 */
export function Bars({
  data,
  activeKey,
  onSelect,
}: {
  data: Bucket[]
  activeKey?: string
  onSelect?: (key: string) => void
}) {
  const max = Math.max(1, ...data.map((bucket) => bucket.cents))

  return (
    <div className="bars">
      {data.map((bucket) => {
        const active = bucket.key === activeKey
        // Un mes sin gasto no pinta barra: una raya de color se leería como
        // "algo se gastó". Los meses con muy poco sí tienen un mínimo visible.
        const height = bucket.cents === 0 ? 0 : Math.max(4, (bucket.cents / max) * 100)

        return (
          <button
            key={bucket.key}
            type="button"
            className={`bars-col ${active ? 'bars-col--active' : ''}`}
            onClick={onSelect ? () => onSelect(bucket.key) : undefined}
            disabled={!onSelect}
            aria-pressed={onSelect ? active : undefined}
          >
            <span className="bars-value num">
              {bucket.cents > 0 ? formatMoneyCompact(bucket.cents) : ''}
            </span>
            <span className="bars-track">
              {/* El relleno ocupa todo y se baja lo que le falta para llegar a
                  su valor: así la animación va por transformación, no por alto. */}
              <span className="bars-fill" style={{ translate: `0 ${100 - height}%` }} />
            </span>
            <span className="bars-label">{bucket.label}</span>
          </button>
        )
      })}
    </div>
  )
}
