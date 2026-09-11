import type { ReactNode } from 'react'
import type { Bucket } from '@/lib/analytics'
import { formatMoney } from '@/lib/money'
import './charts.css'

/**
 * Envoltorio común de todas las gráficas.
 *
 * Una gráfica es una imagen para quien la ve y una tabla para quien no puede
 * verla: por eso lleva `role="img"` con un resumen en `aria-label` y, oculta,
 * la misma tabla de datos. Es el patrón más fiable con lectores de pantalla y
 * no depende de ninguna librería.
 */
export function ChartFrame({
  title,
  hint,
  summary,
  data,
  valueLabel = 'Importe',
  children,
  actions,
}: {
  title: string
  hint?: string
  /** Frase que resume la gráfica; es lo que oye un lector de pantalla. */
  summary: string
  data: Bucket[]
  valueLabel?: string
  children: ReactNode
  actions?: ReactNode
}) {
  return (
    <section className="chart-card">
      <header className="chart-head">
        <div>
          <h3 className="chart-title">{title}</h3>
          {hint && <p className="chart-hint">{hint}</p>}
        </div>
        {actions}
      </header>

      <div className="chart-body" role="img" aria-label={summary}>
        {children}
      </div>

      <table className="sr-only">
        <caption>{title}</caption>
        <thead>
          <tr>
            <th scope="col">Concepto</th>
            <th scope="col">{valueLabel}</th>
          </tr>
        </thead>
        <tbody>
          {data.map((bucket) => (
            <tr key={bucket.key}>
              <th scope="row">{bucket.label}</th>
              <td>{formatMoney(bucket.cents)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  )
}
