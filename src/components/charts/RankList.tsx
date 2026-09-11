import { formatMoney } from '@/lib/money'
import type { Bucket } from '@/lib/analytics'

/**
 * Ranking en barras horizontales. En una pantalla de 360 px gana a un donut:
 * la etiqueta cabe dentro de la propia barra y no hace falta ni leyenda ni
 * relacionar colores con nombres.
 */
export function RankList({
  data,
  total,
  emoji,
  colorIndex,
  onSelect,
}: {
  data: Bucket[]
  total: number
  emoji?: (key: string) => string | undefined
  colorIndex?: (key: string) => number
  onSelect?: (key: string) => void
}) {
  const max = Math.max(1, ...data.map((bucket) => bucket.cents))

  return (
    <ul className="rank">
      {data.map((bucket) => {
        const share = total > 0 ? Math.round((bucket.cents / total) * 100) : 0
        const width = (bucket.cents / max) * 100
        const color = colorIndex ? `var(--space-${colorIndex(bucket.key)})` : 'var(--brand-500)'

        return (
          <li key={bucket.key}>
            <button
              type="button"
              className="rank-row"
              onClick={onSelect ? () => onSelect(bucket.key) : undefined}
              disabled={!onSelect}
            >
              <span
                className="rank-fill"
                style={{ translate: `${width - 100}% 0`, background: color }}
              />
              <span className="rank-name">
                {emoji?.(bucket.key) && <span className="rank-emoji">{emoji(bucket.key)}</span>}
                {bucket.label}
              </span>
              <span className="rank-figures">
                <span className="rank-amount num">{formatMoney(bucket.cents)}</span>
                <span className="rank-share num">{share}%</span>
              </span>
            </button>
          </li>
        )
      })}
    </ul>
  )
}
